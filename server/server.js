const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 2009;

const corsOptions = {
  origin: 'https://lexx-project.github.io',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

const qrDir = path.join(__dirname, 'qr-codes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);
app.use('/qr-codes', express.static(qrDir));

const productPrices = {
  panel: 50000,
  bot: 30000,
  script: 100000
};

async function getSaweriaQRCode(amount, productName) {
  console.log(`▶️ Membuka browser untuk ${productName} (Rp${amount})...`);
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://saweria.co/Lexyevandra', { waitUntil: 'networkidle0' });

    console.log('✅ Halaman Saweria dibuka');

    await page.waitForSelector('input[name="amount"]', { timeout: 10000 });
    await page.type('input[name="amount"]', amount.toString());
    await page.type('input[placeholder="Budi"]', 'Hamba Allah');
    await page.type('input[name="email"]', 'email@example.com');
    await page.type('input[name="message"]', `Saya ingin membeli: ${productName}`);

    const checkboxes = await page.$$('input[type="checkbox"]');
    if (checkboxes.length >= 2) {
      await checkboxes[0].click();
      await checkboxes[1].click();
    }

    console.log('✅ Form diisi');

    const qrisButton = await page.$x('//img[contains(@alt, "QRIS") or contains(@src, "qris")]');
    if (qrisButton.length > 0) {
      await qrisButton[0].evaluate(el => el.closest('button, div')?.click());
      console.log('✅ Klik tombol QRIS');
    } else {
      throw new Error("❌ Tombol QRIS tidak ditemukan");
    }

    const submitBtn = await page.$x("//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'kirim dukungan')]");
    if (submitBtn.length > 0) {
      await submitBtn[0].click();
      console.log('✅ Klik tombol Kirim Dukungan');
    } else {
      throw new Error("❌ Tombol 'Kirim Dukungan' tidak ditemukan");
    }

    await page.waitForTimeout(5000);

    const images = await page.$$('img');
    let qrElement = null;
    for (const img of images) {
      const box = await img.boundingBox();
      if (box && Math.abs(box.width - box.height) < 20 && box.width >= 150) {
        qrElement = img;
        break;
      }
    }

    if (!qrElement) throw new Error("❌ QR code tidak ditemukan");

    const qrBox = await qrElement.boundingBox();
    const filename = `qr-${Date.now()}.png`;
    const filePath = path.join(qrDir, filename);

    await page.screenshot({
      path: filePath,
      clip: {
        x: qrBox.x,
        y: qrBox.y,
        width: qrBox.width,
        height: qrBox.height
      }
    });

    console.log('✅ Screenshot QRIS berhasil');
    return `/qr-codes/${filename}`;
  } catch (err) {
    console.error("❌ Gagal memproses QR:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

app.post('/api/get-qr-code', async (req, res) => {
  const { type } = req.body;
  console.log("📨 Request /api/get-qr-code:", type);

  if (!type || !productPrices[type]) {
    return res.status(400).json({ error: "Tipe produk tidak valid" });
  }

  const productName = type;
  const amount = productPrices[type];

  try {
    const qrCodeUrl = await getSaweriaQRCode(amount, productName);
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${req.headers.host}`;
    res.json({ qrCodeUrl: `${baseUrl}${qrCodeUrl}` });
  } catch (error) {
    console.error("❌ Gagal generate QRIS:", error.message);
    res.status(500).json({ error: "Gagal generate QRIS" });
  }
});

app.get('/download-qr', (req, res) => {
  const filename = req.query.filename;
  const filePath = path.join(qrDir, filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File tidak ditemukan");
  }
});

app.listen(port, () => {
  console.log(`✅ Server berjalan di port ${port}`);
});

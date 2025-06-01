const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 8080;

// ✅ Konfigurasi CORS agar bisa diakses dari GitHub Pages
const corsOptions = {
  origin: 'https://lexx-project.github.io',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// ✅ Path folder public untuk serve HTML dan statis
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// ✅ Folder untuk menyimpan QR sementara
const qrDir = path.join(__dirname, 'qr-codes');
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir);
app.use('/qr-codes', express.static(qrDir));

// ✅ Daftar harga produk
const productPrices = {
  panel: 50000,
  bot: 30000,
  script: 100000
};

// ✅ Fungsi mengambil QR Saweria
async function getSaweriaQRCode(amount, productName) {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto('https://saweria.co/Lexyevandra', { waitUntil: 'networkidle0' });

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

    const qrisButton = await page.$x('//img[contains(@alt, "QRIS") or contains(@src, "qris")]');
    if (qrisButton.length > 0) {
      await qrisButton[0].evaluate(el => el.closest('button, div')?.click());
    } else {
      throw new Error("❌ Tombol QRIS tidak ditemukan");
    }

    const submitBtn = await page.$x("//button[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'kirim dukungan')]");
    if (submitBtn.length > 0) {
      await submitBtn[0].click();
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

    return `/qr-codes/${filename}`;
  } catch (err) {
    console.error("❌ Error:", err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

// ✅ Endpoint POST: generate QR code
app.post('/api/get-qr-code', async (req, res) => {
  try {
    const { type } = req.body;
    const productName = type || 'Produk Tidak Diketahui';
    const amount = productPrices[type] || 15000;

    console.log(`📨 Request /api/get-qr-code: ${type}`);
    console.log(`▶️ Membuka browser untuk ${productName} (Rp${amount})...`);

    const qrCodeUrl = await getSaweriaQRCode(amount, productName);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${req.headers.host}`;
    res.json({ qrCodeUrl: `${baseUrl}${qrCodeUrl}` });
  } catch (error) {
    console.error("❌ Gagal generate QRIS:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Endpoint GET: download QR
app.get('/download-qr', (req, res) => {
  const filename = req.query.filename;
  const filePath = path.join(qrDir, filename);

  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send("File tidak ditemukan");
  }
});

// ✅ Jalankan server
app.listen(port, () => {
  console.log(`✅ Server berjalan di port ${port}`);
});

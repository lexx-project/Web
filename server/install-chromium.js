const puppeteer = require('puppeteer');

(async () => {
  try {
    console.log("⏳ Installing Chromium...");
    const browserFetcher = puppeteer.createBrowserFetcher();
    const revisionInfo = await browserFetcher.download('121.0.6167.85');
    console.log("✅ Chromium installed at:", revisionInfo.executablePath);
  } catch (err) {
    console.error("❌ Failed to install Chromium:", err);
    process.exit(1);
  }
})();

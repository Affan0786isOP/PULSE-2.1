import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';
const PORT = 4179;

const TARGETS = [
  { name: 'pulse-1024x768', width: 1024, height: 768 },
  { name: 'pulse-800x600', width: 800, height: 600 },
  { name: 'pulse-640x480', width: 640, height: 480 },
  { name: 'pulse-420p', width: 746, height: 420 },
];

async function run() {
  const app = express();
  const distDir = path.resolve('dist');

  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  const browser = await chromium.launch({
    args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage', '--no-sandbox']
  });

  try {
    for (const target of TARGETS) {
      console.log(`Capturing ${target.name} (${target.width}x${target.height})...`);
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();

      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });

      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      const screenshotPath = `${ARTIFACT_DIR}/${target.name}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`Saved screenshot: ${screenshotPath}`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';
const PORT = 4174;

const CONFIGS = [
  { name: 'matrix-1280x720-dpr1', width: 1280, height: 720, dpr: 1 },
  { name: 'matrix-1366x768-dpr1', width: 1366, height: 768, dpr: 1 },
  { name: 'matrix-1920x1080-dpr1', width: 1920, height: 1080, dpr: 1 },
  { name: 'matrix-1920x1080-dpr2', width: 1920, height: 1080, dpr: 2 },
  { name: 'matrix-2559x1440-dpr1', width: 2559, height: 1440, dpr: 1 },
  { name: 'matrix-2560x1440-dpr1', width: 2560, height: 1440, dpr: 1 },
  { name: 'matrix-3840x2160-dpr1', width: 3840, height: 2160, dpr: 1 },
];

async function run() {
  const app = express();
  const distDir = path.resolve('dist');

  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => {
      console.log(`Server listening on http://127.0.0.1:${PORT}`);
      resolve(s);
    });
  });

  const browser = await chromium.launch();

  try {
    // 1. Capture all 7 static matrix configurations
    for (const cfg of CONFIGS) {
      console.log(`Capturing ${cfg.name} (${cfg.width}x${cfg.height} @ DPR ${cfg.dpr})...`);
      const context = await browser.newContext({
        viewport: { width: cfg.width, height: cfg.height },
        deviceScaleFactor: cfg.dpr,
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      // Hover over the carousel region to pause autoplay and wait for motion to settle
      await page.hover('[role="region"][aria-label="Assessment Protocols 3D Carousel"]');
      await page.waitForTimeout(600);

      // Verify active card size
      const cardDimensions = await page.evaluate(() => {
        const activeCard = document.querySelector('[role="region"][aria-label="Assessment Protocols 3D Carousel"] [role="button"][aria-current="true"]');
        if (!activeCard) return null;
        const rect = activeCard.getBoundingClientRect();
        return { width: Math.round(rect.width), height: Math.round(rect.height) };
      });
      console.log(`  -> Active card dimensions: ${JSON.stringify(cardDimensions)}`);

      const screenshotPath = `${ARTIFACT_DIR}/${cfg.name}.png`;
      await page.screenshot({ path: screenshotPath });
      console.log(`  -> Saved screenshot: ${screenshotPath}`);
      await context.close();
    }

    // 2. Bidirectional Resize Test (2560 -> 2559 -> 2560)
    console.log('Running Bidirectional Resize Test (2560 -> 2559 -> 2560)...');
    const resizeContext = await browser.newContext({
      viewport: { width: 2560, height: 1440 },
      deviceScaleFactor: 1,
    });
    const resizePage = await resizeContext.newPage();
    await resizePage.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });
    await resizePage.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await resizePage.hover('[role="region"][aria-label="Assessment Protocols 3D Carousel"]');
    await resizePage.waitForTimeout(600);

    const dimsAt2560_Initial = await resizePage.evaluate(() => {
      const activeCard = document.querySelector('[role="region"][aria-label="Assessment Protocols 3D Carousel"] [role="button"][aria-current="true"]');
      return activeCard ? { width: Math.round(activeCard.getBoundingClientRect().width), height: Math.round(activeCard.getBoundingClientRect().height) } : null;
    });

    // Shrink across boundary to 2559
    await resizePage.setViewportSize({ width: 2559, height: 1440 });
    await resizePage.waitForTimeout(600);
    const dimsAt2559 = await resizePage.evaluate(() => {
      const activeCard = document.querySelector('[role="region"][aria-label="Assessment Protocols 3D Carousel"] [role="button"][aria-current="true"]');
      return activeCard ? { width: Math.round(activeCard.getBoundingClientRect().width), height: Math.round(activeCard.getBoundingClientRect().height) } : null;
    });

    // Expand back across boundary to 2560
    await resizePage.setViewportSize({ width: 2560, height: 1440 });
    await resizePage.waitForTimeout(600);
    const dimsAt2560_Restored = await resizePage.evaluate(() => {
      const activeCard = document.querySelector('[role="region"][aria-label="Assessment Protocols 3D Carousel"] [role="button"][aria-current="true"]');
      return activeCard ? { width: Math.round(activeCard.getBoundingClientRect().width), height: Math.round(activeCard.getBoundingClientRect().height) } : null;
    });

    console.log('Bidirectional Resize Test Results:');
    console.log(`  Initial 2560px: ${JSON.stringify(dimsAt2560_Initial)}`);
    console.log(`  Shrunk to 2559px: ${JSON.stringify(dimsAt2559)}`);
    console.log(`  Restored to 2560px: ${JSON.stringify(dimsAt2560_Restored)}`);

    await resizePage.screenshot({ path: `${ARTIFACT_DIR}/matrix-resize-2560-restored.png` });
    await resizeContext.close();

    console.log('All verification captures completed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/7309fa23-80de-4e85-a811-223fbcf23cbf';
const PORT = 4173;

async function run() {
  const app = express();
  const distDir = path.resolve('dist');

  // Serve static files from dist
  app.use(express.static(distDir));

  // SPA fallback to dist/index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => {
      console.log(`In-process express server running at http://127.0.0.1:${PORT}`);
      resolve(s);
    });
  });

  try {
    const browser = await chromium.launch();

    // 1. Desktop 1440x900 on /assessments
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });
      await page.goto(`http://127.0.0.1:${PORT}/assessments`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-desktop.png` });
      console.log('Captured desktop assessments navbar');
      await context.close();
    }

    // 2. Mobile 390x844 on /assessments
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });
      await page.goto(`http://127.0.0.1:${PORT}/assessments`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-mobile.png` });
      console.log('Captured mobile assessments navbar');

      const menuBtn = page.getByRole('button', { name: /open navigation menu/i });
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-mobile-drawer.png` });
        console.log('Captured mobile assessments drawer');
      }
      await context.close();
    }

    // 3. Sub-route with back button: /reaction-test
    {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });
      await page.goto(`http://127.0.0.1:${PORT}/reaction-test`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-reaction-test-desktop.png` });
      console.log('Captured reaction test navbar with back button');
      await context.close();
    }

    await browser.close();
    console.log('All screenshots captured successfully!');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('Error running in-process preview and capture:', err);
  process.exit(1);
});

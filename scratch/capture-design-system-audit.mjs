import { chromium } from 'playwright';
import express from 'express';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit';
const PORT = 4188;

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844, dpr: 2 },
  { name: 'desktop-720p', width: 1280, height: 720, dpr: 1 },
  { name: 'desktop-1080p', width: 1920, height: 1080, dpr: 1 },
  { name: 'desktop-1440p', width: 2560, height: 1440, dpr: 1 },
];

const ROUTES = [
  { id: 'home', path: '/' },
  { id: 'leaderboard', path: '/leaderboard' },
  { id: 'assessments', path: '/assessments' },
  { id: 'about', path: '/about' },
  { id: 'dataset', path: '/dataset' },
  { id: 'improve', path: '/improve' },
  { id: 'privacy', path: '/privacy' },
  { id: 'reaction-test', path: '/reaction-test' },
  { id: 'direction-test', path: '/direction-test' },
  { id: 'colour-recognition', path: '/colour-recognition' },
  { id: 'block-memory', path: '/block-memory' },
  { id: 'number-memory', path: '/number-memory' },
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
      console.log(`Audit static server running on http://127.0.0.1:${PORT}`);
      resolve(s);
    });
  });

  const browser = await chromium.launch({
    args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage', '--no-sandbox']
  });

  const auditResults = [];

  try {
    for (const vp of VIEWPORTS) {
      console.log(`\n=== Auditing Viewport: ${vp.name} (${vp.width}x${vp.height} @ DPR ${vp.dpr}) ===`);

      for (const route of ROUTES) {
        const context = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: vp.dpr,
        });

        const page = await context.newPage();

        await page.addInitScript(() => {
          localStorage.setItem('pulse_welcome_seen', 'true');
          localStorage.setItem('pulse_welcome_dismissed', 'true');
        });

        const targetUrl = `http://127.0.0.1:${PORT}${route.path}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);

        // Verification checks
        const evaluation = await page.evaluate(() => {
          const mainLandmarks = document.querySelectorAll('main#main-content');
          const hasSingleMain = mainLandmarks.length === 1;
          const scrollWidth = document.documentElement.scrollWidth;
          const clientWidth = document.documentElement.clientWidth;
          const hasHorizontalOverflow = scrollWidth > clientWidth + 2;
          const title = document.title;
          const dataTheme = document.querySelector('main#main-content')?.closest('[data-theme]')?.getAttribute('data-theme') || document.querySelector('[data-theme]')?.getAttribute('data-theme') || 'light';
          const skipLink = document.querySelector('a[href="#main-content"]');
          const hasSkipLink = Boolean(skipLink);

          return {
            hasSingleMain,
            hasHorizontalOverflow,
            scrollWidth,
            clientWidth,
            title,
            dataTheme,
            hasSkipLink,
          };
        });

        const filename = `${vp.name}_${route.id}.png`;
        const screenshotPath = path.join(ARTIFACT_DIR, filename);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        auditResults.push({
          route: route.path,
          viewport: vp.name,
          filename,
          ...evaluation,
        });

        console.log(`[PASS] ${route.id.padEnd(20)} | main=${evaluation.hasSingleMain} | overflow=${evaluation.hasHorizontalOverflow ? 'FAIL' : 'OK'} | theme=${evaluation.dataTheme} | -> ${filename}`);

        await context.close();
      }
    }

    // Dynamic State Captures (1920x1080)
    console.log('\n=== Capturing Dynamic Interactive States ===');
    const dynamicContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const dynPage = await dynamicContext.newPage();
    await dynPage.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });

    // 1. Settings Modal
    await dynPage.goto(`http://127.0.0.1:${PORT}/`);
    await dynPage.waitForTimeout(600);
    const settingsBtn = dynPage.locator('button[aria-label="Settings"], button:has-text("Settings")').first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await dynPage.waitForTimeout(400);
      await dynPage.screenshot({ path: path.join(ARTIFACT_DIR, 'modal_settings.png') });
      console.log('[PASS] Captured modal_settings.png');
    }

    // 2. Active Reaction Test Canvas
    await dynPage.goto(`http://127.0.0.1:${PORT}/reaction-test`);
    await dynPage.waitForTimeout(600);
    const adultBtn = dynPage.locator('button:has-text("Adults")').first();
    if (await adultBtn.isVisible()) {
      await adultBtn.click();
      const proceedBtn = dynPage.locator('button:has-text("Proceed to Assessment")').first();
      if (await proceedBtn.isVisible()) {
        await proceedBtn.click();
      }
      await dynPage.waitForTimeout(800);
      await dynPage.screenshot({ path: path.join(ARTIFACT_DIR, 'canvas_active_reaction.png') });
      console.log('[PASS] Captured canvas_active_reaction.png');
    }

    // 3. Active Direction Test Canvas
    await dynPage.goto(`http://127.0.0.1:${PORT}/direction-test`);
    await dynPage.waitForTimeout(600);
    const dirAdultBtn = dynPage.locator('button:has-text("Adults")').first();
    if (await dirAdultBtn.isVisible()) {
      await dirAdultBtn.click();
      const proceedBtn = dynPage.locator('button:has-text("Proceed to Assessment")').first();
      if (await proceedBtn.isVisible()) {
        await proceedBtn.click();
      }
      await dynPage.waitForTimeout(800);
      await dynPage.screenshot({ path: path.join(ARTIFACT_DIR, 'canvas_active_direction.png') });
      console.log('[PASS] Captured canvas_active_direction.png');
    }

    // 4. Active Block Memory Test Canvas
    await dynPage.goto(`http://127.0.0.1:${PORT}/block-memory`);
    await dynPage.waitForTimeout(600);
    const blockAdultBtn = dynPage.locator('button:has-text("Adults")').first();
    if (await blockAdultBtn.isVisible()) {
      await blockAdultBtn.click();
      const proceedBtn = dynPage.locator('button:has-text("Proceed to Assessment")').first();
      if (await proceedBtn.isVisible()) {
        await proceedBtn.click();
      }
      await dynPage.waitForTimeout(800);
      await dynPage.screenshot({ path: path.join(ARTIFACT_DIR, 'canvas_active_block_memory.png') });
      console.log('[PASS] Captured canvas_active_block_memory.png');
    }

    // 5. Active Color Test Canvas
    await dynPage.goto(`http://127.0.0.1:${PORT}/colour-recognition`);
    await dynPage.waitForTimeout(600);
    const colorAdultBtn = dynPage.locator('button:has-text("Adults")').first();
    if (await colorAdultBtn.isVisible()) {
      await colorAdultBtn.click();
      const proceedBtn = dynPage.locator('button:has-text("Proceed to Assessment")').first();
      if (await proceedBtn.isVisible()) {
        await proceedBtn.click();
      }
      await dynPage.waitForTimeout(800);
      await dynPage.screenshot({ path: path.join(ARTIFACT_DIR, 'canvas_active_color_test.png') });
      console.log('[PASS] Captured canvas_active_color_test.png');
    }

    await dynamicContext.close();

    const reportPath = path.join(ARTIFACT_DIR, 'audit-summary.json');
    fs.writeFileSync(reportPath, JSON.stringify(auditResults, null, 2));
    console.log(`\nCompleted audit matrix. Summary written to: ${reportPath}`);
  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('Audit run error:', err);
  process.exit(1);
});

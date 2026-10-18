import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

(async () => {
  const auditDir = path.resolve('audit/transitions');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to Home at http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForSelector('main#main-content');
  await page.screenshot({ path: path.join(auditDir, 'home_loaded.png') });

  const routesToTest = [
    { name: 'assessments', url: '/assessments' },
    { name: 'leaderboard', url: '/leaderboard' },
    { name: 'about', url: '/about' },
    { name: 'reaction-test', url: '/reaction-test' },
    { name: 'improve', url: '/improve' },
    { name: 'home', url: '/' }
  ];

  for (const target of routesToTest) {
    console.log(`\nTesting transition to ${target.url} (${target.name})...`);

    // Click link in navbar or trigger client-side navigation
    await page.evaluate((url) => {
      window.history.pushState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, target.url);

    // Frame sampling across transition window
    const sampleDeltas = [16, 50, 100, 180, 250];
    for (const ms of sampleDeltas) {
      await page.waitForTimeout(ms);

      const inspection = await page.evaluate(() => {
        const legacyBg = document.getElementById('pulse-technical-background');
        const legacyCanvas = document.querySelector('canvas#technical-background');
        const main = document.querySelector('main#main-content');
        const shell = document.querySelector('div[data-theme]');
        const root = document.getElementById('root');

        return {
          hasLegacyBg: !!legacyBg,
          hasLegacyCanvas: !!legacyCanvas,
          hasMain: !!main,
          shellTheme: shell ? shell.getAttribute('data-theme') : null,
          rootBg: root ? window.getComputedStyle(root).backgroundColor : null,
        };
      });

      if (inspection.hasLegacyBg || inspection.hasLegacyCanvas) {
        throw new Error(`Legacy background detected at ${ms}ms navigating to ${target.url}!`);
      }
    }

    await page.waitForSelector('main#main-content');
    await page.screenshot({ path: path.join(auditDir, `${target.name}_settled.png`) });
    console.log(`✓ ${target.name} settled with 0 legacy background elements detected.`);
  }

  console.log('\n=== ALL PAGE TRANSITIONS VERIFIED CLEAN ===');
  await browser.close();
})();

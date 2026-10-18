import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  
  async function testView(name, isMobile) {
    console.log(`\n=== Testing ${name} ===`);
    const context = await browser.newContext(
      isMobile
        ? {
            viewport: { width: 390, height: 844 },
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            hasTouch: true,
            isMobile: true
          }
        : { viewport: { width: 1440, height: 900 } }
    );
    const page = await context.newPage();
    
    page.on('console', msg => {
      if (msg.type() === 'error') console.log(`[${name} Console Error]:`, msg.text());
    });
    page.on('pageerror', err => {
      console.log(`[${name} Uncaught Page Error]:`, err.message);
      console.log(err.stack);
    });

    const prefix = isMobile ? 'http://localhost:3000/mobile' : 'http://localhost:3000';
    const routes = ['/', '/assessments', '/reaction-test', '/direction-test', '/colour-recognition', '/block-memory', '/number-memory', '/leaderboard', '/improve', '/about'];
    
    for (const r of routes) {
      const url = `${prefix}${r === '/' ? '/' : r}`;
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await page.waitForTimeout(800);
        const errorContent = await page.$eval('.text-red-300', el => el.textContent).catch(() => null);
        if (errorContent) {
          console.error(`🚨 ERROR BOUNDARY TRIGGERED ON ${url}:`, errorContent);
        } else {
          console.log(`✓ ${url} OK`);
        }
      } catch (e) {
        console.error(`Failed ${url}:`, e.message);
      }
    }
    await context.close();
  }

  await testView('Desktop', false);
  await testView('Mobile', true);

  await browser.close();
})();

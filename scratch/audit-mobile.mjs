import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pulse_welcome_seen', 'true');
      sessionStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_mobile_welcome_seen', 'true');
      sessionStorage.setItem('pulse_mobile_welcome_seen', 'true');
    } catch(e) {}
  });

  const pages = [
    { url: 'http://localhost:3000/mobile/?force_mobile=1', name: 'mobile-home' },
    { url: 'http://localhost:3000/mobile/assessments?force_mobile=1', name: 'mobile-assessments' },
    { url: 'http://localhost:3000/mobile/leaderboard?force_mobile=1', name: 'mobile-leaderboard' },
    { url: 'http://localhost:3000/mobile/improve?force_mobile=1', name: 'mobile-improve' },
  ];

  for (const p of pages) {
    console.log(`Auditing ${p.name}...`);
    try {
      await page.goto(p.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(600);
      await page.screenshot({ path: `scratch/${p.name}.png`, fullPage: false });
    } catch (e) {
      console.error(`Failed ${p.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('Mobile audit screenshots captured.');
})();

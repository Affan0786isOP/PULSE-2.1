import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  
  // Test 1: Desktop context
  console.log('--- Testing Desktop ---');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktopContext.newPage();
  
  desktopPage.on('console', msg => {
    if (msg.type() === 'error') console.log('[Desktop Console Error]:', msg.text());
  });
  desktopPage.on('pageerror', err => {
    console.log('[Desktop Page Error]:', err.message, err.stack);
  });

  const routes = ['/', '/assessments', '/reaction-test', '/leaderboard', '/improve', '/about'];
  for (const r of routes) {
    console.log(`Navigating desktop to ${r}...`);
    try {
      await desktopPage.goto(`http://localhost:3000${r}`, { waitUntil: 'networkidle', timeout: 5000 });
      await desktopPage.waitForTimeout(500);
      const errorText = await desktopPage.$eval('body', el => el.innerText).catch(() => '');
      if (errorText.includes('Something went wrong')) {
        console.error(`!!! ErrorBoundary triggered on Desktop ${r} !!!`);
      }
    } catch (e) {
      console.log(`Desktop nav error on ${r}:`, e.message);
    }
  }

  // Test 2: Mobile context
  console.log('\n--- Testing Mobile ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    hasTouch: true,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  
  mobilePage.on('console', msg => {
    if (msg.type() === 'error') console.log('[Mobile Console Error]:', msg.text());
  });
  mobilePage.on('pageerror', err => {
    console.log('[Mobile Page Error]:', err.message, err.stack);
  });

  for (const r of routes) {
    console.log(`Navigating mobile to ${r}...`);
    try {
      await mobilePage.goto(`http://localhost:3000${r}?force_mobile=1`, { waitUntil: 'networkidle', timeout: 5000 });
      await mobilePage.waitForTimeout(500);
      const errorText = await mobilePage.$eval('body', el => el.innerText).catch(() => '');
      if (errorText.includes('Something went wrong')) {
        console.error(`!!! ErrorBoundary triggered on Mobile ${r} !!!`);
      }
    } catch (e) {
      console.log(`Mobile nav error on ${r}:`, e.message);
    }
  }

  await browser.close();
})();

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  
  async function testInteractions(name, isMobile) {
    console.log(`\n=== Testing Interactions for ${name} ===`);
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
      console.log(`🚨 [${name} Uncaught Page Error]:`, err.message);
      console.log(err.stack);
    });

    const url = isMobile ? 'http://localhost:3000/mobile/' : 'http://localhost:3000/';
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Try opening settings
    console.log(`[${name}] Clicking Settings / Menu...`);
    const settingsBtn = isMobile 
      ? page.locator('button[aria-label="Open settings"]')
      : page.locator('button[aria-label="Settings"]');
    
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      console.log(`[${name}] Settings clicked.`);
    }

    // Try navigating to reaction test and taking a trial
    console.log(`[${name}] Navigating to reaction-test...`);
    const reactionUrl = isMobile ? 'http://localhost:3000/mobile/reaction-test' : 'http://localhost:3000/reaction-test';
    await page.goto(reactionUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Check if error boundary is visible
    const errorMsg = await page.$eval('.text-red-300', el => el.textContent).catch(() => null);
    if (errorMsg) {
      console.error(`🚨 ErrorBoundary on ${reactionUrl}:`, errorMsg);
    } else {
      console.log(`[${name}] reaction-test loaded without error.`);
    }

    await context.close();
  }

  await testInteractions('Desktop', false);
  await testInteractions('Mobile', true);

  await browser.close();
})();

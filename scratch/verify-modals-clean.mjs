import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const settingsBtn = page.locator('button[aria-label="Settings"]');
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(600);
    const hasError = await page.evaluate(() => document.body.innerText.includes('Something went wrong'));
    console.log('Desktop Settings open without error:', !hasError);
    const modalVisible = await page.locator('#settings-modal, [role="dialog"]').first().isVisible();
    console.log('Settings dialog visible:', modalVisible);
  }
  await browser.close();
})();

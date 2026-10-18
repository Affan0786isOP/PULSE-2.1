import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Go to direction test
  await page.goto('http://localhost:3000/direction-test', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const hasError = await page.evaluate(() => document.body.innerText.includes('Something went wrong'));
  console.log('Direction test mounted without error:', !hasError);
  
  await browser.close();
})();

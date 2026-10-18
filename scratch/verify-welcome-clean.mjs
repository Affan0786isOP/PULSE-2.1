import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Clear localStorage so WelcomeModal triggers
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  
  const hasError = await page.evaluate(() => document.body.innerText.includes('Something went wrong'));
  console.log('WelcomeModal trigger without error:', !hasError);
  
  await browser.close();
})();

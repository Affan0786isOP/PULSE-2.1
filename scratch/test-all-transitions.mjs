import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  const routes = ['/about', '/leaderboard', '/assessments', '/improve', '/'];
  let darkFlashesDetected = 0;

  for (const targetRoute of routes) {
    console.log(`Navigating to ${targetRoute}...`);
    const link = await page.$(`a[href="${targetRoute}"]`);
    if (link) {
      await link.hover();
      await page.waitForTimeout(60);
      await link.click();
    } else {
      await page.goto(`http://localhost:3000${targetRoute}`);
    }

    // Sample across 300ms of transition
    for (let i = 0; i < 10; i++) {
      const data = await page.evaluate(() => {
        const root = document.getElementById('root');
        const appWrapper = root ? root.firstElementChild : null;
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const wrapperBg = appWrapper ? window.getComputedStyle(appWrapper).backgroundColor : '';
        return { bodyBg, wrapperBg };
      });
      if (data.bodyBg === 'rgb(8, 8, 10)' || data.wrapperBg === 'rgb(8, 8, 10)') {
        console.error(`DARK FLASH DETECTED on ${targetRoute}!`, data);
        darkFlashesDetected++;
      }
      await page.waitForTimeout(20);
    }
  }

  console.log(`Navigation loop complete. Dark flashes detected: ${darkFlashesDetected}`);
  await browser.close();

  if (darkFlashesDetected > 0) {
    process.exit(1);
  }
})();

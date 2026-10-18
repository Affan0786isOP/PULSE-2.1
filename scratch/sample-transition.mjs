import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('main#main-content');

  const link = await page.$('a[href="/assessments"]');
  if (link) {
    console.log('Hovering Assessments link to preload...');
    await link.hover();
    await page.waitForTimeout(100);

    console.log('Clicking Assessments link...');
    const samples = [];
    const startTime = Date.now();
    
    await link.click();
    
    for (let i = 0; i < 15; i++) {
      const now = Date.now() - startTime;
      const data = await page.evaluate(() => {
        const root = document.getElementById('root');
        const motionDiv = document.querySelector('.motion-div') || document.querySelector('div[class*="flex-1 flex flex-col"]');
        const shell = document.querySelector('div[data-theme]');
        const appWrapper = root ? root.firstElementChild : null;
        
        return {
          pathname: window.location.pathname,
          bodyBg: window.getComputedStyle(document.body).backgroundColor,
          htmlBg: window.getComputedStyle(document.documentElement).backgroundColor,
          appWrapperBgImage: appWrapper ? window.getComputedStyle(appWrapper).backgroundImage.substring(0, 30) : null,
          motionOpacity: motionDiv ? window.getComputedStyle(motionDiv).opacity : null,
          shellExists: !!shell,
          shellDataTheme: shell ? shell.getAttribute('data-theme') : null,
        };
      });
      samples.push({ ms: now, data });
      if (i === 3 || i === 7) {
        await page.screenshot({ path: `scratch/transition-frame-${i}.png` });
      }
      await page.waitForTimeout(16);
    }
    console.log('Transition samples:');
    samples.forEach(s => console.log(`[${s.ms}ms]`, s.data));
  }
  await browser.close();
})();


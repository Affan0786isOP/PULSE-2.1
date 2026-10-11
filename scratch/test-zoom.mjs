import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });

  await page.setContent('<div id="t1" style="min-height: 100dvh; zoom: 3; background: lightblue;"><h1>Hello</h1></div>');
  const h1 = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('min-height: 100dvh + zoom: 3 scrollHeight:', h1);

  await page.setContent('<div id="t2" style="min-height: 100%; zoom: 3; background: lightblue;"><h1>Hello</h1></div>');
  const h2 = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('min-height: 100% + zoom: 3 scrollHeight:', h2);

  await page.setContent('<div id="t3" style="min-height: calc(100dvh / 3); zoom: 3; background: lightblue;"><h1>Hello</h1></div>');
  const h3 = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('min-height: calc(100dvh / 3) + zoom: 3 scrollHeight:', h3);

  await browser.close();
}

test();

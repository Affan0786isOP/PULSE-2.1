import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  await page.goto('http://127.0.0.1:4175/');
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const left = document.querySelector('section[aria-labelledby="hero-heading"]');
    const right = document.querySelector('section[aria-label="Assessment Protocols Showcase"]');
    const main = document.querySelector('main');
    const h1 = document.querySelector('h1');
    const card = document.querySelector('[role="button"][aria-current="true"]');
    return {
      main: main.getBoundingClientRect(),
      left: left.getBoundingClientRect(),
      right: right.getBoundingClientRect(),
      h1FontSize: window.getComputedStyle(h1).fontSize,
      card: card ? card.getBoundingClientRect() : null,
      leftComputedWidth: window.getComputedStyle(left).width,
    };
  });
  console.log('4K layout evaluation:', JSON.stringify(info, null, 2));
  await browser.close();
}

test();

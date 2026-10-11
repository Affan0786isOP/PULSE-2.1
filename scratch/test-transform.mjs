import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin: 0; padding: 0; overflow: hidden; width: 100vw; height: 100vh;">
        <div id="wrapper" style="width: 1280px; height: 720px; transform: scale(1.5); transform-origin: top left; background: lightblue;">
          <h1 style="font-size: 50px; margin: 20px;">Measure your mind.</h1>
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);
  const bbox = await page.evaluate(() => {
    const el = document.getElementById('wrapper');
    const r = el.getBoundingClientRect();
    return {
      rectWidth: r.width,
      rectHeight: r.height,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight
    };
  });

  console.log('Transform test 1080p:', bbox);
  await browser.close();
}

test();

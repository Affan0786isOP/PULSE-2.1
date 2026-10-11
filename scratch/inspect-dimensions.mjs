import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const PORT = 4175;

async function run() {
  const app = express();
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  const browser = await chromium.launch();

  try {
    for (const w of [1280, 1920, 3840, 7680]) {
      const h = Math.round(w * (9 / 16));
      const context = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
      });
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const data = await page.evaluate(() => {
        const h1 = document.querySelector('h1');
        const main = document.querySelector('main');
        const card = document.querySelector('[role="button"][aria-current="true"]');
        const leftSec = document.querySelector('section[aria-labelledby="hero-heading"]');
        return {
          h1FontSize: window.getComputedStyle(h1).fontSize,
          mainWidth: main ? main.getBoundingClientRect().width : null,
          mainMaxWidth: window.getComputedStyle(main).maxWidth,
          leftWidth: leftSec ? leftSec.getBoundingClientRect().width : null,
          leftMaxWidth: window.getComputedStyle(leftSec).maxWidth,
          cardWidth: card ? card.getBoundingClientRect().width : null,
          cardHeight: card ? card.getBoundingClientRect().height : null,
        };
      });
      console.log(`=== Resolution ${w}x${h} ===`);
      console.log(data);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

run();

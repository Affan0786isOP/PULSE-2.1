import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const app = express();
const distDir = path.resolve('dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const server = app.listen(4185, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  
  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  await page.goto('http://127.0.0.1:4185/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const mainChildren = await page.evaluate(() => {
    const main = document.querySelector('main');
    return Array.from(main.children).map(c => ({
      tag: c.tagName,
      role: c.getAttribute('aria-label') || c.getAttribute('aria-labelledby'),
      rect: c.getBoundingClientRect(),
      offsetHeight: c.offsetHeight
    }));
  });

  console.log('MAIN CHILDREN:', JSON.stringify(mainChildren, null, 2));

  await browser.close();
  server.close();
});

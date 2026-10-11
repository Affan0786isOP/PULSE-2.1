import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const app = express();
const distDir = path.resolve('dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const server = app.listen(4182, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  
  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  await page.goto('http://127.0.0.1:4182/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const elements = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    return all.map(el => {
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName,
        id: el.id,
        className: typeof el.className === 'string' ? el.className.slice(0, 50) : '',
        height: rect.height,
        top: rect.top,
        style: el.getAttribute('style')
      };
    }).filter(x => x.height > 2000);
  });

  console.log('TALL ELEMENTS:', JSON.stringify(elements, null, 2));

  await browser.close();
  server.close();
});

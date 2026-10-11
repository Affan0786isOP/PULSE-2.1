import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const app = express();
const distDir = path.resolve('dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const server = app.listen(4180, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  
  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  await page.goto('http://127.0.0.1:4180/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const debugInfo = await page.evaluate(() => {
    const main = document.querySelector('main');
    const root = document.getElementById('root');
    const hero = document.querySelector('h1');
    const firstDiv = root ? root.firstElementChild : null;
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      rootStyle: firstDiv ? firstDiv.getAttribute('style') : null,
      firstDivTag: firstDiv ? firstDiv.tagName : null,
      heroRect: hero ? hero.getBoundingClientRect() : null,
      firstDivRect: firstDiv ? firstDiv.getBoundingClientRect() : null,
      bodyHeight: document.body.offsetHeight,
      documentHeight: document.documentElement.scrollHeight
    };
  });

  console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));

  await browser.close();
  server.close();
});

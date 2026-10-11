import { chromium } from 'playwright';
import express from 'express';
import path from 'path';

const app = express();
const distDir = path.resolve('dist');
app.use(express.static(distDir));
app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

const server = app.listen(4195, '127.0.0.1', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  await page.goto('http://127.0.0.1:4195/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const heroH1 = document.querySelector('h1');
    const cta = document.querySelector('a[href="/assessments"]');
    const stage = document.querySelector('div[style*="perspective"]');
    const activeCard = stage ? stage.querySelector('div[role="button"][aria-current="true"]') : null;
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    return {
      window: { w: window.innerWidth, h: window.innerHeight },
      header: header ? header.getBoundingClientRect() : null,
      main: main ? main.getBoundingClientRect() : null,
      h1: heroH1 ? heroH1.getBoundingClientRect() : null,
      cta: cta ? cta.getBoundingClientRect() : null,
      stage: stage ? stage.getBoundingClientRect() : null,
      activeCard: activeCard ? activeCard.getBoundingClientRect() : null,
    };
  });

  console.log('720p BASELINE METRICS:', JSON.stringify(metrics, null, 2));
  await browser.close();
  server.close();
});

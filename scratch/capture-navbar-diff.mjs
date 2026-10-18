import { chromium } from 'playwright';
import express from 'express';
import path from 'path';
import fs from 'fs';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit';
const PORT = 4199;

async function capture() {
  const app = express();
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

  const server = await new Promise((resolve) => {
    const s = app.listen(PORT, '127.0.0.1', () => resolve(s));
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto(`http://127.0.0.1:${PORT}/`);
  await page.waitForLoadState('networkidle');

  const header = await page.locator('header[role="banner"]');
  const screenshotPath = path.join(ARTIFACT_DIR, 'rendered_navbar_1024.png');
  await header.screenshot({ path: screenshotPath });
  console.log('Saved rendered header to:', screenshotPath);

  await browser.close();
  server.close();
}

capture().catch(console.error);

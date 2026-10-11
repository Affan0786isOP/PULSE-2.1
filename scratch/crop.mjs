import { chromium } from '@playwright/test';
import fs from 'fs';

async function crop() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 682 } });
  const imgPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/.user_uploaded/media_1791662381218_23e7af8e.png';
  const base64 = fs.readFileSync(imgPath).toString('base64');
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;"><img src="data:image/png;base64,${base64}" style="display:block;width:1024px;height:682px;" /></body></html>`);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/left-hero-crop.png',
    clip: { x: 50, y: 140, width: 450, height: 420 }
  });
  await browser.close();
  console.log('Done cropping left hero');
}

crop();

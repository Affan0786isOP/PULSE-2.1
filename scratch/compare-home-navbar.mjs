import { chromium } from 'playwright';
import fs from 'fs';
import express from 'express';
import path from 'path';

async function compareHomeNav() {
  const app = express();
  const distDir = path.resolve('dist');
  app.use(express.static(distDir));
  app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));

  const server = await new Promise(r => {
    const s = app.listen(4197, '127.0.0.1', () => r(s));
  });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await page.goto('http://127.0.0.1:4197/');
  await page.waitForLoadState('networkidle');

  const header = await page.locator('header[role="banner"]');
  const homeNavCrop = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit/homepage_navbar_crop.png';
  await header.screenshot({ path: homeNavCrop });

  const refPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/.user_uploaded/media_1792327806559_492aae15.png';
  const refBase64 = 'data:image/png;base64,' + fs.readFileSync(refPath).toString('base64');
  const homeBase64 = 'data:image/png;base64,' + fs.readFileSync(homeNavCrop).toString('base64');

  const diffPage = await browser.newPage({ viewport: { width: 1040, height: 260 } });
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { margin: 0; padding: 16px; background: #0f172a; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .banner { padding: 6px 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 4px 4px 0 0; }
          .banner-ref { background: #334155; color: #94a3b8; }
          .banner-actual { background: #0284c7; color: #e0f2fe; margin-top: 16px; }
          .frame { border: 1px solid #334155; background: white; overflow: hidden; border-radius: 0 0 6px 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
          img { display: block; width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="banner banner-ref">SPEC REFERENCE: User Target Screenshot</div>
        <div class="frame">
          <img src="${refBase64}" />
        </div>
        <div class="banner banner-actual">ACTUAL HOMEPAGE: Rendered Navbar on / (1024px)</div>
        <div class="frame">
          <img src="${homeBase64}" />
        </div>
      </body>
    </html>
  `;
  await diffPage.setContent(html);
  await diffPage.waitForTimeout(300);

  const homeDiffPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit/homepage_navbar_pixel_perfect_diff.png';
  await diffPage.screenshot({ path: homeDiffPath, fullPage: true });
  console.log('Saved homepage navbar diff to:', homeDiffPath);

  await browser.close();
  server.close();
}

compareHomeNav().catch(console.error);

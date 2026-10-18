import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function generateDiff() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1040, height: 260 } });
  
  const refPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/.user_uploaded/media_1792327806559_492aae15.png';
  const rendPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit/rendered_navbar_1024.png';

  const refBase64 = `data:image/png;base64,${fs.readFileSync(refPath).toString('base64')}`;
  const rendBase64 = `data:image/png;base64,${fs.readFileSync(rendPath).toString('base64')}`;

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
        <div class="banner banner-actual">ACTUAL IMPLEMENTATION: Rendered Navbar (1024px)</div>
        <div class="frame">
          <img src="${rendBase64}" />
        </div>
      </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(300);

  const diffPath = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/audit/navbar_pixel_perfect_diff.png';
  await page.screenshot({ path: diffPath, fullPage: true });
  console.log('Saved visual diff comparison to:', diffPath);

  await browser.close();
}

generateDiff().catch(console.error);

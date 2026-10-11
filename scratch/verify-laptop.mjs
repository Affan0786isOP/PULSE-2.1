import { chromium } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';
const DIST_DIR = path.resolve('dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function startServer(port = 5173) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url?.split('?')[0] || '/');
      let filePath = path.join(DIST_DIR, reqPath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      } catch (e) {
        res.writeHead(500);
        res.end('Error loading ' + reqPath);
      }
    });

    server.listen(port, '127.0.0.1', () => {
      console.log(`Static server running at http://127.0.0.1:${port}/`);
      resolve(server);
    });
  });
}

async function main() {
  const server = await startServer(5173);
  const url = 'http://127.0.0.1:5173/';

  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const viewports = [
    { name: 'laptop-1440x900', width: 1440, height: 900 },
    { name: 'laptop-1366x768', width: 1366, height: 768 },
    { name: 'laptop-1280x720', width: 1280, height: 720 },
  ];

  for (const vp of viewports) {
    console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(500);

    // Verify main elements exist
    const heading = await page.textContent('h1');
    console.log(`H1 text: "${heading?.replace(/\s+/g, ' ').trim()}"`);

    // Take screenshot of default state
    const screenshotPath = `${ARTIFACT_DIR}/${vp.name}.png`;
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${screenshotPath}`);

    // If 1440x900, also test carousel and modal interactions:
    if (vp.name === 'laptop-1440x900') {
      console.log('Testing Next button interaction...');
      const nextBtn = page.getByRole('button', { name: 'Next assessment protocol' });
      await nextBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${ARTIFACT_DIR}/interaction-next-card.png` });

      console.log('Testing Previous button interaction...');
      const prevBtn = page.getByRole('button', { name: 'Previous assessment protocol' });
      await prevBtn.click();
      await page.waitForTimeout(600);

      console.log('Testing Pagination dot interaction (selecting 3rd protocol)...');
      const dots = page.getByRole('tab');
      await dots.nth(2).click(); // Colour Recognition
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${ARTIFACT_DIR}/interaction-dot-selected.png` });

      console.log('Testing Settings modal open...');
      const settingsBtn = page.getByRole('button', { name: 'Settings' });
      await settingsBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${ARTIFACT_DIR}/interaction-settings-modal.png` });

      // Close settings modal (press Escape)
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);

      console.log('Testing Info modal open...');
      const infoBtn = page.getByRole('button', { name: 'Platform Information' });
      await infoBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${ARTIFACT_DIR}/interaction-info-modal.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    await page.close();
  }

  await browser.close();
  server.close();
  console.log('Browser tests and visual screenshots completed successfully!');
}

main().catch(err => {
  console.error('Browser testing failed:', err);
  process.exit(1);
});

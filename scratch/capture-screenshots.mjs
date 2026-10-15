import { chromium, devices } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/affan/.gemini/antigravity/brain/512a5e51-7361-48db-b8c7-7cdc64411a7d/screenshots/before';
fs.mkdirSync(outDir, { recursive: true });

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url);
      if (res.status === 200 || res.status === 304) return true;
    } catch (e) {
      // wait
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not become ready in ${timeout}ms`);
}

async function main() {
  console.log('Starting server dist/server.js...');
  const server = spawn('node', ['dist/server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3000', NODE_ENV: 'production' },
    stdio: 'inherit'
  });

  try {
    await waitForServer('http://localhost:3000/api/health');
    console.log('Server is healthy on port 3000!');

    const browser = await chromium.launch({ headless: true });

    const routes = [
      '/',
      '/about',
      '/assessments',
      '/leaderboard',
      '/dataset',
      '/improve',
      '/reaction-test',
      '/direction-test',
      '/block-memory',
      '/number-memory',
      '/color-test',
      '/privacy'
    ];

    const consoleErrors = [];
    const failedRequests = [];

    // 1. DESKTOP CAPTURE
    console.log('Capturing Desktop routes...');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ context: 'desktop', url: desktopPage.url(), text: msg.text() });
      }
    });
    desktopPage.on('requestfailed', req => {
      failedRequests.push({ context: 'desktop', url: req.url(), failure: req.failure()?.errorText });
    });

    for (const route of routes) {
      const url = `http://localhost:3000${route}`;
      try {
        await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await desktopPage.waitForTimeout(600);
        const filename = 'desktop_' + (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_')) + '.png';
        await desktopPage.screenshot({ path: path.join(outDir, filename), fullPage: false });
        console.log(`Captured: ${filename}`);
      } catch (err) {
        console.error(`Failed to capture desktop ${route}:`, err.message);
      }
    }

    // Modal captures on Desktop
    try {
      await desktopPage.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 15000 });
      // Click settings button if present
      const settingsBtn = await desktopPage.$('button[aria-label*="Setting"], button:has-text("Settings"), button[title*="Setting"]');
      if (settingsBtn) {
        await settingsBtn.click();
        await desktopPage.waitForTimeout(500);
        await desktopPage.screenshot({ path: path.join(outDir, 'desktop_modal_settings.png') });
        console.log('Captured: desktop_modal_settings.png');
      }
    } catch (e) {
      console.warn('Could not capture desktop settings modal:', e.message);
    }

    await desktopContext.close();

    // 2. MOBILE CAPTURE
    console.log('Capturing Mobile routes...');
    const mobileContext = await browser.newContext({
      ...devices['Pixel 5'],
      viewport: { width: 393, height: 851 },
      isMobile: true,
      hasTouch: true
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({ context: 'mobile', url: mobilePage.url(), text: msg.text() });
      }
    });
    mobilePage.on('requestfailed', req => {
      failedRequests.push({ context: 'mobile', url: req.url(), failure: req.failure()?.errorText });
    });

    for (const route of routes) {
      const url = `http://localhost:3000/mobile${route === '/' ? '' : route}`;
      try {
        await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await mobilePage.waitForTimeout(600);
        const filename = 'mobile_' + (route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '_')) + '.png';
        await mobilePage.screenshot({ path: path.join(outDir, filename), fullPage: false });
        console.log(`Captured: ${filename}`);
      } catch (err) {
        console.error(`Failed to capture mobile ${route}:`, err.message);
      }
    }

    // Modal captures on Mobile
    try {
      await mobilePage.goto('http://localhost:3000/mobile', { waitUntil: 'networkidle', timeout: 15000 });
      const mobileSettingsBtn = await mobilePage.$('button[aria-label*="Setting"], button:has-text("Settings"), button[title*="Setting"]');
      if (mobileSettingsBtn) {
        await mobileSettingsBtn.click();
        await mobilePage.waitForTimeout(500);
        await mobilePage.screenshot({ path: path.join(outDir, 'mobile_modal_settings.png') });
        console.log('Captured: mobile_modal_settings.png');
      }
    } catch (e) {
      console.warn('Could not capture mobile settings modal:', e.message);
    }

    await mobileContext.close();
    await browser.close();

    fs.writeFileSync(path.join(outDir, 'telemetry.json'), JSON.stringify({ consoleErrors, failedRequests }, null, 2));
    console.log(`Audit captures complete! Errors: ${consoleErrors.length}, Failed requests: ${failedRequests.length}`);
  } finally {
    server.kill();
  }
}

main().catch(err => {
  console.error('Fatal error during screenshot audit:', err);
  process.exit(1);
});

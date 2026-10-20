import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_SCRATCH_DIR = 'C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2/scratch/mobile_theme_audit';
const PORT = 4174;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(ARTIFACT_SCRATCH_DIR)) {
  fs.mkdirSync(ARTIFACT_SCRATCH_DIR, { recursive: true });
}

const MOBILE_ROUTES = [
  { name: 'home', path: '/mobile/' },
  { name: 'assessments', path: '/mobile/assessments' },
  { name: 'leaderboard', path: '/mobile/leaderboard' },
  { name: 'improve', path: '/mobile/improve' },
  { name: 'reaction-test', path: '/mobile/reaction-test', isApparatus: true },
  { name: 'direction-test', path: '/mobile/direction-test', isApparatus: true },
  { name: 'about', path: '/mobile/about' },
  { name: 'privacy', path: '/mobile/privacy' },
];

async function startServer() {
  console.log('Starting production server on port', PORT);
  const server = spawn('node', ['dist/server.js'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Production server start timed out')), 15000);
    server.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Server running on port') || msg.includes('http://')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on('data', (err) => {
      console.error('Server err:', err.toString());
    });
  });

  await new Promise((r) => setTimeout(r, 800));
  return server;
}

async function runMobileAudit() {
  const server = await startServer();
  let browser;

  const results = {
    timestamp: new Date().toISOString(),
    pagesAudited: 0,
    screenshots: [],
    anomalies: [],
  };

  try {
    console.log('Launching Chromium with system Chrome...');
    browser = await chromium.launch({ channel: 'chrome', headless: true });

    for (const theme of ['light', 'dark']) {
      console.log(`\n=== Auditing Mobile (iPhone 390x844) in ${theme.toUpperCase()} mode ===`);

      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      });

      // Set cookie and localStorage for theme
      await context.addInitScript((th) => {
        localStorage.setItem(
          'pulse_user_settings',
          JSON.stringify({
            themeMode: th,
            soundEnabled: true,
            hapticsEnabled: true,
            reducedMotionEnabled: false,
            fontScale: 1.0,
            exhibitionModeEnabled: false,
          })
        );
        localStorage.setItem('pulse_welcome_seen', 'true');
        localStorage.setItem('pulse_welcome_dismissed', 'true');
        document.cookie = `pulse_user_settings=${encodeURIComponent(
          JSON.stringify({ themeMode: th })
        )}; path=/; SameSite=Lax`;
      }, theme);

      const page = await context.newPage();

      for (const item of MOBILE_ROUTES) {
        const url = `${BASE_URL}${item.path}`;
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 10000 });
          await page.waitForTimeout(600); // Allow render & motion to settle

          const evalData = await page.evaluate(() => {
            const doc = document.documentElement;
            const body = document.body;
            const dataTheme = doc.getAttribute('data-theme');
            const classList = Array.from(doc.classList);
            const computedBodyBg = window.getComputedStyle(body).backgroundColor;
            return { dataTheme, classList, computedBodyBg };
          });

          if (item.isApparatus) {
            if (evalData.dataTheme !== 'dark') {
              results.anomalies.push({
                view: item.name,
                theme,
                issue: `Apparatus route ${item.path} has data-theme "${evalData.dataTheme}" instead of "dark"`,
              });
            }
          } else {
            if (evalData.dataTheme !== theme) {
              results.anomalies.push({
                view: item.name,
                theme,
                issue: `Expected data-theme="${theme}" but found "${evalData.dataTheme}" on ${item.path}`,
              });
            }
          }

          const screenshotName = `mobile-${item.name}-${theme}.png`;
          const screenshotPath = path.join(ARTIFACT_SCRATCH_DIR, screenshotName);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          results.screenshots.push({
            name: item.name,
            theme,
            viewport: 'mobile',
            path: screenshotPath,
            evalData,
          });
          results.pagesAudited++;
          console.log(`✓ Captured [Mobile ${theme}] ${item.name} (${item.path})`);
        } catch (pageErr) {
          console.error(`✗ Error capturing ${item.name}:`, pageErr.message);
          results.anomalies.push({ view: item.name, theme, issue: pageErr.message });
        }
      }

      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    if (server && server.pid) {
      try {
        spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true });
      } catch {}
    }
    console.log('\nPreview server stopped.');
  }

  fs.writeFileSync(
    path.join(ARTIFACT_SCRATCH_DIR, 'mobile-audit-summary.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  );
  console.log(`\nAudit finished! Total screenshots captured: ${results.screenshots.length}`);
  console.log(`Anomalies detected: ${results.anomalies.length}`);
  if (results.anomalies.length > 0) {
    console.log('Anomalies detail:', results.anomalies);
  }

  process.exit(0);
}

runMobileAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});

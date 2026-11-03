import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const ARTIFACT_SCRATCH_DIR = 'C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2/scratch/theme_audit';
const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

if (!fs.existsSync(ARTIFACT_SCRATCH_DIR)) {
  fs.mkdirSync(ARTIFACT_SCRATCH_DIR, { recursive: true });
}

// Routes to audit
const ROUTES = [
  { name: 'home', path: '/' },
  { name: 'about', path: '/about' },
  { name: 'assessments', path: '/assessments' },
  { name: 'leaderboard', path: '/leaderboard' },
  { name: 'improve', path: '/improve' },
  { name: 'dataset', path: '/dataset' },
  { name: 'privacy', path: '/privacy' },
  { name: 'admin', path: '/admin' },
  { name: 'not-found', path: '/non-existent-page-404' },
  // Protected Cognitive Apparatus Pages (must be dark apparatus mode)
  { name: 'apparatus-reaction', path: '/reaction-test', isApparatus: true },
  { name: 'apparatus-direction', path: '/direction-test', isApparatus: true },
  { name: 'apparatus-block-memory', path: '/block-memory', isApparatus: true },
  { name: 'apparatus-number-memory', path: '/number-memory', isApparatus: true },
  { name: 'apparatus-colour', path: '/colour-recognition', isApparatus: true },
];

async function startServer() {
  console.log('Starting preview server on port', PORT);
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    shell: true,
    stdio: 'pipe',
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Preview server start timed out')), 15000);
    server.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('http://') || msg.includes('Local:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.stderr.on('data', (err) => {
      console.error('Server err:', err.toString());
    });
  });

  // Short pause to ensure socket readiness
  await new Promise((r) => setTimeout(r, 800));
  return server;
}

async function runAudit() {
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

    // 1. Audit Desktop in Light and Dark Mode
    for (const theme of ['light', 'dark']) {
      console.log(`\n=== Auditing Desktop in ${theme.toUpperCase()} mode ===`);

      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      });

      // Set cookie and localStorage before navigation
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

      for (const item of ROUTES) {
        const url = `${BASE_URL}${item.path}`;
        try {
          await page.goto(url, { waitUntil: 'load', timeout: 10000 });
          await page.waitForTimeout(600); // Allow motion & layout to settle

          // Inspect document theme attributes
          const evalData = await page.evaluate(() => {
            const doc = document.documentElement;
            const body = document.body;
            const dataTheme = doc.getAttribute('data-theme');
            const classList = Array.from(doc.classList);
            const computedBodyBg = window.getComputedStyle(body).backgroundColor;
            const colorScheme = doc.style.colorScheme;
            return { dataTheme, classList, computedBodyBg, colorScheme };
          });

          // Check apparatus invariant
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

          const screenshotName = `desktop-${item.name}-${theme}.png`;
          const screenshotPath = path.join(ARTIFACT_SCRATCH_DIR, screenshotName);
          await page.screenshot({ path: screenshotPath, fullPage: false });

          results.screenshots.push({
            name: item.name,
            theme,
            viewport: 'desktop',
            path: screenshotPath,
            evalData,
          });
          results.pagesAudited++;
          console.log(`✓ Captured [Desktop ${theme}] ${item.name} (${item.path})`);
        } catch (pageErr) {
          console.error(`✗ Error capturing ${item.name}:`, pageErr.message);
          results.anomalies.push({ view: item.name, theme, issue: pageErr.message });
        }
      }

      // 2. Audit Modals (SettingsModal tabs) on desktop
      try {
        await page.goto(BASE_URL, { waitUntil: 'load' });
        await page.waitForTimeout(400);

        const settingsButton = page.locator('button[aria-label="Settings"], button:has-text("Settings"), button[data-testid="settings-btn"]');
        if (await settingsButton.first().isVisible()) {
          await settingsButton.first().click();
          await page.waitForTimeout(400);

          // General Tab
          let modalScreenshot = `desktop-modal-settings-general-${theme}.png`;
          await page.screenshot({ path: path.join(ARTIFACT_SCRATCH_DIR, modalScreenshot) });
          results.screenshots.push({ name: 'settings-modal-general', theme, viewport: 'desktop', path: modalScreenshot });
          console.log(`✓ Captured [Desktop ${theme}] Settings Modal (General)`);

          // Feedback Tab
          const feedbackTab = page.locator('button:has-text("Feedback")');
          if (await feedbackTab.first().isVisible()) {
            await feedbackTab.first().click();
            await page.waitForTimeout(300);
            modalScreenshot = `desktop-modal-settings-feedback-${theme}.png`;
            await page.screenshot({ path: path.join(ARTIFACT_SCRATCH_DIR, modalScreenshot) });
            results.screenshots.push({ name: 'settings-modal-feedback', theme, viewport: 'desktop', path: modalScreenshot });
            console.log(`✓ Captured [Desktop ${theme}] Settings Modal (Feedback)`);
          }

          // System Tab
          const systemTab = page.locator('button:has-text("System")');
          if (await systemTab.first().isVisible()) {
            await systemTab.first().click();
            await page.waitForTimeout(300);
            modalScreenshot = `desktop-modal-settings-system-${theme}.png`;
            await page.screenshot({ path: path.join(ARTIFACT_SCRATCH_DIR, modalScreenshot) });
            results.screenshots.push({ name: 'settings-modal-system', theme, viewport: 'desktop', path: modalScreenshot });
            console.log(`✓ Captured [Desktop ${theme}] Settings Modal (System)`);
          }
        }
      } catch (modalErr) {
        console.error('Modal capture error:', modalErr.message);
      }

      await context.close();
    }

    // 3. Audit Welcome Modal
    const welcomeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await welcomeContext.addInitScript(() => {
      localStorage.clear();
      document.cookie = 'pulse_user_settings=; path=/; max-age=0';
    });
    const welcomePage = await welcomeContext.newPage();
    await welcomePage.goto(BASE_URL, { waitUntil: 'load' });
    await welcomePage.waitForTimeout(600);
    const welcomeScreenshot = path.join(ARTIFACT_SCRATCH_DIR, 'desktop-modal-welcome.png');
    await welcomePage.screenshot({ path: welcomeScreenshot });
    results.screenshots.push({ name: 'welcome-modal', theme: 'default', viewport: 'desktop', path: welcomeScreenshot });
    console.log(`✓ Captured [Desktop] Welcome Modal`);
    await welcomeContext.close();

    // 4. Audit Mobile in Dark Mode
    console.log(`\n=== Auditing Mobile (390x844) ===`);
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    });
    await mobileContext.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });
    const mobilePage = await mobileContext.newPage();
    for (const item of ROUTES.slice(0, 7)) {
      try {
        await mobilePage.goto(`${BASE_URL}${item.path}`, { waitUntil: 'load' });
        await mobilePage.waitForTimeout(500);
        const mobileScreenshot = path.join(ARTIFACT_SCRATCH_DIR, `mobile-${item.name}.png`);
        await mobilePage.screenshot({ path: mobileScreenshot });
        results.screenshots.push({ name: item.name, theme: 'dark', viewport: 'mobile', path: mobileScreenshot });
        console.log(`✓ Captured [Mobile] ${item.name}`);
      } catch (e) {
        console.error(`✗ Error on mobile ${item.name}:`, e.message);
      }
    }
    await mobileContext.close();

  } finally {
    if (browser) await browser.close();
    if (server && server.pid) {
      try {
        spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { shell: true });
      } catch {}
    }
    console.log('\nPreview server stopped.');
  }

  // Save audit summary
  fs.writeFileSync(
    path.join(ARTIFACT_SCRATCH_DIR, 'audit-summary.json'),
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

runAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});

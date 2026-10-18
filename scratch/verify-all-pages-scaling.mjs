import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\affan\\.gemini\\antigravity\\brain\\3db85b39-2430-42c7-aeb4-1334eb822588\\audit';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  const page = await context.newPage();
  
  // Suppress welcome modals
  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_system_settings', JSON.stringify({
      reducedMotionEnabled: false,
      audioEnabled: false,
      hapticsEnabled: false,
    }));
  });

  const routes = [
    { url: 'http://localhost:3000/', name: 'home_scaled_1440' },
    { url: 'http://localhost:3000/assessments', name: 'assessments_scaled_1440' },
    { url: 'http://localhost:3000/leaderboard', name: 'leaderboard_scaled_1440' },
    { url: 'http://localhost:3000/about', name: 'about_scaled_1440' },
    { url: 'http://localhost:3000/reaction-test', name: 'reaction_scaled_1440' },
    { url: 'http://localhost:3000/dataset', name: 'dataset_scaled_1440' },
    { url: 'http://localhost:3000/improve', name: 'improve_scaled_1440' },
    { url: 'http://localhost:3000/non-existent-page', name: '404_scaled_1440' },
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    
    // Check computed zoom and minHeight on div[data-theme] root
    const rootStyle = await page.evaluate(() => {
      const el = document.querySelector('div[data-theme]');
      return el ? { zoom: el.style.zoom, minHeight: el.style.minHeight, inline: el.getAttribute('style') } : null;
    });
    console.log(`Route ${r.name} applied root style:`, rootStyle);

    const outPath = path.join(ARTIFACT_DIR, `${r.name}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot to ${outPath}`);
  }

  // Also test at 1920x1080 for /assessments to verify 1.5x scaling
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('http://localhost:3000/assessments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const rootStyle1080 = await page.evaluate(() => {
    const el = document.querySelector('div[data-theme]');
    return el ? { zoom: el.style.zoom, minHeight: el.style.minHeight, inline: el.getAttribute('style') } : null;
  });
  console.log(`Assessments at 1920x1080 style:`, rootStyle1080);
  const outPath1080 = path.join(ARTIFACT_DIR, 'assessments_scaled_1080.png');
  await page.screenshot({ path: outPath1080 });
  console.log(`Saved screenshot to ${outPath1080}`);

  // Also test at 1280x720 (canonical 1:1 baseline)
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:3000/assessments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const rootStyle720 = await page.evaluate(() => {
    const el = document.querySelector('div[data-theme]');
    return el ? { zoom: el.style.zoom, minHeight: el.style.minHeight, inline: el.getAttribute('style') } : null;
  });
  console.log(`Assessments at 1280x720 (baseline) style:`, rootStyle720);

  // Also test at 390x844 (mobile view - must be unscaled scale=1)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:3000/assessments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const rootStyleMobile = await page.evaluate(() => {
    const el = document.querySelector('div[data-theme]');
    return el ? { zoom: el.style.zoom, minHeight: el.style.minHeight, inline: el.getAttribute('style') } : null;
  });
  console.log(`Assessments at 390x844 (mobile) style:`, rootStyleMobile);

  await browser.close();
  console.log('Visual verification capture finished successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

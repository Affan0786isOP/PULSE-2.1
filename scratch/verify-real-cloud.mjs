import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/9116b4b2-63f5-451d-9321-78c8e3f49c21';

async function captureRealData() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  console.log('Opening /leaderboard?assessmentType=visual-reaction with REAL Cloud Firestore data...');
  await page.goto('http://127.0.0.1:3000/leaderboard?assessmentType=visual-reaction', { waitUntil: 'load' });
  
  // Wait for the real participant names from Cloud Firestore to appear
  await page.waitForSelector('text=Affan', { timeout: 15000 });
  await page.waitForTimeout(600);

  const realVrtPath = path.join(ARTIFACT_DIR, 'leaderboard-real-cloud-vrt-1440.png');
  await page.screenshot({ path: realVrtPath });
  console.log('Saved REAL CLOUD VRT screenshot to:', realVrtPath);

  // Switch to Direction tab
  console.log('Clicking Direction tab...');
  await page.click('#leaderboard-tab-direction');
  await page.waitForTimeout(2500);

  const realDirectionPath = path.join(ARTIFACT_DIR, 'leaderboard-real-cloud-direction-1440.png');
  await page.screenshot({ path: realDirectionPath });
  console.log('Saved REAL CLOUD Direction screenshot to:', realDirectionPath);

  await browser.close();
}

captureRealData().catch(err => {
  console.error(err);
  process.exit(1);
});

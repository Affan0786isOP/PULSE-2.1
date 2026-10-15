import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/9116b4b2-63f5-451d-9321-78c8e3f49c21';

const MOCK_DIRECTION_ENTRIES = [
  { id: '1', displayName: 'Alex Chen', assessmentType: 'direction', scoreMetric: 96.2, ageGroup: 'Young adults (18–25)', createdAt: 1700000000000, source: 'cloud', accuracy: 0.99 },
  { id: '2', displayName: 'Priya Singh', assessmentType: 'direction', scoreMetric: 94.7, ageGroup: 'Young adults (18–25)', createdAt: 1700000001000, source: 'cloud', accuracy: 0.98 },
  { id: '3', displayName: 'Marcus Lee', assessmentType: 'direction', scoreMetric: 92.1, ageGroup: 'Adults (26–39)', createdAt: 1700000002000, source: 'cloud', accuracy: 0.97 },
  { id: '4', displayName: 'Emma Wilson', assessmentType: 'direction', scoreMetric: 89.8, ageGroup: 'Young adults (18–25)', createdAt: 1700000003000, source: 'cloud', accuracy: 0.95 },
  { id: '5', displayName: 'Daniel Kim', assessmentType: 'direction', scoreMetric: 88.4, ageGroup: 'Middle-aged (40–59)', createdAt: 1700000004000, source: 'cloud', accuracy: 0.93 },
  { id: '6', displayName: 'Sofia Martinez', assessmentType: 'direction', scoreMetric: 86.7, ageGroup: 'Young adults (18–25)', createdAt: 1700000005000, source: 'cloud', accuracy: 0.91 },
  { id: '7', displayName: 'Liam Patel', assessmentType: 'direction', scoreMetric: 84.3, ageGroup: 'Adults (26–39)', createdAt: 1700000006000, source: 'cloud', accuracy: 0.89 },
  { id: '8', displayName: 'Isabella Rossi', assessmentType: 'direction', scoreMetric: 82.9, ageGroup: 'Young adults (18–25)', createdAt: 1700000007000, source: 'cloud', accuracy: 0.87 },
  { id: '9', displayName: 'Noah Kim', assessmentType: 'direction', scoreMetric: 81.4, ageGroup: 'Young adults (18–25)', createdAt: 1700000008000, source: 'cloud', accuracy: 0.85 },
  { id: '10', displayName: 'Maya Singh', assessmentType: 'direction', scoreMetric: 79.1, ageGroup: 'Adults (26–39)', createdAt: 1700000009000, source: 'cloud', accuracy: 0.82 },
];

const RESOLUTIONS = [
  { name: '480p', width: 854, height: 480 },
  { name: '720p', width: 1280, height: 720 },
  { name: '1080p', width: 1920, height: 1080 },
  { name: '4k', width: 3840, height: 2160 },
];

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const res of RESOLUTIONS) {
    const context = await browser.newContext({
      viewport: { width: res.width, height: res.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });

    await page.route('**/api/leaderboard?assessmentType=*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          entries: MOCK_DIRECTION_ENTRIES
        })
      });
    });

    console.log(`Capturing ${res.name} (${res.width}x${res.height})...`);
    await page.goto('http://127.0.0.1:3000/leaderboard?assessmentType=direction', { waitUntil: 'load' });
    await page.waitForSelector('text=Alex Chen', { timeout: 10000 });
    await page.waitForTimeout(600);

    const outPath = path.join(ARTIFACT_DIR, `leaderboard-${res.name}.png`);
    await page.screenshot({ path: outPath });
    console.log(`Saved ${res.name} to ${outPath}`);

    await context.close();
  }

  await browser.close();
  console.log('All resolutions captured successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

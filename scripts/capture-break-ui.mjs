import { chromium } from 'playwright';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/202e9e53-c5ee-4811-a57c-41fd3b897aa2';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch();

  // 1. Laptop / Desktop captures (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.addInitScript(() => {
    localStorage.setItem('app_welcome_seen', 'true');
    localStorage.setItem('app_welcome_dismissed', 'true');
  });

  const modes = ['demo', 'worst', 'empty', 'one'];

  for (const mode of modes) {
    // Visual Reaction
    await desktopPage.goto(`${BASE_URL}/dataset?data=${mode}`, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({
      path: path.join(ARTIFACT_DIR, `laptop-visual-${mode}.png`),
      fullPage: true,
    });

    // Switch to Direction tab
    const dirButton = desktopPage.getByRole('button', { name: /Select DIRECTION/i });
    if (await dirButton.isVisible()) {
      await dirButton.click();
      await desktopPage.waitForTimeout(800);
      await desktopPage.screenshot({
        path: path.join(ARTIFACT_DIR, `laptop-direction-${mode}.png`),
        fullPage: true,
      });
    }
  }

  await desktopContext.close();

  // 2. Mobile captures (390x844 - iPhone 14 / standard mobile)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.addInitScript(() => {
    localStorage.setItem('app_welcome_seen', 'true');
    localStorage.setItem('app_welcome_dismissed', 'true');
  });

  for (const mode of modes) {
    // Visual Reaction
    await mobilePage.goto(`${BASE_URL}/dataset?data=${mode}`, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(800);
    await mobilePage.screenshot({
      path: path.join(ARTIFACT_DIR, `mobile-visual-${mode}.png`),
      fullPage: true,
    });

    // Switch to Direction tab
    const dirBtn = mobilePage.getByRole('button', { name: /Select DIRECTION/i });
    if (await dirBtn.isVisible()) {
      await dirBtn.click();
      await mobilePage.waitForTimeout(800);
      await mobilePage.screenshot({
        path: path.join(ARTIFACT_DIR, `mobile-direction-${mode}.png`),
        fullPage: true,
      });
    }
  }

  // 3. Narrow mobile 320px stress test
  const narrowContext = await browser.newContext({
    viewport: { width: 320, height: 650 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });
  const narrowPage = await narrowContext.newPage();
  await narrowPage.addInitScript(() => {
    localStorage.setItem('app_welcome_seen', 'true');
    localStorage.setItem('app_welcome_dismissed', 'true');
  });
  await narrowPage.goto(`${BASE_URL}/dataset?data=worst`, { waitUntil: 'domcontentloaded' });
  await narrowPage.waitForTimeout(800);
  await narrowPage.screenshot({
    path: path.join(ARTIFACT_DIR, `mobile-320px-worst.png`),
    fullPage: true,
  });

  await browser.close();
  console.log('Capture completed successfully');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

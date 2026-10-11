import { chromium } from '@playwright/test';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';

async function verifySettings() {
  const browser = await chromium.launch();

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '375x812', width: 375, height: 812 },
    { name: '375x667', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    console.log(`--- Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(400);

    // Open Settings dialog
    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
    } else {
      // In case on small screen it's in a drawer or header
      const altSettings = page.getByLabel('Settings');
      await altSettings.click();
    }
    await page.waitForTimeout(350);

    // Click System tab to match reference image
    const systemTab = page.getByRole('button', { name: 'System' });
    await systemTab.click();
    
    // Wait for display timing detection to resolve
    try {
      await page.waitForSelector('text=Hz', { timeout: 2500 });
    } catch {}
    await page.waitForTimeout(300);

    // Take screenshot of System tab
    await page.screenshot({ path: `${ARTIFACT_DIR}/settings-${vp.name}-system.png` });
    console.log(`Saved settings-${vp.name}-system.png`);

    // On 1440x900, also test interactions & other tabs
    if (vp.name === '1440x900') {
      // Test General tab
      const generalTab = page.getByRole('button', { name: 'General' });
      await generalTab.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${ARTIFACT_DIR}/settings-1440x900-general.png` });

      // Test Feedback tab
      const feedbackTab = page.getByRole('button', { name: 'Feedback' });
      await feedbackTab.click();
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${ARTIFACT_DIR}/settings-1440x900-feedback.png` });

      // Switch back to System
      await systemTab.click();
      await page.waitForTimeout(200);

      // Toggle Reduced Motion
      const motionToggle = page.getByRole('switch', { name: 'Toggle Reduced Motion' });
      await motionToggle.click();
      await page.waitForTimeout(200);

      // Toggle Exhibition Mode
      const kioskToggle = page.getByRole('switch', { name: 'Toggle Exhibition Kiosk Mode' });
      await kioskToggle.click();
      await page.waitForTimeout(200);

      // Click Recalibrate and capture active spinner state
      const recalibrateBtn = page.getByRole('button', { name: 'Recalibrate' });
      await recalibrateBtn.click();
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${ARTIFACT_DIR}/settings-1440x900-calibrating.png` });

      // Wait for recalibration to settle
      try {
        await page.waitForSelector('text=Hz', { timeout: 3500 });
      } catch {}
      await page.waitForTimeout(400);

      // Screenshot after interactions
      await page.screenshot({ path: `${ARTIFACT_DIR}/settings-1440x900-interacted.png` });
      console.log('Saved settings-1440x900-interacted.png');
    }

    await context.close();
  }

  await browser.close();
  console.log('All viewports tested successfully!');
}

verifySettings().catch(err => {
  console.error(err);
  process.exit(1);
});

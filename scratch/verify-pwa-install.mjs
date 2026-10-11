import { chromium } from '@playwright/test';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';

async function verifyPwaInstall() {
  const browser = await chromium.launch();

  const viewports = [
    { name: '1440x900', width: 1440, height: 900 },
    { name: '1366x768', width: 1366, height: 768 },
    { name: '1280x720', width: 1280, height: 720 },
    { name: '375x812', width: 375, height: 812 },
    { name: '375x667', width: 375, height: 667 },
  ];

  // 1. Test Desktop Header with simulated beforeinstallprompt (actionable install state)
  console.log('--- Testing Desktop Header with Install App Button ---');
  for (const vp of viewports.slice(0, 3)) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    // Inject beforeinstallprompt before load so pwaStore captures it
    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const fakePromptEvent = new Event('beforeinstallprompt', { bubbles: true, cancelable: true });
        Object.assign(fakePromptEvent, {
          platforms: ['web'],
          userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
          prompt: () => Promise.resolve(),
        });
        window.dispatchEvent(fakePromptEvent);
      });
    });

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(600);

    // Verify Install App button is visible in header
    const installBtn = page.locator('#desktop-install-app-btn');
    const isVisible = await installBtn.isVisible();
    console.log(`Viewport ${vp.name} Install App button visible:`, isVisible);

    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-header-${vp.name}.png` });
    console.log(`Saved pwa-header-${vp.name}.png`);

    await context.close();
  }

  // 2. Test AddToHomeScreenModal across platform states at 1440x900
  console.log('--- Testing AddToHomeScreenModal Platform Variations ---');
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(400);

    // Open via Settings > Mobile Web App Install button
    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    await settingsBtn.click();
    await page.waitForTimeout(350);

    const openGuideBtn = page.locator('#open-a2hs-guide-btn');
    await openGuideBtn.click();
    await page.waitForTimeout(400);

    // Screenshot default desktop guide
    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-modal-desktop-default.png` });
    console.log('Saved pwa-modal-desktop-default.png');

    await context.close();
  }

  // 3. Test AddToHomeScreenModal on mobile viewports (375x812 and 375x667)
  console.log('--- Testing Mobile Viewports (375x812 & 375x667) ---');
  for (const vp of viewports.slice(3)) {
    const context = await browser.newContext({ 
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('pulse_mobile_welcome_seen', 'true');
    });

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(500);

    // On mobile, the install button is conditionally rendered in the hero
    const mobileInstallBtn = page.getByRole('button', { name: 'Install App' });
    if (await mobileInstallBtn.isVisible()) {
      await mobileInstallBtn.click();
    } else {
      // Or open menu > settings
      const menuBtn = page.getByRole('button', { name: /open settings/i });
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await page.waitForTimeout(300);
        const guideBtn = page.locator('#open-a2hs-guide-btn');
        if (await guideBtn.isVisible()) {
          await guideBtn.click();
        }
      }
    }
    await page.waitForTimeout(400);

    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-modal-${vp.name}-ios-safari.png` });
    console.log(`Saved pwa-modal-${vp.name}-ios-safari.png`);

    await context.close();
  }

  // 4. Test Native Prompt & Installed States
  console.log('--- Testing Native Prompt and Already-Installed States ---');
  {
    // Native Prompt state with beforeinstallprompt
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.addEventListener('load', () => {
        const fakePrompt = new Event('beforeinstallprompt', { bubbles: true, cancelable: true });
        Object.assign(fakePrompt, {
          platforms: ['web'],
          userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
          prompt: () => Promise.resolve(),
        });
        window.dispatchEvent(fakePrompt);
      });
    });

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(500);

    // Open via Settings > Details/Install
    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    await settingsBtn.click();
    await page.waitForTimeout(350);

    const guideBtn = page.locator('#open-a2hs-guide-btn');
    await guideBtn.click();
    await page.waitForTimeout(400);

    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-modal-native-prompt.png` });
    console.log('Saved pwa-modal-native-prompt.png');

    await context.close();
  }

  {
    // Standalone / Already installed state
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.addInitScript(() => {
      window.__PULSE_APP_INSTALLED__ = true;
    });

    await page.goto('http://127.0.0.1:5173/');
    await page.waitForTimeout(500);

    // Header should NOT have Install App button
    const installBtn = page.locator('#desktop-install-app-btn');
    console.log('Installed state: Install App button visible:', await installBtn.isVisible());

    // In settings, should show "Active" and "Details"
    const settingsBtn = page.getByRole('button', { name: 'Settings' });
    await settingsBtn.click();
    await page.waitForTimeout(350);

    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-settings-installed-state.png` });
    console.log('Saved pwa-settings-installed-state.png');

    // Click Details to view already-installed modal
    const detailsBtn = page.locator('#open-a2hs-guide-btn');
    await detailsBtn.click();
    await page.waitForTimeout(400);

    await page.screenshot({ path: `${ARTIFACT_DIR}/pwa-modal-already-installed.png` });
    console.log('Saved pwa-modal-already-installed.png');

    await context.close();
  }

  await browser.close();
  console.log('All PWA browser verifications completed successfully!');
}

verifyPwaInstall().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';

async function verifyWelcomeModal() {
  const browser = await chromium.launch();
  
  // 1. Desktop 1440x900 test
  console.log('--- Testing Desktop 1440x900 ---');
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  // Clear localStorage to simulate fresh user
  await page.goto('http://127.0.0.1:5173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(500);

  // Click Info button to open Welcome modal
  const infoBtn = page.getByRole('button', { name: 'Platform Information' });
  await infoBtn.click();
  await page.waitForTimeout(400);

  // Capture desktop modal screenshot
  await page.screenshot({ path: `${ARTIFACT_DIR}/welcome-modal-desktop.png` });
  console.log('Saved welcome-modal-desktop.png');

  // Verify checkbox starts unchecked
  let isChecked = await page.evaluate(() => {
    const cb = document.querySelector('#welcome-dont-show-again');
    return cb ? cb.checked : null;
  });
  console.log('Initial checkbox checked state:', isChecked);

  // Click "Don't show this again"
  const checkboxLabel = page.getByText("Don't show this again");
  await checkboxLabel.click();
  await page.waitForTimeout(200);

  // Check state after click
  isChecked = await page.evaluate(() => {
    const cb = document.querySelector('#welcome-dont-show-again');
    return cb ? cb.checked : null;
  });
  console.log('Checked state after click:', isChecked);

  // Check localStorage keys
  let storageState = await page.evaluate(() => ({
    desktop: localStorage.getItem('pulse_desktop_welcome_seen'),
    legacy: localStorage.getItem('pulse_welcome_seen')
  }));
  console.log('Storage after checking:', storageState);

  // Capture screenshot of checked state
  await page.screenshot({ path: `${ARTIFACT_DIR}/welcome-modal-checked.png` });

  // Close modal via close button
  const closeBtn = page.getByRole('button', { name: 'Close dialog' });
  await closeBtn.click();
  await page.waitForTimeout(400);

  // Reload page to test persistence across reload
  console.log('--- Testing persistence across reload ---');
  await page.reload();
  await page.waitForTimeout(500);

  storageState = await page.evaluate(() => ({
    desktop: localStorage.getItem('pulse_desktop_welcome_seen'),
    legacy: localStorage.getItem('pulse_welcome_seen')
  }));
  console.log('Storage after reload:', storageState);

  // Open modal again from Info button
  await infoBtn.click();
  await page.waitForTimeout(400);

  // Check that the checkbox retained its checked state!
  isChecked = await page.evaluate(() => {
    const cb = document.querySelector('#welcome-dont-show-again');
    return cb ? cb.checked : null;
  });
  console.log('Checkbox state upon re-opening after reload:', isChecked);

  // Now uncheck it to test unchecking persistence
  await checkboxLabel.click();
  await page.waitForTimeout(200);
  await closeBtn.click();
  await page.waitForTimeout(300);

  storageState = await page.evaluate(() => ({
    desktop: localStorage.getItem('pulse_desktop_welcome_seen'),
    legacy: localStorage.getItem('pulse_welcome_seen')
  }));
  console.log('Storage after unchecking and closing:', storageState);

  await context.close();

  // 2. Mobile 390x844 test
  console.log('--- Testing Mobile 390x844 ---');
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:5173/');
  await mobilePage.waitForTimeout(500);

  // Open Welcome modal on desktop/tablet breakpoint or direct component check
  const mobileInfoBtn = mobilePage.getByRole('button', { name: 'Platform Information' });
  if (await mobileInfoBtn.isVisible()) {
    await mobileInfoBtn.click();
    await mobilePage.waitForTimeout(400);
    await mobilePage.screenshot({ path: `${ARTIFACT_DIR}/welcome-modal-mobile.png` });
    console.log('Saved welcome-modal-mobile.png');
  }

  await mobileContext.close();

  // 3. Short viewport 1280x600 test
  console.log('--- Testing Short Viewport 1280x600 ---');
  const shortContext = await browser.newContext({ viewport: { width: 1280, height: 600 } });
  const shortPage = await shortContext.newPage();
  await shortPage.goto('http://127.0.0.1:5173/');
  await shortPage.waitForTimeout(500);
  const shortInfoBtn = shortPage.getByRole('button', { name: 'Platform Information' });
  await shortInfoBtn.click();
  await shortPage.waitForTimeout(400);
  await shortPage.screenshot({ path: `${ARTIFACT_DIR}/welcome-modal-short-viewport.png` });
  console.log('Saved welcome-modal-short-viewport.png');

  await shortContext.close();
  await browser.close();
  console.log('Browser verification completed successfully!');
}

verifyWelcomeModal().catch(err => {
  console.error(err);
  process.exit(1);
});

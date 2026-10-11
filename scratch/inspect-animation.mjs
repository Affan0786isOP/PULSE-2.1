import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588';

async function inspectAnimation() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // Capture initial state
  await page.screenshot({ path: `${ARTIFACT_DIR}/anim-frame-00.png` });

  // Click Next button and capture frames every 60ms
  const nextBtn = page.getByRole('button', { name: 'Next assessment protocol' });
  await nextBtn.click();

  const frames = [60, 120, 180, 240, 300, 400, 500, 600];
  for (let i = 0; i < frames.length; i++) {
    await page.waitForTimeout(60);
    const filename = `anim-frame-${String(i + 1).padStart(2, '0')}.png`;
    await page.screenshot({ path: `${ARTIFACT_DIR}/${filename}` });
  }

  // Also record DOM states and style logs during transition
  const cardStates = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[aria-roledescription="carousel"] [role="button"]'));
    return cards.map((c, i) => ({
      index: i,
      text: c.textContent?.trim().slice(0, 40),
      className: c.className,
      style: c.getAttribute('style'),
      rect: c.getBoundingClientRect(),
    }));
  });

  console.log('Post-animation card states:', JSON.stringify(cardStates, null, 2));

  await browser.close();
  console.log('Animation frame capture completed!');
}

inspectAnimation().catch(err => {
  console.error(err);
  process.exit(1);
});

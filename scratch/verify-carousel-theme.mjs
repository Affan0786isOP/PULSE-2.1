import { chromium } from 'playwright';

async function captureCarousel() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('pulse_welcome_seen', 'true');
    localStorage.setItem('pulse_desktop_welcome_seen', 'true');
    localStorage.setItem('pulse_welcome_dismissed', 'true');
  });

  await page.goto('http://127.0.0.1:5173/');
  await page.waitForTimeout(600);

  // Take full desktop screenshot
  await page.screenshot({ 
    path: 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/carousel-white-theme.png' 
  });
  console.log('Saved carousel-white-theme.png');

  // Next protocol to check next card transition
  const nextBtn = page.getByRole('button', { name: 'Next assessment protocol' });
  await nextBtn.click();
  await page.waitForTimeout(600);

  await page.screenshot({ 
    path: 'C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/carousel-white-theme-next.png' 
  });
  console.log('Saved carousel-white-theme-next.png');

  await browser.close();
}

captureCarousel().catch(console.error);

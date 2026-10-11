import { chromium } from 'playwright';

async function verifyMobileLogo() {
  const browser = await chromium.launch();
  
  // Test on iPhone 12/13/14 viewport (390 x 844) and iPhone SE (375 x 667)
  for (const vp of [
    { name: 'iphone-390x844', width: 390, height: 844 },
    { name: 'iphone-375x667', width: 375, height: 667 }
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_mobile_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });

    await page.goto('http://127.0.0.1:5173/mobile/');
    await page.waitForTimeout(600);

    const logoSvg = page.locator('header svg');
    console.log(`[${vp.name}] Header logo SVG count:`, await logoSvg.count());

    await page.screenshot({
      path: `C:/Users/affan/.gemini/antigravity/brain/3db85b39-2430-42c7-aeb4-1334eb822588/mobile-actual-logo-${vp.name}.png`
    });
    console.log(`Saved mobile-actual-logo-${vp.name}.png`);

    await context.close();
  }

  await browser.close();
}

verifyMobileLogo().catch(console.error);

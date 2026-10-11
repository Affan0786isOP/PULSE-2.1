import { chromium } from 'playwright';
import http from 'http';

const ARTIFACT_DIR = 'C:/Users/affan/.gemini/antigravity/brain/7309fa23-80de-4e85-a811-223fbcf23cbf';
const PORT = 4173;

function waitForServer(port, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get({ host: 'localhost', port: port, path: '/' }, (res) => {
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server start timed out'));
        } else {
          setTimeout(check, 500);
        }
      });
    };
    check();
  });
}

async function run() {
  console.log('Connecting to server on port', PORT);
  await waitForServer(PORT);
  console.log('Server is ready. Launching chromium...');

  const browser = await chromium.launch();

  // 1. Desktop 1440x900 on /assessments (which uses Navbar)
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });
    await page.goto(`http://localhost:${PORT}/assessments`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-desktop.png` });
    console.log('Captured desktop assessments navbar');
    await context.close();
  }

  // 2. Mobile 390x844 on /assessments (testing responsive hamburger)
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });
    await page.goto(`http://localhost:${PORT}/assessments`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-mobile.png` });
    console.log('Captured mobile assessments navbar');

    // Click hamburger menu to verify drawer
    const menuBtn = page.getByRole('button', { name: /open navigation menu/i });
    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-assessments-mobile-drawer.png` });
      console.log('Captured mobile assessments drawer');
    }
    await context.close();
  }

  // 3. Sub-route: Reaction Test (/reaction-test) with back button
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('pulse_welcome_seen', 'true');
      localStorage.setItem('pulse_welcome_dismissed', 'true');
    });
    await page.goto(`http://localhost:${PORT}/reaction-test`);
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${ARTIFACT_DIR}/navbar-reaction-test-desktop.png` });
    console.log('Captured reaction test navbar with back button');
    await context.close();
  }

  await browser.close();
  console.log('Screenshot capture finished successfully!');
}

run().catch((err) => {
  console.error('Error running capture:', err);
  process.exit(1);
});

import { chromium } from 'playwright';

async function testClientSideNav() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[PAGE ERROR CONSOLE]:', msg.text());
  });
  page.on('pageerror', err => {
    console.log('[PAGE UNCAUGHT EXCEPTION]:', err.message);
  });
  page.on('requestfailed', req => {
    console.log('[REQUEST FAILED]:', req.url(), req.failure()?.errorText);
  });

  console.log('Loading / on dev server...');
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(1000);

  console.log('Clicking Assessments in Navbar...');
  const assessmentsLink = page.locator('header a[href="/assessments"]').first();
  await assessmentsLink.click();
  await page.waitForTimeout(1500);

  let err = await page.locator('.font-mono.text-red-300').first();
  if (await err.count() > 0) {
    console.log('ERROR ON CLIENT NAV /assessments:', await err.innerText());
  } else {
    console.log('Client nav to /assessments SUCCESS!');
  }

  console.log('Clicking About in Navbar...');
  const aboutLink = page.locator('header a[href="/about"]').first();
  await aboutLink.click();
  await page.waitForTimeout(1500);

  err = await page.locator('.font-mono.text-red-300').first();
  if (await err.count() > 0) {
    console.log('ERROR ON CLIENT NAV /about:', await err.innerText());
  } else {
    console.log('Client nav to /about SUCCESS!');
  }

  await browser.close();
}

testClientSideNav().catch(console.error);

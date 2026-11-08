import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads and displays branding', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      const title = page.locator('text=PULSE').or(page.locator('text=PRECISION COGNITIVE BENCHMARKING')); 
      await expect(title.first()).toBeVisible();
      await expect(page).toHaveURL(/.*\/$/);
    } else {
      await expect(page).toHaveURL(/.*\/$/);
      await expect(page.locator('text=Pulse').or(page.locator('text=PULSE')).first()).toBeVisible();
    }
  });

  test('no uncaught errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});

test('admin deep links are served by the application shell', async ({ request }) => {
  const response = await request.get('/admin');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('id="root"');
});

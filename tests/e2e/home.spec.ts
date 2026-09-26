import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads and displays branding', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=PRECISION COGNITIVE BENCHMARKING').first()).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('navigation to assessments', async ({ page }) => {
    await page.goto('/');
    const exploreBtn = page.locator('button', { hasText: 'EXPLORE ALL PROTOCOLS' });
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();
    await expect(page).toHaveURL(/.*\/assessments/);
  });

  test('no uncaught errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});

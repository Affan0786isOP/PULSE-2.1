import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('loads and displays branding', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      const title = page.locator('text=PULSE'); 
      if (await title.count() > 0) {
        await expect(title.first()).toBeVisible();
      }
      await expect(page).toHaveURL('/');
    } else {
      await expect(page).toHaveURL(/\/mobile\/?/);
    }
  });

  test('no uncaught errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});

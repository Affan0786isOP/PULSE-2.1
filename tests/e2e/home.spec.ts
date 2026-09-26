import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page, isMobile }) => {
    if (isMobile) {
      await page.addInitScript(() => {
        try {
          localStorage.setItem('pulse_mobile_welcome_seen', 'true');
          localStorage.setItem('pulse_welcome_seen', 'true');
        } catch {}
      });
    }
  });

  test('loads and displays branding', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      await expect(page.locator('text=PRECISION COGNITIVE BENCHMARKING').first()).toBeVisible();
      await expect(page).toHaveURL(/.*\/$/);
    } else {
      await page.waitForURL(/\/mobile\/?/);
      await expect(page.locator('text=Precision telemetry').or(page.locator('text=Pulse')).first()).toBeVisible();
    }
  });

  test('navigation to assessments', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      const exploreBtn = page.locator('button', { hasText: 'EXPLORE ALL PROTOCOLS' });
      await expect(exploreBtn).toBeVisible();
      await exploreBtn.click();
      await expect(page).toHaveURL(/.*\/assessments/);
    } else {
      await page.waitForURL(/\/mobile\/?/);
      const card = page.locator('text=Visual Reaction Test').or(page.locator('text=PROTOCOL 01')).first();
      await expect(card).toBeVisible();
      await card.click();
      await expect(page).toHaveURL(/.*\/reaction-test/);
    }
  });

  test('no uncaught errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    expect(errors).toHaveLength(0);
  });
});

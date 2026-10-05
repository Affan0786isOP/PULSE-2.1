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
      await expect(page.getByText('PRECISION COGNITIVE BENCHMARKING', { exact: false }).first()).toBeVisible();
      await expect(page).toHaveURL(/.*\/$/);
      const scene2 = page.getByRole('heading', { name: /PULSE TURNS HUMAN RESPONSE/i });
      await scene2.scrollIntoViewIfNeeded();
      await expect(scene2).toBeVisible();
    } else {
      await page.waitForURL(/\/mobile\/?/);
      await expect(page.getByText('Precision cognitive benchmarking.', { exact: true })).toBeVisible();
      const scene2 = page.getByRole('heading', { name: /PULSE TURNS HUMAN RESPONSE/i });
      await scene2.scrollIntoViewIfNeeded();
      await expect(scene2).toBeVisible();
    }
  });

  test('navigation to assessments', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      const launchButton = page.getByRole('button', { name: 'Launch Visual Reaction' });
      await expect(launchButton).toBeVisible();
      await launchButton.click();
      await expect(page).toHaveURL(/.*\/reaction-test/);
    } else {
      await page.waitForURL(/\/mobile\/?/);
      const card = page.getByText('Visual Reaction', { exact: true }).first();
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

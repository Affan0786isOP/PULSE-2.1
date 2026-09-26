import { test, expect } from '@playwright/test';

test.describe('Assessment Navigation', () => {
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

  test('Home -> Assessments -> Visual Reaction', async ({ page, isMobile }) => {
    await page.goto('/');
    if (!isMobile) {
      const exploreBtn = page.locator('button', { hasText: 'EXPLORE ALL PROTOCOLS' });
      await expect(exploreBtn).toBeVisible();
      await exploreBtn.click();
      
      await expect(page).toHaveURL(/.*\/assessments/);
      const visualReactionBtn = page.locator('button', { hasText: 'Visual Reaction' });
      await expect(visualReactionBtn).toBeVisible();
      await visualReactionBtn.click();
      
      await expect(page).toHaveURL(/.*\/reaction-test/);
      await expect(page.locator('text=Age Group').first()).toBeVisible();
    } else {
      await page.waitForURL(/\/mobile\/?/);
      const visualCard = page.locator('text=Visual Reaction Test').or(page.locator('text=PROTOCOL 01')).first();
      await expect(visualCard).toBeVisible();
      await visualCard.click();
      
      await expect(page).toHaveURL(/.*\/reaction-test/);
      await expect(page.locator('text=Select Your Age Cohort').or(page.locator('text=Demographic Baseline')).or(page.locator('text=Age Group')).first()).toBeVisible();
    }
  });

  test('Home -> Assessments -> Direction', async ({ page, isMobile }) => {
    if (!isMobile) {
      await page.goto('/assessments');
      const directionBtn = page.locator('button', { hasText: 'Direction' });
      if (await directionBtn.count() > 0) {
        await directionBtn.click();
        await expect(page).toHaveURL(/.*\/direction-test/);
        await expect(page.locator('text=Age Group').first()).toBeVisible();
      }
    } else {
      await page.goto('/direction-test');
      await page.waitForURL(/\/direction-test/);
      await expect(page.locator('text=Select Your Age Cohort').or(page.locator('text=Demographic Baseline')).or(page.locator('text=Age Group')).first()).toBeVisible();
    }
  });

  test('Unknown Route -> 404 or Home redirect', async ({ page, isMobile }) => {
    await page.goto('/unknown-route-12345');
    if (!isMobile) {
      const title = page.locator('text=PULSE').or(page.locator('text=Page Not Found')).or(page.locator('text=404')); 
      await expect(title.first()).toBeVisible();
    } else {
      await page.waitForURL(/\/mobile\/?/);
      const mobileTitle = page.locator('text=PULSE').or(page.locator('text=Pulse')).or(page.locator('text=404')).or(page.locator('text=Not Found')).or(page.locator('text=SYSTEM BENCHMARK')).or(page.locator('text=Precision telemetry'));
      await expect(mobileTitle.first()).toBeVisible();
    }
  });
});

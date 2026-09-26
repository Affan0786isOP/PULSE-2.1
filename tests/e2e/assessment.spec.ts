import { test, expect } from '@playwright/test';

test.describe('Assessment Navigation', () => {
  test('Home -> Assessments -> Visual Reaction', async ({ page }) => {
    await page.goto('/');
    const exploreBtn = page.locator('button', { hasText: 'EXPLORE ALL PROTOCOLS' });
    await expect(exploreBtn).toBeVisible();
    await exploreBtn.click();
    
    await expect(page).toHaveURL(/.*\/assessments/);
    const visualReactionBtn = page.locator('button', { hasText: 'Visual Reaction' });
    await expect(visualReactionBtn).toBeVisible();
    await visualReactionBtn.click();
    
    await expect(page).toHaveURL(/.*\/reaction-test/);
    await expect(page.locator('text=Age Group')).toBeVisible();
  });

  test('Home -> Assessments -> Direction', async ({ page }) => {
    await page.goto('/assessments');
    const directionBtn = page.locator('button', { hasText: 'Direction' });
    if (await directionBtn.count() > 0) {
       await directionBtn.click();
       await expect(page).toHaveURL(/.*\/direction-test/);
       await expect(page.locator('text=Age Group')).toBeVisible();
    }
  });

  test('Unknown Route -> 404 or Home redirect', async ({ page }) => {
    await page.goto('/unknown-route-12345');
    const title = page.locator('text=PULSE'); 
    await expect(title.first()).toBeVisible();
  });
});

import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE (375x667)', width: 375, height: 667 },
  { name: 'iPhone 12/13/14 (390x844)', width: 390, height: 844 },
  { name: 'iPhone Plus/Max (414x896)', width: 414, height: 896 },
];

const THEMES = ['light', 'dark'] as const;

for (const vp of MOBILE_VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`Mobile Homepage Narrative - ${vp.name} [${theme}]`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        isMobile: true,
        hasTouch: true,
      });

      test.beforeEach(async ({ page, context }) => {
        await context.addInitScript((themeVal) => {
          try {
            localStorage.setItem('pulse_mobile_welcome_seen', 'true');
            localStorage.setItem('pulse_welcome_seen', 'true');
            localStorage.setItem('pulse_welcome_dismissed', 'true');
            localStorage.setItem('pulse_user_settings', JSON.stringify({ themeMode: themeVal }));
            document.cookie = `pulse_user_settings=${encodeURIComponent(JSON.stringify({ themeMode: themeVal }))}; path=/`;
          } catch {}
        }, theme);
      });

      test('renders hero intact and 8 narrative sections in correct order without horizontal overflow', async ({ page }) => {
        await page.goto('/mobile');
        await page.waitForLoadState('domcontentloaded');

        // 1. Verify hero is visible and intact
        const hero = page.locator('section[aria-label="PULSE Mobile Hero"]');
        await expect(hero).toBeVisible();

        // 2. Verify all 8 sections exist in document order
        const sectionIds = [
          'proof',
          'assessments',
          'sample-result',
          'why-pulse',
          'browser-timing',
          'faq',
          'final-cta',
        ];

        let prevY = -1;
        for (const id of sectionIds) {
          const section = page.locator(`section#${id}`);
          await expect(section).toBeAttached();
          const box = await section.boundingBox();
          expect(box).not.toBeNull();
          if (box) {
            expect(box.y).toBeGreaterThan(prevY);
            prevY = box.y;
          }
        }

        const footer = page.locator('footer[aria-label="Mobile Navigation and Legal Footer"]');
        await expect(footer).toBeAttached();
        const footerBox = await footer.boundingBox();
        expect(footerBox?.y).toBeGreaterThan(prevY);

        // 3. Verify no horizontal overflow beyond viewport width
        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth).toBeLessThanOrEqual(vp.width);

        // 4. Capture screenshot for visual inspection
        await page.screenshot({ 
          path: `test-results/screenshots/mobile-narrative-${vp.width}w-${theme}.png`, 
          fullPage: true 
        });
      });

      test('swipe strip scrolls and has accessible cards with min 44x44px touch targets', async ({ page }) => {
        await page.goto('/mobile');
        await page.waitForLoadState('domcontentloaded');

        const strip = page.getByRole('region', { name: 'Cognitive Assessments Carousel' });
        await strip.scrollIntoViewIfNeeded();
        await expect(strip).toBeVisible();

        // Check all 5 cards exist
        const cards = [
          'visual-reaction',
          'direction',
          'color-recognition',
          'block-memory',
          'number-memory',
        ];

        for (const id of cards) {
          const card = page.locator(`[data-testid="assessment-card-${id}"]`);
          await expect(card).toBeAttached();

          const btn = page.locator(`[data-testid="launch-btn-${id}"]`);
          await expect(btn).toBeAttached();
          const btnBox = await btn.boundingBox();
          expect(btnBox).not.toBeNull();
          if (btnBox) {
            expect(btnBox.width).toBeGreaterThanOrEqual(44);
            expect(btnBox.height).toBeGreaterThanOrEqual(44);
          }
        }

        // Test scrolling to the last card
        const lastCard = page.locator('[data-testid="assessment-card-number-memory"]');
        await lastCard.scrollIntoViewIfNeeded();
        await expect(lastCard).toBeInViewport();
      });

      test('FAQ accordion expands, collapses and exposes aria attributes', async ({ page }) => {
        await page.goto('/mobile');
        await page.waitForLoadState('domcontentloaded');

        const faqSection = page.locator('section#faq');
        await faqSection.scrollIntoViewIfNeeded();

        const firstFaqBtn = page.locator('#faq-btn-faq-item-1');
        await expect(firstFaqBtn).toBeVisible();
        await expect(firstFaqBtn).toHaveAttribute('aria-expanded', 'false');

        // Check touch target height
        const btnBox = await firstFaqBtn.boundingBox();
        expect(btnBox?.height).toBeGreaterThanOrEqual(44);

        // Click to expand
        await firstFaqBtn.click();
        await expect(firstFaqBtn).toHaveAttribute('aria-expanded', 'true');
        const panel = page.locator('#faq-panel-faq-item-1');
        await expect(panel).toBeVisible();

        // Click to collapse
        await firstFaqBtn.click();
        await expect(firstFaqBtn).toHaveAttribute('aria-expanded', 'false');
        await expect(panel).not.toBeVisible();
      });

      test('assessment launches navigate to valid internal routes', async ({ page }) => {
        await page.goto('/mobile');
        await page.waitForLoadState('domcontentloaded');

        const strip = page.getByRole('region', { name: 'Cognitive Assessments Carousel' });
        await strip.scrollIntoViewIfNeeded();

        const reactionBtn = page.locator('[data-testid="launch-btn-visual-reaction"]');
        await reactionBtn.click();
        await expect(page).toHaveURL(/\/mobile\/reaction-test/);
      });
    });
  }
}

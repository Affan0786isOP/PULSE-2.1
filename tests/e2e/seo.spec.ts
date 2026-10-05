import { test, expect } from '@playwright/test';

test.describe('Technical SEO', () => {
  test('homepage exposes crawl-ready metadata', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.ok()).toBeTruthy();

    await expect(page).toHaveTitle(/PULSE — Precision User Latency & Stimulus Evaluator/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /open-source, browser-based cognitive benchmarking suite/
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000'
    );

    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
    expect(jsonLd).toContain('"@type":"WebSite"');
    expect(jsonLd).toContain('"@type":"Organization"');
    expect(jsonLd).toContain('"@type":"SoftwareApplication"');
  });

  test('client navigation assigns metadata to assessment routes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Assessments', exact: true }).first().click();
    await expect(page).toHaveURL(/\/assessments$/);
    await expect(page).toHaveTitle('Assessments | PULSE');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/assessments'
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /index, follow/
    );
  });
});

import { test, expect } from '@playwright/test';

test.describe('Offline E2E SEO, Hydration & Bot Verification', () => {
  const routesToTest = [
    { path: '/', titleSnippet: 'PULSE' },
    { path: '/reaction-test', titleSnippet: 'Visual Reaction Time' },
    { path: '/guides/visual-reaction-time', titleSnippet: 'Visual Reaction Time' },
    { path: '/guides/stroop-effect-speed', titleSnippet: 'Stroop Effect' },
    { path: '/benchmarks/cognitive-percentiles', titleSnippet: 'Cognitive Percentiles' },
  ];

  test.describe('1. Googlebot / Bingbot Emulation (Raw Static HTML Shell)', () => {
    for (const { path: routePath } of routesToTest) {
      test(`crawls "${routePath}" with bot UA and receives full static SEO shell`, async ({ request }) => {
        const response = await request.get(routePath, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        });

        expect(response.status()).toBe(200);
        const html = await response.text();

        // 1. Verify pre-rendered shell exists without client JS execution
        expect(html).toContain('id="pulse-seo-shell"');
        expect(html).toContain('<h1');

        // 2. Verify JSON-LD script and required structured data
        expect(html).toContain('id="pulse-seo-jsonld"');
        expect(html).toContain('application/ld+json');
        expect(html).toContain('https://schema.org');

        // 3. Verify canonical link
        expect(html).toMatch(/<link\s+rel="canonical"\s+href="https:\/\/pulse-lab\.in[^"]*"/);

        // 4. Verify hreflang & absence of separate-URL alternate links
        expect(html).toContain('rel="alternate" hreflang="x-default"');
        expect(html).not.toContain('rel="alternate" media="only screen and (max-width: 768px)"');

        // If it is a guide or assessment route, ensure article element is present
        if (routePath.startsWith('/guides') || routePath === '/reaction-test') {
          expect(html).toContain('<article');
        }
      });
    }
  });

  test.describe('2. Hydration & Route Transition in Real Browser', () => {
    test('unlinks #pulse-seo-shell seamlessly and updates metadata across routes', async ({ page, isMobile }) => {
      // 1. Initial page load
      await page.goto('/');
      await expect(page).toHaveTitle(/PULSE/);

      // Verify that after React hydration, the static SEO shell is completely unlinked
      await expect(page.locator('#pulse-seo-shell')).toHaveCount(0);

      // Verify that reactive metadata is intact
      await expect(page.locator('script[type="application/ld+json"]')).toBeAttached();

      // 2. Client transitions across target routes
      const transitionRoutes = [
        { path: '/reaction-test', titleSnippet: /Reaction/i },
        { path: '/guides/visual-reaction-time', titleSnippet: /Reaction Time/i },
        { path: '/guides/stroop-effect-speed', titleSnippet: /Stroop/i },
        { path: '/benchmarks/cognitive-percentiles', titleSnippet: /Percentiles|Benchmarks/i },
      ];

      for (const route of transitionRoutes) {
        await page.goto(route.path);
        await expect(page).toHaveTitle(route.titleSnippet);

        // Ensure static shell was cleanly unlinked by RouteShellBoundary
        await expect(page.locator('#pulse-seo-shell')).toHaveCount(0);

        // Verify canonical URL attribute updated reactively
        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveCount(1);
        const href = await canonical.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).toContain(route.path);

        // Verify JSON-LD exists and updated
        const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
        expect(jsonLd).toBeTruthy();
        expect(jsonLd).toContain('https://schema.org');
      }
    });
  });

  test.describe('3. Mobile Parity & Separate-URL Validation', () => {
    test('desktop shell contains canonical link and does not emit mobile alternate link', async ({ request }) => {
      const response = await request.get('/reaction-test', {
        headers: { Accept: 'text/html' },
      });
      const html = await response.text();
      expect(html).not.toContain('rel="alternate" media="only screen and (max-width: 768px)"');
      expect(html).toContain('<link rel="canonical" href="https://pulse-lab.in/reaction-test"');
    });

    test('mobile shell contains canonical link pointing to desktop canonical URL', async ({ request }) => {
      const response = await request.get('/mobile/reaction-test', {
        headers: { Accept: 'text/html' },
      });
      const html = await response.text();
      // Mobile version must have canonical pointing to desktop URL
      expect(html).toContain('<link rel="canonical" href="https://pulse-lab.in/reaction-test"');
      // Mobile version should NOT have mobile alternate link
      expect(html).not.toContain('<link rel="alternate" media="only screen and (max-width: 768px)"');
    });

    test('mobile client navigates correctly under /mobile basename', async ({ browser, isMobile }) => {
      // Use mobile viewport/context so device routing retains /mobile
      const context = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });
      const mobilePage = await context.newPage();
      await mobilePage.goto('/mobile/reaction-test?standalone=1');
      await expect(mobilePage).toHaveURL(/\/mobile\/reaction-test/);
      // Ensure #pulse-seo-shell is unlinked
      await expect(mobilePage.locator('#pulse-seo-shell')).toHaveCount(0);
      await context.close();
    });
  });

  test.describe('4. Response Status & Security Headers', () => {
    test('canonical public routes return HTTP 200 with required security headers', async ({ request }) => {
      const testPaths = ['/', '/reaction-test', '/about', '/assessments', '/improve', '/leaderboard'];

      for (const p of testPaths) {
        const response = await request.get(p, {
          headers: { Accept: 'text/html' },
        });

        expect(response.status()).toBe(200);
        const headers = response.headers();

        // Verify required security headers
        expect(headers['x-content-type-options']).toBe('nosniff');
        expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        expect(headers['content-security-policy']).toBeDefined();
        expect(headers['content-security-policy']).toContain("default-src 'self'");
      }
    });

    test('unknown routes return 404 for missing static assets', async ({ request }) => {
      const res = await request.get('/assets/non-existent-chunk-xyz.js');
      expect(res.status()).toBe(404);
    });

    test('unknown non-asset routes fallback cleanly to client SPA 404 page', async ({ page }) => {
      await page.goto('/some-completely-invalid-url-path');
      await expect(page.locator('body')).toBeVisible();
      // Verify shell unlinked and page loaded without crash
      await expect(page.locator('#pulse-seo-shell')).toHaveCount(0);
    });
  });
});

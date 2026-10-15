import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Vercel technical SEO routing', () => {
  const config = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8')
  );

  it('redirects canonical aliases instead of rendering duplicate pages', () => {
    const redirects = config.redirects as Array<Record<string, unknown>>;
    const pairs = redirects.map(rule => [rule.source, rule.destination]);
    expect(pairs).toContainEqual(['/visual-reaction', '/reaction-test']);
    expect(pairs).toContainEqual(['/direction', '/direction-test']);
    expect(pairs).toContainEqual(['/analytics', '/dataset']);
    expect(pairs).toContainEqual(['/index.html', '/']);
  });

  it('does not have a catch-all SPA rewrite', () => {
    const rewrites = config.rewrites as Array<Record<string, unknown>>;
    expect(
      rewrites.some(rule => String(rule.source) === '/((?!api/|mobile/|assets/|.*\\..*).*)')
    ).toBe(false);
    expect(rewrites.some(rule => String(rule.destination) === '/index.html')).toBe(false);
  });

  it('redirects www host and aliases directly to apex canonical URLs without redirect loops', () => {
    const redirects = config.redirects as Array<Record<string, unknown>>;
    const wwwRedirect = redirects.find(r => {
      const has = r.has as Array<Record<string, string>> | undefined;
      return has?.some(h => h.type === 'host' && h.value === 'www.pulse-lab.in');
    });
    expect(wwwRedirect).toBeDefined();
    expect(wwwRedirect?.destination).toBe('https://pulse-lab.in/:path*');
    expect(wwwRedirect?.statusCode).toBe(301);

    // Ensure there is NO rule redirecting apex pulse-lab.in to www
    const conflictingApexRedirect = redirects.find(r => {
      const has = r.has as Array<Record<string, string>> | undefined;
      return has?.some(h => h.type === 'host' && h.value === 'pulse-lab.in');
    });
    expect(conflictingApexRedirect).toBeUndefined();
  });

  it('protects non-public paths and non-production environments from indexing while indexing apex production', () => {
    const headers = config.headers as Array<Record<string, unknown>>;
    const serialized = JSON.stringify(headers);
    expect(serialized).toContain('noindex');
    expect(serialized).toContain('/api/:path*');

    // Base rule sets noindex, nofollow for all environments
    const baseRule = headers.find(h => h.source === '/:path*' && !h.has);
    expect(baseRule).toBeDefined();
    expect(JSON.stringify(baseRule)).toContain('noindex, nofollow');

    // Production override applies strictly to apex pulse-lab.in
    const prodOverride = headers.find(h => {
      const has = h.has as Array<Record<string, string>> | undefined;
      return has?.some(cond => cond.type === 'host' && cond.value === 'pulse-lab.in');
    });
    expect(prodOverride).toBeDefined();
    expect(JSON.stringify(prodOverride)).toContain('index, follow');

    // www.pulse-lab.in must NOT have an independent indexable header override
    const wwwOverride = headers.find(h => {
      const has = h.has as Array<Record<string, string>> | undefined;
      return has?.some(cond => cond.type === 'host' && cond.value === 'www.pulse-lab.in');
    });
    expect(wwwOverride).toBeUndefined();
  });

  it('correctly routes and rewrites /about and /mobile/about', () => {
    const redirects = config.redirects as Array<Record<string, unknown>>;
    const rewrites = config.rewrites as Array<Record<string, unknown>>;

    expect(redirects).toContainEqual({
      source: '/about/',
      destination: '/about',
      statusCode: 301
    });
    expect(redirects).toContainEqual({
      source: '/mobile/about/',
      destination: '/mobile/about',
      statusCode: 301
    });

    expect(rewrites).toContainEqual({
      source: '/about',
      destination: '/seo/about.html'
    });
    expect(rewrites).toContainEqual({
      source: '/mobile/about',
      destination: '/seo/mobile/about.html'
    });
  });
});

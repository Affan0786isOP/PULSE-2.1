import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROUTE_REGISTRY } from '../../shared/registries/routeRegistry';

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

    // The noindex default must apply only when the production apex host is absent.
    // This avoids emitting conflicting X-Robots-Tag values on production responses.
    const baseRule = headers.find(h => h.source === '/:path*' && h.missing);
    expect(baseRule).toBeDefined();
    expect(JSON.stringify(baseRule)).toContain('noindex, nofollow');
    expect(JSON.stringify(baseRule)).toContain('"type":"host"');
    expect(JSON.stringify(baseRule)).toContain('"value":"pulse-lab.in"');

    // Production indexability is controlled by the page's meta robots directive;
    // there must not be a second wildcard header that can contradict it.
    const hasRobotsHeader = (rule: Record<string, unknown>) =>
      Array.isArray(rule.headers) &&
      (rule.headers as Array<{ key: string }>).some(header => header.key.toLowerCase() === 'x-robots-tag');
    const wildcardRobots = headers.filter(h => h.source === '/:path*' && hasRobotsHeader(h));
    expect(wildcardRobots).toHaveLength(1);

    // Production-only route overrides mark intentionally non-indexable pages and APIs.
    for (const source of ['/dataset', '/analytics', '/mobile/dataset', '/mobile/analytics', '/api/:path*']) {
      const rule = headers.find(h =>
        h.source === source && hasRobotsHeader(h)
      );
      expect(rule, `Missing robots policy for ${source}`).toBeDefined();
      expect(JSON.stringify(rule)).toContain('"value":"pulse-lab.in"');
    }
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

  it('keeps deployed alias redirects aligned with the shared route registry', () => {
    const redirects = config.redirects as Array<{ source: string; destination: string }>;
    const pairs = new Set(redirects.map(rule => `${rule.source} -> ${rule.destination}`));
    const mobilePath = (pathname: string) => pathname === '/' ? '/mobile/' : '/mobile' + pathname;

    for (const route of ROUTE_REGISTRY) {
      const canonicalPath = route.canonicalPath ?? route.path;
      if (canonicalPath !== route.path) {
        expect(pairs.has(`${route.path} -> ${canonicalPath}`), `Missing redirect for ${route.path}`).toBe(true);
        expect(pairs.has(`${mobilePath(route.path)} -> ${mobilePath(canonicalPath)}`), `Missing mobile redirect for ${route.path}`).toBe(true);
      }
      for (const alias of route.aliases) {
        expect(pairs.has(`${alias} -> ${canonicalPath}`), `Missing redirect for ${alias}`).toBe(true);
        expect(pairs.has(`${mobilePath(alias)} -> ${mobilePath(canonicalPath)}`), `Missing mobile redirect for ${alias}`).toBe(true);
      }
    }
  });

  it('contains zero duplicate top-level keys in vercel.json (M1 fix)', () => {
    const rawContent = fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
    const lines = rawContent.split('\n');
    const rootKeyCounts: Record<string, number> = {};
    for (const line of lines) {
      const match = line.match(/^  "([^"]+)":/);
      if (match) {
        const key = match[1];
        rootKeyCounts[key] = (rootKeyCounts[key] || 0) + 1;
      }
    }
    for (const [key, count] of Object.entries(rootKeyCounts)) {
      expect(count, `Top-level key "${key}" appeared ${count} times`).toBe(1);
    }

    const headers = config.headers as Array<Record<string, unknown>>;
    const sources = headers.map(h => String(h.source));
    expect(sources).toContain('/(sw\\.js|service-worker\\.js|mobile/sw\\.js|mobile/service-worker\\.js)');
    expect(sources).toContain('/(.*\\.(?:webmanifest|json|ico|png|svg))');
    expect(sources).toContain('/api/:path*');
    expect(sources).toContain('/assets/:path*');
    expect(sources).toContain('/mobile/assets/:path*');

    // API request routing is a rewrite, distinct from the API's robots header.
    const rewrites = config.rewrites as Array<Record<string, unknown>>;
    expect(rewrites).toContainEqual({ source: '/api/(.*)', destination: '/api/index.ts' });
  });
});

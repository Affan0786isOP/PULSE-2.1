import { describe, it, expect } from 'vitest';
import metadata from '../../shared/seoMetadata.json';
import { buildRouteSchema } from '../../shared/seoSchema.mjs';
import { getCanonicalPath } from '../../src/components/SEO';
import { resolveRoute } from '../../shared/registries/routeRegistry';

describe('SEO route registry', () => {
  it('uses apex domain as canonical site URL', () => {
    expect(metadata.site.url).toBe('https://pulse-lab.in');
    expect(metadata.site.ogImage).toBe('https://pulse-lab.in/og-image.png');
    expect(metadata.site.logo).toBe('https://pulse-lab.in/icon-512.png');
  });

  it('keeps canonical routes and indexability explicit', () => {
    const entries = Object.entries(metadata.routes);
    const indexable = entries.filter(([, route]) => route.indexable).map(([pathname]) => pathname);

    expect(indexable).toEqual([
      '/',
      '/about',
      '/assessments',
      '/leaderboard',
      '/improve',
      '/privacy',
      '/reaction-test',
      '/direction-test',
      '/colour-recognition',
      '/block-memory',
      '/number-memory'
    ]);

    expect(metadata.routes['/dataset'].indexable).toBe(false);
    expect(metadata.routes).not.toHaveProperty('/analytics');
    expect(metadata.routes['/admin'].indexable).toBe(false);
  });


  it('keeps indexable titles and descriptions unique and useful', () => {
    const routes = Object.entries(metadata.routes).filter(([, route]) => route.indexable);
    const titles = routes.map(([, route]) => route.title);
    const descriptions = routes.map(([, route]) => route.description);

    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
    for (const [pathname, route] of routes) {
      expect(route.title.length, `Title too long for ${pathname}`).toBeLessThanOrEqual(65);
      expect(route.description.length, `Description too short for ${pathname}`).toBeGreaterThanOrEqual(100);
      expect(route.description.length, `Description too long for ${pathname}`).toBeLessThanOrEqual(160);
    }
  });

  it('builds consistent structured data for home and assessment routes', () => {
    const homeSchema = buildRouteSchema(metadata, '/');
    expect(homeSchema['@graph'].map((node: { '@type': string }) => node['@type'])).toContain('SoftwareApplication');

    const reactionSchema = buildRouteSchema(metadata, '/reaction-test');
    expect(reactionSchema['@type']).toBe('WebPage');
    expect(reactionSchema.url).toBe('https://pulse-lab.in/reaction-test');
    expect(reactionSchema.name).toBe(metadata.routes['/reaction-test'].title);
  });

  it('keeps redirected aliases out of the canonical metadata registry', () => {
    expect(resolveRoute('/analytics')?.canonicalPath).toBe('/dataset');
    expect(metadata.routes).not.toHaveProperty('/analytics');
  });

  it('uses the route registry for canonical aliases and mobile-prefixed paths', () => {
    expect(getCanonicalPath('/visual-reaction')).toBe('/reaction-test');
    expect(getCanonicalPath('/mobile/color-test/')).toBe('/colour-recognition');
    expect(getCanonicalPath('/analytics')).toBe('/dataset');
    expect(getCanonicalPath('/privacy-policy')).toBe('/privacy');
  });

  it('keeps route indexability aligned between SEO metadata and the shared route registry', () => {
    for (const [pathname, routeMeta] of Object.entries(metadata.routes)) {
      const route = resolveRoute(pathname);
      expect(route, `Missing shared route definition for ${pathname}`).toBeDefined();
      expect(route?.seoBehavior.index, `Indexability mismatch for ${pathname}`).toBe(routeMeta.indexable);
    }
  });

  it('gives dynamic assessment routes a client metadata fallback', () => {
    for (const pathname of ['/reaction-test', '/direction-test', '/colour-recognition', '/block-memory', '/number-memory']) {
      expect(metadata.routes[pathname].clientFallback).toBe(true);
    }
  });
});

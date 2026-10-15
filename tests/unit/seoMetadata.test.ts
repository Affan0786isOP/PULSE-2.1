import { describe, it, expect } from 'vitest';
import metadata from '../../shared/seoMetadata.json';

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
    expect(metadata.routes['/analytics'].indexable).toBe(false);
    expect(Object.keys(metadata.routes).some(pathname => pathname.startsWith('/admin'))).toBe(false);
  });

  it('gives dynamic assessment routes a client metadata fallback', () => {
    for (const pathname of ['/reaction-test', '/direction-test', '/colour-recognition', '/block-memory', '/number-memory']) {
      expect(metadata.routes[pathname].clientFallback).toBe(true);
    }
  });
});

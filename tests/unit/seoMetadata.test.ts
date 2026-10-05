import metadata from '../../shared/seoMetadata.json';

describe('SEO route registry', () => {
  it('keeps canonical routes and indexability explicit', () => {
    const entries = Object.entries(metadata.routes);
    const indexable = entries.filter(([, route]) => route.indexable).map(([pathname]) => pathname);

    expect(indexable).toEqual([
      '/',
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
    expect(Object.keys(metadata.routes).filter(pathname => pathname.startsWith('/admin')).every(pathname => !metadata.routes[pathname].indexable)).toBe(true);
  });

  it('gives dynamic assessment routes a client metadata fallback', () => {
    for (const pathname of ['/reaction-test', '/direction-test', '/colour-recognition', '/block-memory', '/number-memory']) {
      expect(metadata.routes[pathname].clientFallback).toBe(true);
    }
  });
});

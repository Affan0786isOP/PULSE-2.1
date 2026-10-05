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

  it('protects non-public paths from indexing', () => {
    const headers = config.headers as Array<Record<string, unknown>>;
    const serialized = JSON.stringify(headers);
    expect(serialized).toContain('noindex');
    expect(serialized).toContain('/api/:path*');
    expect(serialized).toContain('/admin/:path*');
  });
});

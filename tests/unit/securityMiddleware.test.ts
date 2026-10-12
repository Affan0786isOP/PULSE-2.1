import { describe, expect, it, vi } from 'vitest';
import { applySecurityMiddleware } from '../../server/middleware/security';

type Middleware = (req: any, res: any, next: () => void) => unknown;

function captureFirstMiddleware() {
  const middleware: Middleware[] = [];
  const app = { use: vi.fn((handler: Middleware) => middleware.push(handler)) } as any;
  applySecurityMiddleware(app);
  return middleware[0];
}

describe('legacy API path normalization preserves browser page routes', () => {
  it('does not rewrite GET /leaderboard HTML document navigation', () => {
    const handler = captureFirstMiddleware();
    const req = {
      method: 'GET',
      url: '/leaderboard',
      headers: { accept: 'text/html,application/xhtml+xml' }
    };
    let nextCalled = false;
    handler(req, {}, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.url).toBe('/leaderboard');
  });

  it('rewrites a legacy API endpoint but not the public page prefix', () => {
    const handler = captureFirstMiddleware();
    const req = {
      method: 'POST',
      url: '/leaderboard/submit',
      headers: { accept: 'application/json' }
    };
    handler(req, {}, () => undefined);
    expect(req.url).toBe('/api/leaderboard/submit');
  });

  it('does not normalize an already-prefixed API endpoint twice', () => {
    const handler = captureFirstMiddleware();
    const req = {
      method: 'POST',
      url: '/api/leaderboard/submit',
      headers: { accept: 'application/json' }
    };
    handler(req, {}, () => undefined);
    expect(req.url).toBe('/api/leaderboard/submit');
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';
import { registerLeaderboardRoutes } from '../../server/routes/leaderboardRoutes';

describe('/api/leaderboard edge SWR cache headers', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;
  const getPublicLeaderboard = vi.fn();

  beforeAll(async () => {
    app = express();
    app.use('/api', (req, res, next) => {
      if (req.method === 'GET' && req.path === '/leaderboard') return next();
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Surrogate-Control', 'no-store');
      next();
    });
    getPublicLeaderboard.mockResolvedValue([
      { id: '1', displayName: 'Player 1', scoreMetric: 180, assessmentType: 'visual-reaction' }
    ]);
    registerLeaderboardRoutes(app, { leaderboardService: { getPublicLeaderboard } as any });
    app.get('/api/leaderboard/mine', (_req, res) => res.json({ ok: true }));
    await new Promise<void>(resolve => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Expected TCP address');
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  it('sets edge SWR headers for a normal successful public GET', async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard?assessmentType=visual-reaction`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=15, stale-while-revalidate=60');
    expect(res.headers.get('surrogate-control')).toBeNull();
  });

  it('sets strict no-store headers for fresh=1', async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard?assessmentType=visual-reaction&fresh=1`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, proxy-revalidate');
    expect(res.headers.get('surrogate-control')).toBe('no-store');
  });

  it('accepts fresh=true as a bypass too', async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard?assessmentType=visual-reaction&fresh=true`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('no-store');
  });

  it('never caches missing-parameter 400 responses', async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard`);
    expect(res.status).toBe(400);
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, private');
    expect(res.headers.get('surrogate-control')).toBe('no-store');
  });

  it('never caches service errors', async () => {
    getPublicLeaderboard.mockRejectedValueOnce(new Error('temporary failure'));
    const res = await fetch(`${baseUrl}/api/leaderboard?assessmentType=visual-reaction`);
    expect(res.status).toBe(500);
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, private');
    expect(res.headers.get('surrogate-control')).toBe('no-store');
  });

  it('keeps private leaderboard endpoints no-store', async () => {
    const res = await fetch(`${baseUrl}/api/leaderboard/mine`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate, private');
    expect(res.headers.get('surrogate-control')).toBe('no-store');
  });
});

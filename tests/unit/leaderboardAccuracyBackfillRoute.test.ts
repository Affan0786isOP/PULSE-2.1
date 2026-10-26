import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import * as http from 'http';
import type * as net from 'net';
import { registerAdminRoutes } from '../../server/routes/adminRoutes';

function request(server: http.Server, method: string, path: string, headers: Record<string, string> = {}, body?: unknown) {
  return new Promise<{ status: number; body: Record<string, unknown>; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
    const address = server.address() as net.AddressInfo;
    const req = http.request({
      host: '127.0.0.1',
      port: address.port,
      method,
      path,
      headers: { 'content-type': 'application/json', ...headers }
    }, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode || 500, body: JSON.parse(raw), headers: res.headers }); }
        catch { resolve({ status: res.statusCode || 500, body: { raw }, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Leaderboard accuracy backfill admin route', () => {
  let app: express.Express;
  let server: http.Server;
  const oldGate = process.env.LEADERBOARD_ACCURACY_BACKFILL_ENABLED;
  const runner = vi.fn(async (input: any) => ({
    success: true as const,
    mode: input.mode,
    counts: { scanned: 0, eligible: 0, wouldUpdate: 0, updated: 0, alreadyCorrect: 0, skipped: 0, failed: 0 },
    skipReasons: {},
    nextCursor: null,
    done: true
  }));

  beforeEach(async () => {
    process.env.LEADERBOARD_ACCURACY_BACKFILL_ENABLED = 'true';
    runner.mockClear();
    app = express();
    app.use(express.json());
    registerAdminRoutes(app, {
      adminService: {} as any,
      verifySession: vi.fn(async req => req.headers['x-admin-token'] === 'valid-admin-token'
        ? { authorized: true }
        : { authorized: false, errorStatus: 401, errorMsg: 'Unauthorized' }),
      runAccuracyBackfillBatch: runner
    });
    server = await new Promise(resolve => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    if (oldGate === undefined) delete process.env.LEADERBOARD_ACCURACY_BACKFILL_ENABLED;
    else process.env.LEADERBOARD_ACCURACY_BACKFILL_ENABLED = oldGate;
  });

  const path = '/api/admin/maintenance/leaderboard-accuracy-backfill';

  it('rejects unauthenticated requests before invoking the runner', async () => {
    const response = await request(server, 'POST', path, {}, { mode: 'dry-run' });
    expect(response.status).toBe(401);
    expect(runner).not.toHaveBeenCalled();
  });

  it('fails closed when the feature gate is disabled', async () => {
    delete process.env.LEADERBOARD_ACCURACY_BACKFILL_ENABLED;
    const response = await request(server, 'POST', path, { 'x-admin-token': 'valid-admin-token' }, { mode: 'dry-run' });
    expect(response.status).toBe(404);
    expect(runner).not.toHaveBeenCalled();
  });

  it('defaults to dry-run, no-store and a small bounded batch', async () => {
    const response = await request(server, 'POST', path, { 'x-admin-token': 'valid-admin-token' }, {});
    expect(response.status).toBe(200);
    expect(response.body.mode).toBe('dry-run');
    expect(response.headers['cache-control']).toContain('no-store');
    expect(runner).toHaveBeenCalledWith({ mode: 'dry-run', cursor: null, limit: 10 });
  });

  it('rejects over-large batches and apply without explicit confirmation', async () => {
    const tooLarge = await request(server, 'POST', path, { 'x-admin-token': 'valid-admin-token' }, { mode: 'dry-run', limit: 26 });
    const unconfirmed = await request(server, 'POST', path, { 'x-admin-token': 'valid-admin-token' }, { mode: 'apply' });
    expect(tooLarge.status).toBe(400);
    expect(unconfirmed.status).toBe(400);
    expect(runner).not.toHaveBeenCalled();
  });

  it('allows explicitly confirmed apply only for a valid bounded request', async () => {
    const response = await request(server, 'POST', path, { 'x-admin-token': 'valid-admin-token' }, {
      mode: 'apply', cursor: 'entry-1', limit: 5, confirmApply: true
    });
    expect(response.status).toBe(200);
    expect(runner).toHaveBeenCalledWith({ mode: 'apply', cursor: 'entry-1', limit: 5 });
  });
});

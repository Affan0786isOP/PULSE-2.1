import { describe, it, expect, vi } from 'vitest';
import { FirestoreRateLimitStore } from '../../server/config/firestoreRateLimitStore';

describe('FirestoreRateLimitStore Unit Tests', () => {
  it('falls back gracefully to in-memory counter when getDb() returns null', async () => {
    const store = new FirestoreRateLimitStore(() => null);
    store.init({ windowMs: 60000 });

    const key = 'test-client-ip:127.0.0.1';
    const firstHit = await store.increment(key);
    expect(firstHit.totalHits).toBe(1);
    expect(firstHit.resetTime.getTime()).toBeGreaterThan(Date.now());

    const secondHit = await store.increment(key);
    expect(secondHit.totalHits).toBe(2);

    store.decrement(key);
    const thirdHit = await store.increment(key);
    expect(thirdHit.totalHits).toBe(2);

    store.resetKey(key);
    const afterReset = await store.increment(key);
    expect(afterReset.totalHits).toBe(1);
  });

  it('falls back to in-memory counter when Firestore transaction throws', async () => {
    const failingDb = {
      collection: () => ({
        doc: () => ({
          firestore: {
            runTransaction: vi.fn(async () => {
              throw new Error('Firestore connection timeout');
            })
          }
        })
      })
    } as any;

    const store = new FirestoreRateLimitStore(() => failingDb);
    store.init({ windowMs: 60000 });

    const key = 'test-client-failing-db';
    const res = await store.increment(key);
    expect(res.totalHits).toBe(1);
  });

  it('keys leaderboard fresh read limiter strictly by IP to prevent forged UID bypass', async () => {
    const { leaderboardFreshReadLimiter } = await import('../../server/config/rateLimits');
    const fakeTokenPayload = Buffer.from(JSON.stringify({ user_id: 'forged-attacker-uid' })).toString('base64url');
    const reqWithFakeAuth = {
      method: 'GET',
      originalUrl: '/api/leaderboard?fresh=1',
      query: { fresh: '1' },
      ip: '198.51.100.1',
      headers: {
        authorization: `Bearer fakeheader.${fakeTokenPayload}.fakesig`
      },
      socket: { remoteAddress: '198.51.100.1' }
    } as any;

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    let capturedKey = '';
    const spy = vi.spyOn(FirestoreRateLimitStore.prototype, 'increment').mockImplementation(async (key: string) => {
      capturedKey = key;
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    });

    await leaderboardFreshReadLimiter(reqWithFakeAuth, res, () => {});
    spy.mockRestore();

    expect(capturedKey).not.toContain('forged-attacker-uid');
    expect(capturedKey).toContain('198.51.100.1');
    expect(capturedKey).toBe('leaderboard-fresh-read:ip:198.51.100.1');
  }, 20000);

  it('ignores sub claim and partitions unauthenticated requests strictly by IP', async () => {
    const { sessionStartLimiter } = await import('../../server/config/rateLimits');
    const fakeSubPayload = Buffer.from(JSON.stringify({ sub: 'forged-sub-attacker' })).toString('base64url');
    const reqWithSubOnly = {
      ip: '198.51.100.2',
      headers: {
        authorization: `Bearer header.${fakeSubPayload}.sig`
      },
      socket: { remoteAddress: '198.51.100.2' }
    } as any;

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    let capturedKey = '';
    const spy = vi.spyOn(FirestoreRateLimitStore.prototype, 'increment').mockImplementation(async (key: string) => {
      capturedKey = key;
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    });

    await sessionStartLimiter(reqWithSubOnly, res, () => {});
    spy.mockRestore();

    expect(capturedKey).not.toContain('forged-sub-attacker');
    expect(capturedKey).toBe('session-start:ip:198.51.100.2');
  });

  it('normalizes trailing slashes in leaderboard rate limiter skip predicates', async () => {
    const { leaderboardReadLimiter } = await import('../../server/config/rateLimits');

    const reqTrailingSlash = {
      method: 'GET',
      originalUrl: '/api/leaderboard/?limit=10',
      headers: {},
      ip: '198.51.100.99',
      socket: { remoteAddress: '198.51.100.99' }
    } as any;

    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    let nextCalled = false;
    await leaderboardReadLimiter(reqTrailingSlash, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    // RateLimit-Limit header is set when the route is processed by the limiter (not skipped)
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Limit', expect.anything());
  });
});

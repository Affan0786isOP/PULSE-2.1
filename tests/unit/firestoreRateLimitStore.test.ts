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
      ip: '198.51.100.1',
      headers: {
        authorization: `Bearer fakeheader.${fakeTokenPayload}.fakesig`
      },
      socket: { remoteAddress: '198.51.100.1' }
    } as any;

    const keyGen = (leaderboardFreshReadLimiter as any).keyGenerator;
    if (typeof keyGen === 'function') {
      const generatedKey = keyGen(reqWithFakeAuth);
      expect(generatedKey).not.toContain('forged-attacker-uid');
      expect(generatedKey).toContain('198.51.100.1');
      expect(generatedKey).toBe('leaderboard-fresh-read:ip:198.51.100.1');
    }
  }, 20000);
});

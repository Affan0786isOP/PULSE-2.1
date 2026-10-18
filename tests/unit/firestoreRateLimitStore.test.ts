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
});

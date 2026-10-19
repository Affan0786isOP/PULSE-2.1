import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getLeaderboardResults, clearClientLeaderboardCache } from '@/lib/firestore';
import type { LeaderboardEntry } from '@/lib/firestore';

describe('Client Leaderboard In-Memory TTL Cache (Tier 4)', () => {
  let mockFetch: any;

  beforeEach(() => {
    clearClientLeaderboardCache();
    mockFetch = vi.fn();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockApiResponse = (entries: Partial<LeaderboardEntry>[]) => {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        entries: entries.map(e => ({
          id: e.id || 'id-1',
          displayName: e.displayName || 'Alice',
          assessmentType: e.assessmentType || 'visual-reaction',
          scoreMetric: e.scoreMetric || 200,
          ageGroup: '18-24',
          createdAt: Date.now()
        }))
      })
    });
  };

  it('serves cached envelope { entries, fetchedAt } within 30s TTL', async () => {
    mockFetch.mockReturnValueOnce(mockApiResponse([{ displayName: 'Alice' }]));

    const res1 = await getLeaderboardResults('visual-reaction');
    expect(res1.entries).toHaveLength(1);
    expect(res1.entries[0].displayName).toBe('Alice');
    expect(res1.fetchedAt).toBeInstanceOf(Date);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Call again within TTL - should hit cache
    const res2 = await getLeaderboardResults('visual-reaction');
    expect(res2.entries[0].displayName).toBe('Alice');
    expect(res2.fetchedAt).toEqual(res1.fetchedAt);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent requests for the same protocol', async () => {
    mockFetch.mockReturnValue(mockApiResponse([{ displayName: 'Alice' }]));

    const [r1, r2, r3] = await Promise.all([
      getLeaderboardResults('visual-reaction'),
      getLeaderboardResults('visual-reaction'),
      getLeaderboardResults('visual-reaction')
    ]);

    expect(r1.entries).toEqual(r2.entries);
    expect(r2.entries).toEqual(r3.entries);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('bypasses cache when bypassCache: true is passed, using cache: no-store and fresh=1', async () => {
    mockFetch.mockReturnValueOnce(mockApiResponse([{ displayName: 'Alice' }]));
    await getLeaderboardResults('visual-reaction');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    mockFetch.mockReturnValueOnce(mockApiResponse([{ displayName: 'Bob' }]));
    const freshRes = await getLeaderboardResults('visual-reaction', { bypassCache: true });

    expect(freshRes.entries[0].displayName).toBe('Bob');
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const callArgs = mockFetch.mock.calls[1];
    expect(callArgs[0]).toContain('fresh=1');
    expect(callArgs[1]?.cache).toBe('no-store');
  });

  it('prevents an older in-flight request from overwriting a fresh bypass result', async () => {
    let resolveSlow: (val: any) => void;
    const slowPromise = new Promise(resolve => {
      resolveSlow = resolve;
    });

    // Request 1 is slow
    mockFetch.mockReturnValueOnce(
      slowPromise.then(() => ({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          entries: [{ id: 'slow', displayName: 'SlowStale', assessmentType: 'visual-reaction', scoreMetric: 300 }]
        })
      }))
    );

    // Request 2 is fast fresh
    mockFetch.mockReturnValueOnce(
      mockApiResponse([{ id: 'fast', displayName: 'FastFresh', scoreMetric: 180 }])
    );

    const req1 = getLeaderboardResults('visual-reaction');
    const req2 = getLeaderboardResults('visual-reaction', { bypassCache: true });

    const res2 = await req2;
    expect(res2.entries[0].displayName).toBe('FastFresh');

    // Resolve slow request 1
    resolveSlow!(null);
    await req1;

    // Subsequent normal read must return FastFresh from cache, not SlowStale
    const res3 = await getLeaderboardResults('visual-reaction');
    expect(res3.entries[0].displayName).toBe('FastFresh');
  });
});

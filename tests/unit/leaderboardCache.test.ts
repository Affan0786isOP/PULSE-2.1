import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeaderboardAppService } from '../../server/services/leaderboardAppService';
import type { ILeaderboardRepository } from '../../server/repositories/interfaces/ILeaderboardRepository';
import type { ILeaderboardSubmissionRepository } from '../../server/repositories/interfaces/ILeaderboardSubmissionRepository';
import type { ISessionRepository } from '../../server/repositories/interfaces/ISessionRepository';
import type { LeaderboardEntryRecord } from '../../server/models/leaderboardModels';

function makeMockEntry(id: string, type: string, score: number, name: string): LeaderboardEntryRecord {
  return {
    id,
    assessmentType: type,
    scoreMetric: score,
    displayName: name,
    ageGroup: 'Adults (26–40)',
    hidden: false,
    provenanceToken: 'valid-token',
    createdAt: 1000
  };
}

describe('Server Leaderboard TTL Cache & Race-Free Invalidation (Tier 3)', () => {
  let mockSessionRepo: ISessionRepository;
  let mockLeaderboardRepo: ILeaderboardRepository;
  let mockSubmissionRepo: ILeaderboardSubmissionRepository;
  let service: LeaderboardAppService;
  let getEntriesSpy: any;

  beforeEach(() => {
    mockSessionRepo = {} as any;
    mockSubmissionRepo = {} as any;
    getEntriesSpy = vi.fn().mockImplementation(async (alias: string) => {
      return [makeMockEntry('entry-1', 'visual-reaction', 200, 'Alice')];
    });

    mockLeaderboardRepo = {
      getEntriesByAlias: getEntriesSpy
    } as any;

    service = new LeaderboardAppService(mockSessionRepo, mockLeaderboardRepo, mockSubmissionRepo);
  });

  it('serves cached results within TTL without calling repository again', async () => {
    const res1 = await service.getPublicLeaderboard('visual-reaction');
    expect(res1).toHaveLength(1);
    expect(res1[0].displayName).toBe('Alice');
    const callCountAfterFirst = getEntriesSpy.mock.calls.length;

    // Second call within TTL
    const res2 = await service.getPublicLeaderboard('visual-reaction');
    expect(res2).toEqual(res1);
    expect(getEntriesSpy.mock.calls.length).toBe(callCountAfterFirst);
  });

  it('coalesces concurrent requests for the same assessment type', async () => {
    const [p1, p2, p3] = await Promise.all([
      service.getPublicLeaderboard('visual-reaction'),
      service.getPublicLeaderboard('visual-reaction'),
      service.getPublicLeaderboard('visual-reaction')
    ]);

    expect(p1).toEqual(p2);
    expect(p2).toEqual(p3);
    // Number of alias calls for visual-reaction (5 aliases) should be exactly 5, not 15
    expect(getEntriesSpy.mock.calls.length).toBe(5);
  });

  it('bypasses cache when fresh=true is requested', async () => {
    await service.getPublicLeaderboard('visual-reaction');
    const initialCalls = getEntriesSpy.mock.calls.length;

    getEntriesSpy.mockImplementation(async () => [
      makeMockEntry('entry-2', 'visual-reaction', 190, 'Bob')
    ]);

    const freshRes = await service.getPublicLeaderboard('visual-reaction', { fresh: true });
    expect(freshRes[0].displayName).toBe('Bob');
    expect(getEntriesSpy.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('invalidates cache for a specific assessment type', async () => {
    await service.getPublicLeaderboard('visual-reaction');
    const initialCalls = getEntriesSpy.mock.calls.length;

    service.invalidateCache('visual-reaction');

    await service.getPublicLeaderboard('visual-reaction');
    expect(getEntriesSpy.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('invalidates cache for all assessment types when null is passed', async () => {
    await service.getPublicLeaderboard('visual-reaction');
    await service.getPublicLeaderboard('number-memory');
    const initialCalls = getEntriesSpy.mock.calls.length;

    service.invalidateCache(null);

    await service.getPublicLeaderboard('visual-reaction');
    await service.getPublicLeaderboard('number-memory');
    expect(getEntriesSpy.mock.calls.length).toBe(initialCalls + 8);
  });

  it('prevents stale ordinary reads from overwriting a fresh or newer generation', async () => {
    let resolveSlowRead: (val: any) => void;
    const slowPromise = new Promise(resolve => {
      resolveSlowRead = resolve;
    });

    let first = true;
    getEntriesSpy.mockImplementation(async () => {
      if (first) {
        first = false;
        await slowPromise;
        return [makeMockEntry('slow-1', 'visual-reaction', 300, 'SlowStale')];
      }
      return [makeMockEntry('fast-1', 'visual-reaction', 150, 'FastFresh')];
    });

    // Request A starts ordinary
    const reqA = service.getPublicLeaderboard('visual-reaction');

    // Forced fresh arrives while A is in flight
    const reqB = service.getPublicLeaderboard('visual-reaction', { fresh: true });
    const resB = await reqB;
    expect(resB[0].displayName).toBe('FastFresh');

    // Now resolve slow read A
    resolveSlowRead!(null);
    const resA = await reqA;

    // Normal request C should now get FastFresh (from cache primed by B), NEVER SlowStale
    const resC = await service.getPublicLeaderboard('visual-reaction');
    expect(resC[0].displayName).toBe('FastFresh');
  });

  it('returns defensive copies of cached arrays and objects', async () => {
    const res1 = await service.getPublicLeaderboard('visual-reaction');
    res1[0].displayName = 'Tampered';

    const res2 = await service.getPublicLeaderboard('visual-reaction');
    expect(res2[0].displayName).toBe('Alice');
  });
});

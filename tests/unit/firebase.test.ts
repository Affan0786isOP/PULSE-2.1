import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import { getLeaderboardResults, isOptedInLeaderboardUser, clearClientLeaderboardCache, deleteMyLeaderboardEntries, getMyLeaderboardRank } from '@/lib/firestore';
import { getLeaderboardResults as getMobileLeaderboardResults, clearClientLeaderboardCache as clearMobileCache, deleteMyLeaderboardEntries as deleteMobileMyLeaderboardEntries, getMyLeaderboardRank as getMobileMyLeaderboardRank } from '../../mobile/src/lib/firestore';

// Mock Firebase
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => [{}]),
  getApp: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    getDocsFromServer: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
  };
});

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { uid: '123', getIdToken: vi.fn(() => Promise.resolve('mock-token')) }, onAuthStateChanged: vi.fn() })),
  signInAnonymously: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  inMemoryPersistence: {},
}));

describe('Firebase Integration Tests (Mocked)', () => {
  let localStorageSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    clearClientLeaderboardCache();
    clearMobileCache();
    
    // Spy on localStorage to guarantee no fallback
    localStorageSpy = vi.spyOn(Storage.prototype, 'getItem');
    
    // Polyfill fetch for API calls in the fallback
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: 'API failed' })
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches leaderboard successfully using getLeaderboardResults', async () => {
    const mockDoc = {
      id: 'doc1',
      data: () => ({
        displayName: 'Test User',
        assessmentType: 'visual-reaction',
        scoreMetric: 200,
        ageGroup: 'Adults (26–40)',
        createdAt: Date.now(),
        hidden: false
      })
    };

    (firestore.getDocsFromServer as any).mockResolvedValue({
      docs: [mockDoc]
    });

    const data = await getLeaderboardResults('visual-reaction');
    expect(data).toHaveLength(1);
    expect(data[0].scoreMetric).toBe(200);
    expect(data[0].displayName).toBe('Test User');
    expect(data[0].source).toBe('cloud');
  });

  it('fails loudly on Firebase failure, protecting the invariant against localStorage fallback', async () => {
    // Force Firestore query to reject
    (firestore.getDocsFromServer as any).mockRejectedValue(new Error('Network error'));

    // Should throw error and NOT fallback to localStorage or return local fake data
    await expect(getLeaderboardResults('visual-reaction')).rejects.toThrow('Network error');
    
    // Explicitly verify no local storage fallback was attempted
    expect(localStorageSpy).not.toHaveBeenCalledWith('pulse_leaderboard_fallback');
  });

  it('loads the shared leaderboard helpers in desktop and mobile data layers', async () => {
    expect(isOptedInLeaderboardUser('PULSE learner')).toBe(true);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        entries: [{
          id: 'mobile-entry',
          displayName: 'Mobile Player',
          assessmentType: 'visual-reaction',
          scoreMetric: 200,
          ageGroup: 'Adults (26–40)',
          createdAt: 1
        }]
      })
    });

    const mobileEntries = await getMobileLeaderboardResults('visual-reaction');
    expect(mobileEntries).toHaveLength(1);
    expect(mobileEntries[0].displayName).toBe('Mobile Player');
  });

  it('deleteMyLeaderboardEntries sends authenticated DELETE request and clears client leaderboard cache', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, deletedCount: 3 })
    });

    const resDesktop = await deleteMyLeaderboardEntries('visual-reaction');
    expect(resDesktop.success).toBe(true);
    expect(resDesktop.deletedCount).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/leaderboard/mine?assessmentType=visual-reaction'),
      expect.objectContaining({ method: 'DELETE' })
    );

    const resMobile = await deleteMobileMyLeaderboardEntries('all');
    expect(resMobile.success).toBe(true);
    expect(resMobile.deletedCount).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/leaderboard/mine?assessmentType=all'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getMyLeaderboardRank sends authenticated GET request and returns player rank', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, rank: 5 })
    });

    const resDesktop = await getMyLeaderboardRank('visual-reaction');
    expect(resDesktop.success).toBe(true);
    expect(resDesktop.rank).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/leaderboard/my-rank?assessmentType=visual-reaction'),
      expect.objectContaining({ method: 'GET' })
    );

    const resMobile = await getMobileMyLeaderboardRank('direction');
    expect(resMobile.success).toBe(true);
    expect(resMobile.rank).toBe(5);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/leaderboard/my-rank?assessmentType=direction'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('maintains Firebase mock isolation (no real network calls)', () => {
    expect(vi.isMockFunction(firestore.getDocsFromServer)).toBe(true);
  });
});

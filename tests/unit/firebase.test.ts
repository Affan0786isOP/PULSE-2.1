import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import * as firebaseAuth from 'firebase/auth';
import { getLeaderboardResults } from '@/lib/firestore';

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
  getAuth: vi.fn(() => ({ currentUser: { uid: '123' }, onAuthStateChanged: vi.fn() })),
  signInAnonymously: vi.fn(),
  setPersistence: vi.fn(() => Promise.resolve()),
  inMemoryPersistence: {},
}));

describe('Firebase Integration Tests (Mocked)', () => {
  let localStorageSpy: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
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

  it('maintains Firebase mock isolation (no real network calls)', () => {
    expect(vi.isMockFunction(firestore.getDocsFromServer)).toBe(true);
  });
});

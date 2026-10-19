import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeAssessmentType,
  startExperimentSession,
  submitAssessmentResult,
  submitLeaderboardResult,
  deleteMyLeaderboardEntries,
  getMyLeaderboardRank
} from '../../src/lib/firestore';

// Mock dependencies required by fetchWithAuth inside firestore.ts
vi.mock('../../src/lib/firebase', () => {
  return {
    auth: {
      currentUser: {
        uid: 'test-user-id',
        getIdToken: () => Promise.resolve('mock-token')
      }
    },
    db: {},
    isConfigured: true,
    authInitPromise: Promise.resolve(),
  };
});

describe('normalizeAssessmentType', () => {
  it('returns valid types for canonical types', () => {
    expect(normalizeAssessmentType('visual-reaction')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction')).toBe('direction');
    expect(normalizeAssessmentType('color-recognition')).toBe('color-recognition');
    expect(normalizeAssessmentType('block-memory')).toBe('block-memory');
    expect(normalizeAssessmentType('number-memory')).toBe('number-memory');
  });

  it('preserves legitimate aliases', () => {
    expect(normalizeAssessmentType('reaction-test')).toBe('visual-reaction');
    expect(normalizeAssessmentType('direction-test')).toBe('direction');
    expect(normalizeAssessmentType('color-test')).toBe('color-recognition');
    expect(normalizeAssessmentType('colour-recognition')).toBe('color-recognition');
  });

  it('rejects unknown or malformed types by returning null instead of defaulting to visual-reaction', () => {
    expect(normalizeAssessmentType('invalid-type')).toBeNull();
    expect(normalizeAssessmentType('unknown')).toBeNull();
    expect(normalizeAssessmentType('')).toBeNull();
    // @ts-ignore - testing runtime behavior
    expect(normalizeAssessmentType(null)).toBeNull();
    // @ts-ignore
    expect(normalizeAssessmentType(undefined)).toBeNull();
  });
});

describe('API catch blocks error handling', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    // Suppress console.error/warn during tests that intentionally trigger them
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('startExperimentSession handles .json() rejection correctly on failed request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await startExperimentSession('visual-reaction', '18-24');

    expect(result).toEqual({
      success: false,
      error: 'Server responded with status 500',
      status: 500
    });
  });

  it('submitAssessmentResult handles .json() rejection correctly on failed request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await submitAssessmentResult({ assessmentType: 'visual-reaction', ageGroup: '18-24' });

    expect(result).toEqual({
      success: false,
      error: 'Server rejected submission (500)'
    });
  });

  it('submitAssessmentResult handles .json() rejection correctly on successful request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await submitAssessmentResult({ assessmentType: 'visual-reaction', ageGroup: '18-24' });

    expect(result).toEqual({
      success: true,
      derivedMetrics: undefined,
      scoreMetric: undefined,
      isNewPersonalBest: undefined,
      previousPersonalBest: undefined,
      personalBest: undefined
    });
  });

  it('submitLeaderboardResult handles .json() rejection correctly on failed request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await submitLeaderboardResult({ assessmentType: 'visual-reaction', ageGroup: '18-24', displayName: 'Test', scoreMetric: 100 });

    expect(result).toEqual({
      success: false,
      syncedToCloud: false,
      error: 'Server rejected leaderboard submission (500)'
    });
  });

  it('deleteMyLeaderboardEntries handles .json() rejection correctly on failed request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await deleteMyLeaderboardEntries('visual-reaction');

    expect(result).toEqual({
      success: false,
      deletedCount: 0,
      error: 'Server returned 500'
    });
  });

  it('deleteMyLeaderboardEntries handles .json() rejection correctly on successful request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await deleteMyLeaderboardEntries('visual-reaction');

    expect(result).toEqual({
      success: true,
      deletedCount: 0
    });
  });

  it('getMyLeaderboardRank handles .json() rejection correctly on failed request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getMyLeaderboardRank('visual-reaction');

    expect(result).toEqual({
      success: false,
      rank: null,
      error: 'Server returned 500'
    });
  });

  it('getMyLeaderboardRank handles .json() rejection correctly on successful request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('Parse error'))
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await getMyLeaderboardRank('visual-reaction');

    expect(result).toEqual({
      success: true,
      rank: null
    });
  });
});

describe('setServiceWorkerActiveSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('handles serviceWorker.getRegistration() rejection correctly (catch block at line 256)', async () => {
    const getRegistrationMock = vi.fn().mockRejectedValue(new Error('Service worker error'));

    // Use vi.stubGlobal to safely mock window and navigator properties
    vi.stubGlobal('navigator', {
      ...global.navigator,
      serviceWorker: {
        getRegistration: getRegistrationMock
      }
    });

    const { setServiceWorkerActiveSession } = await import('../../src/lib/firestore');

    // To trigger the line 251 check, we must have an active session originally, which means window.__PULSE_SESSION_ACTIVE__ or active argument transitions.
    // The code does:
    // (window as any).__PULSE_SESSION_ACTIVE__ = active;
    // ...
    // if (!active && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) { ... }

    // The function returns void; wait for the rejected registration promise to settle
    // so this test exercises the internal catch instead of only checking sync throws.
    expect(() => setServiceWorkerActiveSession(false)).not.toThrow();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(getRegistrationMock).toHaveBeenCalledTimes(1);
  });
});

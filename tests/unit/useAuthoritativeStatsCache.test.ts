import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthoritativeStats, clearAuthoritativeStatsCache } from '@/lib/useAuthoritativeStats';
import * as firestore from 'firebase/firestore';
import * as firestoreModule from '@/lib/firestore';

vi.mock('@/lib/firebase', () => ({
  db: {}
}));

vi.mock('@/lib/firestore', () => ({
  ensureFirebaseReady: vi.fn(),
  ensureAuthenticatedUser: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  getCountFromServer: vi.fn()
}));

describe('useAuthoritativeStats 60s Cache (Tier 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAuthoritativeStatsCache();
    vi.mocked(firestoreModule.ensureFirebaseReady).mockResolvedValue(true);
    vi.mocked(firestoreModule.ensureAuthenticatedUser).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves cached count within 60s without calling Firestore getCountFromServer again', async () => {
    vi.mocked(firestore.getCountFromServer).mockResolvedValueOnce({
      data: () => ({ count: 1250 })
    } as any);

    const { result, unmount } = renderHook(() => useAuthoritativeStats());

    await waitFor(() => {
      expect(result.current.isLoadingResults).toBe(false);
    });

    expect(result.current.resultsCount).toBe(1250);
    expect(firestore.getCountFromServer).toHaveBeenCalledTimes(1);

    unmount();

    // Second hook render within 60s
    const { result: result2 } = renderHook(() => useAuthoritativeStats());
    expect(result2.current.isLoadingResults).toBe(false);
    expect(result2.current.resultsCount).toBe(1250);
    expect(firestore.getCountFromServer).toHaveBeenCalledTimes(1);
  });

  it('coalesces concurrent requests from multiple mounting components', async () => {
    vi.mocked(firestore.getCountFromServer).mockResolvedValueOnce({
      data: () => ({ count: 1500 })
    } as any);

    const { result: hook1 } = renderHook(() => useAuthoritativeStats());
    const { result: hook2 } = renderHook(() => useAuthoritativeStats());

    await waitFor(() => {
      expect(hook1.current.isLoadingResults).toBe(false);
      expect(hook2.current.isLoadingResults).toBe(false);
    });

    expect(hook1.current.resultsCount).toBe(1500);
    expect(hook2.current.resultsCount).toBe(1500);
    expect(firestore.getCountFromServer).toHaveBeenCalledTimes(1);
  });

  it('transitions to null (unavailable) on expired revalidation failure rather than serving indefinitely stale numbers', async () => {
    let now = 1000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);

    vi.mocked(firestore.getCountFromServer).mockResolvedValueOnce({
      data: () => ({ count: 1250 })
    } as any);

    const { result, unmount } = renderHook(() => useAuthoritativeStats());
    await waitFor(() => expect(result.current.isLoadingResults).toBe(false));
    expect(result.current.resultsCount).toBe(1250);
    unmount();

    // Advance clock past 60s TTL
    now += 61_000;

    // Next fetch fails
    vi.mocked(firestore.getCountFromServer).mockRejectedValueOnce(new Error('Network error'));

    const { result: result2 } = renderHook(() => useAuthoritativeStats());
    await waitFor(() => expect(result2.current.isLoadingResults).toBe(false));

    // Must transition to null (unavailable) to prevent stale number drift
    expect(result2.current.resultsCount).toBeNull();
  });
});

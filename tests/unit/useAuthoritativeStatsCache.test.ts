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

  it('preserves stale cached count from localStorage on revalidation failure (stale-while-revalidate)', async () => {
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

    // Next fetch fails (transient network glitch)
    vi.mocked(firestore.getCountFromServer).mockRejectedValueOnce(new Error('Network error'));

    const { result: result2 } = renderHook(() => useAuthoritativeStats());
    await waitFor(() => expect(result2.current.isLoadingResults).toBe(false));

    // Stale-while-revalidate preserves last known authoritative count so user never sees blank/skeleton
    expect(result2.current.resultsCount).toBe(1250);
  });

  it('loads persisted count from localStorage on cold start immediately while refreshing in background', async () => {
    localStorage.setItem('pulse_authoritative_stats', JSON.stringify({ count: 94, storedAt: 500 }));

    let resolveFetch: (val: any) => void;
    const pendingPromise = new Promise((resolve) => { resolveFetch = resolve; });
    vi.mocked(firestore.getCountFromServer).mockReturnValueOnce(pendingPromise as any);

    const { result } = renderHook(() => useAuthoritativeStats());

    // Immediately shows cached count from localStorage
    expect(result.current.resultsCount).toBe(94);

    // Resolve network fetch with updated count
    resolveFetch!({ data: () => ({ count: 98 }) });

    await waitFor(() => {
      expect(result.current.resultsCount).toBe(98);
      expect(result.current.isLoadingResults).toBe(false);
    });

    // Check localStorage was updated with fresh value
    const updated = JSON.parse(localStorage.getItem('pulse_authoritative_stats') || '{}');
    expect(updated.count).toBe(98);
  });
});

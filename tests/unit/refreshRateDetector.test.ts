import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as desktopDetector from '@/lib/refreshRateDetector';
import * as mobileDetector from '../../mobile/src/lib/refreshRateDetector';

describe.each([
  { platform: 'Desktop', mod: desktopDetector },
  { platform: 'Mobile', mod: mobileDetector }
])('$platform Refresh Rate Timing Detector & Cache Hardening', ({ mod }) => {
  const CACHE_KEY = 'pulse_refresh_rate_cached';

  beforeEach(() => {
    localStorage.clear();
    (window as any).__PULSE_SESSION_ACTIVE__ = false;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    (window as any).__PULSE_SESSION_ACTIVE__ = false;
    vi.restoreAllMocks();
  });

  it('rejects un-timestamped legacy cache entries', () => {
    const legacyEntry = {
      info: {
        hz: 120,
        frameTimeMs: 8.33,
        displayDelayOffsetMs: 4.17,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      displaySignature: mod.getDisplaySignature()
      // missing timestamp
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(legacyEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(false);
    expect(mod.getCachedRefreshRate().source).toBe('fallback');
  });

  it('rejects future-timestamped entries', () => {
    const futureEntry = {
      info: {
        hz: 120,
        frameTimeMs: 8.33,
        displayDelayOffsetMs: 4.17,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      timestamp: Date.now() + 100000,
      displaySignature: mod.getDisplaySignature()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(futureEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(false);
  });

  it('rejects stale cache entries older than 12 hours', () => {
    const staleEntry = {
      info: {
        hz: 144,
        frameTimeMs: 6.94,
        displayDelayOffsetMs: 3.47,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      timestamp: Date.now() - (mod.MAX_REFRESH_RATE_CACHE_AGE_MS + 1000),
      displaySignature: mod.getDisplaySignature()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(staleEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(false);
  });

  it('rejects cache entries with mismatched displaySignature', () => {
    const mismatchedSignatureEntry = {
      info: {
        hz: 144,
        frameTimeMs: 6.94,
        displayDelayOffsetMs: 3.47,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      timestamp: Date.now() - 1000,
      displaySignature: '1920x1080@1:1920x1040' // mismatched
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(mismatchedSignatureEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(false);
  });

  it('rejects cache entries with inconsistent measuredHz', () => {
    const inconsistentEntry = {
      info: {
        hz: 144,
        frameTimeMs: 6.94,
        displayDelayOffsetMs: 3.47,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      timestamp: Date.now() - 1000,
      displaySignature: mod.getDisplaySignature(),
      measuredHz: 60 // inconsistent with info.hz 144
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(inconsistentEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(false);
  });

  it('accepts and returns valid cached info when all invariants hold', () => {
    const validEntry = {
      info: {
        hz: 120,
        frameTimeMs: 8.33,
        displayDelayOffsetMs: 4.17,
        isEstimated: false,
        source: 'measured',
        status: 'ready'
      },
      timestamp: Date.now() - 1000,
      displaySignature: mod.getDisplaySignature(),
      measuredHz: 120
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(validEntry));

    expect(mod.isRefreshRateCacheValid()).toBe(true);
    const cached = mod.getCachedRefreshRate();
    expect(cached.hz).toBe(120);
    expect(cached.displayDelayOffsetMs).toBe(4.17);
    expect(cached.source).toBe('measured');
  });

  it('immediately returns cached rate without RAF sampling when __PULSE_SESSION_ACTIVE__ is true', async () => {
    (window as any).__PULSE_SESSION_ACTIVE__ = true;
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');

    const res = await mod.detectRefreshRate();
    expect(res).toBeDefined();
    expect(rafSpy).not.toHaveBeenCalled();
  });
});

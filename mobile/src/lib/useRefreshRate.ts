import { useState, useEffect } from 'react';
import {
  detectRefreshRate,
  getCachedRefreshRate,
  isRefreshRateCacheValid,
  getDisplaySignature,
  RefreshRateInfo
} from './refreshRateDetector';

export function useRefreshRate(): RefreshRateInfo {
  const [info, setInfo] = useState<RefreshRateInfo>(getCachedRefreshRate);

  useEffect(() => {
    let isMounted = true;

    const handleRefreshRateChange = (e: Event) => {
      const customEvent = e as CustomEvent<RefreshRateInfo>;
      if (isMounted && customEvent.detail) {
        setInfo(customEvent.detail);
      }
    };

    window.addEventListener('pulse_refresh_rate_changed', handleRefreshRateChange);

    // Initial check: if cache is invalid or stale, schedule background detection
    const isCacheValid = isRefreshRateCacheValid();

    let idleHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    if (!isCacheValid) {
      const startBackgroundDetection = () => {
        if (!isMounted) return;
        detectRefreshRate()
          .then((detected) => {
            if (isMounted) {
              setInfo(detected);
            }
          })
          .catch(() => {});
      };

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleHandle = (window as any).requestIdleCallback(startBackgroundDetection, { timeout: 2000 });
      } else if (typeof window !== 'undefined') {
        timerHandle = setTimeout(startBackgroundDetection, 1000);
      }
    }

    // Monitor changes / revalidation on visibility or focus restoration
    let lastCheckedSignature = getDisplaySignature();
    let lastRevalidationTime = Date.now();
    const MIN_REVALIDATION_INTERVAL_MS = 30_000; // Throttle to at most once per 30s unless signature changed

    const checkAndRevalidate = (forceCheck = false) => {
      if (!isMounted || typeof window === 'undefined') return;
      const currentSig = getDisplaySignature();
      const sigChanged = Boolean(currentSig && currentSig !== lastCheckedSignature);
      const cacheStillValid = isRefreshRateCacheValid();
      const now = Date.now();
      const timeElapsed = now - lastRevalidationTime;

      if (sigChanged || !cacheStillValid || (forceCheck && timeElapsed > MIN_REVALIDATION_INTERVAL_MS)) {
        lastCheckedSignature = currentSig;
        lastRevalidationTime = now;
        detectRefreshRate(true)
          .then((detected) => {
            if (isMounted) setInfo(detected);
          })
          .catch(() => {});
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      checkAndRevalidate(false);
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // Invalidation on display resize or orientation changes
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    let lastHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const handleDisplayChange = () => {
      if (typeof window === 'undefined') return;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const diffX = Math.abs(currentWidth - lastWidth);
      const diffY = Math.abs(currentHeight - lastHeight);

      // Evaluate on major dimension change
      if (diffX > 200 || diffY > 200) {
        lastWidth = currentWidth;
        lastHeight = currentHeight;

        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (isMounted) {
            checkAndRevalidate(false);
          }
        }, 800);
      }
    };

    window.addEventListener('resize', handleDisplayChange, { passive: true });

    return () => {
      isMounted = false;
      if (idleHandle !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('pulse_refresh_rate_changed', handleRefreshRateChange);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('resize', handleDisplayChange);
    };
  }, []);

  return info;
}

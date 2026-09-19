import { useState, useEffect } from 'react';
import { detectRefreshRate, getCachedRefreshRate, RefreshRateInfo } from './refreshRateDetector';

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

    // Check if a valid cached calibration already exists
    const currentCached = getCachedRefreshRate();
    const hasValidCache = currentCached && currentCached.status === 'ready' && currentCached.source !== 'fallback';

    let idleHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    // Do not repeatedly run calibration when a valid cached result already exists.
    // When detection is needed, defer it to browser idle time so it does not compete
    // with initial Home page mounting, animations, or block page content.
    if (!hasValidCache) {
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

    // Invalidation only when window moves between drastically different displays and no valid cache exists
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    let lastHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const handleDisplayChange = () => {
      if (typeof window === 'undefined') return;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const diffX = Math.abs(currentWidth - lastWidth);
      const diffY = Math.abs(currentHeight - lastHeight);

      // Only evaluate on major dimension change (e.g. multi-monitor switch)
      if (diffX > 250 || diffY > 250) {
        lastWidth = currentWidth;
        lastHeight = currentHeight;

        // Do not repeatedly run calibration when a valid cached result already exists
        const latest = getCachedRefreshRate();
        if (!latest || latest.status !== 'ready' || latest.source === 'fallback') {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (isMounted) {
              detectRefreshRate(false)
                .then((detected) => {
                  if (isMounted) setInfo(detected);
                })
                .catch(() => {});
            }
          }, 800);
        }
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
      window.removeEventListener('resize', handleDisplayChange);
    };
  }, []);

  return info;
}

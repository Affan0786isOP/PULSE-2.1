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

    // Initial background detection if needed
    detectRefreshRate()
      .then((detected) => {
        if (isMounted) {
          setInfo(detected);
        }
      })
      .catch(() => {});

    // Invalidation on window moving between monitors / significant resize / orientation
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    let lastHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const handleDisplayChange = () => {
      if (typeof window === 'undefined') return;
      const currentWidth = window.innerWidth;
      const currentHeight = window.innerHeight;
      const diffX = Math.abs(currentWidth - lastWidth);
      const diffY = Math.abs(currentHeight - lastHeight);

      if (diffX > 150 || diffY > 150) {
        lastWidth = currentWidth;
        lastHeight = currentHeight;
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (isMounted) {
            detectRefreshRate(true)
              .then((detected) => {
                if (isMounted) setInfo(detected);
              })
              .catch(() => {});
          }
        }, 600);
      }
    };

    window.addEventListener('resize', handleDisplayChange, { passive: true });
    window.addEventListener('orientationchange', handleDisplayChange, { passive: true });

    return () => {
      isMounted = false;
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('pulse_refresh_rate_changed', handleRefreshRateChange);
      window.removeEventListener('resize', handleDisplayChange);
      window.removeEventListener('orientationchange', handleDisplayChange);
    };
  }, []);

  return info;
}

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

    return () => {
      isMounted = false;
      window.removeEventListener('pulse_refresh_rate_changed', handleRefreshRateChange);
    };
  }, []);

  return info;
}

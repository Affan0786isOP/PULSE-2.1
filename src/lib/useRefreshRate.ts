import { useState, useEffect } from 'react';
import { detectRefreshRate, getCachedRefreshRate, RefreshRateInfo } from './refreshRateDetector';

export function useRefreshRate(): RefreshRateInfo {
  const [info, setInfo] = useState<RefreshRateInfo>(getCachedRefreshRate());

  useEffect(() => {
    let isMounted = true;
    detectRefreshRate().then((detected) => {
      if (isMounted) {
        setInfo(detected);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  return info;
}

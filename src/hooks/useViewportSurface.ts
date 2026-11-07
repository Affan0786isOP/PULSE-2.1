import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { assessmentLockStore } from '@shared/assessment/assessmentLockStore';
import { 
  evaluateDeviceRouting, 
  syncDeviceRoutingStorage, 
  cleanConsumedRoutingParams 
} from '@shared/domain/deviceRouting';

export function useViewportSurface(): 'desktop' | 'mobile' {
  const location = useLocation();

  const evaluateSurface = (): 'desktop' | 'mobile' => {
    if (typeof window === 'undefined') return 'desktop';
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
      return 'desktop';
    }
    const search = location.search || window.location.search || '';
    const decision = evaluateDeviceRouting(search);
    const params = new URLSearchParams(search);
    const hasParams = params.has('force_mobile') || params.has('mobile') || params.has('force_desktop') || params.has('desktop');
    syncDeviceRoutingStorage(decision, hasParams);
    if (hasParams) cleanConsumedRoutingParams();

    return decision.shouldUseMobile ? 'mobile' : 'desktop';
  };

  const [surface, setSurface] = useState<'desktop' | 'mobile'>(evaluateSurface);

  useEffect(() => {
    const nextSurface = evaluateSurface();
    if (assessmentLockStore.isProtected()) {
      if (nextSurface !== surface) {
        assessmentLockStore.setQueuedSurface(nextSurface);
      }
      return;
    }
    setSurface(nextSurface);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      const nextSurface = evaluateSurface();
      if (assessmentLockStore.isProtected()) {
        if (nextSurface !== surface) {
          assessmentLockStore.setQueuedSurface(nextSurface);
        }
        return;
      }
      setSurface(nextSurface);
    };

    window.addEventListener('resize', handleResize);
    const mediaQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    mediaQuery?.addEventListener('change', handleResize);

    const unsubscribe = assessmentLockStore.subscribe((state) => {
      if (!state.isLocked && !state.isAcquiring) {
        const queued = assessmentLockStore.getAndClearQueuedSurface();
        if (queued && queued !== surface) {
          setSurface(queued);
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery?.removeEventListener('change', handleResize);
      unsubscribe();
    };
  }, [surface, location.pathname, location.search]);

  return surface;
}

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { assessmentLockStore } from '@shared/assessment/assessmentLockStore';
import { 
  evaluateDeviceRouting, 
  syncDeviceRoutingStorage, 
  cleanConsumedRoutingParams 
} from '@shared/domain/deviceRouting';

export function useViewportSurface(): 'desktop' | 'mobile' {
  const location = useLocation();

  const computeSurface = (): 'desktop' | 'mobile' => {
    if (typeof window === 'undefined') return 'desktop';
    if (location.pathname === '/admin' || location.pathname.startsWith('/admin/')) {
      return 'desktop';
    }
    const search = location.search || (typeof window !== 'undefined' ? window.location.search : '') || '';
    const decision = evaluateDeviceRouting(search);
    return decision.shouldUseMobile ? 'mobile' : 'desktop';
  };

  const [surface, setSurface] = useState<'desktop' | 'mobile'>(computeSurface);
  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  useEffect(() => {
    const search = location.search || (typeof window !== 'undefined' ? window.location.search : '') || '';
    const decision = evaluateDeviceRouting(search);
    const params = new URLSearchParams(search);
    const hasParams = params.has('force_mobile') || params.has('mobile') || params.has('force_desktop') || params.has('desktop');
    syncDeviceRoutingStorage(decision, hasParams);

    const nextSurface = computeSurface();
    if (assessmentLockStore.isProtected()) {
      if (nextSurface !== surfaceRef.current) {
        assessmentLockStore.setQueuedSurface(nextSurface);
      } else {
        assessmentLockStore.setQueuedSurface(null);
      }
      return;
    }
    setSurface(nextSurface);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handleResize = () => {
      const nextSurface = computeSurface();
      if (assessmentLockStore.isProtected()) {
        if (nextSurface !== surfaceRef.current) {
          assessmentLockStore.setQueuedSurface(nextSurface);
        } else {
          assessmentLockStore.setQueuedSurface(null);
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
        if (queued && queued !== surfaceRef.current) {
          setSurface(queued);
        }
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      mediaQuery?.removeEventListener('change', handleResize);
      unsubscribe();
    };
  }, [location.pathname, location.search]);

  return surface;
}

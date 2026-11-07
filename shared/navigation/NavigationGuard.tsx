import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, Location } from 'react-router-dom';
import { assessmentLockStore } from '../assessment/assessmentLockStore';

type GuardStatus = 'UNLOCKED' | 'LOCKED' | 'RESTORING' | 'RESTORED' | 'ABANDONING';

interface NavigationLocationContextType {
  effectiveLocation: Location;
  isProtected: boolean;
}

const NavigationLocationContext = createContext<NavigationLocationContextType | null>(null);

export function useNavigationLocation() {
  const context = useContext(NavigationLocationContext);
  const fallbackLocation = useLocation();
  if (!context) {
    return { effectiveLocation: fallbackLocation, isProtected: false };
  }
  return context;
}

export function NavigationGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const statusRef = useRef<GuardStatus>('UNLOCKED');
  const lockedIdxRef = useRef<number | null>(null);
  const lockedLocationRef = useRef<Location>(location);
  const pendingTargetIdxRef = useRef<number | null>(null);

  // Controlled location state provided to child Routes
  const [effectiveLocation, setEffectiveLocation] = useState<Location>(location);
  const [isProtectedState, setIsProtectedState] = useState(() => assessmentLockStore.isProtected());

  useEffect(() => {
    return assessmentLockStore.subscribe((state) => {
      const isProtected = state.isLocked || state.isAcquiring;
      setIsProtectedState(isProtected);
      if (isProtected && statusRef.current === 'UNLOCKED') {
        statusRef.current = 'LOCKED';
        lockedIdxRef.current = window.history.state?.idx ?? 0;
        lockedLocationRef.current = location;
        setEffectiveLocation(location);
      } else if (!isProtected && statusRef.current === 'LOCKED') {
        statusRef.current = 'UNLOCKED';
        lockedIdxRef.current = null;
        pendingTargetIdxRef.current = null;
        setEffectiveLocation(location);
      }
    });
  }, [location]);

  // Keep effective location aligned while unlocked
  useEffect(() => {
    if (statusRef.current === 'UNLOCKED') {
      setEffectiveLocation(location);
    }
  }, [location]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (assessmentLockStore.isProtected()) {
        e.preventDefault();
        e.returnValue = 'Assessment in progress. Progress will be lost.';
        return e.returnValue;
      }
    };

    const handlePopState = async () => {
      if (!assessmentLockStore.isProtected()) return;

      const currentIdx = window.history.state?.idx ?? 0;
      const targetLockedIdx = lockedIdxRef.current ?? currentIdx;

      const executeAbandonment = async (currentIdx: number, targetLockedIdx: number) => {
        if (assessmentLockStore.isAcquiring()) {
          try {
            const cancelled = await assessmentLockStore.cancelPendingAcquisition();
            if (cancelled) {
              statusRef.current = 'UNLOCKED';
              lockedIdxRef.current = null;
              pendingTargetIdxRef.current = null;
              setEffectiveLocation(location);
              return;
            }
          } catch (err) {
            console.error('[NavigationGuard] Acquisition cancellation failed:', err);
            window.alert('Failed to safely cancel assessment initialization. Retaining assessment.');
          }

          // Rollback to locked index if cancellation failed
          statusRef.current = 'LOCKED';
          const rollbackDelta = targetLockedIdx - currentIdx;
          if (rollbackDelta !== 0) {
            window.history.go(rollbackDelta);
          }
          return;
        }

        const runId = assessmentLockStore.getActiveRunId();
        if (runId) {
          try {
            const aborted = await assessmentLockStore.forceAbortLock(runId);
            if (aborted) {
              statusRef.current = 'UNLOCKED';
              lockedIdxRef.current = null;
              pendingTargetIdxRef.current = null;
              setEffectiveLocation(location); // Lift location freeze
              return;
            } else {
              // Abortion rejected (e.g. submission began in flight)
              window.alert('Assessment result submission has begun and cannot be abandoned. Returning to assessment.');
            }
          } catch (err) {
            console.error('[NavigationGuard] Force abort failed:', err);
            window.alert('Failed to safely release assessment session. Retaining assessment.');
          }

          // Rollback to locked index on rejection or error
          statusRef.current = 'LOCKED';
          const rollbackDelta = targetLockedIdx - currentIdx;
          if (rollbackDelta !== 0) {
            window.history.go(rollbackDelta);
          }
        }
      };

      // 1. Arrival from restoration traversal
      if (statusRef.current === 'RESTORING') {
        if (currentIdx === targetLockedIdx) {
          statusRef.current = 'RESTORED';
          
          if (assessmentLockStore.isSubmitting()) {
            window.alert('Result submission is actively in progress. Please wait for sync to complete.');
            statusRef.current = 'LOCKED';
            return;
          }

          const confirmAbort = window.confirm('An active cognitive trial is in progress. Are you sure you want to abandon it?');
          if (confirmAbort) {
            statusRef.current = 'ABANDONING';
            const targetIdx = pendingTargetIdxRef.current ?? (currentIdx - 1);
            const delta = targetIdx - currentIdx;
            if (delta !== 0) {
              window.history.go(delta); // Advance to intended target
            } else {
              await executeAbandonment(currentIdx, targetLockedIdx);
            }
          } else {
            statusRef.current = 'LOCKED';
          }
        }
        return;
      }

      // 2. Arrival from abandonment traversal
      if (statusRef.current === 'ABANDONING') {
        if (currentIdx === pendingTargetIdxRef.current) {
          await executeAbandonment(currentIdx, targetLockedIdx);
        }
        return;
      }

      // 3. Normal locked state: intercept navigation and begin restoration traversal
      if (statusRef.current === 'LOCKED') {
        statusRef.current = 'RESTORING';
        pendingTargetIdxRef.current = currentIdx;
        const deltaToLocked = targetLockedIdx - currentIdx;
        if (deltaToLocked !== 0) {
          window.history.go(deltaToLocked);
        } else {
          statusRef.current = 'LOCKED';
        }
      }
    };

    const handleClickCapture = async (e: MouseEvent) => {
      if (!assessmentLockStore.isProtected()) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      const targetAttr = target.getAttribute('target');
      const downloadAttr = target.getAttribute('download');

      if (!href || href.startsWith('#') || targetAttr === '_blank' || downloadAttr !== null) return;

      try {
        const targetUrl = new URL(href, window.location.origin);
        if (targetUrl.origin !== window.location.origin) return;
      } catch {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (assessmentLockStore.isSubmitting()) {
        window.alert('Result submission is actively in progress. Please wait for sync to complete.');
        return;
      }

      const confirmAbort = window.confirm('An active cognitive trial is in progress. Are you sure you want to abandon it?');
      if (confirmAbort) {
        if (assessmentLockStore.isAcquiring()) {
          try {
            const cancelled = await assessmentLockStore.cancelPendingAcquisition();
            if (cancelled) navigate(href);
          } catch (err) {
            console.error('[NavigationGuard] Acquisition cancellation failed:', err);
            window.alert('Failed to safely cancel assessment initialization.');
          }
          return;
        }

        const runId = assessmentLockStore.getActiveRunId();
        if (runId) {
          try {
            const aborted = await assessmentLockStore.forceAbortLock(runId);
            if (aborted) {
              navigate(href);
            } else {
              window.alert('Assessment result submission has begun and cannot be abandoned.');
            }
          } catch (err) {
            console.error('[NavigationGuard] Force abort failed:', err);
            window.alert('Failed to safely release assessment session.');
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClickCapture, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClickCapture, true);
    };
  }, [location, navigate]);

  return (
    <NavigationLocationContext.Provider value={{ effectiveLocation, isProtected: isProtectedState }}>
      {children}
    </NavigationLocationContext.Provider>
  );
}

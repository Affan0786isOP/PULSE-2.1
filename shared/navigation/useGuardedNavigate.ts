import { useCallback } from 'react';
import { useNavigate, NavigateOptions, To } from 'react-router-dom';
import { assessmentLockStore } from '../assessment/assessmentLockStore';

export function useGuardedNavigate() {
  const navigate = useNavigate();

  return useCallback(async (to: To | number, options?: NavigateOptions) => {
    if (assessmentLockStore.isProtected()) {
      if (assessmentLockStore.isSubmitting()) {
        window.alert('Result submission is actively in progress. Please wait for sync to complete.');
        return;
      }
      const confirmAbort = window.confirm('An active cognitive trial is in progress. Are you sure you want to abandon it?');
      if (!confirmAbort) return;

      if (assessmentLockStore.isAcquiring()) {
        try {
          const cancelled = await assessmentLockStore.cancelPendingAcquisition();
          if (!cancelled) return;
        } catch (err) {
          console.error('[useGuardedNavigate] Acquisition cancellation failed:', err);
          window.alert('Failed to safely cancel assessment initialization.');
          return;
        }
      } else {
        const runId = assessmentLockStore.getActiveRunId();
        if (runId) {
          try {
            const aborted = await assessmentLockStore.forceAbortLock(runId);
            if (!aborted) {
              window.alert('Assessment result submission has begun and cannot be abandoned.');
              return;
            }
          } catch (err) {
            console.error('[useGuardedNavigate] Force abort failed:', err);
            window.alert('Failed to safely release assessment session.');
            return;
          }
        }
      }
    }

    if (typeof to === 'number') {
      navigate(to);
    } else if (options !== undefined) {
      navigate(to, options);
    } else {
      navigate(to);
    }
  }, [navigate]);
}

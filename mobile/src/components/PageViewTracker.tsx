import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { isTrackedPageRoute, ActivitySurface, PageViewRequest } from '@shared/types/telemetry';
import { getOrCreateDeviceId, isTelemetryOptedOut } from '@shared/telemetry/deviceId';
import { captureReferralFromUrl, getActiveReferralToken } from '@shared/lib/referralManager';
import { pageViewTrackerGuard } from '@shared/telemetry/pageViewTrackerGuard';

interface PageViewTrackerProps {
  surface: ActivitySurface;
}

/**
 * Normalizes browser pathnames. Specifically maps mobile base `/mobile/` or `/mobile` to `/`.
 */
export function normalizeTrackedRoute(pathname: string, surface: ActivitySurface): string {
  let normalized = pathname || '/';
  if (surface === 'mobile') {
    if (normalized === '/mobile' || normalized === '/mobile/') {
      normalized = '/';
    } else if (normalized.startsWith('/mobile/')) {
      normalized = normalized.slice('/mobile'.length);
    }
  }
  return normalized;
}

export function PageViewTracker({ surface }: PageViewTrackerProps) {
  const location = useLocation();

  useEffect(() => {
    // Capture and sanitize any referral query parameters
    captureReferralFromUrl();

    if (isTelemetryOptedOut()) return;

    const normalizedRoute = normalizeTrackedRoute(location.pathname, surface);

    if (!isTrackedPageRoute(normalizedRoute)) {
      return;
    }

    const navigationKey = location.key || `${location.pathname}_${typeof window !== 'undefined' ? window.history.state?.idx ?? 0 : 0}`;
    if (!pageViewTrackerGuard.shouldTrack(normalizedRoute, navigationKey)) {
      return;
    }

    const now = Date.now();
    const eventId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const deviceId = getOrCreateDeviceId();
    const referralSource = getActiveReferralToken() ?? undefined;

    const payload: PageViewRequest = {
      eventId,
      route: normalizedRoute,
      surface,
      deviceId,
      referralSource,
      clientTimestampMs: now
    };

    try {
      if (typeof fetch === 'function') {
        void fetch('/api/telemetry/page-view', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(() => {
          // Silent swallow on telemetry transport error
        });
      }
    } catch {
      // Telemetry must never crash client rendering
    }
  }, [location.pathname, location.key, surface]);

  return null;
}

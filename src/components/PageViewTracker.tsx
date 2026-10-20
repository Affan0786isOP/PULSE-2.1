import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { isTrackedPageRoute, ActivitySurface, PageViewRequest } from '@shared/types/telemetry';
import { getOrCreateDeviceId, isTelemetryOptedOut } from '@shared/telemetry/deviceId';

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
  const lastTrackedRef = useRef<{ route: string; timestamp: number } | null>(null);

  useEffect(() => {
    if (isTelemetryOptedOut()) return;

    const normalizedRoute = normalizeTrackedRoute(location.pathname, surface);

    if (!isTrackedPageRoute(normalizedRoute)) {
      return;
    }

    const now = Date.now();
    // Guard against React 19 StrictMode double-mounting on identical route within 500ms
    if (
      lastTrackedRef.current &&
      lastTrackedRef.current.route === normalizedRoute &&
      now - lastTrackedRef.current.timestamp < 500
    ) {
      return;
    }

    lastTrackedRef.current = { route: normalizedRoute, timestamp: now };

    const eventId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const deviceId = getOrCreateDeviceId();

    const payload: PageViewRequest = {
      eventId,
      route: normalizedRoute,
      surface,
      deviceId,
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
  }, [location.pathname, surface]);

  return null;
}

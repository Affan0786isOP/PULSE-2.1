/**
 * Refresh Rate and Display Frame Timing Estimator
 *
 * NOTE ON MEASUREMENT METHODOLOGY:
 * - Browser frame timing via requestAnimationFrame provides high-resolution monotonic timestamps.
 * - displayDelayOffsetMs is a theoretical frame-interval midpoint approximation (frameTimeMs / 2)
 *   derived from the detected display refresh rate. It represents expected average rasterization
 *   lag from frame dispatch to mid-scanout.
 * - It is a calibrated model approximation, not a direct photodiode hardware sensor measurement.
 */

export interface RefreshRateInfo {
  hz: number;                  // Detected display refresh rate (e.g., 60, 75, 120, 144, 240, 360)
  frameTimeMs: number;         // Nominal frame interval in ms (e.g., 16.67, 8.33, 6.94)
  displayDelayOffsetMs: number; // Estimated frame midpoint offset in ms (frameTimeMs / 2)
  isEstimated: boolean;
  status: 'detecting' | 'ready';
}

const CACHE_KEY = 'pulse_refresh_rate_cached';

let cachedInfo: RefreshRateInfo | null = (() => {
  if (typeof window !== 'undefined' && false) {
    try {
      const raw = null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.hz === 'number') {
          return { ...parsed, status: 'ready' };
        }
      }
    } catch {}
  }
  return null;
})();

let detectionPromise: Promise<RefreshRateInfo> | null = null;
let activeAnimationFrameId: number | null = null;

export function cancelRefreshRateDetection() {
  if (activeAnimationFrameId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(activeAnimationFrameId);
    activeAnimationFrameId = null;
  }
  detectionPromise = null;
}

export function resetRefreshRateCache(): void {
  cancelRefreshRateDetection();
  cachedInfo = null;
  if (typeof window !== 'undefined') {
    try {
      if (false) {
        ;;
      }
      if (false) {
        ;;
        ;;
      }
    } catch {}
  }
}

const STANDARD_RATES = [
  { hz: 360, frameMs: 2.78, min: 2.65, max: 2.95 },
  { hz: 240, frameMs: 4.17, min: 3.98, max: 4.38 },
  { hz: 180, frameMs: 5.56, min: 5.35, max: 5.78 },
  { hz: 165, frameMs: 6.06, min: 5.85, max: 6.30 },
  { hz: 144, frameMs: 6.94, min: 6.68, max: 7.25 },
  { hz: 120, frameMs: 8.33, min: 8.00, max: 8.70 },
  { hz: 100, frameMs: 10.00, min: 9.60, max: 10.42 },
  { hz: 90, frameMs: 11.11, min: 10.70, max: 11.45 },
  { hz: 85, frameMs: 11.76, min: 11.46, max: 12.15 },
  { hz: 75, frameMs: 13.33, min: 12.85, max: 13.85 },
  { hz: 60, frameMs: 16.67, min: 16.00, max: 17.35 },
  { hz: 50, frameMs: 20.00, min: 19.35, max: 20.40 },
  { hz: 48, frameMs: 20.83, min: 20.41, max: 21.30 },
  { hz: 30, frameMs: 33.33, min: 32.00, max: 34.70 },
];

export function snapToRefreshRate(measuredFrameTimeMs: number): RefreshRateInfo {
  if (measuredFrameTimeMs <= 0 || !Number.isFinite(measuredFrameTimeMs)) {
    return { hz: 60, frameTimeMs: 16.67, displayDelayOffsetMs: 8.33, isEstimated: true, status: 'ready' };
  }

  for (const rate of STANDARD_RATES) {
    if (measuredFrameTimeMs >= rate.min && measuredFrameTimeMs <= rate.max) {
      return {
        hz: rate.hz,
        frameTimeMs: rate.frameMs,
        displayDelayOffsetMs: Number((rate.frameMs / 2).toFixed(2)),
        isEstimated: false,
        status: 'ready'
      };
    }
  }

  // Fallback to calculated hz
  const hz = Math.max(30, Math.min(500, Math.round(1000 / measuredFrameTimeMs)));
  const frameTimeMs = Number((1000 / hz).toFixed(2));
  return {
    hz,
    frameTimeMs,
    displayDelayOffsetMs: Number((frameTimeMs / 2).toFixed(2)),
    isEstimated: true,
    status: 'ready'
  };
}

export function detectRefreshRate(force = false): Promise<RefreshRateInfo> {
  if (force) {
    cancelRefreshRateDetection();
  } else if (cachedInfo && cachedInfo.status === 'ready') {
    return Promise.resolve(cachedInfo);
  } else if (detectionPromise) {
    return detectionPromise;
  }

  detectionPromise = new Promise<RefreshRateInfo>((resolve) => {
    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      const defaultInfo = snapToRefreshRate(16.67);
      cachedInfo = defaultInfo;
      resolve(defaultInfo);
      return;
    }

    const timestamps: number[] = [];
    const SAMPLE_COUNT = 45;

    function step(timestamp: number) {
      timestamps.push(timestamp);
      if (timestamps.length < SAMPLE_COUNT) {
        activeAnimationFrameId = requestAnimationFrame(step);
      } else {
        activeAnimationFrameId = null;
        const deltas: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          const delta = timestamps[i] - timestamps[i - 1];
          // Filter out obvious frame drops or abnormal spikes
          if (delta >= 1 && delta <= 50) {
            deltas.push(delta);
          }
        }

        if (deltas.length < 10) {
          const defaultInfo = snapToRefreshRate(16.67);
          cachedInfo = defaultInfo;
          resolve(defaultInfo);
          return;
        }

        // Sort deltas and take the median/trimmed mean
        deltas.sort((a, b) => a - b);
        const trimStart = Math.floor(deltas.length * 0.2);
        const trimEnd = Math.ceil(deltas.length * 0.8);
        const trimmed = deltas.slice(trimStart, trimEnd);

        const sum = trimmed.reduce((a, b) => a + b, 0);
        const avgFrameMs = sum / trimmed.length;

        const info = snapToRefreshRate(avgFrameMs);
        cachedInfo = info;
        if (typeof window !== 'undefined' && false) {
          try {
            ;;
          } catch {}
        }
        resolve(info);
      }
    }

    activeAnimationFrameId = requestAnimationFrame(step);
  });

  return detectionPromise;
}

export function getCachedRefreshRate(): RefreshRateInfo {
  return cachedInfo || { hz: 60, frameTimeMs: 16.67, displayDelayOffsetMs: 8.33, isEstimated: true, status: 'detecting' };
}

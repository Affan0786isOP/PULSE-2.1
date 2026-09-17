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
  hz: number;                  // Nominal display refresh rate (e.g., 60, 75, 120, 144, 240, 360)
  frameTimeMs: number;         // Nominal frame interval in ms (e.g., 16.67, 8.33, 6.94)
  displayDelayOffsetMs: number; // Estimated frame midpoint offset in ms (frameTimeMs / 2)
  isEstimated: boolean;
  source: 'measured' | 'estimated' | 'fallback';
  status: 'detecting' | 'ready' | 'error';
  error?: string;
}

const CACHE_KEY = 'pulse_refresh_rate_cached';
const REFRESH_EVENT = 'pulse_refresh_rate_changed';

let cachedInfo: RefreshRateInfo | null = (() => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.hz === 'number' && parsed.status === 'ready') {
          return parsed as RefreshRateInfo;
        }
      }
    } catch {}
  }
  return null;
})();

interface ActiveDetectionOperation {
  generation: number;
  resolve: (info: RefreshRateInfo) => void;
  settled: boolean;
}

let activeOperation: ActiveDetectionOperation | null = null;
let currentGeneration = 0;
let detectionPromise: Promise<RefreshRateInfo> | null = null;
let activeAnimationFrameId: number | null = null;
let detectionTimeoutId: ReturnType<typeof setTimeout> | null = null;

function broadcastRefreshRate(info: RefreshRateInfo): void {
  cachedInfo = info;
  if (typeof window !== 'undefined') {
    if (info.status === 'ready' && info.source !== 'fallback') {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(info));
      } catch {}
    } else if (info.source === 'fallback' || info.status !== 'ready') {
      try {
        localStorage.removeItem(CACHE_KEY);
      } catch {}
    }
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: info }));
  }
}

function settleActiveOperation(generation: number, result: RefreshRateInfo): boolean {
  if (!activeOperation || activeOperation.generation !== generation || activeOperation.settled) {
    return false;
  }
  activeOperation.settled = true;
  const resolve = activeOperation.resolve;
  activeOperation = null;
  detectionPromise = null;

  if (activeAnimationFrameId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(activeAnimationFrameId);
    activeAnimationFrameId = null;
  }
  if (detectionTimeoutId !== null) {
    clearTimeout(detectionTimeoutId);
    detectionTimeoutId = null;
  }

  resolve(result);
  return true;
}

export function cancelRefreshRateDetection(): void {
  const currentOp = activeOperation;
  const genToCancel = currentOp ? currentOp.generation : currentGeneration;
  currentGeneration++;

  if (activeAnimationFrameId !== null && typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(activeAnimationFrameId);
    activeAnimationFrameId = null;
  }
  if (detectionTimeoutId !== null) {
    clearTimeout(detectionTimeoutId);
    detectionTimeoutId = null;
  }

  if (currentOp && !currentOp.settled) {
    const fallback = cachedInfo || {
      hz: 60,
      frameTimeMs: 16.67,
      displayDelayOffsetMs: 8.33,
      isEstimated: true,
      source: 'fallback' as const,
      status: 'error' as const,
      error: 'Calibration cancelled'
    };
    settleActiveOperation(genToCancel, fallback);
  } else {
    activeOperation = null;
    detectionPromise = null;
  }
}

export function resetRefreshRateCache(): Promise<RefreshRateInfo> {
  cancelRefreshRateDetection();
  cachedInfo = null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
  }
  const resetInfo: RefreshRateInfo = {
    hz: 60,
    frameTimeMs: 16.67,
    displayDelayOffsetMs: 8.33,
    isEstimated: true,
    source: 'fallback',
    status: 'detecting'
  };
  broadcastRefreshRate(resetInfo);
  return detectRefreshRate(true);
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

export function snapToRefreshRate(
  measuredFrameTimeMs: number,
  forcedSource?: 'measured' | 'estimated' | 'fallback'
): RefreshRateInfo {
  if (measuredFrameTimeMs <= 0 || !Number.isFinite(measuredFrameTimeMs)) {
    return {
      hz: 60,
      frameTimeMs: 16.67,
      displayDelayOffsetMs: 8.33,
      isEstimated: true,
      source: 'fallback',
      status: 'ready'
    };
  }

  for (const rate of STANDARD_RATES) {
    if (measuredFrameTimeMs >= rate.min && measuredFrameTimeMs <= rate.max) {
      return {
        hz: rate.hz,
        frameTimeMs: rate.frameMs,
        displayDelayOffsetMs: Number((rate.frameMs / 2).toFixed(2)),
        isEstimated: false,
        source: forcedSource || 'measured',
        status: 'ready'
      };
    }
  }

  // Calculated non-standard rate
  const hz = Math.max(30, Math.min(500, Math.round(1000 / measuredFrameTimeMs)));
  const frameTimeMs = Number((1000 / hz).toFixed(2));
  return {
    hz,
    frameTimeMs,
    displayDelayOffsetMs: Number((frameTimeMs / 2).toFixed(2)),
    isEstimated: true,
    source: forcedSource || 'estimated',
    status: 'ready'
  };
}

export function detectRefreshRate(force = false): Promise<RefreshRateInfo> {
  if (force) {
    cancelRefreshRateDetection();
  } else if (cachedInfo && cachedInfo.status === 'ready' && cachedInfo.source !== 'fallback') {
    return Promise.resolve(cachedInfo);
  } else if (detectionPromise) {
    return detectionPromise;
  }

  const generation = ++currentGeneration;

  detectionPromise = new Promise<RefreshRateInfo>((resolve) => {
    activeOperation = {
      generation,
      resolve,
      settled: false
    };

    if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') {
      const fallback = snapToRefreshRate(16.67, 'fallback');
      broadcastRefreshRate(fallback);
      settleActiveOperation(generation, fallback);
      return;
    }

    const timestamps: number[] = [];
    const SAMPLE_COUNT = 45;

    // Safety timeout: if samples aren't received in 3000ms (e.g. background tab or throttled RAF), fallback safely
    detectionTimeoutId = setTimeout(() => {
      if (!activeOperation || activeOperation.generation !== generation || activeOperation.settled) {
        return;
      }

      const fallbackInfo: RefreshRateInfo = {
        hz: 60,
        frameTimeMs: 16.67,
        displayDelayOffsetMs: 8.33,
        isEstimated: true,
        source: 'fallback',
        status: 'error',
        error: 'Calibration timed out'
      };
      broadcastRefreshRate(fallbackInfo);
      settleActiveOperation(generation, fallbackInfo);
    }, 3000);

    function step(timestamp: number) {
      if (!activeOperation || activeOperation.generation !== generation || activeOperation.settled) {
        return;
      }

      timestamps.push(timestamp);
      if (timestamps.length < SAMPLE_COUNT) {
        activeAnimationFrameId = requestAnimationFrame(step);
      } else {
        const deltas: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          const delta = timestamps[i] - timestamps[i - 1];
          if (delta >= 1 && delta <= 50) {
            deltas.push(delta);
          }
        }

        if (deltas.length < 10) {
          const fallbackInfo: RefreshRateInfo = {
            hz: 60,
            frameTimeMs: 16.67,
            displayDelayOffsetMs: 8.33,
            isEstimated: true,
            source: 'fallback',
            status: 'error',
            error: 'Insufficient display frame samples'
          };
          broadcastRefreshRate(fallbackInfo);
          settleActiveOperation(generation, fallbackInfo);
          return;
        }

        deltas.sort((a, b) => a - b);
        const trimStart = Math.floor(deltas.length * 0.2);
        const trimEnd = Math.ceil(deltas.length * 0.8);
        const trimmed = deltas.slice(trimStart, trimEnd);

        const sum = trimmed.reduce((a, b) => a + b, 0);
        const avgFrameMs = sum / trimmed.length;

        const info = snapToRefreshRate(avgFrameMs);
        broadcastRefreshRate(info);
        settleActiveOperation(generation, info);
      }
    }

    activeAnimationFrameId = requestAnimationFrame(step);
  });

  return detectionPromise;
}

export function getCachedRefreshRate(): RefreshRateInfo {
  return (
    cachedInfo || {
      hz: 60,
      frameTimeMs: 16.67,
      displayDelayOffsetMs: 8.33,
      isEstimated: true,
      source: 'fallback',
      status: 'detecting'
    }
  );
}

// Invalidate calibration if display characteristics materially change
if (typeof window !== 'undefined') {
  const handleDisplayChange = () => {
    if (cachedInfo && cachedInfo.status === 'ready') {
      // Recompute refresh rate for new display
      detectRefreshRate(true).catch(() => {});
    }
  };

  if (window.screen?.orientation) {
    window.screen.orientation.addEventListener('change', handleDisplayChange);
  }
}

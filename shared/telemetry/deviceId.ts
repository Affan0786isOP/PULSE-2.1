/**
 * Pure client utility for pseudonymous browser-profile identification.
 * Invariant: Never used as an authentication credential, anti-abuse token,
 * or proof of personal identity. Optional when telemetry is disabled or storage is blocked.
 */

const STORAGE_KEY = 'pulse_device_id';
const OPT_OUT_KEY = 'pulse_telemetry_opt_out';
const DEVICE_ID_REGEX = /^dev_[a-zA-Z0-9_-]{10,50}$/;

export function isTelemetryOptedOut(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    return window.localStorage.getItem(OPT_OUT_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setTelemetryOptOut(optedOut: boolean): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (optedOut) {
      window.localStorage.setItem(OPT_OUT_KEY, 'true');
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // Gracefully handle storage errors
  }
}

export function getOrCreateDeviceId(): string | undefined {
  if (isTelemetryOptedOut()) return undefined;

  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;

    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing && typeof existing === 'string' && DEVICE_ID_REGEX.test(existing) && existing.length <= 64) {
      return existing;
    }

    // Generate a fresh pseudonymous ID using crypto.randomUUID
    let uuid: string;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      uuid = crypto.randomUUID();
    } else {
      // Fallback pseudo-random generation if crypto.randomUUID is unavailable
      uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    const newId = `dev_${uuid.replace(/-/g, '')}`;
    window.localStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch {
    // In private browsing or storage disabled mode, return undefined without crashing
    return undefined;
  }
}

export function isValidDeviceId(id: unknown): id is string {
  return typeof id === 'string' && id.length <= 64 && DEVICE_ID_REGEX.test(id);
}

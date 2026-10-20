import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getOrCreateDeviceId, isTelemetryOptedOut, setTelemetryOptOut, isValidDeviceId } from '../../shared/telemetry/deviceId';
import { isTrackedPageRoute, isActivitySurface } from '../../shared/types/telemetry';

describe('Shared Telemetry Contracts and Device ID', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Route and Surface Validators', () => {
    it('accepts only the 4 allowlisted routes', () => {
      expect(isTrackedPageRoute('/')).toBe(true);
      expect(isTrackedPageRoute('/about')).toBe(true);
      expect(isTrackedPageRoute('/assessments')).toBe(true);
      expect(isTrackedPageRoute('/leaderboard')).toBe(true);

      expect(isTrackedPageRoute('/reaction-test')).toBe(false);
      expect(isTrackedPageRoute('/admin')).toBe(false);
      expect(isTrackedPageRoute('/about?query=1')).toBe(false);
      expect(isTrackedPageRoute('/about#frag')).toBe(false);
      expect(isTrackedPageRoute('')).toBe(false);
      expect(isTrackedPageRoute(null)).toBe(false);
    });

    it('accepts only desktop and mobile surfaces', () => {
      expect(isActivitySurface('desktop')).toBe(true);
      expect(isActivitySurface('mobile')).toBe(true);
      expect(isActivitySurface('tablet')).toBe(false);
      expect(isActivitySurface('')).toBe(false);
    });
  });

  describe('Device ID Utility', () => {
    it('generates a new dev_ prefixed deviceId when none exists', () => {
      const id = getOrCreateDeviceId();
      expect(id).toBeDefined();
      expect(id).toMatch(/^dev_[a-zA-Z0-9_-]{10,50}$/);
      expect(isValidDeviceId(id)).toBe(true);
    });

    it('reuses the existing deviceId across multiple calls', () => {
      const id1 = getOrCreateDeviceId();
      const id2 = getOrCreateDeviceId();
      expect(id1).toBe(id2);
    });

    it('respects telemetry opt-out and removes stored id', () => {
      const id1 = getOrCreateDeviceId();
      expect(id1).toBeDefined();

      setTelemetryOptOut(true);
      expect(isTelemetryOptedOut()).toBe(true);
      expect(localStorage.getItem('pulse_device_id')).toBeNull();
      expect(getOrCreateDeviceId()).toBeUndefined();

      setTelemetryOptOut(false);
      expect(isTelemetryOptedOut()).toBe(false);
      const id2 = getOrCreateDeviceId();
      expect(id2).toBeDefined();
    });

    it('gracefully handles localStorage exceptions without throwing', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage access denied');
      });

      expect(getOrCreateDeviceId()).toBeUndefined();
    });
  });
});

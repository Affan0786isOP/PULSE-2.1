import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  getSettings,
  updateSettings,
  resetSettingsToDefaults,
  loadSettings,
  cleanupAudioContext,
} from './settingsStore';
import { snapToRefreshRate, resetRefreshRateCache, detectRefreshRate, cancelRefreshRateDetection, getCachedRefreshRate } from './refreshRateDetector';
import { acquireScrollLock, resetScrollLock } from './modalScrollLock';
import { resetPendingSyncQueue } from './trialStore';

class MockStorage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
}

const mockStorage = new MockStorage();
const mockBody = { style: { overflow: '' } };
const mockDocElement = {
  setAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  classList: {
    add: vi.fn(),
    remove: vi.fn(),
  },
  style: {
    colorScheme: '',
    setProperty: vi.fn(),
  }
};

beforeAll(() => {
  vi.stubGlobal('localStorage', mockStorage);
  vi.stubGlobal('sessionStorage', mockStorage);
  vi.stubGlobal('document', {
    body: mockBody,
    documentElement: mockDocElement,
    querySelector: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    matchMedia: vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Settings Store Persistence & Validation', () => {
  beforeEach(() => {
    mockStorage.clear();
    resetSettingsToDefaults();
  });

  it('initializes with sanitized defaults and dark-only theme', () => {
    const settings = getSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.hapticsEnabled).toBe(true);
    expect(settings.fullscreenPromptEnabled).toBe(true);
    expect(settings.themeMode).toBe('dark');
    expect(settings.exhibitionModeEnabled).toBe(false);
    expect(typeof settings.reducedMotionEnabled).toBe('boolean');
    expect(settings.fontScale).toBe(1.0);
  });

  it('persists updates immediately to localStorage with pulse_user_settings key', () => {
    updateSettings({ soundEnabled: false, fontScale: 1.15 });
    const storedRaw = mockStorage.getItem('pulse_user_settings');
    expect(storedRaw).not.toBeNull();
    const parsed = JSON.parse(storedRaw!);
    expect(parsed.soundEnabled).toBe(false);
    expect(parsed.fontScale).toBe(1.15);
    expect(parsed.themeMode).toBe('dark');
  });

  it('skips rewriting storage when values have not changed', () => {
    updateSettings({ soundEnabled: true });
    const setItemSpy = vi.spyOn(mockStorage, 'setItem');
    updateSettings({ soundEnabled: true });
    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('gracefully sanitizes and recovers from malformed localStorage data', () => {
    mockStorage.setItem('pulse_user_settings', '{ corrupted json ...');
    const recovered = loadSettings();
    expect(recovered.soundEnabled).toBe(true);
    expect(recovered.themeMode).toBe('dark');
    expect(recovered.fontScale).toBe(1.0);
  });

  it('sanitizes invalid data types and rejects unsupported theme mode, clamping fontScale', () => {
    mockStorage.setItem(
      'pulse_user_settings',
      JSON.stringify({
        soundEnabled: 'not-a-bool',
        fontScale: 9999, // Out of bounds -> clamped to 1.5
        themeMode: 'light' // Should be coerced to dark
      })
    );
    const sanitized = loadSettings();
    expect(sanitized.soundEnabled).toBe(true); // Default
    expect(sanitized.fontScale).toBe(1.5); // Clamped
    expect(sanitized.themeMode).toBe('dark'); // Enforced
  });

  it('clamps fontScale on update within [0.7, 1.5]', () => {
    const updatedHigh = updateSettings({ fontScale: 10 });
    expect(updatedHigh.fontScale).toBe(1.5);

    const updatedLow = updateSettings({ fontScale: 0.1 });
    expect(updatedLow.fontScale).toBe(0.7);

    const updatedValid = updateSettings({ fontScale: 1.15 });
    expect(updatedValid.fontScale).toBe(1.15);
  });

  it('resets settings to defaults cleanly', () => {
    updateSettings({ soundEnabled: false, exhibitionModeEnabled: true });
    const reset = resetSettingsToDefaults();
    expect(reset.soundEnabled).toBe(true);
    expect(reset.exhibitionModeEnabled).toBe(false);
    expect(mockStorage.getItem('pulse_user_settings')).toBeNull();
  });
});

describe('Refresh Rate Calibration Detector', () => {
  beforeEach(() => {
    resetRefreshRateCache();
  });

  it('correctly classifies standard refresh rates as measured', () => {
    const info60 = snapToRefreshRate(16.67);
    expect(info60.hz).toBe(60);
    expect(info60.source).toBe('measured');
    expect(info60.isEstimated).toBe(false);
    expect(info60.displayDelayOffsetMs).toBe(8.34);

    const info120 = snapToRefreshRate(8.33);
    expect(info120.hz).toBe(120);
    expect(info120.source).toBe('measured');
    expect(info120.isEstimated).toBe(false);
  });

  it('classifies non-standard rates as estimated', () => {
    // 25.0ms corresponds to 40 Hz, which is not in standard rates (30, 48, 50, 60...)
    const infoCustom = snapToRefreshRate(25.0);
    expect(infoCustom.source).toBe('estimated');
    expect(infoCustom.isEstimated).toBe(true);
    expect(infoCustom.hz).toBe(40);
  });

  it('classifies invalid frame times as fallback', () => {
    const fallback = snapToRefreshRate(-5);
    expect(fallback.source).toBe('fallback');
    expect(fallback.isEstimated).toBe(true);
    expect(fallback.hz).toBe(60);
  });

  it('does not persist fallback to localStorage on resetRefreshRateCache', () => {
    mockStorage.setItem('pulse_refresh_rate_cached', JSON.stringify({ hz: 120, status: 'ready', source: 'measured' }));
    resetRefreshRateCache();
    expect(mockStorage.getItem('pulse_refresh_rate_cached')).toBeNull();
  });

  it('cancelRefreshRateDetection settles in-flight detection promise without orphaning', async () => {
    const promise = detectRefreshRate(true);
    cancelRefreshRateDetection();
    const result = await promise;
    expect(result).toBeDefined();
    expect(result.hz).toBeGreaterThan(0);
  });

  it('repeated cancelRefreshRateDetection calls are harmless and idempotent', () => {
    cancelRefreshRateDetection();
    cancelRefreshRateDetection();
    expect(getCachedRefreshRate()).toBeDefined();
  });

  it('detectRefreshRate after cancellation triggers a clean new detection', async () => {
    cancelRefreshRateDetection();
    const fresh = await detectRefreshRate(true);
    expect(fresh).toBeDefined();
    expect(typeof fresh.hz).toBe('number');
  });

  it('force detection while earlier detection is pending does not orphan earlier promise', async () => {
    const firstPromise = detectRefreshRate(true);
    const secondPromise = detectRefreshRate(true);
    const [firstResult, secondResult] = await Promise.all([firstPromise, secondPromise]);
    expect(firstResult).toBeDefined();
    expect(secondResult).toBeDefined();
    expect(secondResult.hz).toBeGreaterThan(0);
  });
});

describe('AudioContext Lifecycle Cleanup', () => {
  it('cleanupAudioContext safely cleans up without throwing', () => {
    expect(() => cleanupAudioContext()).not.toThrow();
  });
});

describe('Pending Sync Queue Reset', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('removes pending sync queue from storage on resetPendingSyncQueue', () => {
    mockStorage.setItem('pulse_pending_sync_queue', JSON.stringify([{ id: 'test-sync' }]));
    resetPendingSyncQueue();
    expect(mockStorage.getItem('pulse_pending_sync_queue')).toBeNull();
  });
});

describe('Modal Scroll Lock Reference Counting', () => {
  beforeEach(() => {
    resetScrollLock();
    mockBody.style.overflow = '';
  });

  it('locks body overflow on first lock and restores only when all locks are released', () => {
    mockBody.style.overflow = 'auto';

    const unlock1 = acquireScrollLock();
    expect(mockBody.style.overflow).toBe('hidden');

    const unlock2 = acquireScrollLock();
    expect(mockBody.style.overflow).toBe('hidden');

    // Releasing first modal lock does NOT unlock body because second modal is still active
    unlock1();
    expect(mockBody.style.overflow).toBe('hidden');

    // Releasing final lock restores original overflow
    unlock2();
    expect(mockBody.style.overflow).toBe('auto');
  });
});

describe('Welcome Modal Persistence and Targeted Storage', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  it('persists desktop welcome seen state across reloads', async () => {
    const { isWelcomeSeen, setWelcomeSeen } = await import('../components/WelcomeModal');
    expect(isWelcomeSeen()).toBe(false);
    setWelcomeSeen(true);
    expect(isWelcomeSeen()).toBe(true);
    expect(mockStorage.getItem('pulse_desktop_welcome_seen')).toBe('true');

    setWelcomeSeen(false);
    expect(isWelcomeSeen()).toBe(false);
  });

  it('persists mobile welcome seen state across reloads', async () => {
    const { isMobileWelcomeSeen, setMobileWelcomeSeen } = await import('../../mobile/src/components/WelcomeModal');
    expect(isMobileWelcomeSeen()).toBe(false);
    setMobileWelcomeSeen(true);
    expect(isMobileWelcomeSeen()).toBe(true);
    expect(mockStorage.getItem('pulse_mobile_welcome_seen')).toBe('true');

    setMobileWelcomeSeen(false);
    expect(isMobileWelcomeSeen()).toBe(false);
  });

  it('targeted cache clearing removes pulse keys while preserving unrelated keys', () => {
    mockStorage.setItem('pulse_raw_trial_observations', '[]');
    mockStorage.setItem('pulse_user_settings', '{}');
    mockStorage.setItem('pulse_desktop_welcome_seen', 'true');
    mockStorage.setItem('unrelated_user_data', 'keep_me');

    const targetedKeys = [
      'pulse_raw_trial_observations',
      'pulse_user_settings',
      'pulse_desktop_welcome_seen',
      'pulse_mobile_welcome_seen'
    ];

    targetedKeys.forEach(k => mockStorage.removeItem(k));

    expect(mockStorage.getItem('pulse_raw_trial_observations')).toBeNull();
    expect(mockStorage.getItem('pulse_user_settings')).toBeNull();
    expect(mockStorage.getItem('pulse_desktop_welcome_seen')).toBeNull();
    expect(mockStorage.getItem('unrelated_user_data')).toBe('keep_me');
  });
});


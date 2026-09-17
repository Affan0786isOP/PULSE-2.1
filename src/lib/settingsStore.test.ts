import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  getSettings,
  updateSettings,
  resetSettingsToDefaults,
  loadSettings,
} from './settingsStore';
import { snapToRefreshRate, resetRefreshRateCache } from './refreshRateDetector';
import { acquireScrollLock, resetScrollLock } from './modalScrollLock';

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

  it('sanitizes invalid data types and rejects unsupported theme mode', () => {
    mockStorage.setItem(
      'pulse_user_settings',
      JSON.stringify({
        soundEnabled: 'not-a-bool',
        fontScale: 9999, // Out of bounds
        themeMode: 'light' // Should be coerced to dark
      })
    );
    const sanitized = loadSettings();
    expect(sanitized.soundEnabled).toBe(true); // Default
    expect(sanitized.fontScale).toBe(1.0); // Default
    expect(sanitized.themeMode).toBe('dark'); // Enforced
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

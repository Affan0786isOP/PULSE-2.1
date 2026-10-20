import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getSettings,
  loadSettings,
  updateSettings,
  resetSettingsToDefaults,
  readSettingsCookie,
  writeSettingsCookie,
  clearSettingsCookie,
  hasExplicitStoredReducedMotionPreference,
  UserSettings,
} from '../../src/lib/settingsStore';

describe('Settings Dual Persistence (localStorage + Cookie)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSettingsCookie();
    resetSettingsToDefaults();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes user preferences to both localStorage and document.cookie', () => {
    updateSettings({
      themeMode: 'dark',
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotionEnabled: true,
      fontScale: 1.2,
      exhibitionModeEnabled: true,
    });

    // Check localStorage
    const stored = localStorage.getItem('pulse_user_settings');
    expect(stored).toBeTruthy();
    const parsedStored = JSON.parse(stored!);
    expect(parsedStored.themeMode).toBe('dark');
    expect(parsedStored.soundEnabled).toBe(false);
    expect(parsedStored.hapticsEnabled).toBe(false);
    expect(parsedStored.reducedMotionEnabled).toBe(true);
    expect(parsedStored.fontScale).toBe(1.2);
    expect(parsedStored.exhibitionModeEnabled).toBe(true);

    // Check cookie
    const cookieData = readSettingsCookie() as UserSettings;
    expect(cookieData).toBeTruthy();
    expect(cookieData.themeMode).toBe('dark');
    expect(cookieData.soundEnabled).toBe(false);
    expect(cookieData.hapticsEnabled).toBe(false);
    expect(cookieData.reducedMotionEnabled).toBe(true);
    expect(cookieData.fontScale).toBe(1.2);
    expect(cookieData.exhibitionModeEnabled).toBe(true);
  });

  it('recovers user preferences from cookie when localStorage is empty', () => {
    // Write directly to cookie
    writeSettingsCookie({
      themeMode: 'dark',
      soundEnabled: false,
      hapticsEnabled: true,
      reducedMotionEnabled: true,
      fontScale: 1.1,
      exhibitionModeEnabled: false,
    });
    localStorage.clear();

    const loaded = loadSettings();
    expect(loaded.themeMode).toBe('dark');
    expect(loaded.soundEnabled).toBe(false);
    expect(loaded.reducedMotionEnabled).toBe(true);
    expect(loaded.fontScale).toBe(1.1);

    // Should have re-synchronized to localStorage
    const synced = localStorage.getItem('pulse_user_settings');
    expect(synced).toBeTruthy();
    expect(JSON.parse(synced!).themeMode).toBe('dark');
  });

  it('recovers user preferences from cookie when localStorage throws an error', () => {
    writeSettingsCookie({
      themeMode: 'light',
      soundEnabled: true,
      hapticsEnabled: false,
      reducedMotionEnabled: false,
      fontScale: 1.3,
      exhibitionModeEnabled: true,
    });

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: The operation is insecure.');
    });

    const loaded = loadSettings();
    expect(loaded.themeMode).toBe('light');
    expect(loaded.fontScale).toBe(1.3);
    expect(loaded.exhibitionModeEnabled).toBe(true);
  });

  it('recovers user preferences from localStorage and repairs missing cookie', () => {
    localStorage.setItem(
      'pulse_user_settings',
      JSON.stringify({
        themeMode: 'dark',
        soundEnabled: false,
        hapticsEnabled: false,
        reducedMotionEnabled: true,
        fontScale: 0.9,
        exhibitionModeEnabled: false,
      })
    );
    clearSettingsCookie();

    const loaded = loadSettings();
    expect(loaded.themeMode).toBe('dark');
    expect(loaded.fontScale).toBe(0.9);

    // Cookie should be repaired
    const cookieData = readSettingsCookie() as UserSettings;
    expect(cookieData).toBeTruthy();
    expect(cookieData.themeMode).toBe('dark');
    expect(cookieData.fontScale).toBe(0.9);
  });

  it('clears both localStorage and document.cookie upon resetSettingsToDefaults', () => {
    updateSettings({ themeMode: 'dark', fontScale: 1.4 });
    expect(localStorage.getItem('pulse_user_settings')).toBeTruthy();
    expect(readSettingsCookie()).toBeTruthy();

    resetSettingsToDefaults();

    expect(localStorage.getItem('pulse_user_settings')).toBeNull();
    expect(readSettingsCookie()).toBeNull();
    expect(getSettings().themeMode).toBe('system');
  });

  it('detects explicit reduced motion preference from either storage mechanism', () => {
    // 1. Neither
    expect(hasExplicitStoredReducedMotionPreference()).toBe(false);

    // 2. Only localStorage
    localStorage.setItem('pulse_user_settings', JSON.stringify({ reducedMotionEnabled: true }));
    expect(hasExplicitStoredReducedMotionPreference()).toBe(true);

    // 3. Only cookie
    localStorage.clear();
    writeSettingsCookie({
      themeMode: 'system',
      soundEnabled: true,
      hapticsEnabled: true,
      reducedMotionEnabled: false,
      fontScale: 1.0,
      exhibitionModeEnabled: false,
    });
    expect(hasExplicitStoredReducedMotionPreference()).toBe(true);
  });
});

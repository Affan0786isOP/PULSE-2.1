import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark';

export interface UserSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  fullscreenPromptEnabled: boolean;
  themeMode: ThemeMode;
  exhibitionModeEnabled: boolean;
  reducedMotionEnabled: boolean;
  fontScale: number;
}

const SETTINGS_STORAGE_KEY = 'pulse_user_settings';

export function getDefaultReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  fullscreenPromptEnabled: true,
  themeMode: 'dark',
  exhibitionModeEnabled: false,
  reducedMotionEnabled: getDefaultReducedMotion(),
  fontScale: 1.0,
};

let cachedSettings: UserSettings | null = null;

function sanitizeSettings(raw: unknown): UserSettings {
  const result: UserSettings = {
    ...DEFAULT_SETTINGS,
    reducedMotionEnabled: getDefaultReducedMotion()
  };

  if (!raw || typeof raw !== 'object') {
    return result;
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.soundEnabled === 'boolean') {
    result.soundEnabled = obj.soundEnabled;
  }
  if (typeof obj.hapticsEnabled === 'boolean') {
    result.hapticsEnabled = obj.hapticsEnabled;
  }
  if (typeof obj.fullscreenPromptEnabled === 'boolean') {
    result.fullscreenPromptEnabled = obj.fullscreenPromptEnabled;
  }
  // Dark-only architecture: themeMode is always 'dark'
  result.themeMode = 'dark';

  if (typeof obj.exhibitionModeEnabled === 'boolean') {
    result.exhibitionModeEnabled = obj.exhibitionModeEnabled;
  }
  if (typeof obj.reducedMotionEnabled === 'boolean') {
    result.reducedMotionEnabled = obj.reducedMotionEnabled;
  }
  if (typeof obj.fontScale === 'number' && Number.isFinite(obj.fontScale) && obj.fontScale >= 0.7 && obj.fontScale <= 1.5) {
    result.fontScale = obj.fontScale;
  }

  return result;
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const serialized = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (serialized) {
      const parsed = JSON.parse(serialized);
      return sanitizeSettings(parsed);
    }
  } catch {
    // Malformed localStorage gracefully falls back to sanitized defaults
  }

  return { ...DEFAULT_SETTINGS, reducedMotionEnabled: getDefaultReducedMotion() };
}

export function getSettings(): UserSettings {
  if (!cachedSettings) {
    cachedSettings = loadSettings();
  }
  return { ...cachedSettings, themeMode: 'dark' };
}

export function isReducedMotionActive(): boolean {
  return getSettings().reducedMotionEnabled;
}

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator && typeof navigator.vibrate === 'function';
}

export function applyDOMSettings(settings: UserSettings = getSettings()) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Truthful Theme: ALWAYS Dark Mode
  document.documentElement.setAttribute('data-theme', 'dark');
  document.documentElement.style.colorScheme = 'dark';
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', '#030508');
  }

  // 2. Authoritative Reduced Motion
  if (settings.reducedMotionEnabled) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    document.documentElement.classList.add('reduced-motion');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
    document.documentElement.classList.remove('reduced-motion');
  }

  // 3. Exhibition Mode
  if (settings.exhibitionModeEnabled) {
    document.documentElement.setAttribute('data-exhibition-mode', 'true');
    document.documentElement.classList.add('exhibition-mode');
  } else {
    document.documentElement.removeAttribute('data-exhibition-mode');
    document.documentElement.classList.remove('exhibition-mode');
  }

  // 4. Font Scale
  const scale = settings.fontScale ?? 1.0;
  const fontSizePercent = `${Math.round(scale * 100)}%`;
  document.documentElement.style.setProperty('--font-size', fontSizePercent);
  document.documentElement.style.setProperty('--font-scale', `${scale}`);
  document.documentElement.setAttribute('data-font-scale', `${scale}`);
}

export function updateSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getSettings();
  const next: UserSettings = {
    soundEnabled: partial.soundEnabled !== undefined ? partial.soundEnabled : current.soundEnabled,
    hapticsEnabled: partial.hapticsEnabled !== undefined ? partial.hapticsEnabled : current.hapticsEnabled,
    fullscreenPromptEnabled: partial.fullscreenPromptEnabled !== undefined ? partial.fullscreenPromptEnabled : current.fullscreenPromptEnabled,
    themeMode: 'dark',
    exhibitionModeEnabled: partial.exhibitionModeEnabled !== undefined ? partial.exhibitionModeEnabled : current.exhibitionModeEnabled,
    reducedMotionEnabled: partial.reducedMotionEnabled !== undefined ? partial.reducedMotionEnabled : current.reducedMotionEnabled,
    fontScale: partial.fontScale !== undefined && Number.isFinite(partial.fontScale) ? partial.fontScale : current.fontScale,
  };

  // Skip rewrite if nothing changed
  if (
    current.soundEnabled === next.soundEnabled &&
    current.hapticsEnabled === next.hapticsEnabled &&
    current.fullscreenPromptEnabled === next.fullscreenPromptEnabled &&
    current.exhibitionModeEnabled === next.exhibitionModeEnabled &&
    current.reducedMotionEnabled === next.reducedMotionEnabled &&
    current.fontScale === next.fontScale
  ) {
    return current;
  }

  cachedSettings = next;
  applyDOMSettings(next);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore quota/private mode write issues
    }
    window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: next }));
  }

  return next;
}

export function resetSettingsToDefaults(): UserSettings {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } catch {}
  }
  cachedSettings = { ...DEFAULT_SETTINGS, reducedMotionEnabled: getDefaultReducedMotion() };
  applyDOMSettings(cachedSettings);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: cachedSettings }));
  }
  return cachedSettings;
}

// Immediately apply settings on initial import
if (typeof window !== 'undefined') {
  applyDOMSettings(getSettings());

  // Keep in-memory settings synchronized across browser tabs
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === SETTINGS_STORAGE_KEY) {
      const reloaded = loadSettings();
      cachedSettings = reloaded;
      applyDOMSettings(reloaded);
      window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: reloaded }));
    }
  });
}

export function useSettings(): [UserSettings, (partial: Partial<UserSettings>) => UserSettings] {
  const [settings, setSettingsState] = useState<UserSettings>(getSettings);

  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserSettings>;
      if (customEvent.detail) {
        setSettingsState(customEvent.detail);
      } else {
        setSettingsState(getSettings());
      }
    };

    window.addEventListener('pulse_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('pulse_settings_changed', handleSettingsChange);
    };
  }, []);

  const update = useCallback((partial: Partial<UserSettings>) => {
    const updated = updateSettings(partial);
    setSettingsState(updated);
    return updated;
  }, []);

  return [settings, update];
}

// Single shared Web Audio tone synthesizer for audio cues

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {
        // Safe catch for browser autoplay gesture restrictions
      });
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playAudioCue(type: 'click' | 'stimulus' | 'success' | 'error' | 'milestone') {
  const settings = getSettings();
  if (!settings.soundEnabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'milestone') {
      // Arpeggio chime sequence: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.type = 'sine';
        const startTime = now + idx * 0.07;
        noteOsc.frequency.setValueAtTime(freq, startTime);
        noteGain.gain.setValueAtTime(0.12, startTime);
        noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        noteOsc.start(startTime);
        noteOsc.stop(startTime + 0.25);
      });
      return;
    }

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'stimulus') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.06); // E5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(160, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    }
  } catch {
    // AudioContext autoplay restrictions or disabled in browser
  }
}

export type HapticPattern = 'tap' | 'stimulus' | 'success' | 'error' | 'milestone' | number | number[];

export function triggerHaptic(type: HapticPattern = 'tap') {
  const settings = getSettings();
  if (!settings.hapticsEnabled) return;
  if (!isHapticsSupported()) return;

  try {
    if (typeof type === 'number' || Array.isArray(type)) {
      navigator.vibrate(type);
    } else if (type === 'tap') {
      navigator.vibrate(15);
    } else if (type === 'stimulus') {
      navigator.vibrate([25, 30, 25]);
    } else if (type === 'success') {
      navigator.vibrate([15, 25, 35]);
    } else if (type === 'error') {
      navigator.vibrate([40, 30, 40, 30, 40]);
    } else if (type === 'milestone') {
      navigator.vibrate([20, 30, 40, 50, 60]);
    }
  } catch {
    // Silently ignore vibration restrictions
  }
}

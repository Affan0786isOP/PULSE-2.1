import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'dark' | 'light';

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

let cachedSettings: UserSettings | null = null;

const DEFAULT_SETTINGS: UserSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  fullscreenPromptEnabled: true,
  themeMode: 'dark',
  exhibitionModeEnabled: false,
  reducedMotionEnabled: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  fontScale: 1.0,
};

export function getSettings(): UserSettings {
  if (!cachedSettings) {
    cachedSettings = { ...DEFAULT_SETTINGS, themeMode: 'dark' };
  }
  return { ...cachedSettings, themeMode: 'dark' };
}

export function applyDOMSettings(settings: UserSettings = getSettings()) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // 1. Resolve & Apply Theme - ALWAYS Dark Mode, Light/System disabled
  const activeTheme = 'dark';

  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.style.colorScheme = activeTheme;
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', '#030508');
  }

  // 2. Apply Reduced Motion
  if (settings.reducedMotionEnabled) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
    document.documentElement.classList.add('reduced-motion');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
    document.documentElement.classList.remove('reduced-motion');
  }

  // 3. Apply Exhibition Mode
  if (settings.exhibitionModeEnabled) {
    document.documentElement.setAttribute('data-exhibition-mode', 'true');
    document.documentElement.classList.add('exhibition-mode');
  } else {
    document.documentElement.removeAttribute('data-exhibition-mode');
    document.documentElement.classList.remove('exhibition-mode');
  }

  // 4. Apply Font Scale & Root CSS Variable
  const scale = settings.fontScale ?? 1.0;
  const fontSizePercent = `${Math.round(scale * 100)}%`;
  document.documentElement.style.setProperty('--font-size', fontSizePercent);
  document.documentElement.style.setProperty('--font-scale', `${scale}`);
  document.documentElement.setAttribute('data-font-scale', `${scale}`);
}

export function updateSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getSettings();
  const updated: UserSettings = { ...current, ...partial, themeMode: 'dark' };
  cachedSettings = updated;
  applyDOMSettings(updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pulse_settings_changed', { detail: updated }));
    if (partial.themeMode !== undefined) {
      window.dispatchEvent(new CustomEvent('pulse_theme_changed', { detail: partial.themeMode }));
    }
  }
  return updated;
}

// Immediately apply default settings on import
if (typeof window !== 'undefined') {
  applyDOMSettings();
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

// Simple Web Audio tone synthesizer for audio cues

let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === 'suspended') { sharedAudioCtx.resume(); }
  return sharedAudioCtx;
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
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

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
    // Ignored
  }
}

import { useEffect, useState, useCallback } from 'react';
import { ThemeMode, getSettings, updateSettings, isReducedMotionActive, UserSettings } from './settingsStore';
import { isDarkApparatusRoute } from './routeTheme';

export function getSystemColorPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export interface EffectiveThemeState {
  themeMode: ThemeMode;
  systemTheme: 'light' | 'dark';
  activeTheme: 'light' | 'dark';
  isDarkApparatus: boolean;
}

export function resolveEffectiveTheme(
  pathname?: string | null,
  themeMode?: ThemeMode
): EffectiveThemeState {
  const path = pathname !== undefined && pathname !== null 
    ? pathname 
    : (typeof window !== 'undefined' ? window.location.pathname : '');
  const isDarkApparatus = isDarkApparatusRoute(path);
  const currentMode = themeMode ?? (typeof window !== 'undefined' ? getSettings().themeMode : 'system');
  const systemTheme = getSystemColorPreference();

  let activeTheme: 'light' | 'dark';
  if (isDarkApparatus) {
    activeTheme = 'dark';
  } else if (currentMode === 'system') {
    activeTheme = systemTheme;
  } else {
    activeTheme = currentMode;
  }

  return {
    themeMode: currentMode,
    systemTheme,
    activeTheme,
    isDarkApparatus,
  };
}

export function applyAppTheme(pathname?: string, mode?: ThemeMode): 'dark' | 'light' {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'light';

  const { activeTheme, isDarkApparatus } = resolveEffectiveTheme(pathname, mode);

  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.style.colorScheme = activeTheme;

  if (activeTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (document.body) {
      document.body.style.backgroundColor = isDarkApparatus ? '#12161B' : '#0B0D10';
    }
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
    if (document.body) {
      document.body.style.backgroundColor = '#FFFFFF';
    }
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', activeTheme === 'dark' ? (isDarkApparatus ? '#12161B' : '#0B0D10') : '#FFFFFF');
  }

  return activeTheme;
}

export async function applyThemeWithRadialTransition(
  targetMode: ThemeMode,
  clickOrigin?: { x: number; y: number }
): Promise<void> {
  const currentSettings = getSettings();
  if (currentSettings.themeMode === targetMode) {
    return;
  }

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const isApparatus = isDarkApparatusRoute(path);

  // If on protected apparatus, update the preference quietly without visual view transition
  if (isApparatus) {
    updateSettings({ themeMode: targetMode });
    applyAppTheme(path, targetMode);
    return;
  }

  const isReduced = isReducedMotionActive() || 
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const hasViewTransition = typeof document !== 'undefined' && 
    typeof (document as any).startViewTransition === 'function';

  if (isReduced || !hasViewTransition) {
    updateSettings({ themeMode: targetMode });
    applyAppTheme(path, targetMode);
    return;
  }

  // Calculate coordinates and ending radius for circular takeover
  const x = clickOrigin?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const y = clickOrigin?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);
  const w = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const h = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const endRadius = Math.hypot(
    Math.max(x, w - x),
    Math.max(y, h - y)
  );

  try {
    const transition = (document as any).startViewTransition(() => {
      updateSettings({ themeMode: targetMode });
      applyAppTheme(path, targetMode);
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration: 280,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        pseudoElement: '::view-transition-new(root)'
      }
    );
  } catch {
    // If startViewTransition fails or is aborted, fall back directly
    updateSettings({ themeMode: targetMode });
    applyAppTheme(path, targetMode);
  }
}

export function useSystemTheme(pathname?: string) {
  const [themeState, setThemeState] = useState<EffectiveThemeState>(() => resolveEffectiveTheme(pathname));

  const setThemeMode = useCallback((newMode: ThemeMode, origin?: { x: number; y: number }) => {
    applyThemeWithRadialTransition(newMode, origin);
  }, []);

  const toggleTheme = useCallback((origin?: { x: number; y: number }) => {
    const current = resolveEffectiveTheme(pathname);
    const nextMode: ThemeMode = current.activeTheme === 'dark' ? 'light' : 'dark';
    applyThemeWithRadialTransition(nextMode, origin);
  }, [pathname]);

  // Synchronize on pathname change
  useEffect(() => {
    const applied = applyAppTheme(pathname);
    setThemeState(resolveEffectiveTheme(pathname));
  }, [pathname]);

  // Synchronize with OS theme changes when themeMode is 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const current = getSettings().themeMode;
      if (current === 'system') {
        applyAppTheme(pathname, 'system');
        setThemeState(resolveEffectiveTheme(pathname, 'system'));
      }
    };

    mql.addEventListener('change', handleMediaChange);
    return () => {
      mql.removeEventListener('change', handleMediaChange);
    };
  }, [pathname]);

  // Synchronize with settings store changes (same tab or other tabs)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSettingsChange = (e: Event) => {
      const customEvent = e as CustomEvent<UserSettings>;
      const mode = customEvent.detail?.themeMode ?? getSettings().themeMode;
      applyAppTheme(pathname, mode);
      setThemeState(resolveEffectiveTheme(pathname, mode));
    };

    window.addEventListener('pulse_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('pulse_settings_changed', handleSettingsChange);
    };
  }, [pathname]);

  return {
    ...themeState,
    setThemeMode,
    toggleTheme,
  };
}

// Initial theme application on client bootstrap
if (typeof window !== 'undefined') {
  applyAppTheme();
}


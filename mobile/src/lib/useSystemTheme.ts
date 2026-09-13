import { useEffect, useState, useCallback } from 'react';
import { getSettings, updateSettings, ThemeMode } from './settingsStore';

export function applyAppTheme(mode: ThemeMode = getSettings().themeMode): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';

  const activeTheme = 'dark';

  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.style.colorScheme = activeTheme;
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', '#030508');
  }

  return activeTheme;
}

export function useSystemTheme() {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => getSettings().themeMode);
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    return applyAppTheme(getSettings().themeMode);
  });

  const updateActiveTheme = useCallback((overrideMode?: ThemeMode) => {
    const currentMode = overrideMode || getSettings().themeMode;
    setThemeModeState(currentMode);
    const resolved = applyAppTheme(currentMode);
    setActiveTheme(resolved);
  }, []);

  const changeThemeMode = useCallback((newMode: ThemeMode) => {
    updateSettings({ themeMode: newMode });
    updateActiveTheme(newMode);
  }, [updateActiveTheme]);

  useEffect(() => {
    // Initial sync
    updateActiveTheme();

    const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const handleMediaChange = () => {
      if (getSettings().themeMode === 'system') {
        updateActiveTheme('system');
      }
    };

    if (mediaQuery) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ThemeMode>;
      updateActiveTheme(customEvent.detail || getSettings().themeMode);
    };

    window.addEventListener('pulse_theme_changed', handleCustomEvent);

    return () => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
      window.removeEventListener('pulse_theme_changed', handleCustomEvent);
    };
  }, [updateActiveTheme]);

  return { activeTheme, themeMode, setThemeMode: changeThemeMode };
}

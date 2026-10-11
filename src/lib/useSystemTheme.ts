import { useEffect, useState, useCallback } from 'react';
import { ThemeMode } from './settingsStore';

export function applyAppTheme(_mode?: ThemeMode): 'light' {
  if (typeof window === 'undefined') return 'light';

  const activeTheme = 'light';
  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.style.colorScheme = activeTheme;
  document.documentElement.classList.add('light');
  document.documentElement.classList.remove('dark');

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', '#F4F9FF');
  }

  return activeTheme;
}

export function useSystemTheme() {
  const [activeTheme] = useState<'light'>('light');
  const [themeMode] = useState<ThemeMode>('light');

  const setThemeMode = useCallback((_newMode: ThemeMode) => {
    // PULSE uses the canonical light design across both application surfaces.
  }, []);

  useEffect(() => {
    applyAppTheme();
  }, []);

  return { activeTheme, themeMode, setThemeMode };
}

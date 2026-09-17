import { useEffect, useState, useCallback } from 'react';
import { ThemeMode } from './settingsStore';

export function applyAppTheme(_mode?: ThemeMode): 'dark' {
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
  const [activeTheme] = useState<'dark'>('dark');
  const [themeMode] = useState<ThemeMode>('dark');

  const setThemeMode = useCallback((_newMode: ThemeMode) => {
    // PULSE is dark-only for precise low-latency visual evaluation
  }, []);

  useEffect(() => {
    applyAppTheme();
  }, []);

  return { activeTheme, themeMode, setThemeMode };
}

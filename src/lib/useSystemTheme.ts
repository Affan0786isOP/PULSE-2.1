import { useEffect, useState, useCallback } from 'react';
import { ThemeMode } from './settingsStore';
import { isDarkApparatusRoute } from './routeTheme';

export function applyAppTheme(pathname?: string, _mode?: ThemeMode): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light';

  const path = pathname !== undefined ? pathname : window.location.pathname;
  const isDark = isDarkApparatusRoute(path);
  const activeTheme = isDark ? 'dark' : 'light';

  document.documentElement.setAttribute('data-theme', activeTheme);
  document.documentElement.style.colorScheme = activeTheme;

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    if (document.body) {
      document.body.style.backgroundColor = '#12161B';
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
    meta.setAttribute('content', isDark ? '#12161B' : '#FFFFFF');
  }

  return activeTheme;
}

export function useSystemTheme(pathname?: string) {
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('light');
  const [themeMode] = useState<ThemeMode>('dark');

  const setThemeMode = useCallback((_newMode: ThemeMode) => {
    // Mode is synchronized automatically with active route apparatus requirements
  }, []);

  useEffect(() => {
    const applied = applyAppTheme(pathname);
    setActiveTheme(applied);
  }, [pathname]);

  return { activeTheme, themeMode, setThemeMode };
}


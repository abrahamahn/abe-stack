import { useLocalStorage } from '@abe-stack/ui';
import { useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

interface UseDemoThemeResult {
  themeMode: ThemeMode;
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
}

export function useDemoTheme(): UseDemoThemeResult {
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>('demo-theme-mode', 'system');

  // Apply theme mode to document
  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');

    if (themeMode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (themeMode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }
    // 'system' = no attribute, CSS handles it via prefers-color-scheme
  }, [themeMode]);

  function cycleTheme(): void {
    setThemeMode((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }

  function getThemeIcon(): string {
    if (themeMode === 'light') return '☀️';
    if (themeMode === 'dark') return '🌙';
    return '💻';
  }

  function getThemeLabel(): string {
    if (themeMode === 'light') return 'Light';
    if (themeMode === 'dark') return 'Dark';
    return 'System';
  }

  return {
    themeMode,
    cycleTheme,
    getThemeIcon,
    getThemeLabel,
  };
}

// src/apps/web/src/features/ui-library/hooks/useUILibraryTheme.ts
import { useThemeMode } from '@abe-stack/react/hooks';

export type ThemeMode = 'system' | 'light' | 'dark';

interface UseUILibraryThemeResult {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  cycleTheme: () => void;
  getThemeIcon: () => string;
  getThemeLabel: () => string;
}

export function useUILibraryTheme(storageKey = 'demo-theme-mode'): UseUILibraryThemeResult {
  const { mode: themeMode, cycleMode, resolvedTheme } = useThemeMode(storageKey);

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
    resolvedTheme,
    cycleTheme: cycleMode,
    getThemeIcon,
    getThemeLabel,
  };
}

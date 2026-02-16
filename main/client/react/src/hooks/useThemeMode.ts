// main/client/react/src/hooks/useThemeMode.ts

import { useLocalStorage } from '@hooks/useLocalStorage';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useCallback, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export type UseThemeModeReturn = {
  /**
   * Current theme mode setting
   */
  mode: ThemeMode;
  /**
   * Set the theme mode
   */
  setMode: (mode: ThemeMode) => void;
  /**
   * Cycle through theme modes: system -> light -> dark -> system
   */
  cycleMode: () => void;
  /**
   * Whether the current resolved theme is dark
   */
  isDark: boolean;
  /**
   * Whether the current resolved theme is light
   */
  isLight: boolean;
  /**
   * The resolved theme (light or dark) after considering system preference
   */
  resolvedTheme: 'light' | 'dark';
};

/**
 * Hook for managing theme mode with localStorage persistence
 * Applies data-theme attribute to document root
 *
 * @example
 * ```tsx
 * const { mode, cycleMode, isDark } = useThemeMode('theme-mode');
 *
 * return (
 *   <button onClick={cycleMode}>
 *     {isDark ? 'Dark' : 'Light'} Mode
 *   </Button>
 * );
 * ```
 */
export function useThemeMode(storageKey = 'theme-mode'): UseThemeModeReturn {
  const [mode, setMode] = useLocalStorage<ThemeMode>(storageKey, 'system');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  const resolvedTheme: 'light' | 'dark' =
    mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode;
  const isDark = resolvedTheme === 'dark';
  const isLight = resolvedTheme === 'light';

  const cycleMode = useCallback((): void => {
    setMode((prev) => {
      if (prev === 'system') return 'light';
      if (prev === 'light') return 'dark';
      return 'system';
    });
  }, [setMode]);

  // Apply theme to document root
  useEffect((): void => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.removeAttribute('data-theme');

    if (mode === 'light') {
      root.setAttribute('data-theme', 'light');
    } else if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
    }
    // 'system' = no attribute, CSS handles it via prefers-color-scheme
  }, [mode]);

  return {
    mode,
    setMode,
    cycleMode,
    isDark,
    isLight,
    resolvedTheme,
  };
}

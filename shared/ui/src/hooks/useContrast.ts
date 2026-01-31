// shared/ui/src/hooks/useContrast.ts

import { useLocalStorage } from '@hooks/useLocalStorage';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useCallback, useEffect } from 'react';

import { DEFAULT_CONTRAST_MODE, getContrastCssVariables } from '../theme/contrast';

import type { ContrastMode } from '../theme/contrast';

export type UseContrastReturn = {
  /**
   * Current contrast mode setting
   */
  contrastMode: ContrastMode;
  /**
   * Set the contrast mode
   */
  setContrastMode: (mode: ContrastMode) => void;
  /**
   * Cycle through contrast modes: system -> normal -> high -> system
   */
  cycleContrastMode: () => void;
  /**
   * Whether high contrast is currently active (resolved from system or explicit)
   */
  isHighContrast: boolean;
  /**
   * Whether the system prefers high contrast
   */
  prefersHighContrast: boolean;
};

/**
 * Hook for managing high-contrast mode with localStorage persistence.
 * Applies data-contrast attribute and CSS variable overrides to document root.
 *
 * @param storageKey - localStorage key for persistence
 * @param resolvedTheme - current resolved theme (light/dark) for proper color overrides
 *
 * @example
 * ```tsx
 * const { contrastMode, cycleContrastMode, isHighContrast } = useContrast('ui-contrast', 'light');
 *
 * return (
 *   <button onClick={cycleContrastMode}>
 *     Contrast: {isHighContrast ? 'High' : 'Normal'}
 *   </button>
 * );
 * ```
 */
export function useContrast(
  storageKey = 'ui-contrast',
  resolvedTheme: 'light' | 'dark' = 'light',
): UseContrastReturn {
  const [contrastMode, setContrastMode] = useLocalStorage<ContrastMode>(
    storageKey,
    DEFAULT_CONTRAST_MODE,
  );
  const prefersHighContrast = useMediaQuery('(prefers-contrast: more)');

  // Determine if high contrast is currently active
  const isHighContrast =
    contrastMode === 'high' || (contrastMode === 'system' && prefersHighContrast);

  const cycleContrastMode = useCallback((): void => {
    setContrastMode((prev) => {
      if (prev === 'system') return 'normal';
      if (prev === 'normal') return 'high';
      return 'system';
    });
  }, [setContrastMode]);

  // Apply contrast CSS variables to document root
  useEffect((): (() => void) | undefined => {
    if (typeof document === 'undefined') return undefined;

    const root = document.documentElement;
    root.setAttribute('data-contrast', contrastMode);

    // Get CSS variable overrides
    const cssVariables = getContrastCssVariables(contrastMode, resolvedTheme, prefersHighContrast);

    if (cssVariables !== null) {
      // Apply high contrast overrides
      Object.entries(cssVariables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      // Cleanup function to remove overrides
      return (): void => {
        Object.keys(cssVariables).forEach((key) => {
          root.style.removeProperty(key);
        });
      };
    }

    return undefined;
  }, [contrastMode, resolvedTheme, prefersHighContrast]);

  return {
    contrastMode,
    setContrastMode,
    cycleContrastMode,
    isHighContrast,
    prefersHighContrast,
  };
}

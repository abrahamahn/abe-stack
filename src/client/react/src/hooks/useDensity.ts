// src/client/react/src/hooks/useDensity.ts

import { useLocalStorage } from '@hooks/useLocalStorage';
import { useCallback, useEffect } from 'react';

import { DEFAULT_DENSITY, getDensityCssVariables, type Density } from '@abe-stack/shared';

export type UseDensityReturn = {
  /**
   * Current density setting
   */
  density: Density;
  /**
   * Set the density
   */
  setDensity: (density: Density) => void;
  /**
   * Cycle through density modes: compact -> normal -> comfortable -> compact
   */
  cycleDensity: () => void;
  /**
   * Whether current density is compact
   */
  isCompact: boolean;
  /**
   * Whether current density is normal
   */
  isNormal: boolean;
  /**
   * Whether current density is comfortable
   */
  isComfortable: boolean;
};

/**
 * Hook for managing UI density with localStorage persistence.
 * Applies data-density attribute and CSS variables to document root.
 *
 * @example
 * ```tsx
 * const { density, cycleDensity, isCompact } = useDensity('ui-density');
 *
 * return (
 *   <button onClick={cycleDensity}>
 *     Density: {density}
 *   </button>
 * );
 * ```
 */
export function useDensity(storageKey = 'ui-density'): UseDensityReturn {
  const [density, setDensity] = useLocalStorage<Density>(storageKey, DEFAULT_DENSITY);

  const cycleDensity = useCallback((): void => {
    setDensity((prev) => {
      if (prev === 'compact') return 'normal';
      if (prev === 'normal') return 'comfortable';
      return 'compact';
    });
  }, [setDensity]);

  // Apply density CSS variables to document root
  useEffect((): void => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    root.setAttribute('data-density', density);

    // Apply CSS variables for density-scaled spacing
    const cssVariables = getDensityCssVariables(density);
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [density]);

  return {
    density,
    setDensity,
    cycleDensity,
    isCompact: density === 'compact',
    isNormal: density === 'normal',
    isComfortable: density === 'comfortable',
  };
}

// client/ui/src/theme/provider.tsx
import { useContrast } from '@hooks/useContrast';
import { useDensity } from '@hooks/useDensity';
import { useThemeMode } from '@hooks/useThemeMode';
import { createContext, useContext } from 'react';

import type { ContrastMode } from './contrast';
import type { Density } from './density';
import type { UseContrastReturn } from '@hooks/useContrast';
import type { UseDensityReturn } from '@hooks/useDensity';
import type { ThemeMode, UseThemeModeReturn } from '@hooks/useThemeMode';
import type { ReactElement, ReactNode } from 'react';

export type ThemeContextValue = UseThemeModeReturn & UseDensityReturn & UseContrastReturn;

const ThemeContext = createContext<ThemeContextValue | null>(null);

export type ThemeProviderProps = {
  /**
   * The children to render within the theme provider
   */
  children: ReactNode;
  /**
   * The localStorage key for persisting theme preference
   * @default 'theme-mode'
   */
  storageKey?: string;
  /**
   * The localStorage key for persisting density preference
   * @default 'ui-density'
   */
  densityStorageKey?: string;
  /**
   * The localStorage key for persisting contrast preference
   * @default 'ui-contrast'
   */
  contrastStorageKey?: string;
  /**
   * Default theme mode if none is stored
   * @default 'system'
   */
  defaultMode?: ThemeMode;
  /**
   * Default density if none is stored
   * @default 'normal'
   */
  defaultDensity?: Density;
  /**
   * Default contrast mode if none is stored
   * @default 'system'
   */
  defaultContrast?: ContrastMode;
};

/**
 * ThemeProvider wraps your app to provide theme context and styling.
 * Manages light/dark mode, density variants, and high-contrast mode.
 *
 * @example
 * ```tsx
 * import { ThemeProvider } from '@abe-stack/ui';
 *
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Access theme values in child components
 * import { useTheme } from '@abe-stack/ui';
 *
 * function ThemeToggle() {
 *   const { mode, cycleMode, isDark, density, cycleDensity, isHighContrast } = useTheme();
 *   return (
 *     <div>
 *       <button onClick={cycleMode}>
 *         {isDark ? 'Dark' : 'Light'} Mode
 *       </button>
 *       <button onClick={cycleDensity}>
 *         Density: {density}
 *       </button>
 *       <span>{isHighContrast ? 'High Contrast' : 'Normal Contrast'}</span>
 *     </div>
 *   );
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export function ThemeProvider({
  children,
  storageKey = 'theme-mode',
  densityStorageKey = 'ui-density',
  contrastStorageKey = 'ui-contrast',
}: ThemeProviderProps): ReactElement {
  const themeState = useThemeMode(storageKey);
  const densityState = useDensity(densityStorageKey);
  const contrastState = useContrast(contrastStorageKey, themeState.resolvedTheme);

  const contextValue: ThemeContextValue = {
    ...themeState,
    ...densityState,
    ...contrastState,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      <div className="theme" style={{ height: '100%', width: '100%' }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access the theme context.
 * Must be used within a ThemeProvider.
 *
 * @throws Error if used outside of ThemeProvider
 *
 * @example
 * ```tsx
 * function ThemeToggle() {
 *   const {
 *     // Theme mode
 *     mode, cycleMode, isDark, isLight, resolvedTheme, setMode,
 *     // Density
 *     density, cycleDensity, setDensity, isCompact, isNormal, isComfortable,
 *     // Contrast
 *     contrastMode, cycleContrastMode, setContrastMode, isHighContrast,
 *   } = useTheme();
 *
 *   return (
 *     <div>
 *       <p>Current mode: {mode}</p>
 *       <p>Density: {density}</p>
 *       <p>High Contrast: {isHighContrast ? 'Yes' : 'No'}</p>
 *       <button onClick={cycleMode}>Cycle Theme</button>
 *       <button onClick={cycleDensity}>Cycle Density</button>
 *       <button onClick={cycleContrastMode}>Cycle Contrast</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context == null) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

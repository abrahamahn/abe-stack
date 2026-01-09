// packages/ui/src/theme/provider.tsx
import { createContext, useContext } from 'react';

import { useThemeMode } from '../hooks/useThemeMode';

import type { ThemeMode, UseThemeModeReturn } from '../hooks/useThemeMode';
import type { ReactNode, ReactElement } from 'react';

export type ThemeContextValue = UseThemeModeReturn;

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
   * Default theme mode if none is stored
   * @default 'system'
   */
  defaultMode?: ThemeMode;
};

/**
 * ThemeProvider wraps your app to provide theme context and styling.
 * Applies the `theme` class and manages light/dark mode.
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
 *   const { mode, cycleMode, isDark } = useTheme();
 *   return (
 *     <button onClick={cycleMode}>
 *       {isDark ? 'Dark' : 'Light'} Mode
 *     </button>
 *   );
 * }
 * ```
 */
export function ThemeProvider({
  children,
  storageKey = 'theme-mode',
}: ThemeProviderProps): ReactElement {
  const themeState = useThemeMode(storageKey);

  return (
    <ThemeContext.Provider value={themeState}>
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
 *   const { mode, cycleMode, isDark, isLight, resolvedTheme, setMode } = useTheme();
 *
 *   return (
 *     <div>
 *       <p>Current mode: {mode}</p>
 *       <p>Resolved: {resolvedTheme}</p>
 *       <button onClick={cycleMode}>Cycle Theme</button>
 *       <button onClick={() => setMode('dark')}>Dark</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

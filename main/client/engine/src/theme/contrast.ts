// main/client/engine/src/theme/contrast.ts

/**
 * High-contrast mode support for accessibility.
 *
 * Provides increased contrast ratios for users who need enhanced visual distinction.
 * Supports system preference detection via `prefers-contrast: more` media query.
 */

export type ContrastMode = 'system' | 'normal' | 'high';

/**
 * High-contrast color overrides for light theme.
 * Increases contrast ratios while maintaining color semantics.
 */
export const highContrastLightOverrides = {
  // Text: maximum contrast
  ['--ui-color-text']: '#000000',
  ['--ui-color-text-muted']: '#1a1a1a',

  // Backgrounds: pure white
  ['--ui-color-bg']: '#ffffff',
  ['--ui-color-surface']: '#ffffff',

  // Borders: darker for visibility
  ['--ui-color-border']: '#000000',
  ['--ui-layout-border']: '2px solid #000000',

  // Core colors: more saturated
  ['--ui-color-primary']: '#0040c0',
  ['--ui-color-danger']: '#c00000',
  ['--ui-color-success']: '#006000',
  ['--ui-color-warning']: '#a06000',
  ['--ui-color-muted']: '#333333',

  // Focus: stronger outline
  ['--ui-focus']: '0 0 0 3px #000000',
  ['--ui-outline-width']: '3px',
} as const;

/**
 * High-contrast color overrides for dark theme.
 * Increases contrast ratios while maintaining color semantics.
 */
export const highContrastDarkOverrides = {
  // Text: maximum contrast
  ['--ui-color-text']: '#ffffff',
  ['--ui-color-text-muted']: '#e6e6e6',

  // Backgrounds: pure black
  ['--ui-color-bg']: '#000000',
  ['--ui-color-surface']: '#0a0a0a',

  // Borders: lighter for visibility
  ['--ui-color-border']: '#ffffff',
  ['--ui-layout-border']: '2px solid #ffffff',

  // Core colors: brighter for dark bg
  ['--ui-color-primary']: '#6699ff',
  ['--ui-color-danger']: '#ff6666',
  ['--ui-color-success']: '#66ff66',
  ['--ui-color-warning']: '#ffcc00',
  ['--ui-color-muted']: '#cccccc',

  // Focus: stronger outline
  ['--ui-focus']: '0 0 0 3px #ffffff',
  ['--ui-outline-width']: '3px',
} as const;

/**
 * Get CSS variable overrides for high-contrast mode based on current theme.
 */
export function getContrastCssVariables(
  contrastMode: ContrastMode,
  resolvedTheme: 'light' | 'dark',
  prefersHighContrast: boolean,
): Record<string, string> | null {
  // Determine if high contrast should be applied
  const shouldApplyHighContrast =
    contrastMode === 'high' || (contrastMode === 'system' && prefersHighContrast);

  if (!shouldApplyHighContrast) {
    return null;
  }

  return resolvedTheme === 'dark'
    ? { ...highContrastDarkOverrides }
    : { ...highContrastLightOverrides };
}

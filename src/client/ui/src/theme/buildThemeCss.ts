// src/client/ui/src/theme/buildThemeCss.ts
/**
 * Theme CSS generator for UI tokens.
 *
 * Used by tools to generate theme.css from the TypeScript theme sources.
 */

import { darkColors, lightColors, type DarkColors, type LightColors } from './colors';
import { motion } from './motion';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

/** Union of light or dark color definitions used when generating tokens. */
type ColorTheme = LightColors | DarkColors;

/**
 * Builds a flat record of CSS custom property names to their values
 * for the given color theme. Covers radius, spacing, border, outline,
 * motion, typography, core colors, backgrounds, borders, effects, text,
 * controls, alerts, and badges.
 *
 * @param colors - A complete light or dark color set
 * @returns Record mapping CSS custom property names (e.g. `--ui-color-primary`) to values
 */
function buildThemeTokens(colors: ColorTheme): Record<string, string> {
  const tokens: Record<string, string> = {};

  // Radius
  tokens['--ui-radius-sm'] = radius.sm;
  tokens['--ui-radius-md'] = radius.md;
  tokens['--ui-radius-lg'] = radius.lg;
  tokens['--ui-radius-full'] = '999px';

  // Spacing
  tokens['--ui-gap-xs'] = spacing.xs;
  tokens['--ui-gap-sm'] = spacing.sm;
  tokens['--ui-gap-md'] = spacing.md;
  tokens['--ui-gap-lg'] = spacing.lg;
  tokens['--ui-gap-xl'] = spacing.xl;
  tokens['--ui-gap-2xl'] = spacing['2xl'];
  tokens['--ui-gap-3xl'] = spacing['3xl'];

  // Border
  tokens['--ui-border-width'] = '1px';

  // Outline (focus states)
  tokens['--ui-outline-width'] = '2px';
  tokens['--ui-outline-offset'] = '2px';

  // Motion
  tokens['--ui-motion-duration-fast'] = motion.durations.fast;
  tokens['--ui-motion-duration-base'] = motion.durations.base;
  tokens['--ui-motion-duration-slow'] = motion.durations.slow;
  tokens['--ui-motion-duration-slower'] = motion.durations.slower;
  tokens['--ui-motion-duration-shimmer'] = motion.durations.shimmer;
  tokens['--ui-motion-ease-standard'] = motion.easing.standard;
  tokens['--ui-motion-ease-in'] = motion.easing.in;
  tokens['--ui-motion-ease-out'] = motion.easing.out;

  // Typography
  tokens['--ui-font-family'] = typography.fontFamily;
  tokens['--ui-font-size-base'] = typography.sizes.sm;
  tokens['--ui-font-size-2xs'] = typography.sizes['2xs'];
  tokens['--ui-font-size-xs'] = typography.sizes.xs;
  tokens['--ui-font-size-sm'] = typography.sizes.sm;
  tokens['--ui-font-size-md'] = typography.sizes.md;
  tokens['--ui-font-size-lg'] = typography.sizes.lg;
  tokens['--ui-font-size-xl'] = typography.sizes.xl;
  tokens['--ui-font-weight-regular'] = typography.weights.regular.toString();
  tokens['--ui-font-weight-medium'] = typography.weights.medium.toString();
  tokens['--ui-font-weight-bold'] = typography.weights.bold.toString();
  tokens['--ui-line-height-base'] = typography.lineHeights.normal.toString();
  tokens['--ui-line-height-tight'] = typography.lineHeights.tight.toString();
  tokens['--ui-line-height-normal'] = typography.lineHeights.normal.toString();
  tokens['--ui-line-height-loose'] = typography.lineHeights.loose.toString();

  // Core colors
  tokens['--ui-color-primary'] = colors.primary;
  tokens['--ui-color-accent'] = colors.accent;
  tokens['--ui-color-primary-muted'] = colors.primaryMuted;
  tokens['--ui-color-danger'] = colors.danger;
  tokens['--ui-color-success'] = colors.success;
  tokens['--ui-color-warning'] = colors.warning;
  tokens['--ui-color-neutral'] = colors.neutral;
  tokens['--ui-color-muted'] = colors.muted;

  // Background colors
  tokens['--ui-color-bg'] = colors.bg;
  tokens['--ui-color-surface'] = colors.surface;
  tokens['--ui-color-surface-strong'] = colors.surfaceStrong;

  // Border colors
  tokens['--ui-color-border'] = colors.border;
  tokens['--ui-layout-border'] = 'var(--ui-border-width) solid var(--ui-color-border)';

  // Effects
  tokens['--ui-color-shadow'] = colors.shadow;
  tokens['--ui-focus'] = colors.focus;

  // Text colors
  tokens['--ui-color-text'] = colors.text;
  tokens['--ui-color-text-muted'] = colors.textMuted;
  tokens['--ui-color-text-inverse'] = colors.textInverse;

  // Control colors
  tokens['--ui-color-control-thumb'] = colors.controlThumb;

  // Alert semantic colors
  tokens['--ui-alert-info-bg'] = colors.alert.info.bg;
  tokens['--ui-alert-info-border'] = colors.alert.info.border;
  tokens['--ui-alert-info-text'] = colors.alert.info.text;
  tokens['--ui-alert-success-bg'] = colors.alert.success.bg;
  tokens['--ui-alert-success-border'] = colors.alert.success.border;
  tokens['--ui-alert-success-text'] = colors.alert.success.text;
  tokens['--ui-alert-danger-bg'] = colors.alert.danger.bg;
  tokens['--ui-alert-danger-border'] = colors.alert.danger.border;
  tokens['--ui-alert-danger-text'] = colors.alert.danger.text;
  tokens['--ui-alert-warning-bg'] = colors.alert.warning.bg;
  tokens['--ui-alert-warning-border'] = colors.alert.warning.border;
  tokens['--ui-alert-warning-text'] = colors.alert.warning.text;

  // Badge semantic colors
  tokens['--ui-badge-primary-bg'] = colors.badge.primary.bg;
  tokens['--ui-badge-primary-border'] = colors.badge.primary.border;
  tokens['--ui-badge-success-bg'] = colors.badge.success.bg;
  tokens['--ui-badge-success-border'] = colors.badge.success.border;
  tokens['--ui-badge-danger-bg'] = colors.badge.danger.bg;
  tokens['--ui-badge-danger-border'] = colors.badge.danger.border;
  tokens['--ui-badge-warning-bg'] = colors.badge.warning.bg;
  tokens['--ui-badge-warning-border'] = colors.badge.warning.border;
  tokens['--ui-badge-neutral-bg'] = colors.badge.neutral.bg;
  tokens['--ui-badge-neutral-border'] = colors.badge.neutral.border;

  return tokens;
}

/**
 * Serializes a token record into indented CSS declaration lines.
 *
 * @param tokens - Record of CSS custom property name/value pairs
 * @returns A string of CSS declarations, each indented with two spaces
 *
 * @example
 * ```ts
 * serializeTokens({ '--ui-radius-sm': '0.25rem' });
 * // "  --ui-radius-sm: 0.25rem;"
 * ```
 */
function serializeTokens(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/**
 * Generates a complete CSS string containing all theme custom properties.
 *
 * Produces four rule blocks:
 * 1. `:root` -- light tokens as default
 * 2. `:root[data-theme='light']` -- explicit light mode
 * 3. `:root[data-theme='dark']` -- explicit dark mode
 * 4. `@media (prefers-color-scheme: dark)` -- OS-level dark preference fallback
 *
 * @returns A CSS string ready to be written to a `.css` file
 *
 * @example
 * ```ts
 * import { writeFileSync } from 'fs';
 * writeFileSync('theme.css', generateThemeCss());
 * ```
 */
export function generateThemeCss(): string {
  const lightTokens = buildThemeTokens(lightColors);
  const darkTokens = buildThemeTokens(darkColors);

  return `:root {\n${serializeTokens(lightTokens)}\n}\n\n:root[data-theme='light'] {\n${serializeTokens(lightTokens)}\n}\n\n:root[data-theme='dark'] {\n${serializeTokens(darkTokens)}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${serializeTokens(darkTokens)}\n  }\n}\n`;
}

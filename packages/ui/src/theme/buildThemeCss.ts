// packages/ui/src/theme/buildThemeCss.ts
/**
 * Theme CSS generator for UI tokens.
 *
 * Used by tooling to generate theme.css from the TypeScript theme sources.
 */

import { darkColors, lightColors, type DarkColors, type LightColors } from './colors';
import { motion } from './motion';
import { radius } from './radius';
import { spacing } from './spacing';
import { typography } from './typography';

type ColorTheme = LightColors | DarkColors;

/** Generate CSS custom properties from theme tokens */
function buildThemeTokens(colors: ColorTheme): Record<string, string> {
  return {
    // Radius
    '--ui-radius-sm': radius.sm,
    '--ui-radius-md': radius.md,
    '--ui-radius-lg': radius.lg,

    // Spacing
    '--ui-gap-xs': spacing.xs,
    '--ui-gap-sm': spacing.sm,
    '--ui-gap-md': spacing.md,
    '--ui-gap-lg': spacing.lg,
    '--ui-gap-xl': spacing.xl,
    '--ui-gap-2xl': spacing['2xl'],
    '--ui-gap-3xl': spacing['3xl'],

    // Border
    '--ui-border-width': '1px',

    // Outline (focus states)
    '--ui-outline-width': '2px',
    '--ui-outline-offset': '2px',

    // Additional radius
    '--ui-radius-full': '999px',

    // Motion
    '--ui-motion-duration-fast': motion.durations.fast,
    '--ui-motion-duration-base': motion.durations.base,
    '--ui-motion-duration-slow': motion.durations.slow,
    '--ui-motion-duration-slower': motion.durations.slower,
    '--ui-motion-duration-shimmer': motion.durations.shimmer,
    '--ui-motion-ease-standard': motion.easing.standard,
    '--ui-motion-ease-in': motion.easing.in,
    '--ui-motion-ease-out': motion.easing.out,

    // Typography
    '--ui-font-family': typography.fontFamily,
    '--ui-font-size-base': typography.sizes.sm,
    '--ui-font-size-2xs': typography.sizes['2xs'],
    '--ui-font-size-xs': typography.sizes.xs,
    '--ui-font-size-sm': typography.sizes.sm,
    '--ui-font-size-md': typography.sizes.md,
    '--ui-font-size-lg': typography.sizes.lg,
    '--ui-font-size-xl': typography.sizes.xl,
    '--ui-font-weight-regular': typography.weights.regular.toString(),
    '--ui-font-weight-medium': typography.weights.medium.toString(),
    '--ui-font-weight-bold': typography.weights.bold.toString(),
    '--ui-line-height-base': typography.lineHeights.normal.toString(),
    '--ui-line-height-tight': typography.lineHeights.tight.toString(),
    '--ui-line-height-normal': typography.lineHeights.normal.toString(),
    '--ui-line-height-loose': typography.lineHeights.loose.toString(),

    // Core colors
    '--ui-color-primary': colors.primary,
    '--ui-color-accent': colors.accent,
    '--ui-color-primary-muted': colors.primaryMuted,
    '--ui-color-danger': colors.danger,
    '--ui-color-success': colors.success,
    '--ui-color-warning': colors.warning,
    '--ui-color-neutral': colors.neutral,
    '--ui-color-muted': colors.muted,

    // Background colors
    '--ui-color-bg': colors.bg,
    '--ui-color-surface': colors.surface,
    '--ui-color-surface-strong': colors.surfaceStrong,

    // Border colors
    '--ui-color-border': colors.border,
    '--ui-layout-border': 'var(--ui-border-width) solid var(--ui-color-border)',

    // Effects
    '--ui-color-shadow': colors.shadow,
    '--ui-focus': colors.focus,

    // Text colors
    '--ui-color-text': colors.text,
    '--ui-color-text-muted': colors.textMuted,
    '--ui-color-text-inverse': colors.textInverse,

    // Control colors
    '--ui-color-control-thumb': colors.controlThumb,

    // Alert semantic colors
    '--ui-alert-info-bg': colors.alert.info.bg,
    '--ui-alert-info-border': colors.alert.info.border,
    '--ui-alert-info-text': colors.alert.info.text,
    '--ui-alert-success-bg': colors.alert.success.bg,
    '--ui-alert-success-border': colors.alert.success.border,
    '--ui-alert-success-text': colors.alert.success.text,
    '--ui-alert-danger-bg': colors.alert.danger.bg,
    '--ui-alert-danger-border': colors.alert.danger.border,
    '--ui-alert-danger-text': colors.alert.danger.text,
    '--ui-alert-warning-bg': colors.alert.warning.bg,
    '--ui-alert-warning-border': colors.alert.warning.border,
    '--ui-alert-warning-text': colors.alert.warning.text,

    // Badge semantic colors
    '--ui-badge-primary-bg': colors.badge.primary.bg,
    '--ui-badge-primary-border': colors.badge.primary.border,
    '--ui-badge-success-bg': colors.badge.success.bg,
    '--ui-badge-success-border': colors.badge.success.border,
    '--ui-badge-danger-bg': colors.badge.danger.bg,
    '--ui-badge-danger-border': colors.badge.danger.border,
    '--ui-badge-warning-bg': colors.badge.warning.bg,
    '--ui-badge-warning-border': colors.badge.warning.border,
    '--ui-badge-neutral-bg': colors.badge.neutral.bg,
    '--ui-badge-neutral-border': colors.badge.neutral.border,
  };
}

/** Serialize tokens to CSS declarations */
function serializeTokens(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
}

/** Generate complete theme CSS */
export function generateThemeCss(): string {
  const lightTokens = buildThemeTokens(lightColors);
  const darkTokens = buildThemeTokens(darkColors);

  return `:root {\n${serializeTokens(lightTokens)}\n}\n\n:root[data-theme='light'] {\n${serializeTokens(lightTokens)}\n}\n\n:root[data-theme='dark'] {\n${serializeTokens(darkTokens)}\n}\n\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${serializeTokens(darkTokens)}\n  }\n}\n`;
}

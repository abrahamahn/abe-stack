// src/client/ui/src/theme/spacing.ts
/**
 * Base spacing design tokens.
 *
 * Provides the default (normal density) spacing scale in rem units.
 * Used by {@link buildThemeCss} to generate `--ui-gap-*` CSS custom properties
 * and by {@link density} utilities as the base values before multiplier scaling.
 *
 * | Token | Value  | Pixels |
 * |-------|--------|--------|
 * | xs    | 0.25rem| 4px    |
 * | sm    | 0.5rem | 8px    |
 * | md    | 0.75rem| 12px   |
 * | lg    | 1rem   | 16px   |
 * | xl    | 1.5rem | 24px   |
 * | 2xl   | 2rem   | 32px   |
 * | 3xl   | 3rem   | 48px   |
 */
export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  ['2xl']: '2rem', // 32px
  ['3xl']: '3rem', // 48px
} as const;

/** Inferred type of the spacing token record. */
export type Spacing = typeof spacing;

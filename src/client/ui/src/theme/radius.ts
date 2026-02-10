// src/client/ui/src/theme/radius.ts
/**
 * Border radius design tokens.
 *
 * Single source of truth for border radius values used across the UI.
 * Consumed by {@link buildThemeCss} to generate `--ui-radius-*` CSS custom properties.
 *
 * | Token | Value    | Pixels |
 * |-------|----------|--------|
 * | sm    | 0.25rem  | 4px    |
 * | md    | 0.625rem | 10px   |
 * | lg    | 1rem     | 16px   |
 */
export const radius = {
  sm: '0.25rem', // 4px
  md: '0.625rem', // 10px
  lg: '1rem', // 16px
} as const;

/** Inferred type of the radius token record. */
export type Radius = typeof radius;

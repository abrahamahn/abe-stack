// src/client/ui/src/theme/typography.ts
/**
 * Typography design tokens.
 *
 * Defines the font family stack, type scale sizes, font weights, and
 * line heights used across the UI. Consumed by {@link buildThemeCss} to
 * generate `--ui-font-*` and `--ui-line-height-*` CSS custom properties.
 *
 * **Font family:** System font stack for fast rendering without web font downloads.
 *
 * **Sizes (rem / px):**
 * | Token | rem     | px  |
 * |-------|---------|-----|
 * | 2xs   | 0.625   | 10  |
 * | xs    | 0.75    | 12  |
 * | sm    | 0.875   | 14  |
 * | md    | 1       | 16  |
 * | lg    | 1.25    | 20  |
 * | xl    | 1.5     | 24  |
 */
export const typography = {
  fontFamily:
    'system-ui, -apple-system, Segoe UI, sans-serif, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji',
  fontFamilyMono: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
  sizes: {
    ['2xs']: '0.625rem', // 10px
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    md: '1rem', // 16px
    lg: '1.25rem', // 20px
    xl: '1.5rem', // 24px
  },
  weights: {
    regular: 400,
    medium: 500,
    bold: 700,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.7,
  },
} as const;

/** Inferred type of the typography token record. */
export type Typography = typeof typography;

// src/client/ui/src/theme/density.ts

/**
 * Theme density variants for adjusting spacing across the UI.
 *
 * - `compact`: Tighter spacing (0.75x), ideal for data-dense interfaces
 * - `normal`: Default spacing (1x), balanced for most use cases
 * - `comfortable`: Looser spacing (1.25x), more breathing room
 */

/**
 * Available density levels for the UI.
 *
 * - `compact` -- tighter spacing for data-dense views
 * - `normal` -- balanced default
 * - `comfortable` -- extra breathing room
 */
export type Density = 'compact' | 'normal' | 'comfortable';

/**
 * Numeric multipliers applied to base spacing for each density level.
 *
 * Compact compresses spacing to 75%, comfortable expands to 125%.
 */
export const densityMultipliers = {
  compact: 0.75,
  normal: 1,
  comfortable: 1.25,
} as const;

/** Base spacing scale in rem units (used as input before density scaling). */
const baseSpacing = {
  xs: 0.25, // 4px
  sm: 0.5, // 8px
  md: 0.75, // 12px
  lg: 1, // 16px
  xl: 1.5, // 24px
  ['2xl']: 2, // 32px
  ['3xl']: 3, // 48px
} as const;

/**
 * Generates rem spacing values scaled by the given density level.
 *
 * Each base spacing value is multiplied by the density multiplier and
 * formatted as a rem string with trailing zeros stripped.
 *
 * @param density - The density level to compute spacing for
 * @returns A record mapping spacing scale names (xs through 3xl) to rem strings
 *
 * @example
 * ```ts
 * getSpacingForDensity('compact');
 * // { xs: '0.188rem', sm: '0.375rem', md: '0.563rem', ... }
 * ```
 */
export function getSpacingForDensity(density: Density): Record<keyof typeof baseSpacing, string> {
  const multiplier = densityMultipliers[density];
  const entries = Object.entries(baseSpacing) as [keyof typeof baseSpacing, number][];

  return Object.fromEntries(
    entries.map(([key, value]) => [
      key,
      `${(value * multiplier).toFixed(3).replace(/\.?0+$/, '')}rem`,
    ]),
  ) as Record<keyof typeof baseSpacing, string>;
}

/**
 * Generates a record of CSS custom property name/value pairs for
 * density-scaled spacing tokens.
 *
 * Suitable for applying as inline styles or injecting into a stylesheet.
 *
 * @param density - The density level to generate variables for
 * @returns Record mapping CSS variable names (e.g. `--ui-gap-sm`) to rem values
 *
 * @example
 * ```ts
 * const vars = getDensityCssVariables('comfortable');
 * // { '--ui-gap-xs': '0.313rem', '--ui-gap-sm': '0.625rem', ... }
 * ```
 */
export function getDensityCssVariables(density: Density): Record<string, string> {
  const spacing = getSpacingForDensity(density);

  return {
    ['--ui-gap-xs']: spacing.xs,
    ['--ui-gap-sm']: spacing.sm,
    ['--ui-gap-md']: spacing.md,
    ['--ui-gap-lg']: spacing.lg,
    ['--ui-gap-xl']: spacing.xl,
    ['--ui-gap-2xl']: spacing['2xl'],
    ['--ui-gap-3xl']: spacing['3xl'],
  };
}

/** Default density setting used when no user preference is stored. */
export const DEFAULT_DENSITY: Density = 'normal';

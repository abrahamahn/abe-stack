// main/shared/src/engine/theme/density.ts

/**
 * Theme density variants for adjusting spacing across the UI.
 *
 * - `compact`: Tighter spacing (0.75x), ideal for data-dense interfaces
 * - `normal`: Default spacing (1x), balanced for most use cases
 * - `comfortable`: Looser spacing (1.25x), more breathing room
 */

export type Density = 'compact' | 'normal' | 'comfortable';

/** Multipliers for each density level */
export const densityMultipliers = {
  compact: 0.75,
  normal: 1,
  comfortable: 1.25,
} as const;

/** Base spacing values in rem */
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
 * Generate spacing values for a given density
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
 * Generate CSS custom properties for density-scaled spacing
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

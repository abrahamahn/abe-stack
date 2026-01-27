// packages/ui/src/theme/spacing.ts
export const spacing = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  ['2xl']: '2rem', // 32px
  ['3xl']: '3rem', // 48px
} as const;

export type Spacing = typeof spacing;

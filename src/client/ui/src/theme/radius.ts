// src/client/ui/src/theme/radius.ts
/**
 * Border radius tokens
 * Single source of truth for border radius values
 */
export const radius = {
  sm: '0.25rem', // 4px
  md: '0.625rem', // 10px
  lg: '1rem', // 16px
} as const;

export type Radius = typeof radius;

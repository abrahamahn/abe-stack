// src/client/ui/src/theme/motion.ts
/**
 * Motion design tokens for transitions and animations.
 *
 * Contains two groups:
 * - **durations** -- timing values from fast micro-interactions to slow shimmer effects
 * - **easing** -- cubic-bezier curves following Material Design motion principles
 *
 * These tokens are consumed by {@link buildThemeCss} to generate
 * `--ui-motion-duration-*` and `--ui-motion-ease-*` CSS custom properties.
 */
export const motion = {
  durations: {
    fast: '120ms',
    base: '180ms',
    slow: '240ms',
    slower: '320ms',
    shimmer: '1400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

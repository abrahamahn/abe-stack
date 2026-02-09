// src/client/ui/src/theme/motion.ts
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

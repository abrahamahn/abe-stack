// shared/ui/src/theme/colors.ts
/**
 * Theme color tokens
 * Single source of truth for all colors used in the UI
 */

/** Core semantic colors */
const coreLight = {
  primary: '#2563eb',
  accent: '#2563eb',
  primaryMuted: '#dbeafe',
  danger: '#dc2626',
  success: '#16a34a',
  warning: '#f59e0b',
  neutral: '#111827',
  muted: '#6b7280',
} as const;

const coreDark = {
  primary: '#3b82f6',
  accent: '#2563eb',
  primaryMuted: '#1e3a8a',
  danger: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  neutral: '#e5e7eb',
  muted: '#9ca3af',
} as const;

/** Background and surface colors */
const backgroundLight = {
  bg: '#ffffff',
  surface: '#f7f7f8',
  surfaceStrong: '#0f172a',
} as const;

const backgroundDark = {
  bg: '#0b1220',
  surface: '#111827',
  surfaceStrong: '#0f172a',
} as const;

/** Border colors */
const borderLight = {
  border: '#e2e5e9',
} as const;

const borderDark = {
  border: '#1f2937',
} as const;

/** Text colors */
const textLight = {
  text: '#0f172a',
  textMuted: '#4b5563',
  textInverse: '#e2e8f0',
} as const;

const textDark = {
  text: '#f8fafc',
  textMuted: '#d5dde7',
  textInverse: '#0b1220',
} as const;

/** Control colors (switches, sliders, etc.) */
const controlLight = {
  controlThumb: '#ffffff',
} as const;

const controlDark = {
  controlThumb: '#e5e7eb',
} as const;

/** Effect colors (shadows, focus rings) */
const effectLight = {
  shadow: '0 10px 30px rgba(18, 38, 63, 0.08)',
  focus: '0 0 0 3px rgba(59, 130, 246, 0.35)',
} as const;

const effectDark = {
  shadow: '0 16px 48px rgba(0, 0, 0, 0.45)',
  focus: '0 0 0 3px rgba(59, 130, 246, 0.35)',
} as const;

/** Alert semantic colors */
const alertLight = {
  info: {
    bg: '#eff6ff',
    border: '#cbdcff',
    text: '#1e3a8a',
  },
  success: {
    bg: '#ecfdf3',
    border: '#bbf7d0',
    text: '#166534',
  },
  danger: {
    bg: '#fef2f2',
    border: '#fecdd3',
    text: '#7f1d1d',
  },
  warning: {
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
  },
} as const;

const alertDark = {
  info: {
    bg: '#1e3a8a',
    border: '#3b82f6',
    text: '#e0f2fe',
  },
  success: {
    bg: '#0f3f2b',
    border: '#34d399',
    text: '#bbf7d0',
  },
  danger: {
    bg: '#3b0d0d',
    border: '#f87171',
    text: '#fecaca',
  },
  warning: {
    bg: '#422006',
    border: '#fbbf24',
    text: '#fef3c7',
  },
} as const;

/** Badge semantic colors */
const badgeLight = {
  primary: {
    bg: '#e0e7ff',
    border: '#c7d2fe',
  },
  success: {
    bg: '#e0f7ec',
    border: '#a7f3d0',
  },
  danger: {
    bg: '#fee2e2',
    border: '#fecdd3',
  },
  warning: {
    bg: '#fef3c7',
    border: '#fcd34d',
  },
  neutral: {
    bg: '#f1f5f9',
    border: '#e2e8f0',
  },
} as const;

const badgeDark = {
  primary: {
    bg: '#1e3a8a',
    border: '#3b82f6',
  },
  success: {
    bg: '#0f3f2b',
    border: '#34d399',
  },
  danger: {
    bg: '#3b0d0d',
    border: '#f87171',
  },
  warning: {
    bg: '#422006',
    border: '#fbbf24',
  },
  neutral: {
    bg: '#1f2937',
    border: '#334155',
  },
} as const;

/** Complete light theme colors */
export const lightColors = {
  ...coreLight,
  ...backgroundLight,
  ...borderLight,
  ...textLight,
  ...controlLight,
  ...effectLight,
  alert: alertLight,
  badge: badgeLight,
} as const;

/** Complete dark theme colors */
export const darkColors = {
  ...coreDark,
  ...backgroundDark,
  ...borderDark,
  ...textDark,
  ...controlDark,
  ...effectDark,
  alert: alertDark,
  badge: badgeDark,
} as const;

/** Theme colors with light and dark variants */
export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;

/** Type definitions */
export type LightColors = typeof lightColors;
export type DarkColors = typeof darkColors;
export type ThemeColors = typeof colors;

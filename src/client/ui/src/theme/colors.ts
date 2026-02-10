// src/client/ui/src/theme/colors.ts
/**
 * Theme color tokens — Chrome-inspired color scheme.
 *
 * Single source of truth for every color used in the UI design system.
 * Colors are organized into semantic groups (core, background, border,
 * text, control, effect, alert, badge) with light and dark variants.
 *
 * Consumed by {@link buildThemeCss} to generate CSS custom properties
 * and by the ThemeProvider at runtime.
 */

/** Core semantic colors for the light theme (brand, status, accent). */
const coreLight = {
  primary: '#1a73e8',
  accent: '#1a73e8',
  primaryMuted: '#d2e3fc',
  danger: '#d93025',
  success: '#188038',
  warning: '#f9ab00',
  neutral: '#202124',
  muted: '#5f6368',
} as const;

/** Core semantic colors for the dark theme (brand, status, accent). */
const coreDark = {
  primary: '#8ab4f8',
  accent: '#8ab4f8',
  primaryMuted: '#394457',
  danger: '#f28b82',
  success: '#81c995',
  warning: '#fdd663',
  neutral: '#e8eaed',
  muted: '#9aa0a6',
} as const;

/** Background and surface colors for the light theme. */
const backgroundLight = {
  bg: '#ffffff',
  surface: '#f1f3f4',
  surfaceStrong: '#202124',
} as const;

/** Background and surface colors for the dark theme. */
const backgroundDark = {
  bg: '#202124',
  surface: '#292a2d',
  surfaceStrong: '#171717',
} as const;

/** Border colors for the light theme. */
const borderLight = {
  border: '#dadce0',
} as const;

/** Border colors for the dark theme. */
const borderDark = {
  border: '#3c4043',
} as const;

/** Text colors for the light theme (primary, muted, inverse). */
const textLight = {
  text: '#202124',
  textMuted: '#5f6368',
  textInverse: '#e8eaed',
} as const;

/** Text colors for the dark theme (primary, muted, inverse). */
const textDark = {
  text: '#e8eaed',
  textMuted: '#9aa0a6',
  textInverse: '#202124',
} as const;

/** Control colors for the light theme (switch thumbs, slider handles, etc.). */
const controlLight = {
  controlThumb: '#ffffff',
} as const;

/** Control colors for the dark theme (switch thumbs, slider handles, etc.). */
const controlDark = {
  controlThumb: '#e8eaed',
} as const;

/** Effect colors for the light theme (box shadows, focus ring outlines). */
const effectLight = {
  shadow: '0 1px 3px rgba(60, 64, 67, 0.15), 0 1px 2px rgba(60, 64, 67, 0.1)',
  focus: '0 0 0 2px rgba(26, 115, 232, 0.4)',
} as const;

/** Effect colors for the dark theme (box shadows, focus ring outlines). */
const effectDark = {
  shadow: '0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.25)',
  focus: '0 0 0 2px rgba(138, 180, 248, 0.4)',
} as const;

/** Alert semantic colors for the light theme (info, success, danger, warning). */
const alertLight = {
  info: {
    bg: '#e8f0fe',
    border: '#aecbfa',
    text: '#174ea6',
  },
  success: {
    bg: '#e6f4ea',
    border: '#a8dab5',
    text: '#137333',
  },
  danger: {
    bg: '#fce8e6',
    border: '#f5b7b1',
    text: '#c5221f',
  },
  warning: {
    bg: '#fef7e0',
    border: '#fdd663',
    text: '#ea8600',
  },
} as const;

/** Alert semantic colors for the dark theme (info, success, danger, warning). */
const alertDark = {
  info: {
    bg: '#303c4d',
    border: '#8ab4f8',
    text: '#d2e3fc',
  },
  success: {
    bg: '#2d4a37',
    border: '#81c995',
    text: '#ceead6',
  },
  danger: {
    bg: '#4a2828',
    border: '#f28b82',
    text: '#f5c6c2',
  },
  warning: {
    bg: '#4a3f20',
    border: '#fdd663',
    text: '#fef7e0',
  },
} as const;

/** Badge semantic colors for the light theme (primary, success, danger, warning, neutral). */
const badgeLight = {
  primary: {
    bg: '#e8f0fe',
    border: '#aecbfa',
  },
  success: {
    bg: '#e6f4ea',
    border: '#a8dab5',
  },
  danger: {
    bg: '#fce8e6',
    border: '#f5b7b1',
  },
  warning: {
    bg: '#fef7e0',
    border: '#fdd663',
  },
  neutral: {
    bg: '#f1f3f4',
    border: '#dadce0',
  },
} as const;

/** Badge semantic colors for the dark theme (primary, success, danger, warning, neutral). */
const badgeDark = {
  primary: {
    bg: '#394457',
    border: '#5c8bc4',
  },
  success: {
    bg: '#2d4a37',
    border: '#5b9a6e',
  },
  danger: {
    bg: '#4a2828',
    border: '#b86c6c',
  },
  warning: {
    bg: '#4a3f20',
    border: '#c4a84a',
  },
  neutral: {
    bg: '#3c4043',
    border: '#5f6368',
  },
} as const;

/** Complete light theme color set, composed from all semantic groups. */
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

/** Complete dark theme color set, composed from all semantic groups. */
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

/** Top-level color map containing both light and dark theme variants. */
export const colors = {
  light: lightColors,
  dark: darkColors,
} as const;

/** Inferred type of the complete light color set. */
export type LightColors = typeof lightColors;
/** Inferred type of the complete dark color set. */
export type DarkColors = typeof darkColors;
/** Inferred type of the combined color map with both variants. */
export type ThemeColors = typeof colors;

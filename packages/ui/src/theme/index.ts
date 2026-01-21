// packages/ui/src/theme/index.ts
export { colors, darkColors, lightColors } from './colors';
export {
  DEFAULT_CONTRAST_MODE,
  getContrastCssVariables,
  highContrastDarkOverrides,
  highContrastLightOverrides,
} from './contrast';
export {
  DEFAULT_DENSITY,
  densityMultipliers,
  getDensityCssVariables,
  getSpacingForDensity,
} from './density';
export { motion } from './motion';
export { ThemeProvider, useTheme } from './provider';
export { radius } from './radius';
export { spacing } from './spacing';
export { typography } from './typography';

export type { DarkColors, LightColors, ThemeColors } from './colors';
export type { ContrastMode } from './contrast';
export type { Density } from './density';
export type { ThemeContextValue, ThemeProviderProps } from './provider';
export type { Radius } from './radius';

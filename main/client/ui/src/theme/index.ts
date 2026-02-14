// main/client/ui/src/theme/index.ts
export { colors, darkColors, lightColors } from './colors';
export {
  DEFAULT_CONTRAST_MODE,
  DEFAULT_DENSITY,
  densityMultipliers,
  getContrastCssVariables,
  getDensityCssVariables,
  getSpacingForDensity,
  highContrastDarkOverrides,
  highContrastLightOverrides,
} from '@abe-stack/shared';
export { motion } from './motion';
export { ThemeProvider, useTheme } from './provider';
export { radius } from './radius';
export { spacing } from './spacing';
export { typography } from './typography';

export type { DarkColors, LightColors, ThemeColors } from './colors';
export type { ContrastMode, Density } from '@abe-stack/shared';
export type { ThemeContextValue, ThemeProviderProps } from './provider';
export type { Radius } from './radius';

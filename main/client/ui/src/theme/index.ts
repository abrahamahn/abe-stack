// main/client/ui/src/theme/index.ts
export {
  DEFAULT_CONTRAST_MODE,
  DEFAULT_DENSITY,
  densityMultipliers,
  getContrastCssVariables,
  getDensityCssVariables,
  getSpacingForDensity,
  highContrastDarkOverrides,
  highContrastLightOverrides
} from '@bslt/client-engine';
export { colors, darkColors, lightColors } from './colors';
export { motion } from './motion';
export { ThemeProvider, useTheme } from './provider';
export { radius } from './radius';
export { spacing } from './spacing';
export { typography } from './typography';

export type { ContrastMode, Density } from '@bslt/client-engine';
export type { DarkColors, LightColors, ThemeColors } from './colors';
export type { ThemeContextValue, ThemeProviderProps } from './provider';
export type { Radius } from './radius';


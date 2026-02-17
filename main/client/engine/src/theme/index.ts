// main/client/engine/src/theme/index.ts

export {
  getContrastCssVariables,
  highContrastDarkOverrides,
  highContrastLightOverrides,
  type ContrastMode
} from './contrast';

// Re-exporting DEFAULT_CONTRAST_MODE directly here if it was missing in contrast.ts
export const DEFAULT_CONTRAST_MODE: import('./contrast').ContrastMode = 'system';

export {
  DEFAULT_DENSITY,
  densityMultipliers,
  getDensityCssVariables,
  getSpacingForDensity,
  type Density
} from './density';


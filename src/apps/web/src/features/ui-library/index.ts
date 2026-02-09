// src/apps/web/src/features/ui-library/index.ts
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';
export {
  KEYBOARD_SHORTCUTS,
  useUILibraryPageModel,
  useUILibraryKeyboard,
  useUILibraryPanes,
  useUILibraryTheme,
} from './hooks';
export type { ThemeMode } from './hooks';
export { UILibraryPage } from './UILibraryPage';
export type {
  ComponentCategory,
  ComponentDemo,
  ComponentVariant,
  UILibraryPaneConfig,
} from './types';

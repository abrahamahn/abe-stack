// apps/web/src/features/ui-library/index.ts
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';
export {
  KEYBOARD_SHORTCUTS,
  useUILibraryKeyboard,
  useUILibraryPanes,
  useUILibraryTheme,
} from './hooks';
export type { ThemeMode } from './hooks';
export { UILibraryPage, SidePeekUILibraryPage } from './pages';
export type {
  ComponentCategory,
  ComponentDemo,
  ComponentVariant,
  UILibraryPaneConfig,
} from './types';

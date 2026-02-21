// main/apps/web/src/features/ui-library/index.ts

// Components
export {
  SidePeekUILibraryContent,
  UILibraryComponentList,
  UILibraryPreviewArea,
} from './components';

// Catalog
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';

// Hooks
export { useUILibraryPanes, useUILibraryTheme } from './hooks';
export type { ThemeMode } from './hooks';

// Pages
export { UILibraryPage } from './UILibraryPage';

// Types
export type {
  ComponentCategory,
  ComponentDemo,
  ComponentVariant,
  UILibraryPaneConfig,
} from './types';

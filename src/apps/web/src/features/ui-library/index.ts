// src/apps/web/src/features/ui-library/index.ts

// Components
export { SidePeekUILibraryContent } from './components/SidePeekUILibraryContent';
export { UILibraryComponentList } from './components/UILibraryComponentList';
export { UILibraryPreviewArea } from './components/UILibraryPreviewArea';

// Catalog
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog/catalog';

// Hooks
export { useUILibraryPanes } from './hooks/useUILibraryPanes';
export { useUILibraryTheme, type ThemeMode } from './hooks/useUILibraryTheme';

// Pages
export { UILibraryPage } from './UILibraryPage';

// Types
export type {
  ComponentCategory,
  ComponentDemo,
  ComponentVariant,
  UILibraryPaneConfig,
} from './types';

// apps/web/src/features/demo/index.ts
// @auto-generated - Do not edit manually

export {
  clearCategoryCache,
  componentCatalog,
  getAllCategories,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getComponentsByCategory,
  getLoadedComponentCount,
  getTotalComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} from './catalog';
export { DemoComponentList, DemoDocContent, DemoPreviewArea } from './components';
export {
  KEYBOARD_SHORTCUTS,
  type ThemeMode,
  useDemoKeyboard,
  useDemoPanes,
  useDemoTheme,
  useLazyCatalog,
} from './hooks';
export { DemoPage } from './pages';
export type { ComponentCategory, ComponentDemo, ComponentVariant, DemoPaneConfig } from './types';
export {
  clearDocsCache,
  getComponentDocs,
  getComponentDocsLazy,
  parseMarkdown,
  parseMarkdownLazy,
} from './utils';

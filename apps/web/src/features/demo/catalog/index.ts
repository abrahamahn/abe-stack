// apps/web/src/features/demo/catalog/index.ts
// Note: Individual catalogs (componentCatalog, elementCatalog, layoutCatalog) are not
// exported eagerly to enable proper code-splitting via lazyRegistry.ts.
// Tests can import directly from the catalog files if needed.

// Re-export lazy loading functions
export {
  clearCategoryCache,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getLoadedComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} from './lazyRegistry';

// Re-export types
export type { ComponentCategory, ComponentDemo, ComponentVariant } from '@demo/types';

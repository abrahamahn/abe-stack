// src/apps/web/src/features/ui-library/catalog/index.ts
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';
export { componentCatalog } from './componentCatalog';
export { elementCatalog } from './elementCatalog';
export { layoutCatalog } from './layoutCatalog';
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

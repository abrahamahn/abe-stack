// apps/web/src/features/demo/catalog/index.ts
import { componentCatalog as components } from '@demo/catalog/componentCatalog';
import { elementCatalog as elements } from '@demo/catalog/elementCatalog';
import { layoutCatalog as layouts } from '@demo/catalog/layoutCatalog';

import type { ComponentDemo } from '@demo/types';

// Combine all catalogs into a single catalog (eager loading - for backwards compatibility)
export const componentCatalog: Record<string, ComponentDemo> = {
  ...components,
  ...elements,
  ...layouts,
};

export const getComponentsByCategory = (category: string): ComponentDemo[] => {
  return Object.values(componentCatalog).filter((comp) => comp.category === category);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(Object.values(componentCatalog).map((comp) => comp.category)));
};

export const getTotalComponentCount = (): number => {
  return Object.keys(componentCatalog).length;
};

// Lazy loading exports
export {
  clearCategoryCache,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getLoadedComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} from '@demo/catalog/lazyRegistry';

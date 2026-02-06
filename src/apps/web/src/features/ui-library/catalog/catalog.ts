// apps/web/src/features/ui-library/catalog/catalog.ts
import { componentCatalog as components } from './componentCatalog';
import { elementCatalog as elements } from './elementCatalog';
import { layoutCatalog as layouts } from './layoutCatalog';

import type { ComponentDemo } from '../types';

// Combine all catalogs into a single catalog
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

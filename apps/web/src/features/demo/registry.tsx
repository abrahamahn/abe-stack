// apps/web/src/features/demo/registry.tsx
import { componentRegistry as components } from './registry/componentRegistry';
import { elementRegistry as elements } from './registry/elementRegistry';
import { layoutRegistry as layouts } from './registry/layoutRegistry';

import type { ComponentDemo } from './types';

// Combine all registries into a single registry
export const componentRegistry: Record<string, ComponentDemo> = {
  ...components,
  ...elements,
  ...layouts,
};

export const getComponentsByCategory = (category: string): ComponentDemo[] => {
  return Object.values(componentRegistry).filter((comp) => comp.category === category);
};

export const getAllCategories = (): string[] => {
  return Array.from(new Set(Object.values(componentRegistry).map((comp) => comp.category)));
};

export const getTotalComponentCount = (): number => {
  return Object.keys(componentRegistry).length;
};

// apps/web/src/features/demo/catalog/lazyRegistry.ts
import { getAllCategories, getComponentsByCategory } from './index';

import type { ComponentCategory, ComponentDemo } from '@demo/types';

// Cache for loaded categories
const categoryCache: Map<ComponentCategory, ComponentDemo[]> = new Map();

/**
 * Get all available categories
 */
export function getAvailableCategories(): ComponentCategory[] {
  return getAllCategories() as ComponentCategory[];
}

/**
 * Get cached category data (synchronous)
 * Returns null if category is not cached
 */
export function getCachedCategory(category: ComponentCategory): ComponentDemo[] | null {
  return categoryCache.get(category) ?? null;
}

/**
 * Get the total count of loaded components
 */
export function getLoadedComponentCount(): number {
  return Array.from(categoryCache.values()).reduce(
    (total, components) => total + components.length,
    0,
  );
}

/**
 * Load a category (simulates lazy loading)
 * In a real app, this could fetch from an API
 */
export async function loadCategory(category: ComponentCategory): Promise<ComponentDemo[]> {
  // Check cache first
  const cached = categoryCache.get(category);
  if (cached) {
    return cached;
  }

  // Simulate network delay for lazy loading effect
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Get components for the category
  const components = getComponentsByCategory(category);

  // Cache the result
  categoryCache.set(category, components);

  return components;
}

/**
 * Preload multiple categories in parallel
 */
export async function preloadCategories(categories: ComponentCategory[]): Promise<void> {
  await Promise.all(categories.map((cat) => loadCategory(cat)));
}

/**
 * Clear the category cache
 */
export function clearCategoryCache(): void {
  categoryCache.clear();
}

/**
 * Check if a category is loaded
 */
export function isCategoryLoaded(category: ComponentCategory): boolean {
  return categoryCache.has(category);
}

/**
 * Get the state of a category (loading, loaded, error)
 */
export function getCategoryState(category: ComponentCategory): 'not-loaded' | 'loaded' {
  return categoryCache.has(category) ? 'loaded' : 'not-loaded';
}

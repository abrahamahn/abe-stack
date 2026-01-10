// apps/web/src/features/demo/catalog/lazyRegistry.ts
import type { ComponentCategory, ComponentDemo } from '../types';

type CategoryLoader = () => Promise<Record<string, ComponentDemo>>;

type CategoryCache = {
  components: ComponentDemo[] | null;
  loading: boolean;
  error: Error | null;
};

// Cache for loaded categories
const categoryCache = new Map<ComponentCategory, CategoryCache>();

// Category loaders using dynamic imports for code-splitting
const categoryLoaders: Record<ComponentCategory, CategoryLoader> = {
  elements: () => import('./elementCatalog').then((m) => m.elementCatalog),
  components: () => import('./componentCatalog').then((m) => m.componentCatalog),
  layouts: () => import('./layoutCatalog').then((m) => m.layoutCatalog),
  hooks: () => Promise.resolve({}),
  theme: () => Promise.resolve({}),
  utils: () => Promise.resolve({}),
};

// Available categories (static - no async needed)
const AVAILABLE_CATEGORIES: ComponentCategory[] = ['elements', 'components', 'layouts'];

/**
 * Get list of available categories (synchronous)
 */
export function getAvailableCategories(): ComponentCategory[] {
  return AVAILABLE_CATEGORIES;
}

/**
 * Check if a category is currently loaded
 */
export function isCategoryLoaded(category: ComponentCategory): boolean {
  return categoryCache.get(category)?.components != null;
}

/**
 * Get cached components for a category (returns null if not loaded)
 */
export function getCachedCategory(category: ComponentCategory): ComponentDemo[] | null {
  return categoryCache.get(category)?.components ?? null;
}

/**
 * Load a category lazily with caching
 */
export async function loadCategory(category: ComponentCategory): Promise<ComponentDemo[]> {
  const cached = categoryCache.get(category);

  // Return cached if available
  if (cached?.components) {
    return cached.components;
  }

  // Check if already loading
  if (cached?.loading) {
    // Wait for existing load to complete
    return new Promise((resolve, reject) => {
      const checkCache = (): void => {
        const current = categoryCache.get(category);
        if (current?.components) {
          resolve(current.components);
        } else if (current?.error) {
          reject(current.error);
        } else {
          setTimeout(checkCache, 10);
        }
      };
      checkCache();
    });
  }

  // Set loading state
  categoryCache.set(category, { components: null, loading: true, error: null });

  try {
    const loader = categoryLoaders[category];
    const catalog = await loader();
    const components = Object.values(catalog);

    categoryCache.set(category, { components, loading: false, error: null });
    return components;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    categoryCache.set(category, { components: null, loading: false, error: err });
    throw err;
  }
}

/**
 * Preload multiple categories in parallel
 */
export async function preloadCategories(categories: ComponentCategory[]): Promise<void> {
  await Promise.all(categories.map(loadCategory));
}

/**
 * Get category loading state
 */
export function getCategoryState(category: ComponentCategory): {
  loaded: boolean;
  loading: boolean;
  error: Error | null;
} {
  const cached = categoryCache.get(category);
  return {
    loaded: cached?.components != null,
    loading: cached?.loading ?? false,
    error: cached?.error ?? null,
  };
}

/**
 * Clear cache for a category (useful for testing/hot reload)
 */
export function clearCategoryCache(category?: ComponentCategory): void {
  if (category) {
    categoryCache.delete(category);
  } else {
    categoryCache.clear();
  }
}

/**
 * Get total component count across all loaded categories
 */
export function getLoadedComponentCount(): number {
  let count = 0;
  for (const cached of categoryCache.values()) {
    if (cached.components) {
      count += cached.components.length;
    }
  }
  return count;
}

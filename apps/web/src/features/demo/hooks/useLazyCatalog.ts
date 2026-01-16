// apps/web/src/features/demo/hooks/useLazyCatalog.ts
import {
  getAvailableCategories,
  getCachedCategory,
  getLoadedComponentCount,
  loadCategory,
} from '@catalog/lazyRegistry';
import { useCallback, useEffect, useState } from 'react';

import type { ComponentCategory, ComponentDemo } from '@demo/types';

type UseLazyCatalogResult = {
  /** Components for the active category */
  components: ComponentDemo[];
  /** Whether the category is currently loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** All available categories */
  categories: ComponentCategory[];
  /** Currently active category */
  activeCategory: ComponentCategory;
  /** Set the active category (triggers lazy load if needed) */
  setActiveCategory: (category: ComponentCategory) => void;
  /** Total count of loaded components */
  totalLoaded: number;
  /** Preload a category in the background */
  preload: (category: ComponentCategory) => void;
};

/**
 * Hook for lazy loading component catalog by category
 *
 * @param initialCategory - The initial category to load (defaults to 'elements')
 * @returns Lazy catalog state and controls
 *
 * @example
 * ```tsx
 * function DemoPage() {
 *   const {
 *     components,
 *     isLoading,
 *     categories,
 *     activeCategory,
 *     setActiveCategory,
 *   } = useLazyCatalog('elements');
 *
 *   return (
 *     <div>
 *       {categories.map(cat => (
 *         <button key={cat} onClick={() => setActiveCategory(cat)}>
 *           {cat}
 *         </button>
 *       ))}
 *       {isLoading ? <Spinner /> : (
 *         components.map(comp => <ComponentCard key={comp.id} {...comp} />)
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyCatalog(
  initialCategory: ComponentCategory = 'elements',
): UseLazyCatalogResult {
  const [activeCategory, setActiveCategoryState] = useState<ComponentCategory>(initialCategory);
  const [components, setComponents] = useState<ComponentDemo[]>(() => {
    // Try to get from cache synchronously on initial render
    return getCachedCategory(initialCategory) ?? [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => {
    // If we have cached data, we're not loading
    return getCachedCategory(initialCategory) === null;
  });
  const [error, setError] = useState<Error | null>(null);
  const [totalLoaded, setTotalLoaded] = useState<number>(getLoadedComponentCount);

  // Load category data
  const loadCategoryData = useCallback(async (category: ComponentCategory): Promise<void> => {
    // Check cache first
    const cached = getCachedCategory(category);
    if (cached) {
      setComponents(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await loadCategory(category);
      setComponents(data);
      setTotalLoaded(getLoadedComponentCount());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setComponents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load initial category
  useEffect(() => {
    void loadCategoryData(activeCategory);
  }, [activeCategory, loadCategoryData]);

  // Set active category (public API)
  const setActiveCategory = useCallback(
    (category: ComponentCategory): void => {
      if (category !== activeCategory) {
        setActiveCategoryState(category);
      }
    },
    [activeCategory],
  );

  // Preload a category in background
  const preload = useCallback((category: ComponentCategory): void => {
    // Don't preload if already cached
    if (getCachedCategory(category)) return;

    // Fire and forget - just populate cache
    void loadCategory(category).then(() => {
      setTotalLoaded(getLoadedComponentCount());
    });
  }, []);

  return {
    components,
    isLoading,
    error,
    categories: getAvailableCategories(),
    activeCategory,
    setActiveCategory,
    totalLoaded,
    preload,
  };
}

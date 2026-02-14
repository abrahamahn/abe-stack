// main/apps/web/src/features/ui-library/catalog/lazyRegistry.test.ts
import { afterEach, beforeEach, describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  clearCategoryCache,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getLoadedComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} from './lazyRegistry';

import type { ComponentCategory } from '@ui-library/types';

// ============================================================================
// Test Setup
// ============================================================================

describe('lazyRegistry', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCategoryCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================================================
  // getAvailableCategories
  // ==========================================================================

  describe('getAvailableCategories', () => {
    it('should return all available categories', () => {
      const categories = getAvailableCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should return categories as ComponentCategory type', () => {
      const categories = getAvailableCategories();
      const validCategories: ComponentCategory[] = [
        'elements',
        'components',
        'hooks',
        'layouts',
        'theme',
        'utils',
      ];

      categories.forEach((category) => {
        expect(validCategories).toContain(category);
      });
    });
  });

  // ==========================================================================
  // getCachedCategory
  // ==========================================================================

  describe('getCachedCategory', () => {
    it('should return null for uncached category', () => {
      const result = getCachedCategory('elements');

      expect(result).toBeNull();
    });

    it('should return cached data after loading', async () => {
      // Load the category first (real timers, actual 50ms delay)
      await loadCategory('elements');

      const result = getCachedCategory('elements');

      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ==========================================================================
  // getLoadedComponentCount
  // ==========================================================================

  describe('getLoadedComponentCount', () => {
    it('should return 0 when no categories are loaded', () => {
      const count = getLoadedComponentCount();

      expect(count).toBe(0);
    });

    it('should return count of loaded components', async () => {
      // Load a category
      await loadCategory('elements');

      const count = getLoadedComponentCount();

      expect(count).toBeGreaterThan(0);
    });

    it('should accumulate count across multiple loaded categories', async () => {
      // Load first category
      await loadCategory('elements');
      const firstCount = getLoadedComponentCount();

      // Load second category
      await loadCategory('components');
      const secondCount = getLoadedComponentCount();

      expect(secondCount).toBeGreaterThanOrEqual(firstCount);
    });
  });

  // ==========================================================================
  // loadCategory
  // ==========================================================================

  describe('loadCategory', () => {
    it('should load components for a category', async () => {
      const components = await loadCategory('elements');

      expect(Array.isArray(components)).toBe(true);
      components.forEach((component) => {
        expect(component.category).toBe('elements');
      });
    });

    it('should cache loaded components', async () => {
      // First load
      const firstLoad = await loadCategory('elements');

      // Second load should return cached - same reference
      const secondLoad = await loadCategory('elements');

      expect(secondLoad).toBe(firstLoad);
    });

    it('should return array for any valid category', async () => {
      const categories = getAvailableCategories();
      expect(categories.length).toBeGreaterThan(0);

      const validCategory = categories[0] as ComponentCategory;
      const components = await loadCategory(validCategory);

      expect(Array.isArray(components)).toBe(true);
    });

    it('should have async behavior', async () => {
      // Verify the function returns a promise
      const result = loadCategory('elements');

      expect(result).toBeInstanceOf(Promise);

      // Wait for it to resolve
      await result;
    });
  });

  // ==========================================================================
  // preloadCategories
  // ==========================================================================

  describe('preloadCategories', () => {
    it('should preload multiple categories in parallel', async () => {
      const categories: ComponentCategory[] = ['elements', 'components'];

      await preloadCategories(categories);

      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);
    });

    it('should handle empty array', async () => {
      await preloadCategories([]);

      expect(getLoadedComponentCount()).toBe(0);
    });

    it('should skip already loaded categories efficiently', async () => {
      // Load elements first
      await loadCategory('elements');

      // Preload including already loaded category
      await preloadCategories(['elements', 'components']);

      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);
    });
  });

  // ==========================================================================
  // clearCategoryCache
  // ==========================================================================

  describe('clearCategoryCache', () => {
    it('should clear all cached categories', async () => {
      // Load some categories
      await loadCategory('elements');

      expect(isCategoryLoaded('elements')).toBe(true);

      // Clear cache
      clearCategoryCache();

      expect(isCategoryLoaded('elements')).toBe(false);
      expect(getLoadedComponentCount()).toBe(0);
    });
  });

  // ==========================================================================
  // isCategoryLoaded
  // ==========================================================================

  describe('isCategoryLoaded', () => {
    it('should return false for unloaded category', () => {
      expect(isCategoryLoaded('elements')).toBe(false);
    });

    it('should return true for loaded category', async () => {
      await loadCategory('elements');

      expect(isCategoryLoaded('elements')).toBe(true);
    });
  });

  // ==========================================================================
  // getCategoryState
  // ==========================================================================

  describe('getCategoryState', () => {
    it('should return not-loaded for unloaded category', () => {
      const state = getCategoryState('elements');

      expect(state).toBe('not-loaded');
    });

    it('should return loaded for loaded category', async () => {
      await loadCategory('elements');

      const state = getCategoryState('elements');

      expect(state).toBe('loaded');
    });
  });

  // ==========================================================================
  // Integration tests
  // ==========================================================================

  describe('integration', () => {
    it('should handle full lifecycle: load, cache, clear', async () => {
      // Initial state
      expect(isCategoryLoaded('elements')).toBe(false);
      expect(getCategoryState('elements')).toBe('not-loaded');
      expect(getLoadedComponentCount()).toBe(0);

      // Load
      const components = await loadCategory('elements');
      expect(components.length).toBeGreaterThan(0);

      // Verify cached
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(getCategoryState('elements')).toBe('loaded');
      expect(getCachedCategory('elements')).toBe(components);
      expect(getLoadedComponentCount()).toBe(components.length);

      // Clear
      clearCategoryCache();
      expect(isCategoryLoaded('elements')).toBe(false);
      expect(getCategoryState('elements')).toBe('not-loaded');
      expect(getCachedCategory('elements')).toBeNull();
      expect(getLoadedComponentCount()).toBe(0);
    });

    it('should return consistent results from cache', async () => {
      const firstLoad = await loadCategory('layouts');
      const secondLoad = await loadCategory('layouts');
      const cached = getCachedCategory('layouts');

      // All should be the same reference
      expect(firstLoad).toBe(secondLoad);
      expect(firstLoad).toBe(cached);
    });
  });
});

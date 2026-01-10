// apps/web/src/features/demo/catalog/__tests__/lazyRegistry.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentDemo } from '../../types';

// Mock the catalog imports BEFORE importing the module under test
const mockElementCatalog: Record<string, ComponentDemo> = {
  button: {
    id: 'button',
    name: 'Button',
    category: 'elements',
    description: 'A button',
    variants: [],
  },
};

const mockComponentCatalog: Record<string, ComponentDemo> = {
  card: {
    id: 'card',
    name: 'Card',
    category: 'components',
    description: 'A card',
    variants: [],
  },
};

const mockLayoutCatalog: Record<string, ComponentDemo> = {
  container: {
    id: 'container',
    name: 'Container',
    category: 'layouts',
    description: 'A container',
    variants: [],
  },
};

vi.mock('../elementCatalog', () => ({
  elementCatalog: mockElementCatalog,
}));

vi.mock('../componentCatalog', () => ({
  componentCatalog: mockComponentCatalog,
}));

vi.mock('../layoutCatalog', () => ({
  layoutCatalog: mockLayoutCatalog,
}));

// Import after mocks are set up
const {
  clearCategoryCache,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getLoadedComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} = await import('../lazyRegistry');

describe('lazyRegistry', () => {
  // Clear cache before and after each test to ensure isolation
  beforeEach(() => {
    clearCategoryCache();
  });

  afterEach(() => {
    clearCategoryCache();
  });

  describe('getAvailableCategories', () => {
    it('returns the list of available categories', () => {
      const categories = getAvailableCategories();
      expect(categories).toContain('elements');
      expect(categories).toContain('components');
      expect(categories).toContain('layouts');
    });
  });

  describe('loadCategory', () => {
    it('loads elements category', async () => {
      const components = await loadCategory('elements');
      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.id === 'button')).toBe(true);
    });

    it('loads components category', async () => {
      const components = await loadCategory('components');
      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.id === 'card')).toBe(true);
    });

    it('loads layouts category', async () => {
      const components = await loadCategory('layouts');
      expect(components.length).toBeGreaterThan(0);
      expect(components.some((c) => c.id === 'container')).toBe(true);
    });

    it('returns same data on subsequent calls (caching)', async () => {
      const first = await loadCategory('elements');
      const second = await loadCategory('elements');
      expect(first).toBe(second);
    });

    it('returns empty array for empty categories', async () => {
      const components = await loadCategory('hooks');
      expect(components).toEqual([]);
    });
  });

  describe('getCategoryState', () => {
    it('returns loaded state after successful load', async () => {
      await loadCategory('elements');
      const state = getCategoryState('elements');
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('returns unloaded state before loading', () => {
      const state = getCategoryState('elements');
      expect(state.loaded).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('isCategoryLoaded', () => {
    it('returns true after category is loaded', async () => {
      await loadCategory('elements');
      expect(isCategoryLoaded('elements')).toBe(true);
    });

    it('returns false before category is loaded', () => {
      expect(isCategoryLoaded('elements')).toBe(false);
    });
  });

  describe('getCachedCategory', () => {
    it('returns cached components after loading', async () => {
      await loadCategory('elements');
      const cached = getCachedCategory('elements');
      expect(cached).not.toBeNull();
      expect(cached?.some((c) => c.id === 'button')).toBe(true);
    });

    it('returns null before loading', () => {
      const cached = getCachedCategory('elements');
      expect(cached).toBeNull();
    });
  });

  describe('preloadCategories', () => {
    it('preloads multiple categories in parallel', async () => {
      await preloadCategories(['elements', 'components']);
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);
    });
  });

  describe('getLoadedComponentCount', () => {
    it('returns 0 when no categories loaded', () => {
      expect(getLoadedComponentCount()).toBe(0);
    });

    it('returns count after loading categories', async () => {
      await loadCategory('elements');
      await loadCategory('components');
      expect(getLoadedComponentCount()).toBeGreaterThan(0);
    });
  });

  describe('clearCategoryCache', () => {
    it('clears specific category cache', async () => {
      // Load both categories
      await loadCategory('elements');
      await loadCategory('components');
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);

      // Clear only elements
      clearCategoryCache('elements');
      expect(isCategoryLoaded('elements')).toBe(false);
      expect(isCategoryLoaded('components')).toBe(true);
    });

    it('clears all caches when called without argument', async () => {
      await loadCategory('elements');
      await loadCategory('components');
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);

      clearCategoryCache();
      expect(isCategoryLoaded('elements')).toBe(false);
      expect(isCategoryLoaded('components')).toBe(false);
    });

    it('allows reloading after clearing', async () => {
      // Load category
      await loadCategory('elements');
      expect(isCategoryLoaded('elements')).toBe(true);

      // Clear and verify
      clearCategoryCache('elements');
      expect(isCategoryLoaded('elements')).toBe(false);

      // Should be able to reload
      await loadCategory('elements');
      expect(isCategoryLoaded('elements')).toBe(true);
    });
  });
});

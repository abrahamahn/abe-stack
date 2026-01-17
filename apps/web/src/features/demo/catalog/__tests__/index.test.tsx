// apps/web/src/features/demo/catalog/__tests__/index.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearCategoryCache,
  getAvailableCategories,
  getCachedCategory,
  getCategoryState,
  getLoadedComponentCount,
  isCategoryLoaded,
  loadCategory,
  preloadCategories,
} from '../index';

import type { ComponentCategory, ComponentDemo } from '@demo/types';

describe('Catalog Index (Lazy Loading)', () => {
  afterEach(() => {
    clearCategoryCache();
  });

  describe('getAvailableCategories', () => {
    it('returns an array of categories', () => {
      const categories = getAvailableCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('includes expected categories', () => {
      const categories = getAvailableCategories();
      expect(categories).toContain('elements');
      expect(categories).toContain('components');
      expect(categories).toContain('layouts');
    });
  });

  describe('loadCategory', () => {
    it('loads components category', async () => {
      const components = await loadCategory('components');
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
      components.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('components');
      });
    });

    it('loads elements category', async () => {
      const elements = await loadCategory('elements');
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
      elements.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('elements');
      });
    });

    it('loads layouts category', async () => {
      const layouts = await loadCategory('layouts');
      expect(Array.isArray(layouts)).toBe(true);
      expect(layouts.length).toBeGreaterThan(0);
      layouts.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('layouts');
      });
    });

    it('caches loaded categories', async () => {
      await loadCategory('elements');
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(getCachedCategory('elements')).not.toBeNull();
    });

    it('returns cached data on subsequent calls', async () => {
      const first = await loadCategory('elements');
      const second = await loadCategory('elements');
      expect(first).toBe(second); // Same reference
    });
  });

  describe('preloadCategories', () => {
    it('preloads multiple categories', async () => {
      await preloadCategories(['elements', 'components']);
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);
    });
  });

  describe('getCategoryState', () => {
    it('returns unloaded state initially', () => {
      const state = getCategoryState('elements');
      expect(state.loaded).toBe(false);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('returns loaded state after loading', async () => {
      await loadCategory('elements');
      const state = getCategoryState('elements');
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('getLoadedComponentCount', () => {
    it('returns 0 when no categories loaded', () => {
      expect(getLoadedComponentCount()).toBe(0);
    });

    it('returns count after loading categories', async () => {
      await loadCategory('elements');
      expect(getLoadedComponentCount()).toBeGreaterThan(0);
    });

    it('accumulates count across categories', async () => {
      await loadCategory('elements');
      const elementsCount = getLoadedComponentCount();

      await loadCategory('components');
      const totalCount = getLoadedComponentCount();

      expect(totalCount).toBeGreaterThan(elementsCount);
    });
  });

  describe('clearCategoryCache', () => {
    it('clears specific category', async () => {
      await loadCategory('elements');
      expect(isCategoryLoaded('elements')).toBe(true);

      clearCategoryCache('elements');
      expect(isCategoryLoaded('elements')).toBe(false);
    });

    it('clears all categories when no argument', async () => {
      await preloadCategories(['elements', 'components'] as ComponentCategory[]);
      expect(isCategoryLoaded('elements')).toBe(true);
      expect(isCategoryLoaded('components')).toBe(true);

      clearCategoryCache();
      expect(isCategoryLoaded('elements')).toBe(false);
      expect(isCategoryLoaded('components')).toBe(false);
    });
  });
});

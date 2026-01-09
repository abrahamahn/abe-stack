// apps/web/src/features/demo/catalog/__tests__/index.test.tsx
/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';

import {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from '../index';

import type { ComponentDemo } from '@demo/types';

describe('Catalog Index', () => {
  describe('componentCatalog', () => {
    it('exports a valid component catalog object', () => {
      expect(componentCatalog).toBeDefined();
      expect(typeof componentCatalog).toBe('object');
    });

    it('combines all catalog types', () => {
      const components = getComponentsByCategory('components');
      const elements = getComponentsByCategory('elements');
      const layouts = getComponentsByCategory('layouts');

      expect(components.length).toBeGreaterThan(0);
      expect(elements.length).toBeGreaterThan(0);
      expect(layouts.length).toBeGreaterThan(0);
    });
  });

  describe('getAllCategories', () => {
    it('returns an array of categories', () => {
      const categories = getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('returns unique categories', () => {
      const categories = getAllCategories();
      const uniqueCategories = [...new Set(categories)];
      expect(categories).toEqual(uniqueCategories);
    });

    it('includes expected categories', () => {
      const categories = getAllCategories();
      expect(categories).toContain('components');
      expect(categories).toContain('elements');
      expect(categories).toContain('layouts');
    });
  });

  describe('getComponentsByCategory', () => {
    it('returns components for "components" category', () => {
      const components = getComponentsByCategory('components');
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBeGreaterThan(0);
      components.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('components');
      });
    });

    it('returns components for "elements" category', () => {
      const elements = getComponentsByCategory('elements');
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);
      elements.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('elements');
      });
    });

    it('returns components for "layouts" category', () => {
      const layouts = getComponentsByCategory('layouts');
      expect(Array.isArray(layouts)).toBe(true);
      expect(layouts.length).toBeGreaterThan(0);
      layouts.forEach((component: ComponentDemo) => {
        expect(component.category).toBe('layouts');
      });
    });

    it('returns empty array for invalid category', () => {
      const components = getComponentsByCategory('nonexistent');
      expect(Array.isArray(components)).toBe(true);
      expect(components.length).toBe(0);
    });
  });

  describe('getTotalComponentCount', () => {
    it('returns the total count of all components', () => {
      const totalCount = getTotalComponentCount();
      expect(typeof totalCount).toBe('number');
      expect(totalCount).toBeGreaterThan(0);
    });

    it('equals the sum of all category counts', () => {
      const totalCount = getTotalComponentCount();
      const components = getComponentsByCategory('components');
      const elements = getComponentsByCategory('elements');
      const layouts = getComponentsByCategory('layouts');

      expect(totalCount).toBe(components.length + elements.length + layouts.length);
    });

    it('equals the number of keys in componentCatalog', () => {
      const totalCount = getTotalComponentCount();
      expect(totalCount).toBe(Object.keys(componentCatalog).length);
    });
  });
});

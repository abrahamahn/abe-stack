// apps/web/src/features/demo/catalog/catalog.test.ts
import { describe, expect, it, vi } from 'vitest';

import { getComponentsByCategory, getAllCategories, getTotalComponentCount } from './catalog';

vi.mock('./componentCatalog', () => ({
  componentCatalog: {
    comp1: { id: 'comp1', name: 'Comp1', category: 'cat1' },
    comp2: { id: 'comp2', name: 'Comp2', category: 'cat1' },
  },
}));

vi.mock('./elementCatalog', () => ({
  elementCatalog: {
    elem1: { id: 'elem1', name: 'Elem1', category: 'cat2' },
  },
}));

vi.mock('./layoutCatalog', () => ({
  layoutCatalog: {
    layout1: { id: 'layout1', name: 'Layout1', category: 'cat3' },
  },
}));

describe('catalog', () => {
  it('should get components by category', () => {
    const result = getComponentsByCategory('cat1');
    expect(result).toHaveLength(2);
  });

  it('should get all categories', () => {
    const result = getAllCategories();
    expect(result).toContain('cat1');
    expect(result).toContain('cat2');
    expect(result).toContain('cat3');
  });

  it('should get total component count', () => {
    const result = getTotalComponentCount();
    expect(result).toBe(4);
  });
});

// src/apps/web/src/features/home/data/docsMeta.test.ts
import { describe, expect, it } from 'vitest';

import { docCategories, docsMeta } from './docsMeta';

import type { DocCategory, DocKey } from '../types';

describe('docsMeta', () => {
  it('should have entries for all DocKey values', () => {
    const expectedKeys: DocKey[] = [
      'readme',
      'web',
      'desktop',
      'core',
      'ui',
      'architecture',
      'configSetup',
      'devEnvironment',
      'legacy',
      'performance',
      'principles',
      'security',
      'syncScripts',
      'testing',
      'logW01',
      'logW02',
      'logW03',
      'logW04',
    ];
    for (const key of expectedKeys) {
      expect(docsMeta[key]).toBeDefined();
      expect(docsMeta[key].label).toBeTruthy();
      expect(docsMeta[key].category).toBeTruthy();
    }
  });

  it('should have valid categories for all entries', () => {
    const validCategories: DocCategory[] = ['root', 'apps', 'packages', 'dev', 'logs'];
    for (const meta of Object.values(docsMeta)) {
      expect(validCategories).toContain(meta.category);
    }
  });

  it('should have non-empty labels for all entries', () => {
    for (const meta of Object.values(docsMeta)) {
      expect(meta.label.length).toBeGreaterThan(0);
    }
  });
});

describe('docCategories', () => {
  it('should have 5 categories', () => {
    expect(docCategories).toHaveLength(5);
  });

  it('should contain root, apps, packages, dev, logs in order', () => {
    expect(docCategories.map((c) => c.key)).toEqual(['root', 'apps', 'packages', 'dev', 'logs']);
  });

  it('should have labels for all categories', () => {
    for (const cat of docCategories) {
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });
});

// src/apps/web/src/features/home/data/docsMeta.test.ts
import { describe, expect, it } from 'vitest';

import { docCategories, docsMeta, loadDocContent } from './docsMeta';

describe('docsMeta', () => {
  it('should have at least one entry', () => {
    expect(Object.keys(docsMeta).length).toBeGreaterThan(0);
  });

  it('should include the root readme entry', () => {
    const readme = docsMeta['readme'];
    expect(readme).toBeDefined();
    expect(readme?.label).toBe('Readme');
    expect(readme?.category).toBe('root');
  });

  it('should include docs-level entries with docs- prefix', () => {
    const docsReadme = docsMeta['docs-readme'];
    expect(docsReadme).toBeDefined();
    expect(docsReadme?.category).toBe('docs');
  });

  it('should include nested entries with folder-file key', () => {
    const devTesting = docsMeta['dev-testing'];
    expect(devTesting).toBeDefined();
    expect(devTesting?.category).toBe('dev');
  });

  it('should have a label and category for every entry', () => {
    for (const [key, meta] of Object.entries(docsMeta)) {
      expect(meta.label.length, `${key} should have a non-empty label`).toBeGreaterThan(0);
      expect(meta.category.length, `${key} should have a non-empty category`).toBeGreaterThan(0);
    }
  });

  it('should have valid categories for all entries', () => {
    const validCategories = new Set(docCategories.map((c) => c.key));
    for (const [key, meta] of Object.entries(docsMeta)) {
      expect(
        validCategories.has(meta.category),
        `${key} has invalid category: ${meta.category}`,
      ).toBe(true);
    }
  });
});

describe('docCategories', () => {
  it('should have at least one category', () => {
    expect(docCategories.length).toBeGreaterThan(0);
  });

  it('should include root and dev categories', () => {
    const keys = docCategories.map((c) => c.key);
    expect(keys).toContain('root');
    expect(keys).toContain('dev');
  });

  it('should have labels for all categories', () => {
    for (const cat of docCategories) {
      expect(cat.label.length).toBeGreaterThan(0);
    }
  });
});

describe('loadDocContent', () => {
  it('should be a function', () => {
    expect(typeof loadDocContent).toBe('function');
  });

  it('should throw for unknown key', async () => {
    await expect(loadDocContent('nonexistent-key-xyz')).rejects.toThrow('Unknown doc key');
  });
});

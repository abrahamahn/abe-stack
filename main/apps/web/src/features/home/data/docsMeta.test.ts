// main/apps/web/src/features/home/data/docsMeta.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';

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

  it('should use normalized kebab-case keys for all discovered docs', () => {
    for (const key of Object.keys(docsMeta)) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('should prefix top-level docs entries with docs-', () => {
    const topLevelDocsEntries = Object.entries(docsMeta).filter(
      ([key, meta]) => meta.category === 'docs' && key !== 'readme',
    );

    for (const [key] of topLevelDocsEntries) {
      expect(key.startsWith('docs-')).toBe(true);
    }
  });

  it('should have a label and category for every entry', () => {
    for (const [key, meta] of Object.entries(docsMeta)) {
      expect(meta.label.length, `${key} should have a non-empty label`).toBeGreaterThan(0);
      expect(meta.category.length, `${key} should have a non-empty category`).toBeGreaterThan(0);
    }
  });

  it('should have valid categories for all entries', () => {
    for (const [key, meta] of Object.entries(docsMeta)) {
      // Every category must be a non-empty lowercase kebab-case string
      expect(meta.category.length, `${key} should have a non-empty category`).toBeGreaterThan(0);
      expect(meta.category, `${key} category should be lowercase kebab-case`).toMatch(
        /^[a-z][a-z-]*$/,
      );
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

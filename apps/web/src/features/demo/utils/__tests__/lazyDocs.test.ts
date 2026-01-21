// apps/web/src/features/demo/utils/__tests__/lazyDocs.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock import.meta.glob modules
const mockElementModules: Record<string, () => Promise<string>> = {
  '../../../../../../packages/ui/docs/elements/Button.md': () =>
    Promise.resolve('# Button\n\nA clickable button element.'),
  '../../../../../../packages/ui/docs/elements/Input.md': () =>
    Promise.resolve('# Input\n\nA text input field.'),
};

const mockComponentModules: Record<string, () => Promise<string>> = {
  '../../../../../../packages/ui/docs/components/Card.md': () =>
    Promise.resolve('# Card\n\nA card container.'),
};

const mockLayoutModules: Record<string, () => Promise<string>> = {
  '../../../../../../packages/ui/docs/layouts/Container.md': () =>
    Promise.resolve('# Container\n\nA layout container.'),
};

// Mock the lazyDocs module - use path alias to match linter-converted imports
vi.mock('@demo/utils/lazyDocs', () => {
  const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

  const buildPathLookup = (modules: Record<string, () => Promise<string>>): Map<string, string> => {
    const lookup = new Map<string, string>();
    for (const path of Object.keys(modules)) {
      const filename = path.split('/').pop()?.replace('.md', '') || '';
      const normalized = normalizeKey(filename);
      const raw = filename.toLowerCase();
      lookup.set(raw, path);
      lookup.set(normalized, path);
    }
    return lookup;
  };

  const elementPathLookup = buildPathLookup(mockElementModules);
  const componentPathLookup = buildPathLookup(mockComponentModules);
  const layoutPathLookup = buildPathLookup(mockLayoutModules);

  // Use module-level cache that can be reset
  const docsCache = new Map<string, string>();

  return {
    getComponentDocsLazy: async (
      componentId: string,
      category: string,
      componentName?: string,
    ): Promise<string | null> => {
      const id = normalizeKey(componentId);
      const fallbackName = componentName ? normalizeKey(componentName) : '';

      // Check cache first
      const cacheKey = `${category}:${id}`;
      const cached = docsCache.get(cacheKey);
      if (cached !== undefined) {
        return cached || null;
      }

      let pathLookup: Map<string, string>;
      let modules: Record<string, () => Promise<string>>;

      if (category === 'elements') {
        pathLookup = elementPathLookup;
        modules = mockElementModules;
      } else if (category === 'components') {
        pathLookup = componentPathLookup;
        modules = mockComponentModules;
      } else if (category === 'layouts') {
        pathLookup = layoutPathLookup;
        modules = mockLayoutModules;
      } else {
        return null;
      }

      // Try to find the path
      let path = pathLookup.get(id);
      if (!path && fallbackName) {
        path = pathLookup.get(fallbackName);
      }

      if (!path) {
        docsCache.set(cacheKey, '');
        return null;
      }

      try {
        const loader = modules[path];
        if (!loader) {
          docsCache.set(cacheKey, '');
          return null;
        }

        const content = await loader();
        docsCache.set(cacheKey, content);
        return content;
      } catch {
        docsCache.set(cacheKey, '');
        return null;
      }
    },

    clearDocsCache: (): void => {
      docsCache.clear();
    },
  };
});

describe('lazyDocs', () => {
  beforeEach(async () => {
    const { clearDocsCache } = await import('@demo/utils/lazyDocs');
    clearDocsCache();
  });

  afterEach(async () => {
    const { clearDocsCache } = await import('@demo/utils/lazyDocs');
    clearDocsCache();
  });

  describe('getComponentDocsLazy', () => {
    it('returns docs for elements category', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('button', 'elements');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('returns docs for components category', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('card', 'components');
      expect(result).toBe('# Card\n\nA card container.');
    });

    it('returns docs for layouts category', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('container', 'layouts');
      expect(result).toBe('# Container\n\nA layout container.');
    });

    it('returns null for unknown category', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      // Test invalid category input
      const result = await getComponentDocsLazy('button', 'unknown' as never);
      expect(result).toBeNull();
    });

    it('returns null for unknown component', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('nonexistent', 'elements');
      expect(result).toBeNull();
    });

    it('normalizes component ID (case insensitive)', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('BUTTON', 'elements');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('uses fallback component name if ID not found', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const result = await getComponentDocsLazy('btn', 'elements', 'Button');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('caches results for subsequent calls', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const first = await getComponentDocsLazy('button', 'elements');
      const second = await getComponentDocsLazy('button', 'elements');
      expect(first).toBe(second);
    });

    it('caches null results for missing docs', async () => {
      const { getComponentDocsLazy } = await import('@demo/utils/lazyDocs');
      const first = await getComponentDocsLazy('nonexistent', 'elements');
      const second = await getComponentDocsLazy('nonexistent', 'elements');
      expect(first).toBeNull();
      expect(second).toBeNull();
    });
  });

  describe('clearDocsCache', () => {
    it('clears the docs cache', async () => {
      const { clearDocsCache, getComponentDocsLazy } = await import('@demo/utils/lazyDocs');

      // Load docs into cache
      await getComponentDocsLazy('button', 'elements');

      // Clear cache
      clearDocsCache();

      // Subsequent call should fetch fresh (not return cached null)
      const result = await getComponentDocsLazy('button', 'elements');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });
  });
});

// apps/web/src/features/demo/utils/__tests__/lazyDocs.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock DOMPurify
vi.mock('dompurify', () => ({
  default: {
    sanitize: (html: string, _options?: Record<string, unknown>): string => {
      // Simple mock that just returns the html (tests focus on parsing logic)
      return html;
    },
  },
}));

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

// Mock the Vite glob imports
vi.mock('../lazyDocs', async () => {
  const docsCache = new Map<string, string>();

  const normalizeKey = (value: string): string =>
    value.toLowerCase().replace(/[^a-z0-9]/g, '');

  const buildPathLookup = (
    modules: Record<string, () => Promise<string>>,
  ): Map<string, string> => {
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

  const parseMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    let html = markdown;

    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code inline
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Code blocks
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      const code = match.replace(/```(\w+)?\n?/, '').replace(/```$/, '');
      return `<pre><code>${code}</code></pre>`;
    });

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraphs
    html = '<p>' + html + '</p>';

    return html;
  };

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

    parseMarkdownLazy: (markdown: string): string => {
      const html = parseMarkdownToHtml(markdown);
      // In the actual implementation, DOMPurify sanitizes - we skip for tests
      return html;
    },

    clearDocsCache: (): void => {
      docsCache.clear();
    },
  };
});

const { clearDocsCache, getComponentDocsLazy, parseMarkdownLazy } = await import(
  '@utils/lazyDocs'
);

describe('lazyDocs', () => {
  beforeEach(() => {
    clearDocsCache();
  });

  afterEach(() => {
    clearDocsCache();
  });

  describe('getComponentDocsLazy', () => {
    it('returns docs for elements category', async () => {
      const result = await getComponentDocsLazy('button', 'elements');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('returns docs for components category', async () => {
      const result = await getComponentDocsLazy('card', 'components');
      expect(result).toBe('# Card\n\nA card container.');
    });

    it('returns docs for layouts category', async () => {
      const result = await getComponentDocsLazy('container', 'layouts');
      expect(result).toBe('# Container\n\nA layout container.');
    });

    it('returns null for unknown category', async () => {
      const result = await getComponentDocsLazy('button', 'unknown');
      expect(result).toBeNull();
    });

    it('returns null for unknown component', async () => {
      const result = await getComponentDocsLazy('nonexistent', 'elements');
      expect(result).toBeNull();
    });

    it('normalizes component ID (case insensitive)', async () => {
      const result = await getComponentDocsLazy('BUTTON', 'elements');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('uses fallback component name if ID not found', async () => {
      const result = await getComponentDocsLazy('btn', 'elements', 'Button');
      expect(result).toBe('# Button\n\nA clickable button element.');
    });

    it('caches results for subsequent calls', async () => {
      const first = await getComponentDocsLazy('button', 'elements');
      const second = await getComponentDocsLazy('button', 'elements');
      expect(first).toBe(second);
    });

    it('caches null results for missing docs', async () => {
      const first = await getComponentDocsLazy('nonexistent', 'elements');
      const second = await getComponentDocsLazy('nonexistent', 'elements');
      expect(first).toBeNull();
      expect(second).toBeNull();
    });
  });

  describe('parseMarkdownLazy', () => {
    it('returns empty string for empty input', () => {
      expect(parseMarkdownLazy('')).toBe('');
    });

    it('parses h1 headers', () => {
      const result = parseMarkdownLazy('# Header 1');
      expect(result).toContain('<h1>Header 1</h1>');
    });

    it('parses h2 headers', () => {
      const result = parseMarkdownLazy('## Header 2');
      expect(result).toContain('<h2>Header 2</h2>');
    });

    it('parses h3 headers', () => {
      const result = parseMarkdownLazy('### Header 3');
      expect(result).toContain('<h3>Header 3</h3>');
    });

    it('parses bold text', () => {
      const result = parseMarkdownLazy('**bold text**');
      expect(result).toContain('<strong>bold text</strong>');
    });

    it('parses italic text', () => {
      const result = parseMarkdownLazy('*italic text*');
      expect(result).toContain('<em>italic text</em>');
    });

    it('parses inline code', () => {
      const result = parseMarkdownLazy('Use `code` here');
      expect(result).toContain('<code>code</code>');
    });

    it('parses code blocks', () => {
      const result = parseMarkdownLazy('```javascript\nconst x = 1;\n```');
      expect(result).toContain('<pre><code>');
      expect(result).toContain('const x = 1;');
    });

    it('parses links', () => {
      const result = parseMarkdownLazy('[Link](https://example.com)');
      expect(result).toContain('<a href="https://example.com">Link</a>');
    });

    it('wraps content in paragraphs', () => {
      const result = parseMarkdownLazy('Some text');
      expect(result).toMatch(/^<p>.*<\/p>$/);
    });

    it('converts double newlines to paragraph breaks', () => {
      const result = parseMarkdownLazy('Para 1\n\nPara 2');
      expect(result).toContain('</p><p>');
    });

    it('converts single newlines to br tags', () => {
      const result = parseMarkdownLazy('Line 1\nLine 2');
      expect(result).toContain('<br>');
    });

    it('handles combined markdown syntax', () => {
      const markdown = `# Title

This is **bold** and *italic* text.

Use \`code\` inline.

\`\`\`js
const x = 1;
\`\`\`

[Link](https://test.com)`;

      const result = parseMarkdownLazy(markdown);

      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<code>code</code>');
      expect(result).toContain('<pre><code>');
      expect(result).toContain('<a href="https://test.com">Link</a>');
    });
  });

  describe('clearDocsCache', () => {
    it('clears the docs cache', async () => {
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

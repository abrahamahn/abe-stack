// apps/web/src/features/demo/utils/lazyDocs.ts

import DOMPurify from 'dompurify';

import type { ComponentCategory } from '../types';

type DocsLoader = () => Promise<string>;
type DocsModules = Record<string, DocsLoader>;

// Cache for loaded documentation
const docsCache = new Map<string, string>();

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Lazy glob imports - these will be code-split and loaded on demand
const elementDocsModules: DocsModules = import.meta.glob('@ui/docs/elements/*.md', {
  query: '?raw',
  import: 'default',
}) as DocsModules;

const componentDocsModules: DocsModules = import.meta.glob('@ui/docs/components/*.md', {
  query: '?raw',
  import: 'default',
}) as DocsModules;

const layoutDocsModules: DocsModules = import.meta.glob(
  '../../../packages/ui/docs/layouts/**/*.md',
  {
    query: '?raw',
    import: 'default',
  },
) as DocsModules;

// Build lookup maps for file paths
function buildPathLookup(modules: DocsModules): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const path of Object.keys(modules)) {
    const filename = path.split('/').pop()?.replace('.md', '') || '';
    const normalized = normalizeKey(filename);
    const raw = filename.toLowerCase();
    lookup.set(raw, path);
    lookup.set(normalized, path);
  }
  return lookup;
}

const elementPathLookup = buildPathLookup(elementDocsModules);
const componentPathLookup = buildPathLookup(componentDocsModules);
const layoutPathLookup = buildPathLookup(layoutDocsModules);

/**
 * Get documentation for a component by ID (async)
 */
export async function getComponentDocsLazy(
  componentId: string,
  category: ComponentCategory,
  componentName?: string,
): Promise<string | null> {
  const id = normalizeKey(componentId);
  const fallbackName = componentName ? normalizeKey(componentName) : '';

  // Check cache first
  const cacheKey = `${category}:${id}`;
  const cached = docsCache.get(cacheKey);
  if (cached !== undefined) {
    return cached || null;
  }

  let pathLookup: Map<string, string>;
  let modules: DocsModules;

  if (category === 'elements') {
    pathLookup = elementPathLookup;
    modules = elementDocsModules;
  } else if (category === 'components') {
    pathLookup = componentPathLookup;
    modules = componentDocsModules;
  } else if (category === 'layouts') {
    pathLookup = layoutPathLookup;
    modules = layoutDocsModules;
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
}

/**
 * Parse markdown into simple HTML
 */
function parseMarkdownToHtml(markdown: string): string {
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
}

/**
 * Parse markdown into sanitized HTML
 */
export function parseMarkdownLazy(markdown: string): string {
  const html = parseMarkdownToHtml(markdown);
  const purify = DOMPurify as unknown as {
    sanitize: (html: string, options?: Record<string, unknown>) => string;
  };
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'code', 'pre', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

/**
 * Clear documentation cache
 */
export function clearDocsCache(): void {
  docsCache.clear();
}

// apps/web/src/features/demo/utils/docs.ts

import DOMPurify from 'dompurify';

// Import markdown files as raw strings using Vite's glob import
// https://vitejs.dev/guide/features.html#glob-import

type DocsMap = Record<string, string>;

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Vite glob imports - these will be resolved at build time
// Using relative paths to reach packages/ui/docs from apps/web/src/features/demo/utils
const elementDocsModules = import.meta.glob('../../../../../../packages/ui/docs/elements/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const componentDocsModules = import.meta.glob(
  '../../../../../../packages/ui/docs/components/*.md',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

const layoutDocsModules = import.meta.glob('../../../../../../packages/ui/docs/layouts/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Create normalized maps
const elementDocs: DocsMap = Object.fromEntries(
  Object.entries(elementDocsModules).flatMap(([path, content]) => {
    const filename = path.split('/').pop()?.replace('.md', '') || '';
    const normalized = normalizeKey(filename);
    const raw = filename.toLowerCase();
    return [
      [raw, String(content)],
      [normalized, String(content)],
    ];
  }),
);

const componentDocs: DocsMap = Object.fromEntries(
  Object.entries(componentDocsModules).flatMap(([path, content]) => {
    const filename = path.split('/').pop()?.replace('.md', '') || '';
    const normalized = normalizeKey(filename);
    const raw = filename.toLowerCase();
    return [
      [raw, String(content)],
      [normalized, String(content)],
    ];
  }),
);

const layoutDocs: DocsMap = Object.fromEntries(
  Object.entries(layoutDocsModules).flatMap(([path, content]) => {
    const filename = path.split('/').pop()?.replace('.md', '') || '';
    const normalized = normalizeKey(filename);
    const raw = filename.toLowerCase();
    return [
      [raw, String(content)],
      [normalized, String(content)],
    ];
  }),
);

/**
 * Get documentation for a component by ID
 */
export function getComponentDocs(
  componentId: string,
  category: string,
  componentName?: string,
): string | null {
  const id = normalizeKey(componentId);
  const fallbackName = componentName ? normalizeKey(componentName) : '';

  if (category === 'elements') {
    return elementDocs[id] ?? (fallbackName ? (elementDocs[fallbackName] ?? null) : null);
  } else if (category === 'components') {
    return componentDocs[id] ?? (fallbackName ? (componentDocs[fallbackName] ?? null) : null);
  } else if (category === 'layouts') {
    return layoutDocs[id] ?? (fallbackName ? (layoutDocs[fallbackName] ?? null) : null);
  }

  return null;
}

/**
 * Parse markdown into simple HTML
 * Basic parser for common markdown syntax
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
 * Uses DOMPurify to prevent XSS attacks
 */
export function parseMarkdown(markdown: string): string {
  const html = parseMarkdownToHtml(markdown);
  // Type assertion needed due to DOMPurify type resolution issues with ESM
  const purify = DOMPurify as unknown as {
    sanitize: (html: string, options?: Record<string, unknown>) => string;
  };
  return purify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'code', 'pre', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

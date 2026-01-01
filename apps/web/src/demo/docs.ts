// apps/web/src/demo/docs.ts

// Import markdown files as raw strings using Vite's glob import
// https://vitejs.dev/guide/features.html#glob-import

type DocsMap = Record<string, string>;

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Vite glob imports - these will be resolved at build time
const primitiveDocsModules = import.meta.glob('../../../packages/ui/docs/primitives/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const componentDocsModules = import.meta.glob('../../../packages/ui/docs/components/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const layoutDocsModules = import.meta.glob('../../../packages/ui/docs/layouts/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Create normalized maps
const primitiveDocs: DocsMap = Object.fromEntries(
  Object.entries(primitiveDocsModules).flatMap(([path, content]) => {
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

  if (category === 'primitives') {
    return primitiveDocs[id] ?? (fallbackName ? (primitiveDocs[fallbackName] ?? null) : null);
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
export function parseMarkdown(markdown: string): string {
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

// apps/web/src/features/demo/utils/lazyDocs.ts

import type { ComponentCategory } from '../types';

type DocsLoader = () => Promise<string>;
type DocsModules = Record<string, DocsLoader>;

// Cache for loaded documentation
const docsCache = new Map<string, string>();

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '');

// Lazy glob imports - these will be code-split and loaded on demand
// Note: Using relative paths because package exports don't include docs folder
const elementDocsModules: DocsModules = import.meta.glob(
  '../../../../../../packages/ui/docs/elements/*.md',
  {
    query: '?raw',
    import: 'default',
  },
) as DocsModules;

const componentDocsModules: DocsModules = import.meta.glob(
  '../../../../../../packages/ui/docs/components/*.md',
  {
    query: '?raw',
    import: 'default',
  },
) as DocsModules;

const layoutDocsModules: DocsModules = import.meta.glob(
  '../../../../../../packages/ui/docs/layouts/**/*.md',
  {
    query: '?raw',
    import: 'default',
  },
) as DocsModules;

// Build lookup maps for file paths
function buildPathLookup(modules: DocsModules): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const path of Object.keys(modules)) {
    const filename = path.split('/').pop()?.replace('.md', '') ?? '';
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
  const fallbackName =
    componentName !== undefined && componentName.length > 0 ? normalizeKey(componentName) : '';

  // Check cache first
  const cacheKey = `${category}:${id}`;
  const cached = docsCache.get(cacheKey);
  if (cached !== undefined) {
    return cached.length > 0 ? cached : null;
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
  if ((path === undefined || path.length === 0) && fallbackName.length > 0) {
    path = pathLookup.get(fallbackName);
  }

  if (path === undefined || path.length === 0) {
    docsCache.set(cacheKey, '');
    return null;
  }

  try {
    const loader = modules[path];
    if (loader === undefined) {
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
 * Clear documentation cache
 */
export function clearDocsCache(): void {
  docsCache.clear();
}

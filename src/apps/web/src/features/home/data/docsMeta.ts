// src/apps/web/src/features/home/data/docsMeta.ts
import type { DocCategoryDef, DocKey, DocMeta } from '../types';

// ---------------------------------------------------------------------------
// Vite build-time discovery of all markdown files under docs/
// ---------------------------------------------------------------------------

const DOCS_PREFIX = '../../../../../../../docs/';

/** Glob-discovered doc loaders (lazy, on-demand) */
const docGlob = import.meta.glob<string>('../../../../../../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
});

/** Root README.md loader */
const rootReadmeGlob = import.meta.glob<string>('../../../../../../../README.md', {
  query: '?raw',
  import: 'default',
});

// ---------------------------------------------------------------------------
// Label & key derivation helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  root: 'Home',
  docs: 'Docs',
  deploy: 'Deployment',
  dev: 'Development',
  log: 'Changelog',
  quickstart: 'Quick Start',
  reference: 'Reference',
  specs: 'Specifications',
  todo: 'Roadmap',
};

const CATEGORY_ORDER = [
  'root',
  'docs',
  'quickstart',
  'specs',
  'dev',
  'deploy',
  'reference',
  'todo',
  'log',
];

function formatLabel(filename: string): string {
  const name = filename.replace(/\.md$/, '');
  if (name === 'README') return 'Overview';
  // Convert kebab-case to Title Case: "ci-cd" → "Ci Cd", "sync-scripts" → "Sync Scripts"
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function deriveKey(relativePath: string): string {
  const withoutExt = relativePath.replace(/\.md$/, '');
  const parts = withoutExt.split('/');
  // Top-level docs files get a 'docs-' prefix to avoid collision with root README
  if (parts.length === 1) {
    return 'docs-' + (parts[0] ?? '').toLowerCase();
  }
  return parts.join('-').toLowerCase();
}

// ---------------------------------------------------------------------------
// Build docsMeta, loaderMap, and docCategories from glob entries
// ---------------------------------------------------------------------------

const loaderMap = new Map<DocKey, () => Promise<string>>();
const metaRecord: Record<DocKey, DocMeta> = {};

// Process root README
for (const [globPath, loader] of Object.entries(rootReadmeGlob)) {
  void globPath;
  const key = 'readme';
  loaderMap.set(key, loader);
  metaRecord[key] = { label: 'Readme', category: 'root' };
}

// Process docs/**/*.md
for (const [globPath, loader] of Object.entries(docGlob)) {
  // globPath looks like "../../../../../../../docs/dev/testing.md"
  const relativePath = globPath.slice(DOCS_PREFIX.length); // "dev/testing.md"
  const parts = relativePath.split('/');

  let category: string;
  let filename: string;

  if (parts.length === 1) {
    // Top-level doc: docs/README.md → category "docs"
    category = 'docs';
    filename = parts[0] ?? '';
  } else {
    // Nested doc: docs/dev/testing.md → category "dev"
    category = parts[0] ?? 'docs';
    filename = parts[parts.length - 1] ?? '';
  }

  const key = deriveKey(relativePath);
  loaderMap.set(key, loader);
  metaRecord[key] = { label: formatLabel(filename), category };
}

/** Metadata for all discovered docs, keyed by derived doc key */
export const docsMeta: Record<DocKey, DocMeta> = metaRecord;

/** Ordered category definitions for sidebar rendering */
export const docCategories: DocCategoryDef[] = CATEGORY_ORDER.filter((cat) =>
  Object.values(metaRecord).some((m) => m.category === cat),
).map((cat) => ({
  key: cat,
  label: CATEGORY_LABELS[cat] ?? cat.charAt(0).toUpperCase() + cat.slice(1),
}));

/**
 * Lazily load the raw markdown content for a given doc key.
 * Uses the Vite glob loader to fetch on demand.
 */
export async function loadDocContent(key: DocKey): Promise<string> {
  const loader = loaderMap.get(key);
  if (loader === undefined) {
    throw new Error(`Unknown doc key: ${key}`);
  }
  return loader();
}

// src/apps/web/src/features/home/data/docsMeta.ts

import type { DocCategoryDef, DocKey, DocMeta } from '../types';

/**
 * Metadata record mapping each DocKey to its display label and category.
 * Content is lazy-loaded on demand via `loadDocContent`.
 *
 * @complexity O(1) - constant-size record lookup
 */
export const docsMeta: Record<DocKey, DocMeta> = {
  // Root
  readme: { label: 'README', category: 'root' },

  // Apps
  web: { label: 'Web', category: 'apps' },
  desktop: { label: 'Desktop', category: 'apps' },

  // Packages
  core: { label: 'Core', category: 'packages' },
  ui: { label: 'UI', category: 'packages' },

  // Dev docs
  architecture: { label: 'Architecture', category: 'dev' },
  principles: { label: 'Principles', category: 'dev' },
  devEnvironment: { label: 'Dev Environment', category: 'dev' },
  configSetup: { label: 'Config Setup', category: 'dev' },
  testing: { label: 'Testing', category: 'dev' },
  security: { label: 'Security', category: 'dev' },
  syncScripts: { label: 'Sync Scripts', category: 'dev' },
  performance: { label: 'Performance', category: 'dev' },
  legacy: { label: 'Legacy', category: 'dev' },

  // Logs
  logW01: { label: 'Week 01', category: 'logs' },
  logW02: { label: 'Week 02', category: 'logs' },
  logW03: { label: 'Week 03', category: 'logs' },
  logW04: { label: 'Week 04', category: 'logs' },
};

/**
 * Ordered category definitions for rendering the sidebar navigation groups.
 *
 * @complexity O(1) - fixed-size array
 */
export const docCategories: DocCategoryDef[] = [
  { key: 'root', label: 'Home' },
  { key: 'apps', label: 'Apps' },
  { key: 'packages', label: 'Packages' },
  { key: 'dev', label: 'Dev Docs' },
  { key: 'logs', label: 'Changelog' },
];

/**
 * Lazy-loads markdown content for a given doc key using Vite's dynamic import.
 * Each doc is loaded on demand and resolved as a raw string.
 *
 * @param key - The document identifier to load
 * @returns The raw markdown string content
 * @throws When the import fails (file not found, network error)
 * @complexity O(1) - single record lookup + async import
 */
export async function loadDocContent(key: DocKey): Promise<string> {
  const loaders: Record<DocKey, () => Promise<{ default: string }>> = {
    readme: () => import('../../../../../../../README.md?raw'),
    web: () => import('../../../../README.md?raw'),
    desktop: () => import('../../../../../desktop/README.md?raw'),
    core: () => import('../../../../../../../config/README.md?raw'),
    ui: () => import('../../../../../../client/ui/README.md?raw'),
    architecture: () => import('../../../../../../../config/README.md?raw'),
    principles: () => import('../../../../../../../config/README.md?raw'),
    devEnvironment: () => import('../../../../../../../config/README.md?raw'),
    configSetup: () => import('../../../../../../../config/README.md?raw'),
    testing: () => import('../../../../../../../config/README.md?raw'),
    security: () => import('../../../../../../../config/README.md?raw'),
    syncScripts: () => import('../../../../../../../config/README.md?raw'),
    performance: () => import('../../../../../../../config/README.md?raw'),
    legacy: () => import('../../../../../../../config/README.md?raw'),
    logW01: () => import('../../../../../../../config/README.md?raw'),
    logW02: () => import('../../../../../../../config/README.md?raw'),
    logW03: () => import('../../../../../../../config/README.md?raw'),
    logW04: () => import('../../../../../../../config/README.md?raw'),
  };

  const module = await loaders[key]();
  return module.default;
}

// src/apps/web/src/features/home/types.ts
import type { UILibraryPaneConfig } from '@ui-library/types';

/**
 * Pane configuration alias for the Home page.
 * Structurally identical to UILibraryPaneConfig — reused for DRY.
 */
export type HomePaneConfig = UILibraryPaneConfig;

/** Union of all document slug identifiers for lazy-loaded markdown docs. */
export type DocKey =
  | 'readme'
  // Apps
  | 'web'
  | 'desktop'
  // Packages
  | 'core'
  | 'ui'
  // Dev docs
  | 'architecture'
  | 'configSetup'
  | 'devEnvironment'
  | 'legacy'
  | 'performance'
  | 'principles'
  | 'security'
  | 'syncScripts'
  | 'testing'
  // Logs
  | 'logW01'
  | 'logW02'
  | 'logW03'
  | 'logW04';

/** Category grouping for documents in the sidebar. */
export type DocCategory = 'root' | 'apps' | 'packages' | 'dev' | 'logs';

/** Metadata for a single documentation entry (no content - loaded on demand). */
export type DocMeta = {
  /** Display label in the navigation sidebar */
  label: string;
  /** Category grouping for sidebar sections */
  category: DocCategory;
};

/** Sidebar category definition for rendering grouped navigation. */
export type DocCategoryDef = {
  key: DocCategory;
  label: string;
};

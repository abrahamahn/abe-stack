// main/apps/web/src/features/home/types.ts
import type { UILibraryPaneConfig } from '@ui-library/types';

export type HomePaneConfig = UILibraryPaneConfig;

/** Document key derived from file path: e.g. "dev-testing", "readme" */
export type DocKey = string;

/** Document category derived from directory name: e.g. "dev", "deploy", "root" */
export type DocCategory = string;

export type DocMeta = {
  label: string;
  category: DocCategory;
};

export type DocCategoryDef = {
  key: DocCategory;
  label: string;
};

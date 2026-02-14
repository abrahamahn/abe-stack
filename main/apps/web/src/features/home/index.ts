// main/apps/web/src/features/home/index.ts
export { docCategories, docsMeta, loadDocContent } from './data/docsMeta';
export { HomePage } from './HomePage';
export { useDocContent } from './hooks/useDocContent';
export { HOME_KEYBOARD_SHORTCUTS, useHomeKeyboard } from './hooks/useHomeKeyboard';
export type { DocCategory, DocCategoryDef, DocKey, DocMeta, HomePaneConfig } from './types';

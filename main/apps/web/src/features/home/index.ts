// main/apps/web/src/features/home/index.ts

export { docCategories, docsMeta, loadDocContent } from './data';
export { HomePage } from './HomePage';
export { useDocContent, HOME_KEYBOARD_SHORTCUTS, useHomeKeyboard } from './hooks';
export type { DocCategory, DocCategoryDef, DocKey, DocMeta, HomePaneConfig } from './types';

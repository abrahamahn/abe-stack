// apps/web/src/features/demo/index.ts
export { DemoPage } from './pages';
export type { ComponentCategory, ComponentDemo, ComponentVariant, DemoPaneConfig } from './types';
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';

// apps/web/src/features/demo/index.ts
export { DemoPage, SidePeekDemoPage } from './pages';
export type { ComponentCategory, ComponentDemo, ComponentVariant, DemoPaneConfig } from './types';
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount,
} from './catalog';

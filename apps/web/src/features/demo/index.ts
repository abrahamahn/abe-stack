// apps/web/src/features/demo/index.ts
export {
  componentCatalog,
  getAllCategories,
  getComponentsByCategory,
  getTotalComponentCount
} from './catalog';
export { DemoPage, SidePeekDemoPage } from './pages';
export type { ComponentCategory, ComponentDemo, ComponentVariant, DemoPaneConfig } from './types';

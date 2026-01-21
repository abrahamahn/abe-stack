// apps/web/src/features/demo/utils/index.ts
// Note: docs.ts is not exported to avoid bundling eager imports alongside lazy imports
// Use lazyDocs.ts functions for production code
export { clearDocsCache, getComponentDocsLazy } from './lazyDocs';

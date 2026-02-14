// main/server/engine/src/search/query-builder.ts
/**
 * Search Query Builder — Re-export from shared
 *
 * The engine previously maintained its own SearchQueryBuilder implementation.
 * The canonical implementation lives in `@abe-stack/shared` with full
 * type safety, compound filters, and serialization support.
 *
 * This module re-exports the shared version for backwards compatibility
 * with engine consumers.
 *
 * @module @abe-stack/server-engine/search/query-builder
 */

export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from '@abe-stack/shared';

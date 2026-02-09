// src/server/engine/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL.
 * Includes SQL-based search with parameterized queries,
 * query builder, and factory pattern for provider management.
 *
 * @module @abe-stack/server-engine/search
 */

// ============================================================================
// Types
// ============================================================================

export type {
  ElasticsearchProviderConfig,
  SearchContext,
  SearchProviderConfig,
  SearchProviderFactoryOptions,
  SearchProviderType,
  ServerSearchProvider,
  SqlColumnMapping,
  SqlQueryOptions,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './types';

// ============================================================================
// SQL Provider
// ============================================================================

export { createSqlSearchProvider, SqlSearchProvider } from './sql-provider';

// ============================================================================
// Query Builder
// ============================================================================

export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query-builder';

// ============================================================================
// Factory
// ============================================================================

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  type ProviderOptions,
  type SqlSearchProviderOptions,
} from './factory';

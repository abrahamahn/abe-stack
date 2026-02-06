// backend/engine/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL and Elasticsearch.
 * Includes SQL-based search with parameterized queries, Elasticsearch stub,
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
// Elasticsearch Provider
// ============================================================================

export { createElasticsearchProvider, ElasticsearchProvider } from './elastic';

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
  type ElasticsearchProviderOptions,
  type ProviderOptions,
  type SqlSearchProviderOptions,
} from './factory';

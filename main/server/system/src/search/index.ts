// main/server/system/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL.
 * SearchProviderFactory, SqlSearchProvider, and types are canonical
 * in @bslt/server-system. The underlying implementations live in @bslt/db
 * due to tight coupling with database internals.
 *
 * @module @bslt/server-system/search
 */

// ============================================================================
// Types
// ============================================================================

export type {
  ElasticsearchProviderConfig,
  IndexHint,
  SearchContext,
  SearchMetrics,
  SearchProviderConfig,
  SearchProviderFactoryOptions,
  SearchProviderType,
  SearchResultWithMetrics,
  ServerSearchProvider,
  SqlColumnMapping,
  SqlCursorData,
  SqlFilterResult,
  SqlOperatorMap,
  SqlOperatorTranslator,
  SqlQueryOptions,
  SqlSearchProviderConfig,
  SqlTableConfig,
} from './types';

// ============================================================================
// SQL Provider
// ============================================================================

export { createSqlSearchProvider, SqlSearchProvider } from './sql-provider';

// ============================================================================
// Factory
// ============================================================================

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from './search-factory';

export type { ProviderOptions, SqlSearchProviderOptions } from './search-factory';

// ============================================================================
// Query Builder (unique to system)
// ============================================================================

export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query.builder';

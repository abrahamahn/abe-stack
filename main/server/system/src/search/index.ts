// main/server/system/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL.
 * Canonical types and SQL provider live in @bslt/db;
 * engine provides the factory, query builder, and re-exports.
 *
 * @module @bslt/server-system/search
 */

// ============================================================================
// Types (re-exported from @bslt/db)
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
  SqlTableConfig
} from '@bslt/db';

// ============================================================================
// SQL Provider (re-exported from @bslt/db)
// ============================================================================

export { createSqlSearchProvider, SqlSearchProvider } from '@bslt/db';

// ============================================================================
// Query Builder (re-exported from @bslt/shared)
// ============================================================================

export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query.builder';

// ============================================================================
// Factory
// ============================================================================

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  type ProviderOptions,
  type SqlSearchProviderOptions
} from './factory';


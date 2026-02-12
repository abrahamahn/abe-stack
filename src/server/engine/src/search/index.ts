// src/server/engine/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL.
 * Canonical types and SQL provider live in @abe-stack/db;
 * engine provides the factory, query builder, and re-exports.
 *
 * @module @abe-stack/server-engine/search
 */

// ============================================================================
// Types (re-exported from @abe-stack/db)
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
} from '@abe-stack/db';

// ============================================================================
// SQL Provider (re-exported from @abe-stack/db)
// ============================================================================

export { createSqlSearchProvider, SqlSearchProvider } from '@abe-stack/db';

// ============================================================================
// Query Builder (re-exported from @abe-stack/shared)
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

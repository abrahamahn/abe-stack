// main/server/system/src/search/index.ts
/**
 * Search Module
 *
 * Server-side search providers for PostgreSQL.
 * Canonical types, SQL provider, and factory live in @bslt/db;
 * system re-exports them for backwards-compatible access.
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
  SqlTableConfig,
} from '@bslt/db';

// ============================================================================
// SQL Provider (re-exported from @bslt/db)
// ============================================================================

export { createSqlSearchProvider, SqlSearchProvider } from '@bslt/db';

// ============================================================================
// Factory (canonical in @bslt/db)
// ============================================================================

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from '@bslt/db';

// ============================================================================
// Query Builder (unique to system)
// ============================================================================

export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query.builder';

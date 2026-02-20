// main/server/system/src/search/types.ts
/**
 * Search Provider Types
 *
 * Re-exported from @bslt/db where the canonical definitions live.
 * This re-export exists so @bslt/server-system consumers can import
 * search types from the same package that owns the search infrastructure.
 */

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

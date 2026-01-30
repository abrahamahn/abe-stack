// packages/db/src/search/index.ts
/**
 * Search Module Barrel Exports
 *
 * Search providers for PostgreSQL (SQL) and Elasticsearch databases.
 *
 * @module
 */

export { createElasticsearchProvider, ElasticsearchProvider } from './elasticsearch-provider';

export {
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
} from './search-factory';

export type {
  ElasticsearchProviderOptions,
  ProviderOptions,
  SqlSearchProviderOptions,
} from './search-factory';

export { createSqlSearchProvider, SqlSearchProvider } from './sql-provider';

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

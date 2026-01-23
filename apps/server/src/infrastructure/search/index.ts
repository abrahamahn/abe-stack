// apps/server/src/infrastructure/search/index.ts
/**
 * Search Infrastructure
 *
 * Server-side search providers and utilities.
 */

// Types
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

// SQL Provider
export { createSqlSearchProvider, SqlSearchProvider } from './sql-provider';

// Elasticsearch Provider
export { createElasticsearchProvider, ElasticsearchProvider } from './elasticsearch-provider';

// Factory
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

// packages/db/src/search/index.ts
/**
 * Search Module Barrel Exports
 */

// If elasticsearch-provider.ts is missing, we cannot export it.
// Checking ls -F output, it was NOT present. Only sql-provider.ts was present.

export {
    SearchProviderFactory, getSearchProviderFactory,
    resetSearchProviderFactory
} from './search-factory';

export type {
    ElasticsearchProviderOptions,
    ProviderOptions,
    SqlSearchProviderOptions
} from './search-factory';

export { SqlSearchProvider, createSqlSearchProvider } from './sql-provider';

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
} from './types';


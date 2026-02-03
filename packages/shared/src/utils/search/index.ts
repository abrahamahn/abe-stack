// core/src/infrastructure/search/index.ts
/**
 * Search Domain
 *
 * Type-safe search and filtering system with fluent query builder.
 */

// Types
export {
  FILTER_OPERATORS,
  isCompoundFilter,
  isFilterCondition,
  LOGICAL_OPERATORS,
  SORT_ORDER,
} from './types';
export type {
  CompoundFilter,
  CursorSearchResult,
  FacetBucket,
  FacetConfig,
  FacetedSearchQuery,
  FacetedSearchResult,
  FacetResult,
  FilterCondition,
  FilterOperator,
  FilterPrimitive,
  FilterValue,
  FullTextSearchConfig,
  HighlightedField,
  LogicalOperator,
  SearchCapabilities,
  SearchProvider,
  SearchQuery,
  SearchResult,
  SearchResultItem,
  SortConfig,
  SortOrder,
} from './types';

// Schemas
export {
  compoundFilterSchema,
  cursorSearchResultSchema,
  facetBucketSchema,
  facetConfigSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  facetResultSchema,
  filterConditionSchema,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fullTextSearchConfigSchema,
  highlightedFieldSchema,
  logicalOperatorSchema,
  rangeValueSchema,
  SEARCH_DEFAULTS,
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  sortConfigSchema,
  sortOrderSchema,
  urlSearchParamsSchema,
} from './schemas';
export type { SearchQueryInput, SearchQueryOutput, UrlSearchParamsInput } from './schemas';

// Operators
export {
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  filterArray,
  getFieldValue,
  paginateArray,
  sortArray,
} from './operators';

// Query Builder
export { createSearchQuery, fromSearchQuery, SearchQueryBuilder } from './query-builder';

// Errors
export {
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  QueryTooComplexError,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
} from './errors';
export type { SearchErrorType } from './errors';

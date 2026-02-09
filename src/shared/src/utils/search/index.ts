// src/shared/src/utils/search/index.ts
/**
 * Search Domain
 *
 * Type-safe search and filtering system with fluent query builder.
 */

// Types
export { FILTER_OPERATORS, LOGICAL_OPERATORS, isCompoundFilter, isFilterCondition } from './types';
export type {
  CompoundFilter,
  CursorSearchResult,
  FacetBucket,
  FacetConfig,
  FacetResult,
  FacetedSearchQuery,
  FacetedSearchResult,
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
} from './types';

// Schemas
export {
  SEARCH_DEFAULTS,
  compoundFilterSchema,
  cursorSearchResultSchema,
  facetBucketSchema,
  facetConfigSchema,
  facetResultSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  filterConditionSchema,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fullTextSearchConfigSchema,
  highlightedFieldSchema,
  logicalOperatorSchema,
  rangeValueSchema,
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
export { SearchQueryBuilder, createSearchQuery, fromSearchQuery } from './query-builder';

// Errors
export {
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  QueryTooComplexError,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
} from './errors';
export type { SearchErrorType } from './errors';

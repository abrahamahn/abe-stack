// client/src/search/index.ts
/**
 * Search SDK
 *
 * Client-side search utilities including query builders,
 * URL serialization, and React hooks.
 */

// Query Builder
export {
  ClientSearchQueryBuilder,
  contains,
  createClientSearchQuery,
  createSearchQuery,
  eq,
  fromClientSearchQuery,
  fromSearchQuery,
  gt,
  inArray,
  lt,
  neq,
  queryToURLSearchParams,
  SearchQueryBuilder,
  urlSearchParamsToQuery,
} from './query-builder';

// Serialization
export {
  buildURLWithQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  extractQueryFromURL,
  mergeSearchParamsIntoURL,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
} from './serialization';
export type { SerializationOptions, SerializedFilter, SerializedQuery } from './serialization';

// Hooks
export { useDebounceSearch, useInfiniteSearch, useSearch, useSearchParams } from './hooks';
export type {
  CursorSearchFn,
  SearchFn,
  UseInfiniteSearchOptions,
  UseInfiniteSearchResult,
  UseSearchOptions,
  UseSearchResult,
} from './hooks';

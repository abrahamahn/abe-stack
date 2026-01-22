// packages/sdk/src/query/index.ts
/**
 * Query Module
 *
 * Custom query hooks and cache management, replacing @tanstack/react-query.
 * Built on proven patterns from LoaderCache and RecordCache.
 */

// Core cache
export { QueryCache, hashQueryKey, queryKeysEqual } from './QueryCache';
export type {
  FetchStatus,
  QueryCacheOptions,
  QueryKey,
  QueryState,
  QueryStatus,
  SetQueryDataOptions,
} from './QueryCache';

// React provider
export { QueryCacheProvider, useQueryCache } from './QueryCacheProvider';
export type { QueryCacheProviderProps } from './QueryCacheProvider';

// Hooks
export { useQuery } from './useQuery';
export type { UseQueryOptions, UseQueryResult } from './useQuery';

export { useMutation } from './useMutation';
export type { MutationStatus, UseMutationOptions, UseMutationResult } from './useMutation';

export { useInfiniteQuery } from './useInfiniteQuery';
export type {
  InfiniteData,
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './useInfiniteQuery';

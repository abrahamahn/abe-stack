// src/client/react/src/query/index.ts

export { QueryCacheProvider, useQueryCache } from './QueryCacheProvider';
export type { QueryCacheProviderProps } from './QueryCacheProvider';
export { useInfiniteQuery } from './useInfiniteQuery';
export type {
  InfiniteData,
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './useInfiniteQuery';
export { useMutation } from './useMutation';
export type { MutationStatus, UseMutationOptions, UseMutationResult } from './useMutation';
export { useQuery } from './useQuery';
export type { UseQueryOptions, UseQueryResult } from './useQuery';

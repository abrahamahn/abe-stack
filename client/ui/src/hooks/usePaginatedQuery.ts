// client/ui/src/hooks/usePaginatedQuery.ts
import { useInfiniteQuery, useQueryCache } from '@abe-stack/client';
import { useCallback, useMemo, useRef } from 'react';

import type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  PaginatedResult,
  PaginationOptions,
} from '@abe-stack/core';

/**
 * Configuration for usePaginatedQuery hook
 */
export interface UsePaginatedQueryOptions<TData = unknown, TError = unknown> {
  /** Query key for the query */
  queryKey: string[];
  /** Query function that accepts pagination options */
  queryFn: (options: CursorPaginationOptions) => Promise<CursorPaginatedResult<TData>>;
  /** Initial pagination options */
  initialOptions?: Partial<CursorPaginationOptions>;
  /** Whether to enable infinite scroll */
  enabled?: boolean;
  /** Function called when new data is loaded */
  onDataReceived?: (data: TData[], isInitialLoad: boolean) => void;
  /** Function called on pagination error */
  onError?: (error: TError) => void;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** GC time in milliseconds (replaces cacheTime) */
  gcTime?: number;
  /** @deprecated Use gcTime instead */
  cacheTime?: number;
  /** Refetch interval in milliseconds */
  refetchInterval?: number;
  /** Keep previous data when fetching new data */
  keepPreviousData?: boolean;
  /** Number of retries on failure (default: 3, set to false/0 to disable) */
  retry?: number | boolean;
}

/**
 * Result of usePaginatedQuery hook
 */
export interface UsePaginatedQueryResult<TData = unknown> {
  /** All loaded data flattened into a single array */
  data: TData[];
  /** Whether the query is currently loading (initial load) */
  isLoading: boolean;
  /** Whether more data is being fetched (subsequent loads) */
  isFetchingNextPage: boolean;
  /** Whether any data is being fetched */
  isFetching: boolean;
  /** Whether an error occurred */
  isError: boolean;
  /** The error if one occurred */
  error: unknown;
  /** Whether there are more pages to load */
  hasNextPage: boolean;
  /** Function to load the next page */
  fetchNextPage: () => void;
  /** Function to refetch all data */
  refetch: () => void;
  /** Function to reset pagination state */
  reset: () => void;
  /** Whether this is the first load */
  isInitialLoad: boolean;
  /** Total number of items loaded */
  itemCount: number;
  /** Whether the query is enabled */
  isEnabled: boolean;
}

/**
 * Hook for cursor-based pagination with infinite scroll
 *
 * Provides automatic cursor management and infinite scroll functionality.
 * Designed to work with cursor-based pagination APIs.
 */
export function usePaginatedQuery<TData = unknown, TError = unknown>({
  queryKey,
  queryFn,
  initialOptions = {},
  enabled = true,
  onDataReceived,
  onError,
  staleTime,
  gcTime,
  retry,
}: UsePaginatedQueryOptions<TData, TError>): UsePaginatedQueryResult<TData> {
  const queryCache = useQueryCache();
  const hasCalledOnDataReceivedRef = useRef(false);

  // Default pagination options
  const defaultOptions: CursorPaginationOptions = {
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialOptions,
  };

  // Infinite query for handling pagination
  const infiniteQuery = useInfiniteQuery<CursorPaginatedResult<TData>, Error, string | undefined>({
    queryKey,
    queryFn: async ({ pageParam }) => {
      const options: CursorPaginationOptions = {
        ...defaultOptions,
        ...(pageParam !== undefined && { cursor: pageParam }),
      };

      try {
        const result = await queryFn(options);
        return result;
      } catch (error) {
        onError?.(error as TError);
        throw error;
      }
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage: CursorPaginatedResult<TData>) => {
      return lastPage.hasNext ? (lastPage.nextCursor ?? undefined) : undefined;
    },
    enabled,
    ...(staleTime !== undefined && { staleTime }),
    ...(gcTime !== undefined && { gcTime }),
    ...(retry !== undefined && { retry }),
  });

  // Flatten all pages into a single data array
  const data = useMemo(() => {
    return infiniteQuery.data?.pages.flatMap((page) => page.data) ?? [];
  }, [infiniteQuery.data]);

  // Track if this is the initial load
  const isInitialLoad = infiniteQuery.isLoading && !infiniteQuery.isFetchingNextPage;

  // Notify when new data is received
  const itemCount = data.length;
  const prevItemCountRef = useRef(itemCount);

  if (itemCount !== prevItemCountRef.current) {
    const isInitialLoadNotification = !hasCalledOnDataReceivedRef.current;
    if (isInitialLoadNotification) {
      hasCalledOnDataReceivedRef.current = true;
    }
    onDataReceived?.(data, isInitialLoadNotification);
    prevItemCountRef.current = itemCount;
  }

  // Reset function
  const reset = useCallback(() => {
    hasCalledOnDataReceivedRef.current = false;
    queryCache.removeQuery(queryKey);
  }, [queryCache, queryKey]);

  return {
    data,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isFetching: infiniteQuery.isFetching,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: (): void => {
      void infiniteQuery.fetchNextPage();
    },
    refetch: (): void => {
      void infiniteQuery.refetch();
    },
    reset,
    isInitialLoad,
    itemCount,
    isEnabled: enabled,
  };
}

/**
 * Hook for traditional offset-based pagination
 * Useful for cases where cursor pagination isn't available
 */
export interface UseOffsetPaginatedQueryOptions<TData = unknown, TError = unknown> {
  queryKey: string[];
  queryFn: (options: PaginationOptions) => Promise<PaginatedResult<TData>>;
  initialOptions?: Partial<PaginationOptions>;
  enabled?: boolean;
  onDataReceived?: (data: TData[], isInitialLoad: boolean) => void;
  onError?: (error: TError) => void;
  staleTime?: number;
  gcTime?: number;
  /** Number of retries on failure (default: 3, set to false/0 to disable) */
  retry?: number | boolean;
}

export interface UseOffsetPaginatedQueryResult<TData = unknown> {
  data: TData[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  fetchPage: (page: number) => void;
  refetch: () => void;
  isEnabled: boolean;
}

export function useOffsetPaginatedQuery<TData = unknown, TError = unknown>({
  queryKey,
  queryFn,
  initialOptions = {},
  enabled = true,
  onDataReceived,
  onError,
  staleTime,
  gcTime,
  retry,
}: UseOffsetPaginatedQueryOptions<TData, TError>): UseOffsetPaginatedQueryResult<TData> {
  const defaultOptions: PaginationOptions = {
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialOptions,
  };

  const query = useInfiniteQuery<PaginatedResult<TData>, Error, number>({
    queryKey: [...queryKey, 'offset'],
    queryFn: async ({ pageParam }) => {
      const options: PaginationOptions = {
        ...defaultOptions,
        page: pageParam,
      };

      try {
        const result = await queryFn(options);
        onDataReceived?.(result.data, pageParam === 1);
        return result;
      } catch (error) {
        onError?.(error as TError);
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedResult<TData>) => {
      return lastPage.hasNext ? lastPage.page + 1 : undefined;
    },
    getPreviousPageParam: (firstPage: PaginatedResult<TData>) => {
      return firstPage.hasPrev ? firstPage.page - 1 : undefined;
    },
    enabled,
    ...(staleTime !== undefined && { staleTime }),
    ...(gcTime !== undefined && { gcTime }),
    ...(retry !== undefined && { retry }),
  });

  const currentPageData = query.data?.pages[query.data.pages.length - 1];
  const allData = query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    data: allData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    hasNextPage: currentPageData?.hasNext ?? false,
    hasPrevPage: currentPageData?.hasPrev ?? false,
    currentPage: currentPageData?.page ?? 1,
    totalPages: currentPageData?.totalPages ?? 0,
    totalItems: currentPageData?.total ?? 0,
    fetchPage: (_page: number): void => {
      // Note: Our useInfiniteQuery doesn't support arbitrary page jumping
      // This would need to be enhanced if needed
      void query.fetchNextPage();
    },
    refetch: (): void => {
      void query.refetch();
    },
    isEnabled: enabled,
  };
}

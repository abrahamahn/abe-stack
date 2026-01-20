// packages/ui/src/hooks/usePaginatedQuery.ts
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

import type {
  CursorPaginatedResult,
  CursorPaginationOptions,
  PaginatedResult,
  PaginationOptions,
} from '@abe-stack/core';
type QueryClientLike = {
  invalidateQueries: (filters: { queryKey: string[] }) => void;
};

type InfiniteQueryResult<TPage, TError> = {
  data?: { pages: TPage[] };
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  error: TError | null;
  hasNextPage?: boolean;
  fetchNextPage: (options?: { pageParam?: number | string | null }) => Promise<unknown>;
  refetch: () => Promise<unknown>;
  remove: () => void;
};

const useQueryClientTyped = useQueryClient as unknown as () => QueryClientLike;
const useInfiniteQueryTyped = useInfiniteQuery as unknown as <TPage, TError, TPageParam>(options: {
  queryKey: readonly unknown[];
  queryFn: (context: { pageParam?: TPageParam }) => Promise<TPage>;
  getNextPageParam?: (lastPage: TPage) => TPageParam | undefined;
  getPreviousPageParam?: (firstPage: TPage) => TPageParam | undefined;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  keepPreviousData?: boolean;
}) => InfiniteQueryResult<TPage, TError>;

/**
 * Configuration for usePaginatedQuery hook
 */
export interface UsePaginatedQueryOptions<TData = unknown, TError = unknown> {
  /** Query key for React Query */
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
  /** Stale time for React Query */
  staleTime?: number;
  /** Cache time for React Query */
  cacheTime?: number;
  /** Refetch interval */
  refetchInterval?: number;
  /** Whether to keep previous data while loading */
  keepPreviousData?: boolean;
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
  cacheTime,
  refetchInterval,
  keepPreviousData = true,
}: UsePaginatedQueryOptions<TData, TError>): UsePaginatedQueryResult<TData> {
  const queryClient = useQueryClientTyped();
  const hasCalledOnDataReceivedRef = useRef(false);

  // Default pagination options
  const defaultOptions: CursorPaginationOptions = {
    cursor: undefined,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialOptions,
  };

  // Infinite query for handling pagination
  const infiniteQuery = useInfiniteQueryTyped<CursorPaginatedResult<TData>, TError, string | null>({
    queryKey,
    queryFn: async ({ pageParam }: { pageParam?: string | null }) => {
      const options: CursorPaginationOptions = {
        ...defaultOptions,
        cursor: pageParam ?? undefined,
      };

      try {
        const result = await queryFn(options);
        return result;
      } catch (error) {
        onError?.(error as TError);
        throw error;
      }
    },
    getNextPageParam: (lastPage: CursorPaginatedResult<TData>) => {
      return lastPage.hasNext ? lastPage.nextCursor : undefined;
    },
    enabled,
    staleTime,
    cacheTime,
    refetchInterval,
    keepPreviousData,
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
    infiniteQuery.remove();
    queryClient.invalidateQueries({ queryKey });
  }, [infiniteQuery, queryClient, queryKey]);

  return {
    data,
    isLoading: infiniteQuery.isLoading,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    isFetching: infiniteQuery.isFetching,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage ?? false,
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
  cacheTime?: number;
  refetchInterval?: number;
  keepPreviousData?: boolean;
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
  cacheTime,
  refetchInterval,
  keepPreviousData = true,
}: UseOffsetPaginatedQueryOptions<TData, TError>): UseOffsetPaginatedQueryResult<TData> {
  const defaultOptions: PaginationOptions = {
    page: 1,
    limit: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    ...initialOptions,
  };

  const query = useInfiniteQueryTyped<PaginatedResult<TData>, TError, number>({
    queryKey: [...queryKey, 'offset'],
    queryFn: async ({ pageParam }: { pageParam?: number }) => {
      const options: PaginationOptions = {
        ...defaultOptions,
        page: pageParam ?? defaultOptions.page,
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
    getNextPageParam: (lastPage: PaginatedResult<TData>) => {
      return lastPage.hasNext ? lastPage.page + 1 : undefined;
    },
    getPreviousPageParam: (firstPage: PaginatedResult<TData>) => {
      return firstPage.hasPrev ? firstPage.page - 1 : undefined;
    },
    enabled,
    staleTime,
    cacheTime,
    refetchInterval,
    keepPreviousData,
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
    fetchPage: (page: number): void => {
      void query.fetchNextPage({ pageParam: page });
    },
    refetch: (): void => {
      void query.refetch();
    },
    isEnabled: enabled,
  };
}

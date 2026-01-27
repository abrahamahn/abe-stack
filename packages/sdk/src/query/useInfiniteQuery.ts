// packages/sdk/src/query/useInfiniteQuery.ts
/**
 * useInfiniteQuery - React hook for paginated data fetching.
 *
 * Provides a React Query-compatible API for infinite scrolling
 * and cursor-based pagination.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useQueryCache } from './QueryCacheProvider';

import type { QueryKey, QueryState } from './QueryCache';

// ============================================================================
// Types
// ============================================================================

/**
 * Page parameter type for getNextPageParam/getPreviousPageParam.
 */
export type InfinitePageParam = string | number | null | undefined;

/**
 * Options for useInfiniteQuery hook.
 */
export interface UseInfiniteQueryOptions<
  TData = unknown,
  TError = Error,
  TPageParam extends InfinitePageParam = InfinitePageParam,
> {
  /** Unique key for the query */
  queryKey: QueryKey;
  /** Function that fetches a page of data */
  queryFn: (context: { pageParam: TPageParam }) => Promise<TData>;
  /** Initial page parameter */
  initialPageParam: TPageParam;
  /** Function to get the next page parameter from the last page */
  getNextPageParam: (lastPage: TData, allPages: TData[]) => TPageParam | undefined;
  /** Function to get the previous page parameter from the first page */
  getPreviousPageParam?: (firstPage: TData, allPages: TData[]) => TPageParam | undefined;
  /** Whether the query is enabled */
  enabled?: boolean;
  /** Time in ms before data is considered stale */
  staleTime?: number;
  /** Time in ms before unused queries are garbage collected */
  gcTime?: number;
  /** Number of retries on failure */
  retry?: number | boolean;
  /** Delay between retries in ms */
  retryDelay?: number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Callback when query succeeds */
  onSuccess?: (data: InfiniteData<TData>) => void;
  /** Callback when query fails */
  onError?: (error: TError) => void;
}

/**
 * Infinite data structure containing all pages.
 */
export interface InfiniteData<
  TData = unknown,
  TPageParam extends InfinitePageParam = InfinitePageParam,
> {
  pages: TData[];
  pageParams: TPageParam[];
}

/**
 * Result of useInfiniteQuery hook.
 */
export interface UseInfiniteQueryResult<TData = unknown, TError = Error> {
  /** All pages of data */
  data: InfiniteData<TData> | undefined;
  /** Error if the query failed */
  error: TError | null;
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Whether we're fetching the next page */
  isFetchingNextPage: boolean;
  /** Whether we're fetching the previous page */
  isFetchingPreviousPage: boolean;
  /** Whether the query failed */
  isError: boolean;
  /** Whether the query succeeded */
  isSuccess: boolean;
  /** Whether there's a next page to fetch */
  hasNextPage: boolean;
  /** Whether there's a previous page to fetch */
  hasPreviousPage: boolean;
  /** Fetch the next page */
  fetchNextPage: () => Promise<void>;
  /** Fetch the previous page */
  fetchPreviousPage: () => Promise<void>;
  /** Refetch all pages */
  refetch: () => Promise<void>;
  /** The current query status */
  status: QueryState['status'];
  /** The current fetch status */
  fetchStatus: QueryState['fetchStatus'];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RETRY = 3;
const DEFAULT_RETRY_DELAY = 1000;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching paginated/infinite data.
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const {
 *     data,
 *     isLoading,
 *     isFetchingNextPage,
 *     hasNextPage,
 *     fetchNextPage,
 *   } = useInfiniteQuery({
 *     queryKey: ['users'],
 *     queryFn: ({ pageParam }) => fetchUsers({ cursor: pageParam }),
 *     initialPageParam: undefined,
 *     getNextPageParam: (lastPage) => lastPage.nextCursor,
 *   });
 *
 *   const users = data?.pages.flatMap(page => page.users) ?? [];
 *
 *   return (
 *     <div>
 *       {users.map(user => <UserCard key={user.id} user={user} />)}
 *       {hasNextPage && (
 *         <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
 *           Load More
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInfiniteQuery<
  TData = unknown,
  TError = Error,
  TPageParam extends InfinitePageParam = InfinitePageParam,
>(
  options: UseInfiniteQueryOptions<TData, TError, TPageParam>,
): UseInfiniteQueryResult<TData, TError> {
  const {
    queryKey,
    queryFn,
    initialPageParam,
    getNextPageParam,
    getPreviousPageParam,
    enabled = true,
    staleTime,
    retry = DEFAULT_RETRY,
    retryDelay = DEFAULT_RETRY_DELAY,
    onSuccess,
    onError,
  } = options;

  const cache = useQueryCache();

  // Local state for infinite data
  const [infiniteData, setInfiniteData] = useState<InfiniteData<TData, TPageParam> | undefined>(
    undefined,
  );
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isFetchingPreviousPage, setIsFetchingPreviousPage] = useState(false);

  const abortController = useRef<AbortController | null>(null);

  // Subscribe to cache changes
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return cache.subscribe(queryKey, onStoreChange);
    },
    [cache, queryKey],
  );

  // Get current state snapshot
  const getSnapshot = useCallback(():
    | QueryState<InfiniteData<TData, TPageParam>, TError>
    | undefined => {
    return cache.getQueryState<InfiniteData<TData, TPageParam>, TError>(queryKey);
  }, [cache, queryKey]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Sync cache state to local state
  useEffect(() => {
    if (state !== undefined && state.data !== undefined && state.data !== null) {
      setInfiniteData(state.data);
    }
  }, [state]);

  // Fetch a single page with retry logic
  const fetchPage = useCallback(
    async (pageParam: TPageParam): Promise<TData> => {
      const maxRetries = typeof retry === 'boolean' ? (retry ? DEFAULT_RETRY : 0) : retry;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const data = await queryFn({ pageParam });
          return data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          }
        }
      }

      const errorToThrow = lastError ?? new Error('Unknown fetch error');
      throw errorToThrow;
    },
    [queryFn, retry, retryDelay],
  );

  // Fetch initial page
  const fetchInitialPage = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    // Check if data is fresh
    if (!cache.isStale(queryKey) && (infiniteData?.pages.length ?? 0) > 0) return;

    if (abortController.current !== null) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    cache.setFetchStatus(queryKey, 'fetching');

    try {
      const firstPage = await fetchPage(initialPageParam);

      if (abortController.current !== null && abortController.current.signal.aborted) return;

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [firstPage],
        pageParams: [initialPageParam],
      };

      setInfiniteData(newData);
      cache.setQueryData(queryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      if (abortController.current !== null && abortController.current.signal.aborted) return;

      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(queryKey, error);
      if (onError !== undefined) {
        onError(error as TError);
      }
    }
  }, [
    enabled,
    queryKey,
    infiniteData,
    fetchPage,
    initialPageParam,
    staleTime,
    onSuccess,
    onError,
    cache,
  ]);

  // Fetch next page
  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (!enabled || infiniteData === undefined || infiniteData.pages.length === 0) return;

    const lastPage = infiniteData.pages[infiniteData.pages.length - 1];
    if (lastPage === undefined) return;
    const nextPageParam = getNextPageParam(lastPage, infiniteData.pages);

    if (nextPageParam === undefined) return;

    setIsFetchingNextPage(true);
    cache.setFetchStatus(queryKey, 'fetching');

    try {
      const nextPage = await fetchPage(nextPageParam as TPageParam);

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [...infiniteData.pages, nextPage],
        pageParams: [...infiniteData.pageParams, nextPageParam as TPageParam],
      };

      setInfiniteData(newData);
      cache.setQueryData(queryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(queryKey, error);
      if (onError !== undefined) {
        onError(error as TError);
      }
    } finally {
      setIsFetchingNextPage(false);
    }
  }, [
    enabled,
    infiniteData,
    getNextPageParam,
    fetchPage,
    staleTime,
    onSuccess,
    onError,
    cache,
    queryKey,
  ]);

  // Fetch previous page
  const fetchPreviousPage = useCallback(async (): Promise<void> => {
    if (!enabled || infiniteData === undefined || infiniteData.pages.length === 0 || getPreviousPageParam === undefined)
      return;

    const firstPage = infiniteData.pages[0];
    if (firstPage === undefined) return;
    const prevPageParam = getPreviousPageParam(firstPage, infiniteData.pages);

    if (prevPageParam === undefined) return;

    setIsFetchingPreviousPage(true);
    cache.setFetchStatus(queryKey, 'fetching');

    try {
      const prevPage = await fetchPage(prevPageParam as TPageParam);

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [prevPage, ...infiniteData.pages],
        pageParams: [prevPageParam as TPageParam, ...infiniteData.pageParams],
      };

      setInfiniteData(newData);
      cache.setQueryData(queryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(queryKey, error);
      if (onError !== undefined) {
        onError(error as TError);
      }
    } finally {
      setIsFetchingPreviousPage(false);
    }
  }, [
    enabled,
    infiniteData,
    getPreviousPageParam,
    fetchPage,
    staleTime,
    onSuccess,
    onError,
    cache,
    queryKey,
  ]);

  // Refetch all pages
  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    abortController.current?.abort();
    abortController.current = new AbortController();

    cache.invalidateQuery(queryKey);
    setInfiniteData(undefined);

    await fetchInitialPage();
  }, [enabled, queryKey, fetchInitialPage, cache]);

  // Initial fetch effect
  useEffect(() => {
    if (!enabled) return;

    if (cache.isStale(queryKey) || (infiniteData?.pages.length ?? 0) === 0) {
      void fetchInitialPage();
    }

    return (): void => {
      if (abortController.current !== null) {
        abortController.current.abort();
      }
    };
  }, [enabled, queryKey, cache, infiniteData, fetchInitialPage]);

  // Derive computed values
  const error = (state?.error as TError | null) ?? null;
  const status = state?.status ?? 'pending';
  const fetchStatus = state?.fetchStatus ?? 'idle';

  const isLoading = status === 'pending' && fetchStatus === 'fetching';
  const isFetching = fetchStatus === 'fetching';
  const isError = status === 'error';
  const isSuccess = status === 'success';

  // Calculate hasNextPage and hasPreviousPage
  const lastPageForNext = infiniteData?.pages[infiniteData.pages.length - 1];
  const hasNextPage =
    lastPageForNext !== undefined && infiniteData !== undefined
      ? getNextPageParam(lastPageForNext, infiniteData.pages) !== undefined
      : false;

  const firstPageForPrev = infiniteData?.pages[0];
  const hasPreviousPage =
    firstPageForPrev !== undefined && getPreviousPageParam !== undefined && infiniteData !== undefined
      ? getPreviousPageParam(firstPageForPrev, infiniteData.pages) !== undefined
      : false;

  return {
    data: infiniteData,
    error,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isFetchingPreviousPage,
    isError,
    isSuccess,
    hasNextPage,
    hasPreviousPage,
    fetchNextPage,
    fetchPreviousPage,
    refetch,
    status,
    fetchStatus,
  };
}

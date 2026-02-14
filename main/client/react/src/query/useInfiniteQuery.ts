// main/client/react/src/query/useInfiniteQuery.ts
/**
 * useInfiniteQuery - React hook for paginated data fetching.
 *
 * Provides a React Query-compatible API for infinite scrolling
 * and cursor-based pagination.
 */

import { hashQueryKey } from '@abe-stack/client-engine';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  logQueryFailure,
  logQueryRetryDecision,
  logQueryRetryWait,
  logQueryStart,
  logQuerySuccess,
} from './debug';
import { useQueryCache } from './QueryCacheProvider';

import type { QueryKey, QueryState } from '@abe-stack/client-engine';

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

const getHttpStatus = (error: unknown): number | null => {
  const status = (error as { status?: unknown }).status;
  if (typeof status === 'number') return status;

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  if (typeof statusCode === 'number') return statusCode;

  return null;
};

const shouldRetryError = (error: unknown): boolean => {
  const status = getHttpStatus(error);
  if (status === null) return true;
  if (status === 0) return true;
  if (status === 429 || status === 408) return true;
  if (status >= 500) return true;
  if (status >= 400 && status < 500) return false;
  return true;
};

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

  // Stable hash of queryKey for effect dependencies (avoids infinite loop from array recreation)
  const queryKeyHash = hashQueryKey(queryKey);

  // Keep queryKey in a ref to access current value without adding it as a dependency
  const queryKeyRef = useRef(queryKey);
  useEffect(() => {
    queryKeyRef.current = queryKey;
  }, [queryKey]);

  // Local state for infinite data
  const [infiniteData, setInfiniteData] = useState<InfiniteData<TData, TPageParam> | undefined>(
    undefined,
  );
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isFetchingPreviousPage, setIsFetchingPreviousPage] = useState(false);

  const abortController = useRef<AbortController | null>(null);
  const infiniteDataRef = useRef<InfiniteData<TData, TPageParam> | undefined>(undefined);
  const isFetchingRef = useRef(false);

  // Keep ref in sync with state
  useEffect(() => {
    infiniteDataRef.current = infiniteData;
  }, [infiniteData]);

  // Subscribe to cache changes (use queryKeyRef to avoid recreating on array reference change)
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return cache.subscribe(queryKeyRef.current, onStoreChange);
    },
    [cache, queryKeyHash],
  );

  // Get current state snapshot (use queryKeyRef to avoid recreating on array reference change)
  const getSnapshot = useCallback(():
    | QueryState<InfiniteData<TData, TPageParam>, TError>
    | undefined => {
    return cache.getQueryState<InfiniteData<TData, TPageParam>, TError>(queryKeyRef.current);
  }, [cache, queryKeyHash]);

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Sync cache state to local state
  useEffect(() => {
    if (state?.data !== undefined) {
      setInfiniteData(state.data);
    }
  }, [state]);

  // Fetch a single page with retry logic
  const fetchPage = useCallback(
    async (pageParam: TPageParam): Promise<TData> => {
      const maxRetries = typeof retry === 'boolean' ? (retry ? DEFAULT_RETRY : 0) : retry;
      const startedAt = logQueryStart(queryKeyRef.current);
      let attempts = 0;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          attempts = attempt + 1;
          const data = await queryFn({ pageParam });
          logQuerySuccess(queryKeyRef.current, startedAt, attempts);
          return data;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          const status = getHttpStatus(err);
          const retryable = shouldRetryError(err);
          logQueryRetryDecision(queryKeyRef.current, attempt, maxRetries, {
            retryable,
            status,
            reason: retryable ? 'transient-or-unknown' : 'non-retryable-http-status',
          });
          if (!retryable) {
            break;
          }

          if (attempt < maxRetries) {
            const delayMs = retryDelay * Math.pow(2, attempt);
            logQueryRetryWait(queryKeyRef.current, delayMs);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }

      const errorToThrow = lastError ?? new Error('Unknown fetch error');
      logQueryFailure(queryKeyRef.current, startedAt, attempts, errorToThrow);
      throw errorToThrow;
    },
    [queryFn, retry, retryDelay],
  );

  // Fetch initial page (use queryKeyRef.current to avoid dependency on array reference)
  const fetchInitialPage = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    const currentQueryKey = queryKeyRef.current;

    // Check if data is fresh - use cache data directly, not local ref
    // (local ref may be empty on remount even if cache has fresh data)
    const cachedData = cache.getQueryData(currentQueryKey) as
      | InfiniteData<TData, TPageParam>
      | undefined;
    if (!cache.isStale(currentQueryKey) && (cachedData?.pages.length ?? 0) > 0) return;

    // Prevent duplicate fetches
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (abortController.current !== null) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    cache.setFetchStatus(currentQueryKey, 'fetching');

    try {
      const firstPage = await fetchPage(initialPageParam);

      if (abortController.current.signal.aborted) {
        isFetchingRef.current = false;
        return;
      }

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [firstPage],
        pageParams: [initialPageParam],
      };

      setInfiniteData(newData);
      cache.setQueryData(currentQueryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      if (abortController.current.signal.aborted) {
        isFetchingRef.current = false;
        return;
      }

      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(currentQueryKey, error);
      if (onError !== undefined) {
        onError(error as TError);
      }
    } finally {
      isFetchingRef.current = false;
    }
  }, [enabled, queryKeyHash, fetchPage, initialPageParam, staleTime, onSuccess, onError, cache]);

  // Fetch next page (use queryKeyRef.current to avoid dependency on array reference)
  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (!enabled || infiniteData === undefined || infiniteData.pages.length === 0) return;

    const currentQueryKey = queryKeyRef.current;
    const lastPage = infiniteData.pages[infiniteData.pages.length - 1];
    if (lastPage === undefined) return;
    const nextPageParam = getNextPageParam(lastPage, infiniteData.pages);

    if (nextPageParam === undefined) return;

    setIsFetchingNextPage(true);
    cache.setFetchStatus(currentQueryKey, 'fetching');

    try {
      const nextPage = await fetchPage(nextPageParam as TPageParam);

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [...infiniteData.pages, nextPage],
        pageParams: [...infiniteData.pageParams, nextPageParam as TPageParam],
      };

      setInfiniteData(newData);
      cache.setQueryData(currentQueryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(currentQueryKey, error);
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
    queryKeyHash,
  ]);

  // Fetch previous page (use queryKeyRef.current to avoid dependency on array reference)
  const fetchPreviousPage = useCallback(async (): Promise<void> => {
    if (
      !enabled ||
      infiniteData === undefined ||
      infiniteData.pages.length === 0 ||
      getPreviousPageParam === undefined
    )
      return;

    const currentQueryKey = queryKeyRef.current;
    const firstPage = infiniteData.pages[0];
    if (firstPage === undefined) return;
    const prevPageParam = getPreviousPageParam(firstPage, infiniteData.pages);

    if (prevPageParam === undefined) return;

    setIsFetchingPreviousPage(true);
    cache.setFetchStatus(currentQueryKey, 'fetching');

    try {
      const prevPage = await fetchPage(prevPageParam as TPageParam);

      const newData: InfiniteData<TData, TPageParam> = {
        pages: [prevPage, ...infiniteData.pages],
        pageParams: [prevPageParam as TPageParam, ...infiniteData.pageParams],
      };

      setInfiniteData(newData);
      cache.setQueryData(currentQueryKey, newData, staleTime !== undefined ? { staleTime } : {});
      if (onSuccess !== undefined) {
        onSuccess(newData);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      cache.setQueryError(currentQueryKey, error);
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
    queryKeyHash,
  ]);

  // Refetch all pages (use queryKeyRef.current to avoid dependency on array reference)
  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;

    abortController.current?.abort();
    abortController.current = new AbortController();

    cache.invalidateQuery(queryKeyRef.current);
    setInfiniteData(undefined);

    await fetchInitialPage();
  }, [enabled, queryKeyHash, fetchInitialPage, cache]);

  // Keep fetchInitialPage ref in sync
  const fetchInitialPageRef = useRef(fetchInitialPage);
  useEffect(() => {
    fetchInitialPageRef.current = fetchInitialPage;
  }, [fetchInitialPage]);

  // Initial fetch effect - use refs and queryKeyHash to avoid infinite loop from array reference changes
  useEffect(() => {
    if (!enabled) return;

    // Check cache data directly - local ref may be empty on remount even if cache has fresh data
    const cachedData = cache.getQueryData(queryKeyRef.current) as
      | InfiniteData<TData, TPageParam>
      | undefined;
    if (cache.isStale(queryKeyRef.current) || (cachedData?.pages.length ?? 0) === 0) {
      void fetchInitialPageRef.current();
    }

    return (): void => {
      // Reset isFetchingRef before abort to allow StrictMode re-run to proceed
      isFetchingRef.current = false;
      if (abortController.current !== null) {
        abortController.current.abort();
      }
    };
    // Use queryKeyHash instead of queryKey to avoid re-running on array reference change
  }, [enabled, queryKeyHash, cache]);

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
    firstPageForPrev !== undefined &&
    getPreviousPageParam !== undefined &&
    infiniteData !== undefined
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

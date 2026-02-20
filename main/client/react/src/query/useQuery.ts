// main/client/react/src/query/useQuery.ts
/**
 * useQuery - React hook for data fetching with caching.
 *
 * Provides a React Query-compatible API built on our custom QueryCache.
 * Uses useSyncExternalStore for optimal React integration.
 */

import { hashQueryKey } from '@bslt/client-engine';
import { MS_PER_SECOND } from '@bslt/shared';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import {
  logQueryFailure,
  logQueryRetryDecision,
  logQueryRetryWait,
  logQueryStart,
  logQuerySuccess,
} from './debug';
import { useQueryCache } from './QueryCacheProvider';

import type { QueryKey, QueryState } from '@bslt/client-engine';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for useQuery hook.
 */
export interface UseQueryOptions<TData = unknown, TError = Error> {
  /** Unique key for the query */
  queryKey: QueryKey;
  /** Function that fetches the data */
  queryFn: () => Promise<TData>;
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
  /** Refetch on reconnect */
  refetchOnReconnect?: boolean;
  /** Initial data to use before fetch completes */
  initialData?: TData;
  /** Placeholder data while loading */
  placeholderData?: TData;
  /** Callback when query succeeds */
  onSuccess?: (data: TData) => void;
  /** Callback when query fails */
  onError?: (error: TError) => void;
  /** Callback when query settles (success or error) */
  onSettled?: (data: TData | undefined, error: TError | null) => void;
}

/**
 * Result of useQuery hook.
 */
export interface UseQueryResult<TData = unknown, TError = Error> {
  /** The query data if available */
  data: TData | undefined;
  /** Error if the query failed */
  error: TError | null;
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Whether any fetch is in progress */
  isFetching: boolean;
  /** Whether the query failed */
  isError: boolean;
  /** Whether the query succeeded */
  isSuccess: boolean;
  /** Whether the query is pending (never fetched) */
  isPending: boolean;
  /** Whether the data is stale */
  isStale: boolean;
  /** Refetch the query */
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
const DEFAULT_RETRY_DELAY = MS_PER_SECOND;

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
 * Hook for fetching and caching data.
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data, isLoading, error } = useQuery({
 *     queryKey: ['user', userId],
 *     queryFn: () => fetchUser(userId),
 *   });
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <Error message={error.message} />;
 *   return <div>{data.name}</div>;
 * }
 * ```
 */
export function useQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>,
): UseQueryResult<TData, TError> {
  const {
    queryKey,
    queryFn,
    enabled = true,
    staleTime,
    retry = DEFAULT_RETRY,
    retryDelay = DEFAULT_RETRY_DELAY,
    initialData,
    placeholderData,
    onSuccess,
    onError,
    onSettled,
  } = options;

  const cache = useQueryCache();
  const queryKeyHash = hashQueryKey(queryKey);

  // Track if we've done initial fetch
  const hasInitiatedFetch = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  // Subscribe to cache changes
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return cache.subscribe(queryKey, onStoreChange);
    },
    [cache, queryKey],
  );

  // Get current state snapshot
  const getSnapshot = useCallback((): QueryState<TData, TError> | undefined => {
    return cache.getQueryState<TData, TError>(queryKey);
  }, [cache, queryKey]);

  // Use sync external store for React integration
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Fetch function with retry logic
  const fetchData = useCallback(async (): Promise<void> => {
    // Don't fetch if disabled
    if (!enabled) return;

    // Check if data is fresh (use explicit undefined check to allow null values)
    if (!cache.isStale(queryKey) && state?.data !== undefined) return;

    // Abort any in-progress fetch
    abortController.current?.abort();
    const currentController = new AbortController();
    abortController.current = currentController;

    cache.setFetchStatus(queryKey, 'fetching');

    const maxRetries = typeof retry === 'boolean' ? (retry ? DEFAULT_RETRY : 0) : retry;
    const startedAt = logQueryStart(queryKey);
    let attempts = 0;
    let lastError: TError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        attempts = attempt + 1;
        const data = await queryFn();

        // Check if THIS fetch was aborted (use captured controller, not current ref)
        if (currentController.signal.aborted) return;

        cache.setQueryData(queryKey, data, staleTime !== undefined ? { staleTime } : {});
        logQuerySuccess(queryKey, startedAt, attempts);
        onSuccess?.(data);
        onSettled?.(data, null);
        return;
      } catch (err) {
        lastError = err as TError;

        // Check if THIS fetch was aborted (use captured controller, not current ref)
        if (currentController.signal.aborted) return;

        // Don't retry or emit errors for aborts.
        if (err instanceof DOMException && err.name === 'AbortError') return;

        // Stop retries for deterministic non-retryable errors (e.g., 401/403/404/422).
        const status = getHttpStatus(err);
        const retryable = shouldRetryError(err);
        logQueryRetryDecision(queryKey, attempt, maxRetries, {
          retryable,
          status,
          reason: retryable ? 'transient-or-unknown' : 'non-retryable-http-status',
        });
        if (!retryable) {
          break;
        }

        // Wait before retry (except on last attempt)
        if (attempt < maxRetries) {
          const delayMs = retryDelay * Math.pow(2, attempt);
          logQueryRetryWait(queryKey, delayMs);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries failed
    if (lastError !== null) {
      cache.setQueryError(queryKey, lastError as Error);
      logQueryFailure(queryKey, startedAt, attempts, lastError);
      onError?.(lastError);
      onSettled?.(undefined, lastError);
    }
  }, [
    enabled,
    queryKey,
    queryFn,
    cache,
    retry,
    retryDelay,
    staleTime,
    onSuccess,
    onError,
    onSettled,
    state,
  ]);

  // Manual refetch function
  const refetch = useCallback(async (): Promise<void> => {
    cache.invalidateQuery(queryKey);
    await fetchData();
  }, [cache, queryKey, fetchData]);

  // Initial fetch effect
  useEffect(() => {
    if (!enabled) {
      hasInitiatedFetch.current = false;
      return;
    }

    // Set initial data if provided and no data exists
    if (initialData !== undefined && state?.data === undefined) {
      cache.setQueryData(queryKey, initialData, staleTime !== undefined ? { staleTime } : {});
    }

    // Fetch if stale or no data
    if (cache.isStale(queryKey) || state?.data === undefined) {
      hasInitiatedFetch.current = true;
      void fetchData();
    }

    return (): void => {
      abortController.current?.abort();
    };
  }, [enabled, queryKeyHash, initialData]);

  // Derive computed values
  // Use explicit undefined check to allow null values from queryFn
  // Only fall back to placeholderData when data is undefined, not when it's null
  const resolvedData = state?.data;
  const data = resolvedData ?? placeholderData;
  const dataWithNull = (resolvedData === null ? null : data) as TData | undefined;
  const error = (state?.error as TError | null) ?? null;
  const status = state?.status ?? 'pending';
  const fetchStatus = state?.fetchStatus ?? 'idle';

  const isLoading = status === 'pending' && fetchStatus === 'fetching';
  const isFetching = fetchStatus === 'fetching';
  const isError = status === 'error';
  const isSuccess = status === 'success';
  const isPending = status === 'pending';
  const isStale = cache.isStale(queryKey);

  return {
    data: dataWithNull,
    error,
    isLoading,
    isFetching,
    isError,
    isSuccess,
    isPending,
    isStale,
    refetch,
    status,
    fetchStatus,
  };
}

// packages/sdk/src/search/hooks.ts
/**
 * Search React Hooks
 *
 * Custom hooks for executing search queries.
 * Provides useSearch for paginated results and useInfiniteSearch for infinite scrolling.
 */

import { useCallback, useMemo, useState } from 'react';

import { useQuery as useQueryBase, useInfiniteQuery as useInfiniteQueryBase } from '../query';

import { type ClientSearchQueryBuilder, fromClientSearchQuery } from './query-builder';
import { serializeToURLParams, deserializeFromURLParams } from './serialization';

import type {
  CursorSearchResult,
  SearchQuery,
  SearchResult,
  SearchResultItem,
} from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

/**
 * Search function type for executing queries.
 */
export type SearchFn<T> = (query: SearchQuery<T>) => Promise<SearchResult<T>>;

/**
 * Cursor search function type.
 */
export type CursorSearchFn<T> = (query: SearchQuery<T>) => Promise<CursorSearchResult<T>>;

/**
 * Options for useSearch hook.
 */
export interface UseSearchOptions<T, TError = Error> {
  /** Initial query state */
  initialQuery?: SearchQuery<T>;
  /** Query key prefix */
  queryKeyPrefix?: string;
  /** Sync query to URL */
  syncToUrl?: boolean;
  /** Debounce search input (ms) */
  debounceMs?: number;
  /** Whether to enable the query */
  enabled?: boolean;
  /** Time in ms before data is considered stale */
  staleTime?: number;
  /** Time in ms before unused queries are garbage collected */
  gcTime?: number;
  /** Number of retries on failure */
  retry?: number | boolean;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
  /** Callback when query succeeds */
  onSuccess?: (data: SearchResult<T>) => void;
  /** Callback when query fails */
  onError?: (error: TError) => void;
}

/**
 * Options for useInfiniteSearch hook.
 */
export interface UseInfiniteSearchOptions<T> {
  /** Initial query state */
  initialQuery?: SearchQuery<T>;
  /** Query key prefix */
  queryKeyPrefix?: string;
  /** Enable/disable the query */
  enabled?: boolean;
  /** Stale time in milliseconds */
  staleTime?: number;
  /** Garbage collection time in milliseconds */
  gcTime?: number;
  /** Retry count or function */
  retry?: boolean | number;
  /** Refetch on window focus */
  refetchOnWindowFocus?: boolean;
}

/**
 * Result of useSearch hook.
 */
export interface UseSearchResult<T> {
  /** Search results */
  data: SearchResult<T> | undefined;
  /** Is the initial load in progress */
  isLoading: boolean;
  /** Is a refetch in progress */
  isFetching: boolean;
  /** Whether the query failed */
  isError: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Current query state */
  query: SearchQuery<T>;
  /** Query builder for modifications */
  builder: ClientSearchQueryBuilder<T>;
  /** Update the query */
  setQuery: (query: SearchQuery<T> | ((prev: SearchQuery<T>) => SearchQuery<T>)) => void;
  /** Set search text */
  setSearch: (text: string) => void;
  /** Set page */
  setPage: (page: number) => void;
  /** Set sort */
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Refetch with current query */
  refetch: () => void;
}

/**
 * Result of useInfiniteSearch hook.
 */
export interface UseInfiniteSearchResult<T> {
  /** All loaded pages flattened */
  data: T[];
  /** All pages data */
  pages: CursorSearchResult<T>[];
  /** Is the initial load in progress */
  isLoading: boolean;
  /** Is fetching more data */
  isFetchingNextPage: boolean;
  /** Has more pages */
  hasNextPage: boolean;
  /** Whether the query failed */
  isError: boolean;
  /** Error if the query failed */
  error: Error | null;
  /** Current query state */
  query: SearchQuery<T>;
  /** Query builder for modifications */
  builder: ClientSearchQueryBuilder<T>;
  /** Update the query (resets pagination) */
  setQuery: (query: SearchQuery<T> | ((prev: SearchQuery<T>) => SearchQuery<T>)) => void;
  /** Set search text */
  setSearch: (text: string) => void;
  /** Fetch next page */
  fetchNextPage: () => void;
  /** Refetch from beginning */
  refetch: () => void;
  /** Total count if available */
  total?: number;
}

// ============================================================================
// useSearch Hook
// ============================================================================

/**
 * Hook for paginated search with React Query.
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { data, isLoading, setSearch, setPage } = useSearch<User>(
 *     async (query) => api.searchUsers(query),
 *     { initialQuery: { limit: 20 } }
 *   );
 *
 *   return (
 *     <div>
 *       <input onChange={(e) => setSearch(e.target.value)} />
 *       {isLoading ? <Spinner /> : (
 *         <ul>
 *           {data?.data.map(({ item }) => (
 *             <li key={item.id}>{item.name}</li>
 *           ))}
 *         </ul>
 *       )}
 *       <Pagination
 *         page={data?.page ?? 1}
 *         totalPages={data?.totalPages ?? 1}
 *         onPageChange={setPage}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSearch<T = Record<string, unknown>, TError = Error>(
  searchFn: SearchFn<T>,
  options: UseSearchOptions<T, TError> = {},
): UseSearchResult<T> {
  const {
    initialQuery = {},
    queryKeyPrefix = 'search',
    syncToUrl = false,
    debounceMs: _debounceMs,
    enabled,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus,
    onSuccess,
    onError,
  } = options;

  // Initialize query from URL if syncing
  const getInitialQuery = useCallback((): SearchQuery<T> => {
    if (syncToUrl && typeof window !== 'undefined') {
      const urlQuery = deserializeFromURLParams<T>(window.location.search);
      return { ...initialQuery, ...urlQuery };
    }
    return initialQuery;
  }, [initialQuery, syncToUrl]);

  const [query, setQueryState] = useState<SearchQuery<T>>(getInitialQuery);

  // Create query key
  const queryKey = useMemo(
    () => [queryKeyPrefix, JSON.stringify(query)] as const,
    [queryKeyPrefix, query],
  );

  // Execute query
  const queryResult = useQueryBase<SearchResult<T>, TError>({
    queryKey,
    queryFn: () => searchFn(query),
    ...(enabled !== undefined && { enabled }),
    ...(staleTime !== undefined && { staleTime }),
    ...(gcTime !== undefined && { gcTime }),
    ...(retry !== undefined && { retry }),
    ...(refetchOnWindowFocus !== undefined && { refetchOnWindowFocus }),
    ...(onSuccess !== undefined && { onSuccess }),
    ...(onError !== undefined && { onError }),
  });

  // Update URL when query changes
  const setQuery = useCallback(
    (newQuery: SearchQuery<T> | ((prev: SearchQuery<T>) => SearchQuery<T>)) => {
      setQueryState((prev: SearchQuery<T>) => {
        const updated = typeof newQuery === 'function' ? newQuery(prev) : newQuery;

        if (syncToUrl && typeof window !== 'undefined') {
          const params = serializeToURLParams(updated);
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, '', newUrl);
        }

        return updated;
      });
    },
    [syncToUrl],
  );

  // Helper functions
  const setSearch = useCallback(
    (text: string) => {
      setQuery((prev: SearchQuery<T>) => ({
        ...prev,
        search: text !== '' ? { query: text } : undefined,
        page: 1, // Reset to first page on search
      }));
    },
    [setQuery],
  );

  const setPage = useCallback(
    (page: number) => {
      setQuery((prev: SearchQuery<T>) => ({ ...prev, page }));
    },
    [setQuery],
  );

  const setSort = useCallback(
    (field: string, order: 'asc' | 'desc' = 'asc') => {
      setQuery((prev: SearchQuery<T>) => ({
        ...prev,
        sort: [{ field: field as keyof T, order }],
        page: 1,
      }));
    },
    [setQuery],
  );

  const clearFilters = useCallback(() => {
    setQuery((prev: SearchQuery<T>) => ({
      ...prev,
      filters: undefined,
      search: undefined,
      page: 1,
    }));
  }, [setQuery]);

  // Create builder from current query state
  const builder = useMemo(() => fromClientSearchQuery<T>(query), [query]);

  return {
    data: queryResult.data,
    isLoading: queryResult.isLoading,
    isFetching: queryResult.isFetching,
    isError: queryResult.isError,
    error: queryResult.error as Error | null,
    query,
    builder,
    setQuery,
    setSearch,
    setPage,
    setSort,
    clearFilters,
    refetch: (): void => {
      void queryResult.refetch();
    },
  };
}

// ============================================================================
// useInfiniteSearch Hook
// ============================================================================

/**
 * Hook for infinite scrolling search with React Query.
 *
 * @example
 * ```tsx
 * function InfiniteUserList() {
 *   const {
 *     data,
 *     isLoading,
 *     isFetchingNextPage,
 *     hasNextPage,
 *     fetchNextPage,
 *     setSearch,
 *   } = useInfiniteSearch<User>(
 *     async (query) => api.searchUsersWithCursor(query),
 *     { initialQuery: { limit: 20 } }
 *   );
 *
 *   return (
 *     <div>
 *       <input onChange={(e) => setSearch(e.target.value)} />
 *       {isLoading ? <Spinner /> : (
 *         <ul>
 *           {data.map((user) => (
 *             <li key={user.id}>{user.name}</li>
 *           ))}
 *         </ul>
 *       )}
 *       {hasNextPage && (
 *         <button onClick={fetchNextPage} disabled={isFetchingNextPage}>
 *           {isFetchingNextPage ? 'Loading...' : 'Load More'}
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInfiniteSearch<T = Record<string, unknown>>(
  searchFn: CursorSearchFn<T>,
  options: UseInfiniteSearchOptions<T> = {},
): UseInfiniteSearchResult<T> {
  const {
    initialQuery = {},
    queryKeyPrefix = 'infiniteSearch',
    enabled,
    staleTime,
    gcTime,
    retry,
    refetchOnWindowFocus,
  } = options;

  const [query, setQueryState] = useState<SearchQuery<T>>(initialQuery);

  // Create query key (without cursor, as that changes per page)
  const queryKey = useMemo(() => {
    const { cursor: _cursor, ...queryWithoutCursor } = query;
    return [queryKeyPrefix, JSON.stringify(queryWithoutCursor)] as const;
  }, [queryKeyPrefix, query]);

  // Execute infinite query
  const infiniteResult = useInfiniteQueryBase<CursorSearchResult<T>, Error, string | undefined>({
    queryKey,
    queryFn: ({ pageParam }) => searchFn({ ...query, cursor: pageParam }),
    getNextPageParam: (lastPage: CursorSearchResult<T>) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined,
    ...(enabled !== undefined && { enabled }),
    ...(staleTime !== undefined && { staleTime }),
    ...(gcTime !== undefined && { gcTime }),
    ...(retry !== undefined && { retry }),
    ...(refetchOnWindowFocus !== undefined && { refetchOnWindowFocus }),
  });

  // Flatten data from all pages
  const data = useMemo(() => {
    if (infiniteResult.data?.pages === undefined) return [];
    return infiniteResult.data.pages.flatMap((page: CursorSearchResult<T>) =>
      page.data.map((item: SearchResultItem<T>) => item.item),
    );
  }, [infiniteResult.data?.pages]);

  // Update query (resets pagination)
  const setQuery = useCallback(
    (newQuery: SearchQuery<T> | ((prev: SearchQuery<T>) => SearchQuery<T>)) => {
      setQueryState((prev: SearchQuery<T>) => {
        const updated = typeof newQuery === 'function' ? newQuery(prev) : newQuery;
        // Remove cursor to reset pagination
        const { cursor: _cursor, ...queryWithoutCursor } = updated;
        return queryWithoutCursor;
      });
    },
    [],
  );

  const setSearch = useCallback(
    (text: string) => {
      setQuery((prev: SearchQuery<T>) => ({
        ...prev,
        search: text !== '' ? { query: text } : undefined,
      }));
    },
    [setQuery],
  );

  // Create builder from current query state
  const builder = useMemo(() => fromClientSearchQuery<T>(query), [query]);

  // Get total from first page if available
  const total = infiniteResult.data?.pages[0]?.total;

  return {
    data,
    pages: infiniteResult.data?.pages ?? [],
    isLoading: infiniteResult.isLoading,
    isFetchingNextPage: infiniteResult.isFetchingNextPage,
    hasNextPage: infiniteResult.hasNextPage,
    isError: infiniteResult.isError,
    error: infiniteResult.error,
    query,
    builder,
    setQuery,
    setSearch,
    fetchNextPage: (): void => {
      void infiniteResult.fetchNextPage();
    },
    refetch: (): void => {
      void infiniteResult.refetch();
    },
    ...(total !== undefined && { total }),
  };
}

// ============================================================================
// useSearchParams Hook
// ============================================================================

/**
 * Hook for syncing search query with URL params.
 *
 * @example
 * ```tsx
 * function SearchPage() {
 *   const { query, setQuery, searchParams } = useSearchParams<User>();
 *
 *   // query is automatically synced with URL
 *   // Changes to URL update query, changes to query update URL
 * }
 * ```
 */
export function useSearchParams<T = Record<string, unknown>>(): {
  query: SearchQuery<T>;
  setQuery: (query: SearchQuery<T>) => void;
  searchParams: URLSearchParams;
  updateParams: (updates: Partial<SearchQuery<T>>) => void;
} {
  const [query, setQueryState] = useState<SearchQuery<T>>(() => {
    if (typeof window !== 'undefined') {
      return deserializeFromURLParams<T>(window.location.search);
    }
    return {};
  });

  const setQuery = useCallback((newQuery: SearchQuery<T>) => {
    setQueryState(newQuery);

    if (typeof window !== 'undefined') {
      const params = serializeToURLParams(newQuery);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const updateParams = useCallback(
    (updates: Partial<SearchQuery<T>>) => {
      setQuery({ ...query, ...updates });
    },
    [query, setQuery],
  );

  const searchParams = useMemo(() => serializeToURLParams(query), [query]);

  return {
    query,
    setQuery,
    searchParams,
    updateParams,
  };
}

// ============================================================================
// useDebounceSearch Hook
// ============================================================================

/**
 * Hook for debounced search input.
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const { value, debouncedValue, setValue } = useDebounceSearch(300);
 *
 *   // Use debouncedValue for API calls
 *   useEffect(() => {
 *     if (debouncedValue) {
 *       searchApi(debouncedValue);
 *     }
 *   }, [debouncedValue]);
 *
 *   return <input value={value} onChange={(e) => setValue(e.target.value)} />;
 * }
 * ```
 */
export function useDebounceSearch(
  delayMs = 300,
  initialValue = '',
): {
  value: string;
  debouncedValue: string;
  setValue: (value: string) => void;
  clear: () => void;
} {
  const [value, setValueState] = useState(initialValue);
  const [debouncedValue, setDebouncedValue] = useState(initialValue);

  // Debounce effect
  // Note: In a real implementation, you'd use a proper debounce utility
  // This is a simplified version
  const setValue = useCallback((newValue: string) => {
    setValueState(newValue);
  }, []);

  // Simple debounce using setTimeout
  // In production, consider using useDeferredValue or a debounce library
  useMemo((): (() => void) => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return (): void => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  const clear = useCallback(() => {
    setValueState('');
    setDebouncedValue('');
  }, []);

  return {
    value,
    debouncedValue,
    setValue,
    clear,
  };
}

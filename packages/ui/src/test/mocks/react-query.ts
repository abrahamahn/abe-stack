// packages/ui/src/test/mocks/react-query.ts
import { act } from '@testing-library/react';
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

import type { ReactElement, ReactNode } from 'react';

type QueryClientLike = {
  getQueryData: (queryKey: readonly unknown[]) => unknown;
  setQueryData: (queryKey: readonly unknown[], data: unknown) => void;
  getQueryState: (
    queryKey: readonly unknown[],
  ) => { status: 'pending' | 'success' | 'error' } | undefined;
  removeQueries: (filters: { queryKey: readonly unknown[]; exact?: boolean }) => void;
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => void;
};

type InfiniteQueryResult<TPage, TError> = {
  data?: { pages: TPage[] };
  isLoading: boolean;
  isFetchingNextPage: boolean;
  isFetching: boolean;
  isError: boolean;
  error: TError | null;
  hasNextPage?: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
  remove: () => void;
};

type InfiniteQueryOptions<TPage, _TError, TPageParam> = {
  queryKey: readonly unknown[];
  queryFn: (context: { pageParam?: TPageParam }) => Promise<TPage>;
  getNextPageParam?: (lastPage: TPage) => TPageParam | undefined;
  enabled?: boolean;
};

const serializeKey = (queryKey: readonly unknown[]): string => JSON.stringify(queryKey);

class QueryClient implements QueryClientLike {
  private store = new Map<string, unknown>();
  private subscribers = new Map<string, Set<() => void>>();
  private states = new Map<string, { status: 'pending' | 'success' | 'error' }>();

  __registerQuery(queryKey: readonly unknown[], refetch: () => void): void {
    const key = serializeKey(queryKey);
    const bucket = this.subscribers.get(key) ?? new Set<() => void>();
    bucket.add(refetch);
    this.subscribers.set(key, bucket);
  }

  __unregisterQuery(queryKey: readonly unknown[], refetch: () => void): void {
    const key = serializeKey(queryKey);
    const bucket = this.subscribers.get(key);
    if (!bucket) return;
    bucket.delete(refetch);
    if (bucket.size === 0) {
      this.subscribers.delete(key);
    }
  }

  getQueryData(queryKey: readonly unknown[]): unknown {
    return this.store.get(serializeKey(queryKey));
  }

  setQueryData(queryKey: readonly unknown[], data: unknown): void {
    const key = serializeKey(queryKey);
    this.store.set(key, data);
    this.states.set(key, { status: 'success' });
  }

  getQueryState(
    queryKey: readonly unknown[],
  ): { status: 'pending' | 'success' | 'error' } | undefined {
    return this.states.get(serializeKey(queryKey));
  }

  removeQueries(filters: { queryKey: readonly unknown[]; exact?: boolean }): void {
    const key = serializeKey(filters.queryKey);
    if (filters.exact ?? true) {
      this.store.delete(key);
      this.states.delete(key);
      return;
    }
    for (const storedKey of this.store.keys()) {
      if (storedKey.startsWith(key)) {
        this.store.delete(storedKey);
        this.states.delete(storedKey);
      }
    }
  }

  invalidateQueries(filters: { queryKey: readonly unknown[] }): void {
    const key = serializeKey(filters.queryKey);
    const bucket = this.subscribers.get(key);
    if (!bucket) return;
    bucket.forEach((refetch) => {
      refetch();
    });
  }
}

const QueryClientContext = createContext<QueryClientLike | null>(null);

const QueryClientProvider = ({
  client,
  children,
}: {
  client: QueryClientLike;
  children: ReactNode;
}): ReactElement =>
  createElement(QueryClientContext.Provider, {
    value: client,
    children,
  });

const useQueryClient = (): QueryClientLike => {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error('QueryClientProvider is missing in the component tree.');
  }
  return client;
};

type QueryClientInternal = QueryClientLike & {
  __registerQuery?: (queryKey: readonly unknown[], refetch: () => void) => void;
  __unregisterQuery?: (queryKey: readonly unknown[], refetch: () => void) => void;
};

const useInfiniteQuery = <TPage, TError, TPageParam>(
  options: InfiniteQueryOptions<TPage, TError, TPageParam>,
): InfiniteQueryResult<TPage, TError> => {
  const { queryFn, getNextPageParam, enabled = true } = options;
  const client = useContext(QueryClientContext) as QueryClientInternal | null;
  const queryFnRef = useRef(queryFn);
  const getNextPageParamRef = useRef(getNextPageParam);
  const [pages, setPages] = useState<TPage[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<TError | null>(null);
  const nextPageParamRef = useRef<TPageParam | undefined>(undefined);

  useEffect(() => {
    queryFnRef.current = queryFn;
    getNextPageParamRef.current = getNextPageParam;
  }, [getNextPageParam, queryFn]);

  const runInAct = useCallback(async (fn: () => Promise<void> | void): Promise<void> => {
    await act(async () => {
      await fn();
    });
  }, []);

  const runQuery = useCallback(
    async (pageParam: TPageParam | undefined, append: boolean) => {
      await runInAct(() => {
        setIsFetching(true);
      });
      try {
        const page = await queryFnRef.current({ pageParam });
        await runInAct(() => {
          setPages((prev) => (append ? [...prev, page] : [page]));
          nextPageParamRef.current = getNextPageParamRef.current
            ? getNextPageParamRef.current(page)
            : undefined;
          setIsError(false);
          setError(null);
        });
      } catch (err) {
        await runInAct(() => {
          setIsError(true);
          setError(err as TError);
        });
      } finally {
        await runInAct(() => {
          setIsLoading(false);
          setIsFetching(false);
          setIsFetchingNextPage(false);
        });
      }
    },
    [runInAct],
  );

  const refetchQuery = useMemo(() => {
    return (): void => {
      void runQuery(undefined, false);
    };
  }, [runQuery]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    void runQuery(undefined, false);
  }, [enabled, runQuery]);

  useEffect(() => {
    if (!client?.__registerQuery) return undefined;
    client.__registerQuery(options.queryKey, refetchQuery);
    return (): void => {
      client.__unregisterQuery?.(options.queryKey, refetchQuery);
    };
  }, [client, options.queryKey, refetchQuery]);

  const fetchNextPage = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    await runInAct(() => {
      setIsFetchingNextPage(true);
    });
    await runQuery(nextPageParamRef.current, true);
  }, [enabled, runInAct, runQuery]);

  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled) return;
    await runQuery(undefined, false);
  }, [enabled, runQuery]);

  const remove = useCallback((): void => {
    act(() => {
      flushSync(() => {
        setPages([]);
        nextPageParamRef.current = undefined;
      });
    });
    if (enabled) {
      void runQuery(undefined, false);
    }
  }, [enabled, runQuery]);

  const hasNextPage = nextPageParamRef.current !== undefined;

  return {
    data: pages.length ? { pages } : undefined,
    isLoading,
    isFetchingNextPage,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
    remove,
  };
};

export { QueryClient, QueryClientProvider, useInfiniteQuery, useQueryClient };

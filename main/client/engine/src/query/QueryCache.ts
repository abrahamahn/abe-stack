// main/client/engine/src/query/QueryCache.ts
/**
 * QueryCache - Manages query state with subscription support.
 *
 * Extends the LoaderCache pattern for React-friendly query state management.
 * Designed to work with useSyncExternalStore for optimal React integration.
 *
 * Features:
 * - Query key → state mapping
 * - Stale time tracking (default 5 min)
 * - GC time for unused queries (default 24 hr)
 * - Subscription support for React
 * - Window focus refetch option
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Query status values.
 */
export type QueryStatus = 'pending' | 'error' | 'success';

/**
 * Fetch status values.
 */
export type FetchStatus = 'idle' | 'fetching' | 'paused';

/**
 * State for a single query.
 */
export interface QueryState<TData = unknown, TError = Error> {
  /** The query data if successful */
  data: TData | undefined;
  /** Error if the query failed */
  error: TError | null;
  /** Current status */
  status: QueryStatus;
  /** Current fetch status */
  fetchStatus: FetchStatus;
  /** Timestamp when data was last updated */
  dataUpdatedAt: number;
  /** Timestamp when error was last set */
  errorUpdatedAt: number;
  /** Whether the query has been invalidated */
  isInvalidated: boolean;
  /** Number of fetch failures */
  fetchFailureCount: number;
}

/**
 * Query key type - array of serializable values.
 */
export type QueryKey = readonly unknown[];

/**
 * Configuration options for QueryCache.
 */
export interface QueryCacheOptions {
  /**
   * Default stale time in milliseconds.
   * After this time, the query is considered stale and will refetch on next use.
   * Default: 5 minutes
   */
  defaultStaleTime?: number;

  /**
   * Default garbage collection time in milliseconds.
   * Unused queries are removed after this time.
   * Default: 24 hours
   */
  defaultGcTime?: number;

  /**
   * Whether to refetch queries when the window regains focus.
   * Default: true
   */
  refetchOnWindowFocus?: boolean;

  /**
   * Whether to refetch queries when reconnecting to the network.
   * Default: true
   */
  refetchOnReconnect?: boolean;
}

/**
 * Options for setting query data.
 */
export interface SetQueryDataOptions {
  /** Override stale time for this query */
  staleTime?: number;
  /** Override GC time for this query */
  gcTime?: number;
}

/**
 * Internal query entry with metadata.
 */
interface QueryEntry<TData = unknown, TError = Error> {
  state: QueryState<TData, TError>;
  staleTime: number;
  gcTime: number;
  lastAccessedAt: number;
  gcTimeout?: ReturnType<typeof setTimeout>;
  subscribers: Set<() => void>;
}

import { MS_PER_DAY, MS_PER_MINUTE } from '@abe-stack/shared';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STALE_TIME = 5 * MS_PER_MINUTE;
const DEFAULT_GC_TIME = MS_PER_DAY;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Serialize a query key to a stable string for map lookup.
 */
export function hashQueryKey(queryKey: QueryKey): string {
  return JSON.stringify(queryKey, (_, val: unknown): unknown =>
    typeof val === 'object' && val !== null && !Array.isArray(val)
      ? Object.keys(val as Record<string, unknown>)
          .sort()
          .reduce<Record<string, unknown>>((result, key) => {
            const record = val as Record<string, unknown>;
            result[key] = record[key];
            return result;
          }, {})
      : val,
  );
}

/**
 * Check if two query keys are equal.
 */
export function queryKeysEqual(a: QueryKey, b: QueryKey): boolean {
  return hashQueryKey(a) === hashQueryKey(b);
}

/**
 * Create initial query state.
 */
function createInitialState<TData, TError>(): QueryState<TData, TError> {
  return {
    data: undefined,
    error: null,
    status: 'pending',
    fetchStatus: 'idle',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    isInvalidated: false,
    fetchFailureCount: 0,
  };
}

// ============================================================================
// QueryCache Class
// ============================================================================

/**
 * Manages query state with subscription support for React integration.
 *
 * @example
 * ```typescript
 * const cache = new QueryCache();
 *
 * // Set query data
 * cache.setQueryData(['users', 1], userData);
 *
 * // Get query data
 * const user = cache.getQueryData(['users', 1]);
 *
 * // Subscribe to changes
 * const unsubscribe = cache.subscribe(['users', 1], () => {
 *   console.log('Query updated');
 * });
 * ```
 */
export class QueryCache {
  private readonly queries = new Map<string, QueryEntry>();
  private readonly globalSubscribers = new Set<() => void>();
  private readonly defaultStaleTime: number;
  private readonly defaultGcTime: number;
  private readonly refetchOnWindowFocus: boolean;
  private readonly refetchOnReconnect: boolean;
  private windowFocusHandler?: () => void;
  private reconnectHandler?: () => void;

  constructor(options: QueryCacheOptions = {}) {
    this.defaultStaleTime = options.defaultStaleTime ?? DEFAULT_STALE_TIME;
    this.defaultGcTime = options.defaultGcTime ?? DEFAULT_GC_TIME;
    this.refetchOnWindowFocus = options.refetchOnWindowFocus ?? true;
    this.refetchOnReconnect = options.refetchOnReconnect ?? true;

    this.setupEventListeners();
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    if (this.refetchOnWindowFocus) {
      this.windowFocusHandler = (): void => {
        this.invalidateStaleQueries();
      };
      window.addEventListener('focus', this.windowFocusHandler);
    }

    if (this.refetchOnReconnect) {
      this.reconnectHandler = (): void => {
        this.invalidateStaleQueries();
      };
      window.addEventListener('online', this.reconnectHandler);
    }
  }

  private invalidateStaleQueries(): void {
    const now = Date.now();
    for (const [, entry] of this.queries) {
      if (entry.state.dataUpdatedAt > 0 && now - entry.state.dataUpdatedAt > entry.staleTime) {
        entry.state.isInvalidated = true;
        this.notifySubscribers(entry);
      }
    }
  }

  // ==========================================================================
  // Query State Access
  // ==========================================================================

  /**
   * Get query state by key.
   */
  getQueryState<TData = unknown, TError = Error>(
    queryKey: QueryKey,
  ): QueryState<TData, TError> | undefined {
    const hash = hashQueryKey(queryKey);
    const entry = this.queries.get(hash) as QueryEntry<TData, TError> | undefined;
    if (entry !== undefined) {
      entry.lastAccessedAt = Date.now();
      this.resetGcTimer(hash, entry);
    }
    return entry?.state;
  }

  /**
   * Get query data by key.
   */
  getQueryData(queryKey: QueryKey): unknown {
    return this.getQueryState(queryKey)?.data;
  }

  /**
   * Check if a query exists in the cache.
   */
  hasQuery(queryKey: QueryKey): boolean {
    return this.queries.has(hashQueryKey(queryKey));
  }

  /**
   * Check if a query's data is stale.
   */
  isStale(queryKey: QueryKey): boolean {
    const hash = hashQueryKey(queryKey);
    const entry = this.queries.get(hash);
    if (entry === undefined || entry.state.dataUpdatedAt === 0) return true;
    if (entry.state.isInvalidated) return true;
    return Date.now() - entry.state.dataUpdatedAt > entry.staleTime;
  }

  // ==========================================================================
  // Query State Updates
  // ==========================================================================

  /**
   * Set query data directly.
   */
  setQueryData(queryKey: QueryKey, data: unknown, options?: SetQueryDataOptions): void {
    const hash = hashQueryKey(queryKey);
    const existing = this.queries.get(hash);

    const entry: QueryEntry = existing ?? {
      state: createInitialState<unknown, Error>(),
      staleTime: options?.staleTime ?? this.defaultStaleTime,
      gcTime: options?.gcTime ?? this.defaultGcTime,
      lastAccessedAt: Date.now(),
      subscribers: new Set(),
    };

    // Update staleTime and gcTime if provided, even for existing entries
    if (options?.staleTime !== undefined) {
      entry.staleTime = options.staleTime;
    }
    if (options?.gcTime !== undefined) {
      entry.gcTime = options.gcTime;
    }

    entry.state = {
      ...entry.state,
      data,
      status: 'success',
      fetchStatus: 'idle',
      dataUpdatedAt: Date.now(),
      isInvalidated: false,
      fetchFailureCount: 0,
      error: null,
    };

    if (existing === undefined) {
      this.queries.set(hash, entry);
      this.resetGcTimer(hash, entry);
    }

    this.notifySubscribers(entry);
    this.notifyGlobalSubscribers();
  }

  /**
   * Set query error.
   */
  setQueryError(queryKey: QueryKey, error: Error): void {
    const hash = hashQueryKey(queryKey);
    let entry = this.queries.get(hash);

    if (entry === undefined) {
      entry = {
        state: createInitialState(),
        staleTime: this.defaultStaleTime,
        gcTime: this.defaultGcTime,
        lastAccessedAt: Date.now(),
        subscribers: new Set(),
      };
      this.queries.set(hash, entry);
    }

    entry.state = {
      ...entry.state,
      error: error,
      status: 'error',
      fetchStatus: 'idle',
      errorUpdatedAt: Date.now(),
      fetchFailureCount: entry.state.fetchFailureCount + 1,
    };

    this.notifySubscribers(entry);
    this.notifyGlobalSubscribers();
  }

  /**
   * Update fetch status (e.g., when fetching starts).
   */
  setFetchStatus(queryKey: QueryKey, fetchStatus: FetchStatus): void {
    const hash = hashQueryKey(queryKey);
    let entry = this.queries.get(hash);

    if (entry === undefined) {
      entry = {
        state: createInitialState(),
        staleTime: this.defaultStaleTime,
        gcTime: this.defaultGcTime,
        lastAccessedAt: Date.now(),
        subscribers: new Set(),
      };
      this.queries.set(hash, entry);
    }

    entry.state = {
      ...entry.state,
      fetchStatus,
    };

    this.notifySubscribers(entry);
    this.notifyGlobalSubscribers();
  }

  /**
   * Invalidate a query (mark as stale).
   */
  invalidateQuery(queryKey: QueryKey): void {
    const hash = hashQueryKey(queryKey);
    const entry = this.queries.get(hash);
    if (entry === undefined) return;

    entry.state = {
      ...entry.state,
      isInvalidated: true,
    };

    this.notifySubscribers(entry);
    this.notifyGlobalSubscribers();
  }

  /**
   * Invalidate queries matching a predicate.
   */
  invalidateQueries(predicate?: (queryKey: QueryKey) => boolean): void {
    for (const [hash, entry] of this.queries) {
      if (predicate === undefined || predicate(JSON.parse(hash) as QueryKey)) {
        entry.state = {
          ...entry.state,
          isInvalidated: true,
        };
        this.notifySubscribers(entry);
      }
    }
    this.notifyGlobalSubscribers();
  }

  /**
   * Remove a query from the cache.
   */
  removeQuery(queryKey: QueryKey): boolean {
    const hash = hashQueryKey(queryKey);
    const entry = this.queries.get(hash);
    if (entry === undefined) return false;

    if (entry.gcTimeout !== undefined) {
      clearTimeout(entry.gcTimeout);
    }

    this.queries.delete(hash);
    this.notifyGlobalSubscribers();
    return true;
  }

  /**
   * Remove queries matching a predicate.
   */
  removeQueries(predicate?: (queryKey: QueryKey) => boolean): number {
    let count = 0;
    for (const [hash, entry] of this.queries) {
      if (predicate === undefined || predicate(JSON.parse(hash) as QueryKey)) {
        if (entry.gcTimeout !== undefined) {
          clearTimeout(entry.gcTimeout);
        }
        this.queries.delete(hash);
        count++;
      }
    }
    if (count > 0) {
      this.notifyGlobalSubscribers();
    }
    return count;
  }

  /**
   * Clear all queries from the cache.
   */
  clear(): void {
    for (const entry of this.queries.values()) {
      if (entry.gcTimeout !== undefined) {
        clearTimeout(entry.gcTimeout);
      }
    }
    this.queries.clear();
    this.notifyGlobalSubscribers();
  }

  // ==========================================================================
  // Subscriptions
  // ==========================================================================

  /**
   * Subscribe to changes for a specific query.
   * Returns an unsubscribe function.
   */
  subscribe(queryKey: QueryKey, callback: () => void): () => void {
    const hash = hashQueryKey(queryKey);
    let entry = this.queries.get(hash);

    if (entry === undefined) {
      entry = {
        state: createInitialState(),
        staleTime: this.defaultStaleTime,
        gcTime: this.defaultGcTime,
        lastAccessedAt: Date.now(),
        subscribers: new Set(),
      };
      this.queries.set(hash, entry);
    }

    entry.subscribers.add(callback);

    // Cancel GC when there are subscribers
    if (entry.gcTimeout !== undefined) {
      clearTimeout(entry.gcTimeout);
      delete entry.gcTimeout;
    }

    return () => {
      entry.subscribers.delete(callback);
      // Start GC timer when no subscribers
      if (entry.subscribers.size === 0) {
        this.resetGcTimer(hash, entry);
      }
    };
  }

  /**
   * Subscribe to any cache changes.
   */
  subscribeAll(callback: () => void): () => void {
    this.globalSubscribers.add(callback);
    return () => {
      this.globalSubscribers.delete(callback);
    };
  }

  private notifySubscribers(entry: QueryEntry): void {
    for (const callback of entry.subscribers) {
      callback();
    }
  }

  private notifyGlobalSubscribers(): void {
    for (const callback of this.globalSubscribers) {
      callback();
    }
  }

  // ==========================================================================
  // Garbage Collection
  // ==========================================================================

  private resetGcTimer(hash: string, entry: QueryEntry<unknown, unknown>): void {
    if (entry.gcTimeout !== undefined) {
      clearTimeout(entry.gcTimeout);
    }

    // Only GC if there are no subscribers
    if (entry.subscribers.size > 0) return;

    entry.gcTimeout = setTimeout(() => {
      this.queries.delete(hash);
      this.notifyGlobalSubscribers();
    }, entry.gcTime);
  }

  /**
   * Manually prune unused queries.
   */
  pruneUnused(): number {
    let count = 0;
    const now = Date.now();

    for (const [hash, entry] of this.queries) {
      if (entry.subscribers.size === 0 && now - entry.lastAccessedAt > entry.gcTime) {
        if (entry.gcTimeout !== undefined) {
          clearTimeout(entry.gcTimeout);
        }
        this.queries.delete(hash);
        count++;
      }
    }

    return count;
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroy the cache and cleanup event listeners.
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.windowFocusHandler !== undefined) {
        window.removeEventListener('focus', this.windowFocusHandler);
      }
      if (this.reconnectHandler !== undefined) {
        window.removeEventListener('online', this.reconnectHandler);
      }
    }

    for (const entry of this.queries.values()) {
      if (entry.gcTimeout !== undefined) {
        clearTimeout(entry.gcTimeout);
      }
    }

    this.queries.clear();
    this.globalSubscribers.clear();
  }

  // ==========================================================================
  // Debugging
  // ==========================================================================

  /**
   * Get the number of queries in the cache.
   */
  get size(): number {
    return this.queries.size;
  }

  /**
   * Get all query keys in the cache.
   */
  getQueryKeys(): QueryKey[] {
    return Array.from(this.queries.keys()).map((hash) => JSON.parse(hash) as QueryKey);
  }

  /**
   * Get all entries (for debugging/persistence).
   */
  getAll(): Array<{ queryKey: QueryKey; state: QueryState }> {
    return Array.from(this.queries.entries()).map(([hash, entry]) => ({
      queryKey: JSON.parse(hash) as QueryKey,
      state: entry.state,
    }));
  }
}

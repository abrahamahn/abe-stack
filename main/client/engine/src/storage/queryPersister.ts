// main/client/engine/src/storage/queryPersister.ts
/**
 * Query Cache Persister
 *
 * Persists the query cache to IndexedDB for offline support.
 * Queries are automatically restored when the app loads.
 */

import { MS_PER_DAY, MS_PER_SECOND } from '@abe-stack/shared';

import { idbStorage } from './storage';

import type { QueryCache, QueryState } from '../query/QueryCache';

// ============================================================================
// Types
// ============================================================================

/**
 * Persisted query state structure.
 * Represents the serialized state of a single query.
 */
export interface PersistedQuery {
  queryKey: readonly unknown[];
  queryHash: string;
  state: {
    data: unknown;
    dataUpdatedAt: number;
    error: unknown;
    errorUpdatedAt: number;
    fetchFailureCount: number;
    fetchFailureReason: unknown;
    fetchMeta: unknown;
    fetchStatus: string;
    isInvalidated: boolean;
    status: string;
  };
}

/**
 * Persisted client state structure.
 * Contains the full query cache state for restoration.
 */
export interface PersistedClientState {
  queries: PersistedQuery[];
  mutations: unknown[];
}

/**
 * Represents a persisted query cache state.
 */
export interface PersistedClient {
  timestamp: number;
  buster: string;
  clientState: PersistedClientState;
}

/**
 * Interface for persisting query cache state.
 */
export interface Persister {
  persistClient(client: PersistedClient): void;
  restoreClient(): Promise<PersistedClient | undefined>;
  removeClient(): Promise<void>;
}

export interface QueryPersisterOptions {
  /** Storage key for the persisted cache */
  key?: string;
  /** Max age of persisted data in ms (default: 24 hours) */
  maxAge?: number;
  /** Throttle persistence writes in ms (default: 1000ms) */
  throttleTime?: number;
}

type QueryCacheSnapshotEntry = {
  queryKey: readonly unknown[];
  state: QueryState;
};

// ============================================================================
// Persister Implementation
// ============================================================================

const DEFAULT_KEY = 'abe-stack-query-cache';
const DEFAULT_MAX_AGE = MS_PER_DAY;
const DEFAULT_THROTTLE = MS_PER_SECOND;

/**
 * Create an IndexedDB persister for QueryCache
 *
 * Usage with manual persistence (recommended):
 * ```ts
 * import { QueryCache, createQueryPersister } from '@abe-stack/client-engine';
 *
 * const queryCache = new QueryCache({
 *   defaultGcTime: 1000 * 60 * 60 * 24, // 24 hours
 *   defaultStaleTime: 1000 * 60 * 5, // 5 minutes
 * });
 *
 * const persister = createQueryPersister();
 *
 * // On mount: restore from IndexedDB
 * const persistedClient = await persister.restoreClient();
 * if (persistedClient) {
 *   for (const query of persistedClient.clientState.queries) {
 *     queryCache.setQueryData(query.queryKey, query.state.data);
 *   }
 * }
 *
 * // Subscribe to cache changes for persistence
 * queryCache.subscribe(['*'], () => {
 *   const queries = queryCache.getAll()
 *     .filter(q => q.state.data !== undefined)
 *     .map(q => ({
 *       queryKey: q.queryKey,
 *       queryHash: q.queryHash,
 *       state: q.state
 *     }));
 *   persister.persistClient({
 *     timestamp: Date.now(),
 *     buster: '',
 *     clientState: { queries, mutations: [] },
 *   });
 * });
 * ```
 */
export function createQueryPersister(options: QueryPersisterOptions = {}): Persister {
  const { key = DEFAULT_KEY, throttleTime = DEFAULT_THROTTLE } = options;

  let persistTimeout: ReturnType<typeof setTimeout> | null = null;
  let pendingClient: PersistedClient | null = null;

  const doPersist = (): void => {
    persistTimeout = null;

    if (pendingClient !== null) {
      const clientToSave = pendingClient;
      pendingClient = null;

      idbStorage.setItem(key, JSON.stringify(clientToSave)).catch(() => {
        // Cache persistence failed silently
      });
    }
  };

  const persister: Persister = {
    persistClient(client: PersistedClient): void {
      // Throttle writes to avoid excessive IndexedDB operations
      pendingClient = client;

      if (persistTimeout !== null) return;

      persistTimeout = setTimeout(doPersist, throttleTime);
    },

    async restoreClient(): Promise<PersistedClient | undefined> {
      try {
        const data = await idbStorage.getItem(key);
        if (data === null || data === '') return undefined;

        const client = JSON.parse(data) as PersistedClient;

        // Check if data is expired
        const maxAge = options.maxAge ?? DEFAULT_MAX_AGE;
        if (Date.now() - client.timestamp > maxAge) {
          await idbStorage.removeItem(key);
          return undefined;
        }

        return client;
      } catch {
        return undefined;
      }
    },

    async removeClient(): Promise<void> {
      try {
        await idbStorage.removeItem(key);
      } catch {
        // Cache removal failed silently
      }
    },
  };

  return persister;
}

/**
 * Restore persisted query data back into a QueryCache instance.
 */
export function restorePersistedQueryCache(
  queryCache: Pick<QueryCache, 'setQueryData'>,
  persistedClient: PersistedClient | undefined,
): void {
  if (persistedClient === undefined) return;

  for (const persistedQuery of persistedClient.clientState.queries) {
    queryCache.setQueryData(persistedQuery.queryKey, persistedQuery.state.data);
  }
}

/**
 * Create a persistable payload from QueryCache entries.
 */
export function createPersistedClientFromQueryCache(
  entries: QueryCacheSnapshotEntry[],
  options: { timestamp?: number; buster?: string } = {},
): PersistedClient {
  const queries = entries
    .filter(
      (entry): entry is QueryCacheSnapshotEntry & { state: QueryState & { data: unknown } } =>
        entry.state.data !== undefined,
    )
    .map(
      (entry): PersistedQuery => ({
        queryKey: entry.queryKey,
        queryHash: JSON.stringify(entry.queryKey),
        state: {
          data: entry.state.data,
          dataUpdatedAt: entry.state.dataUpdatedAt,
          error: entry.state.error,
          errorUpdatedAt: entry.state.errorUpdatedAt,
          fetchFailureCount: entry.state.fetchFailureCount,
          fetchFailureReason: null,
          fetchMeta: null,
          fetchStatus: entry.state.fetchStatus,
          isInvalidated: entry.state.isInvalidated,
          status: entry.state.status,
        },
      }),
    );

  return {
    timestamp: options.timestamp ?? Date.now(),
    buster: options.buster ?? '',
    clientState: { queries, mutations: [] },
  };
}

/**
 * Clear all persisted query data
 */
export async function clearQueryCache(key = DEFAULT_KEY): Promise<void> {
  await idbStorage.removeItem(key);
}

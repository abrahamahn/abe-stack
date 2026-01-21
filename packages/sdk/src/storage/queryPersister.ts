// packages/sdk/src/storage/queryPersister.ts
/**
 * TanStack Query Persister
 *
 * Persists the React Query cache to IndexedDB for offline support.
 * Queries are automatically restored when the app loads.
 */

import { idbStorage } from './storage';

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
 * Represents a persisted TanStack Query client state.
 */
export interface PersistedClient {
  timestamp: number;
  buster: string;
  clientState: PersistedClientState;
}

/**
 * Interface for persisting TanStack Query client state.
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

// ============================================================================
// Persister Implementation
// ============================================================================

const DEFAULT_KEY = 'abe-stack-query-cache';
const DEFAULT_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
const DEFAULT_THROTTLE = 1000; // 1 second

/**
 * Create an IndexedDB persister for TanStack Query
 *
 * Usage with manual persistence (recommended):
 * ```ts
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 * import { createQueryPersister } from '@abe-stack/sdk';
 *
 * const queryClient = new QueryClient({
 *   defaultOptions: {
 *     queries: {
 *       gcTime: 1000 * 60 * 60 * 24, // 24 hours
 *       staleTime: 1000 * 60 * 5, // 5 minutes
 *     },
 *   },
 * });
 *
 * const persister = createQueryPersister();
 *
 * // On mount: restore from IndexedDB
 * const persistedClient = await persister.restoreClient();
 * if (persistedClient) {
 *   for (const query of persistedClient.clientState.queries) {
 *     queryClient.setQueryData(query.queryKey, query.state.data);
 *   }
 * }
 *
 * // Subscribe to cache changes for persistence
 * queryClient.getQueryCache().subscribe(() => {
 *   const queries = queryClient.getQueryCache().getAll()
 *     .filter(q => q.state.data !== undefined)
 *     .map(q => ({ queryKey: q.queryKey, queryHash: q.queryHash, state: q.state }));
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

    if (pendingClient) {
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

      if (persistTimeout) return;

      persistTimeout = setTimeout(doPersist, throttleTime);
    },

    async restoreClient(): Promise<PersistedClient | undefined> {
      try {
        const data = await idbStorage.getItem(key);
        if (!data) return undefined;

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
 * Clear all persisted query data
 */
export async function clearQueryCache(key = DEFAULT_KEY): Promise<void> {
  await idbStorage.removeItem(key);
}

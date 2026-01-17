// packages/sdk/src/persistence/queryPersister.ts
/**
 * TanStack Query Persister
 *
 * Persists the React Query cache to IndexedDB for offline support.
 * Queries are automatically restored when the app loads.
 */

import { idbStorage } from './storage';

import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';

// ============================================================================
// Types
// ============================================================================

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
 * Usage:
 * ```ts
 * import { QueryClient } from '@tanstack/react-query';
 * import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
 * import { createQueryPersister } from '@abe-stack/sdk/persistence';
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
 * <PersistQueryClientProvider
 *   client={queryClient}
 *   persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 }}
 * >
 *   <App />
 * </PersistQueryClientProvider>
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

      idbStorage.setItem(key, JSON.stringify(clientToSave)).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.warn('[QueryPersister] Failed to persist cache:', error);
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
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[QueryPersister] Failed to restore cache:', error);
        return undefined;
      }
    },

    async removeClient(): Promise<void> {
      try {
        await idbStorage.removeItem(key);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('[QueryPersister] Failed to remove cache:', error);
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

// main/client/engine/src/realtime/hooks/useRecord.ts
/**
 * useRecord - React hook for subscribing to a single record by table and ID.
 *
 * Integrates with:
 * - RecordCache for in-memory state
 * - SubscriptionCache for ref-counted WebSocket subscriptions
 * - RecordStorage for persistent IndexedDB fallback
 *
 * Uses useSyncExternalStore for tear-free reads compatible with concurrent React.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

// ============================================================================
// Types — inline to avoid cross-package resolution issues at lint time
// ============================================================================

/** Minimal record shape with id + version. */
interface RecordShape {
  id: string;
  version: number;
  [key: string]: unknown;
}

/** Minimal interface for the in-memory record cache. */
interface RecordCacheLike {
  subscribe(table: string, id: string, listener: () => void): () => void;
  get(table: string, id: string): RecordShape | undefined;
  set(table: string, id: string, record: RecordShape, opts: { force: boolean }): void;
}

/** Minimal interface for the ref-counted WebSocket subscription cache. */
interface SubscriptionCacheLike {
  subscribe(key: string): () => void;
}

/** Minimal interface for persistent IndexedDB storage. */
interface RecordStorageLike {
  getRecord(pointer: { table: string; id: string }): Promise<RecordShape | undefined>;
}

/** Options for the useRecord hook. */
export interface UseRecordOptions {
  /** Skip auto-subscription to WebSocket updates. */
  skipSubscription?: boolean;
  /** If true, attempt to load from RecordStorage when not in RecordCache. Default: true */
  fallbackToStorage?: boolean;
}

/** Return value of the useRecord hook. */
export interface UseRecordResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/** Dependencies injected into useRecord. */
export interface UseRecordDeps {
  recordCache: RecordCacheLike;
  subscriptionCache: SubscriptionCacheLike;
  recordStorage?: RecordStorageLike;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook that subscribes to a single record by table and ID.
 *
 * @param deps - Injected dependencies (recordCache, subscriptionCache, recordStorage)
 * @param table - The table name
 * @param id - The record ID
 * @param options - Additional options
 */
export function useRecord<T extends RecordShape = RecordShape>(
  deps: UseRecordDeps,
  table: string,
  id: string,
  options: UseRecordOptions = {},
): UseRecordResult<T> {
  const { skipSubscription = false, fallbackToStorage = true } = options;
  const { recordCache, subscriptionCache, recordStorage } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscribeToStore = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return recordCache.subscribe(table, id, onStoreChange);
    },
    [recordCache, table, id],
  );

  const getSnapshot = useCallback((): T | undefined => {
    return recordCache.get(table, id) as T | undefined;
  }, [recordCache, table, id]);

  const data: T | undefined = useSyncExternalStore(subscribeToStore, getSnapshot, getSnapshot);

  // WebSocket subscription via SubscriptionCache
  useEffect(() => {
    if (skipSubscription) return;
    const key = `${table}:${id}`;
    const unsubscribe: () => void = subscriptionCache.subscribe(key);
    return unsubscribe;
  }, [subscriptionCache, table, id, skipSubscription]);

  // Fallback: load from RecordStorage if not in RecordCache
  useEffect(() => {
    if (data !== undefined || !fallbackToStorage || recordStorage === undefined) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void recordStorage
      .getRecord({ table, id })
      .then((stored: RecordShape | undefined) => {
        if (cancelled) return;
        if (stored !== undefined) {
          recordCache.set(table, id, stored, { force: false });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : 'Failed to load record from storage';
        setError(new Error(message));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [data, fallbackToStorage, recordCache, recordStorage, table, id]);

  return { data, isLoading, error };
}

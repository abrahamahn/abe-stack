// main/client/engine/src/realtime/hooks/useRecord.ts
/**
 * useRecord - React hook for subscribing to a single record by table and ID.
 *
 * Integrates with:
 * - RecordCache for in-memory state
 * - SubscriptionCache for ref-counted WebSocket subscriptions
 * - RecordStorage for persistent IndexedDB fallback
 * - Permission-aware error handling (403 and permission_revoked events)
 *
 * Uses useSyncExternalStore for tear-free reads compatible with concurrent React.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { isPermissionError, createPermissionError } from './usePermissionError';

import type { PermissionEventListener } from './usePermissionError';

// ============================================================================
// Types — inline to avoid cross-package resolution issues at lint time
// ============================================================================

/** Minimal record shape with id + version. */
interface RecordShape {
  id: string;
  version?: number;
}

/** Minimal interface for the in-memory record cache. */
interface RecordCacheLike {
  subscribe(table: string, id: string, listener: () => void): () => void;
  get(table: string, id: string): RecordShape | undefined;
  set(table: string, id: string, record: RecordShape, opts: { force: boolean }): void;
  delete(table: string, id: string): RecordShape | undefined;
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
  /** True when access was denied due to insufficient permissions (403 or permission_revoked). */
  permissionDenied: boolean;
}

/** Dependencies injected into useRecord. */
export interface UseRecordDeps {
  recordCache: RecordCacheLike;
  subscriptionCache: SubscriptionCacheLike;
  recordStorage?: RecordStorageLike;
  /**
   * Optional listener for permission_revoked events from the WebSocket.
   * When provided, the hook registers to receive permission revocation
   * notifications and clears cached records for the affected tenant.
   */
  permissionEvents?: PermissionEventListener;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * React hook that subscribes to a single record by table and ID.
 *
 * Handles permission errors gracefully:
 * - 403 responses set `permissionDenied: true` instead of crashing
 * - `permission_revoked` events clear the record from cache and set the error
 *
 * @param deps - Injected dependencies (recordCache, subscriptionCache, recordStorage, permissionEvents)
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
  const { recordCache, subscriptionCache, recordStorage, permissionEvents } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);

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

  // Listen for permission_revoked events
  useEffect(() => {
    if (permissionEvents === undefined) return;

    const unsubscribe = permissionEvents.onPermissionRevoked((event) => {
      // The record's tenantId is embedded in the cached data.
      // If we have data and it belongs to the revoked tenant, clear it.
      const currentRecord = recordCache.get(table, id);
      if (currentRecord !== undefined && 'tenantId' in currentRecord) {
        if (currentRecord['tenantId'] === event.tenantId) {
          recordCache.delete(table, id);
          setPermissionDenied(true);
          setError(createPermissionError(event.tenantId, event.reason));
        }
      }

      // If we don't have data but the event is for our tenant context,
      // still mark as denied so re-fetches don't attempt to load
      if (currentRecord === undefined) {
        setPermissionDenied(true);
        setError(createPermissionError(event.tenantId, event.reason));
      }
    });

    return unsubscribe;
  }, [permissionEvents, recordCache, table, id]);

  // Fallback: load from RecordStorage if not in RecordCache
  useEffect(() => {
    if (data !== undefined || !fallbackToStorage || recordStorage === undefined) {
      return;
    }

    // Don't attempt to load if permission was already denied
    if (permissionDenied) {
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

        // Handle 403 permission errors gracefully
        if (isPermissionError(err)) {
          setPermissionDenied(true);
          const message = err instanceof Error ? err.message : 'Permission denied';
          setError(new Error(message));
          return;
        }

        const message = err instanceof Error ? err.message : 'Failed to load record from storage';
        setError(new Error(message));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [data, fallbackToStorage, permissionDenied, recordCache, recordStorage, table, id]);

  return { data, isLoading, error, permissionDenied };
}

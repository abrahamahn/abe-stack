// main/client/engine/src/realtime/hooks/useRecords.ts
/**
 * useRecords - React hook for subscribing to multiple records by table and IDs.
 *
 * Same pattern as useRecord but optimized for arrays of keys.
 * Includes permission-aware error handling (403 and permission_revoked events).
 */

import { useEffect, useMemo, useState } from 'react';

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
  has(table: string, id: string): boolean;
  set(table: string, id: string, record: RecordShape, opts: { force: boolean }): void;
  delete(table: string, id: string): RecordShape | undefined;
}

/** Minimal interface for the ref-counted WebSocket subscription cache. */
interface SubscriptionCacheLike {
  subscribe(key: string): () => void;
}

/** Minimal interface for persistent IndexedDB storage. */
interface RecordStorageLike {
  getRecords(
    pointers: Array<{ table: string; id: string }>,
  ): Promise<Array<RecordShape | undefined>>;
}

/** Options for the useRecords hook. */
export interface UseRecordsOptions {
  skipSubscription?: boolean;
  fallbackToStorage?: boolean;
}

/** Return value of the useRecords hook. */
export interface UseRecordsResult<T> {
  records: Array<T | undefined>;
  isLoading: boolean;
  error: Error | undefined;
  /** True when access was denied due to insufficient permissions (403 or permission_revoked). */
  permissionDenied: boolean;
}

/** Dependencies injected into useRecords. */
export interface UseRecordsDeps {
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
 * React hook for subscribing to multiple records by table and IDs.
 *
 * Handles permission errors gracefully:
 * - 403 responses set `permissionDenied: true` instead of crashing
 * - `permission_revoked` events clear affected records from cache and set the error
 *
 * @param deps - Injected dependencies
 * @param table - The table name
 * @param ids - Array of record IDs
 * @param options - Additional options
 */
export function useRecords<T extends RecordShape = RecordShape>(
  deps: UseRecordsDeps,
  table: string,
  ids: string[],
  options: UseRecordsOptions = {},
): UseRecordsResult<T> {
  const { skipSubscription = false, fallbackToStorage = true } = options;
  const { recordCache, subscriptionCache, recordStorage, permissionEvents } = deps;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [, forceUpdate] = useState({});

  // Subscribe to RecordCache changes for each record
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    for (const id of ids) {
      const unsub: () => void = recordCache.subscribe(table, id, (): void => {
        forceUpdate({});
      });
      unsubscribers.push(unsub);
    }

    return (): void => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [recordCache, table, ids]);

  // WebSocket subscriptions via SubscriptionCache
  useEffect(() => {
    if (skipSubscription) return;

    const unsubscribers: Array<() => void> = [];

    for (const id of ids) {
      const key = `${table}:${id}`;
      const unsub: () => void = subscriptionCache.subscribe(key);
      unsubscribers.push(unsub);
    }

    return (): void => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [subscriptionCache, table, ids, skipSubscription]);

  // Listen for permission_revoked events
  useEffect(() => {
    if (permissionEvents === undefined) return;

    const unsubscribe = permissionEvents.onPermissionRevoked((event) => {
      let affected = false;

      // Check each tracked record to see if it belongs to the revoked tenant
      for (const id of ids) {
        const currentRecord = recordCache.get(table, id);
        if (currentRecord !== undefined && 'tenantId' in currentRecord) {
          if (currentRecord['tenantId'] === event.tenantId) {
            recordCache.delete(table, id);
            affected = true;
          }
        }
      }

      // If any records were affected, or if we have no data yet, mark as denied
      if (affected || ids.length === 0) {
        setPermissionDenied(true);
        setError(createPermissionError(event.tenantId, event.reason));
        forceUpdate({});
      }
    });

    return unsubscribe;
  }, [permissionEvents, recordCache, table, ids]);

  // Fallback: load missing records from RecordStorage
  useEffect(() => {
    if (!fallbackToStorage || recordStorage === undefined) {
      return;
    }

    // Don't attempt to load if permission was already denied
    if (permissionDenied) {
      return;
    }

    const missingIds: string[] = ids.filter((id) => !recordCache.has(table, id));
    if (missingIds.length === 0) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const pointers: Array<{ table: string; id: string }> = missingIds.map((id) => ({
      table,
      id,
    }));

    void recordStorage
      .getRecords(pointers)
      .then((storedRecords: Array<RecordShape | undefined>) => {
        if (cancelled) return;
        for (const stored of storedRecords) {
          if (stored !== undefined) {
            recordCache.set(table, stored.id, stored, { force: false });
          }
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

        const message = err instanceof Error ? err.message : 'Failed to load records from storage';
        setError(new Error(message));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [fallbackToStorage, permissionDenied, recordCache, recordStorage, table, ids]);

  const currentRecords: Array<T | undefined> = useMemo((): Array<T | undefined> => {
    return ids.map((id) => recordCache.get(table, id) as T | undefined);
  }, [recordCache, table, ids, forceUpdate]);

  return { records: currentRecords, isLoading, error, permissionDenied };
}

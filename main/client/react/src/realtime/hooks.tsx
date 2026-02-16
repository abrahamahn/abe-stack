// main/client/react/src/realtime/hooks.tsx
/**
 * Realtime React Hooks
 *
 * Provides convenient hooks for working with realtime data:
 * - useRecord: Get a single record with auto-subscription
 * - useRecords: Get multiple records with auto-subscription
 * - useWrite: Get the write function for optimistic updates
 * - useIsOnline: Get the current online status
 * - useIsPendingWrite: Check if a record has pending writes
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { useRealtime, type WriteOperation, type WriteOptions } from './RealtimeContext';

import type {
  ConnectionState,
  RecordChangeListener,
  WebsocketPubsubClient,
} from '@abe-stack/client-engine';
import type { VersionedRecord } from '@abe-stack/shared';

// ============================================================================
// useRecord
// ============================================================================

/**
 * Options for useRecord hook.
 */
export interface UseRecordOptions {
  /** Skip auto-subscription (useful if subscribing elsewhere) */
  skipSubscription?: boolean;
}

/**
 * Result of useRecord hook.
 */
export interface UseRecordResult<T> {
  /** The record data, or undefined if not in cache */
  data: T | undefined;
  /** Whether the record is being loaded */
  isLoading: boolean;
  /** Error if the record failed to load */
  error: Error | undefined;
}

/**
 * Hook to get a single record with auto-subscription.
 *
 * Automatically subscribes to real-time updates for the record.
 * The subscription is cleaned up when the component unmounts.
 *
 * @param table - The table name
 * @param id - The record ID
 * @param options - Additional options
 * @returns The record data and loading state
 *
 * @example
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data: user, isLoading } = useRecord<User>('user', userId);
 *
 *   if (isLoading) return <Spinner />;
 *   if (!user) return <NotFound />;
 *
 *   return <div>{user.name}</div>;
 * }
 * ```
 */
export function useRecord<T extends VersionedRecord = VersionedRecord>(
  table: string,
  id: string,
  options: UseRecordOptions = {},
): UseRecordResult<T> {
  const { skipSubscription = false } = options;
  const { recordCache, subscribe } = useRealtime();

  // Subscribe to the record
  const subscribeToStore = useCallback(
    (onStoreChange: () => void): (() => void) => {
      // Subscribe to cache changes for this specific record
      const unsubscribeCache = recordCache.subscribe(
        table,
        id,
        onStoreChange as RecordChangeListener,
      );

      // Subscribe to pubsub if not skipped
      let unsubscribePubsub: (() => void) | undefined;
      if (!skipSubscription) {
        unsubscribePubsub = subscribe(table, id);
      }

      return () => {
        unsubscribeCache();
        unsubscribePubsub?.();
      };
    },
    [recordCache, table, id, skipSubscription, subscribe],
  );

  // Get snapshot from cache
  const getSnapshot = useCallback((): T | undefined => {
    return recordCache.get(table, id) as T | undefined;
  }, [recordCache, table, id]);

  // Use sync external store for optimal updates
  const data = useSyncExternalStore(subscribeToStore, getSnapshot, getSnapshot);

  // For now, loading is just whether we don't have data
  // In a real implementation, this would track actual loading state
  const isLoading = false;
  const error = undefined;

  return { data, isLoading, error };
}

// ============================================================================
// useRecords
// ============================================================================

/**
 * Result of useRecords hook.
 */
export interface UseRecordsResult<T> {
  /** Array of records (undefined for missing records) */
  data: Array<T | undefined>;
  /** Whether any records are being loaded */
  isLoading: boolean;
  /** Map of record ID to error */
  errors: Map<string, Error>;
}

/**
 * Hook to get multiple records with auto-subscription.
 *
 * @param table - The table name
 * @param ids - Array of record IDs
 * @param options - Additional options
 * @returns The records data and loading state
 *
 * @example
 * ```tsx
 * function UserList({ userIds }: { userIds: string[] }) {
 *   const { data: users, isLoading } = useRecords<User>('user', userIds);
 *
 *   if (isLoading) return <Spinner />;
 *
 *   return (
 *     <ul>
 *       {users.map((user, i) =>
 *         user ? <li key={userIds[i]}>{user.name}</li> : null
 *       )}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useRecords<T extends VersionedRecord = VersionedRecord>(
  table: string,
  ids: string[],
  options: UseRecordOptions = {},
): UseRecordsResult<T> {
  const { skipSubscription = false } = options;
  const { recordCache, subscribe } = useRealtime();

  // Track data internally for re-renders
  const [, forceUpdate] = useState({});

  // Subscribe to all records
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];

    for (const id of ids) {
      // Subscribe to cache changes
      const unsubscribeCache = recordCache.subscribe(table, id, (): void => {
        forceUpdate({});
      });
      unsubscribers.push(unsubscribeCache);

      // Subscribe to pubsub
      if (!skipSubscription) {
        const unsubscribePubsub = subscribe(table, id);
        unsubscribers.push(unsubscribePubsub);
      }
    }

    return (): void => {
      for (const unsub of unsubscribers) {
        unsub();
      }
    };
  }, [recordCache, table, ids, skipSubscription, subscribe]);

  // Get current data
  const data = useMemo((): Array<T | undefined> => {
    return ids.map((id) => recordCache.get(table, id) as T | undefined);
  }, [recordCache, table, ids]);

  return {
    data,
    isLoading: false,
    errors: new Map(),
  };
}

// ============================================================================
// useWrite
// ============================================================================

/**
 * Write function type.
 */
export type WriteFn = (operations: WriteOperation[], options?: WriteOptions) => Promise<void>;

/**
 * Result of useWrite hook.
 */
export interface UseWriteResult {
  /** The write function */
  write: WriteFn;
  /** Whether a write is currently in progress */
  isWriting: boolean;
}

/**
 * Hook to get the write function for optimistic updates.
 *
 * @returns The write function and writing state
 *
 * @example
 * ```tsx
 * function EditUserForm({ user }: { user: User }) {
 *   const { write, isWriting } = useWrite();
 *   const [name, setName] = useState(user.name);
 *
 *   const handleSave = async () => {
 *     await write([
 *       { table: 'user', id: user.id, updates: { name } }
 *     ]);
 *   };
 *
 *   return (
 *     <form>
 *       <input value={name} onChange={(e) => setName(e.target.value)} />
 *       <button onClick={handleSave} disabled={isWriting}>
 *         {isWriting ? 'Saving...' : 'Save'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useWrite(): UseWriteResult {
  const { write } = useRealtime();
  const [isWriting, setIsWriting] = useState(false);

  const wrappedWrite = useCallback(
    async (operations: WriteOperation[], options?: WriteOptions): Promise<void> => {
      setIsWriting(true);
      try {
        await write(operations, options);
      } finally {
        setIsWriting(false);
      }
    },
    [write],
  );

  return { write: wrappedWrite, isWriting };
}

// ============================================================================
// useIsOnline
// ============================================================================

/**
 * Hook to get the current online status.
 *
 * @returns Whether the client is currently online
 *
 * @example
 * ```tsx
 * function OnlineIndicator() {
 *   const isOnline = useIsOnline();
 *
 *   return (
 *     <div className={isOnline ? 'online' : 'offline'}>
 *       {isOnline ? 'Connected' : 'Offline'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isOnline } = useRealtime();
  return isOnline;
}

// ============================================================================
// useIsPendingWrite
// ============================================================================

/**
 * Hook to check if a record has pending writes.
 *
 * Useful for showing pending/syncing indicators on records.
 *
 * @param table - The table name
 * @param id - The record ID
 * @returns Whether the record has pending writes
 *
 * @example
 * ```tsx
 * function TaskItem({ task }: { task: Task }) {
 *   const isPending = useIsPendingWrite('task', task.id);
 *
 *   return (
 *     <li className={isPending ? 'syncing' : ''}>
 *       {task.title}
 *       {isPending && <SyncIcon />}
 *     </li>
 *   );
 * }
 * ```
 */
export function useIsPendingWrite(table: string, id: string): boolean {
  const { transactionQueue } = useRealtime();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    // Initial check
    setIsPending(transactionQueue.isPendingWrite({ table, id }));

    // Subscribe to changes
    const unsubscribe = transactionQueue.subscribeIsPendingWrite(
      { table, id },
      (pending: boolean) => {
        setIsPending(pending);
      },
    );

    return unsubscribe;
  }, [transactionQueue, table, id]);

  return isPending;
}

// ============================================================================
// useConnectionState
// ============================================================================

/**
 * Hook to get the WebSocket connection state.
 *
 * @returns The current connection state
 *
 * @example
 * ```tsx
 * function ConnectionStatus() {
 *   const state = useConnectionState();
 *
 *   return (
 *     <div>
 *       Status: {state}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnectionState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
  const { connectionState } = useRealtime();
  return connectionState;
}

// ============================================================================
// usePubsubConnectionState
// ============================================================================

/**
 * Hook to observe connection state from a WebsocketPubsubClient instance.
 *
 * Useful when app code uses the pubsub client directly instead of RealtimeProvider.
 */
export function usePubsubConnectionState(
  pubsub: Pick<WebsocketPubsubClient, 'onConnectionStateChange' | 'getConnectionState'>,
): ConnectionState {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      return pubsub.onConnectionStateChange(onStoreChange);
    },
    [pubsub],
  );

  const getSnapshot = useCallback((): ConnectionState => {
    return pubsub.getConnectionState();
  }, [pubsub]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================================================
// useUndoRedo
// ============================================================================

/**
 * Result of useUndoRedo hook.
 */
export interface UseUndoRedoResult {
  /** Undo the last operation */
  undo: () => void;
  /** Redo the last undone operation */
  redo: () => void;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of items in undo stack */
  undoCount: number;
  /** Number of items in redo stack */
  redoCount: number;
}

/**
 * Hook to access undo/redo functionality.
 *
 * @returns Undo/redo functions and state
 *
 * @example
 * ```tsx
 * function UndoRedoButtons() {
 *   const { undo, redo, canUndo, canRedo } = useUndoRedo();
 *
 *   return (
 *     <div>
 *       <button onClick={undo} disabled={!canUndo}>Undo</button>
 *       <button onClick={redo} disabled={!canRedo}>Redo</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUndoRedo(): UseUndoRedoResult {
  const { undo, redo, undoRedoState } = useRealtime();

  return {
    undo,
    redo,
    canUndo: undoRedoState.canUndo,
    canRedo: undoRedoState.canRedo,
    undoCount: undoRedoState.undoCount,
    redoCount: undoRedoState.redoCount,
  };
}

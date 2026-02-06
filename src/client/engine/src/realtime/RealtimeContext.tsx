// src/client/engine/src/realtime/RealtimeContext.tsx
/**
 * RealtimeProvider - React context that integrates all realtime components
 *
 * Provides:
 * - RecordCache for in-memory record storage
 * - RecordStorage for persistent IndexedDB storage
 * - TransactionQueue for offline-first mutations
 * - WebsocketPubsubClient for real-time updates
 * - UndoRedoStack for undo/redo support
 * - Optimistic write() function
 * - Record subscriptions via SubscriptionCache
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';

import { type RecordCache, type TableMap } from '../cache/RecordCache';
import { TransactionQueue, type QueuedTransaction } from '../offline/TransactionQueue';
import { RecordStorage, type RecordMap, type VersionedRecord } from '../storage/RecordStorage';
import { UndoRedoStack, type UndoableOperation, type UndoRedoState } from '../undo/UndoRedoStack';

import { SubscriptionCache } from './SubscriptionCache';
import { WebsocketPubsubClient, type ConnectionState } from './WebsocketPubsubClient';

import type { Contracts } from '@abe-stack/shared';

type RealtimeOperation = Contracts.Operation;

// ============================================================================
// Types
// ============================================================================

/**
 * Write operation for optimistic updates.
 */
export interface WriteOperation {
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Partial updates to apply */
  updates: Record<string, unknown>;
}

/**
 * Options for the write function.
 */
export interface WriteOptions {
  /** Skip adding to undo stack */
  skipUndo?: boolean;
}

/**
 * Configuration for RealtimeProvider.
 */
export interface RealtimeProviderConfig<TTables extends TableMap = TableMap> {
  /** Current user ID for transaction authorship */
  userId: string;
  /** WebSocket host (e.g., 'localhost:3000') */
  wsHost: string;
  /** Use secure WebSocket (wss://) */
  wsSecure?: boolean;
  /** Enable debug logging */
  debug?: boolean;
  /** RecordCache instance (injected for flexibility) */
  recordCache: RecordCache<TTables>;
  /** Optional: IndexedDB database name for persistence */
  dbName?: string;
  /** Optional: Called when connection state changes */
  onConnectionStateChange?: (state: ConnectionState) => void;
  /** Optional: Called when undo/redo state changes */
  onUndoRedoStateChange?: (state: UndoRedoState) => void;
  /** API endpoint for fetching records */
  fetchRecordsEndpoint?: string;
  /** API endpoint for submitting transactions */
  submitTransactionEndpoint?: string;
}

/**
 * Value provided by RealtimeContext.
 */
export interface RealtimeContextValue<TTables extends TableMap = TableMap> {
  /** Current user ID */
  userId: string;
  /** In-memory record cache */
  recordCache: RecordCache<TTables>;
  /** Persistent record storage */
  recordStorage: RecordStorage;
  /** Transaction queue for offline support */
  transactionQueue: TransactionQueue;
  /** WebSocket pubsub client */
  pubsub: WebsocketPubsubClient;
  /** Subscription cache for ref-counting subscriptions */
  subscriptionCache: SubscriptionCache;
  /** Undo/redo stack */
  undoRedoStack: UndoRedoStack<UndoableWrite>;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether the client is online */
  isOnline: boolean;
  /** Perform an optimistic write */
  write: (operations: WriteOperation[], options?: WriteOptions) => Promise<void>;
  /** Subscribe to a record - returns unsubscribe function */
  subscribe: (table: string, id: string) => () => void;
  /** Undo the last operation */
  undo: () => void;
  /** Redo the last undone operation */
  redo: () => void;
  /** Current undo/redo state */
  undoRedoState: UndoRedoState;
}

/**
 * Data stored in undo stack for write operations.
 */
export interface UndoableWrite {
  /** The operations that were performed */
  operations: WriteOperation[];
  /** Previous values for each operation (for rollback) */
  previousValues: Array<Record<string, unknown> | undefined>;
}

// ============================================================================
// Context
// ============================================================================

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface RealtimeProviderProps<TTables extends TableMap = TableMap> {
  children: ReactNode;
  config: RealtimeProviderConfig<TTables>;
}

/**
 * RealtimeProvider - Provides realtime functionality to the React tree.
 *
 * @example
 * ```tsx
 * import { RecordCache } from '@abe-stack/client-engine';
 *
 * const cache = new RecordCache<MyTables>();
 *
 * function App() {
 *   return (
 *     <RealtimeProvider
 *       config={{
 *         userId: currentUser.id,
 *         wsHost: 'localhost:3000',
 *         recordCache: cache,
 *       }}
 *     >
 *       <MyApp />
 *     </RealtimeProvider>
 *   );
 * }
 * ```
 */
export const RealtimeProvider = <TTables extends TableMap = TableMap>({
  children,
  config,
}: RealtimeProviderProps<TTables>): ReactElement => {
  const {
    userId,
    wsHost,
    wsSecure = false,
    debug = false,
    recordCache,
    dbName = 'abe-realtime',
    fetchRecordsEndpoint = '/api/realtime/getRecords',
    submitTransactionEndpoint = '/api/realtime/write',
  } = config;

  // Track connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  // Track undo/redo state
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0,
    checkpoint: 0,
  });

  // Keep config values in refs for stable callbacks
  const configRef = useRef(config);
  configRef.current = config;

  // Initialize core components (only once)
  const components = useMemo(() => {
    // Create persistent storage
    const recordStorage = new RecordStorage({
      dbName,
      debug,
    });

    // Create undo/redo stack
    const undoRedoStack = new UndoRedoStack<UndoableWrite>({
      maxUndoSize: 100,
      onUndo: (operation: UndoableOperation<UndoableWrite>): void => {
        // Apply inverse operations to cache
        const { operations, previousValues } = operation.data;
        for (let i = 0; i < operations.length; i++) {
          const op = operations[i];
          const prevValue = previousValues[i];
          if (op !== undefined && prevValue !== undefined) {
            const existing = recordCache.get(op.table as keyof TTables & string, op.id);
            if (existing !== undefined) {
              const restored = { ...existing, ...prevValue };
              recordCache.set(
                op.table as keyof TTables & string,
                op.id,
                restored as TTables[keyof TTables & string],
                { force: true },
              );
            }
          }
        }
      },
      onRedo: (operation: UndoableOperation<UndoableWrite>): void => {
        // Re-apply the operations to cache
        const { operations } = operation.data;
        for (const op of operations) {
          const existing = recordCache.get(op.table as keyof TTables & string, op.id);
          if (existing !== undefined) {
            const updated = { ...existing, ...op.updates };
            recordCache.set(
              op.table as keyof TTables & string,
              op.id,
              updated as TTables[keyof TTables & string],
              { force: true },
            );
          }
        }
      },
      onStateChange: (state: UndoRedoState): void => {
        setUndoRedoState(state);
        configRef.current.onUndoRedoStateChange?.(state);
      },
    });

    return { recordStorage, undoRedoStack };
  }, [dbName, debug, recordCache]);

  const { recordStorage, undoRedoStack } = components;

  // Create subscription cache
  const subscriptionCache = useMemo(() => {
    return new SubscriptionCache({
      onSubscribe: (_key: string): void => {
        // Will be connected to pubsub in effect
      },
      onUnsubscribe: (_key: string): void => {
        // Will be connected to pubsub in effect
      },
    });
  }, []);

  // Create pubsub client
  const pubsub = useMemo(() => {
    return new WebsocketPubsubClient({
      host: wsHost,
      secure: wsSecure,
      debug,
      onMessage: (key: string, value: unknown): void => {
        // Parse key: "table:id"
        const [table, id] = key.split(':');
        if (table === undefined || table === '' || id === undefined || id === '') return;

        // Validate value is an object before using as record
        if (typeof value !== 'object' || value === null) return;

        // Update cache with new value
        const record = value as VersionedRecord & { [key: string]: unknown };
        const existing = recordCache.get(table as keyof TTables & string, id) as
          | VersionedRecord
          | undefined;

        // Update if no existing record or if new version is higher
        const shouldUpdate = existing === undefined || record.version > existing.version;

        if (shouldUpdate) {
          recordCache.set(
            table as keyof TTables & string,
            id,
            record as unknown as TTables[keyof TTables & string],
          );

          // Also persist to storage
          void recordStorage.setRecord(table, record);
        }
      },
      onConnect: (): void => {
        setConnectionState('connected');
        configRef.current.onConnectionStateChange?.('connected');

        // Resubscribe to all active subscriptions
        for (const key of subscriptionCache.keys()) {
          pubsub.subscribe(key);
        }
      },
      onDisconnect: (): void => {
        setConnectionState('disconnected');
        configRef.current.onConnectionStateChange?.('disconnected');
      },
    });
  }, [wsHost, wsSecure, debug, recordCache, recordStorage, subscriptionCache]);

  // Create transaction queue
  const transactionQueue = useMemo(() => {
    return new TransactionQueue({
      submitTransaction: async (
        tx: QueuedTransaction,
      ): Promise<{ status: number; message?: string }> => {
        try {
          const response = await fetch(submitTransactionEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tx),
          });
          return { status: response.status };
        } catch {
          return { status: 0 }; // Offline
        }
      },
      onRollback: async (tx: QueuedTransaction): Promise<void> => {
        // Rollback optimistic updates from the transaction
        for (const op of tx.operations) {
          const writeOp = op as unknown as WriteOperation;
          const table = writeOp.table;
          const id = writeOp.id;
          if (typeof table === 'string' && typeof id === 'string') {
            // Fetch fresh record from server
            try {
              const response = await fetch(fetchRecordsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pointers: [{ table, id }] }),
              });
              const data = (await response.json()) as { recordMap: RecordMap };
              const record = data.recordMap[table]?.[id];
              if (record !== undefined) {
                recordCache.set(
                  table as keyof TTables & string,
                  id,
                  record as unknown as TTables[keyof TTables & string],
                  { force: true },
                );
              }
            } catch {
              // Failed to fetch - remove from cache
              recordCache.delete(table as keyof TTables & string, id);
            }
          }
        }
      },
      onOnlineStatusChange: (online: boolean): void => {
        setIsOnline(online);
      },
    });
  }, [fetchRecordsEndpoint, submitTransactionEndpoint, recordCache]);

  // Wire up subscription cache to pubsub
  useEffect(() => {
    // Override subscription cache callbacks to use pubsub
    const originalOnSubscribe = subscriptionCache['options'].onSubscribe;
    const originalOnUnsubscribe = subscriptionCache['options'].onUnsubscribe;

    subscriptionCache['options'].onSubscribe = (key: string): void => {
      originalOnSubscribe(key);
      pubsub.subscribe(key);
    };

    subscriptionCache['options'].onUnsubscribe = (key: string): void => {
      originalOnUnsubscribe(key);
      pubsub.unsubscribe(key);
    };

    return (): void => {
      subscriptionCache['options'].onSubscribe = originalOnSubscribe;
      subscriptionCache['options'].onUnsubscribe = originalOnUnsubscribe;
    };
  }, [subscriptionCache, pubsub]);

  // Clean up on unmount
  useEffect(() => {
    return (): void => {
      pubsub.close();
      subscriptionCache.clear();
      transactionQueue.destroy();
    };
  }, [pubsub, subscriptionCache, transactionQueue]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
    };
    const handleOffline = (): void => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return (): void => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Write function for optimistic updates
  const write = useCallback(
    async (operations: WriteOperation[], options: WriteOptions = {}): Promise<void> => {
      const { skipUndo = false } = options;

      // Capture previous values for undo
      const previousValues: Array<Record<string, unknown> | undefined> = [];

      // Apply optimistic updates to cache
      for (const op of operations) {
        const existing = recordCache.get(op.table as keyof TTables & string, op.id) as
          | (Record<string, unknown> & { id: string })
          | undefined;

        if (existing !== undefined) {
          // Capture only the keys being updated for rollback
          const prevValue: Record<string, unknown> = {};
          for (const key of Object.keys(op.updates)) {
            prevValue[key] = existing[key];
          }
          previousValues.push(prevValue);

          // Apply update
          const updated = { ...existing, ...op.updates };
          recordCache.set(
            op.table as keyof TTables & string,
            op.id,
            updated as unknown as TTables[keyof TTables & string],
            { force: true },
          );
        } else {
          previousValues.push(undefined);
        }
      }

      // Add to undo stack
      if (!skipUndo && operations.length > 0) {
        undoRedoStack.push({ operations, previousValues });
      }

      // Create flat list of SetOperation objects for the transaction
      const flatOperations: RealtimeOperation[] = [];
      for (const op of operations) {
        for (const [key, value] of Object.entries(op.updates)) {
          flatOperations.push({
            type: 'set',
            table: op.table,
            id: op.id,
            key,
            value,
          });
        }
      }

      // Create transaction for the queue
      const transaction: QueuedTransaction = {
        txId: `tx-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`,
        authorId: userId,
        clientTimestamp: Date.now(),
        operations: flatOperations,
      };

      // Enqueue for processing
      await transactionQueue.enqueue(transaction);
    },
    [recordCache, undoRedoStack, userId, transactionQueue],
  );

  // Subscribe function
  const subscribe = useCallback(
    (table: string, id: string): (() => void) => {
      const key = `${table}:${id}`;
      return subscriptionCache.subscribe(key);
    },
    [subscriptionCache],
  );

  // Undo function
  const undo = useCallback(() => {
    undoRedoStack.undo();
  }, [undoRedoStack]);

  // Redo function
  const redo = useCallback(() => {
    undoRedoStack.redo();
  }, [undoRedoStack]);

  // Build context value
  const value = useMemo(
    (): RealtimeContextValue<TTables> => ({
      userId,
      recordCache,
      recordStorage,
      transactionQueue,
      pubsub,
      subscriptionCache,
      undoRedoStack,
      connectionState,
      isOnline,
      write,
      subscribe,
      undo,
      redo,
      undoRedoState,
    }),
    [
      userId,
      recordCache,
      recordStorage,
      transactionQueue,
      pubsub,
      subscriptionCache,
      undoRedoStack,
      connectionState,
      isOnline,
      write,
      subscribe,
      undo,
      redo,
      undoRedoState,
    ],
  );

  return (
    <RealtimeContext.Provider value={value as unknown as RealtimeContextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the realtime context.
 *
 * @throws Error if used outside of RealtimeProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { recordCache, write, subscribe } = useRealtime();
 *
 *   // Subscribe to a record
 *   useEffect(() => {
 *     return subscribe('user', userId);
 *   }, [userId, subscribe]);
 *
 *   // Write updates
 *   const handleUpdate = async () => {
 *     await write([{ table: 'user', id: userId, updates: { name: 'New Name' } }]);
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useRealtime<TTables extends TableMap = TableMap>(): RealtimeContextValue<TTables> {
  const context = useContext(RealtimeContext);

  if (context === null) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }

  return context as unknown as RealtimeContextValue<TTables>;
}

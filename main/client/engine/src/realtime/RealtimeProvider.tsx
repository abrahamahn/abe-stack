// main/client/engine/src/realtime/RealtimeProvider.tsx
/**
 * RealtimeProvider - Engine-level React context that wires together
 * all realtime infrastructure components and exposes them to hooks.
 *
 * Provides:
 * - RecordCache for in-memory record storage
 * - RecordStorage for persistent IndexedDB storage
 * - TransactionQueue for offline-first mutations
 * - WebsocketPubsubClient for real-time updates
 * - SubscriptionCache for ref-counted subscriptions
 * - UndoRedoStack for undo/redo support
 * - Connection state tracking
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

import { RecordCache, type TableMap } from '../cache';
import { TransactionQueue, type QueuedTransaction } from '../offline/TransactionQueue';
import { RecordStorage } from '../storage/RecordStorage';
import { UndoRedoStack, type UndoableOperation, type UndoRedoState } from '../undo/UndoRedoStack';

import { SubscriptionCache } from './SubscriptionCache';
import { WebsocketPubsubClient, type ConnectionState } from './WebsocketPubsubClient';

import type { VersionedRecord } from '@bslt/shared';

// ============================================================================
// Types
// ============================================================================

/**
 * Write operation for optimistic updates.
 */
export interface EngineWriteOperation {
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Partial updates to apply */
  updates: Record<string, unknown>;
}

/**
 * Data stored in undo stack for write operations.
 */
export interface EngineUndoableWrite {
  /** The operations that were performed */
  operations: EngineWriteOperation[];
  /** Previous values for each operation (for rollback) */
  previousValues: Array<Record<string, unknown> | undefined>;
}

/**
 * Configuration for the engine-level RealtimeProvider.
 */
export interface EngineRealtimeProviderConfig<TTables extends TableMap = TableMap> {
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
  /** Token provider for authenticated API calls */
  getToken?: () => Promise<string | null>;
}

/**
 * Value provided by the engine-level RealtimeContext.
 */
export interface EngineRealtimeContextValue<TTables extends TableMap = TableMap> {
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
  undoRedoStack: UndoRedoStack<EngineUndoableWrite>;
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether the client is online */
  isOnline: boolean;
  /** Current undo/redo state */
  undoRedoState: UndoRedoState;
}

// ============================================================================
// Context
// ============================================================================

const EngineRealtimeContext = createContext<EngineRealtimeContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export interface EngineRealtimeProviderProps<TTables extends TableMap = TableMap> {
  children?: ReactNode;
  config: EngineRealtimeProviderConfig<TTables>;
}

/**
 * Engine-level RealtimeProvider.
 *
 * Wires together RecordCache, RecordStorage, WebsocketPubsubClient,
 * SubscriptionCache, TransactionQueue, and UndoRedoStack. Exposes them
 * via React context so that engine-level hooks (useRecord, useRecords,
 * useWrite, useUndoRedo) can access them.
 *
 * @example
 * ```tsx
 * import { RecordCache } from '@bslt/client-engine';
 *
 * const cache = new RecordCache<MyTables>();
 *
 * function App() {
 *   return (
 *     <EngineRealtimeProvider
 *       config={{
 *         userId: currentUser.id,
 *         wsHost: 'api.example.com',
 *         recordCache: cache,
 *       }}
 *     >
 *       <MyApp />
 *     </EngineRealtimeProvider>
 *   );
 * }
 * ```
 */
export const EngineRealtimeProvider = <TTables extends TableMap = TableMap>({
  children,
  config,
}: EngineRealtimeProviderProps<TTables>): ReactElement => {
  const {
    userId,
    wsHost,
    wsSecure = false,
    debug = false,
    recordCache,
    dbName = 'bslt-realtime',
    fetchRecordsEndpoint = '/api/realtime/getRecords',
    submitTransactionEndpoint = '/api/realtime/write',
    getToken,
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
  useLayoutEffect(() => {
    configRef.current = config;
  });

  // Initialize core components (only once per config change)
  const components = useMemo(() => {
    const recordStorage = new RecordStorage({
      dbName,
      debug,
    });

    const undoRedoStack = new UndoRedoStack<EngineUndoableWrite>({
      maxUndoSize: 100,
      onUndo: (operation: UndoableOperation<EngineUndoableWrite>): void => {
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
      onRedo: (operation: UndoableOperation<EngineUndoableWrite>): void => {
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
      onStateChange: setUndoRedoState,
    });

    return { recordStorage, undoRedoStack };
  }, [dbName, debug, recordCache]);

  const { recordStorage, undoRedoStack } = components;

  // Forward undo/redo state changes to config callback
  useEffect(() => {
    configRef.current.onUndoRedoStateChange?.(undoRedoState);
  }, [undoRedoState]);

  // Handle pubsub messages: update cache and storage
  const handlePubsubMessage = useCallback(
    (key: string, value: unknown): void => {
      const [table, id] = key.split(':');
      if (table === undefined || table === '' || id === undefined || id === '') return;
      if (typeof value !== 'object' || value === null) return;

      const record = value as VersionedRecord & { [key: string]: unknown };
      const existing = recordCache.get(table as keyof TTables & string, id) as
        | VersionedRecord
        | undefined;
      const shouldUpdate = existing === undefined || record.version > existing.version;

      if (shouldUpdate) {
        recordCache.set(
          table as keyof TTables & string,
          id,
          record as unknown as TTables[keyof TTables & string],
        );
        void recordStorage.setRecord(table, record);
      }
    },
    [recordCache, recordStorage],
  );

  // Create pubsub + subscription cache together
  const { subscriptionCache, pubsub } = useMemo(() => {
    const client = new WebsocketPubsubClient({
      host: wsHost,
      secure: wsSecure,
      debug,
      onMessage: handlePubsubMessage,
      onConnect: (): void => {
        setConnectionState('connected');
        for (const key of cache.keys()) {
          client.subscribe(key);
        }
      },
      onDisconnect: (): void => {
        setConnectionState('disconnected');
      },
    });

    const cache = new SubscriptionCache({
      onSubscribe: (key: string): void => {
        client.subscribe(key);
      },
      onUnsubscribe: (key: string): void => {
        client.unsubscribe(key);
      },
    });

    return { subscriptionCache: cache, pubsub: client };
  }, [wsHost, wsSecure, debug, handlePubsubMessage]);

  // Forward connection state changes to config callback
  useEffect(() => {
    configRef.current.onConnectionStateChange?.(connectionState);
  }, [connectionState]);

  // Create transaction queue
  const transactionQueue = useMemo(() => {
    return new TransactionQueue({
      submitTransaction: async (
        tx: QueuedTransaction,
      ): Promise<{ status: number; message?: string }> => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          const token = await getToken?.();
          if (token !== undefined && token !== null && token !== '') {
            headers['Authorization'] = `Bearer ${token}`;
          }
          const response = await fetch(submitTransactionEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(tx),
          });
          return { status: response.status };
        } catch {
          return { status: 0 }; // Offline
        }
      },
      onRollback: async (tx: QueuedTransaction): Promise<void> => {
        for (const op of tx.operations) {
          const table = op.table;
          const id = op.id;
          if (typeof table === 'string' && typeof id === 'string') {
            try {
              const rollbackHeaders: Record<string, string> = {
                'Content-Type': 'application/json',
              };
              const rollbackToken = await getToken?.();
              if (rollbackToken !== undefined && rollbackToken !== null && rollbackToken !== '') {
                rollbackHeaders['Authorization'] = `Bearer ${rollbackToken}`;
              }
              const response = await fetch(fetchRecordsEndpoint, {
                method: 'POST',
                headers: rollbackHeaders,
                body: JSON.stringify({ pointers: [{ table, id }] }),
              });
              const data = (await response.json()) as {
                recordMap: Record<string, Record<string, VersionedRecord>>;
              };
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
              recordCache.delete(table as keyof TTables & string, id);
            }
          }
        }
      },
      onOnlineStatusChange: (online: boolean): void => {
        setIsOnline(online);
      },
    });
  }, [fetchRecordsEndpoint, submitTransactionEndpoint, recordCache, getToken]);

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

  // Build context value
  const value = useMemo(
    (): EngineRealtimeContextValue<TTables> => ({
      userId,
      recordCache,
      recordStorage,
      transactionQueue,
      pubsub,
      subscriptionCache,
      undoRedoStack,
      connectionState,
      isOnline,
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
      undoRedoState,
    ],
  );

  return (
    <EngineRealtimeContext.Provider value={value as unknown as EngineRealtimeContextValue}>
      {children}
    </EngineRealtimeContext.Provider>
  );
};

// ============================================================================
// Hook to access engine-level realtime context
// ============================================================================

/**
 * Hook to access the engine-level realtime context.
 *
 * @throws Error if used outside of EngineRealtimeProvider
 */
export function useEngineRealtime<
  TTables extends TableMap = TableMap,
>(): EngineRealtimeContextValue<TTables> {
  const context = useContext(EngineRealtimeContext);

  if (context === null) {
    throw new Error('useEngineRealtime must be used within an EngineRealtimeProvider');
  }

  return context as unknown as EngineRealtimeContextValue<TTables>;
}

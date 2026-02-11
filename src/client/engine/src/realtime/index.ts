// src/client/engine/src/realtime/index.ts
/**
 * Realtime Module
 *
 * Provides real-time synchronization and offline-first capabilities:
 *
 * Components:
 * - WebsocketPubsubClient: WebSocket-based pub/sub for real-time updates
 * - SubscriptionCache: Reference-counted subscription management
 * - RealtimeProvider: React context integrating all realtime components
 *
 * Hooks:
 * - useRealtime: Access the full realtime context
 * - useRecord: Get a record with auto-subscription
 * - useRecords: Get multiple records with auto-subscription
 * - useWrite: Perform optimistic writes
 * - useIsOnline: Check online status
 * - useIsPendingWrite: Check if a record has pending writes
 * - useConnectionState: Get WebSocket connection state
 * - useUndoRedo: Access undo/redo functionality
 */

// WebSocket Client
export {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig,
} from './WebsocketPubsubClient';

// Subscription Cache
export { SubscriptionCache, type SubscriptionCacheOptions } from './SubscriptionCache';

// React Context
export {
  RealtimeProvider,
  useRealtime,
  type RealtimeProviderConfig,
  type RealtimeProviderProps,
  type RealtimeContextValue,
  type WriteOperation,
  type WriteOptions,
  type UndoableWrite,
} from './RealtimeContext';

// React Hooks
export {
  useRecord,
  useRecords,
  useWrite,
  useIsOnline,
  useIsPendingWrite,
  useConnectionState,
  useUndoRedo,
  type UseRecordOptions,
  type UseRecordResult,
  type UseRecordsResult,
  type UseWriteResult,
  type UseUndoRedoResult,
  type WriteFn,
} from './hooks';

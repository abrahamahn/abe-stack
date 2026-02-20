// main/client/engine/src/realtime/index.ts
export {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig,
} from './WebsocketPubsubClient';
export { SubscriptionCache, type SubscriptionCacheOptions } from './SubscriptionCache';

// Hooks
export {
  useRecord,
  useRecords,
  useWrite,
  useUndoRedo,
  isPermissionError,
  createPermissionError,
  type UseRecordDeps,
  type UseRecordOptions,
  type UseRecordResult,
  type UseRecordsDeps,
  type UseRecordsOptions,
  type UseRecordsResult,
  type UseWriteDeps,
  type UseWriteResult,
  type WriteOperation,
  type WriteOptions,
  type UseUndoRedoDeps,
  type UseUndoRedoResult,
  type PermissionError,
  type PermissionRevokedEventPayload,
  type PermissionRevokedCallback,
  type PermissionEventListener,
} from './hooks/index';

// Engine-level RealtimeProvider
export {
  EngineRealtimeProvider,
  useEngineRealtime,
  type EngineRealtimeContextValue,
  type EngineRealtimeProviderConfig,
  type EngineRealtimeProviderProps,
  type EngineUndoableWrite,
  type EngineWriteOperation,
} from './RealtimeProvider';

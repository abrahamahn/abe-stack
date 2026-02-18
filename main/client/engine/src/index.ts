// main/client/engine/src/index.ts

// In-Memory Cache
export { Loader, LoaderCache, loadWithCache } from './cache/LoaderCache';
export type { LoaderCacheOptions, LoaderOptions, LoaderState } from './cache/LoaderCache';
export { RecordCache } from './cache/RecordCache';
export type {
  CacheStats,
  IdentifiableRecord,
  RecordCacheOptions,
  RecordChange,
  RecordChangeListener,
  SetRecordOptions,
  TableMap
} from './cache/RecordCache';

// Shared types (used alongside engine's realtime features)
export type { RecordPointer, VersionedRecord } from '@bslt/shared';

// Offline Support
export { createTransactionQueue, TransactionQueue } from './offline/TransactionQueue';
export type {
  QueuedTransaction,
  TransactionQueueOptions,
  TransactionQueueStatus,
  TransactionRecordPointer,
  TransactionResponse
} from './offline/TransactionQueue';

// Real-Time
export {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig
} from './realtime/WebsocketPubsubClient';

export { SubscriptionCache, type SubscriptionCacheOptions } from './realtime/SubscriptionCache';

// Persistent Storage
export {
  createRecordMap,
  createRecordStorage,
  iterateRecordMap,
  RecordStorage,
  RecordStorageError
} from './storage/RecordStorage';
export type {
  RecordMap,
  RecordStorageErrorType,
  RecordStorageEvent,
  RecordStorageListener,
  RecordStorageOptions,
  RecordWithTable
} from './storage/RecordStorage';

export { clear, createStore, del, get, keys, set, type IDBStore } from './storage/idb';

export { idbStorage, localStorageQueue, type StorageAdapter } from './storage/storage';

export {
  clearQueryCache,
  createPersistedClientFromQueryCache,
  createQueryPersister,
  restorePersistedQueryCache, type PersistedClient,
  type PersistedClientState,
  type PersistedQuery,
  type Persister, type QueryPersisterOptions
} from './storage/queryPersister';

export {
  createMutationQueue,
  MutationQueue,
  type MutationQueueOptions,
  type QueuedMutation,
  type QueueStatus
} from './storage/mutationQueue';

// Undo/Redo
export { createUndoRedoStack, UndoRedoStack } from './undo/UndoRedoStack';
export type {
  OperationGroup,
  UndoableOperation,
  UndoRedoStackOptions,
  UndoRedoState
} from './undo/UndoRedoStack';

// Query Cache
export { hashQueryKey, QueryCache, queryKeysEqual } from './query/QueryCache';
export type {
  FetchStatus,
  QueryCacheOptions,
  QueryKey,
  QueryState,
  QueryStatus,
  SetQueryDataOptions
} from './query/QueryCache';

// Query Keys
export { queryKeys } from './queryKeys';
export type { PostListFilters, QueryKeys, UserListFilters } from './queryKeys';

// Search (client-specific)
export {
  ClientSearchQueryBuilder,
  createClientSearchQuery,
  fromClientSearchQuery
} from './search/query-builder';

// Theme
export {
  DEFAULT_CONTRAST_MODE,
  DEFAULT_DENSITY,
  densityMultipliers,
  getContrastCssVariables,
  getDensityCssVariables,
  getSpacingForDensity,
  highContrastDarkOverrides,
  highContrastLightOverrides,
  type ContrastMode,
  type Density
} from './theme';


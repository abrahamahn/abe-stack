// packages/sdk/src/index.ts
// NOTE: This file is manually maintained after refactor

// API Client
export { createApiClient, createReactQueryClient } from './api';
export type {
  ApiClient,
  ApiClientConfig,
  ApiClientOptions,
  AuthResponse,
  CreateApiOptions,
  LoginRequest,
  ReactQueryClientInstance,
  RegisterRequest,
  UserResponse,
} from './api';

// In-Memory Cache
export { Loader, LoaderCache, RecordCache, loadWithCache } from './cache';
export type {
  CacheStats,
  IdentifiableRecord,
  LoaderCacheOptions,
  LoaderOptions,
  LoaderState,
  RecordCacheOptions,
  RecordChange,
  RecordChangeListener,
  RecordPointer,
  SetRecordOptions,
  TableMap,
} from './cache';

// Offline Support
export { TransactionQueue, createTransactionQueue } from './offline';
export type {
  QueuedTransaction,
  TransactionQueueOptions,
  TransactionQueueStatus,
  TransactionRecordPointer,
  TransactionResponse,
} from './offline';

// Real-Time
export {
  // Core Components
  SubscriptionCache,
  WebsocketPubsubClient,
  // React Context
  RealtimeProvider,
  useRealtime,
  // React Hooks
  useRecord,
  useRecords,
  useWrite,
  useIsOnline,
  useIsPendingWrite,
  useConnectionState,
  useUndoRedo,
} from './realtime';
export type {
  // Core Types
  ClientPubsubMessage,
  ConnectionState,
  ServerPubsubMessage,
  SubscriptionCacheOptions,
  WebsocketPubsubClientConfig,
  // Context Types
  RealtimeProviderConfig,
  RealtimeProviderProps,
  RealtimeContextValue,
  WriteOperation,
  WriteOptions,
  UndoableWrite,
  // Hook Types
  UseRecordOptions,
  UseRecordResult,
  UseRecordsResult,
  UseWriteResult,
  UseUndoRedoResult,
  WriteFn,
} from './realtime';

// Persistent Storage
export {
  MutationQueue,
  RecordStorage,
  RecordStorageError,
  clear,
  clearQueryCache,
  createMutationQueue,
  createQueryPersister,
  createRecordMap,
  createRecordStorage,
  createStore,
  del,
  get,
  idbStorage,
  iterateRecordMap,
  keys,
  localStorageQueue,
  set,
} from './storage';
export type {
  IDBStore,
  MutationQueueOptions,
  QueryPersisterOptions,
  QueueStatus,
  QueuedMutation,
  RecordMap,
  RecordStorageErrorType,
  RecordStorageEvent,
  RecordStorageListener,
  RecordStorageOptions,
  RecordWithTable,
  StorageAdapter,
  VersionedRecord,
} from './storage';

// Undo/Redo
export { UndoRedoStack, createUndoRedoStack } from './undo';
export type {
  OperationGroup,
  UndoRedoStackOptions,
  UndoRedoState,
  UndoableOperation,
} from './undo';

// React Hooks
export { useAuthModeNavigation } from './hooks';
export type { AuthMode, AuthModeNavigation, AuthModeNavigationOptions } from './hooks';

// Query Keys
export { queryKeys } from './queryKeys';
export type { PostListFilters, QueryKeys, UserListFilters } from './queryKeys';

// Errors
export {
  ApiError,
  NetworkError,
  TimeoutError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
} from './errors';
export type { ApiErrorBody } from './errors';

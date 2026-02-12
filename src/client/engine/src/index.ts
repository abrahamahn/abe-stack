// src/client/engine/src/index.ts
// NOTE: This file is manually maintained after refactor

// API Client
export { createApiClient } from '@abe-stack/api';
export type {
  ApiClient,
  ApiClientConfig,
  ApiClientOptions,
  AuthResponse,
  LoginRequest,
  OAuthConnectionsResponse,
  OAuthEnabledProvidersResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  RegisterRequest,
  User,
} from '@abe-stack/api';

// In-Memory Cache
export { Loader, LoaderCache, loadWithCache } from './cache/LoaderCache';
export { RecordCache } from './cache/RecordCache';
export type { LoaderCacheOptions, LoaderOptions, LoaderState } from './cache/LoaderCache';
export type {
  CacheStats,
  IdentifiableRecord,
  RecordCacheOptions,
  RecordChange,
  RecordChangeListener,
  RecordPointer,
  SetRecordOptions,
  TableMap,
} from './cache/RecordCache';

// Offline Support
// Offline Support
export { createTransactionQueue, TransactionQueue } from './offline/TransactionQueue';
export type {
  QueuedTransaction,
  TransactionQueueOptions,
  TransactionQueueStatus,
  TransactionRecordPointer,
  TransactionResponse,
} from './offline/TransactionQueue';

// Real-Time
// Real-Time
export {
  // WebSocket Client
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig,
} from './realtime/WebsocketPubsubClient';

export { SubscriptionCache, type SubscriptionCacheOptions } from './realtime/SubscriptionCache';

export {
  // React Context
  RealtimeProvider,
  useRealtime,
  type RealtimeContextValue,
  type RealtimeProviderConfig,
  type RealtimeProviderProps,
  type UndoableWrite,
  type WriteOperation,
  type WriteOptions,
} from './realtime/RealtimeContext';

export {
  // React Hooks
  useConnectionState,
  useIsOnline,
  useIsPendingWrite,
  useRecord,
  useRecords,
  useUndoRedo,
  useWrite,
  type UseRecordOptions,
  type UseRecordResult,
  type UseRecordsResult,
  type UseUndoRedoResult,
  type UseWriteResult,
  type WriteFn,
} from './realtime/hooks';

// Persistent Storage
// Persistent Storage
export {
  createRecordMap,
  createRecordStorage,
  iterateRecordMap,
  RecordStorage,
  RecordStorageError,
} from './storage/RecordStorage';
export type {
  RecordMap,
  RecordStorageErrorType,
  RecordStorageEvent,
  RecordStorageListener,
  RecordStorageOptions,
  RecordWithTable,
  VersionedRecord,
} from './storage/RecordStorage';

export { clear, createStore, del, get, keys, set, type IDBStore } from './storage/idb';

export { idbStorage, localStorageQueue, type StorageAdapter } from './storage/storage';

export {
  clearQueryCache,
  createQueryPersister,
  type QueryPersisterOptions,
} from './storage/queryPersister';

export {
  createMutationQueue,
  MutationQueue,
  type MutationQueueOptions,
  type QueuedMutation,
  type QueueStatus,
} from './storage/mutationQueue';

// Undo/Redo
// Undo/Redo
export { createUndoRedoStack, UndoRedoStack } from './undo/UndoRedoStack';
export type {
  OperationGroup,
  UndoableOperation,
  UndoRedoStackOptions,
  UndoRedoState,
} from './undo/UndoRedoStack';

// Query Cache
// Query Cache
export { hashQueryKey, QueryCache, queryKeysEqual } from './query/QueryCache';
export type {
  FetchStatus,
  QueryCacheOptions,
  QueryKey,
  QueryState,
  QueryStatus,
  SetQueryDataOptions,
} from './query/QueryCache';
export { QueryCacheProvider, useQueryCache } from './query/QueryCacheProvider';
export type { QueryCacheProviderProps } from './query/QueryCacheProvider';
export { useInfiniteQuery } from './query/useInfiniteQuery';
export type {
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './query/useInfiniteQuery';
export { useMutation } from './query/useMutation';
export type { MutationStatus, UseMutationOptions, UseMutationResult } from './query/useMutation';
export { useQuery } from './query/useQuery';
export type { UseQueryOptions, UseQueryResult } from './query/useQuery';

// Query Keys
export { queryKeys } from './queryKeys';
export type { PostListFilters, QueryKeys, UserListFilters } from './queryKeys';

// Errors
export {
  ApiError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
  NetworkError,
  TimeoutError,
} from '@abe-stack/api';
export type { ApiErrorBody } from '@abe-stack/api';

// Notifications (Push)
export {
  // Client
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
  urlBase64ToUint8Array,
  // Hooks
  useNotificationPreferences,
  usePushPermission,
  usePushSubscription,
  useTestNotification,
} from '@abe-stack/api';
export type {
  NotificationClient,
  NotificationClientConfig,
  NotificationPreferencesState,
  PushPermissionState,
  PushSubscriptionState,
  TestNotificationState,
  UseNotificationPreferencesOptions,
  UsePushSubscriptionOptions,
} from '@abe-stack/api';

// Search
// Search
export {
  // Query Builder
  ClientSearchQueryBuilder,
  contains,
  createClientSearchQuery,
  createSearchQuery,
  eq,
  fromClientSearchQuery,
  fromSearchQuery,
  gt,
  inArray,
  lt,
  neq,
  queryToURLSearchParams,
  SearchQueryBuilder,
  urlSearchParamsToQuery,
} from './search/query-builder';

export {
  // URL Serialization
  buildURLWithQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  extractQueryFromURL,
  mergeSearchParamsIntoURL,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
} from './search/serialization';
export type {
  SerializationOptions,
  SerializedFilter,
  SerializedQuery,
} from './search/serialization';

export {
  // Hooks
  useDebounceSearch,
  useInfiniteSearch,
  useSearch,
  useSearchParams,
} from './search/hooks';
export type {
  CursorSearchFn,
  SearchFn,
  UseInfiniteSearchOptions,
  UseInfiniteSearchResult,
  UseSearchOptions,
  UseSearchResult,
} from './search/hooks';

// Billing
export {
  // Hooks
  billingQueryKeys,
  // Admin Client
  createAdminBillingClient,
  // Client
  createBillingClient,
  useAdminPlans,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
} from '@abe-stack/api';
export type {
  // Admin Types
  AdminBillingClient,
  AdminBillingClientConfig,
  AdminPlansState,
  // Client Types
  BillingClient,
  BillingClientConfig,
  // Hook State Types
  InvoicesState,
  PaymentMethodsState,
  PlansState,
  SubscriptionState,
} from '@abe-stack/api';

// OAuth
export {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from '@abe-stack/api';
export type { EnabledOAuthProvidersState, OAuthConnectionsState } from '@abe-stack/api';

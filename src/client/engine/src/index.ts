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
export { Loader, LoaderCache, RecordCache, loadWithCache } from './cache/index';
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
} from './cache/index';

// Offline Support
export { TransactionQueue, createTransactionQueue } from './offline/index';
export type {
  QueuedTransaction,
  TransactionQueueOptions,
  TransactionQueueStatus,
  TransactionRecordPointer,
  TransactionResponse,
} from './offline/index';

// Real-Time
export {
  // React Context
  RealtimeProvider,
  // Core Components
  SubscriptionCache,
  WebsocketPubsubClient,
  useConnectionState,
  useIsOnline,
  useIsPendingWrite,
  useRealtime,
  // React Hooks
  useRecord,
  useRecords,
  useUndoRedo,
  useWrite,
} from './realtime/index';
export type {
  // Core Types
  ClientPubsubMessage,
  ConnectionState,
  RealtimeContextValue,
  // Context Types
  RealtimeProviderConfig,
  RealtimeProviderProps,
  ServerPubsubMessage,
  SubscriptionCacheOptions,
  UndoableWrite,
  // Hook Types
  UseRecordOptions,
  UseRecordResult,
  UseRecordsResult,
  UseUndoRedoResult,
  UseWriteResult,
  WebsocketPubsubClientConfig,
  WriteFn,
  WriteOperation,
  WriteOptions,
} from './realtime/index';

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
} from './storage/index';
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
} from './storage/index';

// Undo/Redo
export { UndoRedoStack, createUndoRedoStack } from './undo/index';
export type {
  OperationGroup,
  UndoRedoStackOptions,
  UndoRedoState,
  UndoableOperation,
} from './undo/index';

// Query Cache
export { QueryCache, hashQueryKey, queryKeysEqual } from './query/QueryCache';
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
  NetworkError,
  TimeoutError,
  createApiError,
  getErrorMessage,
  isApiError,
  isNetworkError,
  isTimeoutError,
  isUnauthorizedError,
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
export {
  // Query Builder
  ClientSearchQueryBuilder,
  SearchQueryBuilder,
  buildURLWithQuery,
  // Quick Filters
  contains,
  createClientSearchQuery,
  createSearchQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  eq,
  extractQueryFromURL,
  fromClientSearchQuery,
  fromSearchQuery,
  gt,
  inArray,
  lt,
  mergeSearchParamsIntoURL,
  neq,
  // URL Serialization
  queryToURLSearchParams,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
  urlSearchParamsToQuery,
  // Hooks
  useDebounceSearch,
  useInfiniteSearch,
  useSearch,
  useSearchParams,
} from './search/index';
export type {
  CursorSearchFn,
  SearchFn,
  SerializationOptions,
  SerializedFilter,
  SerializedQuery,
  UseInfiniteSearchOptions,
  UseInfiniteSearchResult,
  UseSearchOptions,
  UseSearchResult,
} from './search/index';

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

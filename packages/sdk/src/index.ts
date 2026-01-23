// packages/sdk/src/index.ts
// NOTE: This file is manually maintained after refactor

// API Client
export { createApiClient } from './api';
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
export { useQuery } from './query/useQuery';
export type { UseQueryOptions, UseQueryResult } from './query/useQuery';
export { useInfiniteQuery } from './query/useInfiniteQuery';
export type {
  InfinitePageParam,
  UseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './query/useInfiniteQuery';
export { useMutation } from './query/useMutation';
export type { MutationStatus, UseMutationOptions, UseMutationResult } from './query/useMutation';

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
} from './notifications';
export type {
  NotificationClient,
  NotificationClientConfig,
  NotificationPreferencesState,
  PushPermissionState,
  PushSubscriptionState,
  TestNotificationState,
  UseNotificationPreferencesOptions,
  UsePushSubscriptionOptions,
} from './notifications';

// Search
export {
  // Query Builder
  ClientSearchQueryBuilder,
  createClientSearchQuery,
  createSearchQuery,
  fromClientSearchQuery,
  fromSearchQuery,
  SearchQueryBuilder,
  // Quick Filters
  contains,
  eq,
  gt,
  inArray,
  lt,
  neq,
  // URL Serialization
  queryToURLSearchParams,
  urlSearchParamsToQuery,
  buildURLWithQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  extractQueryFromURL,
  mergeSearchParamsIntoURL,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
  // Hooks
  useDebounceSearch,
  useInfiniteSearch,
  useSearch,
  useSearchParams,
} from './search';
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
} from './search';

// Billing
export {
  // Client
  createBillingClient,
  // Hooks
  billingQueryKeys,
  useInvoices,
  usePaymentMethods,
  usePlans,
  useSubscription,
  // Admin Client
  createAdminBillingClient,
  useAdminPlans,
} from './billing';
export type {
  // Client Types
  BillingClient,
  BillingClientConfig,
  // Hook State Types
  InvoicesState,
  PaymentMethodsState,
  PlansState,
  SubscriptionState,
  // Admin Types
  AdminBillingClient,
  AdminBillingClientConfig,
  AdminPlansState,
} from './billing';

// OAuth
export {
  getOAuthLoginUrl,
  oauthQueryKeys,
  useEnabledOAuthProviders,
  useOAuthConnections,
} from './oauth';
export type { EnabledOAuthProvidersState, OAuthConnectionsState } from './oauth';

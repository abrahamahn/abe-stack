// main/client/engine/src/index.ts

// API Client re-exports for react layer (DAG: react → c-engine → api)
export { createApiClient } from '@bslt/api';
export type { ApiClient, ApiClientConfig } from '@bslt/api';

export { createAdminBillingClient } from '@bslt/api';
export type { AdminBillingClient, AdminBillingClientConfig } from '@bslt/api';

export { createBillingClient } from '@bslt/api';
export type { BillingClient, BillingClientConfig } from '@bslt/api';

export { createDeviceClient } from '@bslt/api';
export type { DeviceClient, DeviceClientConfig, DeviceItem } from '@bslt/api';

export { createApiKeysClient } from '@bslt/api';
export type {
  ApiKeyItem,
  ApiKeysClient,
  ApiKeysClientConfig,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
  RevokeApiKeyResponse,
} from '@bslt/api';

export {
  createNotificationClient,
  getDeviceId,
  getExistingSubscription,
  getPushPermission,
  isPushSupported,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@bslt/api';
export type { NotificationClient, NotificationClientConfig } from '@bslt/api';

export { createPhoneClient } from '@bslt/api';
export type { PhoneClient, PhoneClientConfig } from '@bslt/api';

export { createWebhookClient } from '@bslt/api';
export type {
  CreateWebhookRequest,
  UpdateWebhookRequest,
  WebhookClient,
  WebhookClientConfig,
  WebhookDeliveryItem,
  WebhookItem,
  WebhookWithDeliveries,
} from '@bslt/api';

export { createLegalClient } from '@bslt/api';
export type {
  LegalClient,
  LegalClientConfig,
  LegalDocumentItem,
  PublishLegalDocumentRequest,
  PublishLegalDocumentResponse,
  UserAgreementItem,
} from '@bslt/api';

// In-Memory Cache
export { Loader, LoaderCache, loadWithCache } from './cache';
export type { LoaderCacheOptions, LoaderOptions, LoaderState } from './cache';
export { RecordCache } from './cache';
export type {
  CacheStats,
  IdentifiableRecord,
  RecordCacheOptions,
  RecordChange,
  RecordChangeListener,
  SetRecordOptions,
  TableMap,
} from './cache';

// Shared types (used alongside engine's realtime features)
export type { RecordPointer, VersionedRecord } from '@bslt/shared';

// Offline Support
export { createTransactionQueue, TransactionQueue } from './offline';
export type {
  QueuedTransaction,
  TransactionQueueOptions,
  TransactionQueueStatus,
  TransactionRecordPointer,
  TransactionResponse,
} from './offline';

// Real-Time
export {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig,
} from './realtime';
export { SubscriptionCache, type SubscriptionCacheOptions } from './realtime';

// Real-Time Hooks
export {
  useRecord,
  useRecords,
  useWrite,
  useUndoRedo,
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
} from './realtime';

// Engine-level RealtimeProvider
export {
  EngineRealtimeProvider,
  useEngineRealtime,
  type EngineRealtimeContextValue,
  type EngineRealtimeProviderConfig,
  type EngineRealtimeProviderProps,
  type EngineUndoableWrite,
  type EngineWriteOperation,
} from './realtime';

// Persistent Storage
export {
  createRecordMap,
  createRecordStorage,
  iterateRecordMap,
  RecordStorage,
  RecordStorageError,
} from './storage';
export type {
  RecordMap,
  RecordStorageErrorType,
  RecordStorageEvent,
  RecordStorageListener,
  RecordStorageOptions,
  RecordWithTable,
} from './storage';
export { clear, createStore, del, get, keys, set, type IDBStore } from './storage';
export { idbStorage, localStorageQueue, type StorageAdapter } from './storage';
export {
  clearQueryCache,
  createPersistedClientFromQueryCache,
  createQueryPersister,
  restorePersistedQueryCache,
  type PersistedClient,
  type PersistedClientState,
  type PersistedQuery,
  type Persister,
  type QueryPersisterOptions,
} from './storage';
export {
  createMutationQueue,
  MutationQueue,
  type MutationQueueOptions,
  type QueuedMutation,
  type QueueStatus,
} from './storage';

// Undo/Redo
export { createUndoRedoStack, UndoRedoStack } from './undo';
export type {
  OperationGroup,
  UndoableOperation,
  UndoRedoStackOptions,
  UndoRedoState,
} from './undo';

// Query Cache
export { hashQueryKey, QueryCache, queryKeysEqual } from './query';
export type {
  FetchStatus,
  QueryCacheOptions,
  QueryKey,
  QueryState,
  QueryStatus,
  SetQueryDataOptions,
} from './query';

// Query Keys
export { queryKeys } from './queryKeys';
export type { PostListFilters, QueryKeys, UserListFilters } from './queryKeys';

// Search (client-specific)
export { ClientSearchQueryBuilder, createClientSearchQuery, fromClientSearchQuery } from './search';

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
  type Density,
} from './theme';

// UI / Keyboard
export {
  formatKeyBinding,
  isEditableElement,
  isMac,
  matchesAnyBinding,
  matchesKeyBinding,
  matchesModifiers,
  parseKeyBinding,
  type KeyModifiers,
  type ParsedKeyBinding,
} from './ui';

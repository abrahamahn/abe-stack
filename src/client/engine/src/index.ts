// src/client/engine/src/index.ts

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
  SetRecordOptions,
  TableMap,
} from './cache/RecordCache';

// Shared types (used alongside engine's realtime features)
export type { RecordPointer, VersionedRecord } from '@abe-stack/shared';

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
export {
  WebsocketPubsubClient,
  type ClientPubsubMessage,
  type ConnectionState,
  type ConnectionStateListener,
  type ServerPubsubMessage,
  type WebsocketPubsubClientConfig,
} from './realtime/WebsocketPubsubClient';

export { SubscriptionCache, type SubscriptionCacheOptions } from './realtime/SubscriptionCache';

export {
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
export { createUndoRedoStack, UndoRedoStack } from './undo/UndoRedoStack';
export type {
  OperationGroup,
  UndoableOperation,
  UndoRedoStackOptions,
  UndoRedoState,
} from './undo/UndoRedoStack';

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

// Search (client-specific)
export {
  ClientSearchQueryBuilder,
  createClientSearchQuery,
  fromClientSearchQuery,
} from './search/query-builder';

export {
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

// packages/sdk/src/storage/index.ts
/**
 * Storage Module - Persistent Storage Utilities
 *
 * Provides persistent storage solutions for the SDK:
 *
 * RecordStorage:
 * - Persistent IndexedDB storage for versioned records
 * - Version-based optimistic concurrency
 * - Async CRUD operations with serialization
 * - Can be used to hydrate RecordCache on app load
 *
 * IDB (IndexedDB Wrapper):
 * - Minimal IndexedDB key-value wrapper
 * - Used internally by other storage modules
 *
 * Query Persister:
 * - TanStack Query persistence to IndexedDB
 * - Automatic cache restoration on app load
 *
 * Mutation Queue:
 * - Offline mutation handling
 * - Automatic retry with exponential backoff
 * - Online/offline event handling
 */

// RecordStorage
export {
  RecordStorage,
  RecordStorageError,
  createRecordStorage,
  iterateRecordMap,
  createRecordMap,
} from './RecordStorage';

export type {
  VersionedRecord,
  RecordPointer,
  RecordWithTable,
  RecordMap,
  RecordStorageOptions,
  RecordStorageEvent,
  RecordStorageListener,
  RecordStorageErrorType,
} from './RecordStorage';

// IDB (IndexedDB Wrapper)
export { createStore, get, set, del, clear, keys } from './idb';

export type { IDBStore } from './idb';

// Storage Adapters
export { idbStorage, localStorageQueue } from './storage';

export type { StorageAdapter } from './storage';

// Query Persister
export { createQueryPersister, clearQueryCache } from './queryPersister';

export type { QueryPersisterOptions } from './queryPersister';

// Mutation Queue
export { MutationQueue, createMutationQueue } from './mutationQueue';

export type { QueuedMutation, MutationQueueOptions, QueueStatus } from './mutationQueue';

// packages/sdk/src/persistence/index.ts
/**
 * Offline-First Persistence Layer
 *
 * Provides:
 * - IndexedDB storage for query cache persistence
 * - MutationQueue for offline mutation handling
 */

// Storage
export { idbStorage, localStorageQueue, type StorageAdapter } from './storage';

// Query Persister
export {
  createQueryPersister,
  clearQueryCache,
  type QueryPersisterOptions,
} from './queryPersister';

// Mutation Queue
export {
  MutationQueue,
  createMutationQueue,
  type QueuedMutation,
  type MutationQueueOptions,
  type QueueStatus,
} from './mutationQueue';

// src/client/engine/src/cache/index.ts

/**
 * Cache Module - In-Memory Caching Utilities
 *
 * Provides in-memory caching utilities for the SDK:
 *
 * LoaderCache:
 * - Request deduplication (concurrent requests share the same promise)
 * - TTL-based expiration
 * - Cache invalidation utilities
 *
 * RecordCache:
 * - Type-safe in-memory record storage by table and ID
 * - Version-based conflict resolution
 * - Optimistic updates with rollback support
 * - Change listeners for reactivity
 *
 * For persistent storage (IndexedDB), see the storage/ module.
 */

export {
  Loader,
  LoaderCache,
  loadWithCache,
  type LoaderState,
  type LoaderOptions,
  type LoaderCacheOptions,
} from './LoaderCache';

export {
  RecordCache,
  type RecordPointer,
  type RecordChange,
  type RecordChangeListener,
  type SetRecordOptions,
  type RecordCacheOptions,
  type CacheStats,
  type IdentifiableRecord,
  type TableMap,
} from './RecordCache';

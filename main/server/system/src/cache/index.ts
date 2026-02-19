// main/server/system/src/cache/index.ts
/**
 * @bslt/server-system
 *
 * Cache layer with LRU and memory provider.
 *
 * Key features:
 * - O(1) LRU cache operations
 * - Tag-based cache invalidation
 * - Optional memory tracking
 *
 * For memoization, import `memoize` from `@bslt/shared` directly.
 *
 * @example
 * ```ts
 * import { createMemoryCache } from '@bslt/server-system';
 *
 * const cache = createMemoryCache({ maxSize: 1000 });
 * ```
 */

// ============================================================================
// Core LRU Cache (backend-specific doubly-linked-list implementation)
// ============================================================================

export { LRUCache } from './lru';
export type { EvictionCallback, EvictionReason, LRUCacheOptions } from './lru';

// ============================================================================
// Providers
// ============================================================================

export { createRedisProvider, MemoryCacheProvider, RedisCacheProvider } from './providers';

// ============================================================================
// Factory
// ============================================================================

export { createCache, createCacheFromEnv, createMemoryCache, createRedisCache } from './factory';

// ============================================================================
// Errors (canonical in @bslt/shared)
// ============================================================================

import {
  CacheCapacityError,
  CacheConnectionError,
  CacheDeserializationError,
  CacheError,
  CacheInvalidKeyError,
  CacheMemoryLimitError,
  CacheNotInitializedError,
  CacheProviderNotFoundError,
  CacheSerializationError,
  CacheTimeoutError,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  toCacheError,
} from '@bslt/shared/system';

export {
  CacheCapacityError,
  CacheConnectionError,
  CacheDeserializationError,
  CacheError,
  CacheInvalidKeyError,
  CacheMemoryLimitError,
  CacheNotInitializedError,
  CacheProviderNotFoundError,
  CacheSerializationError,
  CacheTimeoutError,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  toCacheError,
};

// ============================================================================
// Configuration
// ============================================================================

export { DEFAULT_CACHE_CONFIG, loadCacheConfig } from './config';

// ============================================================================
// Types
// ============================================================================

export type {
  BaseCacheConfig,
  CacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
  RedisCacheConfig,
} from './types';

// Cache-specific types
export type {
  CacheEvictionReason,
  CacheLogger,
  CacheOperationResult,
  CreateCacheOptions,
  MemoizedFunction,
  MemoizeOptions,
  MemoizeStats,
} from './types';

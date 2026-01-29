// packages/cache/src/index.ts
/**
 * @abe-stack/cache
 *
 * Cache layer with LRU, memoization, and memory provider.
 *
 * Key features:
 * - O(1) LRU cache operations
 * - Function memoization with cache stampede prevention
 * - Tag-based cache invalidation
 * - Optional memory tracking
 *
 * @example
 * ```ts
 * import { createMemoryCache, memoize } from '@abe-stack/cache';
 *
 * // Create a memory cache
 * const cache = createMemoryCache({ maxSize: 1000 });
 *
 * // Memoize a function
 * const fetchUser = memoize(
 *   async (userId: string) => db.users.findById(userId),
 *   { ttl: 60000, maxSize: 100 }
 * );
 * ```
 */

// ============================================================================
// Core LRU Cache
// ============================================================================

export { LRUCache } from './lru';
export type { EvictionCallback, EvictionReason, LRUCacheOptions } from './lru';

// ============================================================================
// Memoization
// ============================================================================

export { createArgIndexKeyGenerator, createObjectKeyGenerator, memoize, memoizeMethod } from './memoize';

// ============================================================================
// Providers
// ============================================================================

export { MemoryCacheProvider } from './providers';

// ============================================================================
// Factory
// ============================================================================

export { createCache, createCacheFromEnv, createMemoryCache } from './factory';

// ============================================================================
// Types
// ============================================================================

// Re-export core types
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

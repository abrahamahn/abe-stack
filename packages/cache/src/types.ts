// packages/cache/src/types.ts
/**
 * Cache Package Types
 *
 * Re-exports core cache types and defines cache-specific types
 * for the implementation layer.
 */

// ============================================================================
// Re-export Core Types
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
} from '@abe-stack/core';

// ============================================================================
// Eviction Types (from lru.ts)
// ============================================================================

// Re-export eviction types from lru module
export type { EvictionCallback, EvictionReason, LRUCacheOptions } from './lru';

// ============================================================================
// Cache-Specific Types
// ============================================================================

/**
 * Minimal logger interface for cache operations.
 * Compatible with most logging libraries.
 */
export interface CacheLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

/**
 * Options for creating a cache provider.
 */
export interface CreateCacheOptions {
  /** Logger instance for cache operations */
  logger?: CacheLogger;
  /** Callback when cache entries are evicted */
  onEviction?: (key: string, reason: CacheEvictionReason) => void;
}

/**
 * Eviction reason for cache provider (includes memory_limit).
 */
export type CacheEvictionReason = 'expired' | 'lru' | 'manual' | 'memory_limit' | 'clear';

/**
 * Result of a cache operation with timing info.
 */
export interface CacheOperationResult<T> {
  /** The result value */
  value: T;
  /** Operation duration in milliseconds */
  durationMs: number;
  /** Whether the value was from cache */
  fromCache: boolean;
}

// ============================================================================
// Memoization Types
// ============================================================================

/**
 * Options for memoized function.
 */
export interface MemoizeOptions {
  /** Cache key generator (default: JSON.stringify of args) */
  keyGenerator?: (...args: unknown[]) => string;
  /** TTL in milliseconds */
  ttl?: number;
  /** Tags for cache invalidation */
  tags?: string[];
  /** Maximum number of cached results (default: 1000) */
  maxSize?: number;
  /** Whether to refresh on access (sliding expiration) */
  slidingExpiration?: boolean;
}

/**
 * A memoized function with cache control methods.
 */
export interface MemoizedFunction<TArgs extends unknown[], TResult> {
  /** Call the memoized function */
  (...args: TArgs): Promise<TResult>;
  /** Clear all cached results */
  clear(): void;
  /** Invalidate specific cache entry by key */
  invalidate(...args: TArgs): void;
  /** Get cache statistics */
  getStats(): MemoizeStats;
}

/**
 * Statistics for a memoized function.
 */
export interface MemoizeStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Current number of cached entries */
  size: number;
  /** Hit rate percentage */
  hitRate: number;
}

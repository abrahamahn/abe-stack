// apps/server/src/infrastructure/cache/types.ts
/**
 * Server Cache Types
 *
 * Server-specific cache types extending core cache types.
 */

// Re-export core cache types
export type {
  BaseCacheConfig,
  CacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheProviderType,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
  RedisCacheConfig,
} from '@abe-stack/core';

// ============================================================================
// Server-Specific Types
// ============================================================================

/**
 * Internal structure for LRU cache nodes.
 */
export interface LRUNode<T> {
  key: string;
  value: T;
  prev: LRUNode<T> | null;
  next: LRUNode<T> | null;
  expiresAt?: number;
  tags?: string[];
  size?: number;
}

/**
 * Options for creating a cache provider.
 */
export interface CreateCacheOptions {
  /** Logger instance for cache operations */
  logger?: CacheLogger;
  /** Callback when cache is full and needs eviction */
  onEviction?: (key: string, reason: EvictionReason) => void;
}

/**
 * Reason for cache eviction.
 */
export type EvictionReason = 'expired' | 'lru' | 'manual' | 'memory_limit' | 'clear';

/**
 * Minimal logger interface for cache operations.
 */
export interface CacheLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

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

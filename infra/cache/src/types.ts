// infra/cache/src/types.ts
/**
 * Cache Package Types
 *
 * Core type definitions for the cache system including provider interface,
 * cache options, entry metadata, statistics, and implementation-layer types.
 */

// ============================================================================
// Cache Entry Types
// ============================================================================

/**
 * Metadata stored with each cache entry.
 */
export interface CacheEntryMetadata {
  /** When the entry was created (Unix timestamp in ms) */
  createdAt: number;
  /** When the entry was last accessed (Unix timestamp in ms) */
  lastAccessedAt: number;
  /** Number of times the entry has been accessed */
  accessCount: number;
  /** When the entry expires (Unix timestamp in ms), undefined if no TTL */
  expiresAt?: number;
  /** Size of the cached value in bytes (if tracked) */
  size?: number;
  /** Custom tags for cache invalidation */
  tags?: string[];
}

/**
 * A cache entry with its value and metadata.
 */
export interface CacheEntry<T> {
  /** The cached value */
  value: T;
  /** Entry metadata */
  metadata: CacheEntryMetadata;
}

// ============================================================================
// Cache Options
// ============================================================================

/**
 * Options for cache get operations.
 */
export interface CacheGetOptions {
  /** Update the last accessed timestamp (default: true) */
  updateAccessTime?: boolean;
}

/**
 * Options for cache set operations.
 */
export interface CacheSetOptions {
  /** Time-to-live in milliseconds */
  ttl?: number;
  /** Tags for cache invalidation */
  tags?: string[];
  /** Whether to update TTL if key exists (default: false) */
  updateTtlOnExisting?: boolean;
}

/**
 * Options for cache delete operations.
 */
export interface CacheDeleteOptions {
  /** Delete by tag instead of key */
  byTag?: boolean;
}

// ============================================================================
// Cache Statistics
// ============================================================================

/**
 * Statistics for cache performance monitoring.
 */
export interface CacheStats {
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Hit rate as a percentage (0-100) */
  hitRate: number;
  /** Number of entries currently in cache */
  size: number;
  /** Total number of set operations */
  sets: number;
  /** Total number of delete operations */
  deletes: number;
  /** Number of evictions (due to LRU, TTL, or size limits) */
  evictions: number;
  /** Total memory usage in bytes (if tracked) */
  memoryUsage?: number;
  /** Maximum entries allowed (if configured) */
  maxSize?: number;
}

// ============================================================================
// Cache Provider Interface
// ============================================================================

/**
 * Abstract cache provider interface.
 * Implementations must support basic CRUD operations,
 * bulk operations, and statistics.
 */
export interface CacheProvider {
  /** Provider name for identification */
  readonly name: string;

  // --------------------------------------------------------------------------
  // Single Key Operations
  // --------------------------------------------------------------------------

  /**
   * Get a value from the cache.
   * @param key - Cache key
   * @param options - Get options
   * @returns The cached value or undefined if not found/expired
   */
  get<T>(key: string, options?: CacheGetOptions): Promise<T | undefined>;

  /**
   * Set a value in the cache.
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Set options (TTL, tags)
   */
  set(key: string, value: unknown, options?: CacheSetOptions): Promise<void>;

  /**
   * Check if a key exists in the cache.
   * @param key - Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete a key from the cache.
   * @param key - Cache key or tag (if byTag option is true)
   * @param options - Delete options
   * @returns True if key was deleted
   */
  delete(key: string, options?: CacheDeleteOptions): Promise<boolean>;

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Get multiple values from the cache.
   * @param keys - Array of cache keys
   * @param options - Get options
   * @returns Map of key to value (missing keys are omitted)
   */
  getMultiple<T>(keys: string[], options?: CacheGetOptions): Promise<Map<string, T>>;

  /**
   * Set multiple values in the cache.
   * @param entries - Map of key to value
   * @param options - Set options (applied to all entries)
   */
  setMultiple<T>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete multiple keys from the cache.
   * @param keys - Array of cache keys
   * @returns Number of keys deleted
   */
  deleteMultiple(keys: string[]): Promise<number>;

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Clear all entries from the cache.
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics.
   * @returns Current cache statistics
   */
  getStats(): CacheStats;

  /**
   * Reset statistics counters.
   */
  resetStats(): void;

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Check if the cache provider is healthy/connected.
   * @returns True if cache is operational
   */
  healthCheck(): Promise<boolean>;

  /**
   * Gracefully close the cache provider.
   */
  close(): Promise<void>;
}

// ============================================================================
// Cache Configuration Types
// ============================================================================

/**
 * Base configuration for all cache providers.
 */
export interface BaseCacheConfig {
  /** Default TTL in milliseconds (0 = no expiration) */
  defaultTtl?: number;
  /** Maximum number of entries (0 = unlimited) */
  maxSize?: number;
  /** Whether to track memory usage (may have performance impact) */
  trackMemoryUsage?: boolean;
  /** Prefix for all cache keys */
  keyPrefix?: string;
}

/**
 * Configuration for memory cache provider.
 */
export interface MemoryCacheConfig extends BaseCacheConfig {
  provider: 'memory';
  /** Interval in ms to check for expired entries (default: 60000) */
  cleanupInterval?: number;
  /** Maximum memory in bytes (0 = unlimited) */
  maxMemoryBytes?: number;
}

/**
 * Cache configuration type (memory provider only).
 */
export type CacheConfig = MemoryCacheConfig;

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

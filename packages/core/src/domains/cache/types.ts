// packages/core/src/domains/cache/types.ts
/**
 * Cache Layer Core Types
 *
 * Type definitions for the cache system including provider interface,
 * cache options, entry metadata, and statistics.
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
   * @param key Cache key
   * @param options Get options
   * @returns The cached value or undefined if not found/expired
   */
  get<T>(key: string, options?: CacheGetOptions): Promise<T | undefined>;

  /**
   * Set a value in the cache.
   * @param key Cache key
   * @param value Value to cache
   * @param options Set options (TTL, tags)
   */
  set(key: string, value: unknown, options?: CacheSetOptions): Promise<void>;

  /**
   * Check if a key exists in the cache.
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete a key from the cache.
   * @param key Cache key or tag (if byTag option is true)
   * @param options Delete options
   * @returns True if key was deleted
   */
  delete(key: string, options?: CacheDeleteOptions): Promise<boolean>;

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Get multiple values from the cache.
   * @param keys Array of cache keys
   * @param options Get options
   * @returns Map of key to value (missing keys are omitted)
   */
  getMultiple<T>(keys: string[], options?: CacheGetOptions): Promise<Map<string, T>>;

  /**
   * Set multiple values in the cache.
   * @param entries Map of key to value
   * @param options Set options (applied to all entries)
   */
  setMultiple<T>(entries: Map<string, T>, options?: CacheSetOptions): Promise<void>;

  /**
   * Delete multiple keys from the cache.
   * @param keys Array of cache keys
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
 * Configuration for Redis cache provider.
 */
export interface RedisCacheConfig extends BaseCacheConfig {
  provider: 'redis';
  /** Redis connection URL */
  url: string;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in ms (default: 5000) */
  commandTimeout?: number;
  /** Enable TLS */
  tls?: boolean;
  /** Database index (default: 0) */
  db?: number;
  /** Connection pool size (default: 10) */
  poolSize?: number;
  /** Retry strategy configuration */
  retryStrategy?: {
    /** Maximum number of retries */
    maxRetries: number;
    /** Initial delay between retries in ms */
    initialDelayMs: number;
    /** Maximum delay between retries in ms */
    maxDelayMs: number;
  };
}

/**
 * Union type for all cache configurations.
 */
export type CacheConfig = MemoryCacheConfig | RedisCacheConfig;

/**
 * Cache provider type identifier.
 */
export type CacheProviderType = CacheConfig['provider'];

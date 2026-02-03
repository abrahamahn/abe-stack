// infra/src/cache/providers/memory.ts
/**
 * Memory Cache Provider
 *
 * In-memory LRU cache implementation with TTL support.
 * Uses LRUCache internally for O(1) LRU operations.
 *
 * Key features:
 * - O(1) get, set, delete operations
 * - TTL support with lazy expiration
 * - Tag-based invalidation
 * - Optional memory tracking
 * - Periodic cleanup of expired entries
 */

import { LRUCache } from '../lru';

import type {
  CacheDeleteOptions,
  CacheEvictionReason,
  CacheGetOptions,
  CacheLogger,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  CreateCacheOptions,
  MemoryCacheConfig,
} from '../types';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Internal structure for cached entries.
 * Extends the value with metadata needed for tags and memory tracking.
 */
interface CacheNode {
  value: unknown;
  tags?: string[];
  size?: number;
}

// ============================================================================
// Memory Cache Provider Implementation
// ============================================================================

/**
 * In-memory cache provider implementing CacheProvider interface.
 *
 * Uses LRUCache internally for O(1) LRU operations, with additional
 * features: tag-based invalidation, memory tracking, and periodic cleanup.
 *
 * @example
 * ```ts
 * const cache = new MemoryCacheProvider({
 *   provider: 'memory',
 *   maxSize: 1000,
 *   defaultTtl: 60000,
 * });
 *
 * await cache.set('user:1', user, { tags: ['users'] });
 * const user = await cache.get<User>('user:1');
 * await cache.delete('users', { byTag: true }); // Delete all users
 * ```
 */
export class MemoryCacheProvider implements CacheProvider {
  readonly name = 'memory';

  private readonly cache: LRUCache<string, CacheNode>;
  private readonly tagIndex = new Map<string, Set<string>>();
  private cleanupTimer: NodeJS.Timeout | null = null;
  private currentMemoryBytes = 0;

  // Stats
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
    memoryUsage: 0,
  };

  private readonly config: Required<
    Pick<MemoryCacheConfig, 'defaultTtl' | 'maxSize' | 'cleanupInterval' | 'keyPrefix'>
  > & { maxMemoryBytes: number; trackMemoryUsage: boolean };
  private readonly logger: CacheLogger | undefined;
  private readonly onEviction: ((key: string, reason: CacheEvictionReason) => void) | undefined;

  /**
   * Creates a new memory cache provider.
   *
   * @param config - Cache configuration
   * @param options - Additional options (logger, callbacks)
   */
  constructor(config: MemoryCacheConfig, options: CreateCacheOptions = {}) {
    this.config = {
      defaultTtl: config.defaultTtl ?? 0,
      maxSize: config.maxSize ?? 0,
      cleanupInterval: config.cleanupInterval ?? 60000,
      keyPrefix: config.keyPrefix ?? '',
      maxMemoryBytes: config.maxMemoryBytes ?? 0,
      trackMemoryUsage: config.trackMemoryUsage ?? false,
    };
    this.logger = options.logger;
    this.onEviction = options.onEviction;

    // Create LRU cache with eviction callback to clean up tag index
    const maxSize = this.config.maxSize > 0 ? this.config.maxSize : Number.MAX_SAFE_INTEGER;
    this.cache = new LRUCache<string, CacheNode>({
      maxSize,
      // We handle TTL ourselves for more control
      onEvict: (fullKey, node, reason): void => {
        // Map LRU eviction reason to cache eviction reason
        const cacheReason: CacheEvictionReason =
          reason === 'lru' ? 'lru' : reason === 'clear' ? 'clear' : 'expired';
        this.handleEviction(fullKey, node, cacheReason);
      },
    });

    // Start cleanup timer for expired entries
    if (this.config.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup();
      }, this.config.cleanupInterval);

      // Unref to allow process to exit
      this.cleanupTimer.unref();
    }

    this.logger?.debug('Memory cache provider initialized', {
      maxSize: this.config.maxSize,
      defaultTtl: this.config.defaultTtl,
      cleanupInterval: this.config.cleanupInterval,
    });
  }

  // --------------------------------------------------------------------------
  // Single Key Operations
  // --------------------------------------------------------------------------

  /**
   * Get a value from the cache.
   *
   * @param key - Cache key
   * @param options - Get options
   * @returns The cached value or undefined if not found/expired
   * @complexity O(1)
   */
  get<T>(key: string, _options: CacheGetOptions = {}): Promise<T | undefined> {
    const fullKey = this.getFullKey(key);
    const node = this.cache.get(fullKey);

    if (node == null) {
      this.stats.misses++;
      this.updateHitRate();
      return Promise.resolve(undefined);
    }

    this.stats.hits++;
    this.updateHitRate();
    return Promise.resolve(node.value as T);
  }

  /**
   * Set a value in the cache.
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Set options (TTL, tags)
   * @complexity O(1)
   */
  set(key: string, value: unknown, options: CacheSetOptions = {}): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options.ttl ?? this.config.defaultTtl;
    const tags = options.tags ?? [];

    // Calculate size if tracking memory
    const size = this.config.trackMemoryUsage ? this.estimateSize(value) : undefined;

    // Check memory limit - skip if entry is too large
    if (this.config.maxMemoryBytes > 0 && size != null && size > 0) {
      if (size > this.config.maxMemoryBytes) {
        this.logger?.warn('Cache entry too large to fit in memory limit', {
          entrySize: size,
          maxMemoryBytes: this.config.maxMemoryBytes,
        });
        return Promise.resolve();
      }

      // Evict until we have room
      while (this.currentMemoryBytes + size > this.config.maxMemoryBytes && this.cache.size > 0) {
        // Force eviction by reducing perceived capacity temporarily
        const entries = this.cache.entries();
        if (entries.length > 0) {
          const [oldestKey] = entries[entries.length - 1] ?? [];
          if (oldestKey != null) {
            this.deleteInternal(oldestKey, 'memory_limit');
          }
        }
      }
    }

    // Check if key exists for tag index update
    const existingNode = this.cache.get(fullKey);
    if (existingNode != null) {
      // Update memory tracking
      if (this.config.trackMemoryUsage && existingNode.size != null && existingNode.size > 0) {
        this.currentMemoryBytes -= existingNode.size;
      }
      // Update tag index (remove old tags)
      this.updateTagIndex(fullKey, existingNode.tags, tags);
    } else {
      // Add new tags
      this.updateTagIndex(fullKey, [], tags);
    }

    // Create cache node - conditionally include optional properties
    const node: CacheNode = { value };
    if (tags.length > 0) {
      node.tags = tags;
    }
    if (size !== undefined) {
      node.size = size;
    }

    // Set in LRU cache with TTL
    this.cache.set(fullKey, node, ttl > 0 ? ttl : undefined);

    // Update memory tracking
    if (size != null && size > 0) {
      this.currentMemoryBytes += size;
    }

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;
    return Promise.resolve();
  }

  /**
   * Check if a key exists in the cache.
   *
   * @param key - Cache key
   * @returns True if key exists and is not expired
   * @complexity O(1)
   */
  has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return Promise.resolve(this.cache.has(fullKey));
  }

  /**
   * Delete a key from the cache.
   *
   * @param key - Cache key or tag (if byTag option is true)
   * @param options - Delete options
   * @returns True if key was deleted
   * @complexity O(1) for key, O(n) for tag
   */
  delete(key: string, options: CacheDeleteOptions = {}): Promise<boolean> {
    if (options.byTag === true) {
      return Promise.resolve(this.deleteByTag(key));
    }

    const fullKey = this.getFullKey(key);
    return Promise.resolve(this.deleteInternal(fullKey, 'manual'));
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Get multiple values from the cache.
   *
   * @param keys - Array of cache keys
   * @param options - Get options
   * @returns Map of key to value (missing keys are omitted)
   * @complexity O(n) where n is the number of keys
   */
  async getMultiple<T>(keys: string[], options: CacheGetOptions = {}): Promise<Map<string, T>> {
    const result = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get<T>(key, options);
      if (value !== undefined) {
        result.set(key, value);
      }
    }

    return result;
  }

  /**
   * Set multiple values in the cache.
   *
   * @param entries - Map of key to value
   * @param options - Set options (applied to all entries)
   * @complexity O(n) where n is the number of entries
   */
  async setMultiple<T>(entries: Map<string, T>, options: CacheSetOptions = {}): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

  /**
   * Delete multiple keys from the cache.
   *
   * @param keys - Array of cache keys
   * @returns Number of keys deleted
   * @complexity O(n) where n is the number of keys
   */
  async deleteMultiple(keys: string[]): Promise<number> {
    let deleted = 0;

    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }

    return deleted;
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  /**
   * Clear all entries from the cache.
   *
   * @complexity O(n) for eviction callbacks
   */
  clear(): Promise<void> {
    // LRU cache's clear() will call onEvict for each entry,
    // which triggers handleEviction -> onEviction callback
    this.cache.clear();
    this.tagIndex.clear();
    this.currentMemoryBytes = 0;

    this.stats.size = 0;
    this.stats.memoryUsage = 0;

    this.logger?.info('Cache cleared');
    return Promise.resolve();
  }

  /**
   * Get cache statistics.
   *
   * @returns Current cache statistics
   */
  getStats(): CacheStats {
    const stats: CacheStats = {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.currentMemoryBytes,
    };
    if (this.config.maxSize > 0) {
      stats.maxSize = this.config.maxSize;
    }
    return stats;
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: this.cache.size,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: this.currentMemoryBytes,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Check if the cache provider is healthy.
   *
   * @returns True (memory cache is always healthy if instantiated)
   */
  healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /**
   * Gracefully close the cache provider.
   */
  close(): Promise<void> {
    if (this.cleanupTimer != null) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    this.tagIndex.clear();
    this.currentMemoryBytes = 0;

    this.logger?.info('Memory cache provider closed');
    return Promise.resolve();
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Handle eviction from LRU cache.
   * @internal
   */
  private handleEviction(fullKey: string, node: CacheNode, reason: CacheEvictionReason): void {
    // Clean up tag index
    if (node.tags != null && node.tags.length > 0) {
      for (const tag of node.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys != null) {
          keys.delete(fullKey);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    // Update memory tracking
    if (this.config.trackMemoryUsage && node.size != null && node.size > 0) {
      this.currentMemoryBytes -= node.size;
    }

    // Update stats
    this.stats.evictions++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;

    // Call external callback
    const key = this.stripPrefix(fullKey);
    this.onEviction?.(key, reason);
  }

  /**
   * Delete a key internally with reason tracking.
   * @internal
   */
  private deleteInternal(fullKey: string, reason: CacheEvictionReason): boolean {
    const node = this.cache.get(fullKey);
    if (node == null) {
      return false;
    }

    // Clean up tag index
    if (node.tags != null && node.tags.length > 0) {
      for (const tag of node.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys != null) {
          keys.delete(fullKey);
          if (keys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    // Update memory tracking
    if (this.config.trackMemoryUsage && node.size != null && node.size > 0) {
      this.currentMemoryBytes -= node.size;
    }

    // Delete from cache (don't trigger LRU eviction callback)
    this.cache.delete(fullKey, 'manual');

    // Update stats
    this.stats.deletes++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;

    // Call external callback
    const key = this.stripPrefix(fullKey);
    this.onEviction?.(key, reason);

    return true;
  }

  /**
   * Delete all entries with a specific tag.
   * @internal
   */
  private deleteByTag(tag: string): boolean {
    const keys = this.tagIndex.get(tag);
    if (keys == null || keys.size === 0) {
      return false;
    }

    let deleted = false;
    // Copy keys to array since we'll modify tagIndex during iteration
    const keysToDelete = Array.from(keys);

    for (const fullKey of keysToDelete) {
      if (this.deleteInternal(fullKey, 'manual')) {
        deleted = true;
      }
    }

    return deleted;
  }

  /**
   * Get the full key with prefix.
   * @internal
   */
  private getFullKey(key: string): string {
    return this.config.keyPrefix !== '' ? `${this.config.keyPrefix}:${key}` : key;
  }

  /**
   * Strip the prefix from a full key.
   * @internal
   */
  private stripPrefix(fullKey: string): string {
    if (this.config.keyPrefix !== '' && fullKey.startsWith(`${this.config.keyPrefix}:`)) {
      return fullKey.slice(this.config.keyPrefix.length + 1);
    }
    return fullKey;
  }

  /**
   * Update the hit rate statistic.
   * @internal
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Update tag index when tags change.
   * @internal
   */
  private updateTagIndex(key: string, oldTags: string[] = [], newTags: string[] = []): void {
    // Remove from old tags
    for (const tag of oldTags) {
      const keys = this.tagIndex.get(tag);
      if (keys != null) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Add to new tags
    for (const tag of newTags) {
      let keys = this.tagIndex.get(tag);
      if (keys == null) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  /**
   * Periodic cleanup of expired entries.
   * Note: LRUCache handles lazy expiration, but this ensures memory is freed.
   * @internal
   */
  private cleanup(): void {
    // Force a full iteration to trigger lazy expiration in LRUCache
    let cleaned = 0;
    const entries = this.cache.entries();
    const beforeSize = this.cache.size;

    // entries() already cleans up expired entries
    const afterSize = entries.length;
    cleaned = beforeSize - afterSize;

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      this.stats.memoryUsage = this.currentMemoryBytes;
      this.logger?.debug('Cache cleanup completed', { cleaned });
    }
  }

  /**
   * Estimate the size of a value in bytes.
   * @internal
   */
  private estimateSize(value: unknown): number {
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16 characters are 2 bytes each
    } catch {
      return 0;
    }
  }
}

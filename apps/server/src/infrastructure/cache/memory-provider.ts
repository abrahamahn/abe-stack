// apps/server/src/infrastructure/cache/memory-provider.ts
/**
 * Memory Cache Provider
 *
 * In-memory LRU cache implementation with TTL support.
 * Uses a doubly-linked list for O(1) LRU operations.
 */

import type {
    CacheDeleteOptions,
    CacheGetOptions,
    CacheProvider,
    CacheSetOptions,
    CacheStats,
    MemoryCacheConfig,
} from '@abe-stack/core';
import type { CacheLogger, CreateCacheOptions, EvictionReason, LRUNode } from './types';

// ============================================================================
// Memory Cache Provider Implementation
// ============================================================================

export class MemoryCacheProvider implements CacheProvider {
  readonly name = 'memory';

  private cache: Map<string, LRUNode<unknown>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private head: LRUNode<unknown> | null = null;
  private tail: LRUNode<unknown> | null = null;
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
  private readonly logger?: CacheLogger;
  private readonly onEviction?: (key: string, reason: EvictionReason) => void;

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

  get<T>(key: string, options: CacheGetOptions = {}): Promise<T | undefined> {
    const fullKey = this.getFullKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      this.stats.misses++;
      this.updateHitRate();
      return Promise.resolve(undefined);
    }

    // Check if expired
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.removeNode(node);
      this.cache.delete(fullKey);
      this.updateTagIndex(fullKey, node.tags, []);
      this.onEviction?.(key, 'expired');
      this.stats.misses++;
      this.stats.evictions++;
      this.updateHitRate();
      return Promise.resolve(undefined);
    }

    // Update access (move to head) unless disabled
    if (options.updateAccessTime !== false) {
      this.moveToHead(node);
    }

    this.stats.hits++;
    this.updateHitRate();
    return Promise.resolve(node.value as T);
  }

  set(key: string, value: unknown, options: CacheSetOptions = {}): Promise<void> {
    const fullKey = this.getFullKey(key);
    const ttl = options.ttl ?? this.config.defaultTtl;
    const expiresAt = ttl > 0 ? Date.now() + ttl : undefined;
    const tags = options.tags ?? [];

    // Calculate size if tracking memory
    const size = this.config.trackMemoryUsage ? this.estimateSize(value) : undefined;

    // Check if key already exists
    const existingNode = this.cache.get(fullKey);
    if (existingNode) {
      // Update existing node
      if (this.config.trackMemoryUsage && existingNode.size) {
        this.currentMemoryBytes -= existingNode.size;
      }
      // Save old tags before overwriting
      const oldTags = existingNode.tags;
      existingNode.value = value;
      existingNode.expiresAt = options.updateTtlOnExisting ? expiresAt : existingNode.expiresAt;
      existingNode.tags = tags;
      existingNode.size = size;
      if (size) {
        this.currentMemoryBytes += size;
      }
      this.moveToHead(existingNode);
      this.updateTagIndex(fullKey, oldTags, tags);
    } else {
      // Evict if at capacity - skip caching if entry is too large
      const hasRoom = this.evictIfNeeded(size);
      if (!hasRoom) {
        // Entry too large to fit, skip caching (graceful degradation)
        return Promise.resolve();
      }

      // Create new node
      const node: LRUNode<unknown> = {
        key: fullKey,
        value,
        prev: null,
        next: null,
        expiresAt,
        tags,
        size,
      };

      this.cache.set(fullKey, node);
      this.addToHead(node);
      this.updateTagIndex(fullKey, [], tags);

      if (size) {
        this.currentMemoryBytes += size;
      }
    }

    this.stats.sets++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;
    return Promise.resolve();
  }

  has(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      return Promise.resolve(false);
    }

    // Check if expired
    if (node.expiresAt != null && node.expiresAt <= Date.now()) {
      this.removeNode(node);
      this.cache.delete(fullKey);
      this.updateTagIndex(fullKey, node.tags, []);
      this.onEviction?.(key, 'expired');
      this.stats.evictions++;
      return Promise.resolve(false);
    }

    return Promise.resolve(true);
  }

  delete(key: string, options: CacheDeleteOptions = {}): Promise<boolean> {
    if (options.byTag) {
      return Promise.resolve(this.deleteByTag(key));
    }

    const fullKey = this.getFullKey(key);
    const node = this.cache.get(fullKey);

    if (!node) {
      return Promise.resolve(false);
    }

    this.removeNode(node);
    this.cache.delete(fullKey);
    this.updateTagIndex(fullKey, node.tags, []);

    if (this.config.trackMemoryUsage && node.size) {
      this.currentMemoryBytes -= node.size;
    }

    this.stats.deletes++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;
    return Promise.resolve(true);
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

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

  async setMultiple<T>(entries: Map<string, T>, options: CacheSetOptions = {}): Promise<void> {
    for (const [key, value] of entries) {
      await this.set(key, value, options);
    }
  }

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

  clear(): Promise<void> {
    // Notify eviction for all keys
    if (this.onEviction) {
      for (const [fullKey] of this.cache) {
        const key = this.stripPrefix(fullKey);
        this.onEviction(key, 'clear');
      }
    }

    this.cache.clear();
    this.tagIndex.clear();
    this.head = null;
    this.tail = null;
    this.currentMemoryBytes = 0;

    this.stats.size = 0;
    this.stats.memoryUsage = 0;
    this.stats.evictions += this.stats.size;

    this.logger?.info('Cache cleared');
    return Promise.resolve();
  }

  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.currentMemoryBytes,
      maxSize: this.config.maxSize || undefined,
    };
  }

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

  healthCheck(): Promise<boolean> {
    return Promise.resolve(true); // Memory cache is always healthy if instantiated
  }

  close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    this.cache.clear();
    this.tagIndex.clear();
    this.head = null;
    this.tail = null;
    this.currentMemoryBytes = 0;

    this.logger?.info('Memory cache provider closed');
    return Promise.resolve();
  }

  // --------------------------------------------------------------------------
  // Private Methods: LRU Operations
  // --------------------------------------------------------------------------

  private addToHead(node: LRUNode<unknown>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: LRUNode<unknown>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  private moveToHead(node: LRUNode<unknown>): void {
    if (node === this.head) {
      return;
    }
    this.removeNode(node);
    this.addToHead(node);
  }

  private removeTail(): LRUNode<unknown> | null {
    if (!this.tail) {
      return null;
    }

    const node = this.tail;
    this.removeNode(node);
    return node;
  }

  // --------------------------------------------------------------------------
  // Private Methods: Utilities
  // --------------------------------------------------------------------------

  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private stripPrefix(fullKey: string): string {
    if (this.config.keyPrefix && fullKey.startsWith(`${this.config.keyPrefix}:`)) {
      return fullKey.slice(this.config.keyPrefix.length + 1);
    }
    return fullKey;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateTagIndex(key: string, oldTags: string[] = [], newTags: string[] = []): void {
    // Remove from old tags
    for (const tag of oldTags) {
      const keys = this.tagIndex.get(tag);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }

    // Add to new tags
    for (const tag of newTags) {
      let keys = this.tagIndex.get(tag);
      if (!keys) {
        keys = new Set();
        this.tagIndex.set(tag, keys);
      }
      keys.add(key);
    }
  }

  private deleteByTag(tag: string): boolean {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) {
      return false;
    }

    let deleted = false;
    // Copy keys to array since we'll modify tagIndex during iteration
    const keysToDelete = Array.from(keys);

    for (const fullKey of keysToDelete) {
      const node = this.cache.get(fullKey);
      if (node) {
        this.removeNode(node);
        this.cache.delete(fullKey);
        // Clean up ALL tags that reference this key, not just the requested tag
        this.updateTagIndex(fullKey, node.tags, []);
        if (this.config.trackMemoryUsage && node.size) {
          this.currentMemoryBytes -= node.size;
        }
        this.onEviction?.(this.stripPrefix(fullKey), 'manual');
        deleted = true;
      }
    }

    this.stats.deletes++;
    this.stats.size = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryBytes;

    return deleted;
  }

  /**
   * Evict entries if needed to make room for a new entry.
   * @returns true if there's room for the new entry, false if the entry is too large to ever fit
   */
  private evictIfNeeded(newSize?: number): boolean {
    // Check size limit
    if (this.config.maxSize > 0 && this.cache.size >= this.config.maxSize) {
      const node = this.removeTail();
      if (node) {
        this.cache.delete(node.key);
        this.updateTagIndex(node.key, node.tags, []);
        if (this.config.trackMemoryUsage && node.size) {
          this.currentMemoryBytes -= node.size;
        }
        this.onEviction?.(this.stripPrefix(node.key), 'lru');
        this.stats.evictions++;
      }
    }

    // Check memory limit
    if (this.config.maxMemoryBytes > 0 && newSize) {
      // If the entry is larger than maxMemoryBytes, it can never fit
      if (newSize > this.config.maxMemoryBytes) {
        this.logger?.warn('Cache entry too large to fit in memory limit', {
          entrySize: newSize,
          maxMemoryBytes: this.config.maxMemoryBytes,
        });
        return false;
      }

      // Evict until we have room
      while (this.tail && this.currentMemoryBytes + newSize > this.config.maxMemoryBytes) {
        const node = this.removeTail();
        if (node) {
          this.cache.delete(node.key);
          this.updateTagIndex(node.key, node.tags, []);
          if (node.size) {
            this.currentMemoryBytes -= node.size;
          }
          this.onEviction?.(this.stripPrefix(node.key), 'memory_limit');
          this.stats.evictions++;
        }
      }
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [fullKey, node] of this.cache) {
      if (node.expiresAt != null && node.expiresAt <= now) {
        this.removeNode(node);
        this.cache.delete(fullKey);
        this.updateTagIndex(fullKey, node.tags, []);
        if (this.config.trackMemoryUsage && node.size) {
          this.currentMemoryBytes -= node.size;
        }
        this.onEviction?.(this.stripPrefix(fullKey), 'expired');
        this.stats.evictions++;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size = this.cache.size;
      this.stats.memoryUsage = this.currentMemoryBytes;
      this.logger?.debug('Cache cleanup completed', { cleaned });
    }
  }

  private estimateSize(value: unknown): number {
    // Simple size estimation
    // For more accurate results, consider using a library like `object-sizeof`
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16 characters are 2 bytes each
    } catch {
      return 0;
    }
  }
}

// apps/server/src/services/cache-service.ts
/**
 * Cache Service
 *
 * Provides caching capabilities to improve performance.
 * Uses a simple in-memory cache with TTL for basic caching needs.
 */

import type { Logger } from '@logger';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  maxSize?: number; // Maximum number of items in cache (default: 1000)
}

export interface CacheItem<T> {
  value: T;
  expiry: number; // Unix timestamp in milliseconds
}

export class CacheService {
  private cache: Map<string, CacheItem<unknown>>;
  private readonly ttl: number;
  private readonly maxSize: number;
  private logger?: Logger;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.ttl = options.ttl ?? 5 * 60 * 1000; // 5 minutes default
    this.maxSize = options.maxSize ?? 1000; // 1000 items default
  }

  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  get<T>(key: string, defaultValue?: T): T | null {
    const item = this.cache.get(key);

    if (item === undefined) {
      return defaultValue ?? null;
    }

    // Check if item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.logger?.debug(`Cache miss: ${key} (expired)`);
      return null;
    }

    this.logger?.debug(`Cache hit: ${key}`);
    return item.value as T;
  }

  set(key: string, value: unknown, ttlOverride?: number): void {
    // Clean up expired items periodically when cache grows
    if (this.cache.size >= this.maxSize * 0.9) {
      // Clean when 90% full
      this.cleanupExpired();
    }

    const ttl = ttlOverride ?? this.ttl;
    const expiry = Date.now() + ttl;

    this.cache.set(key, { value, expiry });
    this.logger?.debug(`Cache set: ${key} (ttl: ${String(ttl)}ms)`);
  }

  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    this.logger?.debug(`Cache delete: ${key} (existed: ${String(existed)})`);
    return existed;
  }

  clear(): void {
    this.cache.clear();
    this.logger?.debug('Cache cleared');
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (item === undefined) {
      return false;
    }

    // Check if item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.logger?.debug(`Cache has: ${key} (expired)`);
      return false;
    }

    return true;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger?.debug(`Cleaned ${String(cleaned)} expired items from cache`);
    }
  }

  // Get cache statistics
  stats(): { size: number; hits: number; misses: number } {
    // For a simple in-memory cache, we don't track hits/misses
    // This would be implemented in a more sophisticated cache
    return { size: this.cache.size, hits: 0, misses: 0 };
  }

  /**
   * Cleanup method to clear the cache and free memory
   */
  cleanup(): void {
    this.cache.clear();
    this.logger?.debug('Cache cleared during cleanup');
  }
}

/**
 * Create a cache service with default uration
 */
export function createCacheService(options: CacheOptions = {}): CacheService {
  return new CacheService(options);
}

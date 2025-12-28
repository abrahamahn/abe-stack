import { performance } from "perf_hooks";

import { injectable, inject } from "inversify";

import { ICacheService } from "@/server/infrastructure/cache";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

/**
 * Options for memoization
 */
export interface MemoizeOptions<T = unknown> {
  /**
   * Time to live in seconds, or a function that calculates TTL
   */
  ttl?: number | ((result: T, executionTime: number) => number);

  /**
   * Function to generate cache key from arguments
   */
  keyFn?: (...args: unknown[]) => string;
}

/**
 * Cache entry with value and expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number | null;
}

/**
 * In-memory cache service implementation
 */
@injectable()
export class CacheService implements ICacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    size: 0,
  };
  private cleanupInterval = 10000; // 10 seconds between cleanups
  private cleanupTimer: NodeJS.Timeout | null = null; // Store cleanup timer reference

  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService
  ) {}

  /**
   * Initialize the cache service
   */
  public async initialize(): Promise<void> {
    // Start background cleanup process
    this.startPeriodicCleanup();
    this.logger.info("Cache service initialized");
  }

  /**
   * Shutdown the cache service
   */
  public async shutdown(): Promise<void> {
    // Stop cleanup timer if it exists
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    await this.clear();
    this.logger.info("Cache service shut down");
  }

  /**
   * Start periodic cleanup of expired items
   * This runs in the background instead of checking on each operation
   */
  private startPeriodicCleanup(): void {
    // Clear any existing timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Set up new timer to run cleanExpired periodically
    this.cleanupTimer = setInterval(() => {
      this.cleanExpired();
    }, this.cleanupInterval);
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired - only on access, background cleanup handles most cases
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    // Validate TTL
    if (ttl !== undefined) {
      if (Number.isNaN(ttl) || ttl < 0 || !Number.isFinite(ttl)) {
        throw new Error(
          `Invalid TTL value: ${ttl}. TTL must be a positive finite number.`
        );
      }
    }

    // Validate key - only reject actual null/undefined/empty, not string literals
    if (key === null || key === undefined || key === "") {
      throw new Error(
        "Cache key cannot be null, undefined, or an empty string"
      );
    }

    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;

    this.cache.set(key, {
      value,
      expiresAt,
    });

    // Only update size, don't trigger full cleanup on every set operation
    this.stats.size = this.cache.size;
    return true;
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  public async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    if (result) {
      this.stats.size = this.cache.size;
    }
    return result;
  }

  /**
   * Get multiple values from cache
   * @param keys Array of cache keys
   * @returns Object with key-value pairs
   */
  public async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    if (!Array.isArray(keys)) {
      throw new Error("Keys must be an array");
    }

    const result: Record<string, T> = {};

    // Optimize: batch operation instead of multiple async calls
    for (const key of keys) {
      const entry = this.cache.get(key);

      if (!entry) {
        this.stats.misses++;
        continue;
      }

      // Check if expired
      if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
        this.cache.delete(key);
        this.stats.misses++;
        continue;
      }

      this.stats.hits++;
      result[key] = entry.value as T;
    }

    return result;
  }

  /**
   * Set multiple values in cache
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional)
   */
  public async setMultiple<T>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<boolean> {
    // Validate TTL once for all entries
    if (ttl !== undefined) {
      if (Number.isNaN(ttl) || ttl < 0 || !Number.isFinite(ttl)) {
        throw new Error(
          `Invalid TTL value: ${ttl}. TTL must be a positive finite number.`
        );
      }
    }

    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;

    // Batch operation instead of multiple async calls
    for (const key in entries) {
      if (key === null || key === undefined || key === "") {
        throw new Error(
          "Cache key cannot be null, undefined, or an empty string"
        );
      }

      this.cache.set(key, {
        value: entries[key],
        expiresAt,
      });
    }

    // Update size once after all operations
    this.stats.size = this.cache.size;
    return true;
  }

  /**
   * Delete multiple values from cache
   * @param keys Array of cache keys
   */
  public async deleteMultiple(keys: string[]): Promise<boolean> {
    if (!Array.isArray(keys)) {
      throw new Error("Keys must be an array");
    }

    // Batch delete operation
    for (const key of keys) {
      this.cache.delete(key);
    }

    // Update size once after all deletions
    this.stats.size = this.cache.size;
    return true;
  }

  /**
   * Clear all values from cache
   * Alias for flush() to maintain compatibility with ICacheService
   */
  public async clear(): Promise<boolean> {
    return this.flush();
  }

  /**
   * Clear all values from cache
   */
  public async flush(): Promise<boolean> {
    this.cache.clear();
    this.resetStats();

    // Force garbage collection by removing references to potentially large objects
    // This is not guaranteed to free memory immediately due to how JS GC works,
    // but it should help make memory available for collection
    this.cache = new Map();

    // Log the cleanup
    this.logger.debug("Cache flushed, all entries removed");

    return true;
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   */
  public async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (entry.expiresAt !== null && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all cache keys
   * @returns Array of keys
   */
  public keys(): string[] {
    // Clean expired entries before returning keys
    this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  public size(): number {
    // Check for expired items before returning size
    this.removeExpiredEntries();
    return this.cache.size;
  }

  /**
   * Create a memoized version of a function
   * Results will be cached based on the arguments
   *
   * @param fn Function to memoize
   * @param options Memoization options
   * @returns Memoized function
   */
  public memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: MemoizeOptions<Awaited<ReturnType<T>>> = {}
  ): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      // Generate cache key
      const key = options.keyFn
        ? options.keyFn(...args)
        : `memoize:${JSON.stringify(args)}`;

      // Try to get from cache
      const cached = await this.get<ReturnType<T>>(key);
      if (cached !== null) {
        return cached;
      }

      // Execute the function
      const start = performance.now();
      const result = await fn(...args);
      const executionTime = performance.now() - start;

      // Determine TTL and cache the result
      let ttl: number | undefined;
      if (typeof options.ttl === "function") {
        ttl = options.ttl(result as Awaited<ReturnType<T>>, executionTime);
      } else {
        ttl = options.ttl;
      }

      await this.set(key, result, ttl);
      return result as ReturnType<T>;
    }) as T;
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    let expired = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        this.cache.delete(key);
        expired++;
      }
    }

    if (expired > 0) {
      this.logger.debug(`Removed ${expired} expired cache entries`);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Check and remove expired entries - more lightweight version
   * that doesn't update lastCleanup or log
   */
  private removeExpiredEntries(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== null && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  public getStats(): {
    hits: number;
    misses: number;
    size: number;
    hitRatio: number;
  } {
    this.stats.size = this.cache.size;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.stats.size,
      hitRatio:
        this.stats.hits + this.stats.misses > 0
          ? Math.round(
              (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
            ) / 100
          : 0,
    };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.size = this.cache.size;
  }
}

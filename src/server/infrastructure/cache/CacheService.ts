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

  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService,
  ) {}

  /**
   * Initialize the cache service
   */
  public async initialize(): Promise<void> {
    this.logger.info("Cache service initialized");
  }

  /**
   * Shutdown the cache service
   */
  public async shutdown(): Promise<void> {
    await this.clear();
    this.logger.info("Cache service shut down");
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

    // Check if expired
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
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;

    this.cache.set(key, {
      value,
      expiresAt,
    });

    this.updateSize();
    return true;
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  public async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    if (result) {
      this.updateSize();
    }
    return result;
  }

  /**
   * Get multiple values from cache
   * @param keys Array of cache keys
   * @returns Object with key-value pairs
   */
  public async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    const result: Record<string, T> = {};

    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result[key] = value;
      }
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
    ttl?: number,
  ): Promise<boolean> {
    for (const key in entries) {
      await this.set(key, entries[key], ttl);
    }

    return true;
  }

  /**
   * Delete multiple values from cache
   * @param keys Array of cache keys
   */
  public async deleteMultiple(keys: string[]): Promise<boolean> {
    for (const key of keys) {
      await this.delete(key);
    }

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
    this.updateSize();
    this.resetStats();
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
   */
  public keys(): string[] {
    // Clean expired entries
    this.cleanExpired();

    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  public size(): number {
    // Clean expired entries
    this.cleanExpired();

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
    options: MemoizeOptions<Awaited<ReturnType<T>>> = {},
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
   * Update cache size stat
   */
  private updateSize(): void {
    this.cleanExpired();
    this.stats.size = this.cache.size;
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
    this.updateSize();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.stats.size,
      hitRatio:
        this.stats.hits + this.stats.misses > 0
          ? Math.round(
              (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100,
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
    this.updateSize();
  }
}

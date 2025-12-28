import { performance } from "perf_hooks";

import { injectable, inject } from "inversify";
import { RedisClientType } from "redis";

import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import { ICacheService } from "./ICacheService";
import { getRedisClient, closeRedisConnection } from "./RedisClient";


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
 * Redis-based cache service implementation
 */
@injectable()
export class RedisCacheService implements ICacheService {
  private redisClient: RedisClientType | null = null;
  private stats = {
    hits: 0,
    misses: 0,
    size: 0,
  };
  private initialized = false;
  private keyPrefix = "cache:";

  constructor(
    @inject(TYPES.LoggerService) private readonly logger: ILoggerService
  ) {}

  /**
   * Initialize the Redis cache service
   */
  public async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        this.logger.warn("Redis cache service already initialized");
        return;
      }

      this.redisClient = await getRedisClient();

      // Test connection
      await this.redisClient.ping();

      this.initialized = true;

      // Set initial size
      await this.updateSize();

      this.logger.info("Redis cache service initialized");
    } catch (error: unknown) {
      this.initialized = false;
      this.redisClient = null;
      this.logger.error("Failed to initialize Redis cache service", { error });
      throw new Error(
        `Failed to initialize Redis cache service: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Shutdown the Redis cache service
   */
  public async shutdown(): Promise<void> {
    if (this.initialized) {
      await closeRedisConnection();
      this.initialized = false;
      this.logger.info("Redis cache service shut down");
    }
  }

  /**
   * Get a value from Redis cache
   * @param key Cache key
   * @returns Value or null if not found
   */
  public async get<T>(key: string): Promise<T | null> {
    this.ensureInitialized();

    const prefixedKey = this.getPrefixedKey(key);
    try {
      const data = await this.redisClient!.get(prefixedKey);

      if (!data) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return JSON.parse(data) as T;
    } catch (error) {
      this.logger.error(`Error getting cache key ${key}:`, { error });
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set a value in Redis cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional)
   */
  public async set<T>(key: string, value: T, ttl?: number): Promise<boolean> {
    this.ensureInitialized();

    // Validate key
    if (!key || typeof key !== "string" || key.trim() === "") {
      throw new Error(
        "Cache key cannot be null, undefined, or an empty string"
      );
    }

    // Validate TTL
    if (ttl !== undefined) {
      if (
        typeof ttl !== "number" ||
        Number.isNaN(ttl) ||
        ttl < 0 ||
        !Number.isFinite(ttl)
      ) {
        throw new Error(
          `Invalid TTL value: ${ttl}. TTL must be a positive finite number.`
        );
      }
    }

    const prefixedKey = this.getPrefixedKey(key);
    const serializedValue = JSON.stringify(value);

    try {
      if (ttl) {
        await this.redisClient!.set(prefixedKey, serializedValue, { EX: ttl });
      } else {
        await this.redisClient!.set(prefixedKey, serializedValue);
      }

      await this.updateSize();
      return true;
    } catch (error) {
      this.logger.error(`Error setting cache key ${key}:`, { error });
      return false;
    }
  }

  /**
   * Delete a value from Redis cache
   * @param key Cache key
   */
  public async delete(key: string): Promise<boolean> {
    this.ensureInitialized();

    const prefixedKey = this.getPrefixedKey(key);
    try {
      const result = await this.redisClient!.del(prefixedKey);
      const success = result > 0;

      if (success) {
        await this.updateSize();
      }

      return success;
    } catch (error) {
      this.logger.error(`Error deleting cache key ${key}:`, { error });
      return false;
    }
  }

  /**
   * Get multiple values from Redis cache
   * @param keys Array of cache keys
   * @returns Object with key-value pairs
   */
  public async getMultiple<T>(keys: string[]): Promise<Record<string, T>> {
    this.ensureInitialized();

    if (!Array.isArray(keys)) {
      throw new Error("Keys must be an array");
    }

    if (keys.length === 0) {
      return {};
    }

    const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
    const result: Record<string, T> = {};

    try {
      const values = await this.redisClient!.mGet(prefixedKeys);
      keys.forEach((key, index) => {
        const value = values[index];
        if (value) {
          result[key] = JSON.parse(value) as T;
          this.stats.hits++;
        } else {
          this.stats.misses++;
        }
      });
      return result;
    } catch (error) {
      this.logger.error("Error getting multiple cache keys:", { error });
      return {};
    }
  }

  /**
   * Set multiple values in Redis cache
   * @param entries Object with key-value pairs
   * @param ttl Time to live in seconds (optional)
   */
  public async setMultiple<T>(
    entries: Record<string, T>,
    ttl?: number
  ): Promise<boolean> {
    this.ensureInitialized();

    if (!entries || typeof entries !== "object") {
      throw new Error("Entries must be an object");
    }

    if (Object.keys(entries).length === 0) {
      return true;
    }

    // Validate keys and TTL
    for (const key of Object.keys(entries)) {
      if (!key || typeof key !== "string" || key.trim() === "") {
        throw new Error(
          "Cache key cannot be null, undefined, or an empty string"
        );
      }
    }

    if (ttl !== undefined) {
      if (
        typeof ttl !== "number" ||
        Number.isNaN(ttl) ||
        ttl < 0 ||
        !Number.isFinite(ttl)
      ) {
        throw new Error(
          `Invalid TTL value: ${ttl}. TTL must be a positive finite number.`
        );
      }
    }

    try {
      const pipeline = this.redisClient!.multi();
      const prefixedEntries = Object.entries(entries).map(([key, value]) => [
        this.getPrefixedKey(key),
        JSON.stringify(value),
      ]);

      for (const [key, value] of prefixedEntries) {
        if (ttl) {
          pipeline.set(key, value, { EX: ttl });
        } else {
          pipeline.set(key, value);
        }
      }

      await pipeline.exec();
      await this.updateSize();
      return true;
    } catch (error) {
      this.logger.error("Error setting multiple cache keys:", { error });
      return false;
    }
  }

  /**
   * Delete multiple values from Redis cache
   * @param keys Array of cache keys
   */
  public async deleteMultiple(keys: string[]): Promise<boolean> {
    this.ensureInitialized();

    if (!Array.isArray(keys)) {
      throw new Error("Keys must be an array");
    }

    if (keys.length === 0) {
      return true;
    }

    const prefixedKeys = keys.map((key) => this.getPrefixedKey(key));
    try {
      const result = await this.redisClient!.del(prefixedKeys);
      const success = result > 0;

      if (success) {
        await this.updateSize();
      }

      return success;
    } catch (error) {
      this.logger.error("Error deleting multiple cache keys:", { error });
      return false;
    }
  }

  /**
   * Clear all cache entries
   */
  public async clear(): Promise<boolean> {
    return this.flush();
  }

  /**
   * Flush all cache entries
   */
  public async flush(): Promise<boolean> {
    this.ensureInitialized();

    try {
      const keys = await this.redisClient!.keys(`${this.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redisClient!.del(keys);
      }
      this.stats.size = 0;
      return true;
    } catch (error) {
      this.logger.error("Error flushing cache:", { error });
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   */
  public async has(key: string): Promise<boolean> {
    this.ensureInitialized();

    const prefixedKey = this.getPrefixedKey(key);
    try {
      const exists = await this.redisClient!.exists(prefixedKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking cache key ${key}:`, { error });
      return false;
    }
  }

  /**
   * Get all cache keys
   * @returns Array of cache keys
   */
  public keys(): string[] {
    this.logger.warn(
      "keys() method is not supported in Redis cache service. Use scan() instead."
    );
    return [];
  }

  /**
   * Memoize a function
   * @param fn Function to memoize
   * @param options Memoization options
   */
  public memoize<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    options: MemoizeOptions<Awaited<ReturnType<T>>> = {}
  ): T {
    const cache = this;
    const keyFn =
      options.keyFn || ((...args: unknown[]) => JSON.stringify(args));

    return async function memoized(...args: unknown[]) {
      const key = keyFn(...args);
      const cached = await cache.get<Awaited<ReturnType<T>>>(key);

      if (cached !== null) {
        return cached;
      }

      const start = performance.now();
      const result = await fn(...args);
      const executionTime = performance.now() - start;

      let ttl: number | undefined;
      if (typeof options.ttl === "function") {
        ttl = options.ttl(result as Awaited<ReturnType<T>>, executionTime);
      } else {
        ttl = options.ttl;
      }

      await cache.set(key, result, ttl);
      return result;
    } as T;
  }

  /**
   * Get cache statistics
   */
  public getStats(): { hits: number; misses: number; size: number } {
    return { ...this.stats };
  }

  /**
   * Reset cache statistics
   */
  public resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
    };
  }

  /**
   * Update cache size
   */
  private async updateSize(): Promise<void> {
    try {
      const keys = await this.redisClient!.keys(`${this.keyPrefix}*`);
      this.stats.size = keys.length;
    } catch (error) {
      this.logger.error("Error updating cache size:", { error });
    }
  }

  /**
   * Get prefixed key
   */
  private getPrefixedKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Ensure Redis client is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.redisClient) {
      throw new Error(
        "Redis cache service not initialized. Call initialize() first."
      );
    }
  }
}

// main/server/system/src/cache/providers/redis.ts
/**
 * Redis Cache Provider
 *
 * Redis-backed cache implementation with tag-based invalidation.
 * Uses ioredis for connection pooling and pipelining.
 */

import {
  CacheConnectionError,
  CacheDeserializationError,
  CacheSerializationError,
} from '@bslt/shared/system';
import redisConstructor, { type Redis, type RedisOptions } from 'ioredis';

import type {
  CacheDeleteOptions,
  CacheEvictionReason,
  CacheGetOptions,
  CacheLogger,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  CreateCacheOptions,
  RedisCacheConfig,
} from '../types';

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Serialized cache entry stored in Redis.
 */
interface RedisEntry<T = unknown> {
  /** The cached value */
  v: T;
  /** Tags for invalidation */
  t?: string[];
}

// ============================================================================
// Redis Cache Provider Implementation
// ============================================================================

export class RedisCacheProvider implements CacheProvider {
  readonly name = 'redis';

  private readonly client: Redis;
  private readonly config: RedisCacheConfig;
  private readonly logger: CacheLogger | undefined;
  private readonly onEviction: ((key: string, reason: CacheEvictionReason) => void) | undefined;
  private closed = false;

  // Stats tracked locally (same pattern as memory provider)
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  constructor(config: RedisCacheConfig, options: CreateCacheOptions = {}) {
    this.config = config;
    this.logger = options.logger;
    this.onEviction = options.onEviction;

    const redisOptions: RedisOptions = {
      host: config.host,
      port: config.port,
      db: config.db ?? 0,
      connectTimeout: config.connectTimeout ?? 5000,
      commandTimeout: config.commandTimeout ?? 3000,
      retryStrategy: (times: number): number | null => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    };

    if (config.password !== undefined) {
      redisOptions.password = config.password;
    }

    if (config.tls === true) {
      redisOptions.tls = {};
    }

    if (config.keyPrefix !== undefined && config.keyPrefix !== '') {
      redisOptions.keyPrefix = `${config.keyPrefix}:`;
    }

    this.client = new redisConstructor(redisOptions);

    this.client.on('error', (err: Error) => {
      this.logger?.error('Redis connection error', { error: err.message });
    });

    this.client.on('connect', () => {
      this.logger?.debug('Redis connected', { host: config.host, port: config.port });
    });

    // Eagerly connect
    this.client.connect().catch((err: unknown) => {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger?.error('Redis initial connection failed', { error: error.message });
    });
  }

  // --------------------------------------------------------------------------
  // Single Key Operations
  // --------------------------------------------------------------------------

  async get<T>(key: string, _options?: CacheGetOptions): Promise<T | undefined> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) {
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      const entry = this.deserialize<T>(key, raw);
      this.stats.hits++;
      this.updateHitRate();
      return entry.v;
    } catch (error) {
      if (error instanceof CacheDeserializationError) throw error;
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }
  }

  async set(key: string, value: unknown, options: CacheSetOptions = {}): Promise<void> {
    const defaultTtl: number | undefined = this.config.defaultTtl;
    const ttl: number = options.ttl ?? defaultTtl ?? 0;
    const tags = options.tags ?? [];

    const entry: RedisEntry = { v: value };
    if (tags.length > 0) {
      entry.t = tags;
    }

    const serialized = this.serialize(key, entry);

    const pipeline = this.client.pipeline();

    if (ttl > 0) {
      pipeline.psetex(key, ttl, serialized);
    } else {
      pipeline.set(key, serialized);
    }

    // Maintain tag index via Redis Sets
    for (const tag of tags) {
      pipeline.sadd(`tag:${tag}`, key);
    }

    await pipeline.exec();
    this.stats.sets++;
  }

  async has(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  async delete(key: string, options: CacheDeleteOptions = {}): Promise<boolean> {
    if (options.byTag === true) {
      return this.deleteByTag(key);
    }

    const deleted = await this.client.del(key);
    if (deleted > 0) {
      this.stats.deletes++;
      this.onEviction?.(key, 'manual');
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  async getMultiple<T>(keys: string[], _options?: CacheGetOptions): Promise<Map<string, T>> {
    if (keys.length === 0) return new Map();

    const values = await this.client.mget(...keys);
    const result = new Map<string, T>();

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const raw = values[i];
      if (key === undefined || raw === undefined) continue;

      if (raw !== null) {
        try {
          const entry = this.deserialize<T>(key, raw);
          result.set(key, entry.v);
          this.stats.hits++;
        } catch {
          this.stats.misses++;
        }
      } else {
        this.stats.misses++;
      }
    }

    this.updateHitRate();
    return result;
  }

  async setMultiple<T>(entries: Map<string, T>, options: CacheSetOptions = {}): Promise<void> {
    if (entries.size === 0) return;

    const defaultTtl: number | undefined = this.config.defaultTtl;
    const ttl: number = options.ttl ?? defaultTtl ?? 0;
    const tags = options.tags ?? [];
    const pipeline = this.client.pipeline();

    for (const [key, value] of entries) {
      const entry: RedisEntry = { v: value };
      if (tags.length > 0) {
        entry.t = tags;
      }

      const serialized = this.serialize(key, entry);

      if (ttl > 0) {
        pipeline.psetex(key, ttl, serialized);
      } else {
        pipeline.set(key, serialized);
      }

      for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key);
      }
    }

    await pipeline.exec();
    this.stats.sets += entries.size;
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    const deleted = await this.client.del(...keys);
    this.stats.deletes += deleted;
    return deleted;
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  async clear(): Promise<void> {
    // FLUSHDB clears the current database
    await this.client.flushdb();
    this.stats.size = 0;
    this.logger?.info('Redis cache cleared');
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      size: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.client.quit();
    this.logger?.info('Redis cache provider closed');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private async deleteByTag(tag: string): Promise<boolean> {
    const keys = await this.client.smembers(`tag:${tag}`);
    if (keys.length === 0) return false;

    const pipeline = this.client.pipeline();
    pipeline.del(...keys);
    pipeline.del(`tag:${tag}`);
    await pipeline.exec();

    this.stats.deletes += keys.length;
    for (const key of keys) {
      this.onEviction?.(key, 'manual');
    }
    return true;
  }

  private serialize(key: string, entry: RedisEntry): string {
    try {
      return JSON.stringify(entry);
    } catch (err) {
      throw new CacheSerializationError(key, err instanceof Error ? err : undefined);
    }
  }

  private deserialize<T>(key: string, raw: string): RedisEntry<T> {
    try {
      return JSON.parse(raw) as RedisEntry<T>;
    } catch (err) {
      throw new CacheDeserializationError(key, err instanceof Error ? err : undefined);
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    if (total > 1_000_000) {
      this.stats.hits = Math.floor(this.stats.hits / 2);
      this.stats.misses = Math.floor(this.stats.misses / 2);
    }
    const adjusted = this.stats.hits + this.stats.misses;
    this.stats.hitRate = adjusted > 0 ? (this.stats.hits / adjusted) * 100 : 0;
  }

  /**
   * Get the underlying Redis client (for testing or advanced use).
   */
  getClient(): Redis {
    return this.client;
  }
}

/**
 * Create a Redis cache provider from connection config.
 * Wraps construction with a connection error check.
 */
export function createRedisProvider(
  config: RedisCacheConfig,
  options: CreateCacheOptions = {},
): RedisCacheProvider {
  try {
    return new RedisCacheProvider(config, options);
  } catch (err) {
    throw new CacheConnectionError(
      'redis',
      'Failed to create Redis cache provider',
      err instanceof Error ? err : undefined,
    );
  }
}

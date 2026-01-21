// apps/server/src/infrastructure/cache/redis-provider.ts
/**
 * Redis Cache Provider
 *
 * Redis-based cache implementation with connection pooling,
 * graceful fallback, and retry logic.
 */

import {
  CacheConnectionError,
  CacheDeserializationError,
  CacheNotInitializedError,
  CacheSerializationError,
  CacheTimeoutError,
} from '@abe-stack/core';

import type { CacheLogger, CreateCacheOptions, EvictionReason } from './types';
import type {
  CacheDeleteOptions,
  CacheGetOptions,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  RedisCacheConfig,
} from '@abe-stack/core';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal Redis client interface.
 * Compatible with ioredis and other Redis clients.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  exists(...keys: string[]): Promise<number>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(...keyValues: string[]): Promise<string>;
  keys(pattern: string): Promise<string[]>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, ...members: string[]): Promise<number>;
  srem(key: string, ...members: string[]): Promise<number>;
  flushdb(): Promise<string>;
  ping(): Promise<string>;
  quit(): Promise<string>;
  on(event: string, listener: (...args: unknown[]) => void): void;
  status?: string;
}

/**
 * Factory function type for creating Redis clients.
 */
export type RedisClientFactory = (config: RedisCacheConfig) => RedisClient;

// ============================================================================
// Redis Cache Provider Implementation
// ============================================================================

export class RedisCacheProvider implements CacheProvider {
  readonly name = 'redis';

  private client: RedisClient | null = null;
  private isConnected = false;
  private isClosing = false;

  // Stats (tracked locally, Redis doesn't provide all of these)
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    size: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };

  private readonly config: RedisCacheConfig & {
    connectTimeout: number;
    commandTimeout: number;
    keyPrefix: string;
  };
  private readonly logger?: CacheLogger;
  private readonly onEviction?: (key: string, reason: EvictionReason) => void;
  private readonly clientFactory?: RedisClientFactory;

  constructor(
    config: RedisCacheConfig,
    options: CreateCacheOptions & { clientFactory?: RedisClientFactory } = {},
  ) {
    this.config = {
      ...config,
      connectTimeout: config.connectTimeout ?? 5000,
      commandTimeout: config.commandTimeout ?? 5000,
      keyPrefix: config.keyPrefix ?? '',
    };
    this.logger = options.logger;
    this.onEviction = options.onEviction;
    this.clientFactory = options.clientFactory;
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Initialize the Redis connection.
   * Must be called before using the cache.
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    try {
      this.client = await this.createClient();
      this.isConnected = true;
      this.logger?.info('Redis cache provider connected', { url: this.maskUrl(this.config.url) });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error('Failed to connect to Redis', { error: err.message });
      throw new CacheConnectionError('redis', 'Failed to connect to Redis', err);
    }
  }

  private async createClient(): Promise<RedisClient> {
    // Use factory if provided (for testing or custom clients)
    if (this.clientFactory) {
      return this.clientFactory(this.config);
    }

    // Dynamic import of ioredis
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ioredis = await import('ioredis');
      const Redis = ioredis.default;

      const client = new Redis(this.config.url, {
        connectTimeout: this.config.connectTimeout,
        commandTimeout: this.config.commandTimeout,
        db: this.config.db ?? 0,
        tls: this.config.tls ? {} : undefined,
        maxRetriesPerRequest: this.config.retryStrategy?.maxRetries ?? 3,
        retryStrategy: (times: number): number | null => {
          const strategy = this.config.retryStrategy;
          if (!strategy || times > strategy.maxRetries) {
            return null; // Stop retrying
          }
          const delay = Math.min(
            strategy.initialDelayMs * Math.pow(2, times - 1),
            strategy.maxDelayMs,
          );
          return delay;
        },
        lazyConnect: true,
      });

      // Set up event handlers
      client.on('error', (error: Error) => {
        this.logger?.error('Redis client error', { error: error.message });
      });

      client.on('close', () => {
        if (!this.isClosing) {
          this.logger?.warn('Redis connection closed unexpectedly');
          this.isConnected = false;
        }
      });

      client.on('reconnecting', () => {
        this.logger?.info('Redis client reconnecting');
      });

      // Connect
      await client.connect();

      return client as RedisClient;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new CacheConnectionError('redis', 'Failed to create Redis client', err);
    }
  }

  private ensureConnected(): void {
    if (!this.client || !this.isConnected) {
      throw new CacheNotInitializedError('redis');
    }
  }

  private getClient(): RedisClient {
    if (!this.client || !this.isConnected) {
      throw new CacheNotInitializedError('redis');
    }
    return this.client;
  }

  // --------------------------------------------------------------------------
  // Single Key Operations
  // --------------------------------------------------------------------------

  async get<T>(key: string, _options: CacheGetOptions = {}): Promise<T | undefined> {
    this.ensureConnected();

    const fullKey = this.getFullKey(key);

    try {
      const result = await this.withTimeout(
        this.getClient().get(fullKey),
        this.config.commandTimeout,
        'get',
      );

      if (result === null) {
        this.stats.misses++;
        this.updateHitRate();
        return undefined;
      }

      try {
        const value = JSON.parse(result) as T;
        this.stats.hits++;
        this.updateHitRate();
        return value;
      } catch (parseError) {
        throw new CacheDeserializationError(
          key,
          parseError instanceof Error ? parseError : undefined,
        );
      }
    } catch (error) {
      if (error instanceof CacheDeserializationError) {
        throw error;
      }
      this.logger?.error('Redis get error', { key, error: String(error) });
      throw error;
    }
  }

  async set<T extends unknown>(key: string, value: T, options: CacheSetOptions = {}): Promise<void> {
    this.ensureConnected();

    const fullKey = this.getFullKey(key);
    const ttl = options.ttl ?? this.config.defaultTtl ?? 0;

    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (serializeError) {
      throw new CacheSerializationError(
        key,
        serializeError instanceof Error ? serializeError : undefined,
      );
    }

    try {
      if (ttl > 0) {
        const ttlSeconds = Math.ceil(ttl / 1000);
        await this.withTimeout(
          this.getClient().setex(fullKey, ttlSeconds, serialized),
          this.config.commandTimeout,
          'setex',
        );
      } else {
        await this.withTimeout(
          this.getClient().set(fullKey, serialized),
          this.config.commandTimeout,
          'set',
        );
      }

      // Handle tags
      if (options.tags && options.tags.length > 0) {
        await this.addToTags(fullKey, options.tags);
      }

      this.stats.sets++;
    } catch (error) {
      if (error instanceof CacheSerializationError) {
        throw error;
      }
      this.logger?.error('Redis set error', { key, error: String(error) });
      throw error;
    }
  }

  async has(key: string): Promise<boolean> {
    this.ensureConnected();

    const fullKey = this.getFullKey(key);

    try {
      const result = await this.withTimeout(
        this.getClient().exists(fullKey),
        this.config.commandTimeout,
        'exists',
      );
      return result > 0;
    } catch (error) {
      this.logger?.error('Redis exists error', { key, error: String(error) });
      throw error;
    }
  }

  async delete(key: string, options: CacheDeleteOptions = {}): Promise<boolean> {
    this.ensureConnected();

    if (options.byTag) {
      return this.deleteByTag(key);
    }

    const fullKey = this.getFullKey(key);

    try {
      const result = await this.withTimeout(
        this.getClient().del(fullKey),
        this.config.commandTimeout,
        'del',
      );

      if (result > 0) {
        this.stats.deletes++;
        this.onEviction?.(key, 'manual');
        return true;
      }
      return false;
    } catch (error) {
      this.logger?.error('Redis delete error', { key, error: String(error) });
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  async getMultiple<T>(keys: string[], _options: CacheGetOptions = {}): Promise<Map<string, T>> {
    this.ensureConnected();

    if (keys.length === 0) {
      return new Map();
    }

    const fullKeys = keys.map((k) => this.getFullKey(k));

    try {
      const results = await this.withTimeout(
        this.getClient().mget(...fullKeys),
        this.config.commandTimeout,
        'mget',
      );

      const resultMap = new Map<string, T>();

      for (let i = 0; i < keys.length; i++) {
        const value = results[i];
        const key = keys[i];
        if (value !== null && key !== undefined) {
          try {
            resultMap.set(key, JSON.parse(value) as T);
            this.stats.hits++;
          } catch {
            // Skip invalid entries
            this.stats.misses++;
          }
        } else {
          this.stats.misses++;
        }
      }

      this.updateHitRate();
      return resultMap;
    } catch (error) {
      this.logger?.error('Redis mget error', { keys, error: String(error) });
      throw error;
    }
  }

  async setMultiple<T>(entries: Map<string, T>, options: CacheSetOptions = {}): Promise<void> {
    this.ensureConnected();

    if (entries.size === 0) {
      return;
    }

    const keyValues: string[] = [];
    const tags = options.tags ?? [];

    for (const [key, value] of entries) {
      const fullKey = this.getFullKey(key);
      try {
        keyValues.push(fullKey, JSON.stringify(value));
      } catch (serializeError) {
        throw new CacheSerializationError(
          key,
          serializeError instanceof Error ? serializeError : undefined,
        );
      }
    }

    try {
      await this.withTimeout(
        this.getClient().mset(...keyValues),
        this.config.commandTimeout,
        'mset',
      );

      // Handle TTL (mset doesn't support TTL, so we need individual expiry)
      const ttl = options.ttl ?? this.config.defaultTtl ?? 0;
      if (ttl > 0) {
        const ttlSeconds = Math.ceil(ttl / 1000);
        for (const [key, value] of entries) {
          const fullKey = this.getFullKey(key);
          // Fire and forget - don't wait for expire commands
          void this.getClient().setex(fullKey, ttlSeconds, JSON.stringify(value));
        }
      }

      // Handle tags
      if (tags.length > 0) {
        for (const [key] of entries) {
          await this.addToTags(this.getFullKey(key), tags);
        }
      }

      this.stats.sets += entries.size;
    } catch (error) {
      this.logger?.error('Redis mset error', { error: String(error) });
      throw error;
    }
  }

  async deleteMultiple(keys: string[]): Promise<number> {
    this.ensureConnected();

    if (keys.length === 0) {
      return 0;
    }

    const fullKeys = keys.map((k) => this.getFullKey(k));

    try {
      const result = await this.withTimeout(
        this.getClient().del(...fullKeys),
        this.config.commandTimeout,
        'del',
      );

      this.stats.deletes += result;

      for (const key of keys) {
        this.onEviction?.(key, 'manual');
      }

      return result;
    } catch (error) {
      this.logger?.error('Redis del multiple error', { keys, error: String(error) });
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Cache Management
  // --------------------------------------------------------------------------

  async clear(): Promise<void> {
    this.ensureConnected();

    try {
      // If using prefix, only delete prefixed keys
      if (this.config.keyPrefix) {
        const pattern = `${this.config.keyPrefix}:*`;
        const keys = await this.withTimeout(
          this.getClient().keys(pattern),
          this.config.commandTimeout,
          'keys',
        );

        if (keys.length > 0) {
          await this.withTimeout(
            this.getClient().del(...keys),
            this.config.commandTimeout,
            'del',
          );
        }
      } else {
        await this.withTimeout(
          this.getClient().flushdb(),
          this.config.commandTimeout,
          'flushdb',
        );
      }

      this.stats.size = 0;
      this.logger?.info('Redis cache cleared');
    } catch (error) {
      this.logger?.error('Redis clear error', { error: String(error) });
      throw error;
    }
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
    if (!this.client || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.withTimeout(
        this.client.ping(),
        this.config.commandTimeout,
        'ping',
      );
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    this.isClosing = true;

    if (this.client) {
      try {
        await this.client.quit();
      } catch (error) {
        this.logger?.warn('Error closing Redis connection', { error: String(error) });
      }
      this.client = null;
    }

    this.isConnected = false;
    this.logger?.info('Redis cache provider closed');
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private getFullKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private getTagKey(tag: string): string {
    const prefix = this.config.keyPrefix ? `${this.config.keyPrefix}:` : '';
    return `${prefix}_tags:${tag}`;
  }

  private async addToTags(fullKey: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      await this.getClient().sadd(tagKey, fullKey);
    }
  }

  private async deleteByTag(tag: string): Promise<boolean> {
    this.ensureConnected();

    const tagKey = this.getTagKey(tag);

    try {
      const members = await this.withTimeout(
        this.getClient().smembers(tagKey),
        this.config.commandTimeout,
        'smembers',
      );

      if (members.length === 0) {
        return false;
      }

      // Delete all tagged keys
      await this.withTimeout(
        this.getClient().del(...members),
        this.config.commandTimeout,
        'del',
      );

      // Delete the tag set
      await this.withTimeout(
        this.getClient().del(tagKey),
        this.config.commandTimeout,
        'del',
      );

      this.stats.deletes += members.length;

      return true;
    } catch (error) {
      this.logger?.error('Redis delete by tag error', { tag, error: String(error) });
      throw error;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new CacheTimeoutError(operation, timeoutMs));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private maskUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.password) {
        parsed.password = '***';
      }
      return parsed.toString();
    } catch {
      return '***';
    }
  }
}

// apps/server/src/infrastructure/cache/__tests__/redis-provider.test.ts
import {
  CacheDeserializationError,
  CacheNotInitializedError,
  CacheSerializationError,
  CacheTimeoutError,
} from '@abe-stack/core';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';


import { RedisCacheProvider } from '../redis-provider';

import type { RedisClient } from '../redis-provider';

// ============================================================================
// Mock Redis Client
// ============================================================================

function createMockRedisClient(): RedisClient & { data: Map<string, string>; tags: Map<string, Set<string>> } {
  const data = new Map<string, string>();
  const tags = new Map<string, Set<string>>();

  return {
    data,
    tags,
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
      return 'OK';
    }),
    setex: vi.fn(async (key: string, _seconds: number, value: string) => {
      data.set(key, value);
      return 'OK';
    }),
    del: vi.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (data.delete(key)) count++;
      }
      return count;
    }),
    exists: vi.fn(async (...keys: string[]) => {
      return keys.filter((k) => data.has(k)).length;
    }),
    mget: vi.fn(async (...keys: string[]) => {
      return keys.map((k) => data.get(k) ?? null);
    }),
    mset: vi.fn(async (...keyValues: string[]) => {
      for (let i = 0; i < keyValues.length; i += 2) {
        const key = keyValues[i];
        const value = keyValues[i + 1];
        if (key !== undefined && value !== undefined) {
          data.set(key, value);
        }
      }
      return 'OK';
    }),
    keys: vi.fn(async (pattern: string) => {
      const prefix = pattern.replace('*', '');
      return Array.from(data.keys()).filter((k) => k.startsWith(prefix));
    }),
    smembers: vi.fn(async (key: string) => {
      return Array.from(tags.get(key) ?? []);
    }),
    sadd: vi.fn(async (key: string, ...members: string[]) => {
      if (!tags.has(key)) tags.set(key, new Set());
      for (const m of members) tags.get(key)!.add(m);
      return members.length;
    }),
    srem: vi.fn(async (key: string, ...members: string[]) => {
      const set = tags.get(key);
      if (!set) return 0;
      let count = 0;
      for (const m of members) {
        if (set.delete(m)) count++;
      }
      return count;
    }),
    flushdb: vi.fn(async () => {
      data.clear();
      tags.clear();
      return 'OK';
    }),
    ping: vi.fn(async () => 'PONG'),
    quit: vi.fn(async () => 'OK'),
    on: vi.fn(),
    status: 'ready',
  };
}

// ============================================================================
// Redis Cache Provider Tests
// ============================================================================

describe('RedisCacheProvider', () => {
  let cache: RedisCacheProvider;
  let mockClient: ReturnType<typeof createMockRedisClient>;

  beforeEach(async () => {
    mockClient = createMockRedisClient();

    cache = new RedisCacheProvider(
      {
        provider: 'redis',
        url: 'redis://localhost:6379',
        commandTimeout: 5000,
      },
      {
        clientFactory: () => mockClient,
      },
    );

    await cache.connect();
  });

  afterEach(async () => {
    await cache.close();
  });

  describe('connection', () => {
    test('should connect successfully', async () => {
      const healthy = await cache.healthCheck();
      expect(healthy).toBe(true);
    });

    test('should throw when not connected', async () => {
      const unconnectedCache = new RedisCacheProvider({
        provider: 'redis',
        url: 'redis://localhost:6379',
      });

      await expect(unconnectedCache.get('key')).rejects.toThrow(CacheNotInitializedError);
    });

    test('should handle ping for health check', async () => {
      const healthy = await cache.healthCheck();

      expect(mockClient.ping).toHaveBeenCalled();
      expect(healthy).toBe(true);
    });
  });

  describe('basic operations', () => {
    describe('get/set', () => {
      test('should store and retrieve values', async () => {
        await cache.set('key1', 'value1');
        const result = await cache.get<string>('key1');

        expect(result).toBe('value1');
      });

      test('should return undefined for missing keys', async () => {
        const result = await cache.get<string>('nonexistent');

        expect(result).toBeUndefined();
      });

      test('should handle different value types', async () => {
        await cache.set('string', 'hello');
        await cache.set('number', 42);
        await cache.set('boolean', true);
        await cache.set('object', { foo: 'bar' });
        await cache.set('array', [1, 2, 3]);

        expect(await cache.get('string')).toBe('hello');
        expect(await cache.get('number')).toBe(42);
        expect(await cache.get('boolean')).toBe(true);
        expect(await cache.get('object')).toEqual({ foo: 'bar' });
        expect(await cache.get('array')).toEqual([1, 2, 3]);
      });

      test('should use setex for TTL', async () => {
        await cache.set('key', 'value', { ttl: 60000 });

        expect(mockClient.setex).toHaveBeenCalledWith('key', 60, expect.any(String));
      });
    });

    describe('has', () => {
      test('should return true for existing keys', async () => {
        await cache.set('key', 'value');

        expect(await cache.has('key')).toBe(true);
      });

      test('should return false for missing keys', async () => {
        expect(await cache.has('nonexistent')).toBe(false);
      });
    });

    describe('delete', () => {
      test('should delete existing keys', async () => {
        await cache.set('key', 'value');
        const deleted = await cache.delete('key');

        expect(deleted).toBe(true);
        expect(await cache.has('key')).toBe(false);
      });

      test('should return false for missing keys', async () => {
        const deleted = await cache.delete('nonexistent');

        expect(deleted).toBe(false);
      });
    });
  });

  describe('bulk operations', () => {
    describe('getMultiple', () => {
      test('should get multiple values', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');

        const result = await cache.getMultiple<string>(['key1', 'key2']);

        expect(result.size).toBe(2);
        expect(result.get('key1')).toBe('value1');
        expect(result.get('key2')).toBe('value2');
      });

      test('should skip missing keys', async () => {
        await cache.set('key1', 'value1');

        const result = await cache.getMultiple<string>(['key1', 'missing']);

        expect(result.size).toBe(1);
        expect(result.has('missing')).toBe(false);
      });

      test('should return empty map for empty input', async () => {
        const result = await cache.getMultiple<string>([]);

        expect(result.size).toBe(0);
      });
    });

    describe('setMultiple', () => {
      test('should set multiple values', async () => {
        const entries = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        await cache.setMultiple(entries);

        expect(await cache.get('key1')).toBe('value1');
        expect(await cache.get('key2')).toBe('value2');
      });

      test('should handle empty map', async () => {
        await cache.setMultiple(new Map());

        expect(mockClient.mset).not.toHaveBeenCalled();
      });
    });

    describe('deleteMultiple', () => {
      test('should delete multiple keys', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');

        const deleted = await cache.deleteMultiple(['key1', 'key2']);

        expect(deleted).toBe(2);
      });

      test('should return 0 for empty input', async () => {
        const deleted = await cache.deleteMultiple([]);

        expect(deleted).toBe(0);
      });
    });
  });

  describe('tags', () => {
    test('should store tags with entries', async () => {
      await cache.set('key', 'value', { tags: ['tag1', 'tag2'] });

      expect(mockClient.sadd).toHaveBeenCalledWith('_tags:tag1', 'key');
      expect(mockClient.sadd).toHaveBeenCalledWith('_tags:tag2', 'key');
    });

    test('should delete by tag', async () => {
      // Setup tagged entries
      mockClient.tags.set('_tags:users', new Set(['user:1', 'user:2']));
      mockClient.data.set('user:1', '"data1"');
      mockClient.data.set('user:2', '"data2"');

      const deleted = await cache.delete('users', { byTag: true });

      expect(deleted).toBe(true);
    });

    test('should return false for non-existent tag', async () => {
      const deleted = await cache.delete('nonexistent', { byTag: true });

      expect(deleted).toBe(false);
    });
  });

  describe('key prefix', () => {
    test('should prefix all keys', async () => {
      const prefixedCache = new RedisCacheProvider(
        {
          provider: 'redis',
          url: 'redis://localhost:6379',
          keyPrefix: 'app',
        },
        { clientFactory: () => mockClient },
      );

      await prefixedCache.connect();
      await prefixedCache.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('app:key', expect.any(String));

      await prefixedCache.close();
    });
  });

  describe('statistics', () => {
    test('should track hits and misses', async () => {
      await cache.set('key', 'value');

      await cache.get('key'); // hit
      await cache.get('missing'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    test('should reset statistics', async () => {
      await cache.set('key', 'value');
      await cache.get('key');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('clear', () => {
    test('should clear all entries with prefix', async () => {
      const prefixedCache = new RedisCacheProvider(
        {
          provider: 'redis',
          url: 'redis://localhost:6379',
          keyPrefix: 'app',
        },
        { clientFactory: () => mockClient },
      );

      await prefixedCache.connect();
      await prefixedCache.set('key1', 'value1');
      await prefixedCache.set('key2', 'value2');

      await prefixedCache.clear();

      expect(mockClient.keys).toHaveBeenCalledWith('app:*');

      await prefixedCache.close();
    });

    test('should use flushdb without prefix', async () => {
      await cache.set('key', 'value');
      await cache.clear();

      expect(mockClient.flushdb).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('should throw CacheDeserializationError for invalid JSON', async () => {
      mockClient.data.set('invalid', 'not json');

      await expect(cache.get('invalid')).rejects.toThrow(CacheDeserializationError);
    });

    test('should throw CacheSerializationError for circular references', async () => {
      const circular: Record<string, unknown> = {};
      circular['self'] = circular;

      await expect(cache.set('circular', circular)).rejects.toThrow(CacheSerializationError);
    });

    test('should handle timeout errors', async () => {
      // Mock a slow operation
      mockClient.get = vi.fn(
        (): Promise<string | null> =>
          new Promise((resolve) => {
            setTimeout(() => resolve(null), 10000);
          }),
      );

      const shortTimeoutCache = new RedisCacheProvider(
        {
          provider: 'redis',
          url: 'redis://localhost:6379',
          commandTimeout: 10,
        },
        { clientFactory: () => mockClient },
      );

      await shortTimeoutCache.connect();

      await expect(shortTimeoutCache.get('key')).rejects.toThrow(CacheTimeoutError);

      await shortTimeoutCache.close();
    });
  });

  describe('health check', () => {
    test('should return false when not connected', async () => {
      await cache.close();

      const healthy = await cache.healthCheck();

      expect(healthy).toBe(false);
    });

    test('should return false when ping fails', async () => {
      mockClient.ping = vi.fn(async () => {
        throw new Error('Connection lost');
      });

      const healthy = await cache.healthCheck();

      expect(healthy).toBe(false);
    });
  });
});

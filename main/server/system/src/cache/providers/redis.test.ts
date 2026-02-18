// main/server/system/src/cache/providers/redis.test.ts

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mock ioredis
// ============================================================================

interface MockPipeline {
  psetex: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  sadd: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exec: ReturnType<typeof vi.fn>;
}

interface MockRedisClient {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  psetex: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  exists: ReturnType<typeof vi.fn>;
  mget: ReturnType<typeof vi.fn>;
  sadd: ReturnType<typeof vi.fn>;
  smembers: ReturnType<typeof vi.fn>;
  flushdb: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  quit: ReturnType<typeof vi.fn>;
  pipeline: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
}

/**
 * Shared references updated by the mock factory on each `new Redis()` call.
 * Tests read from these to configure per-test behavior.
 */
let mockClient: MockRedisClient;
let mockPipeline: MockPipeline;

function createMockPipeline(): MockPipeline {
  const pipeline: MockPipeline = {
    psetex: vi.fn(),
    set: vi.fn(),
    sadd: vi.fn(),
    del: vi.fn(),
    exec: vi.fn().mockResolvedValue([]),
  };
  // Chain methods return the pipeline itself
  pipeline.psetex.mockReturnValue(pipeline);
  pipeline.set.mockReturnValue(pipeline);
  pipeline.sadd.mockReturnValue(pipeline);
  pipeline.del.mockReturnValue(pipeline);
  return pipeline;
}

function createMockClient(pipeline: MockPipeline): MockRedisClient {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    psetex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(0),
    exists: vi.fn().mockResolvedValue(0),
    mget: vi.fn().mockResolvedValue([]),
    sadd: vi.fn().mockResolvedValue(1),
    smembers: vi.fn().mockResolvedValue([]),
    flushdb: vi.fn().mockResolvedValue('OK'),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    pipeline: vi.fn().mockReturnValue(pipeline),
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
}

vi.mock('ioredis', () => {
  return {
    default: function MockRedis() {
      mockPipeline = createMockPipeline();
      mockClient = createMockClient(mockPipeline);
      // Copy all mock methods onto this instance
      return Object.assign(this, mockClient);
    },
  };
});

// Import after mock
import { RedisCacheProvider } from './redis';

import type { CacheEvictionReason, CacheLogger } from '../types';

// ============================================================================
// Redis Cache Provider Tests
// ============================================================================

describe('RedisCacheProvider', () => {
  let cache: RedisCacheProvider;

  beforeEach(() => {
    cache = new RedisCacheProvider({
      provider: 'redis',
      host: 'localhost',
      port: 6379,
      defaultTtl: 0,
    });
  });

  afterEach(async () => {
    await cache.close();
  });

  describe('constructor', () => {
    test('should set name to redis', () => {
      expect(cache.name).toBe('redis');
    });

    test('should register error and connect event handlers', () => {
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    });

    test('should eagerly call connect', () => {
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    test('should return undefined on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cache.get<string>('key1');

      expect(result).toBeUndefined();
      expect(mockClient.get).toHaveBeenCalledWith('key1');
    });

    test('should return deserialized value on cache hit', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ v: 'hello' }));

      const result = await cache.get<string>('key1');

      expect(result).toBe('hello');
    });

    test('should return deserialized object on cache hit', async () => {
      const obj = { id: 1, name: 'test' };
      mockClient.get.mockResolvedValue(JSON.stringify({ v: obj }));

      const result = await cache.get<typeof obj>('key1');

      expect(result).toEqual(obj);
    });

    test('should track misses on cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      await cache.get('missing');

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(0);
    });

    test('should track hits on cache hit', async () => {
      mockClient.get.mockResolvedValue(JSON.stringify({ v: 'value' }));

      await cache.get('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(0);
    });

    test('should return undefined and track miss on Redis error', async () => {
      mockClient.get.mockRejectedValue(new Error('connection lost'));

      const result = await cache.get('key');

      expect(result).toBeUndefined();
      expect(cache.getStats().misses).toBe(1);
    });
  });

  describe('set', () => {
    test('should use psetex when TTL is provided', async () => {
      await cache.set('key', 'value', { ttl: 5000 });

      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.psetex).toHaveBeenCalledWith('key', 5000, JSON.stringify({ v: 'value' }));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    test('should use set when TTL is 0', async () => {
      await cache.set('key', 'value');

      expect(mockPipeline.set).toHaveBeenCalledWith('key', JSON.stringify({ v: 'value' }));
      expect(mockPipeline.psetex).not.toHaveBeenCalled();
    });

    test('should use defaultTtl from config when no TTL option given', async () => {
      const cacheWithTtl = new RedisCacheProvider({
        provider: 'redis',
        host: 'localhost',
        port: 6379,
        defaultTtl: 60000,
      });

      await cacheWithTtl.set('key', 'value');

      expect(mockPipeline.psetex).toHaveBeenCalledWith(
        'key',
        60000,
        JSON.stringify({ v: 'value' }),
      );

      await cacheWithTtl.close();
    });

    test('should increment sets stat', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      expect(cache.getStats().sets).toBe(2);
    });
  });

  describe('set with tags', () => {
    test('should add keys to tag sets via sadd', async () => {
      await cache.set('user:1', { id: 1 }, { tags: ['users', 'admins'] });

      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:users', 'user:1');
      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:admins', 'user:1');
    });

    test('should include tags in serialized entry', async () => {
      await cache.set('key', 'value', { tags: ['tag1'] });

      expect(mockPipeline.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ v: 'value', t: ['tag1'] }),
      );
    });

    test('should not include tags field when no tags provided', async () => {
      await cache.set('key', 'value');

      expect(mockPipeline.set).toHaveBeenCalledWith('key', JSON.stringify({ v: 'value' }));
      expect(mockPipeline.sadd).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    test('should return true when key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await cache.has('key');

      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('key');
    });

    test('should return false when key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await cache.has('missing');

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    test('should return true when key is deleted', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await cache.delete('key');

      expect(result).toBe(true);
      expect(mockClient.del).toHaveBeenCalledWith('key');
    });

    test('should return false when key not found', async () => {
      mockClient.del.mockResolvedValue(0);

      const result = await cache.delete('missing');

      expect(result).toBe(false);
    });

    test('should increment deletes stat on successful delete', async () => {
      mockClient.del.mockResolvedValue(1);

      await cache.delete('key');

      expect(cache.getStats().deletes).toBe(1);
    });

    test('should not increment deletes stat when key not found', async () => {
      mockClient.del.mockResolvedValue(0);

      await cache.delete('missing');

      expect(cache.getStats().deletes).toBe(0);
    });

    test('should call onEviction callback on successful delete', async () => {
      const evicted: Array<{ key: string; reason: CacheEvictionReason }> = [];
      const cacheWithCallback = new RedisCacheProvider(
        { provider: 'redis', host: 'localhost', port: 6379 },
        { onEviction: (key, reason) => evicted.push({ key, reason }) },
      );

      mockClient.del.mockResolvedValue(1);
      await cacheWithCallback.delete('key');

      expect(evicted).toHaveLength(1);
      expect(evicted[0]?.key).toBe('key');
      expect(evicted[0]?.reason).toBe('manual');

      await cacheWithCallback.close();
    });
  });

  describe('delete byTag', () => {
    test('should read smembers and delete keys plus tag set', async () => {
      mockClient.smembers.mockResolvedValue(['user:1', 'user:2']);

      const result = await cache.delete('users', { byTag: true });

      expect(result).toBe(true);
      expect(mockClient.smembers).toHaveBeenCalledWith('tag:users');
      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.del).toHaveBeenCalledWith('user:1', 'user:2');
      expect(mockPipeline.del).toHaveBeenCalledWith('tag:users');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    test('should return false when tag has no keys', async () => {
      mockClient.smembers.mockResolvedValue([]);

      const result = await cache.delete('empty-tag', { byTag: true });

      expect(result).toBe(false);
    });

    test('should increment deletes by number of tagged keys', async () => {
      mockClient.smembers.mockResolvedValue(['a', 'b', 'c']);

      await cache.delete('tag', { byTag: true });

      expect(cache.getStats().deletes).toBe(3);
    });

    test('should call onEviction for each tagged key', async () => {
      const evicted: string[] = [];
      const cacheWithCallback = new RedisCacheProvider(
        { provider: 'redis', host: 'localhost', port: 6379 },
        { onEviction: (key) => evicted.push(key) },
      );

      mockClient.smembers.mockResolvedValue(['user:1', 'user:2']);
      await cacheWithCallback.delete('users', { byTag: true });

      expect(evicted).toEqual(['user:1', 'user:2']);

      await cacheWithCallback.close();
    });
  });

  describe('getMultiple', () => {
    test('should return Map of found values', async () => {
      mockClient.mget.mockResolvedValue([
        JSON.stringify({ v: 'val1' }),
        null,
        JSON.stringify({ v: 'val3' }),
      ]);

      const result = await cache.getMultiple<string>(['key1', 'key2', 'key3']);

      expect(result.size).toBe(2);
      expect(result.get('key1')).toBe('val1');
      expect(result.has('key2')).toBe(false);
      expect(result.get('key3')).toBe('val3');
    });

    test('should return empty Map for empty keys array', async () => {
      const result = await cache.getMultiple<string>([]);

      expect(result.size).toBe(0);
      expect(mockClient.mget).not.toHaveBeenCalled();
    });

    test('should track hits and misses per key', async () => {
      mockClient.mget.mockResolvedValue([
        JSON.stringify({ v: 'val1' }),
        null,
        JSON.stringify({ v: 'val3' }),
      ]);

      await cache.getMultiple<string>(['key1', 'key2', 'key3']);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    test('should handle deserialization errors gracefully', async () => {
      mockClient.mget.mockResolvedValue(['{invalid json', JSON.stringify({ v: 'ok' })]);

      const result = await cache.getMultiple<string>(['bad', 'good']);

      expect(result.size).toBe(1);
      expect(result.get('good')).toBe('ok');
      expect(cache.getStats().misses).toBe(1);
    });
  });

  describe('setMultiple', () => {
    test('should use pipeline for batch operations', async () => {
      const entries = new Map<string, string>([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      await cache.setMultiple(entries);

      expect(mockClient.pipeline).toHaveBeenCalled();
      expect(mockPipeline.set).toHaveBeenCalledWith('key1', JSON.stringify({ v: 'value1' }));
      expect(mockPipeline.set).toHaveBeenCalledWith('key2', JSON.stringify({ v: 'value2' }));
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    test('should use psetex with TTL', async () => {
      const entries = new Map([['key1', 'value1']]);

      await cache.setMultiple(entries, { ttl: 3000 });

      expect(mockPipeline.psetex).toHaveBeenCalledWith(
        'key1',
        3000,
        JSON.stringify({ v: 'value1' }),
      );
    });

    test('should add tags for all entries', async () => {
      const entries = new Map([
        ['key1', 'v1'],
        ['key2', 'v2'],
      ]);

      await cache.setMultiple(entries, { tags: ['batch'] });

      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:batch', 'key1');
      expect(mockPipeline.sadd).toHaveBeenCalledWith('tag:batch', 'key2');
    });

    test('should increment sets stat by entry count', async () => {
      const entries = new Map([
        ['key1', 'v1'],
        ['key2', 'v2'],
        ['key3', 'v3'],
      ]);

      await cache.setMultiple(entries);

      expect(cache.getStats().sets).toBe(3);
    });

    test('should be a no-op for empty Map', async () => {
      await cache.setMultiple(new Map());

      expect(mockClient.pipeline).not.toHaveBeenCalled();
    });
  });

  describe('deleteMultiple', () => {
    test('should delete multiple keys', async () => {
      mockClient.del.mockResolvedValue(2);

      const deleted = await cache.deleteMultiple(['key1', 'key2']);

      expect(deleted).toBe(2);
      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2');
    });

    test('should return 0 for empty keys array', async () => {
      const deleted = await cache.deleteMultiple([]);

      expect(deleted).toBe(0);
      expect(mockClient.del).not.toHaveBeenCalled();
    });

    test('should track deletes stat', async () => {
      mockClient.del.mockResolvedValue(3);

      await cache.deleteMultiple(['a', 'b', 'c']);

      expect(cache.getStats().deletes).toBe(3);
    });
  });

  describe('clear', () => {
    test('should call flushdb', async () => {
      await cache.clear();

      expect(mockClient.flushdb).toHaveBeenCalled();
    });

    test('should reset size stat to 0', async () => {
      await cache.clear();

      expect(cache.getStats().size).toBe(0);
    });
  });

  describe('healthCheck', () => {
    test('should return true on PONG response', async () => {
      mockClient.ping.mockResolvedValue('PONG');

      const result = await cache.healthCheck();

      expect(result).toBe(true);
    });

    test('should return false on ping failure', async () => {
      mockClient.ping.mockRejectedValue(new Error('connection refused'));

      const result = await cache.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('close', () => {
    test('should call quit', async () => {
      await cache.close();

      expect(mockClient.quit).toHaveBeenCalled();
    });

    test('should be idempotent', async () => {
      await cache.close();
      await cache.close();

      expect(mockClient.quit).toHaveBeenCalledTimes(1);
    });
  });

  describe('statistics', () => {
    test('should track hits, misses, sets, and deletes correctly', async () => {
      // 2 sets
      await cache.set('key1', 'v1');
      await cache.set('key2', 'v2');

      // 1 hit, 1 miss
      mockClient.get.mockResolvedValueOnce(JSON.stringify({ v: 'v1' }));
      await cache.get('key1');
      mockClient.get.mockResolvedValueOnce(null);
      await cache.get('missing');

      // 1 delete
      mockClient.del.mockResolvedValueOnce(1);
      await cache.delete('key1');

      const stats = cache.getStats();
      expect(stats.sets).toBe(2);
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.deletes).toBe(1);
    });

    test('should calculate hit rate', async () => {
      mockClient.get.mockResolvedValueOnce(JSON.stringify({ v: 'a' }));
      await cache.get('hit1');
      mockClient.get.mockResolvedValueOnce(JSON.stringify({ v: 'b' }));
      await cache.get('hit2');
      mockClient.get.mockResolvedValueOnce(null);
      await cache.get('miss');

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    test('should return copy of stats', () => {
      const stats1 = cache.getStats();
      const stats2 = cache.getStats();

      expect(stats1).not.toBe(stats2);
      expect(stats1).toEqual(stats2);
    });

    test('should reset stats', async () => {
      await cache.set('key', 'value');
      mockClient.get.mockResolvedValueOnce(JSON.stringify({ v: 'value' }));
      await cache.get('key');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.deletes).toBe(0);
      expect(stats.hitRate).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('serialization', () => {
    test('should JSON.stringify entry for set', async () => {
      await cache.set('key', { nested: [1, 2] });

      expect(mockPipeline.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ v: { nested: [1, 2] } }),
      );
    });

    test('should JSON.parse entry for get', async () => {
      const entry = { v: { nested: [1, 2] } };
      mockClient.get.mockResolvedValue(JSON.stringify(entry));

      const result = await cache.get<{ nested: number[] }>('key');

      expect(result).toEqual({ nested: [1, 2] });
    });

    test('should handle null values', async () => {
      await cache.set('key', null);

      expect(mockPipeline.set).toHaveBeenCalledWith('key', JSON.stringify({ v: null }));
    });
  });

  describe('TTL handling', () => {
    test('should pass TTL to psetex in milliseconds', async () => {
      await cache.set('key', 'value', { ttl: 30000 });

      expect(mockPipeline.psetex).toHaveBeenCalledWith(
        'key',
        30000,
        JSON.stringify({ v: 'value' }),
      );
    });

    test('should use set (no expiry) when TTL is 0', async () => {
      await cache.set('key', 'value', { ttl: 0 });

      expect(mockPipeline.set).toHaveBeenCalled();
      expect(mockPipeline.psetex).not.toHaveBeenCalled();
    });
  });

  describe('connection error handling', () => {
    test('should log errors via logger', async () => {
      const logger: CacheLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const cacheWithLogger = new RedisCacheProvider(
        { provider: 'redis', host: 'localhost', port: 6379 },
        { logger },
      );

      // Find the error handler registered by this instance (most recent on call)
      const errorHandler = mockClient.on.mock.calls.find((call) => call[0] === 'error');
      expect(errorHandler).toBeDefined();

      // Simulate a connection error
      const errorCallback = errorHandler![1] as (err: Error) => void;
      errorCallback(new Error('ECONNREFUSED'));

      expect(logger.error).toHaveBeenCalledWith('Redis connection error', {
        error: 'ECONNREFUSED',
      });

      await cacheWithLogger.close();
    });

    test('should log connect event via logger', async () => {
      const logger: CacheLogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };

      const cacheWithLogger = new RedisCacheProvider(
        { provider: 'redis', host: 'localhost', port: 6379 },
        { logger },
      );

      const connectHandler = mockClient.on.mock.calls.find((call) => call[0] === 'connect');
      expect(connectHandler).toBeDefined();

      const connectCallback = connectHandler![1] as () => void;
      connectCallback();

      expect(logger.debug).toHaveBeenCalledWith('Redis connected', {
        host: 'localhost',
        port: 6379,
      });

      await cacheWithLogger.close();
    });
  });

  describe('getClient', () => {
    test('should return the underlying Redis client', () => {
      const client = cache.getClient();

      // The client is the MockRedis instance with methods assigned via Object.assign
      expect(client).toBeDefined();
      expect(client.get).toBe(mockClient.get);
      expect(client.set).toBe(mockClient.set);
      expect(client.del).toBe(mockClient.del);
    });
  });
});

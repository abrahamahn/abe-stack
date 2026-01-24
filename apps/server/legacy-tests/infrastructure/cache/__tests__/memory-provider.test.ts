// apps/server/src/infrastructure/cache/__tests__/memory-provider.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { MemoryCacheProvider } from '../memory-provider';

import type { EvictionReason } from '../types';

// ============================================================================
// Memory Cache Provider Tests
// ============================================================================

describe('MemoryCacheProvider', () => {
  let cache: MemoryCacheProvider;

  beforeEach(() => {
    cache = new MemoryCacheProvider({
      provider: 'memory',
      maxSize: 100,
      defaultTtl: 0,
      cleanupInterval: 0, // Disable auto-cleanup for testing
    });
  });

  afterEach(async () => {
    await cache.close();
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
        await cache.set('null', null);

        expect(await cache.get('string')).toBe('hello');
        expect(await cache.get('number')).toBe(42);
        expect(await cache.get('boolean')).toBe(true);
        expect(await cache.get('object')).toEqual({ foo: 'bar' });
        expect(await cache.get('array')).toEqual([1, 2, 3]);
        expect(await cache.get('null')).toBeNull();
      });

      test('should overwrite existing values', async () => {
        await cache.set('key', 'value1');
        await cache.set('key', 'value2');

        expect(await cache.get('key')).toBe('value2');
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

      test('should return false for expired keys', async () => {
        await cache.set('key', 'value', { ttl: 1 });

        await new Promise((resolve) => setTimeout(resolve, 10));

        expect(await cache.has('key')).toBe(false);
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

  describe('TTL expiration', () => {
    test('should expire entries after TTL', async () => {
      await cache.set('key', 'value', { ttl: 50 });

      expect(await cache.get('key')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(await cache.get('key')).toBeUndefined();
    });

    test('should use default TTL when not specified', async () => {
      const cacheWithTtl = new MemoryCacheProvider({
        provider: 'memory',
        defaultTtl: 50,
        cleanupInterval: 0,
      });

      await cacheWithTtl.set('key', 'value');

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(await cacheWithTtl.get('key')).toBeUndefined();

      await cacheWithTtl.close();
    });

    test('should not expire entries with TTL of 0', async () => {
      await cache.set('key', 'value', { ttl: 0 });

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(await cache.get('key')).toBe('value');
    });
  });

  describe('LRU eviction', () => {
    test('should evict least recently used entry when at capacity', async () => {
      const smallCache = new MemoryCacheProvider({
        provider: 'memory',
        maxSize: 3,
        cleanupInterval: 0,
      });

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      // Access key1 to make it more recently used
      await smallCache.get('key1');

      // Add new entry, should evict key2 (least recently used)
      await smallCache.set('key4', 'value4');

      expect(await smallCache.has('key1')).toBe(true);
      expect(await smallCache.has('key2')).toBe(false); // Evicted
      expect(await smallCache.has('key3')).toBe(true);
      expect(await smallCache.has('key4')).toBe(true);

      await smallCache.close();
    });

    test('should call onEviction callback', async () => {
      const evicted: Array<{ key: string; reason: EvictionReason }> = [];

      const smallCache = new MemoryCacheProvider(
        {
          provider: 'memory',
          maxSize: 2,
          cleanupInterval: 0,
        },
        {
          onEviction: (key, reason) => {
            evicted.push({ ...config, reason });
          },
        },
      );

      await smallCache.set('key1', 'value1');
      await smallCache.set('key2', 'value2');
      await smallCache.set('key3', 'value3');

      expect(evicted).toHaveLength(1);
      expect(evicted[0]?.key).toBe('key1');
      expect(evicted[0]?.reason).toBe('lru');

      await smallCache.close();
    });
  });

  describe('bulk operations', () => {
    describe('getMultiple', () => {
      test('should get multiple values', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        await cache.set('key3', 'value3');

        const result = await cache.getMultiple<string>(['key1', 'key2', 'key3']);

        expect(result.size).toBe(3);
        expect(result.get('key1')).toBe('value1');
        expect(result.get('key2')).toBe('value2');
        expect(result.get('key3')).toBe('value3');
      });

      test('should skip missing keys', async () => {
        await cache.set('key1', 'value1');

        const result = await cache.getMultiple<string>(['key1', 'missing']);

        expect(result.size).toBe(1);
        expect(result.get('key1')).toBe('value1');
        expect(result.has('missing')).toBe(false);
      });
    });

    describe('setMultiple', () => {
      test('should set multiple values', async () => {
        const entries = new Map<string, string>([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        await cache.setMultiple(entries);

        expect(await cache.get('key1')).toBe('value1');
        expect(await cache.get('key2')).toBe('value2');
      });

      test('should apply options to all entries', async () => {
        const entries = new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]);

        await cache.setMultiple(entries, { ttl: 50 });

        await new Promise((resolve) => setTimeout(resolve, 60));

        expect(await cache.get('key1')).toBeUndefined();
        expect(await cache.get('key2')).toBeUndefined();
      });
    });

    describe('deleteMultiple', () => {
      test('should delete multiple keys', async () => {
        await cache.set('key1', 'value1');
        await cache.set('key2', 'value2');
        await cache.set('key3', 'value3');

        const deleted = await cache.deleteMultiple(['key1', 'key2']);

        expect(deleted).toBe(2);
        expect(await cache.has('key1')).toBe(false);
        expect(await cache.has('key2')).toBe(false);
        expect(await cache.has('key3')).toBe(true);
      });

      test('should handle missing keys', async () => {
        await cache.set('key1', 'value1');

        const deleted = await cache.deleteMultiple(['key1', 'missing']);

        expect(deleted).toBe(1);
      });
    });
  });

  describe('tags', () => {
    test('should delete entries by tag', async () => {
      await cache.set('user:1', { id: 1 }, { tags: ['users'] });
      await cache.set('user:2', { id: 2 }, { tags: ['users'] });
      await cache.set('post:1', { id: 1 }, { tags: ['posts'] });

      const deleted = await cache.delete('users', { byTag: true });

      expect(deleted).toBe(true);
      expect(await cache.has('user:1')).toBe(false);
      expect(await cache.has('user:2')).toBe(false);
      expect(await cache.has('post:1')).toBe(true);
    });

    test('should return false for non-existent tag', async () => {
      const deleted = await cache.delete('nonexistent', { byTag: true });

      expect(deleted).toBe(false);
    });

    test('should clean up cross-referenced tags when deleting by tag', async () => {
      // Entry with multiple tags
      await cache.set('user:1', { id: 1 }, { tags: ['users', 'admins'] });
      await cache.set('user:2', { id: 2 }, { tags: ['users'] });

      // Delete by 'users' tag
      await cache.delete('users', { byTag: true });

      // Both entries should be deleted
      expect(await cache.has('user:1')).toBe(false);
      expect(await cache.has('user:2')).toBe(false);

      // The 'admins' tag should also be cleaned up (no stale references)
      // Adding a new entry with 'admins' tag should work correctly
      await cache.set('admin:1', { id: 1 }, { tags: ['admins'] });
      await cache.delete('admins', { byTag: true });
      expect(await cache.has('admin:1')).toBe(false);
    });

    test('should update tags when setting existing key with new tags', async () => {
      // Set key with initial tags
      await cache.set('user:1', { id: 1 }, { tags: ['users', 'active'] });

      // Update key with different tags
      await cache.set('user:1', { id: 1, updated: true }, { tags: ['users', 'inactive'] });

      // Deleting by 'active' tag should NOT delete user:1 (old tag removed)
      await cache.delete('active', { byTag: true });
      expect(await cache.has('user:1')).toBe(true);

      // Deleting by 'inactive' tag SHOULD delete user:1 (new tag applied)
      await cache.delete('inactive', { byTag: true });
      expect(await cache.has('user:1')).toBe(false);
    });
  });

  describe('key prefix', () => {
    test('should prefix all keys', async () => {
      const prefixedCache = new MemoryCacheProvider({
        provider: 'memory',
        keyPrefix: 'app',
        cleanupInterval: 0,
      });

      await prefixedCache.set('key', 'value');

      expect(await prefixedCache.get('key')).toBe('value');

      // The internal key should be prefixed
      const stats = prefixedCache.getStats();
      expect(stats.size).toBe(1);

      await prefixedCache.close();
    });
  });

  describe('statistics', () => {
    test('should track hits and misses', async () => {
      await cache.set('key', 'value');

      await cache.get('key'); // hit
      await cache.get('key'); // hit
      await cache.get('missing'); // miss

      const stats = cache.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    test('should track sets and deletes', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.delete('key1');

      const stats = cache.getStats();

      expect(stats.sets).toBe(2);
      expect(stats.deletes).toBe(1);
      expect(stats.size).toBe(1);
    });

    test('should reset statistics', async () => {
      await cache.set('key', 'value');
      await cache.get('key');

      cache.resetStats();
      const stats = cache.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.sets).toBe(0);
      expect(stats.size).toBe(1); // Size is not reset
    });
  });

  describe('clear', () => {
    test('should clear all entries', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');

      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
      expect(cache.getStats().size).toBe(0);
    });

    test('should call onEviction for cleared entries', async () => {
      const evicted: string[] = [];
      const cacheWithCallback = new MemoryCacheProvider(
        { provider: 'memory', cleanupInterval: 0 },
        { onEviction: (key) => evicted.push(key) },
      );

      await cacheWithCallback.set('key1', 'value1');
      await cacheWithCallback.set('key2', 'value2');
      await cacheWithCallback.clear();

      expect(evicted).toHaveLength(2);
      expect(evicted).toContain('key1');
      expect(evicted).toContain('key2');

      await cacheWithCallback.close();
    });
  });

  describe('healthCheck', () => {
    test('should return true', async () => {
      const healthy = await cache.healthCheck();

      expect(healthy).toBe(true);
    });
  });

  describe('memory tracking', () => {
    test('should track memory usage when enabled', async () => {
      const trackingCache = new MemoryCacheProvider({
        provider: 'memory',
        trackMemoryUsage: true,
        cleanupInterval: 0,
      });

      await trackingCache.set('key', { data: 'some value' });

      const stats = trackingCache.getStats();
      expect(stats.memoryUsage).toBeGreaterThan(0);

      await trackingCache.close();
    });
  });

  describe('cleanup timer', () => {
    test('should clean up expired entries periodically', async () => {
      vi.useFakeTimers();

      const cleanupCache = new MemoryCacheProvider({
        provider: 'memory',
        cleanupInterval: 100,
      });

      await cleanupCache.set('key', 'value', { ttl: 50 });

      // Fast forward past TTL and cleanup interval
      vi.advanceTimersByTime(150);

      // Access the key to check if it was cleaned up
      const result = await cleanupCache.get('key');
      expect(result).toBeUndefined();

      await cleanupCache.close();
      vi.useRealTimers();
    });
  });
});

// apps/server/src/infrastructure/cache/utils/lru-cache.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LRUCache } from './lru-cache';

describe('LRUCache', () => {
  describe('constructor', () => {
    it('should create cache with specified max size', () => {
      const cache = new LRUCache<string, number>(3);
      expect(cache).toBeDefined();
      expect(cache.size()).toBe(0);
    });

    it('should accept optional default TTL', () => {
      const cache = new LRUCache<string, number>(5, 1000);
      cache.set('key', 123);
      expect(cache.get('key')).toBe(123);
    });
  });

  describe('set and get', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should store and retrieve values', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing values', () => {
      cache.set('a', 1);
      cache.set('a', 10);
      expect(cache.get('a')).toBe(10);
    });

    it('should evict least recently used item when at capacity', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4); // Should evict 'a'

      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should move accessed items to front (most recently used)', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.get('a'); // Access 'a' - moves to front

      cache.set('d', 4); // Should evict 'b', not 'a'

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should move updated items to front', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.set('a', 10); // Update 'a' - moves to front

      cache.set('d', 4); // Should evict 'b', not 'a'

      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  describe('TTL and expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire items after TTL', () => {
      const cache = new LRUCache<string, number>(5, 1000);
      cache.set('a', 1);

      expect(cache.get('a')).toBe(1);

      vi.advanceTimersByTime(1001);

      expect(cache.get('a')).toBeUndefined();
    });

    it('should use custom TTL override', () => {
      const cache = new LRUCache<string, number>(5, 1000);
      cache.set('a', 1, 500); // Custom TTL

      vi.advanceTimersByTime(499);
      expect(cache.get('a')).toBe(1);

      vi.advanceTimersByTime(2);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should not expire items when no TTL is set', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);

      vi.advanceTimersByTime(10000);

      expect(cache.get('a')).toBe(1);
    });

    it('should delete expired items on access', () => {
      const cache = new LRUCache<string, number>(5, 1000);
      cache.set('a', 1);

      vi.advanceTimersByTime(1001);

      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
      expect(cache.size()).toBe(0);
    });

    it('should return false for expired items in has()', () => {
      const cache = new LRUCache<string, number>(5, 1000);
      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(cache.has('a')).toBe(false);
    });
  });

  describe('delete', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should delete existing items', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);

      const deleted = cache.delete('a');

      expect(deleted).toBe(true);
      expect(cache.has('a')).toBe(false);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should return false when deleting non-existent items', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should update size after deletion', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size()).toBe(2);

      cache.delete('a');
      expect(cache.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all items', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.size()).toBe(3);

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });

    it('should work on empty cache', () => {
      const cache = new LRUCache<string, number>(5);
      expect(() => {
        cache.clear();
      }).not.toThrow();
      expect(cache.size()).toBe(0);
    });
  });

  describe('has', () => {
    let cache: LRUCache<string, number>;

    beforeEach(() => {
      cache = new LRUCache<string, number>(3);
    });

    it('should return true for existing items', () => {
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });

    it('should return false for non-existent items', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should not move item to front', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.has('a'); // Check existence but don't access

      cache.set('d', 4); // Should still evict 'a'

      expect(cache.has('a')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct count', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.size()).toBe(0);

      cache.set('a', 1);
      expect(cache.size()).toBe(1);

      cache.set('b', 2);
      expect(cache.size()).toBe(2);

      cache.delete('a');
      expect(cache.size()).toBe(1);
    });

    it('should clean up expired entries before counting', () => {
      vi.useFakeTimers();
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size()).toBe(2);

      vi.advanceTimersByTime(1001);

      expect(cache.size()).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('keys', () => {
    it('should return all keys', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const keys = cache.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys).toContain('c');
    });

    it('should return empty array for empty cache', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.keys()).toEqual([]);
    });

    it('should clean up expired entries before returning keys', () => {
      vi.useFakeTimers();
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      cache.set('b', 2);

      vi.advanceTimersByTime(1001);

      expect(cache.keys()).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe('values', () => {
    it('should return all values', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const values = cache.values();
      expect(values).toHaveLength(3);
      expect(values).toContain(1);
      expect(values).toContain(2);
      expect(values).toContain(3);
    });

    it('should return empty array for empty cache', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.values()).toEqual([]);
    });

    it('should clean up expired entries before returning values', () => {
      vi.useFakeTimers();
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      cache.set('b', 2);

      vi.advanceTimersByTime(1001);

      expect(cache.values()).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe('entries', () => {
    it('should return all key-value pairs', () => {
      const cache = new LRUCache<string, number>(5);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const entries = cache.entries();
      expect(entries).toHaveLength(3);
      expect(entries).toContainEqual(['a', 1]);
      expect(entries).toContainEqual(['b', 2]);
      expect(entries).toContainEqual(['c', 3]);
    });

    it('should return empty array for empty cache', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.entries()).toEqual([]);
    });

    it('should clean up expired entries before returning pairs', () => {
      vi.useFakeTimers();
      const cache = new LRUCache<string, number>(5, 1000);

      cache.set('a', 1);
      cache.set('b', 2);

      vi.advanceTimersByTime(1001);

      expect(cache.entries()).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle single-item cache', () => {
      const cache = new LRUCache<string, number>(1);
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);

      cache.set('b', 2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('should handle complex types as values', () => {
      const cache = new LRUCache<string, { name: string; age: number }>(3);
      const value = { name: 'Alice', age: 30 };
      cache.set('user1', value);

      expect(cache.get('user1')).toEqual(value);
      expect(cache.get('user1')).toBe(value); // Same reference
    });

    it('should handle null and undefined values correctly', () => {
      const cache = new LRUCache<string, number | null | undefined>(3);
      cache.set('null', null);
      cache.set('undefined', undefined);

      expect(cache.has('null')).toBe(true);
      expect(cache.get('null')).toBe(null);

      expect(cache.has('undefined')).toBe(true);
      expect(cache.get('undefined')).toBe(undefined);
    });

    it('should handle number keys', () => {
      const cache = new LRUCache<number, string>(3);
      cache.set(1, 'one');
      cache.set(2, 'two');

      expect(cache.get(1)).toBe('one');
      expect(cache.get(2)).toBe('two');
    });

    it('should handle rapid successive operations', () => {
      const cache = new LRUCache<string, number>(3);

      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, i);
      }

      // Only last 3 should remain
      expect(cache.size()).toBe(3);
      expect(cache.get('key97')).toBe(97);
      expect(cache.get('key98')).toBe(98);
      expect(cache.get('key99')).toBe(99);
      expect(cache.get('key0')).toBeUndefined();
    });
  });

  describe('performance characteristics', () => {
    it('should maintain O(1) get operations', () => {
      const cache = new LRUCache<number, number>(1000);

      // Fill cache
      for (let i = 0; i < 1000; i++) {
        cache.set(i, i * 2);
      }

      // Access should be fast regardless of position
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        cache.get(i);
      }
      const duration = performance.now() - start;

      // Should complete in reasonable time (< 10ms for 100 operations)
      expect(duration).toBeLessThan(10);
    });

    it('should maintain O(1) set operations', () => {
      const cache = new LRUCache<number, number>(1000);

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        cache.set(i, i * 2);
      }
      const duration = performance.now() - start;

      // Should complete in reasonable time (< 20ms for 1000 operations)
      expect(duration).toBeLessThan(20);
    });
  });
});

// main/shared/src/system/cache/lru.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LRUCache } from './lru';

describe('LRUCache', () => {
  // ==========================================================================
  // Basic Operations
  // ==========================================================================
  describe('basic operations', () => {
    it('stores and retrieves values', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
    });

    it('returns undefined for missing keys', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      expect(cache.get('missing')).toBeUndefined();
    });

    it('overwrites existing keys', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
    });

    it('reports correct size', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      expect(cache.size()).toBe(0);
      cache.set('a', 1);
      expect(cache.size()).toBe(1);
      cache.set('b', 2);
      expect(cache.size()).toBe(2);
    });
  });

  // ==========================================================================
  // has()
  // ==========================================================================
  describe('has', () => {
    it('returns true for existing keys', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
    });

    it('returns false for missing keys', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      expect(cache.has('missing')).toBe(false);
    });
  });

  // ==========================================================================
  // delete()
  // ==========================================================================
  describe('delete', () => {
    it('removes an existing key', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.size()).toBe(0);
    });

    it('returns false for missing key', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      expect(cache.delete('missing')).toBe(false);
    });
  });

  // ==========================================================================
  // clear()
  // ==========================================================================
  describe('clear', () => {
    it('removes all items', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  // ==========================================================================
  // LRU Eviction
  // ==========================================================================
  describe('LRU eviction', () => {
    it('evicts least recently used item when max is reached', () => {
      const cache = new LRUCache<string, number>({ max: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Adding 'd' should evict 'a' (oldest)
      cache.set('d', 4);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.size()).toBe(3);
    });

    it('refreshes item on get', () => {
      const cache = new LRUCache<string, number>({ max: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recent
      cache.get('a');

      // Adding 'd' should evict 'b' (now oldest)
      cache.set('d', 4);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
    });
  });

  // ==========================================================================
  // TTL
  // ==========================================================================
  describe('TTL', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns value before TTL expires', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 1000 });
      cache.set('a', 1);
      vi.advanceTimersByTime(500);
      expect(cache.get('a')).toBe(1);
    });

    it('returns undefined after TTL expires', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 1000 });
      cache.set('a', 1);
      vi.advanceTimersByTime(1001);
      expect(cache.get('a')).toBeUndefined();
    });

    it('has() returns false for expired items', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 1000 });
      cache.set('a', 1);
      vi.advanceTimersByTime(1001);
      expect(cache.has('a')).toBe(false);
    });
  });

  // ==========================================================================
  // Dispose Callback
  // ==========================================================================
  describe('dispose callback', () => {
    it('calls dispose when evicting items', () => {
      const disposed: Array<[string, number]> = [];
      const cache = new LRUCache<string, number>({
        max: 2,
        dispose: (key, value) => disposed.push([key, value]),
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'

      expect(disposed).toEqual([['a', 1]]);
    });

    it('calls dispose when overwriting keys', () => {
      const disposed: Array<[string, number]> = [];
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: (key, value) => disposed.push([key, value]),
      });

      cache.set('a', 1);
      cache.set('a', 2); // overwrites, should dispose old value

      expect(disposed).toEqual([['a', 1]]);
    });

    it('calls dispose when deleting', () => {
      const disposed: Array<[string, number]> = [];
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: (key, value) => disposed.push([key, value]),
      });

      cache.set('a', 1);
      cache.delete('a');

      expect(disposed).toEqual([['a', 1]]);
    });

    it('calls dispose when clearing', () => {
      const disposed: Array<[string, number]> = [];
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: (key, value) => disposed.push([key, value]),
      });

      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();

      expect(disposed).toHaveLength(2);
    });
  });

  // ==========================================================================
  // Adversarial: Edge Capacity
  // ==========================================================================
  describe('adversarial: edge capacity', () => {
    it('max=1 only holds one item and evicts on second set', () => {
      const evicted: string[] = [];
      const cache = new LRUCache<string, number>({
        max: 1,
        dispose: (key) => evicted.push(key),
      });

      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
      expect(cache.size()).toBe(1);

      cache.set('b', 2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.size()).toBe(1);
      expect(evicted).toEqual(['a']);
    });

    it('max=1 overwriting same key does not evict a second entry', () => {
      const evicted: string[] = [];
      const cache = new LRUCache<string, number>({
        max: 1,
        dispose: (key) => evicted.push(key),
      });

      cache.set('a', 1);
      cache.set('a', 99);
      expect(cache.get('a')).toBe(99);
      expect(cache.size()).toBe(1);
      // dispose is called for the old value of 'a', not for a different key
      expect(evicted).toEqual(['a']);
    });

    it('max=1 get refreshes the single item so it is not immediately evicted', () => {
      const cache = new LRUCache<string, number>({ max: 1 });
      cache.set('a', 42);
      cache.get('a'); // refresh
      // Still only one item; 'a' should survive another get
      expect(cache.get('a')).toBe(42);
    });
  });

  // ==========================================================================
  // Adversarial: Storing null and undefined values
  // ==========================================================================
  describe('adversarial: storing null and undefined values', () => {
    it('stores and retrieves null values correctly', () => {
      const cache = new LRUCache<string, null>({ max: 10 });
      cache.set('key', null);
      expect(cache.has('key')).toBe(true);
      // get returns null (the stored value), not undefined (cache miss)
      expect(cache.get('key')).toBeNull();
    });

    it('distinguishes a null stored value from a cache miss', () => {
      const cache = new LRUCache<string, null | number>({ max: 10 });
      cache.set('exists', null);
      // 'exists' returns null; 'missing' returns undefined
      expect(cache.get('exists')).toBeNull();
      expect(cache.get('missing')).toBeUndefined();
    });

    it('stores and retrieves 0 (falsy number) correctly', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('zero', 0);
      expect(cache.has('zero')).toBe(true);
      expect(cache.get('zero')).toBe(0);
    });

    it('stores and retrieves empty string correctly', () => {
      const cache = new LRUCache<string, string>({ max: 10 });
      cache.set('empty', '');
      expect(cache.has('empty')).toBe(true);
      expect(cache.get('empty')).toBe('');
    });

    it('stores and retrieves false correctly', () => {
      const cache = new LRUCache<string, boolean>({ max: 10 });
      cache.set('bool', false);
      expect(cache.has('bool')).toBe(true);
      expect(cache.get('bool')).toBe(false);
    });
  });

  // ==========================================================================
  // Adversarial: Rapid set/get under eviction pressure
  // ==========================================================================
  describe('adversarial: rapid set/get under eviction pressure', () => {
    it('same key set 1000 times only occupies one slot', () => {
      const disposed: number[] = [];
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: (_, v) => disposed.push(v),
      });

      for (let i = 0; i < 1000; i++) {
        cache.set('key', i);
      }

      expect(cache.size()).toBe(1);
      expect(cache.get('key')).toBe(999);
      // dispose should have been called 999 times for the old values
      expect(disposed).toHaveLength(999);
    });

    it('filling and refilling beyond capacity keeps size at max', () => {
      const max = 5;
      const cache = new LRUCache<number, number>({ max });

      for (let i = 0; i < 100; i++) {
        cache.set(i, i * 2);
      }

      // Only last `max` keys should remain
      expect(cache.size()).toBe(max);
      // The most recently inserted keys should still be accessible
      for (let i = 99; i >= 95; i--) {
        expect(cache.get(i)).toBe(i * 2);
      }
    });

    it('interleaved get and set preserve recency ordering', () => {
      const cache = new LRUCache<string, number>({ max: 3 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to move it to most-recent
      cache.get('a');

      // Now insert 'd' — 'b' should be evicted (oldest after refresh)
      cache.set('d', 4);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  // ==========================================================================
  // Adversarial: TTL boundary conditions
  // ==========================================================================
  describe('adversarial: TTL boundary conditions', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('TTL=1ms: item expires after 1ms has passed', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 1 });
      cache.set('a', 1);
      // Exactly at boundary: Date.now() > expiry so expired
      vi.advanceTimersByTime(2);
      expect(cache.get('a')).toBeUndefined();
    });

    it('TTL=1ms: item is accessible immediately after set', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 1 });
      cache.set('a', 1);
      // No time passed — still valid
      expect(cache.get('a')).toBe(1);
    });

    it('size() excludes expired entries when TTL is configured', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 500 });
      cache.set('a', 1);
      cache.set('b', 2);
      vi.advanceTimersByTime(600);
      // Both expired; size() should return 0
      expect(cache.size()).toBe(0);
    });

    it('rawSize() includes expired entries', () => {
      const cache = new LRUCache<string, number>({ max: 10, ttl: 500 });
      cache.set('a', 1);
      cache.set('b', 2);
      vi.advanceTimersByTime(600);
      // Expired items are lazily evicted; rawSize still counts them
      expect(cache.rawSize()).toBe(2);
    });

    it('expired entry is evicted during set when cache is full', () => {
      const cache = new LRUCache<string, number>({ max: 2, ttl: 500 });
      cache.set('a', 1);
      cache.set('b', 2);

      vi.advanceTimersByTime(600); // both expired

      // Adding 'c' should find an expired entry and evict it instead of the LRU
      cache.set('c', 3);
      expect(cache.get('c')).toBe(3);
      // Only one expired entry was evicted; cache can hold up to max
      expect(cache.rawSize()).toBeLessThanOrEqual(2);
    });
  });

  // ==========================================================================
  // Adversarial: dispose callback that throws
  // ==========================================================================
  describe('adversarial: dispose callback that throws', () => {
    it('dispose throwing on eviction propagates the error', () => {
      const cache = new LRUCache<string, number>({
        max: 1,
        dispose: () => {
          throw new Error('dispose failed');
        },
      });

      cache.set('a', 1);
      // Inserting 'b' triggers eviction of 'a' which calls the throwing dispose
      expect(() => {
        cache.set('b', 2);
      }).toThrow('dispose failed');
    });

    it('dispose throwing on clear propagates the error', () => {
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: () => {
          throw new Error('dispose exploded');
        },
      });

      cache.set('a', 1);
      expect(() => {
        cache.clear();
      }).toThrow('dispose exploded');
    });

    it('dispose throwing on delete propagates the error', () => {
      const cache = new LRUCache<string, number>({
        max: 10,
        dispose: () => {
          throw new Error('dispose on delete');
        },
      });

      cache.set('a', 1);
      expect(() => cache.delete('a')).toThrow('dispose on delete');
    });
  });

  // ==========================================================================
  // Adversarial: Special character keys
  // ==========================================================================
  describe('adversarial: special character keys', () => {
    it('handles keys with spaces', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('key with spaces', 1);
      expect(cache.get('key with spaces')).toBe(1);
    });

    it('handles keys with unicode characters', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('emoji:🔥', 42);
      expect(cache.get('emoji:🔥')).toBe(42);
    });

    it('handles keys with newline and tab characters', () => {
      const cache = new LRUCache<string, string>({ max: 10 });
      cache.set('line\nnewline\ttab', 'value');
      expect(cache.get('line\nnewline\ttab')).toBe('value');
    });

    it('handles empty string as key', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('', 99);
      expect(cache.has('')).toBe(true);
      expect(cache.get('')).toBe(99);
    });

    it('handles numeric keys', () => {
      const cache = new LRUCache<number, string>({ max: 10 });
      cache.set(0, 'zero');
      cache.set(-1, 'neg');
      cache.set(Number.MAX_SAFE_INTEGER, 'max');
      expect(cache.get(0)).toBe('zero');
      expect(cache.get(-1)).toBe('neg');
      expect(cache.get(Number.MAX_SAFE_INTEGER)).toBe('max');
    });
  });

  // ==========================================================================
  // Adversarial: Very large values
  // ==========================================================================
  describe('adversarial: very large values', () => {
    it('stores a 1MB string value without corruption', () => {
      const cache = new LRUCache<string, string>({ max: 5 });
      const large = 'x'.repeat(1_000_000);
      cache.set('big', large);
      expect(cache.get('big')).toBe(large);
      expect(cache.get('big')?.length).toBe(1_000_000);
    });

    it('stores deeply nested objects', () => {
      const cache = new LRUCache<string, Record<string, unknown>>({ max: 5 });
      const nested: Record<string, unknown> = {};
      let current = nested;
      for (let i = 0; i < 100; i++) {
        const child: Record<string, unknown> = {};
        current['child'] = child;
        current = child;
      }
      cache.set('deep', nested);
      expect(cache.get('deep')).toBe(nested); // same reference
    });
  });

  // ==========================================================================
  // Adversarial: rawSize vs size
  // ==========================================================================
  describe('adversarial: rawSize vs size', () => {
    it('rawSize matches size when no TTL configured', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.rawSize()).toBe(cache.size());
    });

    it('delete reduces rawSize', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.delete('a');
      expect(cache.rawSize()).toBe(1);
    });

    it('clear reduces rawSize to zero', () => {
      const cache = new LRUCache<string, number>({ max: 10 });
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.rawSize()).toBe(0);
    });
  });
});

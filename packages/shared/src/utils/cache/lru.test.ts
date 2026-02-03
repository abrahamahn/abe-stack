// shared/src/utils/cache/lru.test.ts
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
});

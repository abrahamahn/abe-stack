// main/shared/src/utils/cache/memoize.test.ts
import { describe, expect, it, vi } from 'vitest';

import { memoize } from './memoize';

describe('memoize', () => {
  // ==========================================================================
  // Basic Caching
  // ==========================================================================
  describe('basic caching', () => {
    it('caches function results', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn as (...args: unknown[]) => unknown);

      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls function for different arguments', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn as (...args: unknown[]) => unknown);

      expect(memoized(5)).toBe(10);
      expect(memoized(10)).toBe(20);
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('handles multiple arguments', () => {
      const fn = vi.fn((a: number, b: number) => a + b);
      const memoized = memoize(fn as (...args: unknown[]) => unknown);

      expect(memoized(1, 2)).toBe(3);
      expect(memoized(1, 2)).toBe(3);
      expect(memoized(2, 3)).toBe(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Stats
  // ==========================================================================
  describe('stats', () => {
    it('tracks hits and misses', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn as (...args: unknown[]) => unknown);

      memoized(5); // miss
      memoized(5); // hit
      memoized(10); // miss
      memoized(5); // hit

      expect(memoized.stats()).toEqual({ hits: 2, misses: 2 });
    });
  });

  // ==========================================================================
  // Clear
  // ==========================================================================
  describe('clear', () => {
    it('clears cache and resets stats', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn as (...args: unknown[]) => unknown);

      memoized(5);
      memoized(5);
      memoized.clear();

      expect(memoized.stats()).toEqual({ hits: 0, misses: 0 });

      // Should call fn again after clear
      memoized(5);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Custom Resolver
  // ==========================================================================
  describe('custom resolver', () => {
    it('uses custom resolver for cache key', () => {
      const fn = vi.fn((obj: { id: number; name: string }) => obj.name.toUpperCase());
      const memoized = memoize(fn as (...args: unknown[]) => unknown, {
        resolver: (...args: unknown[]) => {
          const obj = args[0] as { id: number };
          return String(obj.id);
        },
      });

      memoized({ id: 1, name: 'alice' });
      memoized({ id: 1, name: 'bob' }); // Same id, should use cache

      expect(fn).toHaveBeenCalledTimes(1);
      expect(memoized({ id: 1, name: 'alice' })).toBe('ALICE');
    });
  });

  // ==========================================================================
  // Max Cache Size
  // ==========================================================================
  describe('max cache size', () => {
    it('evicts old entries when max is reached', () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn as (...args: unknown[]) => unknown, { max: 2 });

      memoized(1); // miss
      memoized(2); // miss
      memoized(3); // miss, evicts 1

      // 1 was evicted, calling again is a miss
      memoized(1);
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });
});

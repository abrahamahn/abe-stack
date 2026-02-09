// src/server/engine/src/cache/lru.test.ts
import { describe, expect, it, vi } from 'vitest';

import { LRUCache } from './lru';

describe('cache/lru', () => {
  it('throws when maxSize is not a positive integer', () => {
    expect(() => new LRUCache({ maxSize: 0 })).toThrow(/maxSize/);
    expect(() => new LRUCache({ maxSize: -1 })).toThrow(/maxSize/);
    expect(() => new LRUCache({ maxSize: 1.5 })).toThrow(/maxSize/);
  });

  it('evicts least recently used entries when at capacity', () => {
    const onEvict = vi.fn();
    const cache = new LRUCache<string, number>({ maxSize: 2, onEvict });

    cache.set('a', 1);
    cache.set('b', 2);

    // Make 'a' most recently used
    expect(cache.get('a')).toBe(1);

    // Insert 'c' should evict 'b'
    cache.set('c', 3);
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.has('c')).toBe(true);

    expect(onEvict).toHaveBeenCalledTimes(1);
    expect(onEvict).toHaveBeenCalledWith('b', 2, 'lru');
  });

  it('expires entries lazily on get/has and reports reason', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const onEvict = vi.fn();

    const cache = new LRUCache<string, string>({ maxSize: 10, defaultTtl: 10, onEvict });
    cache.set('k', 'v');
    expect(cache.has('k')).toBe(true);

    vi.setSystemTime(new Date('2026-01-01T00:00:00.011Z'));
    expect(cache.get('k')).toBeUndefined();
    expect(cache.has('k')).toBe(false);

    expect(onEvict).toHaveBeenCalledWith('k', 'v', 'expired');
    vi.useRealTimers();
  });
});

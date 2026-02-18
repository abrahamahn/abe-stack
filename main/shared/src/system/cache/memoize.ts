// main/shared/src/system/cache/memoize.ts
/**
 * Memoization Utilities
 *
 * Provides function memoization with configurable caching strategies (LRU, TTL).
 * Useful for caching expensive computations or API calls.
 */

import { LRUCache } from './lru';

export type MemoizeFunction<T extends (...args: unknown[]) => unknown> = T & {
  /** Clear the memoization cache */
  clear: () => void;
  /** Get cache statistics */
  stats: () => { hits: number; misses: number };
};

export interface MemoizeOptions<T extends (...args: unknown[]) => unknown> {
  /** Maximum number of cached results (default: 100) */
  max?: number;
  /** Time to live in milliseconds (optional, infinite by default) */
  ttl?: number;
  /** Custom resolver for cache key - defaults to JSON.stringify(args) */
  resolver?: (...args: Parameters<T>) => string;
}

/**
 * Creates a memoized version of a function.
 * Uses an LRU cache internally to store results.
 *
 * @param fn - The function to memoize
 * @param options - Configuration options for the cache
 * @returns A memoized version of the function with .clear() and .stats() methods
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  options?: MemoizeOptions<T>,
): MemoizeFunction<T> {
  const max = options?.max ?? 100;
  const ttl = options?.ttl;
  const resolver = options?.resolver;

  // Fix exactOptionalPropertyTypes by explicitly filtering undefined
  const cacheOptions = {
    max,
    // Just don't include ttl if it's undefined
    ...(ttl !== undefined ? { ttl } : {}),
  };

  // Wrap results in a container so we can distinguish "not cached" (undefined)
  // from a cached result whose value happens to be undefined.
  const cache = new LRUCache<string, { value: ReturnType<T> }>(cacheOptions);

  let hits = 0;
  let misses = 0;

  const memoizedFn = ((...args: Parameters<T>): ReturnType<T> => {
    const key = resolver !== undefined ? resolver(...args) : JSON.stringify(args);

    const cached = cache.get(key);
    if (cached !== undefined) {
      hits++;
      return cached.value;
    }

    misses++;
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, { value: result });
    return result;
  }) as MemoizeFunction<T>;

  memoizedFn.clear = (): void => {
    cache.clear();
    hits = 0;
    misses = 0;
  };

  memoizedFn.stats = (): { hits: number; misses: number } => ({
    hits,
    misses,
  });

  return memoizedFn;
}

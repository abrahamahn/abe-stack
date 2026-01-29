// packages/cache/src/memoize.ts
/**
 * Function Memoization Utilities
 *
 * Provides memoization with TTL, custom key generation, and LRU eviction.
 * Uses LRUCache internally for O(1) operations (replaces O(n) array-based LRU).
 *
 * Key improvements over naive memoization:
 * 1. O(1) LRU operations via doubly-linked list
 * 2. Cache stampede prevention (caches Promise, not result)
 * 3. Sliding expiration support
 */

import { LRUCache } from './lru';

import type { MemoizedFunction, MemoizeOptions, MemoizeStats } from './types';

// ============================================================================
// Memoize Function
// ============================================================================

/**
 * Internal cache entry for memoized results.
 * We store the Promise to prevent cache stampede.
 */
interface MemoEntry<T> {
  /** The cached promise (prevents cache stampede) */
  promise: Promise<T>;
  /** Expiration timestamp for sliding expiration */
  expiresAt?: number;
}

/**
 * Memoize an async function with TTL and LRU eviction.
 *
 * Uses O(1) LRU cache internally instead of O(n) array operations.
 * Caches the Promise (not the result) to prevent cache stampede.
 *
 * @param fn - The function to memoize
 * @param options - Memoization options
 * @returns A memoized function with cache control methods
 *
 * @example
 * ```ts
 * const fetchUser = memoize(
 *   async (userId: string) => {
 *     return await db.users.findById(userId);
 *   },
 *   {
 *     ttl: 60000, // 1 minute
 *     maxSize: 100,
 *     keyGenerator: (userId) => `user:${userId}`,
 *   }
 * );
 *
 * // Use the memoized function
 * const user = await fetchUser('123');
 *
 * // Invalidate specific entry
 * fetchUser.invalidate('123');
 *
 * // Clear all cached results
 * fetchUser.clear();
 *
 * // Get statistics
 * console.log(fetchUser.getStats());
 * ```
 *
 * @complexity O(1) for get/set operations
 */
export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: MemoizeOptions = {},
): MemoizedFunction<TArgs, TResult> {
  const {
    keyGenerator = defaultKeyGenerator,
    ttl,
    maxSize = 1000,
    slidingExpiration = false,
  } = options;

  // Use LRU cache for O(1) operations
  const cache = new LRUCache<string, MemoEntry<TResult>>({
    maxSize,
    // Don't use LRU's built-in TTL - we handle it manually for sliding expiration
  });

  let hits = 0;
  let misses = 0;

  // The memoized function
  const memoized = async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Check cache (O(1))
    const entry = cache.get(key);
    if (entry != null) {
      // Check if expired
      if (entry.expiresAt != null && entry.expiresAt <= now) {
        cache.delete(key);
        misses++;
      } else {
        // Cache hit
        hits++;

        // Update expiration for sliding expiration
        if (slidingExpiration && ttl != null && ttl > 0) {
          entry.expiresAt = now + ttl;
        }

        return entry.promise;
      }
    } else {
      misses++;
    }

    // Cache miss - create a new promise
    // We cache the promise immediately to prevent cache stampede
    // (multiple concurrent requests for the same key will share the same promise)
    const promise = fn(...args).catch((error: unknown) => {
      // On error, remove from cache so next call will retry
      cache.delete(key);
      throw error;
    });

    // Conditionally include expiresAt to satisfy exactOptionalPropertyTypes
    const newEntry: MemoEntry<TResult> = { promise };
    if (ttl != null && ttl > 0) {
      newEntry.expiresAt = now + ttl;
    }

    cache.set(key, newEntry);

    return promise;
  };

  // Clear all cached results
  memoized.clear = (): void => {
    cache.clear();
    hits = 0;
    misses = 0;
  };

  // Invalidate specific entry
  memoized.invalidate = (...args: TArgs): void => {
    const key = keyGenerator(...args);
    cache.delete(key);
  };

  // Get statistics
  memoized.getStats = (): MemoizeStats => {
    const total = hits + misses;
    return {
      hits,
      misses,
      size: cache.size,
      hitRate: total > 0 ? (hits / total) * 100 : 0,
    };
  };

  return memoized;
}

// ============================================================================
// Memoize Method Decorator
// ============================================================================

/**
 * Decorator factory for memoizing class methods.
 *
 * @param options - Memoization options
 * @returns A method decorator
 *
 * @example
 * ```ts
 * class UserService {
 *   @memoizeMethod({ ttl: 60000 })
 *   async getUser(id: string): Promise<User> {
 *     return await this.db.users.findById(id);
 *   }
 * }
 * ```
 */
export function memoizeMethod(options: MemoizeOptions = {}): MethodDecorator {
  return function (
    _target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as (...args: unknown[]) => Promise<unknown>;

    if (typeof originalMethod !== 'function') {
      throw new Error(`@memoizeMethod can only be applied to methods`);
    }

    // Create a WeakMap to store memoized functions per instance
    const instanceCache = new WeakMap<object, MemoizedFunction<unknown[], unknown>>();

    descriptor.value = function (this: object, ...args: unknown[]): Promise<unknown> {
      let memoizedFn = instanceCache.get(this);

      if (memoizedFn == null) {
        // Create memoized function for this instance
        const boundMethod = originalMethod.bind(this);

        // Include method name in key to avoid collisions
        const userKeyGenerator = options.keyGenerator;
        const instanceKeyGenerator =
          userKeyGenerator != null
            ? (...fnArgs: unknown[]): string =>
                `${String(propertyKey)}:${userKeyGenerator(...fnArgs)}`
            : (...fnArgs: unknown[]): string =>
                `${String(propertyKey)}:${defaultKeyGenerator(...fnArgs)}`;

        memoizedFn = memoize(boundMethod, {
          ...options,
          keyGenerator: instanceKeyGenerator,
        });

        instanceCache.set(this, memoizedFn);
      }

      return memoizedFn(...args);
    };

    return descriptor;
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Default key generator using JSON serialization.
 * Uses fast paths for primitives and single arguments.
 *
 * @param args - Function arguments
 * @returns A string key
 *
 * @complexity O(n) where n is the size of serialized arguments
 */
function defaultKeyGenerator(...args: unknown[]): string {
  if (args.length === 0) {
    return '__no_args__';
  }

  if (args.length === 1) {
    const arg = args[0];
    // Fast path for primitives
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
      return String(arg);
    }
  }

  try {
    return JSON.stringify(args);
  } catch {
    // Fallback for circular references or non-serializable values
    return args.map((arg) => String(arg)).join(':');
  }
}

/**
 * Create a key generator that uses specific argument indices.
 *
 * @param indices - Array of argument indices to use in key
 * @returns A key generator function
 *
 * @example
 * ```ts
 * const memoizedFn = memoize(fn, {
 *   keyGenerator: createArgIndexKeyGenerator([0, 2]) // Use 1st and 3rd args
 * });
 * ```
 *
 * @complexity O(m) where m is the number of indices
 */
export function createArgIndexKeyGenerator(indices: number[]): (...args: unknown[]) => string {
  return (...args: unknown[]): string => {
    const keyParts = indices.map((i) => {
      const arg = args[i];
      if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'boolean') {
        return String(arg);
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    });
    return keyParts.join(':');
  };
}

/**
 * Create a key generator that uses object property values.
 *
 * @param props - Array of property names to extract from the first argument
 * @returns A key generator function
 *
 * @example
 * ```ts
 * const memoizedFn = memoize(fn, {
 *   keyGenerator: createObjectKeyGenerator(['userId', 'type'])
 * });
 *
 * // Key will be based on arg.userId and arg.type
 * memoizedFn({ userId: '123', type: 'admin', name: 'ignored' });
 * ```
 *
 * @complexity O(p) where p is the number of properties
 */
export function createObjectKeyGenerator(props: string[]): (...args: unknown[]) => string {
  return (...args: unknown[]): string => {
    const obj = args[0] as Record<string, unknown> | undefined;
    if (obj == null || typeof obj !== 'object') {
      return defaultKeyGenerator(...args);
    }

    const keyParts = props.map((prop) => {
      const value = obj[prop];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
      }
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    });
    return keyParts.join(':');
  };
}

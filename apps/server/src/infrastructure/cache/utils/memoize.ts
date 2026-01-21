// apps/server/src/infrastructure/cache/utils/memoize.ts
/**
 * Function Memoization Utilities
 *
 * Provides memoization with TTL, custom key generation, and LRU eviction.
 */

import type { MemoizedFunction, MemoizeOptions, MemoizeStats } from '../types';

// ============================================================================
// Memoize Function
// ============================================================================

/**
 * Internal cache entry for memoized results.
 */
interface MemoEntry<T> {
  value: T;
  expiresAt?: number;
  lastAccessedAt: number;
}

/**
 * Memoize an async function with TTL and LRU eviction.
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

  const cache = new Map<string, MemoEntry<TResult>>();
  const accessOrder: string[] = []; // For LRU tracking
  let hits = 0;
  let misses = 0;

  // The memoized function
  const memoized = async (...args: TArgs): Promise<TResult> => {
    const key = keyGenerator(...args);
    const now = Date.now();

    // Check cache
    const entry = cache.get(key);
    if (entry) {
      // Check if expired
      if (entry.expiresAt && entry.expiresAt <= now) {
        cache.delete(key);
        removeFromAccessOrder(key);
        misses++;
      } else {
        // Cache hit
        hits++;

        // Update access time for sliding expiration
        if (slidingExpiration && ttl) {
          entry.expiresAt = now + ttl;
        }
        entry.lastAccessedAt = now;

        // Move to end of access order (most recently used)
        moveToEnd(key);

        return entry.value;
      }
    } else {
      misses++;
    }

    // Cache miss - execute function
    const result = await fn(...args);

    // Evict if at capacity
    while (cache.size >= maxSize && accessOrder.length > 0) {
      const lruKey = accessOrder.shift();
      if (lruKey) {
        cache.delete(lruKey);
      }
    }

    // Store result
    cache.set(key, {
      value: result,
      expiresAt: ttl ? now + ttl : undefined,
      lastAccessedAt: now,
    });
    accessOrder.push(key);

    return result;
  };

  // Helper to remove key from access order
  function removeFromAccessOrder(key: string): void {
    const index = accessOrder.indexOf(key);
    if (index !== -1) {
      accessOrder.splice(index, 1);
    }
  }

  // Helper to move key to end of access order
  function moveToEnd(key: string): void {
    removeFromAccessOrder(key);
    accessOrder.push(key);
  }

  // Clear all cached results
  memoized.clear = (): void => {
    cache.clear();
    accessOrder.length = 0;
    hits = 0;
    misses = 0;
  };

  // Invalidate specific entry
  memoized.invalidate = (...args: TArgs): void => {
    const key = keyGenerator(...args);
    cache.delete(key);
    removeFromAccessOrder(key);
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

      if (!memoizedFn) {
        // Create memoized function for this instance
        const boundMethod = originalMethod.bind(this);

        // Include instance identity in key to avoid cross-instance collisions
        const userKeyGenerator = options.keyGenerator;
        const instanceKeyGenerator = userKeyGenerator
          ? (...fnArgs: unknown[]): string => `${String(propertyKey)}:${userKeyGenerator(...fnArgs)}`
          : (...fnArgs: unknown[]): string => `${String(propertyKey)}:${defaultKeyGenerator(...fnArgs)}`;

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
 */
export function createObjectKeyGenerator(props: string[]): (...args: unknown[]) => string {
  return (...args: unknown[]): string => {
    const obj = args[0] as Record<string, unknown> | undefined;
    if (!obj || typeof obj !== 'object') {
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

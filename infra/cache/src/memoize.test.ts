// infra/cache/src/memoize.test.ts

import { describe, expect, test } from 'vitest';

import {
  createArgIndexKeyGenerator,
  createObjectKeyGenerator,
  memoize,
  memoizeMethod,
} from './memoize';

// ============================================================================
// Memoize Tests
// ============================================================================

describe('memoize', () => {
  describe('basic memoization', () => {
    test('should cache function results', async () => {
      let callCount = 0;

      const fn = memoize(async (x: number) => {
        callCount++;
        return x * 2;
      });

      expect(await fn(5)).toBe(10);
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });

    test('should cache different arguments separately', async () => {
      let callCount = 0;

      const fn = memoize(async (x: number) => {
        callCount++;
        return x * 2;
      });

      expect(await fn(5)).toBe(10);
      expect(await fn(10)).toBe(20);
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(2);
    });

    test('should handle multiple arguments', async () => {
      let callCount = 0;

      const fn = memoize(async (a: number, b: number) => {
        await Promise.resolve();
        callCount++;
        return a + b;
      });

      expect(await fn(1, 2)).toBe(3);
      expect(await fn(1, 2)).toBe(3);
      expect(await fn(2, 1)).toBe(3);
      expect(callCount).toBe(2); // Different argument order = different key
    });

    test('should handle object arguments', async () => {
      let callCount = 0;

      const fn = memoize(async (obj: { id: number }) => {
        await Promise.resolve();
        callCount++;
        return obj.id * 2;
      });

      expect(await fn({ id: 5 })).toBe(10);
      expect(await fn({ id: 5 })).toBe(10);
      expect(callCount).toBe(1);
    });

    test('should handle no arguments', async () => {
      let callCount = 0;

      const fn = memoize(async () => {
        await Promise.resolve();
        callCount++;
        return 'result';
      });

      expect(await fn()).toBe('result');
      expect(await fn()).toBe('result');
      expect(callCount).toBe(1);
    });
  });

  describe('cache stampede prevention', () => {
    test('should prevent multiple concurrent calls for same key', async () => {
      let callCount = 0;

      const fn = memoize(async (x: number) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return x * 2;
      });

      // Call 3 times concurrently with same args
      const [result1, result2, result3] = await Promise.all([fn(5), fn(5), fn(5)]);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(result3).toBe(10);
      expect(callCount).toBe(1); // Only one actual call
    });
  });

  describe('error handling', () => {
    test('should remove failed entries from cache', async () => {
      let callCount = 0;
      let shouldFail = true;

      const fn = memoize(async (x: number) => {
        callCount++;
        if (shouldFail) {
          throw new Error('Intentional failure');
        }
        return x * 2;
      });

      // First call should fail
      await expect(fn(5)).rejects.toThrow('Intentional failure');
      expect(callCount).toBe(1);

      // Second call should retry (not cached because it failed)
      shouldFail = false;
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(2);

      // Third call should be cached
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(2);
    });
  });

  describe('TTL expiration', () => {
    test('should expire entries after TTL', async () => {
      let callCount = 0;

      const fn = memoize(
        async (x: number) => {
          callCount++;
          return x * 2;
        },
        { ttl: 50 },
      );

      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(2);
    });

    test('should support sliding expiration', async () => {
      let callCount = 0;

      const fn = memoize(
        async (x: number) => {
          callCount++;
          return x * 2;
        },
        { ttl: 100, slidingExpiration: true },
      );

      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);

      // Access at 50ms, should extend TTL
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);

      // Access at 100ms (50ms since last access), should still be cached
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(await fn(5)).toBe(10);
      expect(callCount).toBe(1);
    });
  });

  describe('LRU eviction', () => {
    test('should evict LRU entries when at capacity', async () => {
      let callCount = 0;

      const fn = memoize(
        async (x: number) => {
          callCount++;
          return x * 2;
        },
        { maxSize: 3 },
      );

      await fn(1);
      await fn(2);
      await fn(3);
      expect(callCount).toBe(3);

      // Access 1 to make it more recently used
      await fn(1);
      expect(callCount).toBe(3);

      // Add new entry, should evict 2 (LRU)
      await fn(4);
      expect(callCount).toBe(4);

      // 1 should still be cached
      await fn(1);
      expect(callCount).toBe(4);

      // 2 should be re-fetched
      await fn(2);
      expect(callCount).toBe(5);
    });
  });

  describe('custom key generator', () => {
    test('should use custom key generator', async () => {
      let callCount = 0;

      type User = { id: string; name: string };
      const fn = memoize<[User], string>(
        async (user: User) => {
          await Promise.resolve();
          callCount++;
          return user.name.toUpperCase();
        },
        {
          keyGenerator: ((...args: unknown[]) => (args[0] as User).id) as (
            ...args: unknown[]
          ) => string,
        },
      );

      expect(await fn({ id: '1', name: 'alice' })).toBe('ALICE');
      expect(await fn({ id: '1', name: 'bob' })).toBe('ALICE'); // Same id, cached
      expect(await fn({ id: '2', name: 'charlie' })).toBe('CHARLIE');
      expect(callCount).toBe(2);
    });
  });

  describe('cache control methods', () => {
    test('should clear all cached results', async () => {
      let callCount = 0;

      const fn = memoize(async (x: number) => {
        callCount++;
        return x * 2;
      });

      await fn(1);
      await fn(2);
      expect(callCount).toBe(2);

      fn.clear();

      await fn(1);
      await fn(2);
      expect(callCount).toBe(4);
    });

    test('should invalidate specific entry', async () => {
      let callCount = 0;

      const fn = memoize(async (x: number) => {
        callCount++;
        return x * 2;
      });

      await fn(1);
      await fn(2);
      expect(callCount).toBe(2);

      fn.invalidate(1);

      await fn(1);
      await fn(2);
      expect(callCount).toBe(3); // Only 1 was invalidated
    });

    test('should return statistics', async () => {
      const fn = memoize(async (x: number) => {
        await Promise.resolve();
        return x * 2;
      });

      await fn(1); // miss
      await fn(1); // hit
      await fn(2); // miss
      await fn(1); // hit

      const stats = fn.getStats();

      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.size).toBe(2);
      expect(stats.hitRate).toBe(50);
    });
  });
});

// ============================================================================
// Memoize Method Decorator Tests
// ============================================================================

describe('memoizeMethod', () => {
  // Note: Decorator tests are limited because TypeScript 5.x decorator syntax
  // has different runtime behavior. The memoizeMethod decorator is designed
  // for legacy decorator syntax (experimentalDecorators: true).

  test('memoizeMethod should be a function', () => {
    expect(typeof memoizeMethod).toBe('function');
  });

  test('memoizeMethod should return a decorator function', () => {
    const decorator = memoizeMethod();
    expect(typeof decorator).toBe('function');
  });

  test('memoizeMethod should accept options', () => {
    const decorator = memoizeMethod({ ttl: 1000, maxSize: 100 });
    expect(typeof decorator).toBe('function');
  });
});

// ============================================================================
// Key Generator Utilities Tests
// ============================================================================

describe('createArgIndexKeyGenerator', () => {
  test('should use specific argument indices', () => {
    const keyGen = createArgIndexKeyGenerator([0, 2]);

    expect(keyGen('a', 'b', 'c')).toBe('a:c');
    expect(keyGen(1, 2, 3)).toBe('1:3');
  });

  test('should handle objects', () => {
    const keyGen = createArgIndexKeyGenerator([0]);

    expect(keyGen({ id: 1 })).toBe('{"id":1}');
  });

  test('should handle missing indices', () => {
    const keyGen = createArgIndexKeyGenerator([0, 5]);

    // When an index is missing, the value is undefined which becomes empty string
    const result = keyGen('a', 'b');
    expect(result).toContain('a');
    // The key should still be generated even with missing indices
    expect(typeof result).toBe('string');
  });
});

describe('createObjectKeyGenerator', () => {
  test('should use object properties', () => {
    const keyGen = createObjectKeyGenerator(['id', 'type']);

    expect(keyGen({ id: '123', type: 'user', name: 'ignored' })).toBe('123:user');
  });

  test('should handle missing properties', () => {
    const keyGen = createObjectKeyGenerator(['id', 'missing']);

    const result = keyGen({ id: '123' });
    expect(result).toContain('123');
    // Missing properties result in empty string in the key
    expect(typeof result).toBe('string');
  });

  test('should handle nested objects', () => {
    const keyGen = createObjectKeyGenerator(['data']);

    expect(keyGen({ data: { nested: true } })).toBe('{"nested":true}');
  });

  test('should fallback for non-objects', () => {
    const keyGen = createObjectKeyGenerator(['id']);

    // For non-objects, should fallback to default key generator which
    // JSON-stringifies all arguments
    const result = keyGen('not an object');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

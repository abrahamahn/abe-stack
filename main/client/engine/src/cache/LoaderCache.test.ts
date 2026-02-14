// main/client/engine/src/cache/LoaderCache.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { Loader, LoaderCache, loadWithCache } from './LoaderCache';

describe('Loader', () => {
  describe('constructor', () => {
    it('should create a loader in pending state', () => {
      const loader = new Loader<string>();

      expect(loader.state).toBe('pending');
      expect(loader.isPending).toBe(true);
      expect(loader.isResolved).toBe(false);
      expect(loader.isRejected).toBe(false);
      expect(loader.isSettled).toBe(false);
    });

    it('should expose a promise', () => {
      const loader = new Loader<string>();

      expect(loader.promise).toBeInstanceOf(Promise);
    });

    it('should use default TTL when not specified', () => {
      const loader = new Loader<string>();

      // Default TTL is 5 minutes (300000ms)
      expect(loader.ttlMs).toBe(300000);
    });

    it('should use custom TTL when specified', () => {
      const loader = new Loader<string>({ ttlMs: 10000 });

      expect(loader.ttlMs).toBe(10000);
    });

    it('should record creation time', () => {
      const before = Date.now();
      const loader = new Loader<string>();
      const after = Date.now();

      expect(loader.createdAt).toBeGreaterThanOrEqual(before);
      expect(loader.createdAt).toBeLessThanOrEqual(after);
    });
  });

  describe('resolve', () => {
    it('should resolve the promise with the value', async () => {
      const loader = new Loader<string>();

      loader.resolve('test-value');

      const result = await loader.promise;
      expect(result).toBe('test-value');
    });

    it('should update state to resolved', () => {
      const loader = new Loader<string>();

      loader.resolve('test-value');

      expect(loader.state).toBe('resolved');
      expect(loader.isResolved).toBe(true);
      expect(loader.isPending).toBe(false);
      expect(loader.isSettled).toBe(true);
    });

    it('should store the resolved value', () => {
      const loader = new Loader<string>();

      loader.resolve('test-value');

      expect(loader.value).toBe('test-value');
    });

    it('should ignore subsequent resolve calls', async () => {
      const loader = new Loader<string>();

      loader.resolve('first');
      loader.resolve('second');

      expect(loader.value).toBe('first');
      expect(await loader.promise).toBe('first');
    });

    it('should ignore resolve if already rejected', async () => {
      const loader = new Loader<string>();

      loader.reject(new Error('test error'));
      loader.resolve('value');

      expect(loader.isRejected).toBe(true);
      expect(loader.value).toBeUndefined();
      await expect(loader.promise).rejects.toThrow('test error');
    });
  });

  describe('reject', () => {
    it('should reject the promise with the error', async () => {
      const loader = new Loader<string>();
      const error = new Error('test error');

      loader.reject(error);

      await expect(loader.promise).rejects.toThrow('test error');
    });

    it('should update state to rejected', () => {
      const loader = new Loader<string>();
      // Prevent unhandled rejection
      loader.promise.catch(() => {});

      loader.reject(new Error('test error'));

      expect(loader.state).toBe('rejected');
      expect(loader.isRejected).toBe(true);
      expect(loader.isPending).toBe(false);
      expect(loader.isSettled).toBe(true);
    });

    it('should store the rejection error', () => {
      const loader = new Loader<string>();
      // Prevent unhandled rejection
      loader.promise.catch(() => {});
      const error = new Error('test error');

      loader.reject(error);

      expect(loader.error).toBe(error);
    });

    it('should ignore subsequent reject calls', async () => {
      const loader = new Loader<string>();
      // Prevent unhandled rejection during the reject calls
      const promiseToTest = loader.promise;

      loader.reject(new Error('first'));
      loader.reject(new Error('second'));

      expect(loader.error?.message).toBe('first');
      await expect(promiseToTest).rejects.toThrow('first');
    });

    it('should ignore reject if already resolved', async () => {
      const loader = new Loader<string>();

      loader.resolve('value');
      loader.reject(new Error('error'));

      expect(loader.isResolved).toBe(true);
      expect(loader.error).toBeUndefined();
      // Await to ensure the promise is settled
      await loader.promise;
    });
  });

  describe('TTL and staleness', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should not be stale immediately after creation', () => {
      const loader = new Loader<string>({ ttlMs: 1000 });

      expect(loader.isStale).toBe(false);
    });

    it('should become stale after TTL expires', () => {
      const loader = new Loader<string>({ ttlMs: 1000 });

      vi.advanceTimersByTime(1001);

      expect(loader.isStale).toBe(true);
    });

    it('should report time remaining correctly', () => {
      const loader = new Loader<string>({ ttlMs: 1000 });

      expect(loader.timeRemaining).toBe(1000);

      vi.advanceTimersByTime(300);
      expect(loader.timeRemaining).toBe(700);

      vi.advanceTimersByTime(700);
      expect(loader.timeRemaining).toBe(0);

      vi.advanceTimersByTime(100);
      expect(loader.timeRemaining).toBe(0);
    });
  });

  describe('multiple consumers', () => {
    it('should allow multiple consumers to await the same promise', async () => {
      const loader = new Loader<number>();

      const consumer1 = loader.promise;
      const consumer2 = loader.promise;
      const consumer3 = loader.promise;

      loader.resolve(42);

      const results = await Promise.all([consumer1, consumer2, consumer3]);
      expect(results).toEqual([42, 42, 42]);
    });

    it('should allow consumers to await after resolution', async () => {
      const loader = new Loader<number>();

      loader.resolve(42);

      // Await after resolution
      const result = await loader.promise;
      expect(result).toBe(42);
    });
  });
});

describe('LoaderCache', () => {
  describe('constructor', () => {
    it('should create an empty cache', () => {
      const cache = new LoaderCache<string>();

      expect(cache.size).toBe(0);
    });

    it('should use default TTL when not specified', () => {
      const cache = new LoaderCache<string>();
      const loader = cache.create('key');

      expect(loader.ttlMs).toBe(300000);
    });

    it('should use custom default TTL when specified', () => {
      const cache = new LoaderCache<string>({ defaultTtlMs: 10000 });
      const loader = cache.create('key');

      expect(loader.ttlMs).toBe(10000);
    });
  });

  describe('create', () => {
    it('should create a new loader for a key', () => {
      const cache = new LoaderCache<string>();

      const loader = cache.create('key');

      expect(loader).toBeInstanceOf(Loader);
      expect(cache.size).toBe(1);
    });

    it('should replace existing loader when creating with same key', () => {
      const cache = new LoaderCache<string>();

      const loader1 = cache.create('key');
      loader1.resolve('first');

      const loader2 = cache.create('key');

      expect(loader2).not.toBe(loader1);
      expect(loader2.isPending).toBe(true);
      expect(cache.size).toBe(1);
    });

    it('should allow custom TTL per loader', () => {
      const cache = new LoaderCache<string>({ defaultTtlMs: 60000 });

      const loader = cache.create('key', { ttlMs: 5000 });

      expect(loader.ttlMs).toBe(5000);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent keys', () => {
      const cache = new LoaderCache<string>();

      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should return existing loader', () => {
      const cache = new LoaderCache<string>();
      const loader = cache.create('key');

      expect(cache.get('key')).toBe(loader);
    });

    describe('with autoEvictStale', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should return stale loader when autoEvictStale is false', () => {
        const cache = new LoaderCache<string>({
          defaultTtlMs: 1000,
          autoEvictStale: false,
        });
        const loader = cache.create('key');

        vi.advanceTimersByTime(2000);

        expect(cache.get('key')).toBe(loader);
        expect(cache.size).toBe(1);
      });

      it('should auto-evict stale loader when autoEvictStale is true (default)', () => {
        const cache = new LoaderCache<string>({ defaultTtlMs: 1000 });
        cache.create('key');

        vi.advanceTimersByTime(2000);

        expect(cache.get('key')).toBeUndefined();
        expect(cache.size).toBe(0);
      });
    });
  });

  describe('has', () => {
    it('should return false for non-existent keys', () => {
      const cache = new LoaderCache<string>();

      expect(cache.has('non-existent')).toBe(false);
    });

    it('should return true for existing keys', () => {
      const cache = new LoaderCache<string>();
      cache.create('key');

      expect(cache.has('key')).toBe(true);
    });

    describe('with autoEvictStale', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should return false for stale keys when autoEvictStale is true', () => {
        const cache = new LoaderCache<string>({ defaultTtlMs: 1000 });
        cache.create('key');

        vi.advanceTimersByTime(2000);

        expect(cache.has('key')).toBe(false);
      });
    });
  });

  describe('getOrCreate', () => {
    it('should return existing loader if available', () => {
      const cache = new LoaderCache<string>();
      const existing = cache.create('key');

      const result = cache.getOrCreate('key');

      expect(result.loader).toBe(existing);
      expect(result.created).toBe(false);
    });

    it('should create new loader if none exists', () => {
      const cache = new LoaderCache<string>();

      const result = cache.getOrCreate('key');

      expect(result.loader).toBeInstanceOf(Loader);
      expect(result.created).toBe(true);
    });

    it('should create new loader if existing is stale', () => {
      vi.useFakeTimers();

      const cache = new LoaderCache<string>({ defaultTtlMs: 1000 });
      cache.create('key');

      vi.advanceTimersByTime(2000);

      const result = cache.getOrCreate('key');

      expect(result.created).toBe(true);

      vi.useRealTimers();
    });

    it('should pass options to new loader', () => {
      const cache = new LoaderCache<string>({ defaultTtlMs: 60000 });

      const result = cache.getOrCreate('key', { ttlMs: 5000 });

      expect(result.loader.ttlMs).toBe(5000);
    });
  });

  describe('delete', () => {
    it('should remove loader from cache', () => {
      const cache = new LoaderCache<string>();
      cache.create('key');

      const deleted = cache.delete('key');

      expect(deleted).toBe(true);
      expect(cache.has('key')).toBe(false);
      expect(cache.size).toBe(0);
    });

    it('should return false for non-existent keys', () => {
      const cache = new LoaderCache<string>();

      const deleted = cache.delete('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('invalidate', () => {
    it('should be an alias for delete', () => {
      const cache = new LoaderCache<string>();
      cache.create('key');

      const invalidated = cache.invalidate('key');

      expect(invalidated).toBe(true);
      expect(cache.has('key')).toBe(false);
    });
  });

  describe('invalidateWhere', () => {
    it('should invalidate entries matching predicate', () => {
      const cache = new LoaderCache<string>();
      cache.create('user:1');
      cache.create('user:2');
      cache.create('post:1');
      cache.create('post:2');

      const count = cache.invalidateWhere((key) => key.startsWith('user:'));

      expect(count).toBe(2);
      expect(cache.has('user:1')).toBe(false);
      expect(cache.has('user:2')).toBe(false);
      expect(cache.has('post:1')).toBe(true);
      expect(cache.has('post:2')).toBe(true);
    });

    it('should return 0 when no entries match', () => {
      const cache = new LoaderCache<string>();
      cache.create('key1');
      cache.create('key2');

      const count = cache.invalidateWhere((key) => key.startsWith('x:'));

      expect(count).toBe(0);
      expect(cache.size).toBe(2);
    });
  });

  describe('invalidateByPrefix', () => {
    it('should invalidate entries with matching prefix', () => {
      const cache = new LoaderCache<string>();
      cache.create('api:users:1');
      cache.create('api:users:2');
      cache.create('api:posts:1');
      cache.create('cache:settings');

      const count = cache.invalidateByPrefix('api:users:');

      expect(count).toBe(2);
      expect(cache.has('api:users:1')).toBe(false);
      expect(cache.has('api:users:2')).toBe(false);
      expect(cache.has('api:posts:1')).toBe(true);
      expect(cache.has('cache:settings')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      const cache = new LoaderCache<string>();
      cache.create('key1');
      cache.create('key2');
      cache.create('key3');

      cache.clear();

      expect(cache.size).toBe(0);
    });
  });

  describe('evictStale', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove all stale entries', () => {
      const cache = new LoaderCache<string>({ autoEvictStale: false });

      cache.create('stale1', { ttlMs: 1000 });
      cache.create('stale2', { ttlMs: 1000 });
      cache.create('fresh1', { ttlMs: 5000 });
      cache.create('fresh2', { ttlMs: 5000 });

      vi.advanceTimersByTime(2000);

      const count = cache.evictStale();

      expect(count).toBe(2);
      expect(cache.has('stale1')).toBe(false);
      expect(cache.has('stale2')).toBe(false);
      expect(cache.has('fresh1')).toBe(true);
      expect(cache.has('fresh2')).toBe(true);
    });

    it('should return 0 when no entries are stale', () => {
      const cache = new LoaderCache<string>();
      cache.create('key1');
      cache.create('key2');

      const count = cache.evictStale();

      expect(count).toBe(0);
    });
  });

  describe('iteration methods', () => {
    it('keys() should return all keys', () => {
      const cache = new LoaderCache<string>();
      cache.create('key1');
      cache.create('key2');
      cache.create('key3');

      const keys = cache.keys();

      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('values() should return all loaders', () => {
      const cache = new LoaderCache<string>();
      const loader1 = cache.create('key1');
      const loader2 = cache.create('key2');

      const values = cache.values();

      expect(values).toEqual([loader1, loader2]);
    });

    it('entries() should return all key-loader pairs', () => {
      const cache = new LoaderCache<string>();
      const loader1 = cache.create('key1');
      const loader2 = cache.create('key2');

      const entries = cache.entries();

      expect(entries).toEqual([
        ['key1', loader1],
        ['key2', loader2],
      ]);
    });

    it('forEach() should iterate over all entries', () => {
      const cache = new LoaderCache<string>();
      cache.create('key1');
      cache.create('key2');

      const visited: string[] = [];
      cache.forEach((_loader, key) => visited.push(key));

      expect(visited).toEqual(['key1', 'key2']);
    });
  });

  describe('request deduplication', () => {
    it('should share promise between concurrent requests', async () => {
      const cache = new LoaderCache<string>();
      let fetchCount = 0;

      function fetchData(key: string): Promise<string> {
        const { loader, created } = cache.getOrCreate(key);

        if (created) {
          fetchCount++;
          // Simulate async fetch
          setTimeout(() => {
            loader.resolve(`data-${key}`);
          }, 100);
        }

        return loader.promise;
      }

      // Start multiple concurrent requests for same key
      const promises = [fetchData('test'), fetchData('test'), fetchData('test')];

      const results = await Promise.all(promises);

      expect(results).toEqual(['data-test', 'data-test', 'data-test']);
      expect(fetchCount).toBe(1); // Only one actual fetch
    });
  });
});

describe('loadWithCache', () => {
  it('should load data and cache result', async () => {
    const cache = new LoaderCache<string>();
    let loadCount = 0;

    const loader = () => {
      loadCount++;
      return Promise.resolve('data');
    };

    const result = await loadWithCache(cache, 'key', loader);

    expect(result).toBe('data');
    expect(loadCount).toBe(1);
    expect(cache.has('key')).toBe(true);
  });

  it('should return cached result on subsequent calls', async () => {
    const cache = new LoaderCache<string>();
    let loadCount = 0;

    const loader = () => {
      loadCount++;
      return Promise.resolve('data');
    };

    await loadWithCache(cache, 'key', loader);
    await loadWithCache(cache, 'key', loader);
    await loadWithCache(cache, 'key', loader);

    expect(loadCount).toBe(1);
  });

  it('should handle loader errors', async () => {
    const cache = new LoaderCache<string>();

    const loader = () => {
      return Promise.reject(new Error('load failed'));
    };

    await expect(loadWithCache(cache, 'key', loader)).rejects.toThrow('load failed');
  });

  it('should convert non-Error rejections to Error', async () => {
    const cache = new LoaderCache<string>();

    const loader = (): Promise<string> => {
      // Create a non-Error object to test handling of non-standard rejections
      // At runtime this is not instanceof Error, testing the fallback error path
      const nonErrorException = Object.assign(Object.create(null), {
        message: 'string error',
      }) as Error;
      return Promise.reject(nonErrorException);
    };

    await expect(loadWithCache(cache, 'key', loader)).rejects.toThrow('string error');
  });

  it('should pass options to loader', async () => {
    const cache = new LoaderCache<string>({ defaultTtlMs: 60000 });

    await loadWithCache(cache, 'key', () => Promise.resolve('data'), { ttlMs: 5000 });

    const loader = cache.get('key');
    expect(loader?.ttlMs).toBe(5000);
  });

  it('should deduplicate concurrent requests', async () => {
    const cache = new LoaderCache<string>();
    let loadCount = 0;

    const loader = async () => {
      loadCount++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'data';
    };

    const promises = [
      loadWithCache(cache, 'key', loader),
      loadWithCache(cache, 'key', loader),
      loadWithCache(cache, 'key', loader),
    ];

    const results = await Promise.all(promises);

    expect(results).toEqual(['data', 'data', 'data']);
    expect(loadCount).toBe(1);
  });
});

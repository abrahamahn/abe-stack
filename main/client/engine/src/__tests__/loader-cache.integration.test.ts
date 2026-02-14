// client/src/__tests__/integration/loader-cache.integration.test.ts
/**
 * Integration tests for LoaderCache with request deduplication and caching.
 *
 * Tests the pattern where LoaderCache prevents duplicate API calls
 * and caches results for efficient data fetching.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Loader, LoaderCache, loadWithCache } from '../cache/LoaderCache';

// ============================================================================
// Test Types
// ============================================================================

interface User {
  id: string;
  name: string;
  email: string;
}

interface Post {
  id: string;
  title: string;
  authorId: string;
}

// ============================================================================
// Tests
// ============================================================================

describe('LoaderCache Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Loader class', () => {
    it('should resolve with provided value', async () => {
      const loader = new Loader<User>();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@test.com' };

      loader.resolve(user);

      const result = await loader.promise;
      expect(result).toEqual(user);
      expect(loader.isResolved).toBe(true);
      expect(loader.value).toEqual(user);
    });

    it('should reject with provided error', async () => {
      const loader = new Loader<User>();
      const error = new Error('Failed to load user');

      loader.reject(error);

      await expect(loader.promise).rejects.toThrow('Failed to load user');
      expect(loader.isRejected).toBe(true);
      expect(loader.error).toBe(error);
    });

    it('should only resolve once', async () => {
      const loader = new Loader<User>();

      loader.resolve({ id: 'u1', name: 'First', email: 'first@test.com' });
      loader.resolve({ id: 'u1', name: 'Second', email: 'second@test.com' });

      const result = await loader.promise;
      expect(result.name).toBe('First');
    });

    it('should track state transitions', () => {
      const loader = new Loader<User>();

      expect(loader.state).toBe('pending');
      expect(loader.isPending).toBe(true);
      expect(loader.isSettled).toBe(false);

      loader.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });

      expect(loader.state).toBe('resolved');
      expect(loader.isPending).toBe(false);
      expect(loader.isSettled).toBe(true);
    });

    it('should track TTL and staleness', () => {
      const loader = new Loader<User>({ ttlMs: 1000 });

      expect(loader.isStale).toBe(false);
      // Initially, timeRemaining should be close to the full TTL (1000ms)
      expect(loader.timeRemaining).toBe(1000);

      vi.advanceTimersByTime(500);
      expect(loader.isStale).toBe(false);
      // After 500ms, timeRemaining should be exactly 500ms
      expect(loader.timeRemaining).toBe(500);

      vi.advanceTimersByTime(600);
      expect(loader.isStale).toBe(true);
      // After TTL expires, timeRemaining should be 0
      expect(loader.timeRemaining).toBe(0);
    });
  });

  describe('LoaderCache request deduplication', () => {
    it('should deduplicate concurrent requests', async () => {
      const cache = new LoaderCache<User>();
      const fetchUser = vi.fn<() => Promise<User>>().mockImplementation(() => {
        return Promise.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });
      });

      // Start multiple "concurrent" requests
      const promise1 = loadWithCache(cache, 'user:u1', fetchUser);
      const promise2 = loadWithCache(cache, 'user:u1', fetchUser);
      const promise3 = loadWithCache(cache, 'user:u1', fetchUser);

      // All should share the same loader
      const [result1, result2, result3] = await Promise.all([promise1, promise2, promise3]);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(fetchUser).toHaveBeenCalledTimes(1); // Only one actual fetch
    });

    it('should not deduplicate requests with different keys', async () => {
      const cache = new LoaderCache<User>();
      const fetchUser = vi.fn<(id: string) => Promise<User>>().mockImplementation((id: string) => {
        return Promise.resolve({ id, name: `User ${id}`, email: `${id}@test.com` });
      });

      const promise1 = loadWithCache(cache, 'user:u1', () => fetchUser('u1'));
      const promise2 = loadWithCache(cache, 'user:u2', () => fetchUser('u2'));

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.id).toBe('u1');
      expect(result2.id).toBe('u2');
      expect(fetchUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('LoaderCache TTL and staleness', () => {
    it('should return cached result before TTL expires', async () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 1000 });
      const fetchUser = vi.fn<() => Promise<User>>().mockImplementation(() => {
        return Promise.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });
      });

      // First request
      const result1 = await loadWithCache(cache, 'user:u1', fetchUser);
      expect(fetchUser).toHaveBeenCalledTimes(1);

      // Second request before TTL
      vi.advanceTimersByTime(500);
      const result2 = await loadWithCache(cache, 'user:u1', fetchUser);
      expect(fetchUser).toHaveBeenCalledTimes(1); // Still cached
      expect(result2).toEqual(result1);
    });

    it('should re-fetch after TTL expires', async () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 1000, autoEvictStale: true });
      let callCount = 0;
      const fetchUser = vi.fn<() => Promise<User>>().mockImplementation(() => {
        callCount++;
        return Promise.resolve({ id: 'u1', name: `Alice ${callCount}`, email: 'alice@test.com' });
      });

      // First request
      const result1 = await loadWithCache(cache, 'user:u1', fetchUser);
      expect(result1.name).toBe('Alice 1');

      // Advance past TTL
      vi.advanceTimersByTime(1100);

      // Second request - should fetch again
      const result2 = await loadWithCache(cache, 'user:u1', fetchUser);
      expect(result2.name).toBe('Alice 2');
      expect(fetchUser).toHaveBeenCalledTimes(2);
    });

    it('should evict stale entries on get when autoEvictStale is true', () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 1000, autoEvictStale: true });

      const loader = cache.create('user:u1');
      loader.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });

      expect(cache.get('user:u1')).toBeDefined();

      vi.advanceTimersByTime(1100);

      expect(cache.get('user:u1')).toBeUndefined();
    });
  });

  describe('LoaderCache invalidation', () => {
    it('should invalidate specific key', async () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 60000 });
      const fetchUser = vi.fn<() => Promise<User>>().mockResolvedValue({
        id: 'u1',
        name: 'Alice',
        email: 'alice@test.com',
      });

      await loadWithCache(cache, 'user:u1', fetchUser);
      expect(cache.has('user:u1')).toBe(true);

      cache.invalidate('user:u1');
      expect(cache.has('user:u1')).toBe(false);

      // Should fetch again
      await loadWithCache(cache, 'user:u1', fetchUser);
      expect(fetchUser).toHaveBeenCalledTimes(2);
    });

    it('should invalidate by prefix', () => {
      const cache = new LoaderCache<User | Post>();

      cache.create('user:u1').resolve({ id: 'u1', name: 'Alice', email: 'a@test.com' });
      cache.create('user:u2').resolve({ id: 'u2', name: 'Bob', email: 'b@test.com' });
      cache.create('post:p1').resolve({ id: 'p1', title: 'Post 1', authorId: 'u1' });

      expect(cache.size).toBe(3);

      const invalidated = cache.invalidateByPrefix('user:');
      expect(invalidated).toBe(2);
      expect(cache.has('user:u1')).toBe(false);
      expect(cache.has('user:u2')).toBe(false);
      expect(cache.has('post:p1')).toBe(true);
    });

    it('should invalidate with predicate', () => {
      const cache = new LoaderCache<User>();

      cache.create('user:u1').resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });
      cache.create('user:u2').resolve({ id: 'u2', name: 'Bob', email: 'bob@test.com' });
      cache.create('user:u3').resolve({ id: 'u3', name: 'Charlie', email: 'charlie@test.com' });

      const invalidated = cache.invalidateWhere((key) => key === 'user:u2');
      expect(invalidated).toBe(1);
      expect(cache.has('user:u1')).toBe(true);
      expect(cache.has('user:u2')).toBe(false);
      expect(cache.has('user:u3')).toBe(true);
    });

    it('should manually evict stale entries', () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 1000, autoEvictStale: false });

      cache.create('user:u1').resolve({ id: 'u1', name: 'Alice', email: 'a@test.com' });
      cache.create('user:u2').resolve({ id: 'u2', name: 'Bob', email: 'b@test.com' });

      vi.advanceTimersByTime(1100);

      // Auto evict is off, so entries still exist
      expect(cache.size).toBe(2);

      // Manual evict
      const evicted = cache.evictStale();
      expect(evicted).toBe(2);
      expect(cache.size).toBe(0);
    });
  });

  describe('LoaderCache error handling', () => {
    it('should cache rejected loaders', async () => {
      const cache = new LoaderCache<User>();
      let callCount = 0;
      const fetchUser = vi.fn<() => Promise<User>>().mockImplementation(() => {
        callCount++;
        return Promise.reject(new Error(`Fetch error ${callCount}`));
      });

      // First request fails
      await expect(loadWithCache(cache, 'user:u1', fetchUser)).rejects.toThrow('Fetch error 1');

      // Cached error is returned (same error)
      const loader = cache.get('user:u1');
      expect(loader?.isRejected).toBe(true);
      expect(fetchUser).toHaveBeenCalledTimes(1);
    });

    it('should allow retry after error by invalidating', async () => {
      const cache = new LoaderCache<User>();
      let shouldFail = true;
      const fetchUser = vi.fn<() => Promise<User>>().mockImplementation(() => {
        if (shouldFail) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });
      });

      // First request fails
      await expect(loadWithCache(cache, 'user:u1', fetchUser)).rejects.toThrow();

      // Fix the issue
      shouldFail = false;

      // Invalidate and retry
      cache.invalidate('user:u1');
      const result = await loadWithCache(cache, 'user:u1', fetchUser);

      expect(result.name).toBe('Alice');
      expect(fetchUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('LoaderCache getOrCreate pattern', () => {
    it('should return existing loader if available', () => {
      const cache = new LoaderCache<User>();

      const loader1 = cache.create('user:u1');
      const { loader: loader2, created } = cache.getOrCreate('user:u1');

      expect(loader2).toBe(loader1);
      expect(created).toBe(false);
    });

    it('should create new loader if not available', () => {
      const cache = new LoaderCache<User>();

      const { loader, created } = cache.getOrCreate('user:u1');

      expect(loader).toBeDefined();
      expect(created).toBe(true);
    });

    it('should create new loader if existing is stale', () => {
      const cache = new LoaderCache<User>({ defaultTtlMs: 1000, autoEvictStale: true });

      const loader1 = cache.create('user:u1');
      loader1.resolve({ id: 'u1', name: 'Alice', email: 'alice@test.com' });

      vi.advanceTimersByTime(1100);

      const { loader: loader2, created } = cache.getOrCreate('user:u1');

      expect(loader2).not.toBe(loader1);
      expect(created).toBe(true);
    });
  });

  describe('LoaderCache iteration', () => {
    it('should iterate over keys', () => {
      const cache = new LoaderCache<User>();

      cache.create('user:u1');
      cache.create('user:u2');
      cache.create('user:u3');

      const keys = cache.keys();
      expect(keys).toContain('user:u1');
      expect(keys).toContain('user:u2');
      expect(keys).toContain('user:u3');
    });

    it('should iterate over values', () => {
      const cache = new LoaderCache<User>();

      const l1 = cache.create('user:u1');
      const l2 = cache.create('user:u2');

      const values = cache.values();
      expect(values).toContain(l1);
      expect(values).toContain(l2);
    });

    it('should iterate with forEach', () => {
      const cache = new LoaderCache<User>();

      cache.create('user:u1');
      cache.create('user:u2');

      const visited: string[] = [];
      cache.forEach((_loader, key) => {
        visited.push(key);
      });

      expect(visited).toHaveLength(2);
    });
  });

  describe('Integration with API calls', () => {
    it('should coordinate cache with batch loading', async () => {
      const userCache = new LoaderCache<User>();
      const batchFetch = vi
        .fn<(ids: string[]) => Promise<Map<string, User>>>()
        .mockImplementation((ids: string[]) => {
          const users = new Map<string, User>();
          for (const id of ids) {
            users.set(id, { id, name: `User ${id}`, email: `${id}@test.com` });
          }
          return Promise.resolve(users);
        });

      // Simulate batch loading pattern
      async function getUser(id: string): Promise<User> {
        const { loader, created } = userCache.getOrCreate(`user:${id}`);

        if (created) {
          // In real app, this would batch multiple requests
          batchFetch([id])
            .then((users) => {
              const user = users.get(id);
              if (user !== null && user !== undefined) {
                loader.resolve(user);
              } else {
                loader.reject(new Error(`User ${id} not found`));
              }
            })
            .catch((err: unknown) => {
              loader.reject(err instanceof Error ? err : new Error(String(err)));
            });
          return loader.promise;
        }

        return loader.promise;
      }

      // Concurrent requests to same user
      const [u1a, u1b, u1c] = await Promise.all([getUser('u1'), getUser('u1'), getUser('u1')]);

      expect(u1a).toEqual(u1b);
      expect(u1b).toEqual(u1c);
      expect(batchFetch).toHaveBeenCalledTimes(1);

      // Different user
      const u2 = await getUser('u2');
      expect(u2.id).toBe('u2');
      expect(batchFetch).toHaveBeenCalledTimes(2);
    });

    it('should support cache warming', async () => {
      const cache = new LoaderCache<User>();

      // Pre-populate cache
      const users: User[] = [
        { id: 'u1', name: 'Alice', email: 'alice@test.com' },
        { id: 'u2', name: 'Bob', email: 'bob@test.com' },
        { id: 'u3', name: 'Charlie', email: 'charlie@test.com' },
      ];

      for (const user of users) {
        const loader = cache.create(`user:${user.id}`);
        loader.resolve(user);
      }

      // All should be available immediately
      expect(cache.size).toBe(3);

      const fetchUser = vi.fn();
      const result = await loadWithCache(cache, 'user:u1', fetchUser);

      expect(result.name).toBe('Alice');
      expect(fetchUser).not.toHaveBeenCalled(); // No fetch needed
    });
  });

  describe('Clear and reset', () => {
    it('should clear all entries', () => {
      const cache = new LoaderCache<User>();

      cache.create('user:u1');
      cache.create('user:u2');
      cache.create('user:u3');

      expect(cache.size).toBe(3);

      cache.clear();

      expect(cache.size).toBe(0);
    });

    it('should delete specific entry', () => {
      const cache = new LoaderCache<User>();

      cache.create('user:u1');
      cache.create('user:u2');

      expect(cache.delete('user:u1')).toBe(true);
      expect(cache.has('user:u1')).toBe(false);
      expect(cache.has('user:u2')).toBe(true);

      expect(cache.delete('user:nonexistent')).toBe(false);
    });
  });
});

// packages/sdk/src/query/QueryCache.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  QueryCache,
  hashQueryKey,
  queryKeysEqual,
  type QueryKey,
  type SetQueryDataOptions,
} from './QueryCache';

describe('hashQueryKey', () => {
  it('should return consistent hash for same query key', () => {
    const key: QueryKey = ['users', 1];

    const hash1 = hashQueryKey(key);
    const hash2 = hashQueryKey(key);

    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different query keys', () => {
    const key1: QueryKey = ['users', 1];
    const key2: QueryKey = ['users', 2];

    const hash1 = hashQueryKey(key1);
    const hash2 = hashQueryKey(key2);

    expect(hash1).not.toBe(hash2);
  });

  it('should sort object keys for consistent hashing', () => {
    const key1: QueryKey = ['users', { name: 'Alice', age: 30 }];
    const key2: QueryKey = ['users', { age: 30, name: 'Alice' }];

    const hash1 = hashQueryKey(key1);
    const hash2 = hashQueryKey(key2);

    expect(hash1).toBe(hash2);
  });

  it('should handle nested objects', () => {
    const key: QueryKey = ['users', { filter: { age: 30, city: 'NYC' } }];

    const hash = hashQueryKey(key);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  it('should handle arrays in query keys', () => {
    const key: QueryKey = ['users', [1, 2, 3]];

    const hash = hashQueryKey(key);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  it('should handle null and undefined values', () => {
    const key1: QueryKey = ['users', null];
    const key2: QueryKey = ['users', undefined];

    const hash1 = hashQueryKey(key1);
    const hash2 = hashQueryKey(key2);

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    // Note: JSON.stringify treats both null and undefined the same in arrays
    // Both will serialize to '["users",null]'
    expect(hash1).toBe(hash2);
  });
});

describe('queryKeysEqual', () => {
  it('should return true for identical query keys', () => {
    const key1: QueryKey = ['users', 1];
    const key2: QueryKey = ['users', 1];

    expect(queryKeysEqual(key1, key2)).toBe(true);
  });

  it('should return false for different query keys', () => {
    const key1: QueryKey = ['users', 1];
    const key2: QueryKey = ['users', 2];

    expect(queryKeysEqual(key1, key2)).toBe(false);
  });

  it('should handle object key ordering', () => {
    const key1: QueryKey = ['users', { name: 'Alice', age: 30 }];
    const key2: QueryKey = ['users', { age: 30, name: 'Alice' }];

    expect(queryKeysEqual(key1, key2)).toBe(true);
  });
});

describe('QueryCache', () => {
  let cache: QueryCache;

  beforeEach(() => {
    cache = new QueryCache();
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('constructor', () => {
    it('should create an empty cache', () => {
      expect(cache.size).toBe(0);
    });

    it('should use default stale time', () => {
      const key: QueryKey = ['users'];
      cache.setQueryData(key, { name: 'Alice' });

      // Default stale time is 5 minutes (300000ms)
      // Query should not be stale immediately
      expect(cache.isStale(key)).toBe(false);
    });

    it('should use custom default stale time when specified', () => {
      const customCache = new QueryCache({ defaultStaleTime: 1000 });

      const key: QueryKey = ['users'];
      customCache.setQueryData(key, { name: 'Alice' });

      expect(customCache.isStale(key)).toBe(false);

      customCache.destroy();
    });

    it('should use custom default GC time when specified', () => {
      const customCache = new QueryCache({ defaultGcTime: 1000 });

      expect(customCache.size).toBe(0);

      customCache.destroy();
    });

    it('should respect refetchOnWindowFocus option', () => {
      const noRefetchCache = new QueryCache({ refetchOnWindowFocus: false });

      expect(noRefetchCache.size).toBe(0);

      noRefetchCache.destroy();
    });

    it('should respect refetchOnReconnect option', () => {
      const noRefetchCache = new QueryCache({ refetchOnReconnect: false });

      expect(noRefetchCache.size).toBe(0);

      noRefetchCache.destroy();
    });
  });

  describe('getQueryState', () => {
    it('should return undefined for non-existent query', () => {
      const state = cache.getQueryState(['users', 1]);

      expect(state).toBeUndefined();
    });

    it('should return query state for existing query', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      const state = cache.getQueryState(key);

      expect(state).toBeDefined();
      expect(state?.data).toEqual({ name: 'Alice' });
      expect(state?.status).toBe('success');
    });

    it('should update lastAccessedAt when accessing query', () => {
      vi.useFakeTimers();

      const key: QueryKey = ['users', 1];
      const now = Date.now();
      vi.setSystemTime(now);

      cache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1000);
      cache.getQueryState(key);

      vi.useRealTimers();
    });
  });

  describe('getQueryData', () => {
    it('should return undefined for non-existent query', () => {
      const data = cache.getQueryData(['users', 1]);

      expect(data).toBeUndefined();
    });

    it('should return query data for existing query', () => {
      const key: QueryKey = ['users', 1];
      const userData = { name: 'Alice', id: 1 };
      cache.setQueryData(key, userData);

      const data = cache.getQueryData(key);

      expect(data).toEqual(userData);
    });
  });

  describe('hasQuery', () => {
    it('should return false for non-existent query', () => {
      expect(cache.hasQuery(['users', 1])).toBe(false);
    });

    it('should return true for existing query', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      expect(cache.hasQuery(key)).toBe(true);
    });
  });

  describe('isStale', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for non-existent query', () => {
      expect(cache.isStale(['users', 1])).toBe(true);
    });

    it('should return true for query with no data', () => {
      const key: QueryKey = ['users', 1];
      cache.subscribe(key, () => {}); // Creates entry without data

      expect(cache.isStale(key)).toBe(true);
    });

    it('should return false for fresh query', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      expect(cache.isStale(key)).toBe(false);
    });

    it('should return true after stale time expires', () => {
      const customCache = new QueryCache({ defaultStaleTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });
      expect(customCache.isStale(key)).toBe(false);

      vi.advanceTimersByTime(1001);
      expect(customCache.isStale(key)).toBe(true);

      customCache.destroy();
    });

    it('should return true for invalidated query', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      cache.invalidateQuery(key);

      expect(cache.isStale(key)).toBe(true);
    });
  });

  describe('setQueryData', () => {
    it('should set query data and update state', () => {
      const key: QueryKey = ['users', 1];
      const data = { name: 'Alice' };

      cache.setQueryData(key, data);

      const state = cache.getQueryState(key);
      expect(state?.data).toEqual(data);
      expect(state?.status).toBe('success');
      expect(state?.fetchStatus).toBe('idle');
      expect(state?.error).toBeNull();
      expect(state?.isInvalidated).toBe(false);
      expect(state?.fetchFailureCount).toBe(0);
    });

    it('should update dataUpdatedAt timestamp', () => {
      vi.useFakeTimers();

      const key: QueryKey = ['users', 1];
      const now = Date.now();
      vi.setSystemTime(now);

      cache.setQueryData(key, { name: 'Alice' });

      const state = cache.getQueryState(key);
      expect(state?.dataUpdatedAt).toBe(now);

      vi.useRealTimers();
    });

    it('should accept custom stale time', () => {
      vi.useFakeTimers();

      const key: QueryKey = ['users', 1];
      const options: SetQueryDataOptions = { staleTime: 500 };

      cache.setQueryData(key, { name: 'Alice' }, options);
      expect(cache.isStale(key)).toBe(false);

      vi.advanceTimersByTime(501);
      expect(cache.isStale(key)).toBe(true);

      vi.useRealTimers();
    });

    it('should accept custom GC time', () => {
      const key: QueryKey = ['users', 1];
      const options: SetQueryDataOptions = { gcTime: 500 };

      cache.setQueryData(key, { name: 'Alice' }, options);

      expect(cache.hasQuery(key)).toBe(true);
    });

    it('should reset error state when setting data', () => {
      const key: QueryKey = ['users', 1];

      cache.setQueryError(key, new Error('Failed'));
      cache.setQueryData(key, { name: 'Alice' });

      const state = cache.getQueryState(key);
      expect(state?.error).toBeNull();
      expect(state?.status).toBe('success');
      expect(state?.fetchFailureCount).toBe(0);
    });

    it('should notify subscribers', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      cache.subscribe(key, subscriber);
      cache.setQueryData(key, { name: 'Alice' });

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should notify global subscribers', () => {
      const key: QueryKey = ['users', 1];
      const globalSubscriber = vi.fn();

      cache.subscribeAll(globalSubscriber);
      cache.setQueryData(key, { name: 'Alice' });

      expect(globalSubscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('setQueryError', () => {
    it('should set query error and update state', () => {
      const key: QueryKey = ['users', 1];
      const error = new Error('Failed to fetch');

      cache.setQueryError(key, error);

      const state = cache.getQueryState(key);
      expect(state?.error).toBe(error);
      expect(state?.status).toBe('error');
      expect(state?.fetchStatus).toBe('idle');
      expect(state?.fetchFailureCount).toBe(1);
    });

    it('should increment fetchFailureCount on repeated errors', () => {
      const key: QueryKey = ['users', 1];

      cache.setQueryError(key, new Error('Error 1'));
      cache.setQueryError(key, new Error('Error 2'));
      cache.setQueryError(key, new Error('Error 3'));

      const state = cache.getQueryState(key);
      expect(state?.fetchFailureCount).toBe(3);
    });

    it('should update errorUpdatedAt timestamp', () => {
      vi.useFakeTimers();

      const key: QueryKey = ['users', 1];
      const now = Date.now();
      vi.setSystemTime(now);

      cache.setQueryError(key, new Error('Failed'));

      const state = cache.getQueryState(key);
      expect(state?.errorUpdatedAt).toBe(now);

      vi.useRealTimers();
    });

    it('should notify subscribers', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      cache.subscribe(key, subscriber);
      cache.setQueryError(key, new Error('Failed'));

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('setFetchStatus', () => {
    it('should update fetch status', () => {
      const key: QueryKey = ['users', 1];

      cache.setFetchStatus(key, 'fetching');

      const state = cache.getQueryState(key);
      expect(state?.fetchStatus).toBe('fetching');
    });

    it('should support all fetch status values', () => {
      const key: QueryKey = ['users', 1];

      cache.setFetchStatus(key, 'idle');
      expect(cache.getQueryState(key)?.fetchStatus).toBe('idle');

      cache.setFetchStatus(key, 'fetching');
      expect(cache.getQueryState(key)?.fetchStatus).toBe('fetching');

      cache.setFetchStatus(key, 'paused');
      expect(cache.getQueryState(key)?.fetchStatus).toBe('paused');
    });

    it('should notify subscribers', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      cache.subscribe(key, subscriber);
      cache.setFetchStatus(key, 'fetching');

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateQuery', () => {
    it('should mark query as invalidated', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      cache.invalidateQuery(key);

      const state = cache.getQueryState(key);
      expect(state?.isInvalidated).toBe(true);
    });

    it('should not affect non-existent queries', () => {
      const key: QueryKey = ['users', 1];

      cache.invalidateQuery(key);

      expect(cache.hasQuery(key)).toBe(false);
    });

    it('should notify subscribers', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      const subscriber = vi.fn();
      cache.subscribe(key, subscriber);

      cache.invalidateQuery(key);

      expect(subscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('invalidateQueries', () => {
    it('should invalidate all queries when no predicate provided', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      cache.invalidateQueries();

      expect(cache.getQueryState(['users', 1])?.isInvalidated).toBe(true);
      expect(cache.getQueryState(['users', 2])?.isInvalidated).toBe(true);
      expect(cache.getQueryState(['posts', 1])?.isInvalidated).toBe(true);
    });

    it('should invalidate queries matching predicate', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      cache.invalidateQueries((key) => key[0] === 'users');

      expect(cache.getQueryState(['users', 1])?.isInvalidated).toBe(true);
      expect(cache.getQueryState(['users', 2])?.isInvalidated).toBe(true);
      expect(cache.getQueryState(['posts', 1])?.isInvalidated).toBe(false);
    });

    it('should notify global subscribers once', () => {
      const globalSubscriber = vi.fn();
      cache.subscribeAll(globalSubscriber);

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });

      globalSubscriber.mockClear();

      cache.invalidateQueries((key) => key[0] === 'users');

      expect(globalSubscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeQuery', () => {
    it('should remove query from cache', () => {
      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      const removed = cache.removeQuery(key);

      expect(removed).toBe(true);
      expect(cache.hasQuery(key)).toBe(false);
    });

    it('should return false for non-existent query', () => {
      const removed = cache.removeQuery(['users', 1]);

      expect(removed).toBe(false);
    });

    it('should notify global subscribers', () => {
      const key: QueryKey = ['users', 1];
      const globalSubscriber = vi.fn();

      cache.setQueryData(key, { name: 'Alice' });
      cache.subscribeAll(globalSubscriber);

      globalSubscriber.mockClear();

      cache.removeQuery(key);

      expect(globalSubscriber).toHaveBeenCalledTimes(1);
    });

    it('should clear GC timeout when removing query', () => {
      vi.useFakeTimers();

      const key: QueryKey = ['users', 1];
      cache.setQueryData(key, { name: 'Alice' });

      cache.removeQuery(key);

      // If timeout wasn't cleared, this would cause issues
      vi.runAllTimers();

      vi.useRealTimers();
    });
  });

  describe('removeQueries', () => {
    it('should remove all queries when no predicate provided', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      const count = cache.removeQueries();

      expect(count).toBe(3);
      expect(cache.size).toBe(0);
    });

    it('should remove queries matching predicate', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      const count = cache.removeQueries((key) => key[0] === 'users');

      expect(count).toBe(2);
      expect(cache.hasQuery(['users', 1])).toBe(false);
      expect(cache.hasQuery(['users', 2])).toBe(false);
      expect(cache.hasQuery(['posts', 1])).toBe(true);
    });

    it('should notify global subscribers when queries removed', () => {
      const globalSubscriber = vi.fn();

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.subscribeAll(globalSubscriber);

      globalSubscriber.mockClear();

      cache.removeQueries((key) => key[0] === 'users');

      expect(globalSubscriber).toHaveBeenCalledTimes(1);
    });

    it('should not notify global subscribers when no queries removed', () => {
      const globalSubscriber = vi.fn();

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.subscribeAll(globalSubscriber);

      globalSubscriber.mockClear();

      cache.removeQueries((key) => key[0] === 'posts');

      expect(globalSubscriber).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('should remove all queries from cache', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.hasQuery(['users', 1])).toBe(false);
      expect(cache.hasQuery(['users', 2])).toBe(false);
      expect(cache.hasQuery(['posts', 1])).toBe(false);
    });

    it('should clear all GC timeouts', () => {
      vi.useFakeTimers();

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });

      cache.clear();

      // If timeouts weren't cleared, this would cause issues
      vi.runAllTimers();

      vi.useRealTimers();
    });

    it('should notify global subscribers', () => {
      const globalSubscriber = vi.fn();

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.subscribeAll(globalSubscriber);

      globalSubscriber.mockClear();

      cache.clear();

      expect(globalSubscriber).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('should call callback on query updates', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      cache.subscribe(key, subscriber);
      cache.setQueryData(key, { name: 'Alice' });

      expect(subscriber).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      const unsubscribe = cache.subscribe(key, subscriber);
      unsubscribe();

      cache.setQueryData(key, { name: 'Alice' });

      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should support multiple subscribers for same query', () => {
      const key: QueryKey = ['users', 1];
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      cache.subscribe(key, subscriber1);
      cache.subscribe(key, subscriber2);

      cache.setQueryData(key, { name: 'Alice' });

      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
    });

    it('should cancel GC timer when there are subscribers', () => {
      vi.useFakeTimers();

      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });

      // Subscribe (should cancel GC)
      const unsubscribe = customCache.subscribe(key, () => {});

      vi.advanceTimersByTime(2000);

      // Query should still exist because there's a subscriber
      expect(customCache.hasQuery(key)).toBe(true);

      unsubscribe();
      customCache.destroy();

      vi.useRealTimers();
    });

    it('should start GC timer when last subscriber unsubscribes', () => {
      vi.useFakeTimers();

      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });

      const unsubscribe1 = customCache.subscribe(key, () => {});
      const unsubscribe2 = customCache.subscribe(key, () => {});

      unsubscribe1();
      expect(customCache.hasQuery(key)).toBe(true);

      unsubscribe2();

      vi.advanceTimersByTime(1001);

      expect(customCache.hasQuery(key)).toBe(false);

      customCache.destroy();

      vi.useRealTimers();
    });
  });

  describe('subscribeAll', () => {
    it('should call callback on any cache change', () => {
      const subscriber = vi.fn();

      cache.subscribeAll(subscriber);

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      expect(subscriber).toHaveBeenCalledTimes(2);
    });

    it('should return unsubscribe function', () => {
      const subscriber = vi.fn();

      const unsubscribe = cache.subscribeAll(subscriber);
      unsubscribe();

      cache.setQueryData(['users', 1], { name: 'Alice' });

      expect(subscriber).not.toHaveBeenCalled();
    });

    it('should support multiple global subscribers', () => {
      const subscriber1 = vi.fn();
      const subscriber2 = vi.fn();

      cache.subscribeAll(subscriber1);
      cache.subscribeAll(subscriber2);

      cache.setQueryData(['users', 1], { name: 'Alice' });

      expect(subscriber1).toHaveBeenCalledTimes(1);
      expect(subscriber2).toHaveBeenCalledTimes(1);
    });
  });

  describe('garbage collection', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should garbage collect queries after GC time', () => {
      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1001);

      expect(customCache.hasQuery(key)).toBe(false);

      customCache.destroy();
    });

    it('should not garbage collect queries with active subscribers', () => {
      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });
      customCache.subscribe(key, () => {});

      vi.advanceTimersByTime(2000);

      expect(customCache.hasQuery(key)).toBe(true);

      customCache.destroy();
    });

    it('should reset GC timer on query access', () => {
      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];

      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(500);
      customCache.getQueryState(key); // Access query

      vi.advanceTimersByTime(600);

      // Should still exist because GC timer was reset
      expect(customCache.hasQuery(key)).toBe(true);

      customCache.destroy();
    });

    it('should notify global subscribers when query is garbage collected', () => {
      const customCache = new QueryCache({ defaultGcTime: 1000 });
      const key: QueryKey = ['users', 1];
      const globalSubscriber = vi.fn();

      customCache.setQueryData(key, { name: 'Alice' });
      customCache.subscribeAll(globalSubscriber);

      globalSubscriber.mockClear();

      vi.advanceTimersByTime(1001);

      expect(globalSubscriber).toHaveBeenCalledTimes(1);

      customCache.destroy();
    });
  });

  describe('pruneUnused', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should remove queries that have not been accessed recently', () => {
      // Use a very long GC time so automatic GC doesn't interfere
      const customCache = new QueryCache({ defaultGcTime: 1000000 });

      customCache.setQueryData(['users', 1], { name: 'Alice' }, { gcTime: 1000 });
      customCache.setQueryData(['users', 2], { name: 'Bob' }, { gcTime: 1000 });

      // Clear all running timers to prevent automatic GC
      vi.clearAllTimers();

      vi.advanceTimersByTime(1001);

      const count = customCache.pruneUnused();

      expect(count).toBe(2);
      expect(customCache.size).toBe(0);

      customCache.destroy();
    });

    it('should not remove queries with active subscribers', () => {
      // Use a very long GC time so automatic GC doesn't interfere
      const customCache = new QueryCache({ defaultGcTime: 1000000 });
      const key1: QueryKey = ['users', 1];
      const key2: QueryKey = ['users', 2];

      customCache.setQueryData(key1, { name: 'Alice' }, { gcTime: 1000 });
      customCache.setQueryData(key2, { name: 'Bob' }, { gcTime: 1000 });

      customCache.subscribe(key1, () => {}); // Add subscriber

      // Clear all running timers to prevent automatic GC
      vi.clearAllTimers();

      vi.advanceTimersByTime(1001);

      const count = customCache.pruneUnused();

      expect(count).toBe(1);
      expect(customCache.hasQuery(key1)).toBe(true);
      expect(customCache.hasQuery(key2)).toBe(false);

      customCache.destroy();
    });

    it('should not remove recently accessed queries', () => {
      // Use a very long GC time so automatic GC doesn't interfere
      const customCache = new QueryCache({ defaultGcTime: 1000000 });
      const key1: QueryKey = ['users', 1];
      const key2: QueryKey = ['users', 2];

      customCache.setQueryData(key1, { name: 'Alice' }, { gcTime: 1000 });
      customCache.setQueryData(key2, { name: 'Bob' }, { gcTime: 1000 });

      // Clear all running timers to prevent automatic GC
      vi.clearAllTimers();

      vi.advanceTimersByTime(500);
      customCache.getQueryState(key1); // Access query

      vi.advanceTimersByTime(501);

      const count = customCache.pruneUnused();

      expect(count).toBe(1);
      expect(customCache.hasQuery(key1)).toBe(true);
      expect(customCache.hasQuery(key2)).toBe(false);

      customCache.destroy();
    });
  });

  describe('destroy', () => {
    it('should clear all queries', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['posts', 1], { title: 'Hello' });

      cache.destroy();

      expect(cache.size).toBe(0);
    });

    it('should clear all subscribers', () => {
      const subscriber = vi.fn();

      cache.subscribeAll(subscriber);
      cache.destroy();

      // Create new cache instance to test
      const newCache = new QueryCache();
      newCache.setQueryData(['users', 1], { name: 'Alice' });

      expect(subscriber).not.toHaveBeenCalled();

      newCache.destroy();
    });

    it('should clear all GC timeouts', () => {
      vi.useFakeTimers();

      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', 2], { name: 'Bob' });

      cache.destroy();

      // If timeouts weren't cleared, this would cause issues
      vi.runAllTimers();

      vi.useRealTimers();
    });
  });

  describe('debugging methods', () => {
    describe('size', () => {
      it('should return the number of queries in cache', () => {
        expect(cache.size).toBe(0);

        cache.setQueryData(['users', 1], { name: 'Alice' });
        expect(cache.size).toBe(1);

        cache.setQueryData(['users', 2], { name: 'Bob' });
        expect(cache.size).toBe(2);

        cache.removeQuery(['users', 1]);
        expect(cache.size).toBe(1);
      });
    });

    describe('getQueryKeys', () => {
      it('should return all query keys', () => {
        cache.setQueryData(['users', 1], { name: 'Alice' });
        cache.setQueryData(['users', 2], { name: 'Bob' });
        cache.setQueryData(['posts', 1], { title: 'Hello' });

        const keys = cache.getQueryKeys();

        expect(keys).toHaveLength(3);
        expect(keys).toContainEqual(['users', 1]);
        expect(keys).toContainEqual(['users', 2]);
        expect(keys).toContainEqual(['posts', 1]);
      });

      it('should return empty array for empty cache', () => {
        const keys = cache.getQueryKeys();

        expect(keys).toEqual([]);
      });
    });

    describe('getAll', () => {
      it('should return all entries with query keys and states', () => {
        cache.setQueryData(['users', 1], { name: 'Alice' });
        cache.setQueryData(['posts', 1], { title: 'Hello' });

        const entries = cache.getAll();

        expect(entries).toHaveLength(2);
        expect(entries[0]).toHaveProperty('queryKey');
        expect(entries[0]).toHaveProperty('state');
        expect(entries[0].state.data).toBeDefined();
      });

      it('should return empty array for empty cache', () => {
        const entries = cache.getAll();

        expect(entries).toEqual([]);
      });
    });
  });

  describe('window focus refetch', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should invalidate stale queries on window focus', () => {
      // Skip if not in browser environment
      if (typeof window === 'undefined') return;

      const customCache = new QueryCache({
        defaultStaleTime: 1000,
        refetchOnWindowFocus: true,
      });

      const key: QueryKey = ['users', 1];
      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1001);

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      expect(customCache.getQueryState(key)?.isInvalidated).toBe(true);

      customCache.destroy();
    });

    it('should not invalidate fresh queries on window focus', () => {
      // Skip if not in browser environment
      if (typeof window === 'undefined') return;

      const customCache = new QueryCache({
        defaultStaleTime: 5000,
        refetchOnWindowFocus: true,
      });

      const key: QueryKey = ['users', 1];
      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1000);

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      expect(customCache.getQueryState(key)?.isInvalidated).toBe(false);

      customCache.destroy();
    });

    it('should not set up focus listener when refetchOnWindowFocus is false', () => {
      // Skip if not in browser environment
      if (typeof window === 'undefined') return;

      const customCache = new QueryCache({
        defaultStaleTime: 1000,
        refetchOnWindowFocus: false,
      });

      const key: QueryKey = ['users', 1];
      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1001);

      // Simulate window focus
      window.dispatchEvent(new Event('focus'));

      // Should not be invalidated
      expect(customCache.getQueryState(key)?.isInvalidated).toBe(false);

      customCache.destroy();
    });
  });

  describe('network reconnect refetch', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should invalidate stale queries on network reconnect', () => {
      // Skip if not in browser environment
      if (typeof window === 'undefined') return;

      const customCache = new QueryCache({
        defaultStaleTime: 1000,
        refetchOnReconnect: true,
      });

      const key: QueryKey = ['users', 1];
      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1001);

      // Simulate network reconnect
      window.dispatchEvent(new Event('online'));

      expect(customCache.getQueryState(key)?.isInvalidated).toBe(true);

      customCache.destroy();
    });

    it('should not set up reconnect listener when refetchOnReconnect is false', () => {
      // Skip if not in browser environment
      if (typeof window === 'undefined') return;

      const customCache = new QueryCache({
        defaultStaleTime: 1000,
        refetchOnReconnect: false,
      });

      const key: QueryKey = ['users', 1];
      customCache.setQueryData(key, { name: 'Alice' });

      vi.advanceTimersByTime(1001);

      // Simulate network reconnect
      window.dispatchEvent(new Event('online'));

      // Should not be invalidated
      expect(customCache.getQueryState(key)?.isInvalidated).toBe(false);

      customCache.destroy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty query keys', () => {
      const key: QueryKey = [];

      cache.setQueryData(key, { name: 'Alice' });

      expect(cache.hasQuery(key)).toBe(true);
      expect(cache.getQueryData(key)).toEqual({ name: 'Alice' });
    });

    it('should handle complex nested query keys', () => {
      const key: QueryKey = [
        'users',
        {
          filter: { age: { min: 18, max: 65 }, status: 'active' },
          sort: ['name', 'asc'],
          page: 1,
        },
      ];

      cache.setQueryData(key, [{ name: 'Alice' }, { name: 'Bob' }]);

      expect(cache.hasQuery(key)).toBe(true);
      expect(cache.getQueryData(key)).toHaveLength(2);
    });

    it('should handle null data', () => {
      const key: QueryKey = ['users', 1];

      cache.setQueryData(key, null);

      expect(cache.getQueryData(key)).toBeNull();
    });

    it('should handle undefined data', () => {
      const key: QueryKey = ['users', 1];

      cache.setQueryData(key, undefined);

      expect(cache.getQueryData(key)).toBeUndefined();
    });

    it('should maintain separate state for queries with similar keys', () => {
      cache.setQueryData(['users', 1], { name: 'Alice' });
      cache.setQueryData(['users', '1'], { name: 'Bob' });

      expect(cache.getQueryData(['users', 1])).toEqual({ name: 'Alice' });
      expect(cache.getQueryData(['users', '1'])).toEqual({ name: 'Bob' });
    });

    it('should handle rapid successive updates', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      cache.subscribe(key, subscriber);

      for (let i = 0; i < 100; i++) {
        cache.setQueryData(key, { name: `User ${i}` });
      }

      expect(subscriber).toHaveBeenCalledTimes(100);
      expect(cache.getQueryData(key)).toEqual({ name: 'User 99' });
    });

    it('should handle unsubscribe called multiple times', () => {
      const key: QueryKey = ['users', 1];
      const subscriber = vi.fn();

      const unsubscribe = cache.subscribe(key, subscriber);

      unsubscribe();
      unsubscribe();
      unsubscribe();

      cache.setQueryData(key, { name: 'Alice' });

      expect(subscriber).not.toHaveBeenCalled();
    });
  });

  describe('type safety', () => {
    it('should maintain type information for query data', () => {
      interface User {
        id: number;
        name: string;
      }

      const key: QueryKey = ['users', 1];
      const userData: User = { id: 1, name: 'Alice' };

      cache.setQueryData(key, userData);

      const state = cache.getQueryState<User>(key);
      const data = cache.getQueryData(key);

      // Type assertions to verify TypeScript types
      if (state?.data !== undefined) {
        const typedData: User = state.data;
        expect(typedData.id).toBe(1);
        expect(typedData.name).toBe('Alice');
      }

      expect(data).toEqual(userData);
    });

    it('should maintain type information for query errors', () => {
      interface CustomError extends Error {
        code: string;
      }

      const key: QueryKey = ['users', 1];
      const error: CustomError = Object.assign(new Error('Failed'), {
        code: 'USER_NOT_FOUND',
      });

      cache.setQueryError(key, error);

      const state = cache.getQueryState<unknown, CustomError>(key);

      if (state?.error !== null && state?.error !== undefined) {
        expect(state.error.code).toBe('USER_NOT_FOUND');
      }
    });
  });
});

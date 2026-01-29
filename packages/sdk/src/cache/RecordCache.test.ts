// packages/sdk/src/cache/RecordCache.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { RecordCache } from './RecordCache';

// Test type definitions
interface User {
  id: string;
  name: string;
  email: string;
  version: number;
}

interface Post {
  id: string;
  title: string;
  authorId: string;
  version: number;
}

type TestTables = {
  user: User;
  post: Post;
};

describe('RecordCache', () => {
  let cache: RecordCache<TestTables>;

  beforeEach(() => {
    cache = new RecordCache<TestTables>();
  });

  describe('get and set', () => {
    it('should store and retrieve a record', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      const retrieved = cache.get('user', 'u1');

      expect(retrieved).toEqual(user);
    });

    it('should return undefined for non-existent record', () => {
      const result = cache.get('user', 'non-existent');

      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent table', () => {
      const result = cache.get('user', 'u1');

      expect(result).toBeUndefined();
    });

    it('should update existing record with higher version', () => {
      const userV1: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const userV2: User = {
        id: 'u1',
        name: 'Alice Updated',
        email: 'alice@example.com',
        version: 2,
      };

      cache.set('user', 'u1', userV1);
      const updated = cache.set('user', 'u1', userV2);

      expect(updated).toBe(true);
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
    });

    it('should reject update with lower or equal version', () => {
      const userV2: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 2 };
      const userV1: User = {
        id: 'u1',
        name: 'Alice Downgrade',
        email: 'alice@example.com',
        version: 1,
      };

      cache.set('user', 'u1', userV2);
      const updated = cache.set('user', 'u1', userV1);

      expect(updated).toBe(false);
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should allow update with force option regardless of version', () => {
      const userV2: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 2 };
      const userV1: User = {
        id: 'u1',
        name: 'Alice Forced',
        email: 'alice@example.com',
        version: 1,
      };

      cache.set('user', 'u1', userV2);
      const updated = cache.set('user', 'u1', userV1, { force: true });

      expect(updated).toBe(true);
      expect(cache.get('user', 'u1')?.name).toBe('Alice Forced');
    });

    it('should store records in different tables independently', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const post: Post = { id: 'p1', title: 'Hello World', authorId: 'u1', version: 1 };

      cache.set('user', 'u1', user);
      cache.set('post', 'p1', post);

      expect(cache.get('user', 'u1')).toEqual(user);
      expect(cache.get('post', 'p1')).toEqual(post);
    });
  });

  describe('getByPointer', () => {
    it('should retrieve record by pointer', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      const retrieved = cache.getByPointer({ table: 'user', id: 'u1' });

      expect(retrieved).toEqual(user);
    });
  });

  describe('has', () => {
    it('should return true for existing record', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });

      expect(cache.has('user', 'u1')).toBe(true);
    });

    it('should return false for non-existing record', () => {
      expect(cache.has('user', 'u1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an existing record', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      const deleted = cache.delete('user', 'u1');

      expect(deleted).toEqual(user);
      expect(cache.get('user', 'u1')).toBeUndefined();
    });

    it('should return undefined when deleting non-existent record', () => {
      const deleted = cache.delete('user', 'non-existent');

      expect(deleted).toBeUndefined();
    });

    it('should clean up empty table storage', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.delete('user', 'u1');

      expect(cache.getTables()).not.toContain('user');
    });
  });

  describe('deleteByPointer', () => {
    it('should delete record by pointer', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      const deleted = cache.deleteByPointer({ table: 'user', id: 'u1' });

      expect(deleted).toEqual(user);
      expect(cache.has('user', 'u1')).toBe(false);
    });
  });

  describe('setMany', () => {
    it('should set multiple records at once', () => {
      const users = [
        {
          table: 'user' as const,
          id: 'u1',
          record: { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 },
        },
        {
          table: 'user' as const,
          id: 'u2',
          record: { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 },
        },
      ];

      cache.setMany(users);

      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u2')?.name).toBe('Bob');
    });
  });

  describe('deleteMany', () => {
    it('should delete multiple records at once', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });

      cache.deleteMany([
        { table: 'user', id: 'u1' },
        { table: 'user', id: 'u2' },
      ]);

      expect(cache.has('user', 'u1')).toBe(false);
      expect(cache.has('user', 'u2')).toBe(false);
    });
  });

  describe('optimistic updates', () => {
    it('should apply optimistic update', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      cache.optimisticUpdate('user', 'u1', { name: 'Alice Updated' });

      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
    });

    it('should return undefined for non-existent record', () => {
      const rollback = cache.optimisticUpdate('user', 'non-existent', { name: 'Test' });

      expect(rollback).toBeUndefined();
    });

    it('should allow rollback of optimistic update', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Alice Updated' });
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      rollback?.();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should preserve original state across multiple optimistic updates', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      // First update
      const rollback1 = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
      // Second update (before first rollback)
      const rollback2 = cache.optimisticUpdate('user', 'u1', { name: 'Charlie' });

      expect(cache.get('user', 'u1')?.name).toBe('Charlie');

      // Rolling back should restore to original (Alice), not intermediate (Bob)
      rollback2?.();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');

      // First rollback should have no effect since state was already cleared
      rollback1?.();
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should track optimistic update state', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(false);

      cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(true);
    });

    it('should commit optimistic update', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
      cache.commitOptimisticUpdate('user', 'u1');

      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(false);
      expect(cache.get('user', 'u1')?.name).toBe('Bob');

      // Rollback should have no effect after commit
      rollback?.();
      expect(cache.get('user', 'u1')?.name).toBe('Bob');
    });
  });

  describe('subscriptions', () => {
    it('should notify listener on set', () => {
      const listener = vi.fn();
      cache.subscribe('user', 'u1', listener);

      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: undefined,
        after: user,
      });
    });

    it('should notify listener on update', () => {
      const listener = vi.fn();
      const userV1: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const userV2: User = { id: 'u1', name: 'Bob', email: 'alice@example.com', version: 2 };

      cache.set('user', 'u1', userV1);
      cache.subscribe('user', 'u1', listener);
      cache.set('user', 'u1', userV2);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: userV1,
        after: userV2,
      });
    });

    it('should notify listener on delete', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      cache.subscribe('user', 'u1', listener);
      cache.delete('user', 'u1');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: user,
        after: undefined,
      });
    });

    it('should unsubscribe correctly', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      const unsubscribe = cache.subscribe('user', 'u1', listener);
      unsubscribe();
      cache.set('user', 'u1', user);

      expect(listener).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same record', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.subscribe('user', 'u1', listener1);
      cache.subscribe('user', 'u1', listener2);
      cache.set('user', 'u1', user);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should support subscribeByPointer', () => {
      const listener = vi.fn();
      cache.subscribeByPointer({ table: 'user', id: 'u1' }, listener);

      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      cache.set('user', 'u1', user);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('global subscriptions', () => {
    it('should notify global listener on any change', () => {
      const listener = vi.fn();
      cache.subscribeAll(listener);

      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const post: Post = { id: 'p1', title: 'Hello', authorId: 'u1', version: 1 };

      cache.set('user', 'u1', user);
      cache.set('post', 'p1', post);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe global listener correctly', () => {
      const listener = vi.fn();
      const unsubscribe = cache.subscribeAll(listener);
      unsubscribe();

      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('getAll', () => {
    it('should return all records from a table', () => {
      const user1: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const user2: User = { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 };

      cache.set('user', 'u1', user1);
      cache.set('user', 'u2', user2);

      const allUsers = cache.getAll('user');

      expect(allUsers).toHaveLength(2);
      expect(allUsers).toContainEqual(user1);
      expect(allUsers).toContainEqual(user2);
    });

    it('should return empty array for non-existent table', () => {
      const allUsers = cache.getAll('user');

      expect(allUsers).toEqual([]);
    });
  });

  describe('getIds', () => {
    it('should return all IDs from a table', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });

      const ids = cache.getIds('user');

      expect(ids).toEqual(['u1', 'u2']);
    });

    it('should return empty array for non-existent table', () => {
      const ids = cache.getIds('user');

      expect(ids).toEqual([]);
    });
  });

  describe('count', () => {
    it('should return the number of records in a table', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });

      expect(cache.count('user')).toBe(2);
    });

    it('should return 0 for non-existent table', () => {
      expect(cache.count('user')).toBe(0);
    });
  });

  describe('getTables', () => {
    it('should return all table names', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('post', 'p1', { id: 'p1', title: 'Hello', authorId: 'u1', version: 1 });

      const tables = cache.getTables();

      expect(tables).toEqual(['user', 'post']);
    });

    it('should return empty array when no tables exist', () => {
      expect(cache.getTables()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all records', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('post', 'p1', { id: 'p1', title: 'Hello', authorId: 'u1', version: 1 });

      cache.clear();

      expect(cache.getTables()).toEqual([]);
      expect(cache.get('user', 'u1')).toBeUndefined();
      expect(cache.get('post', 'p1')).toBeUndefined();
    });

    it('should notify listeners on clear', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      cache.subscribe('user', 'u1', listener);
      cache.clear();

      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: user,
        after: undefined,
      });
    });

    it('should clear optimistic states', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.optimisticUpdate('user', 'u1', { name: 'Bob' });

      cache.clear();

      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(false);
    });
  });

  describe('clearTable', () => {
    it('should remove all records from a specific table', () => {
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });
      cache.set('post', 'p1', { id: 'p1', title: 'Hello', authorId: 'u1', version: 1 });

      cache.clearTable('user');

      expect(cache.get('user', 'u1')).toBeUndefined();
      expect(cache.get('user', 'u2')).toBeUndefined();
      expect(cache.get('post', 'p1')).toBeDefined();
    });

    it('should notify listeners for cleared records', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      cache.subscribe('user', 'u1', listener);
      cache.clearTable('user');

      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: user,
        after: undefined,
      });
    });
  });

  describe('reset', () => {
    it('should clear all records and listeners', () => {
      const listener = vi.fn();
      cache.set('user', 'u1', { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 });
      cache.subscribe('user', 'u1', listener);

      cache.reset();

      // Records should be cleared
      expect(cache.get('user', 'u1')).toBeUndefined();

      // Listener should be removed, so setting a new record shouldn't trigger it
      cache.set('user', 'u1', { id: 'u1', name: 'Bob', email: 'bob@example.com', version: 1 });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('custom version extraction', () => {
    it('should use custom getVersion function', () => {
      interface CustomRecord {
        id: string;
        rev: number; // Custom version field
      }

      type CustomTables = {
        item: CustomRecord;
      };

      const customCache = new RecordCache<CustomTables>({
        getVersion: (record: unknown) => {
          if (record !== null && record !== undefined && typeof record === 'object' && 'rev' in record) {
            return (record as { rev: number }).rev;
          }
          return undefined;
        },
      });

      customCache.set('item', 'i1', { id: 'i1', rev: 1 });
      customCache.set('item', 'i1', { id: 'i1', rev: 0 }); // Should be rejected

      expect(customCache.get('item', 'i1')?.rev).toBe(1);
    });
  });

  describe('records without version', () => {
    it('should allow updates for records without version field', () => {
      interface NoVersionRecord {
        id: string;
        name: string;
      }

      type NoVersionTables = {
        item: NoVersionRecord;
      };

      const noVersionCache = new RecordCache<NoVersionTables>();

      noVersionCache.set('item', 'i1', { id: 'i1', name: 'First' });
      const updated = noVersionCache.set('item', 'i1', { id: 'i1', name: 'Second' });

      expect(updated).toBe(true);
      expect(noVersionCache.get('item', 'i1')?.name).toBe('Second');
    });
  });

  describe('listener notification on optimistic update', () => {
    it('should notify listeners during optimistic update', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      cache.subscribe('user', 'u1', listener);
      listener.mockClear();

      cache.optimisticUpdate('user', 'u1', { name: 'Bob' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: user,
        after: { ...user, name: 'Bob' },
      });
    });

    it('should notify listeners during rollback', () => {
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
      cache.subscribe('user', 'u1', listener);

      rollback?.();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: { ...user, name: 'Bob' },
        after: user,
      });
    });
  });

  describe('TTL support', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should expire entries after TTL', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user);
      expect(ttlCache.get('user', 'u1')).toEqual(user);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(ttlCache.get('user', 'u1')).toBeUndefined();
    });

    it('should allow per-entry TTL override', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user1: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const user2: User = { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 };

      ttlCache.set('user', 'u1', user1); // Uses default TTL (1000)
      ttlCache.set('user', 'u2', user2, { ttl: 5000 }); // Custom TTL (5000)

      // Advance time past default TTL
      vi.advanceTimersByTime(1001);

      expect(ttlCache.get('user', 'u1')).toBeUndefined();
      expect(ttlCache.get('user', 'u2')).toEqual(user2);

      // Advance time past custom TTL
      vi.advanceTimersByTime(4000);

      expect(ttlCache.get('user', 'u2')).toBeUndefined();
    });

    it('should not expire entries with Infinity TTL', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user, { ttl: Infinity });

      // Advance time way past default TTL
      vi.advanceTimersByTime(1000000);

      expect(ttlCache.get('user', 'u1')).toEqual(user);
    });

    it('should return false for has() on expired entries', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user);
      expect(ttlCache.has('user', 'u1')).toBe(true);

      vi.advanceTimersByTime(1001);

      expect(ttlCache.has('user', 'u1')).toBe(false);
    });

    it('should exclude expired entries from getAll()', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user1: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };
      const user2: User = { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 };

      ttlCache.set('user', 'u1', user1);
      vi.advanceTimersByTime(500);
      ttlCache.set('user', 'u2', user2);
      vi.advanceTimersByTime(501);

      const allUsers = ttlCache.getAll('user');
      expect(allUsers).toHaveLength(1);
      expect(allUsers[0]).toEqual(user2);
    });

    it('should exclude expired entries from getIds()', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });

      ttlCache.set('user', 'u1', {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        version: 1,
      });
      vi.advanceTimersByTime(500);
      ttlCache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });
      vi.advanceTimersByTime(501);

      const ids = ttlCache.getIds('user');
      expect(ids).toEqual(['u2']);
    });

    it('should exclude expired entries from count()', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });

      ttlCache.set('user', 'u1', {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        version: 1,
      });
      vi.advanceTimersByTime(500);
      ttlCache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });
      vi.advanceTimersByTime(501);

      expect(ttlCache.count('user')).toBe(1);
    });

    it('should refresh TTL with refreshTtl()', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user);
      vi.advanceTimersByTime(800);

      // Refresh TTL
      const refreshed = ttlCache.refreshTtl('user', 'u1');
      expect(refreshed).toBe(true);

      // Original TTL would have expired by now
      vi.advanceTimersByTime(300);
      expect(ttlCache.get('user', 'u1')).toEqual(user);

      // After refreshed TTL expires
      vi.advanceTimersByTime(800);
      expect(ttlCache.get('user', 'u1')).toBeUndefined();
    });

    it('should return false when refreshing non-existent entry', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });

      const refreshed = ttlCache.refreshTtl('user', 'non-existent');
      expect(refreshed).toBe(false);
    });

    it('should return false when refreshing expired entry', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user);
      vi.advanceTimersByTime(1001);

      const refreshed = ttlCache.refreshTtl('user', 'u1');
      expect(refreshed).toBe(false);
    });

    it('should prune expired entries with pruneExpired()', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });

      ttlCache.set('user', 'u1', {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        version: 1,
      });
      ttlCache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });
      vi.advanceTimersByTime(500);
      ttlCache.set('user', 'u3', {
        id: 'u3',
        name: 'Charlie',
        email: 'charlie@example.com',
        version: 1,
      });
      vi.advanceTimersByTime(501);

      const pruned = ttlCache.pruneExpired();

      expect(pruned).toBe(2);
      expect(ttlCache.getIds('user')).toEqual(['u3']);
    });

    it('should notify listeners when entries expire on access', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const listener = vi.fn();
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', user);
      ttlCache.subscribe('user', 'u1', listener);

      vi.advanceTimersByTime(1001);
      ttlCache.get('user', 'u1'); // This triggers eviction

      expect(listener).toHaveBeenCalledWith({
        table: 'user',
        id: 'u1',
        before: user,
        after: undefined,
      });
    });

    it('should treat expired entries as non-existent for version comparison', () => {
      const ttlCache = new RecordCache<TestTables>({ defaultTtl: 1000 });
      const userV2: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 2 };
      const userV1: User = { id: 'u1', name: 'Alice New', email: 'alice@example.com', version: 1 };

      ttlCache.set('user', 'u1', userV2);
      vi.advanceTimersByTime(1001);

      // Should allow setting lower version since old entry expired
      const updated = ttlCache.set('user', 'u1', userV1);
      expect(updated).toBe(true);
      expect(ttlCache.get('user', 'u1')).toEqual(userV1);
    });
  });

  describe('cache statistics', () => {
    it('should not track stats when trackStats is false (default)', () => {
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      cache.set('user', 'u1', user);
      cache.get('user', 'u1');
      cache.get('user', 'non-existent');

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it('should track hits and misses when trackStats is true', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      statsCache.set('user', 'u1', user);
      statsCache.get('user', 'u1'); // hit
      statsCache.get('user', 'u1'); // hit
      statsCache.get('user', 'non-existent'); // miss

      const stats = statsCache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should calculate hit rate correctly', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      statsCache.set('user', 'u1', user);
      statsCache.get('user', 'u1'); // hit
      statsCache.get('user', 'u1'); // hit
      statsCache.get('user', 'u1'); // hit
      statsCache.get('user', 'non-existent'); // miss

      const stats = statsCache.getStats();
      expect(stats.hitRate).toBe(75);
    });

    it('should return 0 hit rate when no gets performed', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });

      const stats = statsCache.getStats();
      expect(stats.hitRate).toBe(0);
    });

    it('should track cache size', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });

      statsCache.set('user', 'u1', {
        id: 'u1',
        name: 'Alice',
        email: 'alice@example.com',
        version: 1,
      });
      statsCache.set('user', 'u2', { id: 'u2', name: 'Bob', email: 'bob@example.com', version: 1 });
      statsCache.set('post', 'p1', { id: 'p1', title: 'Hello', authorId: 'u1', version: 1 });

      const stats = statsCache.getStats();
      expect(stats.size).toBe(3);
    });

    it('should track evictions from TTL expiration', () => {
      vi.useFakeTimers();

      const statsCache = new RecordCache<TestTables>({ defaultTtl: 1000, trackStats: true });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      statsCache.set('user', 'u1', user);
      vi.advanceTimersByTime(1001);
      statsCache.get('user', 'u1'); // triggers eviction

      const stats = statsCache.getStats();
      expect(stats.evictions).toBe(1);

      vi.useRealTimers();
    });

    it('should reset stats with resetStats()', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      statsCache.set('user', 'u1', user);
      statsCache.get('user', 'u1');
      statsCache.get('user', 'non-existent');

      statsCache.resetStats();

      const stats = statsCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
      // Size should still be accurate
      expect(stats.size).toBe(1);
    });

    it('should reset stats on cache reset()', () => {
      const statsCache = new RecordCache<TestTables>({ trackStats: true });
      const user: User = { id: 'u1', name: 'Alice', email: 'alice@example.com', version: 1 };

      statsCache.set('user', 'u1', user);
      statsCache.get('user', 'u1');

      statsCache.reset();

      const stats = statsCache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.size).toBe(0);
    });
  });
});

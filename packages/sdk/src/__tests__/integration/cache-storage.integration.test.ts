// packages/sdk/src/__tests__/integration/cache-storage.integration.test.ts
/**
 * Integration tests for RecordCache + RecordStorage working together.
 *
 * Tests the pattern where RecordCache is used for fast in-memory lookups
 * and RecordStorage provides persistent IndexedDB backup.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordCache, type TableMap } from '../../cache/RecordCache';
import { RecordStorage, type VersionedRecord } from '../../storage/RecordStorage';

// ============================================================================
// Test Types
// ============================================================================

interface User extends VersionedRecord {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface Post extends VersionedRecord {
  id: string;
  version: number;
  title: string;
  authorId: string;
}

interface TestTables extends TableMap {
  user: User;
  post: Post;
}

type TestTableNames = 'user' | 'post';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a coordinated cache and storage setup.
 * This simulates the pattern used in RealtimeProvider.
 */
function createCacheStorageSystem(): {
  cache: RecordCache<TestTables>;
  storage: RecordStorage<TestTableNames>;
  syncToStorage: <T extends keyof TestTables & string>(
    table: T,
    record: TestTables[T],
  ) => Promise<boolean>;
  loadFromStorage: <T extends keyof TestTables & string>(
    table: T,
    id: string,
  ) => Promise<TestTables[T] | undefined>;
} {
  const cache = new RecordCache<TestTables>();
  const storage = new RecordStorage<TestTableNames>({ dbName: 'test-cache-storage' });

  const syncToStorage = async <T extends keyof TestTables & string>(
    table: T,
    record: TestTables[T],
  ): Promise<boolean> => {
    return storage.setRecord(table as TestTableNames, record);
  };

  const loadFromStorage = async <T extends keyof TestTables & string>(
    table: T,
    id: string,
  ): Promise<TestTables[T] | undefined> => {
    await storage.ready();
    const record = await storage.getRecord<TestTables[T]>({ table: table as TestTableNames, id });
    if (record) {
      cache.set(table, id, record);
    }
    return record;
  };

  return { cache, storage, syncToStorage, loadFromStorage };
}

// ============================================================================
// Tests
// ============================================================================

describe('RecordCache + RecordStorage Integration', () => {
  let cache: RecordCache<TestTables>;
  let storage: RecordStorage<TestTableNames>;
  let syncToStorage: <T extends keyof TestTables & string>(
    table: T,
    record: TestTables[T],
  ) => Promise<boolean>;
  let loadFromStorage: <T extends keyof TestTables & string>(
    table: T,
    id: string,
  ) => Promise<TestTables[T] | undefined>;

  beforeEach(async () => {
    const system = createCacheStorageSystem();
    cache = system.cache;
    storage = system.storage;
    syncToStorage = system.syncToStorage;
    loadFromStorage = system.loadFromStorage;
    await storage.ready();
  });

  afterEach(async () => {
    cache.reset();
    await storage.reset();
  });

  describe('write-through caching', () => {
    it('should write to both cache and storage', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };

      // Write to cache
      cache.set('user', user.id, user);
      expect(cache.get('user', 'u1')).toEqual(user);

      // Sync to storage
      const written = await syncToStorage('user', user);
      expect(written).toBe(true);

      // Verify storage
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored).toEqual(user);
    });

    it('should update both cache and storage on version bump', async () => {
      const userV1: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      const userV2: User = { id: 'u1', version: 2, name: 'Alice Updated', email: 'alice@test.com' };

      // Write v1
      cache.set('user', userV1.id, userV1);
      await syncToStorage('user', userV1);

      // Update to v2
      const cacheUpdated = cache.set('user', userV2.id, userV2);
      expect(cacheUpdated).toBe(true);
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      const storageUpdated = await syncToStorage('user', userV2);
      expect(storageUpdated).toBe(true);

      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored?.name).toBe('Alice Updated');
    });

    it('should reject stale writes based on version', async () => {
      const userV2: User = { id: 'u1', version: 2, name: 'Newer', email: 'test@test.com' };
      const userV1: User = { id: 'u1', version: 1, name: 'Stale', email: 'test@test.com' };

      // Write v2 first
      cache.set('user', userV2.id, userV2);
      await syncToStorage('user', userV2);

      // Try to write v1 (should be rejected)
      const cacheRejected = cache.set('user', userV1.id, userV1);
      expect(cacheRejected).toBe(false);
      expect(cache.get('user', 'u1')?.version).toBe(2);

      const storageRejected = await syncToStorage('user', userV1);
      expect(storageRejected).toBe(false);

      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored?.version).toBe(2);
    });
  });

  describe('cache hydration from storage', () => {
    it('should load records from storage into cache', async () => {
      // Seed storage directly
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      await storage.setRecord('user', user);

      // Cache should be empty
      expect(cache.get('user', 'u1')).toBeUndefined();

      // Load from storage
      const loaded = await loadFromStorage('user', 'u1');
      expect(loaded).toEqual(user);

      // Cache should now have the record
      expect(cache.get('user', 'u1')).toEqual(user);
    });

    it('should hydrate multiple records', async () => {
      // Seed storage
      const users: User[] = [
        { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' },
        { id: 'u2', version: 1, name: 'Bob', email: 'bob@test.com' },
        { id: 'u3', version: 1, name: 'Charlie', email: 'charlie@test.com' },
      ];

      for (const user of users) {
        await storage.setRecord('user', user);
      }

      // Load all from storage and hydrate cache
      for (const user of users) {
        await loadFromStorage('user', user.id);
      }

      // Verify all in cache
      expect(cache.getAll('user')).toHaveLength(3);
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
      expect(cache.get('user', 'u2')?.name).toBe('Bob');
      expect(cache.get('user', 'u3')?.name).toBe('Charlie');
    });

    it('should handle missing records gracefully', async () => {
      const loaded = await loadFromStorage('user', 'nonexistent');
      expect(loaded).toBeUndefined();
      expect(cache.get('user', 'nonexistent')).toBeUndefined();
    });
  });

  describe('optimistic updates with rollback', () => {
    it('should support optimistic cache updates with rollback', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);
      await syncToStorage('user', user);

      // Optimistic update in cache
      const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Alice Optimistic' });
      expect(cache.get('user', 'u1')?.name).toBe('Alice Optimistic');

      // Simulate server rejection - rollback
      rollback?.();

      // Cache should be restored
      expect(cache.get('user', 'u1')?.name).toBe('Alice');

      // Storage was never updated (still has original)
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored?.name).toBe('Alice');
    });

    it('should commit optimistic update when server confirms', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);
      await syncToStorage('user', user);

      // Optimistic update
      const _rollback = cache.optimisticUpdate('user', 'u1', { name: 'Alice Updated' });
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      // Server confirms with new version
      const confirmedUser: User = {
        id: 'u1',
        version: 2,
        name: 'Alice Updated',
        email: 'alice@test.com',
      };
      cache.set('user', 'u1', confirmedUser, { force: true });
      cache.commitOptimisticUpdate('user', 'u1');

      await syncToStorage('user', confirmedUser);

      // Both cache and storage have the update
      expect(cache.get('user', 'u1')?.version).toBe(2);
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored?.version).toBe(2);
    });
  });

  describe('multi-table operations', () => {
    it('should handle related records across tables', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      const post: Post = { id: 'p1', version: 1, title: "Alice's Post", authorId: 'u1' };

      // Write both
      cache.set('user', user.id, user);
      cache.set('post', post.id, post);
      await syncToStorage('user', user);
      await syncToStorage('post', post);

      // Verify related data
      const cachedPost = cache.get('post', 'p1');
      expect(cachedPost?.authorId).toBe('u1');

      const authorId = cachedPost?.authorId;
      if (authorId) {
        const author = cache.get('user', authorId);
        expect(author?.name).toBe('Alice');
      }

      // Verify storage
      const storedPost = await storage.getRecord<Post>({ table: 'post', id: 'p1' });
      expect(storedPost?.authorId).toBe('u1');
    });

    it('should handle batch updates across tables', async () => {
      const updates: Array<{
        table: keyof TestTables & string;
        record: TestTables[keyof TestTables];
      }> = [
        { table: 'user', record: { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' } },
        { table: 'user', record: { id: 'u2', version: 1, name: 'Bob', email: 'bob@test.com' } },
        { table: 'post', record: { id: 'p1', version: 1, title: 'Post 1', authorId: 'u1' } },
        { table: 'post', record: { id: 'p2', version: 1, title: 'Post 2', authorId: 'u2' } },
      ];

      // Batch write to cache
      for (const { table, record } of updates) {
        cache.set(table, record.id, record);
      }

      // Batch sync to storage
      for (const { table, record } of updates) {
        await storage.setRecord(table as TestTableNames, record as VersionedRecord);
      }

      // Verify counts
      expect(cache.count('user')).toBe(2);
      expect(cache.count('post')).toBe(2);

      const storedUsers = await storage.getAllRecords<User>('user');
      const storedPosts = await storage.getAllRecords<Post>('post');
      expect(storedUsers).toHaveLength(2);
      expect(storedPosts).toHaveLength(2);
    });
  });

  describe('cache listeners with storage sync', () => {
    it('should trigger cache listeners on updates', async () => {
      const listener = vi.fn();
      cache.subscribe('user', 'u1', listener);

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          table: 'user',
          id: 'u1',
          before: undefined,
          after: user,
        }),
      );

      // Sync to storage doesn't trigger cache listeners (it's a separate system)
      await syncToStorage('user', user);
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should coordinate storage events with cache updates', async () => {
      const storageEvents: Array<{ type: string; table: string; id?: string }> = [];

      storage.subscribe((event) => {
        storageEvents.push({ type: event.type, table: event.table, id: event.id });
      });

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);
      await syncToStorage('user', user);

      expect(storageEvents).toContainEqual(
        expect.objectContaining({ type: 'write', table: 'user', id: 'u1' }),
      );
    });
  });

  describe('TTL and expiration', () => {
    it('should respect cache TTL while storage persists', async () => {
      vi.useFakeTimers();

      const cache = new RecordCache<TestTables>({ defaultTtl: 100 });
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };

      cache.set('user', user.id, user);
      await storage.setRecord('user', user);

      // Cache has the record
      expect(cache.get('user', 'u1')).toBeDefined();

      // Advance time past TTL
      vi.advanceTimersByTime(150);

      // Cache entry expired
      expect(cache.get('user', 'u1')).toBeUndefined();

      // Storage still has it
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored).toBeDefined();
      expect(stored?.name).toBe('Alice');

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle cache-only mode when storage fails', async () => {
      // This tests the fallback behavior when IndexedDB is unavailable
      // The MemoryBackend fallback in RecordStorage handles this

      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };

      // Cache always works
      cache.set('user', user.id, user);
      expect(cache.get('user', 'u1')).toEqual(user);

      // Storage should still work (uses memory fallback in test environment)
      const written = await syncToStorage('user', user);
      expect(written).toBe(true);
    });
  });

  describe('clear and reset operations', () => {
    it('should clear cache without affecting storage', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);
      await syncToStorage('user', user);

      // Clear cache
      cache.clear();
      expect(cache.get('user', 'u1')).toBeUndefined();

      // Storage still has data
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored).toBeDefined();
    });

    it('should re-hydrate cache from storage after clear', async () => {
      const user: User = { id: 'u1', version: 1, name: 'Alice', email: 'alice@test.com' };
      cache.set('user', user.id, user);
      await syncToStorage('user', user);

      // Clear cache
      cache.clear();

      // Re-hydrate
      const loaded = await loadFromStorage('user', 'u1');
      expect(loaded).toEqual(user);
      expect(cache.get('user', 'u1')).toEqual(user);
    });
  });
});

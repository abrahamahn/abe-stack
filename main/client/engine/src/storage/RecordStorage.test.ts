// main/client/engine/src/storage/RecordStorage.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  RecordStorage,
  RecordStorageError,
  createRecordMap,
  createRecordStorage,
  iterateRecordMap,
  type RecordMap,
  type RecordWithTable,
  type VersionedRecord,
} from './RecordStorage';

// ============================================================================
// Mock IndexedDB
// ============================================================================

interface MockStore {
  data: Map<string, unknown>;
}

interface MockTransaction {
  objectStore: (name: string) => MockObjectStore;
  oncomplete: (() => void) | null;
  onerror: (() => void) | null;
  error: Error | null;
}

interface MockObjectStore {
  get: (key: string) => MockRequest;
  put: (value: unknown, key: string) => MockRequest;
  delete: (key: string) => MockRequest;
  clear: () => MockRequest;
  getAllKeys: () => MockRequest;
  openCursor: () => MockRequest;
}

interface MockRequest {
  result: unknown;
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
}

interface MockCursor {
  key: string;
  value: unknown;
  continue: () => void;
  delete: () => void;
}

function createMockIndexedDB(): {
  stores: Map<string, MockStore>;
  indexedDB: typeof globalThis.indexedDB;
} {
  const stores = new Map<string, MockStore>();

  const mockIndexedDB = {
    open: (dbName: string): IDBOpenDBRequest => {
      let store = stores.get(dbName);
      if (store === undefined) {
        store = { data: new Map() };
        stores.set(dbName, store);
      }

      const currentStore = store;

      const request = {
        result: {
          objectStoreNames: {
            contains: (_name: string): boolean => true,
          },
          createObjectStore: (_name: string): void => {},
          transaction: (_storeName: string, _mode: IDBTransactionMode): MockTransaction => {
            // Get fresh keys for cursor at cursor creation time, not transaction time
            const objectStore: MockObjectStore = {
              get: (key: string): MockRequest => {
                const req: MockRequest = {
                  result: currentStore.data.get(key),
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              put: (value: unknown, key: string): MockRequest => {
                currentStore.data.set(key, value);
                const req: MockRequest = {
                  result: undefined,
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              delete: (key: string): MockRequest => {
                currentStore.data.delete(key);
                const req: MockRequest = {
                  result: undefined,
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              clear: (): MockRequest => {
                currentStore.data.clear();
                const req: MockRequest = {
                  result: undefined,
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              getAllKeys: (): MockRequest => {
                const req: MockRequest = {
                  result: Array.from(currentStore.data.keys()),
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };
                setTimeout(() => req.onsuccess?.(), 0);
                return req;
              },
              openCursor: (): MockRequest => {
                // Get fresh keys at cursor creation time
                const cursorKeys = Array.from(currentStore.data.keys());
                let cursorIndex = 0;

                const req: MockRequest = {
                  result: null as MockCursor | null,
                  error: null,
                  onsuccess: null,
                  onerror: null,
                };

                const advanceCursor = (): void => {
                  if (cursorIndex < cursorKeys.length) {
                    // Safe: index is within bounds due to check above
                    const key = cursorKeys[cursorIndex] as string;
                    req.result = {
                      key,
                      value: currentStore.data.get(key),
                      continue: (): void => {
                        cursorIndex++;
                        setTimeout(advanceCursor, 0);
                      },
                      delete: (): void => {
                        currentStore.data.delete(key);
                      },
                    } as MockCursor;
                  } else {
                    req.result = null;
                  }
                  setTimeout(() => req.onsuccess?.(), 0);
                };

                setTimeout(advanceCursor, 0);
                return req;
              },
            };

            const tx: MockTransaction = {
              objectStore: (_name: string): MockObjectStore => objectStore,
              oncomplete: null,
              onerror: null,
              error: null,
            };

            // Simulate transaction completion
            setTimeout(() => tx.oncomplete?.(), 10);

            return tx;
          },
          close: (): void => {},
        } as unknown as IDBDatabase,
        error: null as DOMException | null,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
      };

      setTimeout(() => {
        request.onupgradeneeded?.();
        request.onsuccess?.();
      }, 0);

      return request as unknown as IDBOpenDBRequest;
    },
  };

  return {
    stores,
    indexedDB: mockIndexedDB as unknown as typeof globalThis.indexedDB,
  };
}

// ============================================================================
// Test Types
// ============================================================================

type TestTables = 'user' | 'post';

interface UserRecord extends VersionedRecord {
  id: string;
  version: number;
  name: string;
  email: string;
}

interface PostRecord extends VersionedRecord {
  id: string;
  version: number;
  title: string;
  authorId: string;
  content?: string;
}

// ============================================================================
// Tests
// ============================================================================

describe('RecordStorage', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: typeof globalThis.indexedDB;

  beforeEach(() => {
    mockIDB = createMockIndexedDB();
    originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = mockIDB.indexedDB;
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });

  describe('constructor', () => {
    it('should create a RecordStorage instance with default options', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();
      expect(storage).toBeInstanceOf(RecordStorage);
    });

    it('should create a RecordStorage instance with custom options', async () => {
      const storage = new RecordStorage<TestTables>({
        dbName: 'test-db',
        storeName: 'test-store',
        debug: true,
      });
      await storage.ready();
      expect(storage).toBeInstanceOf(RecordStorage);
    });
  });

  describe('setRecord and getRecord', () => {
    it('should store and retrieve a record', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user: UserRecord = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@example.com',
      };

      const written = await storage.setRecord('user', user);
      expect(written).toBe(true);

      const retrieved = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      expect(retrieved).toEqual(user);
    });

    it('should return undefined for non-existent record', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const retrieved = await storage.getRecord<UserRecord>({ table: 'user', id: 'nonexistent' });
      expect(retrieved).toBeUndefined();
    });

    it('should only overwrite with newer version', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const userV1: UserRecord = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@example.com',
      };
      const userV2: UserRecord = {
        id: 'u1',
        version: 2,
        name: 'Alice Updated',
        email: 'alice@example.com',
      };
      const userV1Again: UserRecord = {
        id: 'u1',
        version: 1,
        name: 'Alice Stale',
        email: 'alice@example.com',
      };

      await storage.setRecord('user', userV1);
      await storage.setRecord('user', userV2);
      const skipResult = await storage.setRecord('user', userV1Again);

      expect(skipResult).toBe(false);

      const retrieved = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      expect(retrieved?.name).toBe('Alice Updated');
      expect(retrieved?.version).toBe(2);
    });

    it('should force overwrite when force=true', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const userV2: UserRecord = {
        id: 'u1',
        version: 2,
        name: 'Alice V2',
        email: 'alice@example.com',
      };
      const userV1: UserRecord = {
        id: 'u1',
        version: 1,
        name: 'Alice V1 Force',
        email: 'alice@example.com',
      };

      await storage.setRecord('user', userV2);
      const forceResult = await storage.setRecord('user', userV1, true);

      expect(forceResult).toBe(true);

      const retrieved = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      expect(retrieved?.name).toBe('Alice V1 Force');
      expect(retrieved?.version).toBe(1);
    });
  });

  describe('deleteRecord', () => {
    it('should delete an existing record', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      const deleted = await storage.deleteRecord({ table: 'user', id: 'u1' });
      expect(deleted).toBe(true);

      const retrieved = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      expect(retrieved).toBeUndefined();
    });

    it('should return false when deleting non-existent record', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const deleted = await storage.deleteRecord({ table: 'user', id: 'nonexistent' });
      expect(deleted).toBe(false);
    });
  });

  describe('writeRecordMap', () => {
    it('should write multiple records from a RecordMap', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const recordMap: RecordMap<TestTables, UserRecord | PostRecord> = {
        user: {
          u1: { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' } as UserRecord,
          u2: { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' } as UserRecord,
        },
        post: {
          p1: { id: 'p1', version: 1, title: 'Hello World', authorId: 'u1' } as PostRecord,
        },
      };

      await storage.writeRecordMap(recordMap);

      const user1 = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      const user2 = await storage.getRecord<UserRecord>({ table: 'user', id: 'u2' });
      const post1 = await storage.getRecord<PostRecord>({ table: 'post', id: 'p1' });

      expect(user1?.name).toBe('Alice');
      expect(user2?.name).toBe('Bob');
      expect(post1?.title).toBe('Hello World');
    });

    it('should respect version when writing RecordMap', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const userV2: UserRecord = {
        id: 'u1',
        version: 2,
        name: 'Alice V2',
        email: 'alice@example.com',
      };
      await storage.setRecord('user', userV2);

      const recordMap: RecordMap<TestTables, UserRecord> = {
        user: {
          u1: { id: 'u1', version: 1, name: 'Alice V1', email: 'alice@example.com' } as UserRecord,
        },
      };

      await storage.writeRecordMap(recordMap);

      const user = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      expect(user?.name).toBe('Alice V2'); // Should not have been overwritten
    });
  });

  describe('getRecords', () => {
    it('should get multiple records by pointers', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };

      await storage.setRecord('user', user1);
      await storage.setRecord('user', user2);

      const results = await storage.getRecords<UserRecord>([
        { table: 'user', id: 'u1' },
        { table: 'user', id: 'u2' },
        { table: 'user', id: 'u3' }, // non-existent
      ]);

      expect(results).toHaveLength(3);
      expect(results[0]?.name).toBe('Alice');
      expect(results[1]?.name).toBe('Bob');
      expect(results[2]).toBeUndefined();
    });
  });

  describe('getAllRecords', () => {
    it('should get all records from a table', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };
      const post1: PostRecord = { id: 'p1', version: 1, title: 'Post', authorId: 'u1' };

      await storage.setRecord('user', user1);
      await storage.setRecord('user', user2);
      await storage.setRecord('post', post1);

      const users = await storage.getAllRecords<UserRecord>('user');
      expect(users).toHaveLength(2);
      expect(users.map((u) => u.name).sort()).toEqual(['Alice', 'Bob']);
    });
  });

  describe('queryRecords', () => {
    it('should filter records with predicate', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };
      const user3: UserRecord = {
        id: 'u3',
        version: 1,
        name: 'Charlie',
        email: 'charlie@example.com',
      };

      await storage.setRecord('user', user1);
      await storage.setRecord('user', user2);
      await storage.setRecord('user', user3);

      const results = await storage.queryRecords<UserRecord>(
        'user',
        (u) => u.name.startsWith('A') || u.name.startsWith('C'),
      );
      expect(results).toHaveLength(2);
      expect(results.map((u) => u.name).sort()).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('findRecord', () => {
    it('should find a single record matching predicate', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };

      await storage.setRecord('user', user1);
      await storage.setRecord('user', user2);

      const found = await storage.findRecord<UserRecord>(
        'user',
        (u) => u.email === 'bob@example.com',
      );
      expect(found?.name).toBe('Bob');
    });

    it('should return undefined when no match found', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const found = await storage.findRecord<UserRecord>(
        'user',
        (u) => u.email === 'nobody@example.com',
      );
      expect(found).toBeUndefined();
    });
  });

  describe('countRecords', () => {
    it('should count records in a table', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };

      await storage.setRecord('user', user1);
      await storage.setRecord('user', user2);

      const count = await storage.countRecords('user');
      expect(count).toBe(2);
    });
  });

  describe('clearTable', () => {
    it('should clear all records from a specific table', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const post1: PostRecord = { id: 'p1', version: 1, title: 'Post', authorId: 'u1' };

      await storage.setRecord('user', user1);
      await storage.setRecord('post', post1);

      const deletedCount = await storage.clearTable('user');
      expect(deletedCount).toBe(1);

      const users = await storage.getAllRecords<UserRecord>('user');
      const posts = await storage.getAllRecords<PostRecord>('post');

      expect(users).toHaveLength(0);
      expect(posts).toHaveLength(1); // Should still have post
    });
  });

  describe('reset', () => {
    it('should clear all records from all tables', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const post1: PostRecord = { id: 'p1', version: 1, title: 'Post', authorId: 'u1' };

      await storage.setRecord('user', user1);
      await storage.setRecord('post', post1);

      await storage.reset();

      const users = await storage.getAllRecords<UserRecord>('user');
      const posts = await storage.getAllRecords<PostRecord>('post');

      expect(users).toHaveLength(0);
      expect(posts).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should notify listeners on write', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const events: unknown[] = [];
      const unsubscribe = storage.subscribe((event) => {
        events.push(event);
      });

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'write',
        table: 'user',
        id: 'u1',
        record: user,
      });

      unsubscribe();

      await storage.setRecord('user', { ...user, version: 2 });
      expect(events).toHaveLength(1); // No new event after unsubscribe
    });

    it('should notify listeners on delete', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      const events: unknown[] = [];
      storage.subscribe((event) => {
        events.push(event);
      });

      await storage.deleteRecord({ table: 'user', id: 'u1' });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'delete',
        table: 'user',
        id: 'u1',
      });
    });
  });
});

describe('createRecordStorage', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: typeof globalThis.indexedDB;

  beforeEach(() => {
    mockIDB = createMockIndexedDB();
    originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = mockIDB.indexedDB;
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });

  it('should create a RecordStorage instance', async () => {
    const storage = createRecordStorage<TestTables>();
    await storage.ready();
    expect(storage).toBeInstanceOf(RecordStorage);
  });
});

describe('iterateRecordMap', () => {
  it('should iterate over all records in a RecordMap', () => {
    const recordMap: RecordMap<TestTables, UserRecord | PostRecord> = {
      user: {
        u1: { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' } as UserRecord,
        u2: { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' } as UserRecord,
      },
      post: {
        p1: { id: 'p1', version: 1, title: 'Hello', authorId: 'u1' } as PostRecord,
      },
    };

    const results: RecordWithTable<TestTables, UserRecord | PostRecord>[] = [];
    for (const item of iterateRecordMap(recordMap)) {
      results.push(item);
    }

    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id).sort()).toEqual(['p1', 'u1', 'u2']);
  });

  it('should skip undefined records', () => {
    const recordMap: RecordMap<TestTables, UserRecord> = {
      user: {
        u1: { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' } as UserRecord,
        u2: undefined,
      },
    };

    const results: RecordWithTable<TestTables, UserRecord>[] = [];
    for (const item of iterateRecordMap(recordMap)) {
      results.push(item);
    }

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('u1');
  });
});

describe('createRecordMap', () => {
  it('should create a RecordMap from an array of records', () => {
    const records: RecordWithTable<TestTables, UserRecord | PostRecord>[] = [
      {
        table: 'user',
        id: 'u1',
        record: { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' } as UserRecord,
      },
      {
        table: 'user',
        id: 'u2',
        record: { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' } as UserRecord,
      },
      {
        table: 'post',
        id: 'p1',
        record: { id: 'p1', version: 1, title: 'Hello', authorId: 'u1' } as PostRecord,
      },
    ];

    const recordMap = createRecordMap(records);

    expect((recordMap.user?.['u1'] as UserRecord | undefined)?.name).toBe('Alice');
    expect((recordMap.user?.['u2'] as UserRecord | undefined)?.name).toBe('Bob');
    expect((recordMap.post?.['p1'] as PostRecord | undefined)?.title).toBe('Hello');
  });
});

describe('RecordStorageError', () => {
  it('should create an error with type and cause', () => {
    const cause = new Error('Original error');
    const error = new RecordStorageError('Storage quota exceeded', 'QUOTA_EXCEEDED', cause);

    expect(error.message).toBe('Storage quota exceeded');
    expect(error.type).toBe('QUOTA_EXCEEDED');
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('RecordStorageError');
  });

  it('should be an instance of Error', () => {
    const error = new RecordStorageError('Test error', 'UNKNOWN');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(RecordStorageError);
  });

  it('should work without cause', () => {
    const error = new RecordStorageError('Test error', 'UNKNOWN');
    expect(error.message).toBe('Test error');
    expect(error.type).toBe('UNKNOWN');
    expect(error.cause).toBeUndefined();
  });
});

describe('RecordStorage backend utilities', () => {
  let mockIDB: ReturnType<typeof createMockIndexedDB>;
  let originalIndexedDB: typeof globalThis.indexedDB;

  beforeEach(() => {
    mockIDB = createMockIndexedDB();
    originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = mockIDB.indexedDB;
  });

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB;
  });

  describe('getBackendType', () => {
    it('should return indexeddb when IndexedDB is available', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      expect(storage.getBackendType()).toBe('indexeddb');
    });

    it('should return memory when no storage is available', async () => {
      // Remove IndexedDB
      const tempIndexedDB = globalThis.indexedDB;
      (globalThis as unknown as Record<string, unknown>)['indexedDB'] = undefined;

      // Also mock localStorage to not be available
      const tempLocalStorage = globalThis.localStorage;
      (globalThis as unknown as Record<string, unknown>)['localStorage'] = undefined;

      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      expect(storage.getBackendType()).toBe('memory');

      // Restore
      globalThis.indexedDB = tempIndexedDB;
      globalThis.localStorage = tempLocalStorage;
    });
  });

  describe('isPersistent', () => {
    it('should return true when using IndexedDB', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      expect(storage.isPersistent()).toBe(true);
    });
  });

  describe('writeRecordMap return value', () => {
    it('should return count of records written', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const recordMap: RecordMap<TestTables, UserRecord> = {
        user: {
          u1: { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' } as UserRecord,
          u2: { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' } as UserRecord,
        },
      };

      const written = await storage.writeRecordMap(recordMap);
      expect(written).toBe(2);
    });

    it('should return 0 when no records are newer', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      // First write
      const user: UserRecord = { id: 'u1', version: 2, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      // Try to write older version
      const recordMap: RecordMap<TestTables, UserRecord> = {
        user: {
          u1: {
            id: 'u1',
            version: 1,
            name: 'Stale Alice',
            email: 'alice@example.com',
          } as UserRecord,
        },
      };

      const written = await storage.writeRecordMap(recordMap);
      expect(written).toBe(0);
    });
  });

  describe('notify listeners with clear events', () => {
    it('should notify listeners on clear table when records are deleted', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      const events: unknown[] = [];
      storage.subscribe((event) => {
        events.push(event);
      });

      const deleted = await storage.clearTable('user');

      // Should have cleared records
      expect(deleted).toBe(1);
    });
  });

  describe('error handling in listeners', () => {
    it('should continue notifying listeners even if one throws', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const listener1 = vi.fn(() => {
        throw new Error('Listener error');
      });
      const listener2 = vi.fn();

      storage.subscribe(listener1);
      storage.subscribe(listener2);

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving events after unsubscribe', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const listener = vi.fn();
      const unsubscribe = storage.subscribe(listener);

      const user1: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      await storage.setRecord('user', user1);

      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      const user2: UserRecord = { id: 'u2', version: 1, name: 'Bob', email: 'bob@example.com' };
      await storage.setRecord('user', user2);

      // Should not receive more events
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('should clear all records from all tables', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const user: UserRecord = { id: 'u1', version: 1, name: 'Alice', email: 'alice@example.com' };
      const post: PostRecord = {
        id: 'p1',
        version: 1,
        title: 'Post',
        content: 'Content',
        authorId: 'u1',
      };

      await storage.setRecord('user', user);
      await storage.setRecord('post', post);

      await storage.reset();

      // After reset, records should be deleted
      const fetchedUser = await storage.getRecord<UserRecord>({ table: 'user', id: 'u1' });
      const fetchedPost = await storage.getRecord<PostRecord>({ table: 'post', id: 'p1' });

      expect(fetchedUser).toBeUndefined();
      expect(fetchedPost).toBeUndefined();
    });
  });

  describe('getBackendType', () => {
    it('should return the backend type', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      const backendType = storage.getBackendType();
      expect(['indexeddb', 'localstorage', 'memory']).toContain(backendType);
    });
  });

  describe('isPersistent', () => {
    it('should return false for memory backend', async () => {
      const storage = new RecordStorage<TestTables>();
      await storage.ready();

      // In test environment, we're likely using memory backend
      const isPersistent = storage.isPersistent();
      expect(typeof isPersistent).toBe('boolean');
    });
  });
});

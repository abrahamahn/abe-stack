// src/server/db/src/__tests__/json-db.test.ts

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { createJsonDbClient, JsonDatabase, JsonDbClient } from '../testing/json-db';

// ============================================================================
// Test Helpers
// ============================================================================

interface TestRecord extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt?: Date;
}

function createTestDir(): string {
  const testDir = join(
    tmpdir(),
    `json-db-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
  return testDir;
}

function cleanupTestDir(testDir: string): void {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
}

// ============================================================================
// Tests: JsonDatabase Core Operations
// ============================================================================

describe('JsonDatabase', () => {
  let testDir: string;
  let filePath: string;

  beforeEach(() => {
    testDir = createTestDir();
    filePath = join(testDir, 'test-db.json');
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe('constructor', () => {
    test('should create database with empty tables when file does not exist', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const data = db.getData();
      expect(data.users).toEqual([]);
      expect(data.refresh_tokens).toEqual([]);
      expect(data.login_attempts).toEqual([]);
    });

    test('should load existing data from file', () => {
      const existingData = {
        users: [{ id: '1', email: 'test@example.com' }],
      };
      writeFileSync(filePath, JSON.stringify(existingData), { mode: 0o600 });

      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const data = db.getData();
      expect(data.users).toHaveLength(1);
      expect(data.users[0]).toMatchObject({ id: '1', email: 'test@example.com' });
    });

    test('should handle corrupted JSON file gracefully', () => {
      writeFileSync(filePath, 'not valid json {{{', { mode: 0o600 });

      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      // Should fall back to default schema
      const data = db.getData();
      expect(data.users).toEqual([]);
    });
  });

  describe('getAll', () => {
    test('should return empty array for empty table', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const users = db.getAll('users');

      expect(users).toEqual([]);
    });

    test('should return shallow copy of records', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'Test' });

      const users1 = db.getAll('users');
      const users2 = db.getAll('users');

      expect(users1).not.toBe(users2);
      expect(users1).toEqual(users2);
    });
  });

  describe('find', () => {
    test('should find records matching object condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });
      await db.insert<TestRecord>('users', { id: '2', name: 'Bob', email: 'bob@test.com' });

      const results = db.find<TestRecord>('users', { where: { name: 'Alice' } });

      expect(results).toHaveLength(1);
      expect(results[0]!.email).toBe('alice@test.com');
    });

    test('should find records matching function condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        age: 25,
      });
      await db.insert<TestRecord>('users', {
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        age: 30,
      });

      const results = db.find<TestRecord>('users', {
        where: (record) => (record.age ?? 0) >= 28,
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('Bob');
    });

    test('should respect limit option', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'A' });
      await db.insert('users', { id: '2', name: 'B' });
      await db.insert('users', { id: '3', name: 'C' });

      const results = db.find('users', { limit: 2 });

      expect(results).toHaveLength(2);
    });

    test('should respect offset option', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'A' });
      await db.insert('users', { id: '2', name: 'B' });
      await db.insert('users', { id: '3', name: 'C' });

      const results = db.find('users', { offset: 1 });

      expect(results).toHaveLength(2);
      expect(results[0]).toMatchObject({ name: 'B' });
    });

    test('should respect orderBy option ascending', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Charlie', email: 'c@test.com' });
      await db.insert<TestRecord>('users', { id: '2', name: 'Alice', email: 'a@test.com' });
      await db.insert<TestRecord>('users', { id: '3', name: 'Bob', email: 'b@test.com' });

      const results = db.find<TestRecord>('users', {
        orderBy: { field: 'name', direction: 'asc' },
      });

      expect(results[0]!.name).toBe('Alice');
      expect(results[1]!.name).toBe('Bob');
      expect(results[2]!.name).toBe('Charlie');
    });

    test('should respect orderBy option descending', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Charlie', email: 'c@test.com' });
      await db.insert<TestRecord>('users', { id: '2', name: 'Alice', email: 'a@test.com' });
      await db.insert<TestRecord>('users', { id: '3', name: 'Bob', email: 'b@test.com' });

      const results = db.find<TestRecord>('users', {
        orderBy: { field: 'name', direction: 'desc' },
      });

      expect(results[0]!.name).toBe('Charlie');
      expect(results[1]!.name).toBe('Bob');
      expect(results[2]!.name).toBe('Alice');
    });
  });

  describe('findFirst', () => {
    test('should return first matching record', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });
      await db.insert<TestRecord>('users', { id: '2', name: 'Alice', email: 'alice2@test.com' });

      const result = db.findFirst<TestRecord>('users', { where: { name: 'Alice' } });

      expect(result).toBeDefined();
      expect(result?.email).toBe('alice@test.com');
    });

    test('should return undefined when no match', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = db.findFirst('users', { where: { name: 'NonExistent' } });

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    test('should find record by id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: 'user-123',
        name: 'Alice',
        email: 'alice@test.com',
      });

      const result = db.findById('users', 'user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
    });

    test('should return undefined for non-existent id', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = db.findById('users', 'non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('insert', () => {
    test('should insert record with auto-generated id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = await db.insert<TestRecord>('users', {
        name: 'Alice',
        email: 'alice@test.com',
      });

      expect(result.id).toBeDefined();
      expect(result.id).toMatch(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/);
      expect(result.name).toBe('Alice');
    });

    test('should insert record with provided id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = await db.insert<TestRecord>('users', {
        id: 'custom-id',
        name: 'Alice',
        email: 'alice@test.com',
      });

      expect(result.id).toBe('custom-id');
    });

    test('should create table if it does not exist', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      await db.insert('custom_table', { id: '1', data: 'test' });

      const data = db.getData();
      expect(data.custom_table).toHaveLength(1);
    });

    test('should persist to file when persistOnWrite is true', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: true });

      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });

      expect(existsSync(filePath)).toBe(true);

      // Reload and verify
      const db2 = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      const users = db2.getAll('users');
      expect(users).toHaveLength(1);
    });
  });

  describe('insertMany', () => {
    test('should insert multiple records', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const results = await db.insertMany<TestRecord>('users', [
        { name: 'Alice', email: 'alice@test.com' },
        { name: 'Bob', email: 'bob@test.com' },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0]!.id).toBeDefined();
      expect(results[1]!.id).toBeDefined();

      const allUsers = db.getAll('users');
      expect(allUsers).toHaveLength(2);
    });
  });

  describe('update', () => {
    test('should update records matching condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'old@test.com' });

      const updated = await db.update<TestRecord>('users', { email: 'new@test.com' }, { id: '1' });

      expect(updated).toHaveLength(1);
      expect(updated[0]!.email).toBe('new@test.com');
      expect(updated[0]!.name).toBe('Alice'); // unchanged
    });

    test('should update multiple matching records', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        age: 25,
      });
      await db.insert<TestRecord>('users', {
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        age: 25,
      });

      const updated = await db.update<TestRecord>('users', { age: 26 }, { age: 25 });

      expect(updated).toHaveLength(2);
      expect(updated[0]!.age).toBe(26);
      expect(updated[1]!.age).toBe(26);
    });

    test('should return empty array when no matches', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const updated = await db.update('users', { name: 'Updated' }, { id: 'non-existent' });

      expect(updated).toEqual([]);
    });

    test('should support function condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        age: 25,
      });
      await db.insert<TestRecord>('users', {
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        age: 35,
      });

      const updated = await db.update<TestRecord>(
        'users',
        { name: 'Senior' },
        (record) => (record.age ?? 0) >= 30,
      );

      expect(updated).toHaveLength(1);
      expect(updated[0]!.id).toBe('2');
      expect(updated[0]!.name).toBe('Senior');
    });
  });

  describe('updateById', () => {
    test('should update record by id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@test.com',
      });

      const result = await db.updateById<TestRecord>('users', 'user-1', { name: 'Alice Updated' });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Alice Updated');
    });

    test('should return undefined for non-existent id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = await db.updateById('users', 'non-existent', { name: 'Updated' });

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    test('should delete records matching condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });
      await db.insert<TestRecord>('users', { id: '2', name: 'Bob', email: 'bob@test.com' });

      const deleted = await db.delete('users', { id: '1' });

      expect(deleted).toHaveLength(1);
      expect(deleted[0]!.id).toBe('1');

      const remaining = db.getAll('users');
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe('2');
    });

    test('should return empty array when no matches', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const deleted = await db.delete('users', { id: 'non-existent' });

      expect(deleted).toEqual([]);
    });
  });

  describe('deleteById', () => {
    test('should delete record by id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: 'user-1',
        name: 'Alice',
        email: 'alice@test.com',
      });

      const result = await db.deleteById('users', 'user-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-1');

      const remaining = db.getAll('users');
      expect(remaining).toHaveLength(0);
    });

    test('should return undefined for non-existent id', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = await db.deleteById('users', 'non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('count', () => {
    test('should count all records in table', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'A' });
      await db.insert('users', { id: '2', name: 'B' });
      await db.insert('users', { id: '3', name: 'C' });

      const count = db.count('users');

      expect(count).toBe(3);
    });

    test('should count records matching condition', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', {
        id: '1',
        name: 'Alice',
        email: 'alice@test.com',
        age: 25,
      });
      await db.insert<TestRecord>('users', {
        id: '2',
        name: 'Bob',
        email: 'bob@test.com',
        age: 30,
      });
      await db.insert<TestRecord>('users', {
        id: '3',
        name: 'Charlie',
        email: 'charlie@test.com',
        age: 25,
      });

      const count = db.count('users', { age: 25 } as Record<string, unknown>);

      expect(count).toBe(2);
    });

    test('should return 0 for empty table', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const count = db.count('users');

      expect(count).toBe(0);
    });
  });

  describe('clearTable', () => {
    test('should clear all records from table', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'A' });
      await db.insert('users', { id: '2', name: 'B' });

      await db.clearTable('users');

      const users = db.getAll('users');
      expect(users).toEqual([]);
    });
  });

  describe('clearAll', () => {
    test('should clear all tables', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'A' });
      await db.insert('refresh_tokens', { id: '1', token: 'abc' });

      await db.clearAll();

      const data = db.getData();
      expect(data.users).toEqual([]);
      expect(data.refresh_tokens).toEqual([]);
    });
  });

  describe('execute', () => {
    test('should return mock result for compatibility', () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });

      const result = db.execute();

      expect(result).toEqual([{ ['?column?']: 1 }]);
    });
  });

  describe('snapshots', () => {
    test('should create snapshot of current state', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });

      const snapshot = db.createSnapshot();

      expect(snapshot.users).toHaveLength(1);
      expect(snapshot.users[0]).toMatchObject({ id: '1', name: 'Alice' });
    });

    test('should restore state from snapshot', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert<TestRecord>('users', { id: '1', name: 'Alice', email: 'alice@test.com' });

      const snapshot = db.createSnapshot();

      await db.insert<TestRecord>('users', { id: '2', name: 'Bob', email: 'bob@test.com' });
      expect(db.getAll('users')).toHaveLength(2);

      await db.restoreSnapshot(snapshot);

      expect(db.getAll('users')).toHaveLength(1);
      expect(db.getAll('users')[0]!.id).toBe('1');
    });

    test('snapshot should be independent copy', async () => {
      const db = new JsonDatabase({ provider: 'json', filePath, persistOnWrite: false });
      await db.insert('users', { id: '1', name: 'Original' });

      const snapshot = db.createSnapshot();

      // Modify original
      await db.updateById('users', '1', { name: 'Modified' });

      // Snapshot should be unchanged
      expect(snapshot.users[0]).toMatchObject({ name: 'Original' });
    });
  });
});

// ============================================================================
// Tests: JsonDbClient (Drizzle-compatible wrapper)
// ============================================================================

describe('JsonDbClient', () => {
  let testDir: string;
  let filePath: string;
  let client: JsonDbClient;

  beforeEach(() => {
    testDir = createTestDir();
    filePath = join(testDir, 'test-db.json');
    client = createJsonDbClient({ provider: 'json', filePath, persistOnWrite: false });
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe('select', () => {
    test('should select all records from table', async () => {
      await client.insert('users').values({ name: 'Alice', email: 'alice@test.com' });
      await client.insert('users').values({ name: 'Bob', email: 'bob@test.com' });

      const results = await client.select().from('users');

      expect(results).toHaveLength(2);
    });

    test('should select with where condition', async () => {
      await client.insert('users').values({ name: 'Alice', email: 'alice@test.com' });
      await client.insert('users').values({ name: 'Bob', email: 'bob@test.com' });

      const results = await client.select().from('users').where({ name: 'Alice' });

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ name: 'Alice' });
    });

    test('should select with limit', async () => {
      await client.insert('users').values({ name: 'A', email: 'a@test.com' });
      await client.insert('users').values({ name: 'B', email: 'b@test.com' });
      await client.insert('users').values({ name: 'C', email: 'c@test.com' });

      const results = await client.select().from('users').limit(2);

      expect(results).toHaveLength(2);
    });

    test('should select with offset', async () => {
      await client.insert('users').values({ name: 'A', email: 'a@test.com' });
      await client.insert('users').values({ name: 'B', email: 'b@test.com' });
      await client.insert('users').values({ name: 'C', email: 'c@test.com' });

      const results = await client.select().from('users').offset(1);

      expect(results).toHaveLength(2);
    });

    test('should return builder without immediate execution', () => {
      // select() returns a builder, not a promise
      const builder = client.select();
      // Verify the builder has the expected methods
      expect(builder.from).toBeDefined();
      expect(builder.where).toBeDefined();
      expect(builder.limit).toBeDefined();
      expect(builder.offset).toBeDefined();
    });
  });

  describe('insert', () => {
    test('should insert single record', async () => {
      const results = await client
        .insert('users')
        .values({ name: 'Alice', email: 'alice@test.com' })
        .returning();

      expect(results).toHaveLength(1);
      expect(results[0]!.id).toBeDefined();
    });

    test('should insert multiple records', async () => {
      const results = await client
        .insert('users')
        .values([
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' },
        ])
        .returning();

      expect(results).toHaveLength(2);
    });

    test('should return empty array without returning()', async () => {
      const results = await client
        .insert('users')
        .values({ name: 'Alice', email: 'alice@test.com' });

      expect(results).toEqual([]);
    });
  });

  describe('update', () => {
    test('should update records with where condition', async () => {
      await client.insert('users').values({ id: 'user-1', name: 'Alice', email: 'old@test.com' });

      const results = await client
        .update('users')
        .set({ email: 'new@test.com' })
        .where({ id: 'user-1' })
        .returning();

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ email: 'new@test.com' });
    });

    test('should throw error when where not specified', async () => {
      await expect(client.update('users').set({ name: 'Updated' })).rejects.toThrow(
        'WHERE condition required',
      );
    });
  });

  describe('delete', () => {
    test('should delete records with where condition', async () => {
      await client.insert('users').values({ id: 'user-1', name: 'Alice', email: 'alice@test.com' });
      await client.insert('users').values({ id: 'user-2', name: 'Bob', email: 'bob@test.com' });

      const deleted = await client.delete('users').where({ id: 'user-1' }).returning();

      expect(deleted).toHaveLength(1);

      const remaining = await client.select().from('users');
      expect(remaining).toHaveLength(1);
    });

    test('should throw error when where not specified', async () => {
      await expect(client.delete('users')).rejects.toThrow('WHERE condition required');
    });
  });

  describe('execute', () => {
    test('should return mock result for health checks', async () => {
      const result = await client.execute('SELECT 1');

      expect(result).toEqual([{ ['?column?']: 1 }]);
    });
  });

  describe('query API', () => {
    test('should provide query.users accessor', async () => {
      await client.insert('users').values({ name: 'Alice', email: 'alice@test.com' });

      const user = client.query.users.findFirst({ where: { name: 'Alice' } });

      expect(user).toBeDefined();
      expect(user).toMatchObject({ name: 'Alice' });
    });

    test('should provide query.refreshTokens accessor', async () => {
      await client.insert('refresh_tokens').values({ token: 'abc123', userId: 'user-1' });

      const tokens = client.query.refreshTokens.findMany({});

      expect(tokens).toHaveLength(1);
    });

    test('findFirst should return undefined when no match', () => {
      const result = client.query.users.findFirst({ where: { name: 'NonExistent' } });

      expect(result).toBeUndefined();
    });

    test('findMany should return empty array when no matches', () => {
      const results = client.query.users.findMany({ where: { name: 'NonExistent' } });

      expect(results).toEqual([]);
    });

    test('findMany should support limit and offset', async () => {
      await client.insert('users').values([
        { name: 'A', email: 'a@test.com' },
        { name: 'B', email: 'b@test.com' },
        { name: 'C', email: 'c@test.com' },
      ]);

      const results = client.query.users.findMany({ limit: 2, offset: 1 });

      expect(results).toHaveLength(2);
    });
  });

  describe('transaction', () => {
    test('should execute callback successfully', async () => {
      const result = await client.transaction(async (tx) => {
        await tx.insert('users').values({ name: 'Alice', email: 'alice@test.com' });
        return 'success';
      });

      expect(result).toBe('success');

      const users = await client.select().from('users');
      expect(users).toHaveLength(1);
    });

    test('should rollback on error', async () => {
      await client.insert('users').values({ name: 'Original', email: 'original@test.com' });

      await expect(
        client.transaction(async (tx) => {
          await tx.insert('users').values({ name: 'New', email: 'new@test.com' });
          throw new Error('Transaction failed');
        }),
      ).rejects.toThrow('Transaction failed');

      // Should have rolled back to original state
      const users = await client.select().from('users');
      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({ name: 'Original' });
    });

    test('should allow nested operations', async () => {
      const result = await client.transaction(async (tx) => {
        await tx.insert('users').values({ id: 'user-1', name: 'Alice', email: 'alice@test.com' });
        await tx.insert('refresh_tokens').values({ userId: 'user-1', token: 'token-1' });

        const users = await tx.select().from('users');
        const tokens = await tx.select().from('refresh_tokens');

        return { userCount: users.length, tokenCount: tokens.length };
      });

      expect(result).toEqual({ userCount: 1, tokenCount: 1 });
    });
  });

  describe('getDatabase', () => {
    test('should return underlying JsonDatabase instance', () => {
      const db = client.getDatabase();

      expect(db).toBeInstanceOf(JsonDatabase);
    });
  });
});

// ============================================================================
// Tests: createJsonDbClient factory
// ============================================================================

describe('createJsonDbClient', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestDir();
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  test('should create JsonDbClient instance', () => {
    const filePath = join(testDir, 'test.json');
    const client = createJsonDbClient({ provider: 'json', filePath, persistOnWrite: false });

    expect(client).toBeInstanceOf(JsonDbClient);
  });

  test('should create directory if it does not exist', async () => {
    const filePath = join(testDir, 'subdir', 'nested', 'test.json');
    const client = createJsonDbClient({ provider: 'json', filePath, persistOnWrite: true });

    await client.insert('users').values({ name: 'Test', email: 'test@test.com' });

    expect(existsSync(filePath)).toBe(true);
  });
});

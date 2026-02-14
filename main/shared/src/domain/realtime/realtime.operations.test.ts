// main/shared/src/domain/realtime/realtime.operations.test.ts
/**
 * Tests for pure realtime operation logic.
 */

import { describe, expect, test } from 'vitest';

import {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isFieldMutable,
} from './realtime.operations';

import type {
  ListInsertOperation,
  ListRemoveOperation,
  RealtimeOperation,
  RealtimeRecord,
  RecordMap,
  SetNowOperation,
  SetOperation,
} from './realtime.schemas';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestRecord(overrides: Partial<RealtimeRecord> = {}): RealtimeRecord {
  return {
    id: 'record-123',
    version: 1,
    name: 'Test Record',
    email: 'test@example.com',
    tags: ['tag1', 'tag2'],
    metadata: { key: 'value' },
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Field Validation', () => {
  test('should allow mutable fields', () => {
    expect(isFieldMutable('name')).toBe(true);
    expect(isFieldMutable('email')).toBe(true);
    expect(isFieldMutable('tags')).toBe(true);
    expect(isFieldMutable('metadata')).toBe(true);
  });

  test('should reject protected fields', () => {
    expect(isFieldMutable('id')).toBe(false);
    expect(isFieldMutable('version')).toBe(false);
    expect(isFieldMutable('created_at')).toBe(false);
    expect(isFieldMutable('updated_at')).toBe(false);
    expect(isFieldMutable('password_hash')).toBe(false);
    expect(isFieldMutable('passwordHash')).toBe(false);
  });
});

describe('getOperationPointers', () => {
  test('should extract unique pointers from operations', () => {
    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'New Name' },
      { type: 'set', table: 'users', id: 'user-2', key: 'name', value: 'Other Name' },
      { type: 'set', table: 'posts', id: 'post-1', key: 'title', value: 'Title' },
    ];

    const pointers = getOperationPointers(operations);

    expect(pointers).toHaveLength(3);
    expect(pointers).toContainEqual({ table: 'users', id: 'user-1' });
    expect(pointers).toContainEqual({ table: 'users', id: 'user-2' });
    expect(pointers).toContainEqual({ table: 'posts', id: 'post-1' });
  });

  test('should deduplicate pointers for same record', () => {
    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Name 1' },
      { type: 'set', table: 'users', id: 'user-1', key: 'email', value: 'email@test.com' },
      { type: 'set', table: 'users', id: 'user-1', key: 'bio', value: 'Bio' },
    ];

    const pointers = getOperationPointers(operations);

    expect(pointers).toHaveLength(1);
    expect(pointers[0]).toEqual({ table: 'users', id: 'user-1' });
  });

  test('should return empty array for empty operations', () => {
    const pointers = getOperationPointers([]);
    expect(pointers).toHaveLength(0);
  });
});

describe('applyOperation', () => {
  describe('SET operation', () => {
    test('should apply set operation to top-level field', () => {
      const record = createTestRecord();
      const op: SetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'name',
        value: 'Updated Name',
      };

      const result = applyOperation(record, op);

      expect(result['name']).toBe('Updated Name');
      expect(result.version).toBe(2);
      expect(result['email']).toBe(record['email']);
    });

    test('should apply set operation to nested field', () => {
      const record = createTestRecord({ metadata: { key: 'value', nested: { deep: true } } });
      const op: SetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'metadata.key',
        value: 'newValue',
      };

      const result = applyOperation(record, op);

      expect((result['metadata'] as Record<string, unknown>)['key']).toBe('newValue');
    });

    test('should create nested path if it does not exist', () => {
      const record = createTestRecord();
      const op: SetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'settings.theme.color',
        value: 'dark',
      };

      const result = applyOperation(record, op);

      const settings = result['settings'] as Record<string, Record<string, string>>;
      expect(settings['theme']?.['color']).toBe('dark');
    });

    test('should throw for protected fields', () => {
      const record = createTestRecord();
      const op: SetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'id',
        value: 'new-id',
      };

      expect(() => applyOperation(record, op)).toThrow("Field 'id' cannot be modified");
    });

    test('should throw for version field', () => {
      const record = createTestRecord();
      const op: SetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'version',
        value: 999,
      };

      expect(() => applyOperation(record, op)).toThrow("Field 'version' cannot be modified");
    });
  });

  describe('SET_NOW operation', () => {
    test('should set field to current timestamp', () => {
      const record = createTestRecord();
      const op: SetNowOperation = {
        type: 'set-now',
        table: 'users',
        id: record.id,
        key: 'lastSeen',
      };

      const before = new Date().toISOString();
      const result = applyOperation(record, op);
      const after = new Date().toISOString();

      const lastSeen = result['lastSeen'] as string;
      expect(lastSeen >= before).toBe(true);
      expect(lastSeen <= after).toBe(true);
    });
  });

  describe('listInsert operation', () => {
    test('should prepend item to list', () => {
      const record = createTestRecord({ tags: ['b', 'c'] });
      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'a',
        position: 'prepend',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'b', 'c']);
    });

    test('should append item to list', () => {
      const record = createTestRecord({ tags: ['a', 'b'] });
      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'c',
        position: 'append',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'b', 'c']);
    });

    test('should insert item before specified element', () => {
      const record = createTestRecord({ tags: ['a', 'c'] });
      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'b',
        position: { before: 'c' },
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'b', 'c']);
    });

    test('should insert item after specified element', () => {
      const record = createTestRecord({ tags: ['a', 'c'] });
      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'b',
        position: { after: 'a' },
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'b', 'c']);
    });

    test('should remove duplicates when inserting', () => {
      const record = createTestRecord({ tags: ['a', 'b', 'c'] });
      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'b',
        position: 'prepend',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['b', 'a', 'c']);
    });

    test('should create list if field does not exist', () => {
      const record = createTestRecord();
      delete (record as Record<string, unknown>)['tags'];

      const op: ListInsertOperation = {
        type: 'listInsert',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'first',
        position: 'append',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['first']);
    });
  });

  describe('listRemove operation', () => {
    test('should remove item from list', () => {
      const record = createTestRecord({ tags: ['a', 'b', 'c'] });
      const op: ListRemoveOperation = {
        type: 'listRemove',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'b',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'c']);
    });

    test('should handle removing non-existent item', () => {
      const record = createTestRecord({ tags: ['a', 'b'] });
      const op: ListRemoveOperation = {
        type: 'listRemove',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'z',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toEqual(['a', 'b']);
    });

    test('should handle removing from non-array field', () => {
      const record = createTestRecord({ tags: 'not-an-array' });
      const op: ListRemoveOperation = {
        type: 'listRemove',
        table: 'users',
        id: record.id,
        key: 'tags',
        value: 'a',
      };

      const result = applyOperation(record, op);

      expect(result['tags']).toBe('not-an-array');
    });
  });
});

describe('applyOperations', () => {
  test('should apply multiple operations to record map', () => {
    const recordMap: RecordMap = {
      users: {
        'user-1': createTestRecord({ id: 'user-1', name: 'User 1', version: 1 }),
        'user-2': createTestRecord({ id: 'user-2', name: 'User 2', version: 1 }),
      },
    };

    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Updated User 1' },
      { type: 'set', table: 'users', id: 'user-2', key: 'name', value: 'Updated User 2' },
    ];

    const result = applyOperations(recordMap, operations);

    expect((result.recordMap['users']?.['user-1'] as RealtimeRecord)['name']).toBe(
      'Updated User 1',
    );
    expect((result.recordMap['users']?.['user-2'] as RealtimeRecord)['name']).toBe(
      'Updated User 2',
    );
    expect(result.modifiedRecords).toHaveLength(2);
  });

  test('should track modified records without duplicates', () => {
    const recordMap: RecordMap = {
      users: {
        'user-1': createTestRecord({ id: 'user-1', version: 1 }),
      },
    };

    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Name 1' },
      { type: 'set', table: 'users', id: 'user-1', key: 'email', value: 'email@test.com' },
    ];

    const result = applyOperations(recordMap, operations);

    expect(result.modifiedRecords).toHaveLength(1);
    expect(result.modifiedRecords[0]).toEqual({ table: 'users', id: 'user-1' });
  });

  test('should throw for missing record', () => {
    const recordMap: RecordMap = {
      users: {},
    };

    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'nonexistent', key: 'name', value: 'Test' },
    ];

    expect(() => applyOperations(recordMap, operations)).toThrow(
      'Record not found: users:nonexistent',
    );
  });

  test('should increment version for each operation on same record', () => {
    const recordMap: RecordMap = {
      users: {
        'user-1': createTestRecord({ id: 'user-1', version: 1 }),
      },
    };

    const operations: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'user-1', key: 'name', value: 'Name 1' },
      { type: 'set', table: 'users', id: 'user-1', key: 'bio', value: 'Bio' },
    ];

    const result = applyOperations(recordMap, operations);

    expect((result.recordMap['users']?.['user-1'] as RealtimeRecord).version).toBe(3);
  });
});

describe('checkVersionConflicts', () => {
  test('should return empty array when versions match', () => {
    const original: RecordMap = {
      users: { 'user-1': { id: 'user-1', version: 5 } },
    };
    const current: RecordMap = {
      users: { 'user-1': { id: 'user-1', version: 5 } },
    };
    const modified = [{ table: 'users', id: 'user-1' }];

    const conflicts = checkVersionConflicts(original, current, modified);

    expect(conflicts).toHaveLength(0);
  });

  test('should detect version conflict', () => {
    const original: RecordMap = {
      users: { 'user-1': { id: 'user-1', version: 5 } },
    };
    const current: RecordMap = {
      users: { 'user-1': { id: 'user-1', version: 6 } },
    };
    const modified = [{ table: 'users', id: 'user-1' }];

    const conflicts = checkVersionConflicts(original, current, modified);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toEqual({
      table: 'users',
      id: 'user-1',
      expectedVersion: 5,
      actualVersion: 6,
    });
  });

  test('should check only modified records', () => {
    const original: RecordMap = {
      users: {
        'user-1': { id: 'user-1', version: 1 },
        'user-2': { id: 'user-2', version: 1 },
      },
    };
    const current: RecordMap = {
      users: {
        'user-1': { id: 'user-1', version: 1 },
        'user-2': { id: 'user-2', version: 99 },
      },
    };
    const modified = [{ table: 'users', id: 'user-1' }];

    const conflicts = checkVersionConflicts(original, current, modified);

    expect(conflicts).toHaveLength(0);
  });
});

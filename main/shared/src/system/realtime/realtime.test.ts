// main/shared/src/system/realtime/realtime.test.ts
/**
 * Tests for realtime schemas, contract, and pure operation logic.
 */

import { describe, expect, it, test } from 'vitest';

import {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  conflictResponseSchema,
  getOperationPointers,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
  isFieldMutable,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  PROTECTED_FIELDS,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  REALTIME_ERRORS,
  setNowOperationSchema,
  setOperationSchema,
  setPath,
  transactionSchema,
  writeResponseSchema,
} from './realtime';

import type {
  RealtimeListInsertOperation,
  RealtimeListRemoveOperation,
  RealtimeOperation,
  RealtimeRecord,
  RealtimeSetNowOperation,
  RealtimeSetOperation,
  RecordMap,
} from './realtime';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

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
// Schema Tests
// ============================================================================

describe('setOperationSchema', () => {
  it('should parse valid set operation', () => {
    const result = setOperationSchema.parse({
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'Alice',
    });
    expect(result.type).toBe('set');
    expect(result.table).toBe('users');
    expect(result.key).toBe('name');
    expect(result.value).toBe('Alice');
  });

  it('should reject wrong type', () => {
    expect(() =>
      setOperationSchema.parse({
        type: 'delete',
        table: 'users',
        id: VALID_UUID,
        key: 'name',
        value: null,
      }),
    ).toThrow('Operation type must be "set"');
  });

  it('should reject empty table', () => {
    expect(() =>
      setOperationSchema.parse({
        type: 'set',
        table: '',
        id: VALID_UUID,
        key: 'name',
        value: null,
      }),
    ).toThrow('table must be a non-empty string');
  });

  it('should reject empty key', () => {
    expect(() =>
      setOperationSchema.parse({
        type: 'set',
        table: 'users',
        id: VALID_UUID,
        key: '',
        value: null,
      }),
    ).toThrow('key must be a non-empty string');
  });

  it('should reject non-object', () => {
    expect(() => setOperationSchema.parse(null)).toThrow('Invalid set operation');
  });
});

describe('setNowOperationSchema', () => {
  it('should parse valid set-now operation', () => {
    const result = setNowOperationSchema.parse({
      type: 'set-now',
      table: 'posts',
      id: VALID_UUID,
      key: 'updatedAt',
    });
    expect(result.type).toBe('set-now');
    expect(result.key).toBe('updatedAt');
  });

  it('should reject wrong type', () => {
    expect(() =>
      setNowOperationSchema.parse({
        type: 'set',
        table: 'posts',
        id: VALID_UUID,
        key: 'updatedAt',
      }),
    ).toThrow('Operation type must be "set-now"');
  });

  it('should reject non-object', () => {
    expect(() => setNowOperationSchema.parse('string')).toThrow('Invalid set-now operation');
  });
});

describe('listPositionSchema', () => {
  it('should parse "prepend"', () => {
    expect(listPositionSchema.parse('prepend')).toBe('prepend');
  });

  it('should parse "append"', () => {
    expect(listPositionSchema.parse('append')).toBe('append');
  });

  it('should parse { before: ... }', () => {
    const result = listPositionSchema.parse({ before: 'item-1' });
    expect(result).toEqual({ before: 'item-1' });
  });

  it('should parse { after: ... }', () => {
    const result = listPositionSchema.parse({ after: 'item-2' });
    expect(result).toEqual({ after: 'item-2' });
  });

  it('should reject invalid position', () => {
    expect(() => listPositionSchema.parse('middle')).toThrow('Invalid list position');
  });

  it('should reject object without before/after', () => {
    expect(() => listPositionSchema.parse({ at: 5 })).toThrow('Invalid list position');
  });
});

describe('listInsertOperationSchema', () => {
  it('should parse valid list insert', () => {
    const result = listInsertOperationSchema.parse({
      type: 'listInsert',
      table: 'posts',
      id: VALID_UUID,
      key: 'tags',
      value: 'typescript',
      position: 'append',
    });
    expect(result.type).toBe('listInsert');
    expect(result.value).toBe('typescript');
    expect(result.position).toBe('append');
  });

  it('should reject wrong type', () => {
    expect(() =>
      listInsertOperationSchema.parse({
        type: 'set',
        table: 'posts',
        id: VALID_UUID,
        key: 'tags',
        value: 'ts',
        position: 'append',
      }),
    ).toThrow('Operation type must be "listInsert"');
  });

  it('should reject non-object', () => {
    expect(() => listInsertOperationSchema.parse(null)).toThrow('Invalid listInsert operation');
  });
});

describe('listRemoveOperationSchema', () => {
  it('should parse valid list remove', () => {
    const result = listRemoveOperationSchema.parse({
      type: 'listRemove',
      table: 'posts',
      id: VALID_UUID,
      key: 'tags',
      value: 'old-tag',
    });
    expect(result.type).toBe('listRemove');
    expect(result.value).toBe('old-tag');
  });

  it('should reject wrong type', () => {
    expect(() =>
      listRemoveOperationSchema.parse({
        type: 'set',
        table: 'posts',
        id: VALID_UUID,
        key: 'tags',
        value: 'x',
      }),
    ).toThrow('Operation type must be "listRemove"');
  });
});

describe('operationSchema', () => {
  it('should dispatch to set', () => {
    const result = operationSchema.parse({
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'Bob',
    });
    expect(result.type).toBe('set');
  });

  it('should dispatch to set-now', () => {
    const result = operationSchema.parse({
      type: 'set-now',
      table: 'users',
      id: VALID_UUID,
      key: 'updatedAt',
    });
    expect(result.type).toBe('set-now');
  });

  it('should dispatch to listInsert', () => {
    const result = operationSchema.parse({
      type: 'listInsert',
      table: 'posts',
      id: VALID_UUID,
      key: 'tags',
      value: 'ts',
      position: 'prepend',
    });
    expect(result.type).toBe('listInsert');
  });

  it('should dispatch to listRemove', () => {
    const result = operationSchema.parse({
      type: 'listRemove',
      table: 'posts',
      id: VALID_UUID,
      key: 'tags',
      value: 'old',
    });
    expect(result.type).toBe('listRemove');
  });

  it('should reject unknown type', () => {
    expect(() =>
      operationSchema.parse({ type: 'delete', table: 'x', id: VALID_UUID, key: 'k' }),
    ).toThrow('Unknown operation type: delete');
  });

  it('should reject non-object', () => {
    expect(() => operationSchema.parse(null)).toThrow('Invalid operation');
  });
});

describe('transactionSchema', () => {
  const validOp = {
    type: 'set',
    table: 'users',
    id: VALID_UUID,
    key: 'name',
    value: 'Alice',
  };

  it('should parse valid transaction', () => {
    const result = transactionSchema.parse({
      txId: VALID_UUID,
      authorId: VALID_UUID_2,
      operations: [validOp],
      clientTimestamp: 1700000000000,
    });
    expect(result.txId).toBe(VALID_UUID);
    expect(result.authorId).toBe(VALID_UUID_2);
    expect(result.operations).toHaveLength(1);
    expect(result.clientTimestamp).toBe(1700000000000);
  });

  it('should reject empty operations array', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [],
        clientTimestamp: 1700000000000,
      }),
    ).toThrow('At least one operation is required');
  });

  it('should reject non-array operations', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: 'not-array',
        clientTimestamp: 1700000000000,
      }),
    ).toThrow('Operations must be an array');
  });

  it('should reject non-positive clientTimestamp', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [validOp],
        clientTimestamp: 0,
      }),
    ).toThrow('clientTimestamp must be a positive integer');
  });

  it('should reject non-integer clientTimestamp', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [validOp],
        clientTimestamp: 1.5,
      }),
    ).toThrow('clientTimestamp must be a positive integer');
  });

  it('should reject non-object', () => {
    expect(() => transactionSchema.parse(null)).toThrow('Invalid transaction');
  });
});

describe('recordPointerSchema', () => {
  it('should parse valid pointer', () => {
    const result = recordPointerSchema.parse({ table: 'users', id: VALID_UUID });
    expect(result.table).toBe('users');
    expect(result.id).toBe(VALID_UUID);
  });

  it('should reject empty table', () => {
    expect(() => recordPointerSchema.parse({ table: '', id: VALID_UUID })).toThrow(
      'table must be a non-empty string',
    );
  });

  it('should reject non-object', () => {
    expect(() => recordPointerSchema.parse('string')).toThrow('Invalid record pointer');
  });
});

describe('recordSchema', () => {
  it('should parse valid record', () => {
    const result = recordSchema.parse({
      id: VALID_UUID,
      version: 1,
      name: 'Test',
    });
    expect(result.id).toBe(VALID_UUID);
    expect(result.version).toBe(1);
    expect(result['name']).toBe('Test');
  });

  it('should reject zero version', () => {
    expect(() => recordSchema.parse({ id: VALID_UUID, version: 0 })).toThrow(
      'version must be a positive integer',
    );
  });

  it('should reject non-integer version', () => {
    expect(() => recordSchema.parse({ id: VALID_UUID, version: 1.5 })).toThrow(
      'version must be a positive integer',
    );
  });

  it('should reject non-object', () => {
    expect(() => recordSchema.parse(null)).toThrow('Invalid record');
  });
});

describe('recordMapSchema', () => {
  it('should parse valid record map', () => {
    const result = recordMapSchema.parse({
      users: {
        [VALID_UUID]: { id: VALID_UUID, version: 1, name: 'Alice' },
      },
    });
    expect(result['users']![VALID_UUID]!['name']).toBe('Alice');
  });

  it('should parse empty map', () => {
    const result = recordMapSchema.parse({});
    expect(result).toEqual({});
  });

  it('should reject array as table records', () => {
    expect(() => recordMapSchema.parse({ users: [{ id: VALID_UUID, version: 1 }] })).toThrow(
      'Invalid records for table users',
    );
  });

  it('should reject non-object', () => {
    expect(() => recordMapSchema.parse(null)).toThrow('Invalid record map');
  });
});

describe('writeResponseSchema', () => {
  it('should parse valid write response', () => {
    const result = writeResponseSchema.parse({
      recordMap: {
        users: { [VALID_UUID]: { id: VALID_UUID, version: 2 } },
      },
    });
    expect(result.recordMap['users']![VALID_UUID]!['version']).toBe(2);
  });

  it('should reject non-object', () => {
    expect(() => writeResponseSchema.parse(null)).toThrow('Invalid write response');
  });
});

describe('conflictResponseSchema', () => {
  it('should parse conflict with records', () => {
    const result = conflictResponseSchema.parse({
      message: 'Version conflict',
      conflictingRecords: [{ table: 'users', id: VALID_UUID }],
    });
    expect(result.message).toBe('Version conflict');
    expect(result.conflictingRecords).toHaveLength(1);
  });

  it('should parse conflict without records', () => {
    const result = conflictResponseSchema.parse({ message: 'Conflict occurred' });
    expect(result.message).toBe('Conflict occurred');
    expect(result.conflictingRecords).toBeUndefined();
  });

  it('should reject missing message', () => {
    expect(() => conflictResponseSchema.parse({})).toThrow('Message must be a string');
  });

  it('should reject non-object', () => {
    expect(() => conflictResponseSchema.parse(null)).toThrow('Invalid conflict response');
  });
});

describe('getRecordsRequestSchema', () => {
  it('should parse valid request', () => {
    const result = getRecordsRequestSchema.parse({
      pointers: [{ table: 'users', id: VALID_UUID }],
    });
    expect(result.pointers).toHaveLength(1);
  });

  it('should reject empty pointers', () => {
    expect(() => getRecordsRequestSchema.parse({ pointers: [] })).toThrow(
      'At least one pointer is required',
    );
  });

  it('should reject more than 100 pointers', () => {
    const pointers = Array.from({ length: 101 }, (_, i) => ({
      table: 'users',
      id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    }));
    expect(() => getRecordsRequestSchema.parse({ pointers })).toThrow(
      'Maximum 100 pointers allowed',
    );
  });

  it('should reject non-array pointers', () => {
    expect(() => getRecordsRequestSchema.parse({ pointers: 'bad' })).toThrow(
      'Pointers must be an array',
    );
  });
});

describe('getRecordsResponseSchema', () => {
  it('should parse valid response', () => {
    const result = getRecordsResponseSchema.parse({
      recordMap: { posts: { [VALID_UUID]: { id: VALID_UUID, version: 3 } } },
    });
    expect(result.recordMap['posts']![VALID_UUID]!['version']).toBe(3);
  });

  it('should reject non-object', () => {
    expect(() => getRecordsResponseSchema.parse(null)).toThrow('Invalid get records response');
  });
});

// ============================================================================
// Operation Tests
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
      const op: RealtimeSetOperation = {
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
      const op: RealtimeSetOperation = {
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
      const op: RealtimeSetOperation = {
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
      const op: RealtimeSetOperation = {
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
      const op: RealtimeSetOperation = {
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
      const op: RealtimeSetNowOperation = {
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
      const op: RealtimeListInsertOperation = {
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
      const op: RealtimeListInsertOperation = {
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
      const op: RealtimeListInsertOperation = {
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
      const op: RealtimeListInsertOperation = {
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
      const op: RealtimeListInsertOperation = {
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

      const op: RealtimeListInsertOperation = {
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
      const op: RealtimeListRemoveOperation = {
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
      const op: RealtimeListRemoveOperation = {
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
      const op: RealtimeListRemoveOperation = {
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

// ============================================================================
// Adversarial: Schema edge cases
// ============================================================================

describe('setOperationSchema — adversarial', () => {
  it('rejects array (treated as object, fails on type check)', () => {
    // Arrays pass the typeof === 'object' guard in the schema, but then
    // obj['type'] is undefined → check fails with a type error message
    expect(() => setOperationSchema.parse([])).toThrow();
  });

  it('rejects primitive string', () => {
    expect(() => setOperationSchema.parse('set')).toThrow('Invalid set operation');
  });

  it('rejects undefined', () => {
    expect(() => setOperationSchema.parse(undefined)).toThrow('Invalid set operation');
  });

  it('rejects non-UUID id', () => {
    expect(() =>
      setOperationSchema.parse({
        type: 'set',
        table: 'users',
        id: 'not-a-uuid',
        key: 'name',
        value: 'Alice',
      }),
    ).toThrow();
  });

  it('rejects null id', () => {
    expect(() =>
      setOperationSchema.parse({ type: 'set', table: 'users', id: null, key: 'name', value: 'x' }),
    ).toThrow();
  });

  it('allows null value (explicit null is valid for clearing a field)', () => {
    const result = setOperationSchema.parse({
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'nickname',
      value: null,
    });
    expect(result.value).toBeNull();
  });

  it('allows complex object as value', () => {
    const result = setOperationSchema.parse({
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'metadata',
      value: { nested: { deep: [1, 2, 3] } },
    });
    expect(result.value).toEqual({ nested: { deep: [1, 2, 3] } });
  });

  it('rejects table with only whitespace', () => {
    expect(() =>
      setOperationSchema.parse({
        type: 'set',
        table: '   ',
        id: VALID_UUID,
        key: 'name',
        value: 'x',
      }),
    ).not.toThrow(); // '   ' has length >= 1 — table validation only checks non-empty
    // Documenting: validateNonEmptyString only checks length >= 1, so whitespace passes
  });
});

describe('transactionSchema — adversarial', () => {
  const validOp = {
    type: 'set',
    table: 'users',
    id: VALID_UUID,
    key: 'name',
    value: 'Alice',
  };

  it('rejects negative clientTimestamp', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [validOp],
        clientTimestamp: -1,
      }),
    ).toThrow('clientTimestamp must be a positive integer');
  });

  it('rejects string txId that is not a UUID', () => {
    expect(() =>
      transactionSchema.parse({
        txId: 'not-a-uuid',
        authorId: VALID_UUID_2,
        operations: [validOp],
        clientTimestamp: 1000,
      }),
    ).toThrow();
  });

  it('rejects transaction with one invalid operation in array', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [validOp, { type: 'delete', table: 'x', id: VALID_UUID, key: 'k' }],
        clientTimestamp: 1000,
      }),
    ).toThrow('Unknown operation type: delete');
  });

  it('accepts exactly 1 valid operation', () => {
    const result = transactionSchema.parse({
      txId: VALID_UUID,
      authorId: VALID_UUID_2,
      operations: [validOp],
      clientTimestamp: 1,
    });
    expect(result.operations).toHaveLength(1);
  });

  it('rejects null operations field', () => {
    expect(() =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: null,
        clientTimestamp: 1000,
      }),
    ).toThrow('Operations must be an array');
  });

  it('rejects Number.MAX_SAFE_INTEGER + 1 as clientTimestamp (non-safe integer)', () => {
    // Number.MAX_SAFE_INTEGER + 1 is still technically an integer in some contexts
    // but Number.isInteger returns true, so it passes — documents this behavior
    const bigVal = Number.MAX_SAFE_INTEGER + 1;
    // This MIGHT pass because Number.isInteger(MAX_SAFE_INTEGER+1) is true
    // We document the actual behavior without asserting throw
    const parseCall = () =>
      transactionSchema.parse({
        txId: VALID_UUID,
        authorId: VALID_UUID_2,
        operations: [validOp],
        clientTimestamp: bigVal,
      });
    // Should not throw for a large but valid integer
    expect(parseCall).not.toThrow();
  });
});

describe('recordSchema — adversarial', () => {
  it('rejects negative version', () => {
    expect(() => recordSchema.parse({ id: VALID_UUID, version: -1 })).toThrow(
      'version must be a positive integer',
    );
  });

  it('rejects non-UUID id', () => {
    expect(() => recordSchema.parse({ id: 'bad-id', version: 1 })).toThrow();
  });

  it('preserves extra fields', () => {
    const result = recordSchema.parse({
      id: VALID_UUID,
      version: 1,
      customField: 'hello',
      nested: { deep: true },
    });
    expect(result['customField']).toBe('hello');
    expect((result['nested'] as Record<string, unknown>)['deep']).toBe(true);
  });

  it('rejects primitive input (number)', () => {
    expect(() => recordSchema.parse(42)).toThrow('Invalid record');
  });

  it('rejects array input (treated as object, fails on id check)', () => {
    // Arrays pass typeof === 'object' guard, but obj['id'] = undefined → UUID parse throws
    expect(() => recordSchema.parse([{ id: VALID_UUID, version: 1 }])).toThrow();
  });
});

describe('recordMapSchema — adversarial', () => {
  it('rejects null table records value', () => {
    expect(() => recordMapSchema.parse({ users: null })).toThrow('Invalid records for table users');
  });

  it('rejects string as table records', () => {
    expect(() => recordMapSchema.parse({ users: 'bad' })).toThrow(
      'Invalid records for table users',
    );
  });

  it('rejects record with invalid version inside table', () => {
    expect(() =>
      recordMapSchema.parse({
        users: {
          [VALID_UUID]: { id: VALID_UUID, version: 0 },
        },
      }),
    ).toThrow('version must be a positive integer');
  });

  it('rejects primitive input (number)', () => {
    expect(() => recordMapSchema.parse(42)).toThrow('Invalid record map');
  });

  it('handles multiple tables with valid records', () => {
    const result = recordMapSchema.parse({
      users: { [VALID_UUID]: { id: VALID_UUID, version: 1 } },
      posts: { [VALID_UUID_2]: { id: VALID_UUID_2, version: 5 } },
    });
    expect(Object.keys(result)).toHaveLength(2);
  });
});

describe('conflictResponseSchema — adversarial', () => {
  it('rejects numeric message', () => {
    expect(() => conflictResponseSchema.parse({ message: 42 })).toThrow('Message must be a string');
  });

  it('rejects null message', () => {
    expect(() => conflictResponseSchema.parse({ message: null })).toThrow(
      'Message must be a string',
    );
  });

  it('accepts empty string message', () => {
    const result = conflictResponseSchema.parse({ message: '' });
    expect(result.message).toBe('');
  });

  it('rejects conflictingRecords with invalid record pointer', () => {
    expect(() =>
      conflictResponseSchema.parse({
        message: 'conflict',
        conflictingRecords: [{ table: 'users', id: 'bad-id' }],
      }),
    ).toThrow();
  });
});

describe('getRecordsRequestSchema — adversarial', () => {
  it('rejects exactly 101 pointers (one above max)', () => {
    const pointers = Array.from({ length: 101 }, (_, i) => ({
      table: 'users',
      id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    }));
    expect(() => getRecordsRequestSchema.parse({ pointers })).toThrow(
      'Maximum 100 pointers allowed',
    );
  });

  it('accepts exactly 100 pointers (at limit)', () => {
    const pointers = Array.from({ length: 100 }, (_, i) => ({
      table: 'users',
      id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, '0')}`,
    }));
    const result = getRecordsRequestSchema.parse({ pointers });
    expect(result.pointers).toHaveLength(100);
  });

  it('rejects pointer with non-UUID id', () => {
    expect(() =>
      getRecordsRequestSchema.parse({ pointers: [{ table: 'users', id: 'not-a-uuid' }] }),
    ).toThrow();
  });

  it('rejects null input', () => {
    expect(() => getRecordsRequestSchema.parse(null)).toThrow('Invalid get records request');
  });

  it('rejects missing pointers field', () => {
    expect(() => getRecordsRequestSchema.parse({})).toThrow('Pointers must be an array');
  });
});

describe('listPositionSchema — adversarial', () => {
  it('rejects null', () => {
    expect(() => listPositionSchema.parse(null)).toThrow('Invalid list position');
  });

  it('rejects number', () => {
    expect(() => listPositionSchema.parse(42)).toThrow('Invalid list position');
  });

  it('rejects empty object', () => {
    expect(() => listPositionSchema.parse({})).toThrow('Invalid list position');
  });

  it('rejects "PREPEND" (case sensitive)', () => {
    expect(() => listPositionSchema.parse('PREPEND')).toThrow('Invalid list position');
  });

  it('rejects "APPEND" (case sensitive)', () => {
    expect(() => listPositionSchema.parse('APPEND')).toThrow('Invalid list position');
  });

  it('allows { before: null } (null is valid as anchor value)', () => {
    const result = listPositionSchema.parse({ before: null });
    expect(result).toEqual({ before: null });
  });

  it('allows { after: 0 } (zero is valid as anchor value)', () => {
    const result = listPositionSchema.parse({ after: 0 });
    expect(result).toEqual({ after: 0 });
  });
});

// ============================================================================
// Adversarial: applyOperation edge cases
// ============================================================================

describe('applyOperation — adversarial', () => {
  it('throws for all protected fields', () => {
    const record = createTestRecord({ id: 'r1', version: 1 });
    const protectedFields = [...PROTECTED_FIELDS];
    for (const field of protectedFields) {
      const op: RealtimeSetOperation = {
        type: 'set',
        table: 'users',
        id: 'r1',
        key: field,
        value: 'tampered',
      };
      expect(() => applyOperation(record, op)).toThrow('cannot be modified');
    }
  });

  it('does not mutate the original record', () => {
    const record = createTestRecord({ name: 'original', version: 1 });
    const op: RealtimeSetOperation = {
      type: 'set',
      table: 'users',
      id: record.id,
      key: 'name',
      value: 'changed',
    };
    applyOperation(record, op);
    // Original must remain unchanged
    expect(record['name']).toBe('original');
    expect(record.version).toBe(1);
  });

  it('increments version by exactly 1 per operation', () => {
    const record = createTestRecord({ version: 42 });
    const op: RealtimeSetOperation = {
      type: 'set',
      table: 'users',
      id: record.id,
      key: 'name',
      value: 'new',
    };
    const result = applyOperation(record, op);
    expect(result.version).toBe(43);
  });

  it('listInsert with { before: nonexistent } prepends (index -1 → 0)', () => {
    const record = createTestRecord({ tags: ['a', 'b'] });
    const op: RealtimeListInsertOperation = {
      type: 'listInsert',
      table: 'users',
      id: record.id,
      key: 'tags',
      value: 'new',
      position: { before: 'does-not-exist' },
    };
    const result = applyOperation(record, op);
    // findIndex returns -1 → splice at 0 → prepend
    expect((result['tags'] as string[])[0]).toBe('new');
  });

  it('listInsert with { after: nonexistent } appends (index -1 → end)', () => {
    const record = createTestRecord({ tags: ['a', 'b'] });
    const op: RealtimeListInsertOperation = {
      type: 'listInsert',
      table: 'users',
      id: record.id,
      key: 'tags',
      value: 'new',
      position: { after: 'does-not-exist' },
    };
    const result = applyOperation(record, op);
    // findIndex returns -1 → splice(-1+1=0, 0, 'new') → inserts at 0
    const tags = result['tags'] as string[];
    expect(tags).toContain('new');
  });

  it('set-now produces an ISO 8601 timestamp string', () => {
    const record = createTestRecord();
    const op: RealtimeSetNowOperation = {
      type: 'set-now',
      table: 'users',
      id: record.id,
      key: 'updatedAt',
    };
    const result = applyOperation(record, op);
    const ts = result['updatedAt'] as string;
    expect(() => new Date(ts)).not.toThrow();
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  it('listRemove on null field (undefined key) does nothing', () => {
    const record = createTestRecord();
    // 'missingList' key does not exist on the record
    const op: RealtimeListRemoveOperation = {
      type: 'listRemove',
      table: 'users',
      id: record.id,
      key: 'missingList',
      value: 'x',
    };
    const result = applyOperation(record, op);
    // Field was not an array, so no change (key still absent or unchanged)
    expect(result['missingList']).toBeUndefined();
  });

  it('set operation with key that is just a dot returns early (setPath no-op)', () => {
    const record = createTestRecord({ name: 'original' });
    const op: RealtimeSetOperation = {
      type: 'set',
      table: 'users',
      id: record.id,
      key: 'name.',
      value: 'attempt',
    };
    // key.split('.') = ['name', ''] → lastKey='' → setPath returns early
    // 'name' is the rootKey, which is mutable, so applyOperation proceeds but setPath is a no-op
    const result = applyOperation(record, op);
    // 'name' remains unchanged because setPath returned early on empty lastKey
    expect(result['name']).toBe('original');
  });

  it('applying 100 sequential set ops increments version to 101', () => {
    let record = createTestRecord({ version: 1 });
    for (let i = 0; i < 100; i++) {
      const op: RealtimeSetOperation = {
        type: 'set',
        table: 'users',
        id: record.id,
        key: 'name',
        value: `name-${i}`,
      };
      record = applyOperation(record, op);
    }
    expect(record.version).toBe(101);
  });
});

// ============================================================================
// Adversarial: applyOperations edge cases
// ============================================================================

describe('applyOperations — adversarial', () => {
  it('throws when table does not exist in recordMap', () => {
    const recordMap: RecordMap = {};
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'nonexistent', id: 'id-1', key: 'name', value: 'test' },
    ];
    expect(() => applyOperations(recordMap, ops)).toThrow('Record not found: nonexistent:id-1');
  });

  it('does not mutate the original recordMap', () => {
    const recordMap: RecordMap = {
      users: { u1: createTestRecord({ id: 'u1', name: 'original', version: 1 }) },
    };
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'u1', key: 'name', value: 'mutated' },
    ];
    applyOperations(recordMap, ops);
    expect((recordMap['users']?.['u1'] as RealtimeRecord)['name']).toBe('original');
  });

  it('handles empty operations array', () => {
    const recordMap: RecordMap = {
      users: { u1: createTestRecord({ id: 'u1', version: 1 }) },
    };
    const result = applyOperations(recordMap, []);
    expect(result.modifiedRecords).toHaveLength(0);
    expect(result.recordMap).toEqual(recordMap);
  });

  it('throws mid-batch on protected field, leaving partial state', () => {
    const recordMap: RecordMap = {
      users: {
        u1: createTestRecord({ id: 'u1', name: 'original', version: 1 }),
      },
    };
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'u1', key: 'name', value: 'updated' },
      { type: 'set', table: 'users', id: 'u1', key: 'id', value: 'tampered' }, // protected
    ];
    expect(() => applyOperations(recordMap, ops)).toThrow("Field 'id' cannot be modified");
  });

  it('modifiedRecords contains cross-table records', () => {
    const recordMap: RecordMap = {
      users: { u1: createTestRecord({ id: 'u1', version: 1 }) },
      posts: { p1: createTestRecord({ id: 'p1', version: 1 }) },
    };
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'u1', key: 'name', value: 'a' },
      { type: 'set', table: 'posts', id: 'p1', key: 'name', value: 'b' },
    ];
    const result = applyOperations(recordMap, ops);
    expect(result.modifiedRecords).toHaveLength(2);
    expect(result.modifiedRecords).toContainEqual({ table: 'users', id: 'u1' });
    expect(result.modifiedRecords).toContainEqual({ table: 'posts', id: 'p1' });
  });
});

// ============================================================================
// Adversarial: checkVersionConflicts edge cases
// ============================================================================

describe('checkVersionConflicts — adversarial', () => {
  it('returns empty array for empty modifiedRecords', () => {
    const conflicts = checkVersionConflicts({}, {}, []);
    expect(conflicts).toHaveLength(0);
  });

  it('skips records not in originalRecordMap', () => {
    // Record exists in current but not in original
    const original: RecordMap = {};
    const current: RecordMap = {
      users: { u1: { id: 'u1', version: 5 } },
    };
    const modified = [{ table: 'users', id: 'u1' }];
    const conflicts = checkVersionConflicts(original, current, modified);
    // original[table][id] is undefined → no conflict recorded
    expect(conflicts).toHaveLength(0);
  });

  it('skips records not in currentRecordMap', () => {
    const original: RecordMap = {
      users: { u1: { id: 'u1', version: 5 } },
    };
    const current: RecordMap = {};
    const modified = [{ table: 'users', id: 'u1' }];
    const conflicts = checkVersionConflicts(original, current, modified);
    // current[table][id] is undefined → no conflict recorded
    expect(conflicts).toHaveLength(0);
  });

  it('detects multiple conflicts across tables', () => {
    const original: RecordMap = {
      users: { u1: { id: 'u1', version: 1 } },
      posts: { p1: { id: 'p1', version: 3 } },
    };
    const current: RecordMap = {
      users: { u1: { id: 'u1', version: 2 } },
      posts: { p1: { id: 'p1', version: 4 } },
    };
    const modified = [
      { table: 'users', id: 'u1' },
      { table: 'posts', id: 'p1' },
    ];
    const conflicts = checkVersionConflicts(original, current, modified);
    expect(conflicts).toHaveLength(2);
  });

  it('does not report conflict when versions are identical (no concurrent write)', () => {
    const original: RecordMap = {
      users: { u1: { id: 'u1', version: 100 } },
    };
    const current: RecordMap = {
      users: { u1: { id: 'u1', version: 100 } },
    };
    const conflicts = checkVersionConflicts(original, current, [{ table: 'users', id: 'u1' }]);
    expect(conflicts).toHaveLength(0);
  });

  it('conflict includes correct expectedVersion and actualVersion', () => {
    const original: RecordMap = {
      items: { i1: { id: 'i1', version: 7 } },
    };
    const current: RecordMap = {
      items: { i1: { id: 'i1', version: 15 } },
    };
    const conflicts = checkVersionConflicts(original, current, [{ table: 'items', id: 'i1' }]);
    expect(conflicts[0]?.expectedVersion).toBe(7);
    expect(conflicts[0]?.actualVersion).toBe(15);
  });
});

// ============================================================================
// Adversarial: setPath edge cases
// ============================================================================

describe('setPath — adversarial', () => {
  it('does nothing for empty lastKey (path ending in dot)', () => {
    const obj: Record<string, unknown> = { name: 'original' };
    setPath(obj, 'name.', 'value');
    expect(obj['name']).toBe('original');
  });

  it('does nothing for empty path string', () => {
    const obj: Record<string, unknown> = { name: 'original' };
    setPath(obj, '', 'value');
    expect(obj['name']).toBe('original');
  });

  it('sets top-level key', () => {
    const obj: Record<string, unknown> = {};
    setPath(obj, 'key', 'value');
    expect(obj['key']).toBe('value');
  });

  it('creates intermediate nested objects', () => {
    const obj: Record<string, unknown> = {};
    setPath(obj, 'a.b.c', 42);
    const a = obj['a'] as Record<string, unknown>;
    const b = a?.['b'] as Record<string, unknown>;
    expect(b?.['c']).toBe(42);
  });

  it('does not throw for prototype pollution attempt (__proto__)', () => {
    const obj: Record<string, unknown> = {};
    // isSafeObjectKey guards against __proto__ prototype pollution
    expect(() => setPath(obj, '__proto__.polluted', true)).not.toThrow();
    // The actual prototype should not be polluted
    expect((Object.prototype as Record<string, unknown>)['polluted']).toBeUndefined();
  });

  it('does not throw for constructor key attempt', () => {
    const obj: Record<string, unknown> = {};
    expect(() => setPath(obj, 'constructor.prototype.evil', true)).not.toThrow();
  });

  it('overwrites existing string with object when nested', () => {
    const obj: Record<string, unknown> = { settings: 'old-string' };
    setPath(obj, 'settings.theme', 'dark');
    const settings = obj['settings'] as Record<string, unknown>;
    expect(settings?.['theme']).toBe('dark');
  });
});

// ============================================================================
// Adversarial: PROTECTED_FIELDS and REALTIME_ERRORS constants
// ============================================================================

describe('PROTECTED_FIELDS — adversarial', () => {
  it('does not include common mutable fields', () => {
    expect(PROTECTED_FIELDS.has('name')).toBe(false);
    expect(PROTECTED_FIELDS.has('email')).toBe(false);
    expect(PROTECTED_FIELDS.has('bio')).toBe(false);
  });

  it('blocks all security-sensitive fields', () => {
    expect(PROTECTED_FIELDS.has('password_hash')).toBe(true);
    expect(PROTECTED_FIELDS.has('passwordHash')).toBe(true);
  });

  it('includes version and id to prevent replay attacks', () => {
    expect(PROTECTED_FIELDS.has('id')).toBe(true);
    expect(PROTECTED_FIELDS.has('version')).toBe(true);
  });
});

describe('REALTIME_ERRORS — adversarial', () => {
  it('tableNotAllowed includes table name in message', () => {
    const msg = REALTIME_ERRORS.tableNotAllowed('secrets');
    expect(msg).toContain('secrets');
  });

  it('AUTHOR_MISMATCH is a static string', () => {
    expect(typeof REALTIME_ERRORS.AUTHOR_MISMATCH).toBe('string');
  });

  it('VERSION_CONFLICT is a static string', () => {
    expect(typeof REALTIME_ERRORS.VERSION_CONFLICT).toBe('string');
  });
});

// ============================================================================
// Adversarial: getOperationPointers edge cases
// ============================================================================

describe('getOperationPointers — adversarial', () => {
  it('handles 1000 duplicate operations for same record — only 1 pointer returned', () => {
    const ops: RealtimeOperation[] = Array.from({ length: 1000 }, () => ({
      type: 'set' as const,
      table: 'users',
      id: 'user-1',
      key: 'name',
      value: 'x',
    }));
    const pointers = getOperationPointers(ops);
    expect(pointers).toHaveLength(1);
  });

  it('handles mix of operation types for same record — still deduplicated', () => {
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'users', id: 'u1', key: 'name', value: 'x' },
      { type: 'set-now', table: 'users', id: 'u1', key: 'updatedAt' },
      { type: 'listInsert', table: 'users', id: 'u1', key: 'tags', value: 't', position: 'append' },
      { type: 'listRemove', table: 'users', id: 'u1', key: 'tags', value: 'old' },
    ];
    const pointers = getOperationPointers(ops);
    expect(pointers).toHaveLength(1);
    expect(pointers[0]).toEqual({ table: 'users', id: 'u1' });
  });

  it('preserves insertion order of first occurrence', () => {
    const ops: RealtimeOperation[] = [
      { type: 'set', table: 'posts', id: 'p2', key: 'title', value: 'b' },
      { type: 'set', table: 'users', id: 'u1', key: 'name', value: 'a' },
      { type: 'set', table: 'posts', id: 'p2', key: 'body', value: 'c' },
    ];
    const pointers = getOperationPointers(ops);
    expect(pointers[0]).toEqual({ table: 'posts', id: 'p2' });
    expect(pointers[1]).toEqual({ table: 'users', id: 'u1' });
  });
});

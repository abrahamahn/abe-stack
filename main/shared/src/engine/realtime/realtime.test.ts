// main/shared/src/engine/realtime/realtime.test.ts
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
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  transactionSchema,
  writeResponseSchema,
} from './realtime';

import type {
  ListInsertOperation,
  ListRemoveOperation,
  RealtimeOperation,
  RealtimeRecord,
  RecordMap,
  SetNowOperation,
  SetOperation,
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
    expect(result['users'][VALID_UUID].name).toBe('Alice');
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
    expect(result.recordMap['users'][VALID_UUID].version).toBe(2);
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
    expect(result.recordMap['posts'][VALID_UUID].version).toBe(3);
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

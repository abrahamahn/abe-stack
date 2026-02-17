// main/shared/src/engine/realtime/realtime.schemas.test.ts
import { describe, expect, it } from 'vitest';

import {
  conflictResponseSchema,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
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
} from './realtime.schemas';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '660e8400-e29b-41d4-a716-446655440001';

// ============================================================================
// setOperationSchema
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

// ============================================================================
// setNowOperationSchema
// ============================================================================

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

// ============================================================================
// listPositionSchema
// ============================================================================

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

// ============================================================================
// listInsertOperationSchema
// ============================================================================

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

// ============================================================================
// listRemoveOperationSchema
// ============================================================================

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

// ============================================================================
// operationSchema (union)
// ============================================================================

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

// ============================================================================
// transactionSchema
// ============================================================================

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

// ============================================================================
// recordPointerSchema
// ============================================================================

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

// ============================================================================
// recordSchema
// ============================================================================

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

// ============================================================================
// recordMapSchema
// ============================================================================

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

// ============================================================================
// writeResponseSchema
// ============================================================================

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

// ============================================================================
// conflictResponseSchema
// ============================================================================

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

// ============================================================================
// getRecordsRequestSchema
// ============================================================================

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

// ============================================================================
// getRecordsResponseSchema
// ============================================================================

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

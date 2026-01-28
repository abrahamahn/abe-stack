// packages/contracts/src/realtime.test.ts
import { describe, expect, it } from 'vitest';

import {
  conflictResponseSchema,
  getRecordsResponseSchema,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  realtimeContract,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  transactionSchema,
  writeResponseSchema,
} from './realtime';

// ============================================================================
// Helper Constants
// ============================================================================

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const ANOTHER_UUID = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// ============================================================================
// Operation Schema Tests
// ============================================================================

describe('setOperationSchema', () => {
  it('should validate correct set operation', () => {
    const validData = {
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'John Doe',
    };
    const result = setOperationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('set');
      expect(result.data.table).toBe('users');
      expect(result.data.key).toBe('name');
      expect(result.data.value).toBe('John Doe');
    }
  });

  it('should accept various value types', () => {
    const stringValue = {
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'text',
    };
    const numberValue = { ...stringValue, value: 42 };
    const boolValue = { ...stringValue, value: true };
    const nullValue = { ...stringValue, value: null };
    const objectValue = { ...stringValue, value: { nested: 'data' } };

    expect(setOperationSchema.safeParse(stringValue).success).toBe(true);
    expect(setOperationSchema.safeParse(numberValue).success).toBe(true);
    expect(setOperationSchema.safeParse(boolValue).success).toBe(true);
    expect(setOperationSchema.safeParse(nullValue).success).toBe(true);
    expect(setOperationSchema.safeParse(objectValue).success).toBe(true);
  });

  it('should reject empty table name', () => {
    const invalidData = {
      type: 'set',
      table: '',
      id: VALID_UUID,
      key: 'name',
      value: 'test',
    };
    expect(setOperationSchema.safeParse(invalidData).success).toBe(false);
  });

  it('should reject invalid UUID', () => {
    const invalidData = {
      type: 'set',
      table: 'users',
      id: 'not-a-uuid',
      key: 'name',
      value: 'test',
    };
    expect(setOperationSchema.safeParse(invalidData).success).toBe(false);
  });

  it('should reject empty key', () => {
    const invalidData = {
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: '',
      value: 'test',
    };
    expect(setOperationSchema.safeParse(invalidData).success).toBe(false);
  });

  it('should reject wrong type literal', () => {
    const invalidData = {
      type: 'update',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'test',
    };
    expect(setOperationSchema.safeParse(invalidData).success).toBe(false);
  });
});

describe('setNowOperationSchema', () => {
  it('should validate correct set-now operation', () => {
    const validData = {
      type: 'set-now',
      table: 'users',
      id: VALID_UUID,
      key: 'updatedAt',
    };
    const result = setNowOperationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('set-now');
      expect(result.data.key).toBe('updatedAt');
    }
  });

  it('should reject missing required fields', () => {
    const missingTable = {
      type: 'set-now',
      id: VALID_UUID,
      key: 'updatedAt',
    };
    const missingId = {
      type: 'set-now',
      table: 'users',
      key: 'updatedAt',
    };
    const missingKey = {
      type: 'set-now',
      table: 'users',
      id: VALID_UUID,
    };

    expect(setNowOperationSchema.safeParse(missingTable).success).toBe(false);
    expect(setNowOperationSchema.safeParse(missingId).success).toBe(false);
    expect(setNowOperationSchema.safeParse(missingKey).success).toBe(false);
  });
});

describe('listPositionSchema', () => {
  it('should validate prepend position', () => {
    expect(listPositionSchema.safeParse('prepend').success).toBe(true);
  });

  it('should validate append position', () => {
    expect(listPositionSchema.safeParse('append').success).toBe(true);
  });

  it('should validate before position', () => {
    const result = listPositionSchema.safeParse({ before: 'item-id' });
    expect(result.success).toBe(true);
  });

  it('should validate after position', () => {
    const result = listPositionSchema.safeParse({ after: 'item-id' });
    expect(result.success).toBe(true);
  });

  it('should reject invalid position strings', () => {
    expect(listPositionSchema.safeParse('start').success).toBe(false);
    expect(listPositionSchema.safeParse('end').success).toBe(false);
  });

  it('accepts object positions with z.unknown values', () => {
    // The schema accepts objects with 'before' or 'after' keys
    // due to the z.unknown() value type - this is by design for flexibility
    const beforeResult = listPositionSchema.safeParse({ before: 123 });
    const afterResult = listPositionSchema.safeParse({ after: { nested: true } });

    expect(beforeResult.success).toBe(true);
    expect(afterResult.success).toBe(true);
  });
});

describe('listInsertOperationSchema', () => {
  it('should validate correct list insert with prepend', () => {
    const validData = {
      type: 'listInsert',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: { text: 'New item' },
      position: 'prepend',
    };
    const result = listInsertOperationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('listInsert');
      expect(result.data.position).toBe('prepend');
    }
  });

  it('should validate list insert with positional reference', () => {
    const validData = {
      type: 'listInsert',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'new-item',
      position: { after: 'existing-item' },
    };
    expect(listInsertOperationSchema.safeParse(validData).success).toBe(true);
  });

  it('should reject missing position', () => {
    const invalidData = {
      type: 'listInsert',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'new-item',
    };
    expect(listInsertOperationSchema.safeParse(invalidData).success).toBe(false);
  });
});

describe('listRemoveOperationSchema', () => {
  it('should validate correct list remove operation', () => {
    const validData = {
      type: 'listRemove',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'item-to-remove',
    };
    const result = listRemoveOperationSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('listRemove');
    }
  });

  it('should reject wrong type literal', () => {
    const invalidData = {
      type: 'remove',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'item-to-remove',
    };
    expect(listRemoveOperationSchema.safeParse(invalidData).success).toBe(false);
  });
});

describe('operationSchema', () => {
  it('should discriminate set operations', () => {
    const setOp = {
      type: 'set',
      table: 'users',
      id: VALID_UUID,
      key: 'name',
      value: 'John',
    };
    const result = operationSchema.safeParse(setOp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('set');
    }
  });

  it('should discriminate set-now operations', () => {
    const setNowOp = {
      type: 'set-now',
      table: 'users',
      id: VALID_UUID,
      key: 'updatedAt',
    };
    const result = operationSchema.safeParse(setNowOp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('set-now');
    }
  });

  it('should discriminate list insert operations', () => {
    const listInsertOp = {
      type: 'listInsert',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'new-item',
      position: 'append',
    };
    const result = operationSchema.safeParse(listInsertOp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('listInsert');
    }
  });

  it('should discriminate list remove operations', () => {
    const listRemoveOp = {
      type: 'listRemove',
      table: 'tasks',
      id: VALID_UUID,
      key: 'items',
      value: 'item-to-remove',
    };
    const result = operationSchema.safeParse(listRemoveOp);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('listRemove');
    }
  });

  it('should reject unknown operation types', () => {
    const unknownOp = {
      type: 'delete',
      table: 'users',
      id: VALID_UUID,
    };
    expect(operationSchema.safeParse(unknownOp).success).toBe(false);
  });
});

// ============================================================================
// Transaction Schema Tests
// ============================================================================

describe('transactionSchema', () => {
  it('should validate correct transaction', () => {
    const validTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [
        {
          type: 'set',
          table: 'users',
          id: VALID_UUID,
          key: 'name',
          value: 'Updated Name',
        },
      ],
      clientTimestamp: Date.now(),
    };
    const result = transactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operations).toHaveLength(1);
    }
  });

  it('should validate transaction with multiple operations', () => {
    const validTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [
        { type: 'set', table: 'users', id: VALID_UUID, key: 'name', value: 'Name' },
        { type: 'set-now', table: 'users', id: VALID_UUID, key: 'updatedAt' },
        {
          type: 'listInsert',
          table: 'users',
          id: VALID_UUID,
          key: 'tags',
          value: 'tag1',
          position: 'append',
        },
      ],
      clientTimestamp: Date.now(),
    };
    const result = transactionSchema.safeParse(validTransaction);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.operations).toHaveLength(3);
    }
  });

  it('should reject empty operations array', () => {
    const invalidTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [],
      clientTimestamp: Date.now(),
    };
    expect(transactionSchema.safeParse(invalidTransaction).success).toBe(false);
  });

  it('should reject invalid txId', () => {
    const invalidTransaction = {
      txId: 'not-a-uuid',
      authorId: ANOTHER_UUID,
      operations: [{ type: 'set', table: 'users', id: VALID_UUID, key: 'name', value: 'test' }],
      clientTimestamp: Date.now(),
    };
    expect(transactionSchema.safeParse(invalidTransaction).success).toBe(false);
  });

  it('should reject non-positive clientTimestamp', () => {
    const invalidTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [{ type: 'set', table: 'users', id: VALID_UUID, key: 'name', value: 'test' }],
      clientTimestamp: 0,
    };
    expect(transactionSchema.safeParse(invalidTransaction).success).toBe(false);
  });

  it('should reject negative clientTimestamp', () => {
    const invalidTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [{ type: 'set', table: 'users', id: VALID_UUID, key: 'name', value: 'test' }],
      clientTimestamp: -100,
    };
    expect(transactionSchema.safeParse(invalidTransaction).success).toBe(false);
  });

  it('should reject non-integer clientTimestamp', () => {
    const invalidTransaction = {
      txId: VALID_UUID,
      authorId: ANOTHER_UUID,
      operations: [{ type: 'set', table: 'users', id: VALID_UUID, key: 'name', value: 'test' }],
      clientTimestamp: 1234.56,
    };
    expect(transactionSchema.safeParse(invalidTransaction).success).toBe(false);
  });
});

// ============================================================================
// Record Schema Tests
// ============================================================================

describe('recordPointerSchema', () => {
  it('should validate correct record pointer', () => {
    const validPointer = {
      table: 'users',
      id: VALID_UUID,
    };
    const result = recordPointerSchema.safeParse(validPointer);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.table).toBe('users');
      expect(result.data.id).toBe(VALID_UUID);
    }
  });

  it('should reject empty table', () => {
    const invalidPointer = {
      table: '',
      id: VALID_UUID,
    };
    expect(recordPointerSchema.safeParse(invalidPointer).success).toBe(false);
  });

  it('should reject invalid UUID', () => {
    const invalidPointer = {
      table: 'users',
      id: 'invalid',
    };
    expect(recordPointerSchema.safeParse(invalidPointer).success).toBe(false);
  });
});

describe('recordSchema', () => {
  it('should validate record with id and version', () => {
    const validRecord = {
      id: VALID_UUID,
      version: 1,
    };
    const result = recordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
  });

  it('should accept additional fields', () => {
    const validRecord = {
      id: VALID_UUID,
      version: 5,
      name: 'John',
      email: 'john@example.com',
      data: { nested: true },
    };
    const result = recordSchema.safeParse(validRecord);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data['name']).toBe('John');
    }
  });

  it('should reject missing id', () => {
    const invalidRecord = {
      version: 1,
      name: 'John',
    };
    expect(recordSchema.safeParse(invalidRecord).success).toBe(false);
  });

  it('should reject missing version', () => {
    const invalidRecord = {
      id: VALID_UUID,
      name: 'John',
    };
    expect(recordSchema.safeParse(invalidRecord).success).toBe(false);
  });

  it('should reject non-positive version', () => {
    const invalidRecord = {
      id: VALID_UUID,
      version: 0,
    };
    expect(recordSchema.safeParse(invalidRecord).success).toBe(false);
  });

  it('should reject non-integer version', () => {
    const invalidRecord = {
      id: VALID_UUID,
      version: 1.5,
    };
    expect(recordSchema.safeParse(invalidRecord).success).toBe(false);
  });
});

describe('recordMapSchema', () => {
  it('should validate empty record map', () => {
    const emptyMap = {};
    expect(recordMapSchema.safeParse(emptyMap).success).toBe(true);
  });

  it('should validate record map with single table', () => {
    const validMap = {
      users: {
        [VALID_UUID]: { id: VALID_UUID, version: 1, name: 'John' },
      },
    };
    expect(recordMapSchema.safeParse(validMap).success).toBe(true);
  });

  it('should validate record map with multiple tables', () => {
    const validMap = {
      users: {
        [VALID_UUID]: { id: VALID_UUID, version: 1, name: 'John' },
      },
      tasks: {
        [ANOTHER_UUID]: { id: ANOTHER_UUID, version: 2, title: 'Task 1' },
      },
    };
    const result = recordMapSchema.safeParse(validMap);
    expect(result.success).toBe(true);
  });

  it('should reject invalid record in map', () => {
    const invalidMap = {
      users: {
        [VALID_UUID]: { id: VALID_UUID }, // missing version
      },
    };
    expect(recordMapSchema.safeParse(invalidMap).success).toBe(false);
  });
});

// ============================================================================
// Response Schema Tests
// ============================================================================

describe('writeResponseSchema', () => {
  it('should validate correct write response', () => {
    const validResponse = {
      recordMap: {
        users: {
          [VALID_UUID]: { id: VALID_UUID, version: 2, name: 'Updated' },
        },
      },
    };
    const result = writeResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate write response with empty recordMap', () => {
    const validResponse = {
      recordMap: {},
    };
    expect(writeResponseSchema.safeParse(validResponse).success).toBe(true);
  });

  it('should reject missing recordMap', () => {
    const invalidResponse = {};
    expect(writeResponseSchema.safeParse(invalidResponse).success).toBe(false);
  });
});

describe('conflictResponseSchema', () => {
  it('should validate conflict response with message only', () => {
    const validResponse = {
      message: 'Record was modified by another user',
    };
    const result = conflictResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate conflict response with conflicting records', () => {
    const validResponse = {
      message: 'Conflict detected',
      conflictingRecords: [
        { table: 'users', id: VALID_UUID },
        { table: 'tasks', id: ANOTHER_UUID },
      ],
    };
    const result = conflictResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conflictingRecords).toHaveLength(2);
    }
  });

  it('should reject missing message', () => {
    const invalidResponse = {
      conflictingRecords: [{ table: 'users', id: VALID_UUID }],
    };
    expect(conflictResponseSchema.safeParse(invalidResponse).success).toBe(false);
  });
});

describe('getRecordsResponseSchema', () => {
  it('should validate correct get records response', () => {
    const validResponse = {
      recordMap: {
        users: {
          [VALID_UUID]: { id: VALID_UUID, version: 1, name: 'John' },
        },
      },
    };
    const result = getRecordsResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('should validate empty get records response', () => {
    const validResponse = {
      recordMap: {},
    };
    expect(getRecordsResponseSchema.safeParse(validResponse).success).toBe(true);
  });
});

// ============================================================================
// Contract Tests
// ============================================================================

describe('realtimeContract', () => {
  it('should have write endpoint defined', () => {
    expect(realtimeContract.write).toBeDefined();
    expect(realtimeContract.write.method).toBe('POST');
    expect(realtimeContract.write.path).toBe('/api/realtime/write');
  });

  it('should have getRecords endpoint defined', () => {
    expect(realtimeContract.getRecords).toBeDefined();
    expect(realtimeContract.getRecords.method).toBe('POST');
    expect(realtimeContract.getRecords.path).toBe('/api/realtime/getRecords');
  });

  it('should have correct response codes for write', () => {
    const responses = realtimeContract.write.responses;
    expect(responses[200]).toBeDefined();
    expect(responses[400]).toBeDefined();
    expect(responses[403]).toBeDefined();
    expect(responses[409]).toBeDefined();
    expect(responses[500]).toBeDefined();
  });

  it('should have correct response codes for getRecords', () => {
    const responses = realtimeContract.getRecords.responses;
    expect(responses[200]).toBeDefined();
    expect(responses[400]).toBeDefined();
    expect(responses[403]).toBeDefined();
    expect(responses[500]).toBeDefined();
  });
});

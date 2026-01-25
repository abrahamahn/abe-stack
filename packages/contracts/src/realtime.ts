// packages/contracts/src/realtime.ts
/**
 * Realtime Contract
 *
 * API contract definitions for real-time record operations.
 * Supports optimistic locking with version-based conflict detection.
 */

import { errorResponseSchema, uuidSchema } from './common';
import { createSchema, type Contract, type Schema } from './types';

// ============================================================================
// Validation Helpers
// ============================================================================

function validateNonEmptyString(data: unknown, fieldName: string): string {
  if (typeof data !== 'string' || data.length < 1) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return data;
}

function validatePositiveInt(data: unknown, fieldName: string): number {
  if (typeof data !== 'number' || !Number.isInteger(data) || data <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return data;
}

// ============================================================================
// Operation Schemas
// ============================================================================

/**
 * Set a field value on a record
 */
export interface SetOperation {
  type: 'set';
  table: string;
  id: string;
  key: string;
  value: unknown;
}

export const setOperationSchema: Schema<SetOperation> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid set operation');
  }
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'set') {
    throw new Error('Operation type must be "set"');
  }
  return {
    type: 'set',
    table: validateNonEmptyString(obj.table, 'table'),
    id: uuidSchema.parse(obj.id),
    key: validateNonEmptyString(obj.key, 'key'),
    value: obj.value,
  };
});

/**
 * Set a field to current timestamp (server-side)
 */
export interface SetNowOperation {
  type: 'set-now';
  table: string;
  id: string;
  key: string;
}

export const setNowOperationSchema: Schema<SetNowOperation> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid set-now operation');
  }
  const obj = data as Record<string, unknown>;
  if (obj.type !== 'set-now') {
    throw new Error('Operation type must be "set-now"');
  }
  return {
    type: 'set-now',
    table: validateNonEmptyString(obj.table, 'table'),
    id: uuidSchema.parse(obj.id),
    key: validateNonEmptyString(obj.key, 'key'),
  };
});

/**
 * Position specification for list insert operations
 */
export type ListPosition = 'prepend' | 'append' | { before: unknown } | { after: unknown };

export const listPositionSchema: Schema<ListPosition> = createSchema((data: unknown) => {
  if (data === 'prepend' || data === 'append') {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if ('before' in obj) {
      return { before: obj.before };
    }
    if ('after' in obj) {
      return { after: obj.after };
    }
  }
  throw new Error('Invalid list position');
});

/**
 * Insert a value into a list field
 */
export interface ListInsertOperation {
  type: 'listInsert';
  table: string;
  id: string;
  key: string;
  value: unknown;
  position: ListPosition;
}

export const listInsertOperationSchema: Schema<ListInsertOperation> = createSchema(
  (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid listInsert operation');
    }
    const obj = data as Record<string, unknown>;
    if (obj.type !== 'listInsert') {
      throw new Error('Operation type must be "listInsert"');
    }
    return {
      type: 'listInsert',
      table: validateNonEmptyString(obj.table, 'table'),
      id: uuidSchema.parse(obj.id),
      key: validateNonEmptyString(obj.key, 'key'),
      value: obj.value,
      position: listPositionSchema.parse(obj.position),
    };
  },
);

/**
 * Remove a value from a list field
 */
export interface ListRemoveOperation {
  type: 'listRemove';
  table: string;
  id: string;
  key: string;
  value: unknown;
}

export const listRemoveOperationSchema: Schema<ListRemoveOperation> = createSchema(
  (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid listRemove operation');
    }
    const obj = data as Record<string, unknown>;
    if (obj.type !== 'listRemove') {
      throw new Error('Operation type must be "listRemove"');
    }
    return {
      type: 'listRemove',
      table: validateNonEmptyString(obj.table, 'table'),
      id: uuidSchema.parse(obj.id),
      key: validateNonEmptyString(obj.key, 'key'),
      value: obj.value,
    };
  },
);

/**
 * Union of all operation types
 */
export type Operation = SetOperation | SetNowOperation | ListInsertOperation | ListRemoveOperation;

export const operationSchema: Schema<Operation> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid operation');
  }
  const obj = data as Record<string, unknown>;

  switch (obj.type) {
    case 'set':
      return setOperationSchema.parse(data);
    case 'set-now':
      return setNowOperationSchema.parse(data);
    case 'listInsert':
      return listInsertOperationSchema.parse(data);
    case 'listRemove':
      return listRemoveOperationSchema.parse(data);
    default:
      throw new Error(`Unknown operation type: ${String(obj.type)}`);
  }
});

// ============================================================================
// Transaction Schema
// ============================================================================

/**
 * A transaction containing multiple operations to apply atomically
 */
export interface Transaction {
  /** Unique transaction ID (for idempotency and tracking) */
  txId: string;
  /** User ID performing the transaction */
  authorId: string;
  /** Operations to apply */
  operations: Operation[];
  /** Client-side timestamp (for ordering) */
  clientTimestamp: number;
}

export const transactionSchema: Schema<Transaction> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid transaction');
  }
  const obj = data as Record<string, unknown>;

  const txId = uuidSchema.parse(obj.txId);
  const authorId = uuidSchema.parse(obj.authorId);
  const clientTimestamp = validatePositiveInt(obj.clientTimestamp, 'clientTimestamp');

  if (!Array.isArray(obj.operations)) {
    throw new Error('Operations must be an array');
  }
  if (obj.operations.length < 1) {
    throw new Error('At least one operation is required');
  }
  const operations = obj.operations.map((op) => operationSchema.parse(op));

  return { txId, authorId, operations, clientTimestamp };
});

// ============================================================================
// Record Pointer Schema
// ============================================================================

/**
 * Points to a specific record by table and ID
 */
export interface RecordPointer {
  table: string;
  id: string;
}

export const recordPointerSchema: Schema<RecordPointer> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid record pointer');
  }
  const obj = data as Record<string, unknown>;
  return {
    table: validateNonEmptyString(obj.table, 'table'),
    id: uuidSchema.parse(obj.id),
  };
});

// ============================================================================
// Response Schemas
// ============================================================================

/**
 * A record with required id and version fields
 */
export interface RealtimeRecord {
  id: string;
  version: number;
  [key: string]: unknown;
}

export const recordSchema: Schema<RealtimeRecord> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid record');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj.id);
  const version = validatePositiveInt(obj.version, 'version');

  return { ...obj, id, version } as RealtimeRecord;
});

/**
 * Map of table -> id -> record
 */
export type RecordMap = Record<string, Record<string, RealtimeRecord>>;

export const recordMapSchema: Schema<RecordMap> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid record map');
  }
  const result: RecordMap = {};
  const outer = data as Record<string, unknown>;

  for (const [table, records] of Object.entries(outer)) {
    if (!records || typeof records !== 'object') {
      throw new Error(`Invalid records for table ${table}`);
    }
    result[table] = {};
    const inner = records as Record<string, unknown>;
    for (const [id, record] of Object.entries(inner)) {
      result[table][id] = recordSchema.parse(record);
    }
  }

  return result;
});

/**
 * Success response with updated records
 */
export interface WriteResponse {
  recordMap: RecordMap;
}

export const writeResponseSchema: Schema<WriteResponse> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid write response');
  }
  const obj = data as Record<string, unknown>;
  return {
    recordMap: recordMapSchema.parse(obj.recordMap),
  };
});

/**
 * Conflict response (409)
 */
export interface ConflictResponse {
  message: string;
  conflictingRecords?: RecordPointer[];
}

export const conflictResponseSchema: Schema<ConflictResponse> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid conflict response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.message !== 'string') {
    throw new Error('Message must be a string');
  }

  let conflictingRecords: RecordPointer[] | undefined;
  if (Array.isArray(obj.conflictingRecords)) {
    conflictingRecords = obj.conflictingRecords.map((r) => recordPointerSchema.parse(r));
  }

  return { message: obj.message, conflictingRecords };
});

/**
 * Get records response
 */
export interface GetRecordsResponse {
  recordMap: RecordMap;
}

export const getRecordsResponseSchema: Schema<GetRecordsResponse> = createSchema(
  (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid get records response');
    }
    const obj = data as Record<string, unknown>;
    return {
      recordMap: recordMapSchema.parse(obj.recordMap),
    };
  },
);

// ============================================================================
// Get Records Request Schema
// ============================================================================

export interface GetRecordsRequest {
  pointers: RecordPointer[];
}

export const getRecordsRequestSchema: Schema<GetRecordsRequest> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid get records request');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.pointers)) {
    throw new Error('Pointers must be an array');
  }
  if (obj.pointers.length < 1) {
    throw new Error('At least one pointer is required');
  }
  if (obj.pointers.length > 100) {
    throw new Error('Maximum 100 pointers allowed');
  }
  return {
    pointers: obj.pointers.map((p) => recordPointerSchema.parse(p)),
  };
});

// ============================================================================
// Realtime Contract
// ============================================================================

export const realtimeContract = {
  /**
   * Write a transaction of operations
   *
   * Applies multiple operations atomically with optimistic locking.
   * Returns 409 if any record has been modified since it was loaded.
   */
  write: {
    method: 'POST' as const,
    path: '/api/realtime/write',
    body: transactionSchema,
    responses: {
      200: writeResponseSchema,
      400: errorResponseSchema,
      403: errorResponseSchema,
      409: conflictResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Apply a transaction of operations with optimistic locking',
  },

  /**
   * Get records by pointers
   *
   * Fetches multiple records by their table and ID.
   * Returns a RecordMap with all found records.
   */
  getRecords: {
    method: 'POST' as const,
    path: '/api/realtime/getRecords',
    body: getRecordsRequestSchema,
    responses: {
      200: getRecordsResponseSchema,
      400: errorResponseSchema,
      403: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Fetch records by table and ID',
  },
} satisfies Contract;

// Re-export Transaction as RealtimeTransaction for clarity in consumers
export type RealtimeTransaction = Transaction;

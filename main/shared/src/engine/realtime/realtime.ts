// main/shared/src/engine/realtime/realtime.ts
/**
 * Realtime Domain
 *
 * API contract definitions and pure domain logic for real-time record operations.
 * Supports optimistic locking with version-based conflict detection.
 *
 * @module Domain/Realtime
 */

import { deepEqual, getFieldValue, isSafeObjectKey } from '../../primitives/helpers/object';
import { createSchema, uuidSchema } from '../../primitives/schema';
import { errorResponseSchema } from '../http/response';

import type { Contract, Schema } from '../../primitives/api';

// ============================================================================
// Types
// ============================================================================

/** Set a field value on a record */
export interface SetOperation {
  type: 'set';
  table: string;
  id: string;
  key: string;
  value: unknown;
}

/** Set a field to current timestamp (server-side) */
export interface SetNowOperation {
  type: 'set-now';
  table: string;
  id: string;
  key: string;
}

/** Position specification for list insert operations */
export type ListPosition = 'prepend' | 'append' | { before: unknown } | { after: unknown };

/** Insert a value into a list field */
export interface ListInsertOperation {
  type: 'listInsert';
  table: string;
  id: string;
  key: string;
  value: unknown;
  position: ListPosition;
}

/** Remove a value from a list field */
export interface ListRemoveOperation {
  type: 'listRemove';
  table: string;
  id: string;
  key: string;
  value: unknown;
}

/** Union of all operation types */
export type RealtimeOperation =
  | SetOperation
  | SetNowOperation
  | ListInsertOperation
  | ListRemoveOperation;

/** A transaction containing multiple operations to apply atomically */
export interface RealtimeTransaction {
  /** Unique transaction ID (for idempotency and tracking) */
  txId: string;
  /** User ID performing the transaction */
  authorId: string;
  /** Operations to apply */
  operations: RealtimeOperation[];
  /** Client-side timestamp (for ordering) */
  clientTimestamp: number;
}

/** Points to a specific record by table and ID */
export interface RecordPointer<T extends string = string> {
  table: T;
  id: string;
}

/** Base interface for versioned records (id + version) */
export interface VersionedRecord {
  id: string;
  version: number;
}

/** A record with required id and version fields */
export interface RealtimeRecord extends VersionedRecord {
  [key: string]: unknown;
}

/** Map of table -> id -> record */
export type RecordMap = Record<string, Record<string, RealtimeRecord>>;

/** Success response with updated records */
export interface WriteResponse {
  recordMap: RecordMap;
}

/** Conflict response (409) */
export interface ConflictResponse {
  message: string;
  conflictingRecords?: RecordPointer[] | undefined;
}

/** Get records response */
export interface GetRecordsResponse {
  recordMap: RecordMap;
}

/** Request for fetching records by pointers */
export interface GetRecordsRequest {
  pointers: RecordPointer[];
}

/** Result of applying operations to a record map. */
export interface ApplyOperationsResult {
  /** Updated record map */
  recordMap: RecordMap;
  /** Records that were modified (for publishing) */
  modifiedRecords: ReadonlyArray<{ table: string; id: string }>;
}

/**
 * Version conflict error details.
 * Returned when optimistic locking detects a concurrent modification.
 */
export interface VersionConflict {
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Version the client expected */
  expectedVersion: number;
  /** Actual version in the database */
  actualVersion: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Fields that cannot be modified through realtime operations.
 * These are system-managed fields that must be protected.
 *
 * @complexity O(1) lookup
 */
export const PROTECTED_FIELDS = new Set<string>([
  'id',
  'version',
  'created_at',
  'updated_at',
  'password_hash',
  'passwordHash',
]);

/**
 * Domain-specific error messages for realtime operations.
 * Generic errors (auth, internal) use `ERROR_CODES` from `@bslt/shared`.
 */
export const REALTIME_ERRORS = {
  AUTHOR_MISMATCH: 'Author ID must match authenticated user',
  tableNotAllowed: (table: string) => `Table '${table}' is not allowed for realtime operations`,
  VERSION_CONFLICT: 'Version conflict: one or more records have been modified',
} as const;

// ============================================================================
// Schemas
// ============================================================================

/**
 * Validate a non-empty string field.
 *
 * @param data - Value to validate
 * @param fieldName - Field name for error messages
 * @returns Validated string
 * @throws Error if data is not a non-empty string
 * @complexity O(1)
 */
function validateNonEmptyString(data: unknown, fieldName: string): string {
  if (typeof data !== 'string' || data.length < 1) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  return data;
}

/**
 * Validate a positive integer field.
 *
 * @param data - Value to validate
 * @param fieldName - Field name for error messages
 * @returns Validated integer
 * @throws Error if data is not a positive integer
 * @complexity O(1)
 */
function validatePositiveInt(data: unknown, fieldName: string): number {
  if (typeof data !== 'number' || !Number.isInteger(data) || data <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
  return data;
}

/** @complexity O(1) */
export const setOperationSchema: Schema<SetOperation> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid set operation');
  }
  const obj = data as Record<string, unknown>;
  if (obj['type'] !== 'set') throw new Error('Operation type must be "set"');
  return {
    type: 'set',
    table: validateNonEmptyString(obj['table'], 'table'),
    id: uuidSchema.parse(obj['id']),
    key: validateNonEmptyString(obj['key'], 'key'),
    value: obj['value'],
  };
});

/** @complexity O(1) */
export const setNowOperationSchema: Schema<SetNowOperation> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid set-now operation');
  }
  const obj = data as Record<string, unknown>;
  if (obj['type'] !== 'set-now') throw new Error('Operation type must be "set-now"');
  return {
    type: 'set-now',
    table: validateNonEmptyString(obj['table'], 'table'),
    id: uuidSchema.parse(obj['id']),
    key: validateNonEmptyString(obj['key'], 'key'),
  };
});

/** @complexity O(1) */
export const listPositionSchema: Schema<ListPosition> = createSchema((data: unknown) => {
  if (data === 'prepend' || data === 'append') return data;
  if (data !== null && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if ('before' in obj) return { before: obj['before'] };
    if ('after' in obj) return { after: obj['after'] };
  }
  throw new Error('Invalid list position');
});

/** @complexity O(1) */
export const listInsertOperationSchema: Schema<ListInsertOperation> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid listInsert operation');
    }
    const obj = data as Record<string, unknown>;
    if (obj['type'] !== 'listInsert') throw new Error('Operation type must be "listInsert"');
    return {
      type: 'listInsert',
      table: validateNonEmptyString(obj['table'], 'table'),
      id: uuidSchema.parse(obj['id']),
      key: validateNonEmptyString(obj['key'], 'key'),
      value: obj['value'],
      position: listPositionSchema.parse(obj['position']),
    };
  },
);

/** @complexity O(1) */
export const listRemoveOperationSchema: Schema<ListRemoveOperation> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid listRemove operation');
    }
    const obj = data as Record<string, unknown>;
    if (obj['type'] !== 'listRemove') throw new Error('Operation type must be "listRemove"');
    return {
      type: 'listRemove',
      table: validateNonEmptyString(obj['table'], 'table'),
      id: uuidSchema.parse(obj['id']),
      key: validateNonEmptyString(obj['key'], 'key'),
      value: obj['value'],
    };
  },
);

/** @complexity O(1) */
export const operationSchema: Schema<RealtimeOperation> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid operation');
  }
  const obj = data as Record<string, unknown>;

  switch (obj['type']) {
    case 'set':
      return setOperationSchema.parse(data);
    case 'set-now':
      return setNowOperationSchema.parse(data);
    case 'listInsert':
      return listInsertOperationSchema.parse(data);
    case 'listRemove':
      return listRemoveOperationSchema.parse(data);
    default:
      throw new Error(`Unknown operation type: ${String(obj['type'])}`);
  }
});

/** @complexity O(n) where n = operations.length */
export const transactionSchema: Schema<RealtimeTransaction> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid transaction');
  }
  const obj = data as Record<string, unknown>;

  const txId = uuidSchema.parse(obj['txId']);
  const authorId = uuidSchema.parse(obj['authorId']);
  const clientTimestamp = validatePositiveInt(obj['clientTimestamp'], 'clientTimestamp');

  if (!Array.isArray(obj['operations'])) throw new Error('Operations must be an array');
  if (obj['operations'].length < 1) throw new Error('At least one operation is required');
  const operations = obj['operations'].map((op) => operationSchema.parse(op));

  return { txId, authorId, operations, clientTimestamp };
});

/** @complexity O(1) */
export const recordPointerSchema: Schema<RecordPointer> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid record pointer');
  }
  const obj = data as Record<string, unknown>;
  return {
    table: validateNonEmptyString(obj['table'], 'table'),
    id: uuidSchema.parse(obj['id']),
  };
});

/** @complexity O(1) */
export const recordSchema: Schema<RealtimeRecord> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid record');
  }
  const obj = data as Record<string, unknown>;

  const id = uuidSchema.parse(obj['id']);
  const version = validatePositiveInt(obj['version'], 'version');

  return { ...obj, id, version } as RealtimeRecord;
});

/** @complexity O(t * r) where t = tables, r = records per table */
export const recordMapSchema: Schema<RecordMap> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid record map');
  }
  const result: RecordMap = {};
  const outer = data as Record<string, unknown>;

  for (const [table, records] of Object.entries(outer)) {
    if (
      records === null ||
      records === undefined ||
      typeof records !== 'object' ||
      Array.isArray(records)
    ) {
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

/** @complexity O(t * r) where t = tables, r = records per table */
export const writeResponseSchema: Schema<WriteResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid write response');
  }
  const obj = data as Record<string, unknown>;
  return { recordMap: recordMapSchema.parse(obj['recordMap']) };
});

/** @complexity O(c) where c = conflictingRecords.length */
export const conflictResponseSchema: Schema<ConflictResponse> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid conflict response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['message'] !== 'string') throw new Error('Message must be a string');

  let conflictingRecords: RecordPointer[] | undefined;
  if (Array.isArray(obj['conflictingRecords'])) {
    conflictingRecords = obj['conflictingRecords'].map((r) => recordPointerSchema.parse(r));
  }

  return { message: obj['message'], conflictingRecords };
});

/** @complexity O(t * r) where t = tables, r = records per table */
export const getRecordsResponseSchema: Schema<GetRecordsResponse> = createSchema(
  (data: unknown) => {
    if (data === null || data === undefined || typeof data !== 'object') {
      throw new Error('Invalid get records response');
    }
    const obj = data as Record<string, unknown>;
    return { recordMap: recordMapSchema.parse(obj['recordMap']) };
  },
);

/** @complexity O(n) where n = pointers.length */
export const getRecordsRequestSchema: Schema<GetRecordsRequest> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Invalid get records request');
  }
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj['pointers'])) throw new Error('Pointers must be an array');
  if (obj['pointers'].length < 1) throw new Error('At least one pointer is required');
  if (obj['pointers'].length > 100) throw new Error('Maximum 100 pointers allowed');
  return {
    pointers: obj['pointers'].map((p) => recordPointerSchema.parse(p)),
  };
});

/** Realtime API contract definition */
export const realtimeContract = {
  /**
   * Write a transaction of operations.
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
   * Get records by pointers.
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

// ============================================================================
// Functions
// ============================================================================

/**
 * Check if a field can be modified through realtime operations.
 *
 * @param field - Field name to check
 * @returns Whether the field is mutable (not protected)
 * @complexity O(1)
 */
export function isFieldMutable(field: string): boolean {
  return !PROTECTED_FIELDS.has(field);
}

/**
 * Set a nested value on an object by dot-separated path.
 * Creates intermediate objects if they do not exist.
 *
 * @param obj - Target object (mutated in place)
 * @param path - Dot-separated path (e.g., "settings.theme.color")
 * @param value - Value to set at the path
 * @complexity O(d) where d is the depth of the path
 */
export function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (lastKey === undefined || lastKey === '') return;
  if (!isSafeObjectKey(lastKey)) return;

  let target: Record<string, unknown> = obj;
  for (const key of keys) {
    if (!isSafeObjectKey(key)) return;
    const existing = Object.hasOwn(target, key) ? target[key] : undefined;
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      const nested: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      target[key] = nested;
      target = nested;
    } else {
      target = existing as Record<string, unknown>;
    }
  }

  target[lastKey] = value;
}

/**
 * Apply a set operation to a record.
 */
function applySetOp(record: RealtimeRecord, op: SetOperation): void {
  setPath(record, op.key, op.value);
}

/**
 * Apply a set-now operation to a record (sets current ISO timestamp).
 */
function applySetNowOp(record: RealtimeRecord, op: SetNowOperation): void {
  setPath(record, op.key, new Date().toISOString());
}

/**
 * Apply a list insert operation to a record.
 * Removes duplicates before inserting at the specified position.
 */
function applyListInsertOp(record: RealtimeRecord, op: ListInsertOperation): void {
  const currentValue = getFieldValue(record, op.key);
  const list = Array.isArray(currentValue) ? [...(currentValue as unknown[])] : [];

  // Remove duplicates first
  const filtered = list.filter((item) => !deepEqual(item, op.value));

  const position: ListPosition = op.position;

  if (position === 'prepend') {
    setPath(record, op.key, [op.value, ...filtered]);
  } else if (position === 'append') {
    setPath(record, op.key, [...filtered, op.value]);
  } else if ('before' in position) {
    const index = filtered.findIndex((item) => deepEqual(item, position.before));
    filtered.splice(index >= 0 ? index : 0, 0, op.value);
    setPath(record, op.key, filtered);
  } else if ('after' in position) {
    const index = filtered.findIndex((item) => deepEqual(item, position.after));
    filtered.splice(index + 1, 0, op.value);
    setPath(record, op.key, filtered);
  }
}

/**
 * Apply a list remove operation to a record.
 */
function applyListRemoveOp(record: RealtimeRecord, op: ListRemoveOperation): void {
  const currentValue = getFieldValue(record, op.key);
  if (!Array.isArray(currentValue)) {
    return;
  }

  setPath(
    record,
    op.key,
    currentValue.filter((item) => !deepEqual(item, op.value)),
  );
}

/**
 * Apply a single operation to a record.
 * Creates a new record with incremented version.
 *
 * @param record - Source record to apply the operation to
 * @param op - The operation to apply
 * @returns New record with the operation applied and version incremented
 * @throws Error if the operation targets a protected field
 * @complexity O(d) where d is the depth of the key path
 */
export function applyOperation(record: RealtimeRecord, op: RealtimeOperation): RealtimeRecord {
  // Validate field is mutable (all operations have a key field)
  const key = op.key;
  const rootKey: string | undefined = key.split('.')[0];
  if (rootKey === undefined || rootKey === '' || !isFieldMutable(rootKey)) {
    throw new Error(`Field '${rootKey ?? key}' cannot be modified`);
  }

  const newRecord: RealtimeRecord = {
    ...record,
    version: record.version + 1,
  };

  switch (op.type) {
    case 'set':
      applySetOp(newRecord, op);
      break;

    case 'set-now':
      applySetNowOp(newRecord, op);
      break;

    case 'listInsert':
      applyListInsertOp(newRecord, op);
      break;

    case 'listRemove':
      applyListRemoveOp(newRecord, op);
      break;
  }

  return newRecord;
}

/**
 * Apply all operations to a record map.
 * Returns the new record map and list of modified records.
 *
 * @param recordMap - Source record map (deep cloned internally)
 * @param operations - Operations to apply sequentially
 * @returns New record map and list of modified record pointers
 * @throws Error if a record referenced by an operation does not exist
 * @complexity O(n * d) where n = operations and d = max key depth
 */
export function applyOperations(
  recordMap: RecordMap,
  operations: RealtimeOperation[],
): ApplyOperationsResult {
  // Clone the record map to avoid mutation
  const newRecordMap: RecordMap = JSON.parse(JSON.stringify(recordMap)) as RecordMap;
  const modifiedRecords: RecordPointer[] = [];

  for (const op of operations) {
    // All operation types have table and id fields - extract them safely
    const table = op.table;
    const id = op.id;

    if (!isSafeObjectKey(table) || !isSafeObjectKey(id)) {
      throw new Error(`Invalid table or id: ${table}:${id}`);
    }

    const record = newRecordMap[table]?.[id];
    if (record === undefined) {
      throw new Error(`Record not found: ${table}:${id}`);
    }

    const newRecord = applyOperation(record, op);
    let tableRecords = newRecordMap[table];
    if (tableRecords === undefined) {
      tableRecords = {};
      // Use defineProperty to prevent prototype pollution via dynamic keys
      Object.defineProperty(newRecordMap, table, {
        value: tableRecords,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    Object.defineProperty(tableRecords, id, {
      value: newRecord,
      writable: true,
      enumerable: true,
      configurable: true,
    });

    // Track modified records without duplicates - O(m) where m = modified count
    if (!modifiedRecords.some((p) => p.table === table && p.id === id)) {
      modifiedRecords.push({ table, id });
    }
  }

  return { recordMap: newRecordMap, modifiedRecords };
}

/**
 * Extract unique record pointers from operations.
 * Deduplicates by table:id key.
 *
 * @param operations - Array of realtime operations
 * @returns Deduplicated array of record pointers
 * @complexity O(n) where n is the number of operations
 */
export function getOperationPointers(operations: RealtimeOperation[]): RecordPointer[] {
  const seen = new Set<string>();
  const pointers: RecordPointer[] = [];

  for (const op of operations) {
    const table = op.table;
    const id = op.id;
    const key = `${table}:${id}`;
    if (!seen.has(key)) {
      seen.add(key);
      pointers.push({ table, id });
    }
  }

  return pointers;
}

/**
 * Check for version conflicts between original and current records.
 * Used during optimistic locking to detect concurrent modifications.
 *
 * @param originalRecordMap - Record map at the start of the transaction
 * @param currentRecordMap - Record map reloaded during the transaction
 * @param modifiedRecords - Records that were modified by the current transaction
 * @returns Array of version conflicts (empty if no conflicts)
 * @complexity O(m) where m is the number of modified records
 */
export function checkVersionConflicts(
  originalRecordMap: RecordMap,
  currentRecordMap: RecordMap,
  modifiedRecords: RecordPointer[],
): VersionConflict[] {
  const conflicts: VersionConflict[] = [];

  for (const { table, id } of modifiedRecords) {
    const original = originalRecordMap[table]?.[id];
    const current = currentRecordMap[table]?.[id];

    if (original !== undefined && current !== undefined) {
      const originalVersion = original.version;
      const currentVersion = current.version;

      // Original version should match current DB version
      if (originalVersion !== currentVersion) {
        conflicts.push({
          table,
          id,
          expectedVersion: originalVersion,
          actualVersion: currentVersion,
        });
      }
    }
  }

  return conflicts;
}

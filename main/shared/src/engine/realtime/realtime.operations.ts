// main/shared/src/engine/realtime/realtime.operations.ts
/**
 * Realtime Operations
 *
 * Pure domain logic for applying realtime operations to records.
 * Framework-agnostic — no I/O, no database, no server dependencies.
 *
 * @module Domain/Realtime/Operations
 */

import { deepEqual, getFieldValue, isSafeObjectKey } from '../../primitives/helpers/object';

import type {
  ListInsertOperation,
  ListPosition,
  ListRemoveOperation,
  RealtimeOperation,
  RealtimeRecord,
  RecordMap,
  RecordPointer,
  SetNowOperation,
  SetOperation,
} from './realtime.schemas';

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
 * Generic errors (auth, internal) use `ERROR_CODES` from `@abe-stack/shared`.
 */
export const REALTIME_ERRORS = {
  AUTHOR_MISMATCH: 'Author ID must match authenticated user',
  tableNotAllowed: (table: string) => `Table '${table}' is not allowed for realtime operations`,
  VERSION_CONFLICT: 'Version conflict: one or more records have been modified',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Result of applying operations to a record map.
 */
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
// Field Validation
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

// ============================================================================
// Path Utilities
// ============================================================================

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

// ============================================================================
// Operation Application (Private Helpers)
// ============================================================================

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

// ============================================================================
// Public Operation Functions
// ============================================================================

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

// modules/realtime/src/service.ts
/**
 * Realtime Service
 *
 * Core service for loading and applying realtime operations.
 * Handles record loading, operation application, and optimistic locking.
 * All database operations use parameterized queries via the query builder.
 *
 * @module service
 */

import { and, eq, inArray, insert, select, update, USERS_TABLE } from '@abe-stack/db';

import type { ApplyOperationsResult, RealtimeRecord, VersionConflict } from './types';
import type { DbClient, User } from '@abe-stack/db';
import type {
  RealtimeListInsertOperation,
  RealtimeListRemoveOperation,
  RealtimeOperation,
  RealtimeSetNowOperation,
  RealtimeSetOperation,
  RecordMap,
  RecordPointer,
} from '@abe-stack/shared';

// ============================================================================
// Table Configuration
// ============================================================================

/**
 * Mapping of logical table names to their database table identifiers.
 *
 * @complexity O(1) lookup per table
 */
const tableNameMap: Record<string, string> = {
  users: USERS_TABLE,
};

/**
 * Registry of allowed tables for realtime operations.
 * For security, only explicitly registered tables can be accessed.
 * This prevents arbitrary table access through the API.
 *
 * @complexity O(1) lookup
 */
const ALLOWED_TABLES = new Set<string>(Object.keys(tableNameMap));

/**
 * Fields that cannot be modified through realtime operations.
 * These are system-managed fields that must be protected.
 *
 * @complexity O(1) lookup
 */
const PROTECTED_FIELDS = new Set<string>([
  'id',
  'version',
  'created_at',
  'updated_at',
  'password_hash',
  'passwordHash',
]);

/**
 * Check if a table is allowed for realtime operations.
 *
 * @param table - Table name to check
 * @returns Whether the table is registered for realtime access
 * @complexity O(1)
 */
export function isTableAllowed(table: string): boolean {
  return ALLOWED_TABLES.has(table);
}

/**
 * Register a table for realtime operations.
 * Call this during application setup to enable tables.
 *
 * @param table - Logical table name
 * @param tableName - Optional database table name (defaults to table parameter)
 * @complexity O(1)
 */
export function registerRealtimeTable(table: string, tableName?: string): void {
  ALLOWED_TABLES.add(table);
  if (tableName !== undefined && tableName !== '') {
    tableNameMap[table] = tableName;
  }
}

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
 * Get a nested value from an object by dot-separated path.
 *
 * @param obj - Source object
 * @param path - Dot-separated path (e.g., "metadata.key")
 * @returns The value at the path, or undefined if not found
 * @complexity O(d) where d is the depth of the path
 */
function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
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
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (lastKey === undefined || lastKey === '') return;

  const target = keys.reduce<Record<string, unknown>>((acc, key) => {
    if (!(key in acc) || typeof acc[key] !== 'object' || acc[key] === null) {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, obj);

  target[lastKey] = value;
}

/**
 * Deep equality comparison for record values.
 * Used by list operations to find matching items.
 *
 * @param a - First value
 * @param b - Second value
 * @returns Whether the values are deeply equal
 * @complexity O(n) where n is the total number of nested properties
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      if (!keysB.includes(key) || !deepEqual(objA[key], objB[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Load records from database by pointers.
 * Groups pointers by table for batch loading and deduplicates IDs.
 *
 * @param db - Database client
 * @param pointers - Array of table/id pairs to load
 * @returns Record map with loaded records organized by table
 * @throws Error if a table is not allowed for realtime operations
 * @complexity O(t) database queries where t is the number of distinct tables
 */
export async function loadRecords(db: DbClient, pointers: RecordPointer[]): Promise<RecordMap> {
  if (pointers.length === 0) {
    return {};
  }

  // Group pointers by table - O(n) where n = pointers.length
  const byTable = new Map<string, string[]>();
  for (const pointer of pointers) {
    if (!isTableAllowed(pointer.table)) {
      throw new Error(`Table '${pointer.table}' is not allowed for realtime operations`);
    }

    const ids = byTable.get(pointer.table) ?? [];
    if (!ids.includes(pointer.id)) {
      ids.push(pointer.id);
    }
    byTable.set(pointer.table, ids);
  }

  // Load records from each table
  const recordMap: RecordMap = {};

  for (const [table, ids] of byTable.entries()) {
    recordMap[table] = {};
    const tableName = tableNameMap[table];
    if (tableName === undefined || tableName === '') {
      continue;
    }

    const rows = await db.query<User & RealtimeRecord>(
      select(tableName).where(inArray('id', ids)).toSql(),
    );

    for (const row of rows) {
      recordMap[table][row.id] = row as RealtimeRecord;
    }
  }

  return recordMap;
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
    const key = `${op.table}:${op.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      pointers.push({ table: op.table, id: op.id });
    }
  }

  return pointers;
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
  // Validate field is mutable
  const rootKey = op.key.split('.')[0];
  if (rootKey === undefined || rootKey === '' || !isFieldMutable(rootKey)) {
    throw new Error(`Field '${rootKey ?? op.key}' cannot be modified`);
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
 * Apply a set operation to a record.
 *
 * @param record - Record to modify in place
 * @param op - Set operation with key and value
 */
function applySetOp(record: RealtimeRecord, op: RealtimeSetOperation): void {
  setPath(record, op.key, op.value);
}

/**
 * Apply a set-now operation to a record (sets current ISO timestamp).
 *
 * @param record - Record to modify in place
 * @param op - Set-now operation with key
 */
function applySetNowOp(record: RealtimeRecord, op: RealtimeSetNowOperation): void {
  setPath(record, op.key, new Date().toISOString());
}

/**
 * Apply a list insert operation to a record.
 * Removes duplicates before inserting at the specified position.
 *
 * @param record - Record to modify in place
 * @param op - List insert operation with key, value, and position
 */
function applyListInsertOp(record: RealtimeRecord, op: RealtimeListInsertOperation): void {
  const currentValue = getPath(record, op.key);
  const list = Array.isArray(currentValue) ? [...(currentValue as unknown[])] : [];

  // Remove duplicates first
  const filtered = list.filter((item) => !deepEqual(item, op.value));

  if (op.position === 'prepend') {
    setPath(record, op.key, [op.value, ...filtered]);
  } else if (op.position === 'append') {
    setPath(record, op.key, [...filtered, op.value]);
  } else if ('before' in op.position) {
    const position = op.position as { before: unknown };
    const index = filtered.findIndex((item) => deepEqual(item, position.before));
    filtered.splice(index >= 0 ? index : 0, 0, op.value);
    setPath(record, op.key, filtered);
  } else if ('after' in op.position) {
    const position = op.position as { after: unknown };
    const index = filtered.findIndex((item) => deepEqual(item, position.after));
    filtered.splice(index + 1, 0, op.value);
    setPath(record, op.key, filtered);
  }
}

/**
 * Apply a list remove operation to a record.
 *
 * @param record - Record to modify in place
 * @param op - List remove operation with key and value to remove
 */
function applyListRemoveOp(record: RealtimeRecord, op: RealtimeListRemoveOperation): void {
  const currentValue = getPath(record, op.key);
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
    const record = newRecordMap[op.table]?.[op.id];
    if (record === undefined) {
      throw new Error(`Record not found: ${op.table}:${op.id}`);
    }

    const newRecord = applyOperation(record, op);
    let tableRecords = newRecordMap[op.table];
    if (tableRecords === undefined) {
      tableRecords = {};
      newRecordMap[op.table] = tableRecords;
    }
    tableRecords[op.id] = newRecord;

    // Track modified records without duplicates - O(m) where m = modified count
    if (!modifiedRecords.some((p) => p.table === op.table && p.id === op.id)) {
      modifiedRecords.push({ table: op.table, id: op.id });
    }
  }

  return { recordMap: newRecordMap, modifiedRecords };
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
      const originalVersion = (original as RealtimeRecord).version;
      const currentVersion = (current as RealtimeRecord).version;

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

/**
 * Save records to database.
 * Inserts new records and updates existing ones with optimistic locking.
 *
 * @param db - Database client
 * @param recordMap - Record map with new/updated records
 * @param originalRecordMap - Record map from before changes (for version checking)
 * @throws Error if a concurrent modification is detected during save
 * @complexity O(r) database operations where r is the number of changed records
 */
export async function saveRecords(
  db: DbClient,
  recordMap: RecordMap,
  originalRecordMap: RecordMap,
): Promise<void> {
  for (const [table, records] of Object.entries(recordMap)) {
    for (const [id, record] of Object.entries(records)) {
      const originalRecord = originalRecordMap[table]?.[id] as RealtimeRecord | undefined;

      if (originalRecord === undefined) {
        // New record - insert
        await insertRecord(db, table, record);
      } else if (record.version > originalRecord.version) {
        // Updated record - update with version check
        const updated = await updateRecord(db, table, record, originalRecord.version);
        if (!updated) {
          throw new Error(`Concurrent modification detected for ${table}:${id}`);
        }
      }
    }
  }
}

/**
 * Insert a new record into the database.
 *
 * @param db - Database client
 * @param table - Logical table name
 * @param record - Record to insert
 * @throws Error if the table is not registered
 * @complexity O(1) database operation
 */
async function insertRecord(db: DbClient, table: string, record: RealtimeRecord): Promise<void> {
  const tableName = tableNameMap[table];
  if (tableName === undefined || tableName === '') {
    throw new Error(`Table '${table}' is not registered for realtime operations`);
  }
  await db.execute(insert(tableName).values(record).toSql());
}

/**
 * Update an existing record with optimistic locking.
 * Only updates if the current version matches the expected version.
 *
 * @param db - Database client
 * @param table - Logical table name
 * @param record - Updated record data
 * @param expectedVersion - Expected current version (for optimistic lock)
 * @returns Whether the update was successful
 * @throws Error if the table is not registered
 * @complexity O(1) database operation
 */
async function updateRecord(
  db: DbClient,
  table: string,
  record: RealtimeRecord,
  expectedVersion: number,
): Promise<boolean> {
  const tableName = tableNameMap[table];
  if (tableName === undefined || tableName === '') {
    throw new Error(`Table '${table}' is not registered for realtime operations`);
  }

  const { id, ...rest } = record;

  const result = await db.query<{ id: string }>(
    update(tableName)
      .set({ ...rest, updated_at: new Date() })
      .where(and(eq('id', id), eq('version', expectedVersion)))
      .returning('id')
      .toSql(),
  );

  return result.length === 1;
}

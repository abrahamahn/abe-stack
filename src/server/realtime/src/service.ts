// src/server/realtime/src/service.ts
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
import { deepEqual, getFieldValue, isSafeObjectKey } from '@abe-stack/shared';

import type { ApplyOperationsResult, RealtimeRecord, VersionConflict } from './types';
import type { DbClient, User } from '@abe-stack/db';
import type {
  ListPosition,
  RecordMap,
  RecordPointer,
  RealtimeListInsertOperation,
  RealtimeListRemoveOperation,
  RealtimeOperation as Operation,
  RealtimeSetOperation,
  SetNowOperation,
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
 * Resolve a logical table name to its database table identifier.
 * Returns undefined if the table is not registered for realtime operations.
 *
 * @param logicalName - Logical table name (e.g. 'users')
 * @returns Database table name, or undefined if not registered
 * @complexity O(1)
 */
export function resolveTableName(logicalName: string): string | undefined {
  if (!ALLOWED_TABLES.has(logicalName)) return undefined;
  return tableNameMap[logicalName];
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
export function getOperationPointers(operations: Operation[]): RecordPointer[] {
  const seen = new Set<string>();
  const pointers: RecordPointer[] = [];

  for (const op of operations) {
    // All operation types have table and id fields - extract them safely
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
 * Apply a single operation to a record.
 * Creates a new record with incremented version.
 *
 * @param record - Source record to apply the operation to
 * @param op - The operation to apply
 * @returns New record with the operation applied and version incremented
 * @throws Error if the operation targets a protected field
 * @complexity O(d) where d is the depth of the key path
 */
export function applyOperation(record: RealtimeRecord, op: Operation): RealtimeRecord {
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
function applySetNowOp(record: RealtimeRecord, op: SetNowOperation): void {
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
 *
 * @param record - Record to modify in place
 * @param op - List remove operation with key and value to remove
 */
function applyListRemoveOp(record: RealtimeRecord, op: RealtimeListRemoveOperation): void {
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
  operations: Operation[],
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
  for (const table in recordMap) {
    const records = recordMap[table];
    if (records === undefined) continue;

    for (const id in records) {
      const typedRecord = records[id];
      if (typedRecord === undefined) continue;

      const originalRecord = originalRecordMap[table]?.[id];

      if (originalRecord === undefined) {
        // New record - insert
        await insertRecord(db, table, typedRecord);
      } else if (typedRecord.version > originalRecord.version) {
        // Updated record - update with version check
        const updated = await updateRecord(db, table, typedRecord, originalRecord.version);
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

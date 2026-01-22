// apps/server/src/modules/realtime/service.ts
/**
 * Realtime Service
 *
 * Core service for loading and applying realtime operations.
 * Handles record loading, operation application, and optimistic locking.
 */

import { users } from '@infrastructure';
import { and, eq, inArray } from 'drizzle-orm';

import type { ApplyOperationsResult, RealtimeRecord, VersionConflict } from './types';
import type {
  RealtimeListInsertOperation,
  RealtimeListRemoveOperation,
  RealtimeOperation,
  RecordMap,
  RecordPointer,
  RealtimeSetNowOperation,
  RealtimeSetOperation,
} from '@abe-stack/core';
import type { DbClient } from '@database';

// ============================================================================
// Table Configuration
// ============================================================================

const tableMap = {
  users,
};

/**
 * Registry of allowed tables for realtime operations
 *
 * For security, only explicitly registered tables can be accessed.
 * This prevents arbitrary table access through the API.
 */
const ALLOWED_TABLES = new Set<string>(Object.keys(tableMap));

/**
 * Fields that cannot be modified through realtime operations
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
 * Check if a table is allowed for realtime operations
 */
export function isTableAllowed(table: string): boolean {
  return ALLOWED_TABLES.has(table);
}

/**
 * Register a table for realtime operations
 * Call this during application setup to enable tables
 */
export function registerRealtimeTable(table: string): void {
  ALLOWED_TABLES.add(table);
}

/**
 * Check if a field can be modified
 */
export function isFieldMutable(field: string): boolean {
  return !PROTECTED_FIELDS.has(field);
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Get a nested value from an object by dot-separated path
 */
function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Set a nested value on an object by dot-separated path
 */
function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  const target = keys.reduce<Record<string, unknown>>((acc, key) => {
    if (!(key in acc) || typeof acc[key] !== 'object' || acc[key] === null) {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, obj);

  target[lastKey] = value;
}

/**
 * Deep equality comparison
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
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
 * Load records from database by pointers
 */
export async function loadRecords(db: DbClient, pointers: RecordPointer[]): Promise<RecordMap> {
  if (pointers.length === 0) {
    return {};
  }

  // Group pointers by table
  const byTable = new Map<string, string[]>();
  for (const pointer of pointers) {
    if (!isTableAllowed(pointer.table)) {
      throw new Error(`Table '${pointer.table}' is not allowed for realtime operations`);
    }

    const ids = byTable.get(pointer.table) || [];
    if (!ids.includes(pointer.id)) {
      ids.push(pointer.id);
    }
    byTable.set(pointer.table, ids);
  }

  // Load records from each table
  const recordMap: RecordMap = {};

  for (const [table, ids] of byTable.entries()) {
    recordMap[table] = {};
    const tableSchema = tableMap[table as keyof typeof tableMap] as typeof users | undefined;
    if (!tableSchema) {
      continue;
    }

    const rows = await db
      .select()
      .from(tableSchema)
      .where(inArray(tableSchema.id, ids));

    for (const row of rows) {
      recordMap[table][row.id] = row as RealtimeRecord;
    }
  }

  return recordMap;
}

/**
 * Extract unique record pointers from operations
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
 * Apply a single operation to a record
 */
export function applyOperation(record: RealtimeRecord, op: RealtimeOperation): RealtimeRecord {
  // Validate field is mutable
  const rootKey = op.key.split('.')[0];
  if (!rootKey || !isFieldMutable(rootKey)) {
    throw new Error(`Field '${rootKey || op.key}' cannot be modified`);
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

function applySetOp(record: RealtimeRecord, op: RealtimeSetOperation): void {
  setPath(record, op.key, op.value);
}

function applySetNowOp(record: RealtimeRecord, op: RealtimeSetNowOperation): void {
  setPath(record, op.key, new Date().toISOString());
}

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
 * Apply all operations to a record map
 *
 * Returns the new record map and list of conflicts if any
 */
export function applyOperations(
  recordMap: RecordMap,
  operations: RealtimeOperation[],
): ApplyOperationsResult {
  // Clone the record map
  const newRecordMap: RecordMap = JSON.parse(JSON.stringify(recordMap)) as RecordMap;
  const modifiedRecords: RecordPointer[] = [];

  for (const op of operations) {
    const record = newRecordMap[op.table]?.[op.id];
    if (!record) {
      throw new Error(`Record not found: ${op.table}:${op.id}`);
    }

    const newRecord = applyOperation(record, op);
    let tableMap = newRecordMap[op.table];
    if (!tableMap) {
      tableMap = {};
      newRecordMap[op.table] = tableMap;
    }
    tableMap[op.id] = newRecord;

    // Track modified records
    if (!modifiedRecords.some((p) => p.table === op.table && p.id === op.id)) {
      modifiedRecords.push({ table: op.table, id: op.id });
    }
  }

  return { recordMap: newRecordMap, modifiedRecords };
}

/**
 * Check for version conflicts between original and current records
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

    if (original && current) {
      const originalVersion = (original as RealtimeRecord).version;
      const currentVersion = (current as RealtimeRecord).version;

      // Original version should match current DB version
      // The new version will be originalVersion + 1
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
 * Save records to database
 */
export async function saveRecords(
  db: DbClient,
  recordMap: RecordMap,
  originalRecordMap: RecordMap,
): Promise<void> {
  for (const [table, records] of Object.entries(recordMap)) {
    for (const [id, record] of Object.entries(records)) {
      const typedRecord = record as RealtimeRecord;
      const originalRecord = originalRecordMap[table]?.[id] as RealtimeRecord | undefined;

      if (!originalRecord) {
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
 * Insert a new record
 */
async function insertRecord(db: DbClient, table: string, record: RealtimeRecord): Promise<void> {
  const tableSchema = tableMap[table as keyof typeof tableMap] as typeof users | undefined;
  if (!tableSchema) {
    throw new Error(`Table '${table}' is not registered for realtime operations`);
  }
  await db.insert(tableSchema).values(record as typeof users.$inferInsert);
}

/**
 * Update an existing record with optimistic locking
 */
async function updateRecord(
  db: DbClient,
  table: string,
  record: RealtimeRecord,
  expectedVersion: number,
): Promise<boolean> {
  const tableSchema = tableMap[table as keyof typeof tableMap] as typeof users | undefined;
  if (!tableSchema) {
    throw new Error(`Table '${table}' is not registered for realtime operations`);
  }

  const { id, ...rest } = record;

  const result = await db
    .update(tableSchema)
    .set({ ...rest, updatedAt: new Date() })
    .where(and(eq(tableSchema.id, id), eq(tableSchema.version, expectedVersion)))
    .returning({ id: tableSchema.id });

  return result.length === 1;
}

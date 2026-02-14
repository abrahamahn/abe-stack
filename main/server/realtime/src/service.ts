// main/server/realtime/src/service.ts
/**
 * Realtime Service
 *
 * Server-side service for loading and saving realtime records.
 * Handles database operations, table registry, and optimistic locking.
 * Pure operation logic (apply, conflict detection) lives in @abe-stack/shared.
 *
 * @module service
 */

import { and, eq, inArray, insert, select, update, USERS_TABLE } from '@abe-stack/db';

import type { DbClient, User } from '@abe-stack/db';
import type { RealtimeRecord, RecordMap, RecordPointer } from '@abe-stack/shared';

// Re-export shared functions used by consumers of this module
export {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  getOperationPointers,
  isFieldMutable,
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

// ============================================================================
// Database Operations
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

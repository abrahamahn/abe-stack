// main/server/db/src/repositories/files/files.ts
/**
 * Files Repository (Functional)
 *
 * Data access layer for the files table.
 * Manages file upload records with multi-provider storage support.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type FileRecord,
  type NewFileRecord,
  type UpdateFileRecord,
  FILE_COLUMNS,
  FILES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// File Repository Interface
// ============================================================================

/**
 * Functional repository for file record operations.
 */
export interface FileRepository {
  /**
   * Find a file record by ID.
   *
   * @param id - File record UUID
   * @returns File record or null if not found
   * @complexity O(1)
   */
  findById(id: string): Promise<FileRecord | null>;

  /**
   * Find all files for a user.
   *
   * @param userId - The owning user ID
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of file records, most recent first
   * @complexity O(n) where n is result count
   */
  findByUserId(userId: string, limit?: number): Promise<FileRecord[]>;

  /**
   * Find all files for a tenant.
   *
   * @param tenantId - The tenant ID
   * @param limit - Maximum number of records to return (default: 100)
   * @returns Array of file records, most recent first
   * @complexity O(n) where n is result count
   */
  findByTenantId(tenantId: string, limit?: number): Promise<FileRecord[]>;

  /**
   * Create a new file record.
   *
   * @param data - File record data
   * @returns Created file record
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewFileRecord): Promise<FileRecord>;

  /**
   * Update an existing file record.
   *
   * @param id - File record UUID
   * @param data - Fields to update
   * @returns Updated file record or null if not found
   * @complexity O(1)
   */
  update(id: string, data: UpdateFileRecord): Promise<FileRecord | null>;

  /**
   * Delete a file record by ID.
   *
   * @param id - File record UUID
   * @returns True if a record was deleted
   * @complexity O(1)
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete all file records for a user (GDPR compliance).
   *
   * @param userId - The owning user ID
   * @returns Number of records deleted
   * @complexity O(n) where n is user's file count
   */
  deleteByUserId(userId: string): Promise<number>;
}

// ============================================================================
// File Repository Implementation
// ============================================================================

/**
 * Transform raw database row to FileRecord type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed FileRecord object
 * @complexity O(n) where n is number of columns
 */
function transformFileRecord(row: Record<string, unknown>): FileRecord {
  return toCamelCase<FileRecord>(row, FILE_COLUMNS);
}

/**
 * Create a file repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns FileRepository implementation
 */
export function createFileRepository(db: RawDb): FileRepository {
  return {
    async findById(id: string): Promise<FileRecord | null> {
      const result = await db.queryOne(select(FILES_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformFileRecord(result) : null;
    },

    async findByUserId(userId: string, limit = 100): Promise<FileRecord[]> {
      const results = await db.query(
        select(FILES_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformFileRecord);
    },

    async findByTenantId(tenantId: string, limit = 100): Promise<FileRecord[]> {
      const results = await db.query(
        select(FILES_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformFileRecord);
    },

    async create(data: NewFileRecord): Promise<FileRecord> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, FILE_COLUMNS);
      const result = await db.queryOne(
        insert(FILES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create file record');
      }
      return transformFileRecord(result);
    },

    async update(id: string, data: UpdateFileRecord): Promise<FileRecord | null> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, FILE_COLUMNS);
      const result = await db.queryOne(
        update(FILES_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformFileRecord(result) : null;
    },

    async delete(id: string): Promise<boolean> {
      const count = await db.execute(deleteFrom(FILES_TABLE).where(eq('id', id)).toSql());
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(FILES_TABLE).where(eq('user_id', userId)).toSql());
    },
  };
}

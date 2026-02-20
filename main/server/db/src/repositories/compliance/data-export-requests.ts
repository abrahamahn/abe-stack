// main/server/db/src/repositories/compliance/data-export-requests.ts
/**
 * Data Export Requests Repository (Functional)
 *
 * Data access layer for the data_export_requests table.
 * Tracks GDPR data export and deletion request workflows.
 *
 * @module
 */

import { and, deleteFrom, eq, lt, ne, select, insert, update } from '../../builder/index';
import {
  type DataExportRequest,
  type DataExportStatus,
  type NewDataExportRequest,
  type UpdateDataExportRequest,
  DATA_EXPORT_REQUEST_COLUMNS,
  DATA_EXPORT_REQUESTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Data Export Request Repository Interface
// ============================================================================

/**
 * Functional repository for data export request operations.
 */
export interface DataExportRequestRepository {
  /**
   * Create a new data export request.
   *
   * @param data - Request data
   * @returns Created request
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewDataExportRequest): Promise<DataExportRequest>;

  /**
   * Find a data export request by ID.
   *
   * @param id - Request ID
   * @returns Request or null if not found
   * @complexity O(1)
   */
  findById(id: string): Promise<DataExportRequest | null>;

  /**
   * List all data export requests for a user.
   *
   * @param userId - User ID
   * @returns Array of requests (ordered by created_at DESC)
   * @complexity O(n) where n is number of requests
   */
  findByUserId(userId: string): Promise<DataExportRequest[]>;

  /**
   * Update a data export request.
   *
   * @param id - Request ID
   * @param data - Fields to update
   * @returns Updated request or null if not found
   * @complexity O(1)
   */
  update(id: string, data: UpdateDataExportRequest): Promise<DataExportRequest | null>;

  /**
   * Update the status of a data export request.
   * Convenience method for status transitions.
   *
   * @param id - Request ID
   * @param status - New status
   * @returns Updated request or null if not found
   * @complexity O(1)
   */
  updateStatus(id: string, status: DataExportStatus): Promise<DataExportRequest | null>;

  /**
   * Delete expired requests (for daily cleanup task).
   *
   * @returns Number of deleted requests
   * @complexity O(n) where n is number of expired non-completed requests
   */
  deleteExpired(): Promise<number>;
}

// ============================================================================
// Data Export Request Repository Implementation
// ============================================================================

/**
 * Transform raw database row to DataExportRequest type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed DataExportRequest object
 * @complexity O(n) where n is number of columns
 */
function transformRequest(row: Record<string, unknown>): DataExportRequest {
  const result = toCamelCase<DataExportRequest>(row, DATA_EXPORT_REQUEST_COLUMNS);
  // Parse JSONB metadata
  if (typeof result.metadata === 'string') {
    result.metadata = JSON.parse(result.metadata) as Record<string, unknown>;
  }
  return result;
}

/**
 * Create a data export request repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns DataExportRequestRepository implementation
 */
export function createDataExportRequestRepository(db: RawDb): DataExportRequestRepository {
  return {
    async create(data: NewDataExportRequest): Promise<DataExportRequest> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        DATA_EXPORT_REQUEST_COLUMNS,
      );
      // Stringify JSONB metadata
      if (snakeData['metadata'] !== undefined) {
        snakeData['metadata'] = JSON.stringify(snakeData['metadata']);
      }
      const result = await db.queryOne(
        insert(DATA_EXPORT_REQUESTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create data export request');
      }
      return transformRequest(result);
    },

    async findById(id: string): Promise<DataExportRequest | null> {
      const result = await db.queryOne(
        select(DATA_EXPORT_REQUESTS_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? transformRequest(result) : null;
    },

    async findByUserId(userId: string): Promise<DataExportRequest[]> {
      const rows = await db.query(
        select(DATA_EXPORT_REQUESTS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return rows.map(transformRequest);
    },

    async update(id: string, data: UpdateDataExportRequest): Promise<DataExportRequest | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        DATA_EXPORT_REQUEST_COLUMNS,
      );
      // Stringify JSONB metadata
      if (snakeData['metadata'] !== undefined) {
        snakeData['metadata'] = JSON.stringify(snakeData['metadata']);
      }
      const result = await db.queryOne(
        update(DATA_EXPORT_REQUESTS_TABLE)
          .set(snakeData)
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformRequest(result) : null;
    },

    async updateStatus(id: string, status: DataExportStatus): Promise<DataExportRequest | null> {
      const result = await db.queryOne(
        update(DATA_EXPORT_REQUESTS_TABLE)
          .set({ ['status']: status })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformRequest(result) : null;
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(DATA_EXPORT_REQUESTS_TABLE)
          .where(and(lt('expires_at', new Date()), ne('status', 'completed')))
          .toSql(),
      );
    },
  };
}

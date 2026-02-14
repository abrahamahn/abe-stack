// main/server/db/src/repositories/email/email-log.ts
/**
 * Email Log Repository (Functional)
 *
 * Data access layer for the email_log table.
 * Tracks email delivery attempts and status. Append-only.
 *
 * @module
 */

import { eq, select, insert } from '../../builder/index';
import {
  type EmailLog,
  type NewEmailLog,
  EMAIL_LOG_COLUMNS,
  EMAIL_LOG_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Email Log Repository Interface
// ============================================================================

/**
 * Functional repository for email log operations.
 * Append-only — no update or delete methods.
 */
export interface EmailLogRepository {
  /**
   * Find an email log entry by ID.
   *
   * @param id - Log entry UUID
   * @returns Log entry or null if not found
   * @complexity O(1)
   */
  findById(id: string): Promise<EmailLog | null>;

  /**
   * Find email log entries for a user.
   *
   * @param userId - The user ID
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of log entries, most recent first
   * @complexity O(n) where n is result count
   */
  findByUserId(userId: string, limit?: number): Promise<EmailLog[]>;

  /**
   * Find email log entries by recipient address.
   *
   * @param recipient - Email address
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of log entries, most recent first
   * @complexity O(n) where n is result count
   */
  findByRecipient(recipient: string, limit?: number): Promise<EmailLog[]>;

  /**
   * Find recent email log entries across all recipients.
   *
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of log entries, most recent first
   * @complexity O(n) where n is result count
   */
  findRecent(limit?: number): Promise<EmailLog[]>;

  /**
   * Create a new email log entry.
   *
   * @param data - Log entry data
   * @returns Created log entry
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewEmailLog): Promise<EmailLog>;
}

// ============================================================================
// Email Log Repository Implementation
// ============================================================================

/**
 * Transform raw database row to EmailLog type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed EmailLog object
 * @complexity O(n) where n is number of columns
 */
function transformEmailLog(row: Record<string, unknown>): EmailLog {
  return toCamelCase<EmailLog>(row, EMAIL_LOG_COLUMNS);
}

/**
 * Create an email log repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns EmailLogRepository implementation
 */
export function createEmailLogRepository(db: RawDb): EmailLogRepository {
  return {
    async findById(id: string): Promise<EmailLog | null> {
      const result = await db.queryOne(select(EMAIL_LOG_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformEmailLog(result) : null;
    },

    async findByUserId(userId: string, limit = 100): Promise<EmailLog[]> {
      const results = await db.query(
        select(EMAIL_LOG_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformEmailLog);
    },

    async findByRecipient(recipient: string, limit = 100): Promise<EmailLog[]> {
      const results = await db.query(
        select(EMAIL_LOG_TABLE)
          .where(eq('recipient', recipient))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformEmailLog);
    },

    async findRecent(limit = 100): Promise<EmailLog[]> {
      const results = await db.query(
        select(EMAIL_LOG_TABLE).orderBy('created_at', 'desc').limit(limit).toSql(),
      );
      return results.map(transformEmailLog);
    },

    async create(data: NewEmailLog): Promise<EmailLog> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, EMAIL_LOG_COLUMNS);
      const result = await db.queryOne(
        insert(EMAIL_LOG_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email log entry');
      }
      return transformEmailLog(result);
    },
  };
}

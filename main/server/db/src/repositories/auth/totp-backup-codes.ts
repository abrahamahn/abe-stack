// main/server/db/src/repositories/auth/totp-backup-codes.ts
/**
 * TOTP Backup Codes Repository (Functional)
 *
 * Data access layer for the totp_backup_codes table.
 * Backup codes are single-use recovery codes for 2FA.
 *
 * @module
 */

import { and, eq, isNull, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewTotpBackupCode,
  type TotpBackupCode,
  TOTP_BACKUP_CODE_COLUMNS,
  TOTP_BACKUP_CODES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// TOTP Backup Code Repository Interface
// ============================================================================

/**
 * Functional repository for TOTP backup code operations.
 */
export interface TotpBackupCodeRepository {
  /**
   * Create a new backup code.
   *
   * @param data - Backup code data (userId + codeHash)
   * @returns Created backup code
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewTotpBackupCode): Promise<TotpBackupCode>;

  /**
   * Find all unused backup codes for a user.
   *
   * @param userId - User ID
   * @returns Array of unused backup codes
   * @complexity O(n) where n is number of unused codes (max 10)
   */
  findUnusedByUserId(userId: string): Promise<TotpBackupCode[]>;

  /**
   * Mark a backup code as used by setting used_at.
   *
   * @param id - Backup code ID
   * @returns Updated backup code or null if not found
   * @complexity O(1)
   */
  markAsUsed(id: string): Promise<TotpBackupCode | null>;

  /**
   * Delete all backup codes for a user.
   * Used when regenerating codes or disabling TOTP.
   *
   * @param userId - User ID
   * @returns Number of deleted codes
   * @complexity O(n) where n is number of codes (max 10)
   */
  deleteByUserId(userId: string): Promise<number>;
}

// ============================================================================
// TOTP Backup Code Repository Implementation
// ============================================================================

/**
 * Transform raw database row to TotpBackupCode type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed TotpBackupCode object
 * @complexity O(n) where n is number of columns
 */
function transformBackupCode(row: Record<string, unknown>): TotpBackupCode {
  return toCamelCase<TotpBackupCode>(row, TOTP_BACKUP_CODE_COLUMNS);
}

/**
 * Create a TOTP backup code repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns TotpBackupCodeRepository implementation
 */
export function createTotpBackupCodeRepository(db: RawDb): TotpBackupCodeRepository {
  return {
    async create(data: NewTotpBackupCode): Promise<TotpBackupCode> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        TOTP_BACKUP_CODE_COLUMNS,
      );
      const result = await db.queryOne(
        insert(TOTP_BACKUP_CODES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create TOTP backup code');
      }
      return transformBackupCode(result);
    },

    async findUnusedByUserId(userId: string): Promise<TotpBackupCode[]> {
      const rows = await db.query(
        select(TOTP_BACKUP_CODES_TABLE)
          .where(and(eq('user_id', userId), isNull('used_at')))
          .toSql(),
      );
      return rows.map(transformBackupCode);
    },

    async markAsUsed(id: string): Promise<TotpBackupCode | null> {
      const result = await db.queryOne(
        update(TOTP_BACKUP_CODES_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformBackupCode(result) : null;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(TOTP_BACKUP_CODES_TABLE).where(eq('user_id', userId)).toSql());
    },
  };
}

// backend/db/src/repositories/auth/password-reset-tokens.ts
/**
 * Password Reset Tokens Repository (Functional)
 *
 * Data access layer for the password_reset_tokens table.
 *
 * @module
 */

import { and, eq, gt, isNull, lt, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewPasswordResetToken,
  type PasswordResetToken,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Password Reset Token Repository Interface
// ============================================================================

/**
 * Functional repository for password reset token operations
 */
export interface PasswordResetTokenRepository {
  /**
   * Find a valid (non-expired, unused) token by its hash
   * @param tokenHash - The SHA-256 hash of the token
   * @returns The token or null if not found/expired/used
   */
  findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null>;

  /**
   * Create a new password reset token
   * @param data - The token data to insert
   * @returns The created token
   * @throws Error if insert fails
   */
  create(data: NewPasswordResetToken): Promise<PasswordResetToken>;

  /**
   * Mark a token as used
   * @param id - The token ID to mark
   * @returns The updated token or null if not found
   */
  markAsUsed(id: string): Promise<PasswordResetToken | null>;

  /**
   * Delete expired tokens for a specific user
   * @param userId - The user whose expired tokens to delete
   * @returns Number of deleted tokens
   */
  deleteExpiredByUserId(userId: string): Promise<number>;
}

// ============================================================================
// Password Reset Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to PasswordResetToken type
 * @param row - Raw database row with snake_case keys
 * @returns Typed PasswordResetToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): PasswordResetToken {
  return toCamelCase<PasswordResetToken>(row, PASSWORD_RESET_TOKEN_COLUMNS);
}

/**
 * Create a password reset token repository bound to a database connection
 * @param db - The raw database client
 * @returns PasswordResetTokenRepository implementation
 */
export function createPasswordResetTokenRepository(db: RawDb): PasswordResetTokenRepository {
  return {
    async findValidByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
      const result = await db.queryOne(
        select(PASSWORD_RESET_TOKENS_TABLE)
          .where(and(eq('token_hash', tokenHash), gt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async create(data: NewPasswordResetToken): Promise<PasswordResetToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        PASSWORD_RESET_TOKEN_COLUMNS,
      );
      const result = await db.queryOne(
        insert(PASSWORD_RESET_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create password reset token');
      }
      return transformToken(result);
    },

    async markAsUsed(id: string): Promise<PasswordResetToken | null> {
      const result = await db.queryOne(
        update(PASSWORD_RESET_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async deleteExpiredByUserId(userId: string): Promise<number> {
      return db.execute(
        deleteFrom(PASSWORD_RESET_TOKENS_TABLE)
          .where(and(eq('user_id', userId), lt('expires_at', new Date())))
          .toSql(),
      );
    },
  };
}

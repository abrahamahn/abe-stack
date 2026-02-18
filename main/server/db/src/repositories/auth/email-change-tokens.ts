// main/server/db/src/repositories/auth/email-change-tokens.ts
/**
 * Email Change Tokens Repository (Functional)
 *
 * Data access layer for the email_change_tokens table.
 * Tracks pending email change requests with verification tokens.
 *
 * @module
 */

import { and, deleteFrom, eq, isNull, lt, select, insert, update } from '../../builder/index';
import {
  type EmailChangeToken,
  type NewEmailChangeToken,
  EMAIL_CHANGE_TOKEN_COLUMNS,
  EMAIL_CHANGE_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Email Change Token Repository Interface
// ============================================================================

/**
 * Functional repository for email change token operations.
 */
export interface EmailChangeTokenRepository {
  /**
   * Create a new email change token.
   *
   * @param data - Token data (userId, newEmail, tokenHash, expiresAt)
   * @returns Created token
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewEmailChangeToken): Promise<EmailChangeToken>;

  /**
   * Find a token by its hash.
   *
   * @param tokenHash - The hashed token value
   * @returns Token or null if not found
   * @complexity O(1)
   */
  findByTokenHash(tokenHash: string): Promise<EmailChangeToken | null>;

  /**
   * Mark a token as used by setting used_at.
   *
   * @param id - Token ID
   * @returns Updated token or null if not found
   * @complexity O(1)
   */
  markAsUsed(id: string): Promise<EmailChangeToken | null>;

  /**
   * Invalidate all pending (unused) tokens for a user.
   * Called before creating a new email change request to prevent stacking.
   *
   * @param userId - User ID
   * @returns Number of invalidated tokens
   * @complexity O(n) where n is number of pending tokens (typically 0-1)
   */
  invalidateForUser(userId: string): Promise<number>;

  /**
   * Delete expired, unused tokens (for daily cleanup task).
   *
   * @returns Number of deleted tokens
   * @complexity O(n) where n is number of expired unused tokens
   */
  deleteExpired(): Promise<number>;
}

// ============================================================================
// Email Change Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to EmailChangeToken type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed EmailChangeToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): EmailChangeToken {
  return toCamelCase<EmailChangeToken>(row, EMAIL_CHANGE_TOKEN_COLUMNS);
}

/**
 * Create an email change token repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns EmailChangeTokenRepository implementation
 */
export function createEmailChangeTokenRepository(db: RawDb): EmailChangeTokenRepository {
  return {
    async create(data: NewEmailChangeToken): Promise<EmailChangeToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        EMAIL_CHANGE_TOKEN_COLUMNS,
      );
      const result = await db.queryOne(
        insert(EMAIL_CHANGE_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email change token');
      }
      return transformToken(result);
    },

    async findByTokenHash(tokenHash: string): Promise<EmailChangeToken | null> {
      const result = await db.queryOne(
        select(EMAIL_CHANGE_TOKENS_TABLE).where(eq('token_hash', tokenHash)).toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async markAsUsed(id: string): Promise<EmailChangeToken | null> {
      const result = await db.queryOne(
        update(EMAIL_CHANGE_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async invalidateForUser(userId: string): Promise<number> {
      const { text, values } = update(EMAIL_CHANGE_TOKENS_TABLE)
        .set({ ['used_at']: new Date() })
        .where(and(eq('user_id', userId), isNull('used_at')))
        .toSql();
      return db.execute({ text, values });
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(EMAIL_CHANGE_TOKENS_TABLE)
          .where(and(lt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
    },
  };
}

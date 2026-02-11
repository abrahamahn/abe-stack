// src/server/db/src/repositories/auth/email-change-revert-tokens.ts
/**
 * Email Change Revert Tokens Repository (Functional)
 *
 * Data access layer for the email_change_revert_tokens table.
 * Tracks reversion tokens for "This wasn't me" email change flows.
 *
 * @module
 */

import { and, eq, isNull, lt, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type EmailChangeRevertToken,
  type NewEmailChangeRevertToken,
  EMAIL_CHANGE_REVERT_TOKEN_COLUMNS,
  EMAIL_CHANGE_REVERT_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Email Change Revert Token Repository Interface
// ============================================================================

/**
 * Functional repository for email change revert token operations.
 */
export interface EmailChangeRevertTokenRepository {
  /**
   * Create a new email change revert token.
   *
   * @param data - Token data (userId, oldEmail, newEmail, tokenHash, expiresAt)
   * @returns Created token
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewEmailChangeRevertToken): Promise<EmailChangeRevertToken>;

  /**
   * Find a token by its hash.
   *
   * @param tokenHash - The hashed token value
   * @returns Token or null if not found
   * @complexity O(1)
   */
  findByTokenHash(tokenHash: string): Promise<EmailChangeRevertToken | null>;

  /**
   * Mark a token as used by setting used_at.
   *
   * @param id - Token ID
   * @returns Updated token or null if not found
   * @complexity O(1)
   */
  markAsUsed(id: string): Promise<EmailChangeRevertToken | null>;

  /**
   * Invalidate all pending (unused) tokens for a user.
   * Called before creating a new revert token to prevent stacking.
   *
   * @param userId - User ID
   * @returns Number of invalidated tokens
   * @complexity O(n) where n is number of pending tokens (typically 0-1)
   */
  invalidateForUser(userId: string): Promise<number>;

  /**
   * Delete all expired tokens globally.
   *
   * @returns Number of deleted tokens
   * @complexity O(n) where n is number of expired tokens
   */
  deleteExpired(): Promise<number>;
}

// ============================================================================
// Email Change Revert Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to EmailChangeRevertToken type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed EmailChangeRevertToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): EmailChangeRevertToken {
  return toCamelCase<EmailChangeRevertToken>(row, EMAIL_CHANGE_REVERT_TOKEN_COLUMNS);
}

/**
 * Create an email change revert token repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns EmailChangeRevertTokenRepository implementation
 */
export function createEmailChangeRevertTokenRepository(
  db: RawDb,
): EmailChangeRevertTokenRepository {
  return {
    async create(data: NewEmailChangeRevertToken): Promise<EmailChangeRevertToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        EMAIL_CHANGE_REVERT_TOKEN_COLUMNS,
      );
      const result = await db.queryOne(
        insert(EMAIL_CHANGE_REVERT_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email change revert token');
      }
      return transformToken(result);
    },

    async findByTokenHash(tokenHash: string): Promise<EmailChangeRevertToken | null> {
      const result = await db.queryOne(
        select(EMAIL_CHANGE_REVERT_TOKENS_TABLE).where(eq('token_hash', tokenHash)).toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async markAsUsed(id: string): Promise<EmailChangeRevertToken | null> {
      const result = await db.queryOne(
        update(EMAIL_CHANGE_REVERT_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async invalidateForUser(userId: string): Promise<number> {
      const { text, values } = update(EMAIL_CHANGE_REVERT_TOKENS_TABLE)
        .set({ ['used_at']: new Date() })
        .where(and(eq('user_id', userId), isNull('used_at')))
        .toSql();
      return db.execute({ text, values });
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(EMAIL_CHANGE_REVERT_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },
  };
}

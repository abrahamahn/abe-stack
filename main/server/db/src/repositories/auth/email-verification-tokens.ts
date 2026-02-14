// main/server/db/src/repositories/auth/email-verification-tokens.ts
/**
 * Email Verification Tokens Repository (Functional)
 *
 * Data access layer for the email_verification_tokens table.
 *
 * @module
 */

import { and, eq, gt, isNull, lt, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type EmailVerificationToken,
  type NewEmailVerificationToken,
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Email Verification Token Repository Interface
// ============================================================================

/**
 * Functional repository for email verification token operations
 */
export interface EmailVerificationTokenRepository {
  /**
   * Find a valid (non-expired, unused) token by its hash
   * @param tokenHash - The SHA-256 hash of the token
   * @returns The token or null if not found/expired/used
   */
  findValidByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null>;

  /**
   * Create a new email verification token
   * @param data - The token data to insert
   * @returns The created token
   * @throws Error if insert fails
   */
  create(data: NewEmailVerificationToken): Promise<EmailVerificationToken>;

  /**
   * Mark a token as used
   * @param id - The token ID to mark
   * @returns The updated token or null if not found
   */
  markAsUsed(id: string): Promise<EmailVerificationToken | null>;

  /**
   * Delete all expired tokens globally
   * @returns Number of deleted tokens
   */
  deleteExpired(): Promise<number>;
}

// ============================================================================
// Email Verification Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to EmailVerificationToken type
 * @param row - Raw database row with snake_case keys
 * @returns Typed EmailVerificationToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): EmailVerificationToken {
  return toCamelCase<EmailVerificationToken>(row, EMAIL_VERIFICATION_TOKEN_COLUMNS);
}

/**
 * Create an email verification token repository bound to a database connection
 * @param db - The raw database client
 * @returns EmailVerificationTokenRepository implementation
 */
export function createEmailVerificationTokenRepository(
  db: RawDb,
): EmailVerificationTokenRepository {
  return {
    async findValidByTokenHash(tokenHash: string): Promise<EmailVerificationToken | null> {
      const result = await db.queryOne(
        select(EMAIL_VERIFICATION_TOKENS_TABLE)
          .where(and(eq('token_hash', tokenHash), gt('expires_at', new Date()), isNull('used_at')))
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async create(data: NewEmailVerificationToken): Promise<EmailVerificationToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        EMAIL_VERIFICATION_TOKEN_COLUMNS,
      );
      const result = await db.queryOne(
        insert(EMAIL_VERIFICATION_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create email verification token');
      }
      return transformToken(result);
    },

    async markAsUsed(id: string): Promise<EmailVerificationToken | null> {
      const result = await db.queryOne(
        update(EMAIL_VERIFICATION_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(EMAIL_VERIFICATION_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql(),
      );
    },
  };
}

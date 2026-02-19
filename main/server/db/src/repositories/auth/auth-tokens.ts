// main/server/db/src/repositories/auth/auth-tokens.ts
/**
 * Auth Tokens Repository (Functional)
 *
 * Unified data access layer for the auth_tokens table.
 * Handles password_reset, email_verification, email_change,
 * email_change_revert, and magic_link token flows via a type discriminator.
 *
 * @module
 */

import { and, eq, gt, isNull, lt, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type AuthToken,
  type AuthTokenType,
  type NewAuthToken,
  AUTH_TOKEN_COLUMNS,
  AUTH_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Auth Token Repository Interface
// ============================================================================

/**
 * Functional repository for unified auth token operations.
 * All token types (password_reset, email_verification, email_change,
 * email_change_revert, magic_link) share this interface.
 */
export interface AuthTokenRepository {
  /**
   * Create a new auth token
   * @param data - Token data including type discriminator
   * @returns The created token
   * @throws Error if insert fails
   */
  create(data: NewAuthToken): Promise<AuthToken>;

  /**
   * Find a valid (unused AND not expired) token by type and hash
   * @param type - The token type discriminator
   * @param tokenHash - SHA-256 hash of the raw token
   * @returns The token or null if not found, used, or expired
   */
  findValidByTokenHash(type: AuthTokenType, tokenHash: string): Promise<AuthToken | null>;

  /**
   * Find a token by type and hash regardless of used/expired state.
   * Used for post-use lookups (e.g. email-change revert confirmation).
   * @param type - The token type discriminator
   * @param tokenHash - SHA-256 hash of the raw token
   * @returns The token or null if not found
   */
  findByTokenHash(type: AuthTokenType, tokenHash: string): Promise<AuthToken | null>;

  /**
   * Mark a token as used (consumed)
   * @param id - The token ID
   * @returns The updated token or null if not found
   */
  markAsUsed(id: string): Promise<AuthToken | null>;

  /**
   * Invalidate all unused tokens of a given type for a user.
   * Used to cancel previous tokens before issuing a new one.
   * @param type - The token type to invalidate
   * @param userId - The user whose tokens to invalidate
   * @returns Number of tokens invalidated
   */
  invalidateForUser(type: AuthTokenType, userId: string): Promise<number>;

  /**
   * Delete expired tokens of a given type for a user.
   * @param type - The token type
   * @param userId - The user whose expired tokens to delete
   * @returns Number of deleted tokens
   */
  deleteExpiredByUser(type: AuthTokenType, userId: string): Promise<number>;

  /**
   * Count recent magic_link tokens sent to an email address (rate limiting).
   * @param email - The target email address
   * @param since - Only count tokens created after this date
   * @returns Number of recent tokens
   */
  countRecentByEmail(email: string, since: Date): Promise<number>;

  /**
   * Count recent magic_link tokens sent from an IP address (rate limiting).
   * @param ipAddress - The originating IP address
   * @param since - Only count tokens created after this date
   * @returns Number of recent tokens
   */
  countRecentByIp(ipAddress: string, since: Date): Promise<number>;

  /**
   * Delete all expired tokens across all types (scheduled cleanup task).
   * @returns Number of deleted tokens
   */
  deleteExpired(): Promise<number>;
}

// ============================================================================
// Auth Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to AuthToken type
 * @param row - Raw database row with snake_case keys
 * @returns Typed AuthToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): AuthToken {
  return toCamelCase<AuthToken>(row, AUTH_TOKEN_COLUMNS);
}

/**
 * Create an auth token repository bound to a database connection
 * @param db - The raw database client
 * @returns AuthTokenRepository implementation
 */
export function createAuthTokenRepository(db: RawDb): AuthTokenRepository {
  return {
    async create(data: NewAuthToken): Promise<AuthToken> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, AUTH_TOKEN_COLUMNS);
      const result = await db.queryOne(
        insert(AUTH_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create auth token');
      }
      return transformToken(result);
    },

    async findValidByTokenHash(type: AuthTokenType, tokenHash: string): Promise<AuthToken | null> {
      const result = await db.queryOne(
        select(AUTH_TOKENS_TABLE)
          .where(
            and(
              eq('type', type),
              eq('token_hash', tokenHash),
              isNull('used_at'),
              gt('expires_at', new Date()),
            ),
          )
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async findByTokenHash(type: AuthTokenType, tokenHash: string): Promise<AuthToken | null> {
      const result = await db.queryOne(
        select(AUTH_TOKENS_TABLE)
          .where(and(eq('type', type), eq('token_hash', tokenHash)))
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async markAsUsed(id: string): Promise<AuthToken | null> {
      const result = await db.queryOne(
        update(AUTH_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },

    async invalidateForUser(type: AuthTokenType, userId: string): Promise<number> {
      return db.execute(
        update(AUTH_TOKENS_TABLE)
          .set({ ['used_at']: new Date() })
          .where(and(eq('type', type), eq('user_id', userId), isNull('used_at')))
          .toSql(),
      );
    },

    async deleteExpiredByUser(type: AuthTokenType, userId: string): Promise<number> {
      return db.execute(
        deleteFrom(AUTH_TOKENS_TABLE)
          .where(and(eq('type', type), eq('user_id', userId), lt('expires_at', new Date())))
          .toSql(),
      );
    },

    async countRecentByEmail(email: string, since: Date): Promise<number> {
      const result = await db.queryOne(
        select(AUTH_TOKENS_TABLE)
          .columns('COUNT(*)::int as count')
          .where(and(eq('type', 'magic_link'), eq('email', email), gt('created_at', since)))
          .toSql(),
      );
      const count = result?.['count'];
      return typeof count === 'number' ? count : 0;
    },

    async countRecentByIp(ipAddress: string, since: Date): Promise<number> {
      const result = await db.queryOne(
        select(AUTH_TOKENS_TABLE)
          .columns('COUNT(*)::int as count')
          .where(
            and(eq('type', 'magic_link'), eq('ip_address', ipAddress), gt('created_at', since)),
          )
          .toSql(),
      );
      const count = result?.['count'];
      return typeof count === 'number' ? count : 0;
    },

    async deleteExpired(): Promise<number> {
      return db.execute(deleteFrom(AUTH_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql());
    },
  };
}

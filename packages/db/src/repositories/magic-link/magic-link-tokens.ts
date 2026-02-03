// packages/db/src/repositories/magic-link/magic-link-tokens.ts
/**
 * Magic Link Tokens Repository (Functional)
 *
 * Data access layer for the magic_link_tokens table.
 * Supports passwordless authentication via email-based magic links.
 *
 * @module
 */

import { and, eq, gt, isNull, lt, select, insert, deleteFrom } from '../../builder/index';
import {
  type MagicLinkToken,
  type NewMagicLinkToken,
  MAGIC_LINK_TOKEN_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Magic Link Token Repository Interface
// ============================================================================

/**
 * Functional repository for magic link token operations
 */
export interface MagicLinkTokenRepository {
  /**
   * Count recent tokens created for an email address
   * @param email - The email to check
   * @param since - Only count tokens created after this date
   * @returns Number of recent tokens
   */
  countRecentByEmail(email: string, since: Date): Promise<number>;

  /**
   * Count recent tokens created from an IP address
   * @param ipAddress - The IP address to check
   * @param since - Only count tokens created after this date
   * @returns Number of recent tokens
   */
  countRecentByIp(ipAddress: string, since: Date): Promise<number>;

  /**
   * Create a new magic link token
   * @param data - The token data to insert
   * @returns The created token
   * @throws Error if insert fails
   */
  create(data: NewMagicLinkToken): Promise<MagicLinkToken>;

  /**
   * Delete all expired tokens
   * @returns Number of deleted tokens
   */
  deleteExpired(): Promise<number>;

  /**
   * Find a valid (non-expired, unused) token by its hash
   * @param tokenHash - The SHA-256 hash of the token
   * @returns The token or null if not found/expired/used
   */
  findValidByTokenHash(tokenHash: string): Promise<MagicLinkToken | null>;
}

// ============================================================================
// Magic Link Token Repository Implementation
// ============================================================================

/**
 * Transform raw database row to MagicLinkToken type
 * @param row - Raw database row with snake_case keys
 * @returns Typed MagicLinkToken object
 * @complexity O(n) where n is number of columns
 */
function transformToken(row: Record<string, unknown>): MagicLinkToken {
  return toCamelCase<MagicLinkToken>(row, MAGIC_LINK_TOKEN_COLUMNS);
}

/**
 * Create a magic link token repository bound to a database connection
 * @param db - The raw database client
 * @returns MagicLinkTokenRepository implementation
 */
export function createMagicLinkTokenRepository(db: RawDb): MagicLinkTokenRepository {
  return {
    async countRecentByEmail(email: string, since: Date): Promise<number> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .columns('COUNT(*)::int as count')
          .where(and(eq('email', email), gt('created_at', since)))
          .toSql(),
      );
      return (result?.['count'] as number) ?? 0;
    },

    async countRecentByIp(ipAddress: string, since: Date): Promise<number> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .columns('COUNT(*)::int as count')
          .where(and(eq('ip_address', ipAddress), gt('created_at', since)))
          .toSql(),
      );
      return (result?.['count'] as number) ?? 0;
    },

    async create(data: NewMagicLinkToken): Promise<MagicLinkToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        MAGIC_LINK_TOKEN_COLUMNS,
      );
      const result = await db.queryOne<Record<string, unknown>>(
        insert(MAGIC_LINK_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create magic link token');
      }
      return transformToken(result);
    },

    async deleteExpired(): Promise<number> {
      return db.execute(
        deleteFrom(MAGIC_LINK_TOKENS_TABLE)
          .where(lt('expires_at', new Date()))
          .toSql(),
      );
    },

    async findValidByTokenHash(tokenHash: string): Promise<MagicLinkToken | null> {
      const result = await db.queryOne<Record<string, unknown>>(
        select(MAGIC_LINK_TOKENS_TABLE)
          .where(
            and(
              eq('token_hash', tokenHash),
              gt('expires_at', new Date()),
              isNull('used_at'),
            ),
          )
          .toSql(),
      );
      return result !== null ? transformToken(result) : null;
    },
  };
}

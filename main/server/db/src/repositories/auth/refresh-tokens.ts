// main/server/db/src/repositories/auth/refresh-tokens.ts
/**
 * Refresh Tokens Repository (Functional)
 *
 * Data access layer for the refresh_tokens table.
 * Family metadata (ip, ua, timestamps) is denormalized into every token row.
 * Family management methods replace the old RefreshTokenFamilyRepository.
 *
 * @module
 */

import { eq, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewRefreshToken,
  type RefreshToken,
  type RefreshTokenFamilyView,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Refresh Token Repository Interface
// ============================================================================

/**
 * Functional repository for refresh token operations.
 * Includes family management methods that replace RefreshTokenFamilyRepository.
 */
export interface RefreshTokenRepository {
  /**
   * Find a refresh token by its token value
   * @param token - The token string to search for
   * @returns The refresh token or null if not found
   */
  findByToken(token: string): Promise<RefreshToken | null>;

  /**
   * Create a new refresh token
   * @param data - The token data to insert
   * @returns The created refresh token
   * @throws Error if insert fails
   */
  create(data: NewRefreshToken): Promise<RefreshToken>;

  /**
   * Delete a refresh token by its token value
   * @param token - The token string to delete
   * @returns True if a token was deleted
   */
  deleteByToken(token: string): Promise<boolean>;

  /**
   * Delete all refresh tokens for a user
   * @param userId - The user whose tokens to delete
   * @returns Number of tokens deleted
   */
  deleteByUserId(userId: string): Promise<number>;

  // ── Family management (replaces RefreshTokenFamilyRepository) ─────────────

  /**
   * Find all active (non-revoked) token families for a user.
   * Returns one row per family, with the latest expires_at across the family.
   * @param userId - The user ID
   * @returns Array of family views, ordered by family_created_at DESC
   */
  findActiveFamilies(userId: string): Promise<RefreshTokenFamilyView[]>;

  /**
   * Find a specific token family by its ID.
   * @param familyId - The family UUID
   * @returns The family view or null if not found
   */
  findFamilyById(familyId: string): Promise<RefreshTokenFamilyView | null>;

  /**
   * Revoke all tokens in a family (marks them as revoked with a reason).
   * @param familyId - The family UUID to revoke
   * @param reason - The reason for revocation (stored for audit)
   * @returns Number of token rows updated
   */
  revokeFamily(familyId: string, reason: string): Promise<number>;
}

// ============================================================================
// Refresh Token Repository Implementation
// ============================================================================

/**
 * SQL for a per-family projection using DISTINCT ON.
 * Returns one row per family with MAX(expires_at) via window function.
 * Columns are aliased to match RefreshTokenFamilyView after snakeToCamel.
 */
const FAMILY_PROJECTION = `
  SELECT DISTINCT ON (family_id)
    family_id,
    user_id,
    family_ip_address   AS ip_address,
    family_user_agent   AS user_agent,
    family_created_at,
    family_revoked_at,
    family_revoke_reason,
    MAX(expires_at) OVER (PARTITION BY family_id) AS latest_expires_at
  FROM ${REFRESH_TOKENS_TABLE}
`.trim();

/**
 * Transform raw database row to RefreshToken type
 * @param row - Raw database row with snake_case keys
 * @returns Typed RefreshToken object
 * @complexity O(n) where n is number of columns
 */
function transformRefreshToken(row: Record<string, unknown>): RefreshToken {
  return toCamelCase<RefreshToken>(row, REFRESH_TOKEN_COLUMNS);
}

/**
 * Transform raw database row to RefreshTokenFamilyView.
 * Columns are pre-aliased in SQL to match snakeToCamel → camelCase names.
 * @param row - Raw database row from family projection query
 * @returns Typed RefreshTokenFamilyView object
 */
function transformFamilyView(row: Record<string, unknown>): RefreshTokenFamilyView {
  return toCamelCase<RefreshTokenFamilyView>(row);
}

/**
 * Create a refresh token repository bound to a database connection
 * @param db - The raw database client
 * @returns RefreshTokenRepository implementation
 */
export function createRefreshTokenRepository(db: RawDb): RefreshTokenRepository {
  return {
    async findByToken(token: string): Promise<RefreshToken | null> {
      const result = await db.queryOne(
        select(REFRESH_TOKENS_TABLE).where(eq('token', token)).toSql(),
      );
      return result !== null ? transformRefreshToken(result) : null;
    },

    async create(data: NewRefreshToken): Promise<RefreshToken> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        REFRESH_TOKEN_COLUMNS,
      );
      const result = await db.queryOne(
        insert(REFRESH_TOKENS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create refresh token');
      }
      return transformRefreshToken(result);
    },

    async deleteByToken(token: string): Promise<boolean> {
      const count = await db.execute(
        deleteFrom(REFRESH_TOKENS_TABLE).where(eq('token', token)).toSql(),
      );
      return count > 0;
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(eq('user_id', userId)).toSql());
    },

    async findActiveFamilies(userId: string): Promise<RefreshTokenFamilyView[]> {
      const rows = await db.raw(
        `${FAMILY_PROJECTION} WHERE user_id = $1 AND family_revoked_at IS NULL ORDER BY family_id, family_created_at DESC`,
        [userId],
      );
      return rows.map(transformFamilyView);
    },

    async findFamilyById(familyId: string): Promise<RefreshTokenFamilyView | null> {
      const rows = await db.raw(
        `${FAMILY_PROJECTION} WHERE family_id = $1 ORDER BY family_id, family_created_at DESC LIMIT 1`,
        [familyId],
      );
      return rows[0] !== undefined ? transformFamilyView(rows[0]) : null;
    },

    async revokeFamily(familyId: string, reason: string): Promise<number> {
      return db.execute(
        update(REFRESH_TOKENS_TABLE)
          .set({ ['family_revoked_at']: new Date(), ['family_revoke_reason']: reason })
          .where(eq('family_id', familyId))
          .toSql(),
      );
    },
  };
}

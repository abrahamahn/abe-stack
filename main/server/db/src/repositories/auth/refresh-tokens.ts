// main/server/db/src/repositories/auth/refresh-tokens.ts
/**
 * Refresh Tokens Repository (Functional)
 *
 * Data access layer for the refresh_tokens table.
 *
 * @module
 */

import { eq, select, insert, deleteFrom } from '../../builder/index';
import {
  type NewRefreshToken,
  type RefreshToken,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Refresh Token Repository Interface
// ============================================================================

/**
 * Functional repository for refresh token operations
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
}

// ============================================================================
// Refresh Token Repository Implementation
// ============================================================================

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
  };
}

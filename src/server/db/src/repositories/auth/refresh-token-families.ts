// backend/db/src/repositories/auth/refresh-token-families.ts
/**
 * Refresh Token Families Repository (Functional)
 *
 * Data access layer for the refresh_token_families table.
 * Used for token rotation reuse detection.
 *
 * @module
 */

import { and, eq, isNull, select, insert, update } from '../../builder/index';
import {
  type NewRefreshTokenFamily,
  type RefreshTokenFamily,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Refresh Token Family Repository Interface
// ============================================================================

/**
 * Functional repository for refresh token family operations
 */
export interface RefreshTokenFamilyRepository {
  /**
   * Find active (non-revoked) families for a user
   * @param userId - The user ID to search for
   * @returns Array of active token families
   */
  findActiveByUserId(userId: string): Promise<RefreshTokenFamily[]>;

  /**
   * Find a token family by ID
   * @param id - The family ID
   * @returns The token family or null if not found
   */
  findById(id: string): Promise<RefreshTokenFamily | null>;

  /**
   * Create a new token family
   * @param data - The family data to insert
   * @returns The created token family
   * @throws Error if insert fails
   */
  create(data: NewRefreshTokenFamily): Promise<RefreshTokenFamily>;

  /**
   * Revoke a token family
   * @param id - The family ID to revoke
   * @param reason - The reason for revocation
   * @returns The revoked family or null if not found
   */
  revoke(id: string, reason: string): Promise<RefreshTokenFamily | null>;
}

// ============================================================================
// Refresh Token Family Repository Implementation
// ============================================================================

/**
 * Transform raw database row to RefreshTokenFamily type
 * @param row - Raw database row with snake_case keys
 * @returns Typed RefreshTokenFamily object
 * @complexity O(n) where n is number of columns
 */
function transformFamily(row: Record<string, unknown>): RefreshTokenFamily {
  return toCamelCase<RefreshTokenFamily>(row, REFRESH_TOKEN_FAMILY_COLUMNS);
}

/**
 * Create a refresh token family repository bound to a database connection
 * @param db - The raw database client
 * @returns RefreshTokenFamilyRepository implementation
 */
export function createRefreshTokenFamilyRepository(db: RawDb): RefreshTokenFamilyRepository {
  return {
    async findActiveByUserId(userId: string): Promise<RefreshTokenFamily[]> {
      const results = await db.query(
        select(REFRESH_TOKEN_FAMILIES_TABLE)
          .where(and(eq('user_id', userId), isNull('revoked_at')))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformFamily);
    },

    async findById(id: string): Promise<RefreshTokenFamily | null> {
      const result = await db.queryOne(
        select(REFRESH_TOKEN_FAMILIES_TABLE).where(eq('id', id)).toSql(),
      );
      return result !== null ? transformFamily(result) : null;
    },

    async create(data: NewRefreshTokenFamily): Promise<RefreshTokenFamily> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        REFRESH_TOKEN_FAMILY_COLUMNS,
      );
      const result = await db.queryOne(
        insert(REFRESH_TOKEN_FAMILIES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create refresh token family');
      }
      return transformFamily(result);
    },

    async revoke(id: string, reason: string): Promise<RefreshTokenFamily | null> {
      const result = await db.queryOne(
        update(REFRESH_TOKEN_FAMILIES_TABLE)
          .set({ ['revoked_at']: new Date(), ['revoke_reason']: reason })
          .where(eq('id', id))
          .returningAll()
          .toSql(),
      );
      return result !== null ? transformFamily(result) : null;
    },
  };
}

// main/server/db/src/repositories/compliance/user-agreements.ts
/**
 * User Agreements Repository (Functional)
 *
 * Data access layer for the user_agreements table.
 * Append-only repository tracking which users accepted which document versions.
 *
 * @module
 */

import { and, eq, select, insert } from '../../builder/index';
import {
  type NewUserAgreement,
  type UserAgreement,
  USER_AGREEMENT_COLUMNS,
  USER_AGREEMENTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// User Agreement Repository Interface
// ============================================================================

/**
 * Functional repository for user agreement operations (append-only)
 */
export interface UserAgreementRepository {
  /**
   * Record a new user agreement
   * @param data - The agreement data to insert
   * @returns The created agreement
   * @throws Error if insert fails
   */
  create(data: NewUserAgreement): Promise<UserAgreement>;

  /**
   * Find all agreements for a user
   * @param userId - The user ID
   * @returns Array of agreements, most recent first
   */
  findByUserId(userId: string): Promise<UserAgreement[]>;

  /**
   * Find an agreement for a specific user and document
   * @param userId - The user ID
   * @param documentId - The legal document ID
   * @returns The agreement or null if the user hasn't agreed
   */
  findByUserAndDocument(userId: string, documentId: string): Promise<UserAgreement | null>;

  /**
   * Find all agreements for a specific document
   * @param documentId - The legal document ID
   * @returns Array of agreements
   */
  findByDocumentId(documentId: string): Promise<UserAgreement[]>;
}

// ============================================================================
// User Agreement Repository Implementation
// ============================================================================

/**
 * Transform raw database row to UserAgreement type
 * @param row - Raw database row with snake_case keys
 * @returns Typed UserAgreement object
 * @complexity O(n) where n is number of columns
 */
function transformAgreement(row: Record<string, unknown>): UserAgreement {
  return toCamelCase<UserAgreement>(row, USER_AGREEMENT_COLUMNS);
}

/**
 * Create a user agreement repository bound to a database connection
 * @param db - The raw database client
 * @returns UserAgreementRepository implementation
 */
export function createUserAgreementRepository(db: RawDb): UserAgreementRepository {
  return {
    async create(data: NewUserAgreement): Promise<UserAgreement> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USER_AGREEMENT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(USER_AGREEMENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create user agreement');
      }
      return transformAgreement(result);
    },

    async findByUserId(userId: string): Promise<UserAgreement[]> {
      const results = await db.query(
        select(USER_AGREEMENTS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('agreed_at', 'desc')
          .toSql(),
      );
      return results.map(transformAgreement);
    },

    async findByUserAndDocument(userId: string, documentId: string): Promise<UserAgreement | null> {
      const result = await db.queryOne(
        select(USER_AGREEMENTS_TABLE)
          .where(and(eq('user_id', userId), eq('document_id', documentId)))
          .toSql(),
      );
      return result !== null ? transformAgreement(result) : null;
    },

    async findByDocumentId(documentId: string): Promise<UserAgreement[]> {
      const results = await db.query(
        select(USER_AGREEMENTS_TABLE)
          .where(eq('document_id', documentId))
          .orderBy('agreed_at', 'desc')
          .toSql(),
      );
      return results.map(transformAgreement);
    },
  };
}

// src/server/db/src/repositories/compliance/consent-logs.ts
/**
 * Consent Logs Repository (Functional)
 *
 * Data access layer for the consent_logs table.
 * Append-only repository for GDPR consent audit trail.
 *
 * @module
 */

import { and, eq, select, insert } from '../../builder/index';
import {
  type ConsentLog,
  type NewConsentLog,
  CONSENT_LOG_COLUMNS,
  CONSENT_LOGS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Consent Log Repository Interface
// ============================================================================

/**
 * Functional repository for consent log operations (append-only)
 */
export interface ConsentLogRepository {
  /**
   * Record a new consent event (grant or revocation)
   * @param data - The consent log data to insert
   * @returns The created consent log entry
   * @throws Error if insert fails
   */
  create(data: NewConsentLog): Promise<ConsentLog>;

  /**
   * Find all consent logs for a user
   * @param userId - The user ID
   * @returns Array of consent logs, most recent first
   */
  findByUserId(userId: string): Promise<ConsentLog[]>;

  /**
   * Find consent logs for a user and specific consent type
   * @param userId - The user ID
   * @param consentType - The consent type (e.g., "marketing", "analytics")
   * @returns Array of consent logs, most recent first
   */
  findByUserAndType(userId: string, consentType: string): Promise<ConsentLog[]>;

  /**
   * Find the latest consent state for a user and type
   * @param userId - The user ID
   * @param consentType - The consent type
   * @returns The most recent consent log or null
   */
  findLatestByUserAndType(userId: string, consentType: string): Promise<ConsentLog | null>;
}

// ============================================================================
// Consent Log Repository Implementation
// ============================================================================

/**
 * Transform raw database row to ConsentLog type
 * @param row - Raw database row with snake_case keys
 * @returns Typed ConsentLog object
 * @complexity O(n) where n is number of columns
 */
function transformConsentLog(row: Record<string, unknown>): ConsentLog {
  return toCamelCase<ConsentLog>(row, CONSENT_LOG_COLUMNS);
}

/**
 * Create a consent log repository bound to a database connection
 * @param db - The raw database client
 * @returns ConsentLogRepository implementation
 */
export function createConsentLogRepository(db: RawDb): ConsentLogRepository {
  return {
    async create(data: NewConsentLog): Promise<ConsentLog> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        CONSENT_LOG_COLUMNS,
      );
      const result = await db.queryOne(
        insert(CONSENT_LOGS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create consent log');
      }
      return transformConsentLog(result);
    },

    async findByUserId(userId: string): Promise<ConsentLog[]> {
      const results = await db.query(
        select(CONSENT_LOGS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformConsentLog);
    },

    async findByUserAndType(userId: string, consentType: string): Promise<ConsentLog[]> {
      const results = await db.query(
        select(CONSENT_LOGS_TABLE)
          .where(and(eq('user_id', userId), eq('consent_type', consentType)))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformConsentLog);
    },

    async findLatestByUserAndType(userId: string, consentType: string): Promise<ConsentLog | null> {
      const result = await db.queryOne(
        select(CONSENT_LOGS_TABLE)
          .where(and(eq('user_id', userId), eq('consent_type', consentType)))
          .orderBy('created_at', 'desc')
          .limit(1)
          .toSql(),
      );
      return result !== null ? transformConsentLog(result) : null;
    },
  };
}

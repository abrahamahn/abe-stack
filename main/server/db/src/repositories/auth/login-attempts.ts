// main/server/db/src/repositories/auth/login-attempts.ts
/**
 * Login Attempts Repository (Functional)
 *
 * Data access layer for the login_attempts table.
 * Tracks authentication attempts for rate limiting and security monitoring.
 *
 * @module
 */

import { and, eq, gt, lt, select, insert, deleteFrom } from '../../builder/index';
import {
  type LoginAttempt,
  type NewLoginAttempt,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Login Attempt Repository Interface
// ============================================================================

/**
 * Functional repository for login attempt tracking
 */
export interface LoginAttemptRepository {
  /**
   * Record a new login attempt
   * @param data - The login attempt data
   * @returns The created login attempt
   * @throws Error if insert fails
   */
  create(data: NewLoginAttempt): Promise<LoginAttempt>;

  /**
   * Find recent login attempts for an email since a given time
   * @param email - The email to search for
   * @param since - Only return attempts after this date
   * @returns Array of matching login attempts
   */
  findRecentByEmail(email: string, since: Date): Promise<LoginAttempt[]>;

  /**
   * Count recent login attempts from an IP address since a given time
   * @param ipAddress - The IP address to count
   * @param since - Only count attempts after this date
   * @returns Number of attempts
   */
  countRecentByIp(ipAddress: string, since: Date): Promise<number>;

  /**
   * Delete login attempts older than the given cutoff date
   * @param cutoff - ISO date string; attempts with created_at < cutoff are deleted
   * @returns Number of deleted rows
   */
  deleteOlderThan(cutoff: string): Promise<number>;
}

// ============================================================================
// Login Attempt Repository Implementation
// ============================================================================

/**
 * Transform raw database row to LoginAttempt type
 * @param row - Raw database row with snake_case keys
 * @returns Typed LoginAttempt object
 * @complexity O(n) where n is number of columns
 */
function transformLoginAttempt(row: Record<string, unknown>): LoginAttempt {
  return toCamelCase<LoginAttempt>(row, LOGIN_ATTEMPT_COLUMNS);
}

/**
 * Create a login attempt repository bound to a database connection
 * @param db - The raw database client
 * @returns LoginAttemptRepository implementation
 */
export function createLoginAttemptRepository(db: RawDb): LoginAttemptRepository {
  return {
    async create(data: NewLoginAttempt): Promise<LoginAttempt> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        LOGIN_ATTEMPT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(LOGIN_ATTEMPTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create login attempt');
      }
      return transformLoginAttempt(result);
    },

    async findRecentByEmail(email: string, since: Date): Promise<LoginAttempt[]> {
      const results = await db.query(
        select(LOGIN_ATTEMPTS_TABLE)
          .where(and(eq('email', email), gt('created_at', since)))
          .orderBy('created_at', 'desc')
          .toSql(),
      );
      return results.map(transformLoginAttempt);
    },

    async countRecentByIp(ipAddress: string, since: Date): Promise<number> {
      const result = await db.queryOne(
        select(LOGIN_ATTEMPTS_TABLE)
          .columns('COUNT(*)::int as count')
          .where(and(eq('ip_address', ipAddress), gt('created_at', since)))
          .toSql(),
      );
      const count = result?.['count'];
      return typeof count === 'number' ? count : 0;
    },

    async deleteOlderThan(cutoff: string): Promise<number> {
      return db.execute(deleteFrom(LOGIN_ATTEMPTS_TABLE).where(lt('created_at', cutoff)).toSql());
    },
  };
}

// src/server/db/src/repositories/sessions/user-sessions.ts
/**
 * User Sessions Repository (Functional)
 *
 * Data access layer for the user_sessions table.
 * Manages login sessions for device tracking and revocation.
 *
 * @module
 */

import { and, eq, isNull, select, insert, update, deleteFrom } from '../../builder/index';
import {
  type NewUserSession,
  type UpdateUserSession,
  type UserSession,
  USER_SESSION_COLUMNS,
  USER_SESSIONS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// User Session Repository Interface
// ============================================================================

/**
 * Functional repository for user session operations
 */
export interface UserSessionRepository {
  /**
   * Create a new user session
   * @param data - The session data to insert
   * @returns The created session
   * @throws Error if insert fails
   */
  create(data: NewUserSession): Promise<UserSession>;

  /**
   * Find a session by its ID
   * @param id - The session ID
   * @returns The session or null if not found
   */
  findById(id: string): Promise<UserSession | null>;

  /**
   * Find all active (non-revoked) sessions for a user
   * @param userId - The user ID to search for
   * @returns Array of active sessions, most recent first
   */
  findActiveByUserId(userId: string): Promise<UserSession[]>;

  /**
   * Update a session's activity or revocation state
   * @param id - The session ID to update
   * @param data - The fields to update
   * @returns The updated session or null if not found
   */
  update(id: string, data: UpdateUserSession): Promise<UserSession | null>;

  /**
   * Revoke a session by setting revokedAt
   * @param id - The session ID to revoke
   * @returns True if the session was revoked
   */
  revoke(id: string): Promise<boolean>;

  /**
   * Revoke all sessions for a user (e.g., on password change)
   * @param userId - The user ID whose sessions to revoke
   * @returns Number of sessions revoked
   */
  revokeAllByUserId(userId: string): Promise<number>;

  /**
   * Delete expired/revoked sessions for a user
   * @param userId - The user ID whose old sessions to delete
   * @returns Number of sessions deleted
   */
  deleteByUserId(userId: string): Promise<number>;
}

// ============================================================================
// User Session Repository Implementation
// ============================================================================

/**
 * Transform raw database row to UserSession type
 * @param row - Raw database row with snake_case keys
 * @returns Typed UserSession object
 * @complexity O(n) where n is number of columns
 */
function transformSession(row: Record<string, unknown>): UserSession {
  return toCamelCase<UserSession>(row, USER_SESSION_COLUMNS);
}

/**
 * Create a user session repository bound to a database connection
 * @param db - The raw database client
 * @returns UserSessionRepository implementation
 */
export function createUserSessionRepository(db: RawDb): UserSessionRepository {
  return {
    async create(data: NewUserSession): Promise<UserSession> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USER_SESSION_COLUMNS,
      );
      const result = await db.queryOne(
        insert(USER_SESSIONS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create user session');
      }
      return transformSession(result);
    },

    async findById(id: string): Promise<UserSession | null> {
      const result = await db.queryOne(select(USER_SESSIONS_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformSession(result) : null;
    },

    async findActiveByUserId(userId: string): Promise<UserSession[]> {
      const results = await db.query(
        select(USER_SESSIONS_TABLE)
          .where(and(eq('user_id', userId), isNull('revoked_at')))
          .orderBy('last_active_at', 'desc')
          .toSql(),
      );
      return results.map(transformSession);
    },

    async update(id: string, data: UpdateUserSession): Promise<UserSession | null> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        USER_SESSION_COLUMNS,
      );
      const result = await db.queryOne(
        update(USER_SESSIONS_TABLE).set(snakeData).where(eq('id', id)).returningAll().toSql(),
      );
      return result !== null ? transformSession(result) : null;
    },

    async revoke(id: string): Promise<boolean> {
      const count = await db.execute(
        update(USER_SESSIONS_TABLE)
          .set({ revoked_at: new Date() })
          .where(and(eq('id', id), isNull('revoked_at')))
          .toSql(),
      );
      return count > 0;
    },

    async revokeAllByUserId(userId: string): Promise<number> {
      return db.execute(
        update(USER_SESSIONS_TABLE)
          .set({ revoked_at: new Date() })
          .where(and(eq('user_id', userId), isNull('revoked_at')))
          .toSql(),
      );
    },

    async deleteByUserId(userId: string): Promise<number> {
      return db.execute(deleteFrom(USER_SESSIONS_TABLE).where(eq('user_id', userId)).toSql());
    },
  };
}

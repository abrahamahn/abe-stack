// main/server/db/src/repositories/auth/security-events.ts
/**
 * Security Events Repository (Functional)
 *
 * Data access layer for the security_events table.
 * Tracks critical security events for audit trail and monitoring.
 *
 * @module
 */

import { eq, select, insert } from '../../builder/index';
import {
  type NewSecurityEvent,
  type SecurityEvent,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Security Event Repository Interface
// ============================================================================

/**
 * Functional repository for security event operations
 */
export interface SecurityEventRepository {
  /**
   * Record a new security event
   * @param data - The event data to insert
   * @returns The created security event
   * @throws Error if insert fails
   */
  create(data: NewSecurityEvent): Promise<SecurityEvent>;

  /**
   * Find security events for a user
   * @param userId - The user ID to search for
   * @param limit - Maximum number of events to return (default: 100)
   * @returns Array of security events, most recent first
   */
  findByUserId(userId: string, limit?: number): Promise<SecurityEvent[]>;

  /**
   * Find recent security events across all users
   * @param limit - Maximum number of events to return (default: 100)
   * @returns Array of security events, most recent first
   */
  findRecent(limit?: number): Promise<SecurityEvent[]>;
}

// ============================================================================
// Security Event Repository Implementation
// ============================================================================

/**
 * Transform raw database row to SecurityEvent type
 * @param row - Raw database row with snake_case keys
 * @returns Typed SecurityEvent object
 * @complexity O(n) where n is number of columns
 */
function transformSecurityEvent(row: Record<string, unknown>): SecurityEvent {
  return toCamelCase<SecurityEvent>(row, SECURITY_EVENT_COLUMNS);
}

/**
 * Create a security event repository bound to a database connection
 * @param db - The raw database client
 * @returns SecurityEventRepository implementation
 */
export function createSecurityEventRepository(db: RawDb): SecurityEventRepository {
  return {
    async create(data: NewSecurityEvent): Promise<SecurityEvent> {
      const snakeData = toSnakeCase(
        data as unknown as Record<string, unknown>,
        SECURITY_EVENT_COLUMNS,
      );
      const result = await db.queryOne(
        insert(SECURITY_EVENTS_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create security event');
      }
      return transformSecurityEvent(result);
    },

    async findByUserId(userId: string, limit = 100): Promise<SecurityEvent[]> {
      const results = await db.query(
        select(SECURITY_EVENTS_TABLE)
          .where(eq('user_id', userId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformSecurityEvent);
    },

    async findRecent(limit = 100): Promise<SecurityEvent[]> {
      const results = await db.query(
        select(SECURITY_EVENTS_TABLE).orderBy('created_at', 'desc').limit(limit).toSql(),
      );
      return results.map(transformSecurityEvent);
    },
  };
}

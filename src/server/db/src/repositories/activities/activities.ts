// src/server/db/src/repositories/activities/activities.ts
/**
 * Activities Repository (Functional)
 *
 * Data access layer for the activities table.
 * Tracks user-facing activity feed entries ("X did Y on Z" timeline).
 * Append-only — no update or delete methods.
 *
 * @module
 */

import { and, eq, select, insert } from '../../builder/index';
import {
  type Activity,
  type NewActivity,
  ACTIVITY_COLUMNS,
  ACTIVITIES_TABLE,
} from '../../schema/index';
import { toCamelCase, toSnakeCase } from '../../utils';

import type { RawDb } from '../../client';

// ============================================================================
// Activity Repository Interface
// ============================================================================

/**
 * Functional repository for activity feed operations.
 * Append-only — no update or delete methods.
 */
export interface ActivityRepository {
  /**
   * Find an activity entry by ID.
   *
   * @param id - Activity UUID
   * @returns Activity or null if not found
   * @complexity O(1)
   */
  findById(id: string): Promise<Activity | null>;

  /**
   * Find recent activities across all actors.
   *
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of activities, most recent first
   * @complexity O(n) where n is result count
   */
  findRecent(limit?: number): Promise<Activity[]>;

  /**
   * Find activities by actor ID.
   *
   * @param actorId - The actor's user/api-key ID
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of activities, most recent first
   * @complexity O(n) where n is result count
   */
  findByActorId(actorId: string, limit?: number): Promise<Activity[]>;

  /**
   * Find activities for a tenant.
   *
   * @param tenantId - The tenant UUID
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of activities, most recent first
   * @complexity O(n) where n is result count
   */
  findByTenantId(tenantId: string, limit?: number): Promise<Activity[]>;

  /**
   * Find activities for a specific resource.
   *
   * @param resourceType - Resource type (e.g., "project", "document")
   * @param resourceId - Resource identifier
   * @param limit - Maximum number of entries to return (default: 100)
   * @returns Array of activities, most recent first
   * @complexity O(n) where n is result count
   */
  findByResource(resourceType: string, resourceId: string, limit?: number): Promise<Activity[]>;

  /**
   * Create a new activity entry.
   *
   * @param data - Activity data
   * @returns Created activity
   * @throws Error if insert fails
   * @complexity O(1)
   */
  create(data: NewActivity): Promise<Activity>;
}

// ============================================================================
// Activity Repository Implementation
// ============================================================================

/**
 * Transform raw database row to Activity type.
 *
 * @param row - Raw database row with snake_case keys
 * @returns Typed Activity object
 * @complexity O(n) where n is number of columns
 */
function transformActivity(row: Record<string, unknown>): Activity {
  return toCamelCase<Activity>(row, ACTIVITY_COLUMNS);
}

/**
 * Create an activity repository bound to a database connection.
 *
 * @param db - The raw database client
 * @returns ActivityRepository implementation
 */
export function createActivityRepository(db: RawDb): ActivityRepository {
  return {
    async findById(id: string): Promise<Activity | null> {
      const result = await db.queryOne(select(ACTIVITIES_TABLE).where(eq('id', id)).toSql());
      return result !== null ? transformActivity(result) : null;
    },

    async findRecent(limit = 100): Promise<Activity[]> {
      const results = await db.query(
        select(ACTIVITIES_TABLE).orderBy('created_at', 'desc').limit(limit).toSql(),
      );
      return results.map(transformActivity);
    },

    async findByActorId(actorId: string, limit = 100): Promise<Activity[]> {
      const results = await db.query(
        select(ACTIVITIES_TABLE)
          .where(eq('actor_id', actorId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformActivity);
    },

    async findByTenantId(tenantId: string, limit = 100): Promise<Activity[]> {
      const results = await db.query(
        select(ACTIVITIES_TABLE)
          .where(eq('tenant_id', tenantId))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformActivity);
    },

    async findByResource(
      resourceType: string,
      resourceId: string,
      limit = 100,
    ): Promise<Activity[]> {
      const results = await db.query(
        select(ACTIVITIES_TABLE)
          .where(and(eq('resource_type', resourceType), eq('resource_id', resourceId)))
          .orderBy('created_at', 'desc')
          .limit(limit)
          .toSql(),
      );
      return results.map(transformActivity);
    },

    async create(data: NewActivity): Promise<Activity> {
      const snakeData = toSnakeCase(data as unknown as Record<string, unknown>, ACTIVITY_COLUMNS);
      const result = await db.queryOne(
        insert(ACTIVITIES_TABLE).values(snakeData).returningAll().toSql(),
      );
      if (result === null) {
        throw new Error('Failed to create activity');
      }
      return transformActivity(result);
    },
  };
}

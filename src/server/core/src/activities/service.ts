// src/server/core/src/activities/service.ts
/**
 * Activities Service
 *
 * Pure business logic for activity feed operations.
 * No HTTP awareness -- returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 *
 * The activities table is append-only -- no update or delete operations.
 */

import type { Activity, ActivityRepository, NewActivity } from '@abe-stack/db';

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Create a new activity entry in the feed.
 *
 * Appends an immutable record describing an action that occurred.
 * Used by handlers and other modules to log user-visible activity.
 *
 * @param repo - Activity repository
 * @param params - Activity creation parameters
 * @returns The created activity record
 * @complexity O(1) - single database insert
 */
export async function logActivity(
  repo: ActivityRepository,
  params: NewActivity,
): Promise<Activity> {
  return repo.create(params);
}

// ============================================================================
// Activity Feeds
// ============================================================================

/**
 * Get an activity feed for a specific user (actor).
 *
 * Returns the most recent activities performed by the given actor,
 * ordered by creation date descending.
 *
 * @param repo - Activity repository
 * @param actorId - The actor's user ID
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of activities, most recent first
 * @complexity O(n) where n is the result count
 */
export async function getActivityFeed(
  repo: ActivityRepository,
  actorId: string,
  limit = 50,
): Promise<Activity[]> {
  return repo.findByActorId(actorId, limit);
}

/**
 * Get an activity feed for a specific tenant.
 *
 * Returns the most recent activities within the given tenant,
 * ordered by creation date descending.
 *
 * @param repo - Activity repository
 * @param tenantId - The tenant UUID
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of activities, most recent first
 * @complexity O(n) where n is the result count
 */
export async function getTenantActivityFeed(
  repo: ActivityRepository,
  tenantId: string,
  limit = 50,
): Promise<Activity[]> {
  return repo.findByTenantId(tenantId, limit);
}

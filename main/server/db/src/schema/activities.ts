// main/server/db/src/schema/activities.ts
/**
 * Activities Schema Types
 *
 * Explicit TypeScript interfaces for the activities table.
 * Provides user-facing activity feed ("X did Y on Z" timeline).
 * Maps to migration 0016_activities.sql.
 *
 * @remarks This table is append-only — no UpdateActivity type exists.
 * Similar pattern to audit_events in system.ts but user-facing.
 */

import { ACTOR_TYPES, type ActorType } from '@abe-stack/shared';

// Re-export shared constants for consumers that import from schema
export { ACTOR_TYPES };
export type { ActorType };

// ============================================================================
// Table Names
// ============================================================================

export const ACTIVITIES_TABLE = 'activities';

// ============================================================================
// Activity Types
// ============================================================================

/**
 * Activity record (SELECT result).
 * Append-only — no UpdateActivity type.
 *
 * @see 0016_activities.sql — resource_id is TEXT (not UUID) to support external IDs
 */
export interface Activity {
  id: string;
  tenantId: string | null;
  actorId: string | null;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string;
  description: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

/**
 * Fields for inserting a new activity entry (INSERT).
 * Append-only table — records are immutable after creation.
 *
 * @param actorType - Whether the action was performed by a user, system, or API key
 * @param action - Verb describing the action (e.g., "created", "updated", "deleted")
 * @param resourceType - Type of resource acted upon (e.g., "project", "document")
 * @param resourceId - Identifier of the resource (TEXT, supports non-UUID IDs)
 */
export interface NewActivity {
  id?: string;
  tenantId?: string | null;
  actorId?: string | null;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  createdAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

/**
 * Column mappings for activities table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const ACTIVITY_COLUMNS = {
  id: 'id',
  tenantId: 'tenant_id',
  actorId: 'actor_id',
  actorType: 'actor_type',
  action: 'action',
  resourceType: 'resource_type',
  resourceId: 'resource_id',
  description: 'description',
  metadata: 'metadata',
  ipAddress: 'ip_address',
  createdAt: 'created_at',
} as const;

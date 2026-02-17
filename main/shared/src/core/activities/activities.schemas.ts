// main/shared/src/domain/activities/activities.schemas.ts

/**
 * @file Activities Domain Schemas
 * @description Schemas for activity feed validation and type inference.
 * @module Domain/Activities
 */

import { ACTOR_TYPES } from '../constants/iam';
import { activityIdSchema, tenantIdSchema, userIdSchema } from '../../primitives/schema/ids';
import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseNullable,
  parseNullableOptional,
  parseOptional,
  parseRecord,
  parseString,
} from '../../primitives/schema';

import type { Schema } from '../../primitives/api';
import type { ActivityId, TenantId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Constants
// ============================================================================

export { ACTOR_TYPES };

// ============================================================================
// Types
// ============================================================================

export type ActorType = (typeof ACTOR_TYPES)[number];

/**
 * Full activity record (matches DB SELECT result).
 * Append-only — no update type.
 *
 * @param id - Unique activity identifier (UUID)
 * @param tenantId - Optional tenant scope
 * @param actorId - ID of the acting user/api-key (null for system actions)
 * @param actorType - Whether the actor is user, system, or api_key
 * @param action - Verb describing the action (e.g. "created", "updated")
 * @param resourceType - Type of resource acted upon (e.g. "project")
 * @param resourceId - Identifier of the resource (TEXT, supports non-UUID IDs)
 * @param description - Human-readable activity description
 * @param metadata - Arbitrary JSONB metadata
 * @param ipAddress - Client IP at action time
 * @param createdAt - Activity timestamp
 */
export interface Activity {
  id: ActivityId;
  tenantId: TenantId | null;
  actorId: UserId | null;
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
 * Input for creating a new activity entry.
 */
export interface CreateActivity {
  tenantId?: TenantId | null | undefined;
  actorId?: UserId | null | undefined;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string;
  description?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | null | undefined;
}

// ============================================================================
// Schemas
// ============================================================================

export const actorTypeSchema = createEnumSchema(ACTOR_TYPES, 'actorType');

export const activitySchema: Schema<Activity> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: activityIdSchema.parse(obj['id']),
    tenantId: parseNullable(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    actorId: parseNullable(obj['actorId'], (v) => userIdSchema.parse(v)),
    actorType: actorTypeSchema.parse(obj['actorType']),
    action: parseString(obj['action'], 'action'),
    resourceType: parseString(obj['resourceType'], 'resourceType'),
    resourceId: parseString(obj['resourceId'], 'resourceId'),
    description: parseNullable(obj['description'], (v) => parseString(v, 'description')),
    metadata: parseRecord(obj['metadata'], 'metadata'),
    ipAddress: parseNullable(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new activity entry.
 */
export const createActivitySchema: Schema<CreateActivity> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    tenantId: parseNullableOptional(obj['tenantId'], (v) => tenantIdSchema.parse(v)),
    actorId: parseNullableOptional(obj['actorId'], (v) => userIdSchema.parse(v)),
    actorType: actorTypeSchema.parse(obj['actorType']),
    action: parseString(obj['action'], 'action'),
    resourceType: parseString(obj['resourceType'], 'resourceType'),
    resourceId: parseString(obj['resourceId'], 'resourceId'),
    description: parseNullableOptional(obj['description'], (v) => parseString(v, 'description')),
    metadata: parseOptional(obj['metadata'], (v) => parseRecord(v, 'metadata')),
    ipAddress: parseNullableOptional(obj['ipAddress'], (v) => parseString(v, 'ipAddress')),
  };
});

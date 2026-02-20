// main/shared/src/core/activities/activities.types.ts

/**
 * @file Activity Event Types
 * @description Canonical activity type constants, event schema, and
 * feed request/response contracts for the activity tracking system.
 * @module Domain/Activities
 */

import {
  coerceDate,
  coerceNumber,
  createSchema,
  parseNullable,
  parseOptional,
  parseRecord,
  parseString,
} from '../../primitives/schema';
import { activityIdSchema, tenantIdSchema, userIdSchema } from '../../primitives/schema/ids';

import { actorTypeSchema, type ActorType } from './activities.schemas';

import type { Schema } from '../../primitives/api';
import type { ActivityId, TenantId, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Activity Type Constants
// ============================================================================

/**
 * Canonical activity type enum.
 *
 * Format: `{resource}.{action}` using dot notation.
 * Covers user lifecycle, workspace management, project/document CRUD,
 * billing events, and security actions.
 */
export const ACTIVITY_TYPES = {
  // User lifecycle
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_REGISTER: 'user.register',
  USER_PASSWORD_CHANGE: 'user.password_change',
  USER_PROFILE_UPDATE: 'user.profile_update',
  USER_DEACTIVATE: 'user.deactivate',
  USER_REACTIVATE: 'user.reactivate',
  USER_DELETE: 'user.delete',

  // Workspace (tenant) management
  WORKSPACE_CREATE: 'workspace.create',
  WORKSPACE_UPDATE: 'workspace.update',
  WORKSPACE_DELETE: 'workspace.delete',
  WORKSPACE_MEMBER_ADD: 'workspace.member_add',
  WORKSPACE_MEMBER_REMOVE: 'workspace.member_remove',
  WORKSPACE_MEMBER_ROLE_CHANGE: 'workspace.member_role_change',
  WORKSPACE_INVITATION_SEND: 'workspace.invitation_send',
  WORKSPACE_INVITATION_ACCEPT: 'workspace.invitation_accept',
  WORKSPACE_INVITATION_REVOKE: 'workspace.invitation_revoke',
  WORKSPACE_OWNERSHIP_TRANSFER: 'workspace.ownership_transfer',

  // Project CRUD
  PROJECT_CREATE: 'project.create',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  PROJECT_ARCHIVE: 'project.archive',
  PROJECT_RESTORE: 'project.restore',

  // Document CRUD
  DOCUMENT_CREATE: 'document.create',
  DOCUMENT_UPDATE: 'document.update',
  DOCUMENT_DELETE: 'document.delete',

  // File operations
  FILE_UPLOAD: 'file.upload',
  FILE_DELETE: 'file.delete',

  // Billing events
  BILLING_SUBSCRIPTION_CREATE: 'billing.subscription_create',
  BILLING_SUBSCRIPTION_CANCEL: 'billing.subscription_cancel',
  BILLING_SUBSCRIPTION_RESUME: 'billing.subscription_resume',
  BILLING_PLAN_CHANGE: 'billing.plan_change',
  BILLING_PAYMENT_SUCCESS: 'billing.payment_success',
  BILLING_PAYMENT_FAILED: 'billing.payment_failed',

  // Security
  SECURITY_API_KEY_CREATE: 'security.api_key_create',
  SECURITY_API_KEY_REVOKE: 'security.api_key_revoke',
  SECURITY_MFA_ENABLE: 'security.mfa_enable',
  SECURITY_MFA_DISABLE: 'security.mfa_disable',

  // Feature flags
  FEATURE_FLAG_CREATE: 'feature_flag.create',
  FEATURE_FLAG_UPDATE: 'feature_flag.update',
  FEATURE_FLAG_DELETE: 'feature_flag.delete',

  // System
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_DATA_EXPORT: 'system.data_export',
} as const;

/** Union type of all activity type string values */
export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

/** All valid activity type values as an array */
export const ACTIVITY_TYPE_VALUES = Object.values(ACTIVITY_TYPES) as ActivityType[];

// ============================================================================
// Activity Event
// ============================================================================

/**
 * A structured activity event for the activity feed.
 * Extends the base Activity with typed action field.
 */
export interface ActivityEvent {
  readonly id: ActivityId;
  readonly tenantId: TenantId | null;
  readonly actorId: UserId | null;
  readonly actorType: ActorType;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly description: string | null;
  readonly metadata: Record<string, unknown>;
  readonly ipAddress: string | null;
  readonly createdAt: Date;
}

/**
 * Schema for parsing an ActivityEvent from raw data.
 */
export const activityEventSchema: Schema<ActivityEvent> = createSchema((data: unknown) => {
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

// ============================================================================
// Activity Feed Request/Response
// ============================================================================

/**
 * Request parameters for the activity feed endpoint.
 */
export interface ActivityFeedRequest {
  /** Filter by resource type */
  readonly resourceType?: string;
  /** Filter by actor ID */
  readonly actorId?: string;
  /** Filter by action type */
  readonly action?: string;
  /** Cursor for pagination */
  readonly cursor?: string;
  /** Maximum number of results (1-100) */
  readonly limit?: number;
}

/**
 * Schema for parsing an ActivityFeedRequest from query parameters.
 */
export const activityFeedRequestSchema: Schema<ActivityFeedRequest> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      resourceType: parseOptional(obj['resourceType'], (v) =>
        parseString(v, 'resourceType', { min: 1 }),
      ),
      actorId: parseOptional(obj['actorId'], (v) => parseString(v, 'actorId', { min: 1 })),
      action: parseOptional(obj['action'], (v) => parseString(v, 'action', { min: 1 })),
      cursor: parseOptional(obj['cursor'], (v) => parseString(v, 'cursor', { min: 1 })),
      limit: parseOptional(obj['limit'], (v) =>
        coerceNumber(v, 'limit', { int: true, min: 1, max: 100 }),
      ),
    };
  },
);

/**
 * Response from an activity feed endpoint.
 */
export interface ActivityFeedResponse {
  readonly activities: ActivityEvent[];
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

/**
 * Schema for parsing an ActivityFeedResponse.
 */
export const activityFeedResponseSchema: Schema<ActivityFeedResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    if (!Array.isArray(obj['activities'])) throw new Error('activities must be an array');

    return {
      activities: obj['activities'].map((item) => activityEventSchema.parse(item)),
      nextCursor: parseNullable(obj['nextCursor'], (v) => parseString(v, 'nextCursor')),
      hasMore: obj['hasMore'] === true,
    };
  },
);

// shared/src/types/ids.ts

/**
 * @file Branded ID Types
 * @description Centralized definition of all branded ID types to prevent misuse and ensure type safety.
 * @module Shared/Types
 */

import { z } from 'zod';

// ============================================================================
// Identity & Access Management
// ============================================================================

/** User ID (UUID) */
export const userIdSchema = z.string().uuid().brand<'UserId'>();
export type UserId = z.infer<typeof userIdSchema>;
/** Helper to safely parse user IDs from raw strings */
export const parseUserId = (id: string): UserId => userIdSchema.parse(id);

/** Tenant/Workspace ID (UUID) */
export const tenantIdSchema = z.string().uuid().brand<'TenantId'>();
export type TenantId = z.infer<typeof tenantIdSchema>;
/** Helper to safely parse tenant IDs from raw strings */
export const parseTenantId = (id: string): TenantId => tenantIdSchema.parse(id);

/** Organization ID (UUID) */
export const organizationIdSchema = z.string().uuid().brand<'OrganizationId'>();
export type OrganizationId = z.infer<typeof organizationIdSchema>;

/** Membership/Seat ID (UUID) */
export const membershipIdSchema = z.string().uuid().brand<'MembershipId'>();
export type MembershipId = z.infer<typeof membershipIdSchema>;

/** Invitation ID (UUID) */
export const inviteIdSchema = z.string().uuid().brand<'InviteId'>();
export type InviteId = z.infer<typeof inviteIdSchema>;

// ============================================================================
// Billing & Subscription
// ============================================================================

/** Plan ID (String identifier, e.g. "pro_monthly") */
export const planIdSchema = z.string().min(1).brand<'PlanId'>();
export type PlanId = z.infer<typeof planIdSchema>;
/** Helper to safely parse plan IDs from raw strings */
export const parsePlanId = (id: string): PlanId => planIdSchema.parse(id);

/** Subscription ID (Provider-specific or internal ID) */
export const subscriptionIdSchema = z.string().min(1).brand<'SubscriptionId'>();
export type SubscriptionId = z.infer<typeof subscriptionIdSchema>;

// ============================================================================
// System & Audit
// ============================================================================

/** Audit Event ID (UUID) */
export const auditEventIdSchema = z.string().uuid().brand<'AuditEventId'>();
export type AuditEventId = z.infer<typeof auditEventIdSchema>;

/** Notification ID (UUID) */
export const notificationIdSchema = z.string().uuid().brand<'NotificationId'>();
export type NotificationId = z.infer<typeof notificationIdSchema>;

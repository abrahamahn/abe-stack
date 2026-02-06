// packages/shared/src/types/ids.ts

/**
 * @file Branded ID Types
 * @description Centralized definition of all branded ID types to prevent misuse and ensure type safety.
 * Uses createBrandedUuidSchema and createBrandedStringSchema instead of Zod.
 * @module Shared/Types
 */

import { createBrandedStringSchema, createBrandedUuidSchema } from '../contracts/schema';

// ============================================================================
// Identity & Access Management
// ============================================================================

/** User ID (UUID) */
export type UserId = string & { readonly __brand: 'UserId' };
export const userIdSchema = createBrandedUuidSchema<UserId>('UserId');
/** Helper to safely parse user IDs from raw strings */
export const parseUserId = (id: string): UserId => userIdSchema.parse(id);

/** Tenant/Workspace ID (UUID) */
export type TenantId = string & { readonly __brand: 'TenantId' };
export const tenantIdSchema = createBrandedUuidSchema<TenantId>('TenantId');
/** Helper to safely parse tenant IDs from raw strings */
export const parseTenantId = (id: string): TenantId => tenantIdSchema.parse(id);

/** Organization ID (UUID) */
export type OrganizationId = string & { readonly __brand: 'OrganizationId' };
export const organizationIdSchema = createBrandedUuidSchema<OrganizationId>('OrganizationId');

/** Membership/Seat ID (UUID) */
export type MembershipId = string & { readonly __brand: 'MembershipId' };
export const membershipIdSchema = createBrandedUuidSchema<MembershipId>('MembershipId');

/** Invitation ID (UUID) */
export type InviteId = string & { readonly __brand: 'InviteId' };
export const inviteIdSchema = createBrandedUuidSchema<InviteId>('InviteId');

// ============================================================================
// Billing & Subscription
// ============================================================================

/** Plan ID (String identifier, e.g. "pro_monthly") */
export type PlanId = string & { readonly __brand: 'PlanId' };
export const planIdSchema = createBrandedStringSchema<PlanId>('PlanId');
/** Helper to safely parse plan IDs from raw strings */
export const parsePlanId = (id: string): PlanId => planIdSchema.parse(id);

/** Subscription ID (Provider-specific or internal ID) */
export type SubscriptionId = string & { readonly __brand: 'SubscriptionId' };
export const subscriptionIdSchema = createBrandedStringSchema<SubscriptionId>('SubscriptionId');

// ============================================================================
// System & Audit
// ============================================================================

/** Audit Event ID (UUID) */
export type AuditEventId = string & { readonly __brand: 'AuditEventId' };
export const auditEventIdSchema = createBrandedUuidSchema<AuditEventId>('AuditEventId');

/** Notification ID (UUID) */
export type NotificationId = string & { readonly __brand: 'NotificationId' };
export const notificationIdSchema = createBrandedUuidSchema<NotificationId>('NotificationId');

/** Session ID (UUID) */
export type SessionId = string & { readonly __brand: 'SessionId' };
export const sessionIdSchema = createBrandedUuidSchema<SessionId>('SessionId');

/** Job ID (UUID) */
export type JobId = string & { readonly __brand: 'JobId' };
export const jobIdSchema = createBrandedUuidSchema<JobId>('JobId');

/** Webhook ID (UUID) */
export type WebhookId = string & { readonly __brand: 'WebhookId' };
export const webhookIdSchema = createBrandedUuidSchema<WebhookId>('WebhookId');

/** Webhook Delivery ID (UUID) */
export type WebhookDeliveryId = string & { readonly __brand: 'WebhookDeliveryId' };
export const webhookDeliveryIdSchema =
  createBrandedUuidSchema<WebhookDeliveryId>('WebhookDeliveryId');

// ============================================================================
// Compliance
// ============================================================================

/** Legal Document ID (UUID) */
export type LegalDocumentId = string & { readonly __brand: 'LegalDocumentId' };
export const legalDocumentIdSchema = createBrandedUuidSchema<LegalDocumentId>('LegalDocumentId');

/** User Agreement ID (UUID) */
export type UserAgreementId = string & { readonly __brand: 'UserAgreementId' };
export const userAgreementIdSchema = createBrandedUuidSchema<UserAgreementId>('UserAgreementId');

/** Consent Log ID (UUID) */
export type ConsentLogId = string & { readonly __brand: 'ConsentLogId' };
export const consentLogIdSchema = createBrandedUuidSchema<ConsentLogId>('ConsentLogId');

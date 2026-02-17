// main/shared/src/core/types/ids.ts
/**
 * @file Branded ID Re-exports
 * @description Backward-compatibility stub — re-exports branded ID schemas and
 *   types from the canonical source in primitives/schema/ids.
 * @module Core/Types
 */

// ============================================================================
// Value Exports (Schemas & Parse Helpers)
// ============================================================================

export {
  activityIdSchema,
  apiKeyIdSchema,
  auditEventIdSchema,
  consentLogIdSchema,
  emailLogIdSchema,
  emailTemplateKeySchema,
  fileIdSchema,
  inviteIdSchema,
  jobIdSchema,
  legalDocumentIdSchema,
  membershipIdSchema,
  notificationIdSchema,
  organizationIdSchema,
  parsePlanId,
  parseTenantId,
  parseUserId,
  planIdSchema,
  sessionIdSchema,
  subscriptionIdSchema,
  tenantIdSchema,
  userAgreementIdSchema,
  userIdSchema,
  webhookDeliveryIdSchema,
  webhookIdSchema,
} from '../../primitives/schema/ids';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  ActivityId,
  ApiKeyId,
  AuditEventId,
  ConsentLogId,
  EmailLogId,
  EmailTemplateKey,
  FileId,
  InviteId,
  JobId,
  LegalDocumentId,
  MembershipId,
  NotificationId,
  OrganizationId,
  PlanId,
  SessionId,
  SubscriptionId,
  TenantId,
  UserAgreementId,
  UserId,
  WebhookDeliveryId,
  WebhookId,
} from '../../primitives/schema/ids';

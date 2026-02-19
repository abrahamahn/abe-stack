// main/shared/src/primitives/schema/index.ts

export type { InferSchema, SafeParseResult, Schema } from './types';

export { createSchema } from './factory';

export {
  coerceDate,
  coerceNumber,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseObject,
  parseOptional,
  parseRecord,
  parseString,
  parseTypedRecord,
  withDefault,
  type ParseNumberOptions,
  type ParseStringOptions,
} from './parsers';

export {
  createArraySchema,
  createBrandedStringSchema,
  createBrandedUuidSchema,
  createEnumSchema,
  createLiteralSchema,
  createUnionSchema,
} from './composite';

export { emailSchema, isoDateTimeSchema, passwordSchema, uuidSchema } from './scalars';

export {
  activityIdSchema,
  apiKeyIdSchema,
  auditEventIdSchema,
  consentRecordIdSchema,
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
  userIdSchema,
  webhookDeliveryIdSchema,
  webhookIdSchema,
  type ActivityId,
  type ApiKeyId,
  type AuditEventId,
  type ConsentRecordId,
  type EmailLogId,
  type EmailTemplateKey,
  type FileId,
  type InviteId,
  type JobId,
  type LegalDocumentId,
  type MembershipId,
  type NotificationId,
  type OrganizationId,
  type PlanId,
  type SessionId,
  type SubscriptionId,
  type TenantId,
  type UserId,
  type WebhookDeliveryId,
  type WebhookId,
} from './ids';

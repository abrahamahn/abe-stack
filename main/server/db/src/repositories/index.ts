// main/server/db/src/repositories/index.ts
/**
 * Repository Barrel Exports
 *
 * Exports functional-style repository factories and interfaces used by factory.ts.
 *
 * @module @bslt/db/repositories
 */

// Common types (pagination types re-exported from @bslt/shared)
export type { CursorPaginatedResult, CursorPaginationOptions, TimeRangeFilter } from './types';

// Users
export {
  createUserRepository,
  type AdminUserListFilters,
  type UserRepository,
  type UserStatus,
} from './users';

// Auth
export {
  createAuthTokenRepository,
  createLoginAttemptRepository,
  createRefreshTokenRepository,
  createSecurityEventRepository,
  createTotpBackupCodeRepository,
  createTrustedDeviceRepository,
  createWebauthnCredentialRepository,
  type AuthTokenRepository,
  type LoginAttemptRepository,
  type RefreshTokenRepository,
  type SecurityEventRepository,
  type TotpBackupCodeRepository,
  type TrustedDeviceRepository,
  type WebauthnCredentialRepository,
} from './auth';

// API Keys
export { createApiKeyRepository, type ApiKeyRepository } from './api-keys';

// OAuth
export { createOAuthConnectionRepository, type OAuthConnectionRepository } from './oauth';

// Push Notifications
export {
  createNotificationPreferenceRepository,
  createPushSubscriptionRepository,
  type NotificationPreferenceRepository,
  type PushSubscriptionRepository,
} from './push';

// Billing (functional)
export {
  createBillingEventRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPaymentMethodRepository,
  createPlanRepository,
  createSubscriptionRepository,
  type BillingEventRepository,
  type CustomerMappingRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  type PaymentMethodRepository,
  type PlanRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
} from './billing';

// Sessions
export { createUserSessionRepository, type UserSessionRepository } from './sessions';

// Tenant
export {
  createInvitationRepository,
  createMembershipRepository,
  createTenantRepository,
  type InvitationRepository,
  type MembershipRepository,
  type TenantRepository,
} from './tenant';

// In-App Notifications
export { createNotificationRepository, type NotificationRepository } from './notifications';

// System (Audit, Jobs, Webhooks)
export {
  createAuditEventRepository,
  createJobRepository,
  createWebhookDeliveryRepository,
  createWebhookRepository,
  type AuditEventRepository,
  type JobRepository,
  type WebhookDeliveryRepository,
  type WebhookRepository,
} from './system';

// Features
export {
  createFeatureFlagRepository,
  createTenantFeatureOverrideRepository,
  type FeatureFlagRepository,
  type TenantFeatureOverrideRepository,
} from './features';

// Metering
export {
  createUsageMetricRepository,
  createUsageSnapshotRepository,
  type UsageMetricRepository,
  type UsageSnapshotRepository,
} from './metering';

// Compliance
export {
  createConsentRecordRepository,
  createDataExportRequestRepository,
  createLegalDocumentRepository,
  type ConsentRecordRepository,
  type DataExportRequestRepository,
  type LegalDocumentRepository,
} from './compliance';

// Files
export { createFileRepository, type FileRepository } from './files';

// Email (Templates & Log)
export {
  createEmailLogRepository,
  createEmailTemplateRepository,
  type EmailLogRepository,
  type EmailTemplateRepository,
} from './email';

// Tenant Settings
export { createTenantSettingRepository, type TenantSettingRepository } from './tenant-settings';

// Activities
export { createActivityRepository, type ActivityRepository } from './activities';

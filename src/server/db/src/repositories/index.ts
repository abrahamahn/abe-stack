// backend/db/src/repositories/index.ts
/**
 * Repository Barrel Exports
 *
 * Exports functional-style repository factories and interfaces used by factory.ts.
 *
 * @module @abe-stack/db/repositories
 */

// Common types
export type { PaginatedResult, PaginationOptions, TimeRangeFilter } from './types';

// Users
export {
  createUserRepository,
  type AdminUserListFilters,
  type PaginatedUserResult,
  type UserRepository,
  type UserStatus,
} from './users';

// Auth
export {
  createRefreshTokenRepository,
  createRefreshTokenFamilyRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createEmailVerificationTokenRepository,
  createSecurityEventRepository,
  type RefreshTokenRepository,
  type RefreshTokenFamilyRepository,
  type LoginAttemptRepository,
  type PasswordResetTokenRepository,
  type EmailVerificationTokenRepository,
  type SecurityEventRepository,
} from './auth';

// Magic Link
export { createMagicLinkTokenRepository, type MagicLinkTokenRepository } from './magic-link';

// OAuth
export { createOAuthConnectionRepository, type OAuthConnectionRepository } from './oauth';

// Push Notifications
export {
  createPushSubscriptionRepository,
  createNotificationPreferenceRepository,
  type PushSubscriptionRepository,
  type NotificationPreferenceRepository,
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
  type InvoiceRepository,
  type InvoiceFilters,
  type PaymentMethodRepository,
  type PlanRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
} from './billing';

// Sessions
export { createUserSessionRepository, type UserSessionRepository } from './sessions';

// Tenant
export {
  createTenantRepository,
  createMembershipRepository,
  createInvitationRepository,
  type TenantRepository,
  type MembershipRepository,
  type InvitationRepository,
} from './tenant';

// In-App Notifications
export { createNotificationRepository, type NotificationRepository } from './notifications';

// System (Audit, Jobs, Webhooks)
export {
  createAuditEventRepository,
  createJobRepository,
  createWebhookRepository,
  createWebhookDeliveryRepository,
  type AuditEventRepository,
  type JobRepository,
  type WebhookRepository,
  type WebhookDeliveryRepository,
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
  createLegalDocumentRepository,
  createUserAgreementRepository,
  createConsentLogRepository,
  type LegalDocumentRepository,
  type UserAgreementRepository,
  type ConsentLogRepository,
} from './compliance';

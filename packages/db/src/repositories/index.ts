// packages/db/src/repositories/index.ts
/**
 * Repository Exports
 *
 * Data access layer for all database tables.
 */

// Types
export type { PaginatedResult, PaginationOptions, Repository, TimeRangeFilter } from './types';

// User Repository
export {
  createRefreshTokenRepository,
  createUserRepository,
  type AdminUserListFilters,
  type OffsetPaginatedResult,
  type RefreshTokenRepository,
  type UserRepository,
  type UserStatusFilter,
} from './users';

// Auth Repository
export {
  createEmailVerificationTokenRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createRefreshTokenFamilyRepository,
  createSecurityEventRepository,
  type EmailVerificationTokenRepository,
  type LoginAttemptRepository,
  type PasswordResetTokenRepository,
  type RefreshTokenFamilyRepository,
  type SecurityEventRepository,
} from './auth';

// Magic Link Repository
export { createMagicLinkTokenRepository, type MagicLinkTokenRepository } from './magic-link';

// OAuth Repository
export { createOAuthConnectionRepository, type OAuthConnectionRepository } from './oauth';

// Push Repository
export {
  createNotificationPreferenceRepository,
  createPushSubscriptionRepository,
  type NotificationPreferenceRepository,
  type PushSubscriptionRepository,
} from './push';

// Billing Repositories
export {
  // Plans
  createPlanRepository,
  type PlanRepository,
  // Subscriptions
  createSubscriptionRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
  // Customer Mappings
  createCustomerMappingRepository,
  type CustomerMappingRepository,
  // Invoices
  createInvoiceRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  // Payment Methods
  createPaymentMethodRepository,
  type PaymentMethodRepository,
  // Billing Events
  createBillingEventRepository,
  type BillingEventRepository,
} from './billing';

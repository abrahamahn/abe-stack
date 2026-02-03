// packages/db/src/repositories/index.ts
/**
 * Repository Barrel Exports
 *
 * Exports both the legacy class-based repositories and the new
 * functional-style repositories used by factory.ts.
 */

import { AuthRepository } from './auth-legacy';
import { BillingRepository } from './billing-legacy';
import { MagicLinkRepository } from './magic-link-legacy';
import { OAuthRepository } from './oauth-legacy';
import { PushRepository } from './push-legacy';
import { UserRepository as ClassUserRepository } from './users-legacy';

import type { DbClient } from '../client';

/**
 * Legacy class-based Repositories interface (6-key grouped)
 * @deprecated Use the flat 17-key Repositories from factory.ts instead
 */
export interface ClassRepositories {
  users: ClassUserRepository;
  auth: AuthRepository;
  magicLink: MagicLinkRepository;
  oauth: OAuthRepository;
  push: PushRepository;
  billing: BillingRepository;
}

/**
 * Legacy factory that creates class-based repositories
 * @deprecated Use createRepositories from factory.ts instead
 */
export function createClassRepositories(db: DbClient): ClassRepositories {
  return {
    users: new ClassUserRepository({ db }),
    auth: new AuthRepository({ db }),
    magicLink: new MagicLinkRepository({ db }),
    oauth: new OAuthRepository({ db }),
    push: new PushRepository({ db }),
    billing: new BillingRepository({ db }),
  };
}

// Common types
export type { PaginatedResult, PaginationOptions, TimeRangeFilter } from './types';

// Base
export { BaseRepository, type RepositoryConfig } from './base';

// Legacy class-based repos (kept for backward compat)
export { AuthRepository } from './auth-legacy';
export { BillingRepository } from './billing-legacy';
export { MagicLinkRepository } from './magic-link-legacy';
export { OAuthRepository } from './oauth-legacy';
export { PushRepository } from './push-legacy';
export { UserRepository as ClassUserRepository } from './users-legacy';

// ============================================================================
// Functional-style repos (canonical, used by factory.ts)
// ============================================================================

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

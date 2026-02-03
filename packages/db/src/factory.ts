// packages/db/src/factory.ts
/**
 * Repository Factory
 *
 * Creates and manages all database repositories using the raw SQL query builder.
 * This is the canonical consumer API for repository access.
 *
 * @module
 */

import { createRawDb, type RawDb } from './client';

// Users
import { createUserRepository, type UserRepository } from './repositories/users';

// Auth
import {
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
} from './repositories/auth';

// Magic Link
import {
  createMagicLinkTokenRepository,
  type MagicLinkTokenRepository,
} from './repositories/magic-link';

// OAuth
import {
  createOAuthConnectionRepository,
  type OAuthConnectionRepository,
} from './repositories/oauth';

// Push Notifications
import {
  createPushSubscriptionRepository,
  createNotificationPreferenceRepository,
  type PushSubscriptionRepository,
  type NotificationPreferenceRepository,
} from './repositories/push';

// Billing
import {
  createBillingEventRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPaymentMethodRepository,
  createPlanRepository,
  createSubscriptionRepository,
  type BillingEventRepository,
  type CustomerMappingRepository,
  type InvoiceRepository,
  type PaymentMethodRepository,
  type PlanRepository,
  type SubscriptionRepository,
} from './repositories/billing';

// ============================================================================
// Repository Container
// ============================================================================

/**
 * Flat 17-key repository container.
 * This is the canonical consumer API.
 */
export interface Repositories {
  // Core entities
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;

  // Auth
  refreshTokenFamilies: RefreshTokenFamilyRepository;
  loginAttempts: LoginAttemptRepository;
  passwordResetTokens: PasswordResetTokenRepository;
  emailVerificationTokens: EmailVerificationTokenRepository;
  securityEvents: SecurityEventRepository;

  // Magic Link
  magicLinkTokens: MagicLinkTokenRepository;

  // OAuth
  oauthConnections: OAuthConnectionRepository;

  // Push Notifications
  pushSubscriptions: PushSubscriptionRepository;
  notificationPreferences: NotificationPreferenceRepository;

  // Billing
  plans: PlanRepository;
  subscriptions: SubscriptionRepository;
  customerMappings: CustomerMappingRepository;
  invoices: InvoiceRepository;
  paymentMethods: PaymentMethodRepository;
  billingEvents: BillingEventRepository;
}

/**
 * Context object containing the raw database client and all repositories
 */
export interface RepositoryContext {
  /** Raw database client for direct SQL access */
  raw: RawDb;
  /** All repositories */
  repos: Repositories;
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create all repositories with a shared database connection
 * @param connectionString - PostgreSQL connection string
 * @returns RepositoryContext containing raw client and all repos
 */
export function createRepositories(connectionString: string): RepositoryContext {
  const raw = createRawDb(connectionString);

  return {
    raw,
    repos: {
      users: createUserRepository(raw),
      refreshTokens: createRefreshTokenRepository(raw),
      refreshTokenFamilies: createRefreshTokenFamilyRepository(raw),
      loginAttempts: createLoginAttemptRepository(raw),
      passwordResetTokens: createPasswordResetTokenRepository(raw),
      emailVerificationTokens: createEmailVerificationTokenRepository(raw),
      securityEvents: createSecurityEventRepository(raw),
      magicLinkTokens: createMagicLinkTokenRepository(raw),
      oauthConnections: createOAuthConnectionRepository(raw),
      pushSubscriptions: createPushSubscriptionRepository(raw),
      notificationPreferences: createNotificationPreferenceRepository(raw),
      plans: createPlanRepository(raw),
      subscriptions: createSubscriptionRepository(raw),
      customerMappings: createCustomerMappingRepository(raw),
      invoices: createInvoiceRepository(raw),
      paymentMethods: createPaymentMethodRepository(raw),
      billingEvents: createBillingEventRepository(raw),
    },
  };
}

// ============================================================================
// Singleton Management (Development Hot Reload)
// ============================================================================

type GlobalWithRepos = typeof globalThis & {
  repositoryContext?: RepositoryContext;
};

/**
 * Get or create repository context (singleton in development)
 * @param connectionString - PostgreSQL connection string
 * @returns RepositoryContext (singleton during development for HMR)
 */
export function getRepositoryContext(connectionString: string): RepositoryContext {
  if (process.env['NODE_ENV'] !== 'production') {
    const globalWithRepos = globalThis as GlobalWithRepos;

    globalWithRepos.repositoryContext ??= createRepositories(connectionString);

    return globalWithRepos.repositoryContext;
  }

  return createRepositories(connectionString);
}

/**
 * Close all database connections
 * @param ctx - The repository context to close
 */
export async function closeRepositories(ctx: RepositoryContext): Promise<void> {
  await ctx.raw.close();
}

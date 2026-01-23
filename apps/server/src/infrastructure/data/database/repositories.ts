// apps/server/src/infrastructure/data/database/repositories.ts
/**
 * Repository Factory
 *
 * Creates and manages all database repositories using the raw SQL query builder.
 */

import {
  createRawDb,
  createUserRepository,
  createRefreshTokenRepository,
  createRefreshTokenFamilyRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createEmailVerificationTokenRepository,
  createSecurityEventRepository,
  createMagicLinkTokenRepository,
  createOAuthConnectionRepository,
  createPushSubscriptionRepository,
  createNotificationPreferenceRepository,
  // Billing repositories
  createPlanRepository,
  createSubscriptionRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPaymentMethodRepository,
  createBillingEventRepository,
  type RawDb,
  type UserRepository,
  type RefreshTokenRepository,
  type RefreshTokenFamilyRepository,
  type LoginAttemptRepository,
  type PasswordResetTokenRepository,
  type EmailVerificationTokenRepository,
  type SecurityEventRepository,
  type MagicLinkTokenRepository,
  type OAuthConnectionRepository,
  type PushSubscriptionRepository,
  type NotificationPreferenceRepository,
  // Billing repository types
  type PlanRepository,
  type SubscriptionRepository,
  type CustomerMappingRepository,
  type InvoiceRepository,
  type PaymentMethodRepository,
  type BillingEventRepository,
} from '@abe-stack/db';

// ============================================================================
// Repository Container
// ============================================================================

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
      // Billing
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
 */
export function getRepositoryContext(connectionString: string): RepositoryContext {
  if (process.env.NODE_ENV !== 'production') {
    const globalWithRepos = globalThis as GlobalWithRepos;

    if (!globalWithRepos.repositoryContext) {
      globalWithRepos.repositoryContext = createRepositories(connectionString);
    }

    return globalWithRepos.repositoryContext;
  }

  return createRepositories(connectionString);
}

/**
 * Close all database connections
 */
export async function closeRepositories(ctx: RepositoryContext): Promise<void> {
  await ctx.raw.close();
}

// infra/db/src/factory.ts
/**
 * Repository Factory
 *
 * Creates and manages all database repositories using the raw SQL query builder.
 */

import {
    createBillingEventRepository,
    createCustomerMappingRepository,
    createEmailVerificationTokenRepository,
    createInvoiceRepository,
    createLoginAttemptRepository,
    createMagicLinkTokenRepository,
    createNotificationPreferenceRepository,
    createOAuthConnectionRepository,
    createPasswordResetTokenRepository,
    createPaymentMethodRepository,
    createPlanRepository,
    createPushSubscriptionRepository,
    createRawDb,
    createRefreshTokenFamilyRepository,
    createRefreshTokenRepository,
    createSecurityEventRepository,
    createSubscriptionRepository,
    createUserRepository,
    type BillingEventRepository,
    type CustomerMappingRepository,
    type EmailVerificationTokenRepository,
    type InvoiceRepository,
    type LoginAttemptRepository,
    type MagicLinkTokenRepository,
    type NotificationPreferenceRepository,
    type OAuthConnectionRepository,
    type PasswordResetTokenRepository,
    type PaymentMethodRepository,
    type PlanRepository,
    type PushSubscriptionRepository,
    type RawDb,
    type RefreshTokenFamilyRepository,
    type RefreshTokenRepository,
    type SecurityEventRepository,
    type SubscriptionRepository,
    type UserRepository,
} from './index';

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
  if (process.env['NODE_ENV'] !== 'production') {
    const globalWithRepos = globalThis as GlobalWithRepos;

    globalWithRepos.repositoryContext ??= createRepositories(connectionString);

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

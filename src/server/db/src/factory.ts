// backend/db/src/factory.ts
/**
 * Repository Factory
 *
 * Creates and manages all database repositories using the raw SQL query builder.
 * This is the canonical consumer API for repository access.
 *
 * @module
 */

import { createRawDb, type RawDb } from './client';
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
import {
  createLegalDocumentRepository,
  createUserAgreementRepository,
  createConsentLogRepository,
  type LegalDocumentRepository,
  type UserAgreementRepository,
  type ConsentLogRepository,
} from './repositories/compliance';
import {
  createFeatureFlagRepository,
  createTenantFeatureOverrideRepository,
  type FeatureFlagRepository,
  type TenantFeatureOverrideRepository,
} from './repositories/features';
import {
  createMagicLinkTokenRepository,
  type MagicLinkTokenRepository,
} from './repositories/magic-link';
import {
  createUsageMetricRepository,
  createUsageSnapshotRepository,
  type UsageMetricRepository,
  type UsageSnapshotRepository,
} from './repositories/metering';
import {
  createNotificationRepository,
  type NotificationRepository,
} from './repositories/notifications';
import {
  createOAuthConnectionRepository,
  type OAuthConnectionRepository,
} from './repositories/oauth';
import {
  createPushSubscriptionRepository,
  createNotificationPreferenceRepository,
  type PushSubscriptionRepository,
  type NotificationPreferenceRepository,
} from './repositories/push';
import { createUserSessionRepository, type UserSessionRepository } from './repositories/sessions';
import {
  createAuditEventRepository,
  createJobRepository,
  createWebhookRepository,
  createWebhookDeliveryRepository,
  type AuditEventRepository,
  type JobRepository,
  type WebhookRepository,
  type WebhookDeliveryRepository,
} from './repositories/system';
import {
  createTenantRepository,
  createMembershipRepository,
  createInvitationRepository,
  type TenantRepository,
  type MembershipRepository,
  type InvitationRepository,
} from './repositories/tenant';
import { createUserRepository, type UserRepository } from './repositories/users';

// ============================================================================
// Repository Container
// ============================================================================

/**
 * Flat 33-key repository container.
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

  // Sessions
  userSessions: UserSessionRepository;

  // Tenant
  tenants: TenantRepository;
  memberships: MembershipRepository;
  invitations: InvitationRepository;

  // In-App Notifications
  notifications: NotificationRepository;

  // System
  auditEvents: AuditEventRepository;
  jobs: JobRepository;
  webhooks: WebhookRepository;
  webhookDeliveries: WebhookDeliveryRepository;

  // Features
  featureFlags: FeatureFlagRepository;
  tenantFeatureOverrides: TenantFeatureOverrideRepository;

  // Metering
  usageMetrics: UsageMetricRepository;
  usageSnapshots: UsageSnapshotRepository;

  // Compliance
  legalDocuments: LegalDocumentRepository;
  userAgreements: UserAgreementRepository;
  consentLogs: ConsentLogRepository;
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
      // Core
      users: createUserRepository(raw),
      refreshTokens: createRefreshTokenRepository(raw),

      // Auth
      refreshTokenFamilies: createRefreshTokenFamilyRepository(raw),
      loginAttempts: createLoginAttemptRepository(raw),
      passwordResetTokens: createPasswordResetTokenRepository(raw),
      emailVerificationTokens: createEmailVerificationTokenRepository(raw),
      securityEvents: createSecurityEventRepository(raw),

      // Magic Link
      magicLinkTokens: createMagicLinkTokenRepository(raw),

      // OAuth
      oauthConnections: createOAuthConnectionRepository(raw),

      // Push
      pushSubscriptions: createPushSubscriptionRepository(raw),
      notificationPreferences: createNotificationPreferenceRepository(raw),

      // Billing
      plans: createPlanRepository(raw),
      subscriptions: createSubscriptionRepository(raw),
      customerMappings: createCustomerMappingRepository(raw),
      invoices: createInvoiceRepository(raw),
      paymentMethods: createPaymentMethodRepository(raw),
      billingEvents: createBillingEventRepository(raw),

      // Sessions
      userSessions: createUserSessionRepository(raw),

      // Tenant
      tenants: createTenantRepository(raw),
      memberships: createMembershipRepository(raw),
      invitations: createInvitationRepository(raw),

      // In-App Notifications
      notifications: createNotificationRepository(raw),

      // System
      auditEvents: createAuditEventRepository(raw),
      jobs: createJobRepository(raw),
      webhooks: createWebhookRepository(raw),
      webhookDeliveries: createWebhookDeliveryRepository(raw),

      // Features
      featureFlags: createFeatureFlagRepository(raw),
      tenantFeatureOverrides: createTenantFeatureOverrideRepository(raw),

      // Metering
      usageMetrics: createUsageMetricRepository(raw),
      usageSnapshots: createUsageSnapshotRepository(raw),

      // Compliance
      legalDocuments: createLegalDocumentRepository(raw),
      userAgreements: createUserAgreementRepository(raw),
      consentLogs: createConsentLogRepository(raw),
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

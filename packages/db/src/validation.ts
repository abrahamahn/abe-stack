// packages/db/src/validation.ts
/**
 * Schema Validation
 *
 * Validates that required database tables exist before accepting requests.
 * Prevents cryptic "relation does not exist" errors in production.
 */

import type { RawDb } from './client';

// ============================================================================
// Required Tables
// ============================================================================

/**
 * All tables required for the application to function.
 * Keep in sync with @abe-stack/db schema
 */
export const REQUIRED_TABLES = [
  // 0000_init: Users & Auth
  'users',
  'refresh_tokens',
  'refresh_token_families',
  'login_attempts',
  'password_reset_tokens',
  'email_verification_tokens',
  'security_events',
  // 0001_tenant: Multi-tenancy
  'tenants',
  'memberships',
  'invitations',
  // 0002_sessions: Session management
  'user_sessions',
  'magic_link_tokens',
  'oauth_connections',
  // 0003_billing: Billing & subscriptions
  'plans',
  'subscriptions',
  'customer_mappings',
  'invoices',
  'payment_methods',
  'billing_events',
  // 0004_notifications: In-app + push
  'notifications',
  'push_subscriptions',
  'notification_preferences',
  // 0005_system: Jobs, audit, webhooks
  'jobs',
  'audit_events',
  'webhooks',
  'webhook_deliveries',
  // 0006_features: Feature flags
  'feature_flags',
  'tenant_feature_overrides',
  // 0007_metering: Usage tracking
  'usage_metrics',
  'usage_snapshots',
  // 0008_compliance: Legal & consent
  'legal_documents',
  'user_agreements',
  'consent_logs',
] as const;

export type RequiredTable = (typeof REQUIRED_TABLES)[number];

// ============================================================================
// Types
// ============================================================================

export interface SchemaValidationResult {
  valid: boolean;
  missingTables: string[];
  existingTables: string[];
}

export class SchemaValidationError extends Error {
  constructor(public readonly missingTables: string[]) {
    super(
      `Database schema is incomplete. Missing tables: ${missingTables.join(', ')}. ` +
        `Run 'pnpm --filter @abe-stack/server db:push' to create tables.`,
    );
    this.name = 'SchemaValidationError';
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check which tables exist in the database
 */
export async function getExistingTables(db: RawDb): Promise<string[]> {
  const result = await db.raw<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );

  return result.map((row) => row.tablename);
}

/**
 * Validate that all required tables exist
 */
export async function validateSchema(db: RawDb): Promise<SchemaValidationResult> {
  const existingTables = await getExistingTables(db);
  const existingSet = new Set(existingTables);

  const missingTables = REQUIRED_TABLES.filter((table) => !existingSet.has(table));

  return {
    valid: missingTables.length === 0,
    missingTables,
    existingTables,
  };
}

/**
 * Validate schema and throw if incomplete.
 * Call this during app startup.
 */
export async function requireValidSchema(db: RawDb): Promise<void> {
  const result = await validateSchema(db);

  if (!result.valid) {
    throw new SchemaValidationError(result.missingTables);
  }
}

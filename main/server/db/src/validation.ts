// main/server/db/src/validation.ts
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
 * Keep in sync with @bslt/db schema
 */
export const REQUIRED_TABLES = [
  // 0000_users.sql: Users & Core Auth
  'users',
  'refresh_tokens',
  'auth_tokens',
  'login_attempts',
  'security_events',
  // 0001_auth_extensions.sql: MFA extensions (TOTP, SMS, WebAuthn, trusted devices)
  'totp_backup_codes',
  'sms_verification_codes',
  'webauthn_credentials',
  'trusted_devices',
  // 0002_sessions.sql: Session management
  'user_sessions',
  'oauth_connections',
  // 0100_tenants.sql: Multi-tenancy
  'tenants',
  'memberships',
  'invitations',
  // 0101_api_keys.sql: Programmatic API access
  'api_keys',
  // 0200_billing.sql: Billing & subscriptions
  'plans',
  'subscriptions',
  'customer_mappings',
  'invoices',
  'payment_methods',
  'billing_events',
  // 0300_notifications.sql: In-app + push
  'notifications',
  'push_subscriptions',
  'notification_preferences',
  // 0400_system.sql: Jobs, audit, webhooks
  'jobs',
  'audit_events',
  'webhooks',
  'webhook_deliveries',
  // 0450_features.sql: Feature flags
  'feature_flags',
  'tenant_feature_overrides',
  // 0460_metering.sql: Usage tracking
  'usage_metrics',
  'usage_snapshots',
  // 0500_compliance.sql: Legal & consent
  'legal_documents',
  'consent_records',
  'data_export_requests',
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
        `Run 'pnpm db:push' to create tables (development).`,
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

// main/tools/scripts/db/push.ts
/**
 * Database Schema Push (Development)
 *
 * Creates required tables directly in PostgreSQL (no migration files).
 * Intended for development only.
 *
 * Usage:
 *   pnpm db:push
 */

import { buildConnectionString, createDbClient } from '@bslt/db';
import { loadServerEnv } from '@bslt/server-system';

export const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    username text UNIQUE,
    canonical_email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text NOT NULL DEFAULT '',
    last_name text NOT NULL DEFAULT '',
    avatar_url text,
    role text NOT NULL DEFAULT 'user',
    email_verified boolean NOT NULL DEFAULT false,
    email_verified_at timestamptz,
    locked_until timestamptz,
    failed_login_attempts integer NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    totp_secret text,
    totp_enabled boolean NOT NULL DEFAULT false,
    phone text,
    phone_verified boolean,
    date_of_birth timestamptz,
    gender text,
    city text,
    state text,
    country text,
    bio text,
    language text,
    website text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
    family_ip_address text,
    family_user_agent text,
    family_created_at timestamptz NOT NULL DEFAULT now(),
    family_revoked_at timestamptz,
    family_revoke_reason text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS auth_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL CHECK (type IN (
      'password_reset','email_verification','email_change','email_change_revert','magic_link'
    )),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    email text,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    ip_address text,
    user_agent text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    ip_address text,
    user_agent text,
    success boolean NOT NULL,
    failure_reason text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    email text,
    event_type text NOT NULL,
    severity text NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS oauth_connections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_user_id text NOT NULL,
    provider_email text,
    access_token text NOT NULL,
    refresh_token text,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint text NOT NULL,
    expiration_time timestamptz,
    keys_p256dh text NOT NULL,
    keys_auth text NOT NULL,
    device_id text NOT NULL,
    user_agent text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    global_enabled boolean NOT NULL DEFAULT true,
    quiet_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
    types jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS totp_backup_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash text NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS tenants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    logo_url text,
    owner_id uuid NOT NULL REFERENCES users(id),
    is_active boolean NOT NULL DEFAULT true,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    key_prefix text NOT NULL,
    key_hash text NOT NULL UNIQUE,
    scopes text[] NOT NULL DEFAULT '{}',
    last_used_at timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS data_export_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('export', 'deletion')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
    format text NOT NULL DEFAULT 'json',
    download_url text,
    expires_at timestamptz,
    completed_at timestamptz,
    error_message text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, user_id)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL,
    status text NOT NULL,
    invited_by_id uuid NOT NULL REFERENCES users(id),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS user_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address text,
    user_agent text,
    device_id text,
    device_name text,
    device_type text,
    last_active_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS plans (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    interval text NOT NULL,
    price_in_cents integer NOT NULL CHECK (price_in_cents >= 0),
    currency text NOT NULL DEFAULT 'usd',
    features jsonb NOT NULL DEFAULT '[]'::jsonb,
    trial_days integer NOT NULL DEFAULT 0,
    stripe_price_id text,
    stripe_product_id text,
    paypal_plan_id text,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id text NOT NULL REFERENCES plans(id),
    provider text NOT NULL,
    provider_subscription_id text NOT NULL,
    provider_customer_id text NOT NULL,
    status text NOT NULL,
    current_period_start timestamptz NOT NULL,
    current_period_end timestamptz NOT NULL CHECK (current_period_end > current_period_start),
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    canceled_at timestamptz,
    trial_end timestamptz,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS customer_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_customer_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, provider)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider text NOT NULL,
    provider_invoice_id text NOT NULL,
    status text NOT NULL,
    amount_due integer NOT NULL CHECK (amount_due >= 0),
    amount_paid integer NOT NULL DEFAULT 0 CHECK (amount_paid >= 0 AND amount_paid <= amount_due),
    currency text NOT NULL DEFAULT 'usd',
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    paid_at timestamptz,
    invoice_pdf_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_payment_method_id text NOT NULL,
    type text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    card_details jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS billing_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider text NOT NULL,
    provider_event_id text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(provider, provider_event_id)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL,
    priority integer NOT NULL DEFAULT 0,
    attempts integer NOT NULL DEFAULT 0,
    max_attempts integer NOT NULL,
    last_error text,
    idempotency_key text,
    scheduled_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
    action text NOT NULL,
    category text NOT NULL,
    severity text NOT NULL,
    resource text NOT NULL,
    resource_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
    url text NOT NULL,
    events text[] NOT NULL,
    secret text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    response_status integer,
    response_body text,
    status text NOT NULL,
    attempts integer NOT NULL DEFAULT 0,
    next_retry_at timestamptz,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS feature_flags (
    key text PRIMARY KEY,
    description text,
    is_enabled boolean NOT NULL DEFAULT false,
    default_value jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key text NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
    value jsonb,
    is_enabled boolean NOT NULL,
    PRIMARY KEY (tenant_id, key)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS usage_metrics (
    key text PRIMARY KEY,
    name text NOT NULL,
    unit text NOT NULL,
    aggregation_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS usage_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_key text NOT NULL REFERENCES usage_metrics(key) ON DELETE CASCADE,
    value numeric NOT NULL DEFAULT 0,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, metric_key, period_start)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS legal_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    version integer NOT NULL,
    effective_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(type, version)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS consent_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type text NOT NULL CHECK (record_type IN ('legal_document','consent_preference')),
    document_id uuid REFERENCES legal_documents(id) ON DELETE RESTRICT,
    consent_type text,
    granted boolean,
    ip_address text,
    user_agent text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  // Core indexes
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_canonical_email ON users (canonical_email);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_expires ON refresh_tokens (token, expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_id ON refresh_tokens (family_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family_active ON refresh_tokens (user_id, family_id) WHERE family_revoked_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens (token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON auth_tokens (user_id, type) WHERE user_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_auth_tokens_email_type ON auth_tokens (email, type, created_at DESC) WHERE email IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_auth_tokens_ip_type ON auth_tokens (ip_address, type, created_at DESC) WHERE ip_address IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_type ON auth_tokens (type, expires_at) WHERE used_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts (email, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON oauth_connections (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_user ON totp_backup_codes (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id) WHERE tenant_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);`,
  `CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_tenant_email ON invitations (tenant_id, email) WHERE status = 'pending';`,
  `CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations (invited_by_id);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_created ON jobs (status, priority DESC, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events (tenant_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events (resource, resource_id);`,
  `CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records (user_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_consent_records_user_consent ON consent_records (user_id, consent_type, created_at DESC) WHERE consent_type IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_consent_records_document ON consent_records (document_id) WHERE document_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_consent_records_user_doc ON consent_records (user_id, document_id) WHERE document_id IS NOT NULL;`,
  // Tenant domain restrictions (0100_tenants.sql)
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[] NOT NULL DEFAULT '{}';`,
  // SMS verification codes (0001_auth_extensions.sql)
  `
  CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone text NOT NULL,
    code_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    verified boolean NOT NULL DEFAULT false,
    attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_user_id ON sms_verification_codes(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_expires_at ON sms_verification_codes(expires_at);`,
  // Trusted devices (0001_auth_extensions.sql)
  `
  CREATE TABLE IF NOT EXISTS trusted_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint text NOT NULL,
    label text,
    ip_address text,
    user_agent text,
    first_seen_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    trusted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_fingerprint)
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);`,
  // Performance indexes (0000_users.sql)
  `CREATE INDEX IF NOT EXISTS idx_users_active ON users(id) WHERE deleted_at IS NULL AND deactivated_at IS NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at DESC) WHERE expires_at > NOW();`,
  // Active API keys (0101_api_keys.sql)
  `CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(user_id, created_at DESC) WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());`,
  // New indexes: 0000_users.sql
  `CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_users_deletion_grace ON users(deletion_grace_period_ends) WHERE deletion_grace_period_ends IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);`,
  // New indexes: 0001_auth_extensions.sql
  `CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_unverified ON sms_verification_codes(user_id, expires_at) WHERE verified = FALSE;`,
  `CREATE INDEX IF NOT EXISTS idx_trusted_devices_last_seen ON trusted_devices(user_id, last_seen_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_webauthn_cred_last_used ON webauthn_credentials(user_id, last_used_at DESC) WHERE last_used_at IS NOT NULL;`,
  // New indexes: 0002_sessions.sql
  `CREATE INDEX IF NOT EXISTS idx_user_sessions_revoked_at ON user_sessions(revoked_at) WHERE revoked_at IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_connections_expires ON oauth_connections(expires_at) WHERE expires_at IS NOT NULL;`,
  // New indexes: 0200_billing.sql
  `CREATE INDEX IF NOT EXISTS idx_plans_active_sorted ON plans(sort_order) WHERE is_active = TRUE;`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_period ON subscriptions(user_id, status, current_period_end DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_expiry ON subscriptions(trial_end) WHERE status = 'trialing' AND trial_end IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status ON subscriptions(plan_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices(user_id, status, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_payment_methods_user_default ON payment_methods(user_id) WHERE is_default = TRUE;`,
  `CREATE INDEX IF NOT EXISTS idx_billing_events_type ON billing_events(event_type, created_at DESC);`,
  // New indexes: 0500_compliance.sql
  `CREATE INDEX IF NOT EXISTS idx_data_export_requests_expires ON data_export_requests(expires_at) WHERE expires_at IS NOT NULL AND status != 'completed';`,
];

/**
 * Push the database schema by executing all DDL statements sequentially.
 *
 * @throws {Error} If any SQL statement fails or the connection cannot be established
 * @complexity O(n) where n = number of SQL statements
 */
export async function pushSchema(): Promise<void> {
  // Load + validate `config/env` files (prefers `.env.local` when present).
  await loadServerEnv();

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  for (const sql of STATEMENTS) {
    await db.raw(sql);
  }

  // Avoid open handles in CLI scripts
  if (process.argv[1]?.includes('push')) {
    await db.close();
  }
}

const isMainModule = process.argv[1]?.includes('push') ?? false;
if (isMainModule) {
  pushSchema()
    .then(() => {
      console.log('✅ Database schema pushed successfully.');
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error('❌ Schema push failed:', error);
      process.exit(1);
    });
}

// src/tools/scripts/db/push.ts
/**
 * Database Schema Push (Development)
 *
 * Creates required tables directly in PostgreSQL (no migration files).
 * Intended for development only.
 *
 * Usage:
 *   pnpm db:push
 */

import { buildConnectionString, createDbClient } from '@abe-stack/db';
import { loadServerEnv } from '@abe-stack/server-engine';

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    username text UNIQUE,
    canonical_email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'user',
    email_verified boolean NOT NULL DEFAULT false,
    email_verified_at timestamptz,
    locked_until timestamptz,
    failed_login_attempts integer NOT NULL DEFAULT 0,
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
  -- Existing dev DBs might have an older users table without canonical_email.
  -- CREATE TABLE IF NOT EXISTS won't add new columns, so we patch forward here.
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS canonical_email text;
  `,
  `
  -- Backfill canonical_email for existing rows.
  UPDATE users
  SET canonical_email = lower(trim(email))
  WHERE canonical_email IS NULL;
  `,
  `
  -- Enforce non-null after backfill (will fail loudly if existing data is invalid).
  ALTER TABLE users
    ALTER COLUMN canonical_email SET NOT NULL;
  `,
  `
  -- Patch forward: Add specific profile columns if they are missing from an older dev DB.
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS username text UNIQUE,
    ADD COLUMN IF NOT EXISTS first_name text,
    ADD COLUMN IF NOT EXISTS last_name text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS phone_verified boolean,
    ADD COLUMN IF NOT EXISTS date_of_birth timestamptz,
    ADD COLUMN IF NOT EXISTS gender text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS state text,
    ADD COLUMN IF NOT EXISTS country text,
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS language text,
    ADD COLUMN IF NOT EXISTS website text;
  `,
  `
  CREATE TABLE IF NOT EXISTS refresh_token_families (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address text,
    user_agent text,
    created_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    revoke_reason text
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id uuid REFERENCES refresh_token_families(id) ON DELETE SET NULL,
    token text NOT NULL,
    expires_at timestamptz NOT NULL,
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
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
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
  CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    ip_address text,
    user_agent text
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
  CREATE TABLE IF NOT EXISTS email_change_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS email_change_revert_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_email text NOT NULL,
    new_email text NOT NULL,
    token_hash text NOT NULL,
    expires_at timestamptz NOT NULL,
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
  -- Patch forward: Add device info to user_sessions if missing.
  ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS device_name text,
    ADD COLUMN IF NOT EXISTS device_type text;
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
    price_in_cents integer NOT NULL,
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
    current_period_end timestamptz NOT NULL,
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
    amount_due integer NOT NULL,
    amount_paid integer NOT NULL DEFAULT 0,
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
  CREATE TABLE IF NOT EXISTS user_agreements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id uuid NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
    agreed_at timestamptz NOT NULL DEFAULT now(),
    ip_address text
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS consent_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type text NOT NULL,
    granted boolean NOT NULL,
    ip_address text,
    user_agent text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  `,
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_canonical_email ON users (canonical_email);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_expires ON refresh_tokens (token, expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_refresh_token_families_user ON refresh_token_families (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created ON login_attempts (email, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens (token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens (token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_email ON magic_link_tokens (email);`,
  `CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON oauth_connections (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions (user_id);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_user ON totp_backup_codes (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_email_change_tokens_user ON email_change_tokens (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_email_change_tokens_hash ON email_change_tokens (token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_email_change_revert_tokens_user ON email_change_revert_tokens (user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_email_change_revert_tokens_hash ON email_change_revert_tokens (token_hash);`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id) WHERE tenant_id IS NOT NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);`,
  `CREATE INDEX IF NOT EXISTS idx_data_export_requests_user ON data_export_requests(user_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_tenant_email ON invitations (tenant_id, email) WHERE status = 'pending';`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_status_priority_created ON jobs (status, priority DESC, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_created ON audit_events (tenant_id, created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events (resource, resource_id);`,
];

/**
 * Push the database schema by executing all DDL statements sequentially.
 *
 * @throws {Error} If any SQL statement fails or the connection cannot be established
 * @complexity O(n) where n = number of SQL statements
 */
export async function pushSchema(): Promise<void> {
  // Load + validate `config/env` files (prefers `.env.local` when present).
  loadServerEnv();

  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  for (const sql of STATEMENTS) {
    await db.raw(sql);
  }

  // Avoid open handles in scripts
  await db.close();
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

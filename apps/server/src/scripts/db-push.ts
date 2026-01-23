// apps/server/src/scripts/db-push.ts
/**
 * Database Schema Push (Development)
 *
 * Creates required tables directly in PostgreSQL (no migration files).
 * Intended for development only.
 *
 * Usage:
 *   pnpm --filter @abe-stack/server db:push
 */

import { buildConnectionString, createDbClient } from '@database';

const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `
  CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    name text,
    avatar_url text,
    role text NOT NULL DEFAULT 'user',
    email_verified boolean NOT NULL DEFAULT false,
    email_verified_at timestamptz,
    locked_until timestamptz,
    failed_login_attempts integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    version integer NOT NULL DEFAULT 1
  );
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
    metadata text,
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
  `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
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
];

async function pushSchema(): Promise<void> {
  const connectionString = buildConnectionString();
  const db = createDbClient(connectionString);

  for (const sql of STATEMENTS) {
    await db.raw(sql);
  }

  // Avoid open handles in scripts
  await db.close();
}

const isMainModule = process.argv[1]?.includes('db-push') ?? false;
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

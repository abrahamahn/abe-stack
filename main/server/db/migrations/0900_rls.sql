-- 0900_rls.sql
-- Enable Row-Level Security for core tables and define isolation policies.
--
-- Depends on: all prior migration files (must run last)

-- ============================================================================
-- 1. Enable RLS on core tables
-- ============================================================================

ALTER TABLE tenants                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships              ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE files                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_mappings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE trusted_devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_credentials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_verification_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_connections        ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_token_families   ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events          ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. Define Policies
-- ============================================================================

-- Tenants: users can see tenants they are members of
CREATE POLICY tenant_access_policy ON tenants
FOR ALL TO authenticated
USING (
    id IN (
        SELECT tenant_id FROM memberships
        WHERE user_id = current_setting('app.user_id', true)::uuid
    )
);

-- Memberships: scoped to tenant
CREATE POLICY membership_isolation_policy ON memberships
FOR ALL TO authenticated
USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
);

-- Tenant Settings: scoped to tenant
CREATE POLICY tenant_settings_isolation_policy ON tenant_settings
FOR ALL TO authenticated
USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
);

-- Activities: scoped to tenant, or system-wide (tenant_id IS NULL) visible to all authenticated
CREATE POLICY activity_isolation_policy ON activities
FOR ALL TO authenticated
USING (
    tenant_id IS NULL
    OR tenant_id = current_setting('app.tenant_id', true)::uuid
);

-- Files: scoped to tenant OR owner
CREATE POLICY file_isolation_policy ON files
FOR ALL TO authenticated
USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR user_id = current_setting('app.user_id', true)::uuid
);

-- API Keys: scoped to tenant OR user (personal keys have no tenant)
CREATE POLICY api_key_isolation_policy ON api_keys
FOR ALL TO authenticated
USING (
    tenant_id = current_setting('app.tenant_id', true)::uuid
    OR user_id = current_setting('app.user_id', true)::uuid
);

-- Billing: scoped to user
CREATE POLICY subscription_isolation_policy ON subscriptions
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY customer_mapping_isolation_policy ON customer_mappings
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY invoice_isolation_policy ON invoices
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY payment_method_isolation_policy ON payment_methods
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

-- Notifications: scoped to user
CREATE POLICY notification_isolation_policy ON notifications
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY notification_pref_isolation_policy ON notification_preferences
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY push_subscription_isolation_policy ON push_subscriptions
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

-- Security/Auth: scoped to user
CREATE POLICY trusted_device_isolation_policy ON trusted_devices
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY webauthn_cred_isolation_policy ON webauthn_credentials
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY sms_verification_isolation_policy ON sms_verification_codes
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY user_session_isolation_policy ON user_sessions
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY oauth_connection_isolation_policy ON oauth_connections
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY refresh_token_isolation_policy ON refresh_tokens
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY refresh_token_family_isolation_policy ON refresh_token_families
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY security_event_isolation_policy ON security_events
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

-- Data Privacy: scoped to user
CREATE POLICY data_export_isolation_policy ON data_export_requests
FOR ALL TO authenticated
USING (user_id = current_setting('app.user_id', true)::uuid);

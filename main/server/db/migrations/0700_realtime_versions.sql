-- 0700_realtime_versions.sql
--
-- Sprint 7.1 Phase 1: Add version columns to all syncable tables
--
-- Adds `version INTEGER NOT NULL DEFAULT 1` for optimistic locking and
-- realtime sync support. The WriteService (write-service.ts) already
-- bumps version on every update and checks expectedVersion for conflict
-- detection.
--
-- Skipped (already have version):
--   users           (0000_users.sql)
--   legal_documents (0500_compliance.sql)
--
-- Skipped (append-only / log tables — never updated after insert):
--   login_attempts, security_events, auth_tokens, refresh_tokens,
--   activities, audit_events, billing_events, consent_records,
--   email_log, data_export_requests, customer_mappings,
--   webhook_deliveries
--
-- Depends on: 0000–0600 migrations

-- ============================================================================
-- 0100_tenants.sql tables
-- ============================================================================

ALTER TABLE tenants
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE memberships
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE invitations
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_settings
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0200_billing.sql tables
-- ============================================================================

ALTER TABLE plans
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE subscriptions
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE invoices
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE payment_methods
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0300_notifications.sql tables
-- ============================================================================

ALTER TABLE notifications
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE push_subscriptions
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE notification_preferences
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0301_email.sql tables
-- ============================================================================

ALTER TABLE email_templates
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0400_jobs.sql tables
-- ============================================================================

ALTER TABLE jobs
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0402_webhooks.sql tables
-- ============================================================================

ALTER TABLE webhooks
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0403_feature_flags.sql tables
-- ============================================================================

ALTER TABLE feature_flags
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE tenant_feature_overrides
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0404_metering.sql tables
-- ============================================================================

ALTER TABLE usage_snapshots
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- ============================================================================
-- 0600_files.sql tables
-- ============================================================================

ALTER TABLE files
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 0001_auth_extensions.sql
--
-- Auth Security Extensions
--
-- Supplementary auth tables: MFA backup codes, email change flow,
-- SMS 2FA, WebAuthn/passkeys, and trusted device management.
-- Depends on: 0000_users.sql

-- ============================================================================
-- TOTP Backup Codes (single-use 2FA recovery codes)
-- ============================================================================
-- Each user has up to 10 hashed backup codes. Consumed by setting used_at.

CREATE TABLE IF NOT EXISTS totp_backup_codes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash  TEXT NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SMS Verification Codes (phone-based 2FA OTPs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_verification_codes (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone      TEXT NOT NULL,
    code_hash  TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    verified   BOOLEAN NOT NULL DEFAULT FALSE,
    attempts   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WebAuthn Credentials (FIDO2 / passkeys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webauthn_credentials (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key    TEXT NOT NULL,
    counter       INTEGER NOT NULL DEFAULT 0,
    transports    TEXT,
    device_type   TEXT,
    backed_up     BOOLEAN NOT NULL DEFAULT FALSE,
    name          TEXT NOT NULL DEFAULT 'Passkey',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at  TIMESTAMPTZ
);

-- ============================================================================
-- Trusted Devices (remembered fingerprints for step-up auth bypass)
-- ============================================================================

CREATE TABLE IF NOT EXISTS trusted_devices (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint TEXT NOT NULL,
    label              TEXT,
    ip_address         TEXT,
    user_agent         TEXT,
    first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trusted_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, device_fingerprint)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_totp_backup_codes_user              ON totp_backup_codes(user_id);
CREATE INDEX idx_totp_backup_codes_unused            ON totp_backup_codes(user_id)
    WHERE used_at IS NULL;

CREATE INDEX idx_sms_verification_codes_user         ON sms_verification_codes(user_id);
CREATE INDEX idx_sms_verification_codes_expires      ON sms_verification_codes(expires_at);

CREATE INDEX idx_webauthn_cred_user                  ON webauthn_credentials(user_id);
CREATE UNIQUE INDEX idx_webauthn_cred_id             ON webauthn_credentials(credential_id);

CREATE INDEX idx_trusted_devices_user                ON trusted_devices(user_id);

-- rate-limit check: unverified codes per user ordered by expiry
CREATE INDEX idx_sms_verification_codes_unverified
    ON sms_verification_codes(user_id, expires_at) WHERE verified = FALSE;

-- findByUser() sorts by last_seen_at DESC
CREATE INDEX idx_trusted_devices_last_seen
    ON trusted_devices(user_id, last_seen_at DESC);

-- credential listing sorted by last_used_at
CREATE INDEX idx_webauthn_cred_last_used
    ON webauthn_credentials(user_id, last_used_at DESC)
    WHERE last_used_at IS NOT NULL;

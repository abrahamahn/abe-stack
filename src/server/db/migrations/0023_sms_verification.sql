-- server/db/migrations/0023_sms_verification.sql
--
-- SMS Verification Codes: stores phone verification codes for 2FA.
-- Full implementation blocked on SMS provider selection.
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. Create sms_verification_codes table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_verification_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  code        TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  verified    BOOLEAN NOT NULL DEFAULT FALSE,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up active codes by user
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_user_id
  ON sms_verification_codes(user_id);

-- Index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_sms_verification_codes_expires_at
  ON sms_verification_codes(expires_at);

BEGIN;

-- Add canonical_email for duplicate detection (email+ alias stripping, Gmail dot-insensitivity)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS canonical_email text;

WITH normalized AS (
  SELECT
    id,
    lower(trim(email)) AS email_norm,
    split_part(lower(trim(email)), '@', 1) AS local_part,
    split_part(lower(trim(email)), '@', 2) AS domain
  FROM users
)
UPDATE users u
SET canonical_email = CASE
  WHEN position('@' in n.email_norm) = 0 THEN n.email_norm
  WHEN n.domain IN ('gmail.com', 'googlemail.com') THEN
    regexp_replace(regexp_replace(n.local_part, '\\+.*$', ''), '\\.', '', 'g') || '@' || n.domain
  ELSE
    regexp_replace(n.local_part, '\\+.*$', '') || '@' || n.domain
END
FROM normalized n
WHERE u.id = n.id
  AND u.canonical_email IS NULL;

ALTER TABLE users
  ALTER COLUMN canonical_email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_canonical_email_unique
  ON users(canonical_email);

-- Email change reversion tokens (for "This wasn't me" flow)
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

CREATE INDEX IF NOT EXISTS idx_email_change_revert_tokens_user
  ON email_change_revert_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_change_revert_tokens_expires
  ON email_change_revert_tokens(expires_at);

COMMIT;

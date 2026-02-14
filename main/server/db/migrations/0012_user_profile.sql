-- packages/db/migrations/0012_user_profile.sql
--
-- User Profile Expansion: username, firstName/lastName, profile fields
-- Replaces single 'name' column with firstName + lastName.
-- Adds username as required unique identifier for login.
-- Adds optional profile fields: phone, DOB, gender.
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. Add New Columns
-- ============================================================================

-- Login identifier: required, unique, 1-15 chars [a-z0-9_], stored lowercase
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

-- Name split: replaces single 'name' column
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Phone: optional, stored for future SMS login
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Personal details
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT;

-- ============================================================================
-- 2. Data Migration: name → first_name / last_name
-- ============================================================================

-- Best-effort: put entire existing name into first_name, empty last_name.
-- Users can update their profile after migration.
UPDATE users
SET first_name = COALESCE(NULLIF(TRIM(name), ''), 'User'),
    last_name = ''
WHERE first_name IS NULL;

-- ============================================================================
-- 3. Generate Usernames for Existing Users
-- ============================================================================

-- Derive from email local part: strip non-alphanumeric/underscore chars,
-- lowercase, truncate to 12 chars, append 2-char UUID suffix for uniqueness.
UPDATE users
SET username = LOWER(
  CONCAT(
    SUBSTRING(
      REGEXP_REPLACE(SPLIT_PART(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'),
      1, 12
    ),
    '_',
    SUBSTRING(REPLACE(id::text, '-', ''), 1, 2)
  )
)
WHERE username IS NULL;

-- ============================================================================
-- 4. Apply NOT NULL Constraints
-- ============================================================================

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;

-- ============================================================================
-- 5. Drop Legacy Column
-- ============================================================================

ALTER TABLE users DROP COLUMN IF EXISTS name;

-- ============================================================================
-- 6. Indexes
-- ============================================================================

-- Case-insensitive unique index on username (prevents duplicates regardless of casing)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username));

-- Partial index on phone for future phone-based lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

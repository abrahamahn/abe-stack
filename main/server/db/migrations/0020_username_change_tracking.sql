-- Migration: 0020_username_change_tracking
-- Add last_username_change tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_username_change TIMESTAMPTZ;

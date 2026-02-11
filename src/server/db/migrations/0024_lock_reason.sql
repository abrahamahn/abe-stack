-- 0024_lock_reason.sql
-- Add lock_reason column to users table for storing account lock reasons

ALTER TABLE users ADD COLUMN lock_reason TEXT DEFAULT NULL;

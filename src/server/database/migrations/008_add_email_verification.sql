-- Add email verification fields to users table

ALTER TABLE users
ADD COLUMN email_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN email_token VARCHAR(255),
ADD COLUMN email_token_expire TIMESTAMP,
ADD COLUMN last_email_sent TIMESTAMP;

-- Add index for email token lookups
CREATE INDEX idx_users_email_token ON users(email_token); 
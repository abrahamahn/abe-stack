-- Add first_name and last_name columns to users table
ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Update existing users to have first_name and last_name based on display_name
-- This splits display_name on the first space and uses the parts as first_name and last_name
UPDATE users 
SET 
  first_name = CASE 
    WHEN display_name IS NULL THEN NULL
    WHEN position(' ' in display_name) = 0 THEN display_name
    ELSE substring(display_name from 1 for position(' ' in display_name) - 1)
  END,
  last_name = CASE
    WHEN display_name IS NULL THEN NULL
    WHEN position(' ' in display_name) = 0 THEN NULL
    ELSE substring(display_name from position(' ' in display_name) + 1)
  END;

-- Create indexes for the new columns
CREATE INDEX idx_users_first_name ON users(first_name);
CREATE INDEX idx_users_last_name ON users(last_name); 
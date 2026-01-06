-- Add test_mode_authorized column to users table
-- This allows specific users to bypass quota restrictions for testing purposes

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS test_mode_authorized BOOLEAN DEFAULT FALSE NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN users.test_mode_authorized IS 'Allows user to bypass quota restrictions when X-Test-Mode header is true. For authorized test users only.';

-- Create index for faster lookups (test mode checks happen on every story creation)
CREATE INDEX IF NOT EXISTS idx_users_test_mode_authorized ON users(test_mode_authorized) WHERE test_mode_authorized = TRUE;

-- Add to RLS policies (test mode users still need proper authentication)
-- No special RLS needed - column is just a flag, not sensitive data


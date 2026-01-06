-- Fix refresh_tokens RLS policy to allow service role inserts
-- Per Phase 12: Fix runtime errors

-- Create refresh_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Enable RLS on refresh tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS refresh_tokens_service_role_policy ON refresh_tokens;

-- Create base RLS policy for users if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'refresh_tokens' 
    AND policyname = 'refresh_tokens_policy'
  ) THEN
    CREATE POLICY refresh_tokens_policy ON refresh_tokens
      FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- Allow service role to insert refresh tokens (for AuthAgent)
CREATE POLICY refresh_tokens_service_role_policy ON refresh_tokens
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Verify policy exists
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'refresh_tokens' 
AND policyname = 'refresh_tokens_service_role_policy';

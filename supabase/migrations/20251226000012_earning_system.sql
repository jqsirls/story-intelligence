-- PLG Earning System Migration
-- Implements 2 base + earn 3 + unlimited invites model

-- Earning tracking columns on users table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='available_story_credits') THEN
    ALTER TABLE public.users 
    ADD COLUMN available_story_credits DECIMAL DEFAULT 2.0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='profile_completed') THEN
    ALTER TABLE public.users 
    ADD COLUMN profile_completed BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='users' AND column_name='smart_home_connected') THEN
    ALTER TABLE public.users 
    ADD COLUMN smart_home_connected BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Earning history ledger
CREATE TABLE IF NOT EXISTS story_credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credit_type TEXT CHECK (credit_type IN ('base', 'profile_complete', 'smart_home_connect', 'referral_accepted')) NOT NULL,
  amount DECIMAL NOT NULL CHECK (amount > 0),
  source_id UUID,  -- invite_id for referrals
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_credits_ledger_user ON story_credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_type ON story_credits_ledger(credit_type);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_earned_at ON story_credits_ledger(earned_at);

-- Enable RLS
ALTER TABLE story_credits_ledger ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own credit ledger
DROP POLICY IF EXISTS credits_own_records ON story_credits_ledger;
CREATE POLICY credits_own_records ON story_credits_ledger
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: System can insert (via service role)
DROP POLICY IF EXISTS credits_system_insert ON story_credits_ledger;
CREATE POLICY credits_system_insert ON story_credits_ledger
  FOR INSERT WITH CHECK (true);  -- Service role bypasses RLS

-- Initialize existing users with 2.0 base credits if they don't have any
UPDATE users
SET available_story_credits = 2.0
WHERE available_story_credits IS NULL;

-- Create base credit ledger entries for existing users (one-time)
INSERT INTO story_credits_ledger (user_id, credit_type, amount, notes)
SELECT id, 'base', 2.0, 'Initial base credits for existing user'
FROM users
WHERE id NOT IN (
  SELECT DISTINCT user_id FROM story_credits_ledger WHERE credit_type = 'base'
)
ON CONFLICT DO NOTHING;


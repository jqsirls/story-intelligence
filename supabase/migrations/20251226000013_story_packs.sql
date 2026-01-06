-- Story Packs Migration
-- Allows users to purchase one-time story packs

CREATE TABLE IF NOT EXISTS story_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pack_type TEXT CHECK (pack_type IN ('5_pack', '10_pack', '25_pack')) NOT NULL,
  stories_remaining INTEGER NOT NULL CHECK (stories_remaining >= 0),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_story_packs_user ON story_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_story_packs_remaining ON story_packs(user_id, stories_remaining) WHERE stories_remaining > 0;
CREATE INDEX IF NOT EXISTS idx_story_packs_expires ON story_packs(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE story_packs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own story packs
DROP POLICY IF EXISTS story_packs_own_records ON story_packs;
CREATE POLICY story_packs_own_records ON story_packs
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: System can insert/update (via service role)
DROP POLICY IF EXISTS story_packs_system_modify ON story_packs;
CREATE POLICY story_packs_system_modify ON story_packs
  FOR ALL USING (true) WITH CHECK (true);

-- Function to deduct story pack credit
CREATE OR REPLACE FUNCTION deduct_story_pack_credit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pack_record RECORD;
BEGIN
  -- Find the first non-expired pack with remaining stories
  SELECT * INTO pack_record
  FROM story_packs
  WHERE user_id = p_user_id
    AND stories_remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY purchased_at ASC
  LIMIT 1;
  
  IF pack_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct one story
  UPDATE story_packs
  SET stories_remaining = stories_remaining - 1,
      updated_at = NOW()
  WHERE id = pack_record.id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get total available pack credits
CREATE OR REPLACE FUNCTION get_total_pack_credits(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_credits INTEGER;
BEGIN
  SELECT COALESCE(SUM(stories_remaining), 0) INTO total_credits
  FROM story_packs
  WHERE user_id = p_user_id
    AND stories_remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN total_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Deletion System Migration
-- Created: 2025-01-01
-- Description: Adds tables for account deletion, hibernation, and inactivity monitoring

-- 1. User Tiers Table
CREATE TABLE IF NOT EXISTS user_tiers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free_never_paid', 'former_paid', 'current_paid', 'institutional')),
  tier_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_engagement_at TIMESTAMPTZ, -- Email opens/clicks
  inactivity_warnings_sent INT DEFAULT 0,
  next_warning_at TIMESTAMPTZ,
  hibernation_eligible BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for user_tiers
ALTER TABLE user_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tier info"
  ON user_tiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user_tiers"
  ON user_tiers FOR ALL
  USING (auth.role() = 'service_role');

-- 2. Deletion Requests Table
CREATE TABLE IF NOT EXISTS deletion_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deletion_type TEXT NOT NULL CHECK (deletion_type IN ('account', 'story', 'character', 'library_member', 'conversation_assets')),
  target_id UUID NOT NULL, -- UUID of the item to delete (or user_id for account)
  reason TEXT,
  immediate BOOLEAN DEFAULT FALSE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('pending', 'scheduled', 'processing', 'completed', 'cancelled', 'failed', 'hibernated')),
  metadata JSONB,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for deletion_requests
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deletion requests"
  ON deletion_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests"
  ON deletion_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel their pending deletion requests"
  ON deletion_requests FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'pending'); -- Only allow update if pending (e.g. to cancel) - logic enforced in service usually, but good to have RLS

CREATE POLICY "Service role can manage deletion_requests"
  ON deletion_requests FOR ALL
  USING (auth.role() = 'service_role');

-- Key Indices
CREATE INDEX IF NOT EXISTS idx_deletion_requests_user_id ON deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled_at ON deletion_requests(scheduled_deletion_at);


-- 3. Deletion Audit Log
CREATE TABLE IF NOT EXISTS deletion_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_user_id UUID, -- distinct from FK because user might be deleted
  entity_type TEXT NOT NULL,
  entity_id UUID,
  deletion_type TEXT NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB -- store anonymized info or reason
);

ALTER TABLE deletion_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage deletion_audit_log"
  ON deletion_audit_log FOR ALL
  USING (auth.role() = 'service_role');


-- 4. Email Engagement Tracking
CREATE TABLE IF NOT EXISTS email_engagement_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  message_id TEXT, -- SES/SendGrid Message ID
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

ALTER TABLE email_engagement_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage email_engagement_tracking"
  ON email_engagement_tracking FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_email_tracking_user_id ON email_engagement_tracking(user_id);


-- 5. Hibernated Accounts
CREATE TABLE IF NOT EXISTS hibernated_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  original_tier TEXT,
  glacier_archive_id TEXT,
  hibernated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data_size_bytes BIGINT,
  restoration_requested_at TIMESTAMPTZ,
  status TEXT DEFAULT 'hibernated' CHECK (status IN ('hibernated', 'restoring', 'restored'))
);

ALTER TABLE hibernated_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage hibernated_accounts"
  ON hibernated_accounts FOR ALL
  USING (auth.role() = 'service_role');


-- 6. Add columns to existing tables (Idempotent)
DO $$
BEGIN
    -- media_assets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'deleted_at') THEN
        ALTER TABLE media_assets ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'deletion_request_id') THEN
        ALTER TABLE media_assets ADD COLUMN deletion_request_id UUID REFERENCES deletion_requests(request_id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_assets' AND column_name = 'glacier_archive_id') THEN
        ALTER TABLE media_assets ADD COLUMN glacier_archive_id TEXT;
    END IF;

    -- users (Note: supabase 'users' table is in 'auth' schema and managed by supabase. 
    -- We generally shouldn't alter auth.users directly if possible, but use a public profile table. 
    -- However, the plan specifically asks for `users` table modification. 
    -- Assuming this refers to a public 'users' table if it exists, OR we create a public profile extension. 
    -- Typically Supabase setups have `public.profiles` or `public.users`.
    -- I will assume `public.users` references `auth.users` based on common patterns or check if it exists. 
    -- For safety, I will check if 'public.users' exists. If not, I'll assume we should use `user_tiers` for this data or `public.profiles`.
    -- The request says: "users: Add subscription_tier, first_paid_at, hibernated_at".
    -- I will check existence first in a separate block or blindly alter if it's the pattern.)
    
    -- Checking public.users
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'subscription_tier') THEN
            ALTER TABLE public.users ADD COLUMN subscription_tier TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_paid_at') THEN
            ALTER TABLE public.users ADD COLUMN first_paid_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'hibernated_at') THEN
            ALTER TABLE public.users ADD COLUMN hibernated_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- 7. Deletion Audit Log Function
CREATE OR REPLACE FUNCTION log_deletion_audit(
  p_deletion_request_id UUID,
  p_deletion_type TEXT,
  p_user_id UUID,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
BEGIN
  -- Determine entity type and ID based on deletion type
  CASE p_deletion_type
    WHEN 'account' THEN
      v_entity_type := 'user';
      v_entity_id := p_user_id;
    WHEN 'story' THEN
      v_entity_type := 'story';
      -- Get story ID from deletion_request if available
      SELECT target_id INTO v_entity_id
      FROM deletion_requests
      WHERE request_id = p_deletion_request_id;
    WHEN 'character' THEN
      v_entity_type := 'character';
      -- Get character ID from deletion_request if available
      SELECT target_id INTO v_entity_id
      FROM deletion_requests
      WHERE request_id = p_deletion_request_id;
    ELSE
      v_entity_type := p_deletion_type;
      v_entity_id := NULL;
  END CASE;

  -- Insert audit log entry
  INSERT INTO deletion_audit_log (
    original_user_id,
    entity_type,
    entity_id,
    deletion_type,
    metadata
  ) VALUES (
    p_user_id,
    v_entity_type,
    v_entity_id,
    p_deletion_type,
    jsonb_build_object(
      'action', p_action,
      'deletion_request_id', p_deletion_request_id,
      'metadata', p_metadata
    )
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

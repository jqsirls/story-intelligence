-- Migration: REST API Asset Tracking, Notifications, and Jobs
-- Version: 6.0.0
-- Purpose: Support progressive asset loading, notification center, and asset generation tracking

-- ============================================================================
-- STORIES TABLE ENHANCEMENTS
-- ============================================================================

-- Add granular asset tracking to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS asset_generation_status JSONB DEFAULT '{
  "overall": "pending",
  "assets": {}
}'::jsonb;

ALTER TABLE stories ADD COLUMN IF NOT EXISTS asset_generation_started_at TIMESTAMPTZ;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS asset_generation_completed_at TIMESTAMPTZ;

-- Audio fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS webvtt_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audio_duration NUMERIC;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS audio_voice_id TEXT;

-- Art fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS cover_art_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS scene_art_urls TEXT[];
ALTER TABLE stories ADD COLUMN IF NOT EXISTS color_palettes JSONB;

-- Activity fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS activities JSONB;

-- PDF fields  
ALTER TABLE stories ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS pdf_pages INTEGER;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS pdf_file_size BIGINT;

-- QR fields
ALTER TABLE stories ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS qr_public_url TEXT;
ALTER TABLE stories ADD COLUMN IF NOT EXISTS qr_scan_count INTEGER DEFAULT 0;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_asset_status ON stories 
  USING GIN (asset_generation_status);
CREATE INDEX IF NOT EXISTS idx_stories_creator_status ON stories (creator_user_id, status);
CREATE INDEX IF NOT EXISTS idx_stories_library_created ON stories (library_id, created_at DESC);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'story_ready', 'asset_ready', 'story_shared',
    'library_invite', 'transfer_request', 'permission_granted',
    'subscription_update', 'activity_suggestion', 'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications (user_id, type);

-- RLS for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_policy ON notifications;
CREATE POLICY notifications_select_policy ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_insert_policy ON notifications;
CREATE POLICY notifications_insert_policy ON notifications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS notifications_update_policy ON notifications;
CREATE POLICY notifications_update_policy ON notifications
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete_policy ON notifications;
CREATE POLICY notifications_delete_policy ON notifications
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- ASSET GENERATION JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS asset_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'audio', 'webvtt', 'cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4',
    'activities', 'pdf', 'qr', 'color_palettes', 'music', 'sfx'
  )),
  status TEXT NOT NULL CHECK (status IN ('queued', 'generating', 'ready', 'failed', 'canceled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  cost NUMERIC(10,4),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for asset jobs
CREATE INDEX IF NOT EXISTS idx_asset_jobs_story ON asset_generation_jobs (story_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_jobs_status ON asset_generation_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_asset_jobs_type ON asset_generation_jobs (asset_type, status);

-- ============================================================================
-- PUSH DEVICE TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  device_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_token)
);

-- Indexes for push tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_device_tokens (user_id, enabled);

-- RLS for push tokens
ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_tokens_policy ON push_device_tokens;
CREATE POLICY push_tokens_policy ON push_device_tokens
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- USER HUE SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_hue_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  connected BOOLEAN DEFAULT FALSE,
  access_token TEXT,
  refresh_token TEXT,
  bridge_ip TEXT,
  selection_type TEXT CHECK (selection_type IN ('room', 'zone')),
  selection_id TEXT,
  selection_name TEXT,
  intensity TEXT DEFAULT 'regular' CHECK (intensity IN ('off', 'light', 'regular', 'bold')),
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for hue settings
ALTER TABLE user_hue_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hue_settings_policy ON user_hue_settings;
CREATE POLICY hue_settings_policy ON user_hue_settings
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- STORY TRANSFERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS story_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  from_library_id UUID NOT NULL,
  to_library_id UUID NOT NULL,
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  transfer_type TEXT DEFAULT 'move' CHECK (transfer_type IN ('move', 'copy')),
  transfer_message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  response_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transfers
CREATE INDEX IF NOT EXISTS idx_transfers_from_user ON story_transfers (from_user_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_to_user ON story_transfers (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_story ON story_transfers (story_id);

-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('friend', 'library')),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  to_email TEXT NOT NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  library_id UUID,
  role TEXT CHECK (role IN ('Viewer', 'Editor', 'Admin')),
  invite_code TEXT NOT NULL UNIQUE,
  invite_url TEXT,
  personal_message TEXT,
  discount_percentage INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'canceled')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for invitations (only if columns exist - table may have different schema)
DO $$
BEGIN
  -- Check if from_user_id column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' 
    AND column_name = 'from_user_id'
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_invitations_from_user ON invitations (from_user_id, status);
  END IF;
  
  -- Check if to_email column exists (new schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' 
    AND column_name = 'to_email'
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_invitations_to_email ON invitations (to_email, status);
  END IF;
  
  -- Check if email column exists (existing organization schema)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' 
    AND column_name = 'email'
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email, status);
  END IF;
  
  -- Check if invite_code column exists before creating index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invitations' 
    AND column_name = 'invite_code'
    AND table_schema = 'public'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations (invite_code);
  END IF;
END $$;

-- ============================================================================
-- AFFILIATE ACCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  referral_code TEXT NOT NULL UNIQUE,
  tracking_link TEXT NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('stripe', 'paypal')),
  payment_account_id TEXT,
  tax_info JSONB,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  pending_earnings NUMERIC(10,2) DEFAULT 0,
  paid_earnings NUMERIC(10,2) DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  converted_referrals INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for affiliates
ALTER TABLE affiliate_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS affiliate_policy ON affiliate_accounts;
CREATE POLICY affiliate_policy ON affiliate_accounts
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- AFFILIATE REFERRALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID REFERENCES affiliate_accounts(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referred_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'converted', 'churned')),
  signup_date TIMESTAMPTZ,
  conversion_date TIMESTAMPTZ,
  revenue_generated NUMERIC(10,2) DEFAULT 0,
  commission_earned NUMERIC(10,2) DEFAULT 0,
  commission_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_affiliate ON affiliate_referrals (affiliate_id, status);

-- ============================================================================
-- QR CODE ANALYTICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_code_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_hash TEXT,
  referrer TEXT
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_qr_analytics_story ON qr_code_analytics (story_id, scanned_at DESC);

-- ============================================================================
-- FUNCTIONS FOR NOTIFICATION CREATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION TO UPDATE ASSET STATUS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_asset_status(
  p_story_id UUID,
  p_asset_type TEXT,
  p_status TEXT,
  p_url TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Update the asset_generation_status JSONB
  -- Note: stories table doesn't have updated_at column, so we only update asset_generation_status
  UPDATE stories
  SET 
    asset_generation_status = jsonb_set(
      COALESCE(asset_generation_status, '{"overall": "pending", "assets": {}}'::jsonb),
      ARRAY['assets', p_asset_type],
      jsonb_build_object('status', p_status, 'url', p_url, 'updatedAt', NOW())
    )
  WHERE id = p_story_id;
  
  -- Check if all assets are complete
  IF NOT EXISTS (
    SELECT 1 FROM asset_generation_jobs 
    WHERE story_id = p_story_id 
    AND status IN ('queued', 'generating')
  ) THEN
    UPDATE stories
    SET 
      asset_generation_status = jsonb_set(
        COALESCE(asset_generation_status, '{"overall": "pending", "assets": {}}'::jsonb),
        '{overall}',
        '"complete"'
      ),
      asset_generation_completed_at = NOW()
    WHERE id = p_story_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER FOR STORY COMPLETION NOTIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_story_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_library_owner UUID;
BEGIN
  -- When overall status changes to complete, create notification
  -- Handle NULL asset_generation_status gracefully
  IF (NEW.asset_generation_status IS NOT NULL 
      AND NEW.asset_generation_status->>'overall' = 'complete' 
      AND (OLD.asset_generation_status IS NULL OR OLD.asset_generation_status->>'overall' != 'complete')) THEN
    -- Get library owner (stories belong to libraries, not directly to users)
    SELECT owner INTO v_library_owner
    FROM libraries
    WHERE id = NEW.library_id;
    
    -- Only create notification if we found the library owner
    IF v_library_owner IS NOT NULL THEN
      PERFORM create_notification(
        v_library_owner,
        'story_ready',
        'Your story is ready!',
        format('"%s" is complete with all assets.', NEW.title),
        jsonb_build_object(
          'storyId', NEW.id,
          'title', NEW.title,
          'coverUrl', COALESCE(NEW.cover_art_url, '')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS story_complete_notification ON stories;
CREATE TRIGGER story_complete_notification
  AFTER UPDATE OF asset_generation_status ON stories
  FOR EACH ROW
  EXECUTE FUNCTION notify_story_complete();

-- ============================================================================
-- ENABLE REALTIME FOR PROGRESSIVE LOADING
-- ============================================================================

-- Enable realtime for stories table (for asset updates)
-- Note: This may fail if table is already in publication or publication doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE stories;
    EXCEPTION
      WHEN duplicate_object THEN NULL; -- Table already in publication
    END;
  END IF;
END $$;

-- Enable realtime for notifications table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    EXCEPTION
      WHEN duplicate_object THEN NULL; -- Table already in publication
    END;
  END IF;
END $$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions only if tables exist (they may have been created with different schemas)
DO $$
BEGIN
  -- Notifications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
  END IF;
  
  -- Asset generation jobs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'asset_generation_jobs' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE ON asset_generation_jobs TO authenticated;
  END IF;
  
  -- Push device tokens
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_device_tokens' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON push_device_tokens TO authenticated;
  END IF;
  
  -- User hue settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_hue_settings' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_hue_settings TO authenticated;
  END IF;
  
  -- Story transfers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'story_transfers' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE ON story_transfers TO authenticated;
  END IF;
  
  -- Invitations (may have different schema)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE ON invitations TO authenticated;
  END IF;
  
  -- Affiliate accounts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_accounts' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT, UPDATE ON affiliate_accounts TO authenticated;
  END IF;
  
  -- Affiliate referrals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_referrals' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT ON affiliate_referrals TO authenticated;
  END IF;
  
  -- QR code analytics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qr_code_analytics' AND table_schema = 'public') THEN
    GRANT SELECT, INSERT ON qr_code_analytics TO authenticated;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE notifications IS 'In-app notification center for story completion, transfers, etc.';
COMMENT ON TABLE asset_generation_jobs IS 'Tracks individual asset generation progress for progressive loading';
COMMENT ON TABLE push_device_tokens IS 'Device tokens for mobile and web push notifications';
COMMENT ON TABLE user_hue_settings IS 'Philips Hue integration settings per user';
COMMENT ON TABLE story_transfers IS 'Story transfer requests between libraries';
COMMENT ON TABLE invitations IS 'Friend and library invitation tracking';
COMMENT ON TABLE affiliate_accounts IS 'Affiliate program accounts and earnings';
COMMENT ON TABLE affiliate_referrals IS 'Individual referral tracking for affiliates';
COMMENT ON TABLE qr_code_analytics IS 'QR code scan analytics for stories';

COMMENT ON COLUMN stories.asset_generation_status IS 'JSONB tracking status of each asset: {overall, assets: {audio: {status, url}, ...}}';
COMMENT ON COLUMN stories.color_palettes IS 'Extracted color palettes for Hue integration: {cover: [...], scenes: [[...], ...]}';
COMMENT ON COLUMN stories.activities IS 'JSON array of 3 activities: 2 fun + 1 user-context specific';


-- Smart Home Integration Database Schema
-- Platform-agnostic smart home device management with automated token refresh

-- Enhanced smart home devices table with platform support
CREATE TABLE smart_home_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_type TEXT NOT NULL, -- 'philips_hue', 'nanoleaf', 'lifx', etc.
  device_id_hash TEXT NOT NULL, -- Hashed device ID for privacy
  device_name TEXT NOT NULL,
  room_id TEXT NOT NULL,
  room_name TEXT,
  platform TEXT DEFAULT 'alexa_plus', -- 'alexa_plus', 'google_assistant', 'apple_siri'
  platform_capabilities TEXT[] DEFAULT '{}',
  connection_status TEXT DEFAULT 'disconnected', -- 'connected', 'disconnected', 'error'
  consent_given BOOLEAN DEFAULT FALSE,
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_scope JSONB DEFAULT '{}',
  data_retention_preference TEXT DEFAULT 'minimal',
  device_metadata JSONB DEFAULT '{}', -- Encrypted device-specific data
  connected_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  token_expires_at TIMESTAMPTZ,
  last_token_refresh TIMESTAMPTZ,
  refresh_attempts INTEGER DEFAULT 0,
  token_status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') -- Auto-cleanup inactive devices
);

-- Device token storage with encryption
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  device_type TEXT NOT NULL,
  encrypted_token TEXT NOT NULL,
  token_type TEXT NOT NULL, -- 'access_token', 'hue_username', 'oauth2', etc.
  expires_at TIMESTAMPTZ,
  refresh_token_encrypted TEXT,
  last_refreshed TIMESTAMPTZ DEFAULT NOW(),
  refresh_attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'revoked'
  encryption_key_id TEXT NOT NULL, -- For key rotation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- IoT consent tracking
CREATE TABLE iot_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  consent_scope JSONB NOT NULL,
  consent_method TEXT NOT NULL, -- 'voice', 'app', 'web', 'parental'
  parent_consent BOOLEAN DEFAULT FALSE,
  consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
  withdrawal_timestamp TIMESTAMPTZ,
  withdrawal_method TEXT,
  legal_basis TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Minimal connection logging (24-hour retention)
CREATE TABLE device_connection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES smart_home_devices NOT NULL,
  action TEXT NOT NULL, -- 'connect', 'disconnect', 'lighting_change', 'token_refresh'
  success BOOLEAN NOT NULL,
  error_message TEXT,
  platform TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Story lighting profiles
CREATE TABLE story_lighting_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_type TEXT NOT NULL,
  profile_name TEXT NOT NULL,
  base_profile JSONB NOT NULL, -- { brightness, color, saturation }
  narrative_events JSONB DEFAULT '{}', -- Event-specific lighting changes
  age_appropriate JSONB NOT NULL, -- Age-based restrictions
  platform_compatibility TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_type, profile_name)
);

-- Platform-specific user sessions (enhanced)
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'alexa_plus';
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS platform_capabilities TEXT[] DEFAULT '{}';
ALTER TABLE auth_sessions ADD COLUMN IF NOT EXISTS smart_home_enabled BOOLEAN DEFAULT FALSE;

-- Multi-platform consent tracking (enhanced)
DO $$
BEGIN
  IF to_regclass('public.consent_records') IS NOT NULL THEN
    ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS platform TEXT;
    ALTER TABLE public.consent_records ADD COLUMN IF NOT EXISTS platform_specific_data JSONB DEFAULT '{}';
  ELSE
    RAISE NOTICE 'public.consent_records not present; skipping consent_records platform columns';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX idx_smart_home_devices_user_id ON smart_home_devices(user_id);
CREATE INDEX idx_smart_home_devices_platform ON smart_home_devices(platform);
CREATE INDEX idx_smart_home_devices_expires_at ON smart_home_devices(expires_at);
CREATE INDEX idx_smart_home_devices_token_status ON smart_home_devices(token_status);
CREATE INDEX idx_device_tokens_user_device ON device_tokens(user_id, device_id);
CREATE INDEX idx_device_tokens_expires_at ON device_tokens(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_device_tokens_status ON device_tokens(status);
CREATE INDEX idx_iot_consent_records_user_device ON iot_consent_records(user_id, device_id);
CREATE INDEX idx_device_connection_logs_expires_at ON device_connection_logs(expires_at);
CREATE INDEX idx_story_lighting_profiles_story_type ON story_lighting_profiles(story_type);
CREATE INDEX idx_auth_sessions_platform ON auth_sessions(platform);

-- Enable RLS on new tables
ALTER TABLE smart_home_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_lighting_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY smart_home_devices_policy ON smart_home_devices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY device_tokens_policy ON device_tokens
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM smart_home_devices shd 
      WHERE shd.id = device_id AND shd.user_id = auth.uid()
    )
  );

CREATE POLICY iot_consent_records_policy ON iot_consent_records
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY device_connection_logs_policy ON device_connection_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM smart_home_devices shd 
      WHERE shd.id = device_id AND shd.user_id = auth.uid()
    )
  );

CREATE POLICY story_lighting_profiles_read ON story_lighting_profiles
  FOR SELECT USING (true); -- Public read for lighting profiles

-- Insert default story lighting profiles
INSERT INTO story_lighting_profiles (story_type, profile_name, base_profile, narrative_events, age_appropriate, platform_compatibility) VALUES
('Bedtime', 'default', 
  '{"brightness": 20, "color": "#FF9500", "saturation": 60}',
  '{"peaceful_moment": {"color": "#FFB347", "brightness": 15, "transition": 3000}, "gentle_adventure": {"color": "#87CEEB", "brightness": 25, "transition": 2000}, "story_end": {"brightness": 5, "transition": 10000}}',
  '{"brightness": {"min": 5, "max": 30}, "colorRestrictions": ["no_red", "no_bright_blue"], "transitionSpeed": "gentle"}',
  ARRAY['alexa_plus', 'google_assistant', 'apple_siri']
),
('Adventure', 'default',
  '{"brightness": 70, "color": "#32CD32", "saturation": 80}',
  '{"exciting_moment": {"color": "#FFD700", "brightness": 85, "transition": 1000}, "mysterious_scene": {"color": "#9370DB", "brightness": 40, "transition": 2000}, "victory_moment": {"color": "#00FF00", "brightness": 90, "transition": 500}}',
  '{"brightness": {"min": 40, "max": 90}, "colorRestrictions": [], "transitionSpeed": "dynamic"}',
  ARRAY['alexa_plus', 'google_assistant', 'apple_siri']
),
('Educational', 'default',
  '{"brightness": 80, "color": "#87CEEB", "saturation": 70}',
  '{"discovery_moment": {"color": "#FFD700", "brightness": 85, "transition": 1500}, "thinking_pause": {"brightness": 60, "transition": 2000}, "achievement": {"color": "#32CD32", "brightness": 90, "transition": 1000}}',
  '{"brightness": {"min": 60, "max": 90}, "colorRestrictions": [], "transitionSpeed": "moderate"}',
  ARRAY['alexa_plus', 'google_assistant', 'apple_siri']
),
('Mental Health', 'calming',
  '{"brightness": 40, "color": "#E6E6FA", "saturation": 50}',
  '{"calming_moment": {"color": "#DDA0DD", "brightness": 30, "transition": 4000}, "reassurance": {"color": "#98FB98", "brightness": 45, "transition": 3000}, "confidence_building": {"color": "#F0E68C", "brightness": 50, "transition": 2000}}',
  '{"brightness": {"min": 20, "max": 60}, "colorRestrictions": ["no_red", "no_orange"], "transitionSpeed": "gentle"}',
  ARRAY['alexa_plus', 'google_assistant', 'apple_siri']
);

-- Functions for token management
CREATE OR REPLACE FUNCTION cleanup_expired_device_tokens()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired tokens
  UPDATE device_tokens 
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND status = 'active';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Clean up old expired tokens (keep for 30 days for audit)
  DELETE FROM device_tokens 
  WHERE status = 'expired' 
  AND updated_at < NOW() - INTERVAL '30 days';
  
  -- Clean up expired connection logs
  DELETE FROM device_connection_logs 
  WHERE expires_at < NOW();
  
  -- Clean up inactive devices
  DELETE FROM smart_home_devices 
  WHERE expires_at < NOW() 
  AND connection_status = 'disconnected';
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate smart home consent
CREATE OR REPLACE FUNCTION validate_smart_home_consent(
  p_user_id UUID,
  p_device_type TEXT,
  p_platform TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_age INTEGER;
  has_consent BOOLEAN := FALSE;
BEGIN
  -- Get user age
  SELECT age INTO user_age FROM users WHERE id = p_user_id;
  
  -- Check if user has valid consent for smart home integration
  SELECT EXISTS (
    SELECT 1 FROM iot_consent_records icr
    JOIN smart_home_devices shd ON icr.device_id = shd.id
    WHERE icr.user_id = p_user_id
    AND shd.device_type = p_device_type
    AND icr.platform = p_platform
    AND icr.consent_scope->>'basicLighting' = 'true'
    AND icr.withdrawal_timestamp IS NULL
    AND (
      user_age >= 13 OR 
      (user_age < 13 AND icr.parent_consent = TRUE)
    )
  ) INTO has_consent;
  
  RETURN has_consent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log smart home actions for audit
CREATE OR REPLACE FUNCTION log_smart_home_action(
  p_user_id UUID,
  p_device_id UUID,
  p_action TEXT,
  p_success BOOLEAN,
  p_platform TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO device_connection_logs (
    device_id, action, success, error_message, platform, session_id
  )
  VALUES (
    p_device_id, p_action, p_success, p_error_message, p_platform, p_session_id
  )
  RETURNING id INTO log_id;
  
  -- Also log in main audit log for compliance
  PERFORM log_audit_event_enhanced(
    'SmartHomeAgent',
    p_action,
    jsonb_build_object(
      'deviceId', p_device_id,
      'success', p_success,
      'platform', p_platform,
      'errorMessage', p_error_message
    ),
    p_session_id,
    NULL, -- correlation_id
    NULL, -- ip_address
    NULL  -- user_agent
  );
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_device_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION validate_smart_home_consent(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_smart_home_action(UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;

-- Schedule cleanup job (would be set up in production)
-- SELECT cron.schedule('cleanup-smart-home-tokens', '0 */6 * * *', 'SELECT cleanup_expired_device_tokens();');
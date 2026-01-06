-- AuthAgent specific tables for OAuth 2.0 voice-forward flow
-- This migration adds tables needed for the AuthAgent implementation

-- Refresh tokens table for JWT token management
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Enable RLS on refresh tokens table
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policy for refresh tokens - users can only access their own tokens
CREATE POLICY refresh_tokens_policy ON refresh_tokens
  FOR ALL USING (user_id = auth.uid());

-- Function to increment voice code attempts (referenced in voice-code service)
CREATE OR REPLACE FUNCTION increment_attempts()
RETURNS INTEGER AS $$
BEGIN
  RETURN 1; -- This will be used in an UPDATE with attempts = attempts + increment_attempts()
END;
$$ LANGUAGE plpgsql;

-- Enhanced function for voice code cleanup with better performance
CREATE OR REPLACE FUNCTION cleanup_voice_codes()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired voice codes
  DELETE FROM voice_codes 
  WHERE expires_at < NOW() OR used = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced function for refresh token cleanup
CREATE OR REPLACE FUNCTION cleanup_refresh_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired or revoked refresh tokens
  DELETE FROM refresh_tokens 
  WHERE expires_at < NOW() OR revoked = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all refresh tokens for a user (for security)
CREATE OR REPLACE FUNCTION revoke_user_tokens(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE refresh_tokens 
  SET revoked = TRUE 
  WHERE user_id = p_user_id AND revoked = FALSE;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log the revocation event
  PERFORM log_audit_event_enhanced(
    'AuthAgent',
    'tokens_revoked',
    jsonb_build_object('user_id', p_user_id, 'revoked_count', revoked_count)
  );
  
  RETURN revoked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active token count for a user (for monitoring)
CREATE OR REPLACE FUNCTION get_user_active_tokens(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  token_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO token_count
  FROM refresh_tokens
  WHERE user_id = p_user_id 
    AND revoked = FALSE 
    AND expires_at > NOW();
  
  RETURN token_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add rate limiting support table for AuthAgent
CREATE TABLE auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  action TEXT NOT NULL, -- 'account_linking', 'voice_verification', etc.
  attempts INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for rate limiting
CREATE INDEX idx_auth_rate_limits_identifier_action ON auth_rate_limits(identifier, action);
CREATE INDEX idx_auth_rate_limits_expires_at ON auth_rate_limits(expires_at);

-- Enable RLS on rate limits table
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS policy for rate limits - only service role can access
CREATE POLICY auth_rate_limits_policy ON auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Function to check and update rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_action TEXT,
  p_max_attempts INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Clean up expired rate limit entries first
  DELETE FROM auth_rate_limits WHERE expires_at < NOW();
  
  -- Get current attempts within the window
  SELECT attempts, window_start INTO current_attempts, window_start
  FROM auth_rate_limits
  WHERE identifier = p_identifier 
    AND action = p_action
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no existing record or window expired, create new one
  IF current_attempts IS NULL THEN
    INSERT INTO auth_rate_limits (
      identifier, 
      action, 
      attempts, 
      window_start,
      expires_at
    ) VALUES (
      p_identifier,
      p_action,
      1,
      NOW(),
      NOW() + (p_window_seconds || ' seconds')::INTERVAL
    );
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF current_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Increment attempts
  UPDATE auth_rate_limits
  SET attempts = attempts + 1
  WHERE identifier = p_identifier 
    AND action = p_action
    AND expires_at > NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset rate limit for a user (admin function)
CREATE OR REPLACE FUNCTION reset_rate_limit(
  p_identifier TEXT,
  p_action TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM auth_rate_limits
  WHERE identifier = p_identifier 
    AND action = p_action;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add session tracking table for better security
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  alexa_person_id TEXT,
  device_type TEXT CHECK (device_type IN ('voice', 'screen')),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for auth sessions
CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_session_token ON auth_sessions(session_token);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_auth_sessions_alexa_person_id ON auth_sessions(alexa_person_id) WHERE alexa_person_id IS NOT NULL;

-- Enable RLS on auth sessions table
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policy for auth sessions - users can only access their own sessions
CREATE POLICY auth_sessions_policy ON auth_sessions
  FOR ALL USING (user_id = auth.uid());

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_auth_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired sessions
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke all sessions for a user
CREATE OR REPLACE FUNCTION revoke_user_sessions(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the session revocation
  PERFORM log_audit_event_enhanced(
    'AuthAgent',
    'sessions_revoked',
    jsonb_build_object('user_id', p_user_id, 'revoked_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the data retention policies to include new tables
INSERT INTO data_retention_policies (table_name, retention_period, deletion_strategy) VALUES
('refresh_tokens', INTERVAL '14 days', 'hard_delete'),
('auth_rate_limits', INTERVAL '1 day', 'hard_delete'),
('auth_sessions', INTERVAL '24 hours', 'hard_delete')
ON CONFLICT (table_name) DO UPDATE SET
  retention_period = EXCLUDED.retention_period,
  deletion_strategy = EXCLUDED.deletion_strategy;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_attempts() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_voice_codes() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_refresh_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION revoke_user_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_active_tokens(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION reset_rate_limit(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_auth_sessions() TO service_role;
GRANT EXECUTE ON FUNCTION revoke_user_sessions(UUID) TO authenticated;
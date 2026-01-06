-- Voice synthesis tables for the voice synthesis package
-- This migration adds tables needed for voice cloning, consent management, and metrics

-- Voice clones table for managing custom voices
CREATE TABLE voice_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  voice_id TEXT UNIQUE NOT NULL, -- ElevenLabs voice ID
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('processing', 'ready', 'failed')) DEFAULT 'processing',
  parent_consent_id UUID NOT NULL,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for voice clones
CREATE INDEX idx_voice_clones_user_id ON voice_clones(user_id);
CREATE INDEX idx_voice_clones_voice_id ON voice_clones(voice_id);
CREATE INDEX idx_voice_clones_status ON voice_clones(status);
CREATE INDEX idx_voice_clones_revoked_at ON voice_clones(revoked_at) WHERE revoked_at IS NULL;

-- Enable RLS on voice clones table
ALTER TABLE voice_clones ENABLE ROW LEVEL SECURITY;

-- RLS policy for voice clones - users can only access their own clones
CREATE POLICY voice_clones_policy ON voice_clones
  FOR ALL USING (user_id = auth.uid());

-- Parental consents table for COPPA compliance
CREATE TABLE parental_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  parent_email TEXT NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('voice_cloning', 'data_collection', 'marketing')),
  status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'revoked')) DEFAULT 'pending',
  consent_document_url TEXT, -- Signed consent document
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for parental consents
CREATE INDEX idx_parental_consents_user_id ON parental_consents(user_id);
CREATE INDEX idx_parental_consents_parent_email ON parental_consents(parent_email);
CREATE INDEX idx_parental_consents_type_status ON parental_consents(consent_type, status);
CREATE INDEX idx_parental_consents_expires_at ON parental_consents(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS on parental consents table
ALTER TABLE parental_consents ENABLE ROW LEVEL SECURITY;

-- RLS policy for parental consents - users can only access their own consents
CREATE POLICY parental_consents_policy ON parental_consents
  FOR ALL USING (user_id = auth.uid());

-- Voice synthesis metrics table for performance tracking
CREATE TABLE voice_synthesis_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  engine TEXT NOT NULL CHECK (engine IN ('elevenlabs', 'polly')),
  request_type TEXT NOT NULL CHECK (request_type IN ('stream', 'longform')),
  text_length INTEGER NOT NULL,
  language TEXT NOT NULL,
  emotion TEXT,
  voice_id TEXT,
  latency_ms INTEGER NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  cost_usd DECIMAL(10, 6),
  audio_duration_seconds DECIMAL(8, 3),
  character_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for voice synthesis metrics
CREATE INDEX idx_voice_synthesis_metrics_session_id ON voice_synthesis_metrics(session_id);
CREATE INDEX idx_voice_synthesis_metrics_user_id ON voice_synthesis_metrics(user_id);
CREATE INDEX idx_voice_synthesis_metrics_engine ON voice_synthesis_metrics(engine);
CREATE INDEX idx_voice_synthesis_metrics_created_at ON voice_synthesis_metrics(created_at);
CREATE INDEX idx_voice_synthesis_metrics_success ON voice_synthesis_metrics(success);

-- Partition table by date for better performance
-- CREATE TABLE voice_synthesis_metrics_y2024m01 PARTITION OF voice_synthesis_metrics
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Enable RLS on voice synthesis metrics table
ALTER TABLE voice_synthesis_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy for voice synthesis metrics - users can only access their own metrics
CREATE POLICY voice_synthesis_metrics_policy ON voice_synthesis_metrics
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Voice preferences table for user customization
CREATE TABLE voice_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_engine TEXT CHECK (preferred_engine IN ('elevenlabs', 'polly', 'auto')) DEFAULT 'auto',
  voice_id TEXT,
  speed DECIMAL(3, 2) DEFAULT 1.0 CHECK (speed >= 0.5 AND speed <= 2.0),
  emotion TEXT DEFAULT 'neutral',
  language TEXT DEFAULT 'en-US',
  enable_voice_cloning BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for voice preferences
CREATE INDEX idx_voice_preferences_user_id ON voice_preferences(user_id);

-- Enable RLS on voice preferences table
ALTER TABLE voice_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy for voice preferences - users can only access their own preferences
CREATE POLICY voice_preferences_policy ON voice_preferences
  FOR ALL USING (user_id = auth.uid());

-- Cost tracking table for budget management
CREATE TABLE voice_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  engine TEXT NOT NULL CHECK (engine IN ('elevenlabs', 'polly')),
  character_count INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('stream', 'longform')),
  session_id TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cost tracking
CREATE INDEX idx_voice_cost_tracking_user_id ON voice_cost_tracking(user_id);
CREATE INDEX idx_voice_cost_tracking_date ON voice_cost_tracking(date);
CREATE INDEX idx_voice_cost_tracking_engine ON voice_cost_tracking(engine);

-- Enable RLS on cost tracking table
ALTER TABLE voice_cost_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policy for cost tracking - users can only access their own costs
CREATE POLICY voice_cost_tracking_policy ON voice_cost_tracking
  FOR ALL USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- Functions for voice synthesis management

-- Function to get user's daily voice synthesis cost
CREATE OR REPLACE FUNCTION get_user_daily_voice_cost(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS DECIMAL(10, 6) AS $$
DECLARE
  total_cost DECIMAL(10, 6);
BEGIN
  SELECT COALESCE(SUM(cost_usd), 0) INTO total_cost
  FROM voice_cost_tracking
  WHERE user_id = p_user_id AND date = p_date;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid parental consent for voice cloning
CREATE OR REPLACE FUNCTION has_valid_voice_cloning_consent(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  consent_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM parental_consents
    WHERE user_id = p_user_id
      AND consent_type = 'voice_cloning'
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND revoked_at IS NULL
  ) INTO consent_exists;
  
  RETURN consent_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke voice clone and cleanup
CREATE OR REPLACE FUNCTION revoke_voice_clone(p_user_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  clone_count INTEGER;
BEGIN
  -- Update voice clone status
  UPDATE voice_clones
  SET revoked_at = NOW(),
      revocation_reason = p_reason,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS clone_count = ROW_COUNT;
  
  -- Log the revocation event
  IF clone_count > 0 THEN
    PERFORM log_audit_event_enhanced(
      'VoiceService',
      'voice_clone_revoked',
      jsonb_build_object(
        'user_id', p_user_id,
        'reason', p_reason,
        'revoked_count', clone_count
      )
    );
  END IF;
  
  RETURN clone_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old voice synthesis metrics (data retention)
CREATE OR REPLACE FUNCTION cleanup_voice_metrics(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM voice_synthesis_metrics
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get voice synthesis performance metrics
CREATE OR REPLACE FUNCTION get_voice_performance_metrics(
  p_time_range_hours INTEGER DEFAULT 24,
  p_engine TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_requests BIGINT,
  successful_requests BIGINT,
  success_rate DECIMAL(5, 4),
  avg_latency_ms DECIMAL(8, 2),
  total_cost_usd DECIMAL(10, 6),
  avg_cost_per_request DECIMAL(10, 6)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    ROUND(
      COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0),
      4
    ) as success_rate,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms,
    COALESCE(SUM(cost_usd), 0) as total_cost_usd,
    ROUND(
      COALESCE(SUM(cost_usd), 0) / NULLIF(COUNT(*), 0),
      6
    ) as avg_cost_per_request
  FROM voice_synthesis_metrics
  WHERE created_at >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
    AND (p_engine IS NULL OR engine = p_engine);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voice_clones_updated_at
  BEFORE UPDATE ON voice_clones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parental_consents_updated_at
  BEFORE UPDATE ON parental_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_preferences_updated_at
  BEFORE UPDATE ON voice_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update data retention policies to include voice synthesis tables
INSERT INTO data_retention_policies (table_name, retention_period, deletion_strategy) VALUES
('voice_synthesis_metrics', INTERVAL '30 days', 'hard_delete'),
('voice_cost_tracking', INTERVAL '7 years', 'archive'), -- Keep for tax/accounting
('voice_clones', INTERVAL '1 year', 'soft_delete'), -- Keep revoked clones for audit
('parental_consents', INTERVAL '7 years', 'archive') -- Legal requirement
ON CONFLICT (table_name) DO UPDATE SET
  retention_period = EXCLUDED.retention_period,
  deletion_strategy = EXCLUDED.deletion_strategy;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_daily_voice_cost(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION has_valid_voice_cloning_consent(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_voice_clone(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_voice_metrics(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_voice_performance_metrics(INTEGER, TEXT) TO service_role;

-- Create scheduled job for metrics cleanup (if pg_cron is available)
-- SELECT cron.schedule('voice-metrics-cleanup', '0 2 * * *', 'SELECT cleanup_voice_metrics(30);');

-- Add voice synthesis specific columns to existing tables if needed
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_clone_enabled BOOLEAN DEFAULT FALSE;
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_voice_engine TEXT DEFAULT 'auto';

-- Create materialized view for voice synthesis analytics (optional)
CREATE MATERIALIZED VIEW voice_synthesis_daily_stats AS
SELECT 
  date_trunc('day', created_at) as date,
  engine,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE success = true) as successful_requests,
  ROUND(AVG(latency_ms), 2) as avg_latency_ms,
  COALESCE(SUM(cost_usd), 0) as total_cost_usd,
  SUM(character_count) as total_characters
FROM voice_synthesis_metrics
GROUP BY date_trunc('day', created_at), engine
ORDER BY date DESC, engine;

-- Create index on materialized view
CREATE INDEX idx_voice_synthesis_daily_stats_date ON voice_synthesis_daily_stats(date);

-- Refresh materialized view daily
-- SELECT cron.schedule('refresh-voice-stats', '0 1 * * *', 'REFRESH MATERIALIZED VIEW voice_synthesis_daily_stats;');
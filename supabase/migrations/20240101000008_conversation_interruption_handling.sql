-- Migration for conversation interruption handling
-- Adds tables for checkpoints, interruptions, and user context separation

-- Conversation checkpoints table
CREATE TABLE conversation_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  conversation_phase TEXT NOT NULL,
  story_state JSONB NOT NULL DEFAULT '{}',
  conversation_context JSONB NOT NULL DEFAULT '{}',
  device_context JSONB DEFAULT '{}',
  user_context JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Indexes for performance
  INDEX idx_conversation_checkpoints_session_id ON conversation_checkpoints(session_id),
  INDEX idx_conversation_checkpoints_user_id ON conversation_checkpoints(user_id),
  INDEX idx_conversation_checkpoints_created_at ON conversation_checkpoints(created_at),
  INDEX idx_conversation_checkpoints_expires_at ON conversation_checkpoints(expires_at)
);

-- Conversation interruptions table
CREATE TABLE conversation_interruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interruption_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  interruption_type TEXT NOT NULL CHECK (interruption_type IN (
    'user_stop', 'system_error', 'timeout', 'device_switch', 
    'network_loss', 'external_interrupt', 'multi_user_switch'
  )),
  checkpoint_id TEXT REFERENCES conversation_checkpoints(checkpoint_id),
  resumption_prompt TEXT NOT NULL,
  context_snapshot JSONB DEFAULT '{}',
  recovery_attempts INTEGER DEFAULT 0,
  max_recovery_attempts INTEGER DEFAULT 3,
  is_recovered BOOLEAN DEFAULT FALSE,
  recovered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  metadata JSONB DEFAULT '{}',
  
  -- Indexes for performance
  INDEX idx_conversation_interruptions_session_id ON conversation_interruptions(session_id),
  INDEX idx_conversation_interruptions_user_id ON conversation_interruptions(user_id),
  INDEX idx_conversation_interruptions_type ON conversation_interruptions(interruption_type),
  INDEX idx_conversation_interruptions_recovered ON conversation_interruptions(is_recovered),
  INDEX idx_conversation_interruptions_created_at ON conversation_interruptions(created_at)
);

-- User context separation table for multi-user shared devices
CREATE TABLE user_context_separations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  separation_id TEXT NOT NULL UNIQUE,
  session_id TEXT NOT NULL,
  primary_user_id UUID REFERENCES users NOT NULL,
  all_user_ids UUID[] NOT NULL,
  user_contexts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Indexes for performance
  INDEX idx_user_context_separations_session_id ON user_context_separations(session_id),
  INDEX idx_user_context_separations_primary_user ON user_context_separations(primary_user_id),
  INDEX idx_user_context_separations_created_at ON user_context_separations(created_at)
);

-- Conversation sessions table (enhanced from existing)
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users NOT NULL,
  parent_session_id TEXT,
  conversation_phase TEXT NOT NULL,
  story_state JSONB DEFAULT '{}',
  conversation_context JSONB DEFAULT '{}',
  device_history JSONB DEFAULT '[]',
  user_context JSONB DEFAULT '{}',
  interruption_count INTEGER DEFAULT 0,
  checkpoint_count INTEGER DEFAULT 0,
  last_checkpoint_at TIMESTAMPTZ,
  last_interruption_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Indexes for performance
  INDEX idx_conversation_sessions_session_id ON conversation_sessions(session_id),
  INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id),
  INDEX idx_conversation_sessions_parent_session ON conversation_sessions(parent_session_id),
  INDEX idx_conversation_sessions_updated_at ON conversation_sessions(updated_at)
);

-- Row Level Security (RLS) policies

-- Conversation checkpoints - users can only access their own checkpoints
ALTER TABLE conversation_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_checkpoints_policy ON conversation_checkpoints
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM library_permissions lp
      JOIN libraries l ON l.id = lp.library_id
      WHERE l.owner = user_id AND lp.user_id = auth.uid()
    )
  );

-- Conversation interruptions - users can only access their own interruptions
ALTER TABLE conversation_interruptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_interruptions_policy ON conversation_interruptions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM library_permissions lp
      JOIN libraries l ON l.id = lp.library_id
      WHERE l.owner = user_id AND lp.user_id = auth.uid()
    )
  );

-- User context separations - users can only access separations they're part of
ALTER TABLE user_context_separations ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_context_separations_policy ON user_context_separations
  FOR ALL USING (
    primary_user_id = auth.uid() OR
    auth.uid() = ANY(all_user_ids) OR
    EXISTS (
      SELECT 1 FROM library_permissions lp
      JOIN libraries l ON l.id = lp.library_id
      WHERE l.owner = primary_user_id AND lp.user_id = auth.uid()
    )
  );

-- Conversation sessions - users can only access their own sessions
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_sessions_policy ON conversation_sessions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM library_permissions lp
      JOIN libraries l ON l.id = lp.library_id
      WHERE l.owner = user_id AND lp.user_id = auth.uid()
    )
  );

-- Functions for automatic cleanup of expired records

-- Function to clean up expired checkpoints
CREATE OR REPLACE FUNCTION cleanup_expired_checkpoints()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_checkpoints
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired interruptions
CREATE OR REPLACE FUNCTION cleanup_expired_interruptions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_interruptions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired user context separations
CREATE OR REPLACE FUNCTION cleanup_expired_user_separations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_context_separations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired conversation sessions
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically update timestamps

-- Update conversation_sessions updated_at on changes
CREATE OR REPLACE FUNCTION update_conversation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_sessions_updated_at_trigger
  BEFORE UPDATE ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_sessions_updated_at();

-- Function to get interruption recovery statistics
CREATE OR REPLACE FUNCTION get_interruption_recovery_stats(
  user_id_param UUID DEFAULT NULL,
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_interruptions BIGINT,
  recovered_interruptions BIGINT,
  recovery_rate NUMERIC,
  avg_recovery_attempts NUMERIC,
  most_common_interruption_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH interruption_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_recovered = true) as recovered,
      AVG(recovery_attempts) FILTER (WHERE is_recovered = true) as avg_attempts,
      MODE() WITHIN GROUP (ORDER BY interruption_type) as common_type
    FROM conversation_interruptions
    WHERE 
      (user_id_param IS NULL OR user_id = user_id_param)
      AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
  )
  SELECT 
    total,
    recovered,
    CASE 
      WHEN total > 0 THEN ROUND((recovered::NUMERIC / total::NUMERIC) * 100, 2)
      ELSE 0
    END as recovery_rate,
    ROUND(avg_attempts, 2),
    common_type
  FROM interruption_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get checkpoint statistics
CREATE OR REPLACE FUNCTION get_checkpoint_stats(
  user_id_param UUID DEFAULT NULL,
  time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  total_checkpoints BIGINT,
  checkpoints_by_phase JSONB,
  avg_checkpoints_per_session NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH checkpoint_stats AS (
    SELECT 
      COUNT(*) as total,
      jsonb_object_agg(conversation_phase, phase_count) as by_phase,
      AVG(session_checkpoint_count) as avg_per_session
    FROM (
      SELECT 
        conversation_phase,
        COUNT(*) as phase_count
      FROM conversation_checkpoints
      WHERE 
        (user_id_param IS NULL OR user_id = user_id_param)
        AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
      GROUP BY conversation_phase
    ) phase_counts
    CROSS JOIN (
      SELECT AVG(checkpoint_count) as session_checkpoint_count
      FROM (
        SELECT session_id, COUNT(*) as checkpoint_count
        FROM conversation_checkpoints
        WHERE 
          (user_id_param IS NULL OR user_id = user_id_param)
          AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
        GROUP BY session_id
      ) session_counts
    ) session_stats
  )
  SELECT 
    total,
    by_phase,
    ROUND(avg_per_session, 2)
  FROM checkpoint_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE conversation_checkpoints IS 'Stores conversation state checkpoints for interruption recovery';
COMMENT ON TABLE conversation_interruptions IS 'Tracks conversation interruptions and recovery attempts';
COMMENT ON TABLE user_context_separations IS 'Manages multi-user context separation on shared devices';
COMMENT ON TABLE conversation_sessions IS 'Enhanced conversation session tracking with interruption support';

COMMENT ON FUNCTION cleanup_expired_checkpoints() IS 'Cleans up expired conversation checkpoints';
COMMENT ON FUNCTION cleanup_expired_interruptions() IS 'Cleans up expired conversation interruptions';
COMMENT ON FUNCTION cleanup_expired_user_separations() IS 'Cleans up expired user context separations';
COMMENT ON FUNCTION cleanup_expired_conversation_sessions() IS 'Cleans up expired conversation sessions';
COMMENT ON FUNCTION get_interruption_recovery_stats(UUID, INTEGER) IS 'Returns interruption and recovery statistics';
COMMENT ON FUNCTION get_checkpoint_stats(UUID, INTEGER) IS 'Returns checkpoint creation statistics';
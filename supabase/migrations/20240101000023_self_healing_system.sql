-- Self-healing system tables that extend existing schema
-- This integrates with existing audit_log and event_log tables

-- Incident knowledge base for learning and pattern recognition
CREATE TABLE incident_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'agent_failure', 'api_timeout', 'database_error', 
    'memory_leak', 'rate_limit', 'circuit_breaker'
  )),
  error_signature TEXT NOT NULL,
  error_pattern JSONB NOT NULL,
  healing_action JSONB NOT NULL,
  success_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0000,
  application_count INTEGER NOT NULL DEFAULT 0,
  last_applied TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata for analysis
  affected_agents TEXT[] NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  autonomy_level INTEGER NOT NULL CHECK (autonomy_level IN (1, 2, 3)),
  
  -- Constraints
  CONSTRAINT valid_success_rate CHECK (success_rate >= 0.0 AND success_rate <= 1.0),
  CONSTRAINT valid_application_count CHECK (application_count >= 0)
);

-- Incident records for tracking and metrics
CREATE TABLE incident_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  error_pattern JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Healing details
  healing_action JSONB,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_time_ms INTEGER,
  
  -- Impact tracking
  impacted_users INTEGER NOT NULL DEFAULT 0,
  story_sessions_affected INTEGER NOT NULL DEFAULT 0,
  
  -- Context
  agent_name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  story_id UUID,
  active_conversation BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_resolution_time CHECK (resolution_time_ms IS NULL OR resolution_time_ms >= 0),
  CONSTRAINT valid_impact_counts CHECK (
    impacted_users >= 0 AND story_sessions_affected >= 0
  ),
  CONSTRAINT resolved_incidents_have_resolution_time CHECK (
    (resolved_at IS NULL AND resolution_time_ms IS NULL) OR
    (resolved_at IS NOT NULL AND resolution_time_ms IS NOT NULL)
  )
);

-- Circuit breaker state tracking
CREATE TABLE circuit_breaker_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ,
  success_count INTEGER NOT NULL DEFAULT 0,
  
  -- Configuration
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  timeout_ms INTEGER NOT NULL DEFAULT 60000,
  success_threshold INTEGER NOT NULL DEFAULT 3,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_counts CHECK (
    failure_count >= 0 AND success_count >= 0 AND
    failure_threshold > 0 AND success_threshold > 0 AND
    timeout_ms > 0
  )
);

-- Self-healing configuration per agent
CREATE TABLE self_healing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  autonomy_level INTEGER NOT NULL DEFAULT 1 CHECK (autonomy_level IN (1, 2, 3)),
  max_actions_per_hour INTEGER NOT NULL DEFAULT 10,
  story_session_protection BOOLEAN NOT NULL DEFAULT TRUE,
  parent_notification BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Time window restrictions
  allowed_start_time TIME NOT NULL DEFAULT '07:00:00',
  allowed_end_time TIME NOT NULL DEFAULT '19:00:00',
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_max_actions CHECK (max_actions_per_hour > 0),
  CONSTRAINT valid_time_window CHECK (allowed_start_time < allowed_end_time)
);

-- Healing metrics aggregation
CREATE TABLE healing_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  agent_name TEXT NOT NULL,
  
  -- Incident metrics
  incidents_detected INTEGER NOT NULL DEFAULT 0,
  incidents_resolved INTEGER NOT NULL DEFAULT 0,
  average_resolution_time_ms INTEGER,
  
  -- Impact metrics
  story_sessions_protected INTEGER NOT NULL DEFAULT 0,
  parent_notifications_sent INTEGER NOT NULL DEFAULT 0,
  
  -- Quality metrics
  false_positive_count INTEGER NOT NULL DEFAULT 0,
  system_availability_percent DECIMAL(5,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(date, agent_name),
  CONSTRAINT valid_metrics CHECK (
    incidents_detected >= 0 AND incidents_resolved >= 0 AND
    incidents_resolved <= incidents_detected AND
    story_sessions_protected >= 0 AND parent_notifications_sent >= 0 AND
    false_positive_count >= 0 AND
    (system_availability_percent IS NULL OR 
     (system_availability_percent >= 0.00 AND system_availability_percent <= 100.00))
  )
);

-- Indexes for performance
CREATE INDEX idx_incident_knowledge_type_signature ON incident_knowledge(incident_type, error_signature);
CREATE INDEX idx_incident_knowledge_success_rate ON incident_knowledge(success_rate DESC);
CREATE INDEX idx_incident_records_detected_at ON incident_records(detected_at DESC);
CREATE INDEX idx_incident_records_agent_name ON incident_records(agent_name);
CREATE INDEX idx_incident_records_user_session ON incident_records(user_id, session_id);
CREATE INDEX idx_circuit_breaker_agent ON circuit_breaker_state(agent_name);
CREATE INDEX idx_healing_metrics_date_agent ON healing_metrics(date DESC, agent_name);

-- Row Level Security (RLS) policies
ALTER TABLE incident_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE self_healing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE healing_metrics ENABLE ROW LEVEL SECURITY;

-- System service can manage all self-healing data
CREATE POLICY "System can manage incident knowledge" ON incident_knowledge
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage incident records" ON incident_records
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage circuit breaker state" ON circuit_breaker_state
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage healing config" ON self_healing_config
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can manage healing metrics" ON healing_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Admins can view healing data for monitoring
CREATE POLICY "Admins can view incident knowledge" ON incident_knowledge
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can view incident records" ON incident_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

CREATE POLICY "Admins can view healing metrics" ON healing_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Functions for self-healing operations
CREATE OR REPLACE FUNCTION update_incident_knowledge_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- Update success rate when incident record is resolved
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    UPDATE incident_knowledge 
    SET 
      success_rate = (
        SELECT AVG(CASE WHEN success THEN 1.0 ELSE 0.0 END)
        FROM incident_records 
        WHERE incident_type = NEW.incident_type
        AND resolved_at IS NOT NULL
      ),
      application_count = application_count + 1,
      last_applied = NEW.resolved_at,
      updated_at = NOW()
    WHERE incident_type = NEW.incident_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incident_knowledge_success_rate_trigger
  AFTER UPDATE ON incident_records
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_knowledge_success_rate();

-- Function to update healing metrics daily
CREATE OR REPLACE FUNCTION update_daily_healing_metrics()
RETURNS void AS $$
DECLARE
  current_date DATE := CURRENT_DATE;
  agent_record RECORD;
BEGIN
  -- Update metrics for each agent
  FOR agent_record IN 
    SELECT DISTINCT agent_name FROM incident_records 
    WHERE DATE(detected_at) = current_date
  LOOP
    INSERT INTO healing_metrics (
      date, 
      agent_name,
      incidents_detected,
      incidents_resolved,
      average_resolution_time_ms,
      story_sessions_protected,
      false_positive_count
    )
    SELECT 
      current_date,
      agent_record.agent_name,
      COUNT(*) as incidents_detected,
      COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as incidents_resolved,
      AVG(resolution_time_ms) FILTER (WHERE resolution_time_ms IS NOT NULL) as avg_resolution_time,
      SUM(story_sessions_affected) as story_sessions_protected,
      COUNT(*) FILTER (WHERE success = FALSE AND resolved_at IS NOT NULL) as false_positives
    FROM incident_records
    WHERE DATE(detected_at) = current_date
    AND agent_name = agent_record.agent_name
    ON CONFLICT (date, agent_name) 
    DO UPDATE SET
      incidents_detected = EXCLUDED.incidents_detected,
      incidents_resolved = EXCLUDED.incidents_resolved,
      average_resolution_time_ms = EXCLUDED.average_resolution_time_ms,
      story_sessions_protected = EXCLUDED.story_sessions_protected,
      false_positive_count = EXCLUDED.false_positive_count,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Insert default configuration for existing agents
INSERT INTO self_healing_config (agent_name, enabled, autonomy_level) VALUES
  ('router', TRUE, 2),
  ('auth', TRUE, 1),
  ('content', TRUE, 1),
  ('library', TRUE, 1),
  ('emotion', TRUE, 1),
  ('commerce', TRUE, 2),
  ('insights', TRUE, 1),
  ('smart-home', TRUE, 1)
ON CONFLICT (agent_name) DO NOTHING;

-- Insert default circuit breaker state for existing agents
INSERT INTO circuit_breaker_state (agent_name, state) VALUES
  ('router', 'closed'),
  ('auth', 'closed'),
  ('content', 'closed'),
  ('library', 'closed'),
  ('emotion', 'closed'),
  ('commerce', 'closed'),
  ('insights', 'closed'),
  ('smart-home', 'closed')
ON CONFLICT (agent_name) DO NOTHING;
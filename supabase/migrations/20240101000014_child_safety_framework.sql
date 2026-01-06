-- Child Safety Framework Migration
-- This migration creates tables and policies for comprehensive child safety features

-- Safety incidents tracking table
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  session_id TEXT NOT NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'physical_abuse', 'emotional_abuse', 'sexual_abuse', 'neglect', 'bullying',
    'self_harm', 'suicidal_ideation', 'substance_abuse', 'domestic_violence',
    'mental_health_crisis', 'unsafe_situation', 'sexual_content', 'violence',
    'profanity', 'hate_speech', 'dangerous_activities', 'inappropriate_relationships',
    'personal_information', 'scary_content'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  context TEXT NOT NULL,
  actions_taken TEXT[] NOT NULL DEFAULT '{}',
  reporting_required BOOLEAN NOT NULL DEFAULT FALSE,
  reporting_completed BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_required BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mandatory reporting records table
CREATE TABLE IF NOT EXISTS mandatory_reporting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'physical_abuse', 'emotional_abuse', 'sexual_abuse', 'neglect',
    'suicidal_ideation', 'self_harm', 'mental_health_crisis'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('high', 'critical')),
  evidence TEXT[] NOT NULL DEFAULT '{}',
  reporting_agency TEXT NOT NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  report_number TEXT,
  follow_up_required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'acknowledged', 'investigating', 'resolved'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent notifications table
CREATE TABLE IF NOT EXISTS parent_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  parent_email TEXT NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'safety_concern', 'inappropriate_content', 'distress_detected', 'crisis_intervention'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  actions_taken TEXT[] NOT NULL DEFAULT '{}',
  recommended_actions TEXT[] NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'sent', 'delivered', 'failed'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Communication profiles for special needs adaptation
CREATE TABLE IF NOT EXISTS communication_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL UNIQUE,
  preferred_pace TEXT DEFAULT 'normal' CHECK (preferred_pace IN ('slow', 'normal', 'fast')),
  vocabulary_level TEXT DEFAULT 'standard' CHECK (vocabulary_level IN ('simple', 'standard', 'advanced')),
  attention_span INTEGER DEFAULT 30, -- in seconds
  processing_delay INTEGER DEFAULT 0, -- in milliseconds
  preferred_interaction_style TEXT DEFAULT 'gentle' CHECK (preferred_interaction_style IN (
    'direct', 'gentle', 'playful', 'structured'
  )),
  trigger_words TEXT[] DEFAULT '{}',
  comfort_topics TEXT[] DEFAULT '{}',
  special_needs JSONB DEFAULT '[]', -- Array of special need objects
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crisis intervention logs
CREATE TABLE IF NOT EXISTS crisis_intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  session_id TEXT NOT NULL,
  crisis_type TEXT NOT NULL CHECK (crisis_type IN (
    'suicidal_ideation', 'self_harm', 'abuse_disclosure', 'immediate_danger',
    'mental_health_emergency', 'substance_emergency'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'automated_response', 'human_handoff', 'emergency_services', 'parent_notification'
  )),
  intervention_triggered BOOLEAN NOT NULL DEFAULT FALSE,
  resources_provided JSONB DEFAULT '[]',
  escalation_level INTEGER NOT NULL CHECK (escalation_level BETWEEN 1 AND 5),
  follow_up_required BOOLEAN NOT NULL DEFAULT TRUE,
  reporting_completed BOOLEAN NOT NULL DEFAULT FALSE,
  context TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distress detection patterns
CREATE TABLE IF NOT EXISTS distress_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  session_id TEXT NOT NULL,
  distress_level TEXT NOT NULL CHECK (distress_level IN ('none', 'mild', 'moderate', 'severe', 'critical')),
  confidence NUMERIC NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  indicators JSONB NOT NULL DEFAULT '[]', -- Array of distress indicator objects
  voice_patterns JSONB, -- Voice pattern data if available
  behavioral_patterns JSONB NOT NULL, -- Interaction behavior data
  recommended_actions JSONB DEFAULT '[]', -- Array of recommended action objects
  immediate_attention_required BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content safety logs for inappropriate content tracking
CREATE TABLE IF NOT EXISTS content_safety_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  session_id TEXT NOT NULL,
  user_input TEXT NOT NULL,
  inappropriate_categories TEXT[] DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'extreme')),
  confidence NUMERIC NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  redirection_response TEXT NOT NULL,
  educational_opportunity JSONB, -- Educational opportunity object if applicable
  escalation_required BOOLEAN NOT NULL DEFAULT FALSE,
  pattern_concern BOOLEAN NOT NULL DEFAULT FALSE,
  previous_inappropriate_count INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_id ON safety_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_timestamp ON safety_incidents(timestamp);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_type ON safety_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_unresolved ON safety_incidents(user_id, resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mandatory_reports_user_id ON mandatory_reporting_records(user_id);
CREATE INDEX IF NOT EXISTS idx_mandatory_reports_status ON mandatory_reporting_records(status);
CREATE INDEX IF NOT EXISTS idx_mandatory_reports_reported_at ON mandatory_reporting_records(reported_at);

CREATE INDEX IF NOT EXISTS idx_parent_notifications_user_id ON parent_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_timestamp ON parent_notifications(timestamp);
CREATE INDEX IF NOT EXISTS idx_parent_notifications_severity ON parent_notifications(severity);

CREATE INDEX IF NOT EXISTS idx_crisis_logs_user_id ON crisis_intervention_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_logs_timestamp ON crisis_intervention_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_crisis_logs_escalation ON crisis_intervention_logs(escalation_level);

CREATE INDEX IF NOT EXISTS idx_distress_patterns_user_id ON distress_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_distress_patterns_timestamp ON distress_patterns(timestamp);
CREATE INDEX IF NOT EXISTS idx_distress_patterns_level ON distress_patterns(distress_level);

CREATE INDEX IF NOT EXISTS idx_content_safety_user_id ON content_safety_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_content_safety_timestamp ON content_safety_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_content_safety_pattern ON content_safety_logs(user_id, pattern_concern) WHERE pattern_concern = true;

-- Row Level Security Policies

-- Safety incidents - only accessible by the user and authorized staff
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY safety_incidents_user_access ON safety_incidents
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer')
    )
  );

-- Mandatory reporting records - only accessible by authorized staff
ALTER TABLE mandatory_reporting_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY mandatory_reports_staff_only ON mandatory_reporting_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer' OR role = 'compliance_officer')
    )
  );

-- Parent notifications - accessible by user and authorized staff
ALTER TABLE parent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_notifications_access ON parent_notifications
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer')
    )
  );

-- Communication profiles - only accessible by the user
ALTER TABLE communication_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY communication_profiles_user_only ON communication_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Crisis intervention logs - accessible by user and authorized staff
ALTER TABLE crisis_intervention_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crisis_logs_access ON crisis_intervention_logs
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer' OR role = 'crisis_counselor')
    )
  );

-- Distress patterns - accessible by user and authorized staff
ALTER TABLE distress_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY distress_patterns_access ON distress_patterns
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer')
    )
  );

-- Content safety logs - accessible by user and authorized staff
ALTER TABLE content_safety_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_safety_logs_access ON content_safety_logs
  FOR ALL USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'safety_officer')
    )
  );

-- Functions for automated cleanup and maintenance

-- Function to automatically clean up old safety incidents (after 2 years for resolved incidents)
CREATE OR REPLACE FUNCTION cleanup_old_safety_incidents()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM safety_incidents 
  WHERE resolved_at IS NOT NULL 
    AND resolved_at < NOW() - INTERVAL '2 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically anonymize old distress patterns (after 1 year)
CREATE OR REPLACE FUNCTION anonymize_old_distress_patterns()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE distress_patterns 
  SET 
    voice_patterns = NULL,
    behavioral_patterns = '{}',
    indicators = '[]'
  WHERE timestamp < NOW() - INTERVAL '1 year'
    AND voice_patterns IS NOT NULL;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get safety metrics for reporting
CREATE OR REPLACE FUNCTION get_safety_metrics(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_incidents', (
      SELECT COUNT(*) FROM safety_incidents 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'incidents_by_type', (
      SELECT json_object_agg(incident_type, count)
      FROM (
        SELECT incident_type, COUNT(*) as count
        FROM safety_incidents 
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY incident_type
      ) t
    ),
    'incidents_by_severity', (
      SELECT json_object_agg(severity, count)
      FROM (
        SELECT severity, COUNT(*) as count
        FROM safety_incidents 
        WHERE timestamp BETWEEN start_date AND end_date
        GROUP BY severity
      ) t
    ),
    'crisis_interventions', (
      SELECT COUNT(*) FROM crisis_intervention_logs 
      WHERE timestamp BETWEEN start_date AND end_date
    ),
    'mandatory_reports', (
      SELECT COUNT(*) FROM mandatory_reporting_records 
      WHERE reported_at BETWEEN start_date AND end_date
    ),
    'parent_notifications', (
      SELECT COUNT(*) FROM parent_notifications 
      WHERE timestamp BETWEEN start_date AND end_date
    )
  ) INTO result;
  
  RETURN result;
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

CREATE TRIGGER update_safety_incidents_updated_at
  BEFORE UPDATE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mandatory_reports_updated_at
  BEFORE UPDATE ON mandatory_reporting_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communication_profiles_updated_at
  BEFORE UPDATE ON communication_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON safety_incidents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mandatory_reporting_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON parent_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON communication_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON crisis_intervention_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON distress_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON content_safety_logs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_old_safety_incidents() TO authenticated;
GRANT EXECUTE ON FUNCTION anonymize_old_distress_patterns() TO authenticated;
GRANT EXECUTE ON FUNCTION get_safety_metrics(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
-- ============================================
-- CRITICAL MIGRATIONS FOR SUPABASE DASHBOARD
-- ============================================
-- Execute this SQL in Supabase Dashboard > SQL Editor
-- Project: lendybmmnlqelrhkhdyc

-- 1. CHARACTERS TABLE (for character creation endpoints)
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  personality JSONB DEFAULT '{}',
  appearance JSONB DEFAULT '{}',
  backstory TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for characters
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;

-- RLS policy for characters
CREATE POLICY characters_policy ON characters
  FOR ALL USING (user_id = auth.uid());

-- Create indexes for characters
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_characters_name ON characters(name);

-- 2. REFRESH_TOKENS TABLE (for authentication)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for refresh_tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked ON refresh_tokens(revoked) WHERE revoked = FALSE;

-- Enable RLS for refresh_tokens
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policy for refresh_tokens
CREATE POLICY refresh_tokens_policy ON refresh_tokens
  FOR ALL USING (user_id = auth.uid());

-- 3. LIBRARIES TABLE (for content organization)
CREATE TABLE IF NOT EXISTS libraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID REFERENCES users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  privacy_setting TEXT DEFAULT 'private' CHECK (privacy_setting IN ('private', 'family', 'public')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for libraries
ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;

-- RLS policy for libraries
CREATE POLICY libraries_policy ON libraries
  FOR ALL USING (owner = auth.uid());

-- Create indexes for libraries
CREATE INDEX idx_libraries_owner ON libraries(owner);
CREATE INDEX idx_libraries_name ON libraries(name);

-- 4. KNOWLEDGE_BASE TABLE (for Story Intelligence queries)
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  confidence_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for knowledge_base
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_base_title ON knowledge_base(title);

-- Enable RLS for knowledge_base (public read)
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policy for knowledge_base (allow read for authenticated users)
CREATE POLICY knowledge_base_read_policy ON knowledge_base
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5. SYSTEM_METRICS TABLE (for health monitoring)
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL,
  cpu_usage NUMERIC NOT NULL,
  cpu_load_average NUMERIC[] NOT NULL,
  memory_used BIGINT NOT NULL,
  memory_total BIGINT NOT NULL,
  memory_percentage NUMERIC NOT NULL,
  events_published INTEGER NOT NULL DEFAULT 0,
  events_processed INTEGER NOT NULL DEFAULT 0,
  average_latency NUMERIC NOT NULL DEFAULT 0,
  error_rate NUMERIC NOT NULL DEFAULT 0,
  queue_depth INTEGER NOT NULL DEFAULT 0,
  agent_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for system_metrics
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_cpu_usage ON system_metrics(cpu_usage);
CREATE INDEX idx_system_metrics_memory_percentage ON system_metrics(memory_percentage);
CREATE INDEX idx_system_metrics_error_rate ON system_metrics(error_rate);

-- Enable RLS for system_metrics (service role only)
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policy for system_metrics
CREATE POLICY system_metrics_policy ON system_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- 6. ALERT_RULES TABLE (for monitoring alerts)
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt', 'eq', 'gte', 'lte')),
  duration INTEGER NOT NULL, -- seconds
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for alert_rules
CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_metric ON alert_rules(metric);

-- Enable RLS for alert_rules (service role only)
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- RLS policy for alert_rules
CREATE POLICY alert_rules_policy ON alert_rules
  FOR ALL USING (auth.role() = 'service_role');

-- 7. SYSTEM_ALERTS TABLE (for alert tracking)
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES alert_rules NOT NULL,
  rule_name TEXT NOT NULL,
  metric TEXT NOT NULL,
  threshold NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  severity TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for system_alerts
CREATE INDEX idx_system_alerts_rule_id ON system_alerts(rule_id);
CREATE INDEX idx_system_alerts_triggered_at ON system_alerts(triggered_at);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved_at ON system_alerts(resolved_at);

-- Enable RLS for system_alerts (service role only)
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policy for system_alerts
CREATE POLICY system_alerts_policy ON system_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  status TEXT,
  cpu_usage NUMERIC,
  memory_percentage NUMERIC,
  error_rate NUMERIC,
  active_alerts BIGINT,
  last_metric_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN sm.error_rate > 0.1 OR sm.cpu_usage > 80 OR sm.memory_percentage > 90 THEN 'unhealthy'
      WHEN sm.error_rate > 0.05 OR sm.cpu_usage > 60 OR sm.memory_percentage > 75 THEN 'degraded'
      ELSE 'healthy'
    END as status,
    sm.cpu_usage,
    sm.memory_percentage,
    sm.error_rate,
    (SELECT COUNT(*) FROM system_alerts WHERE resolved_at IS NULL) as active_alerts,
    sm.timestamp as last_metric_time
  FROM system_metrics sm
  ORDER BY sm.timestamp DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION get_system_health() TO authenticated;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default alert rules
INSERT INTO alert_rules (name, metric, threshold, operator, duration, severity) VALUES
('High CPU Usage', 'cpu_usage', 80, 'gt', 300, 'high'),
('Critical CPU Usage', 'cpu_usage', 95, 'gt', 60, 'critical'),
('High Memory Usage', 'memory_percentage', 85, 'gt', 300, 'high'), 
('Critical Memory Usage', 'memory_percentage', 95, 'gt', 60, 'critical'),
('High Error Rate', 'error_rate', 0.1, 'gt', 180, 'high'),
('Critical Error Rate', 'error_rate', 0.3, 'gt', 60, 'critical')
ON CONFLICT DO NOTHING;

-- Insert sample knowledge base entries
INSERT INTO knowledge_base (title, content, category, tags) VALUES
('What is Story Intelligence?', 'Story Intelligence™ is a revolutionary breakthrough in narrative technology. Unlike artificial intelligence creating generic content, Story Intelligence™ understands the soul of great storytelling, the science of child development, and the art of personal connection. It creates award-caliber stories that become unique family treasures.', 'brand', ARRAY['story-intelligence', 'platform', 'technology']),
('How to Create Characters', 'Creating characters with Storytailor is simple and magical. Start by describing your character''s personality, appearance, and special traits. Our Story Intelligence™ will help bring them to life in your stories.', 'tutorial', ARRAY['characters', 'creation', 'tutorial']),
('Story Intelligence vs AI', 'Story Intelligence™ is not AI-powered - it''s powered by Story Intelligence™. This creates a new category alongside books and traditional publishing, focusing on story creation plus off-screen activities that are personal and private.', 'brand', ARRAY['differentiation', 'story-intelligence', 'not-ai'])
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify successful migration:

-- Check table count (should be 16+ now)
-- SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';

-- Verify critical tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('characters', 'refresh_tokens', 'libraries', 'knowledge_base', 'system_metrics', 'alert_rules', 'system_alerts')
-- ORDER BY table_name;

-- Test knowledge base function
-- SELECT * FROM knowledge_base LIMIT 3;

-- Test system health function
-- SELECT * FROM get_system_health();

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
 
 
 
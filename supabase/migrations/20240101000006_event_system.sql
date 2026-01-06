-- Event System Database Schema
-- CloudEvents compliant event storage and correlation tracking

-- Event store for replay and debugging
CREATE TABLE event_store (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  spec_version TEXT NOT NULL DEFAULT '1.0',
  event_time TIMESTAMPTZ NOT NULL,
  data_content_type TEXT DEFAULT 'application/json',
  data_schema TEXT,
  subject TEXT,
  data JSONB,
  correlation_id TEXT,
  user_id UUID REFERENCES users,
  session_id TEXT,
  agent_name TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event correlations for workflow tracking
CREATE TABLE event_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id TEXT NOT NULL UNIQUE,
  root_event_id TEXT NOT NULL,
  parent_event_id TEXT,
  caused_by TEXT,
  related_events TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event replays for debugging and recovery
CREATE TABLE event_replays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  replay_name TEXT NOT NULL,
  event_source_arn TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  destination TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  events_replayed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Event processing metrics
CREATE TABLE event_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  queue_time_ms INTEGER DEFAULT 0,
  handler_time_ms INTEGER DEFAULT 0,
  network_time_ms INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  correlation_id TEXT,
  user_id UUID REFERENCES users,
  session_id TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event subscriptions tracking
CREATE TABLE event_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id TEXT NOT NULL UNIQUE,
  event_types TEXT[] NOT NULL,
  source_filter TEXT,
  rule_name TEXT NOT NULL,
  queue_url TEXT NOT NULL,
  queue_arn TEXT NOT NULL,
  filter_pattern JSONB,
  retry_policy JSONB,
  dead_letter_queue TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'disabled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_store_event_id ON event_store(event_id);
CREATE INDEX idx_event_store_event_type ON event_store(event_type);
CREATE INDEX idx_event_store_source ON event_store(source);
CREATE INDEX idx_event_store_event_time ON event_store(event_time);
CREATE INDEX idx_event_store_correlation_id ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_event_store_user_id ON event_store(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_store_session_id ON event_store(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_event_store_agent_name ON event_store(agent_name) WHERE agent_name IS NOT NULL;

CREATE INDEX idx_event_correlations_correlation_id ON event_correlations(correlation_id);
CREATE INDEX idx_event_correlations_root_event_id ON event_correlations(root_event_id);
CREATE INDEX idx_event_correlations_parent_event_id ON event_correlations(parent_event_id) WHERE parent_event_id IS NOT NULL;

CREATE INDEX idx_event_replays_status ON event_replays(status);
CREATE INDEX idx_event_replays_created_at ON event_replays(created_at);

CREATE INDEX idx_event_metrics_event_type ON event_metrics(event_type);
CREATE INDEX idx_event_metrics_source ON event_metrics(source);
CREATE INDEX idx_event_metrics_processed_at ON event_metrics(processed_at);
CREATE INDEX idx_event_metrics_correlation_id ON event_metrics(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_event_metrics_success ON event_metrics(success);

CREATE INDEX idx_event_subscriptions_subscription_id ON event_subscriptions(subscription_id);
CREATE INDEX idx_event_subscriptions_status ON event_subscriptions(status);

-- Enable RLS on event tables
ALTER TABLE event_store ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_correlations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_replays ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event system

-- Event store: Users can only see events related to them
CREATE POLICY event_store_policy ON event_store
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL -- System events are visible to all authenticated users
  );

-- Event correlations: Users can see correlations for events they have access to
CREATE POLICY event_correlations_policy ON event_correlations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM event_store es
      WHERE es.correlation_id = event_correlations.correlation_id
      AND (es.user_id = auth.uid() OR es.user_id IS NULL)
    )
  );

-- Event replays: Only service role can manage replays
CREATE POLICY event_replays_policy ON event_replays
  FOR ALL USING (auth.role() = 'service_role');

-- Event metrics: Users can see metrics for their events
CREATE POLICY event_metrics_policy ON event_metrics
  FOR ALL USING (
    user_id = auth.uid() OR
    user_id IS NULL -- System metrics are visible to all authenticated users
  );

-- Event subscriptions: Only service role can manage subscriptions
CREATE POLICY event_subscriptions_policy ON event_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for event system management

-- Function to clean up old events
CREATE OR REPLACE FUNCTION cleanup_old_events(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Delete old events
  DELETE FROM event_store 
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up orphaned correlations
  DELETE FROM event_correlations 
  WHERE NOT EXISTS (
    SELECT 1 FROM event_store 
    WHERE correlation_id = event_correlations.correlation_id
  );
  
  -- Clean up old metrics
  DELETE FROM event_metrics 
  WHERE processed_at < cutoff_date;
  
  -- Clean up completed replays older than 30 days
  DELETE FROM event_replays 
  WHERE status = 'completed' 
  AND completed_at < (NOW() - INTERVAL '30 days');
  
  RETURN deleted_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get event statistics
CREATE OR REPLACE FUNCTION get_event_statistics()
RETURNS TABLE(
  total_events BIGINT,
  events_by_type JSONB,
  events_by_source JSONB,
  oldest_event TIMESTAMPTZ,
  newest_event TIMESTAMPTZ,
  active_correlations BIGINT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM event_store) as total_events,
    (SELECT jsonb_object_agg(event_type, count) 
     FROM (SELECT event_type, COUNT(*) as count FROM event_store GROUP BY event_type) t) as events_by_type,
    (SELECT jsonb_object_agg(source, count) 
     FROM (SELECT source, COUNT(*) as count FROM event_store GROUP BY source) t) as events_by_source,
    (SELECT MIN(event_time) FROM event_store) as oldest_event,
    (SELECT MAX(event_time) FROM event_store) as newest_event,
    (SELECT COUNT(*) FROM event_correlations) as active_correlations;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record event processing metrics
CREATE OR REPLACE FUNCTION record_event_metrics(
  p_event_type TEXT,
  p_source TEXT,
  p_processing_time_ms INTEGER,
  p_queue_time_ms INTEGER DEFAULT 0,
  p_handler_time_ms INTEGER DEFAULT 0,
  p_network_time_ms INTEGER DEFAULT 0,
  p_retry_count INTEGER DEFAULT 0,
  p_success BOOLEAN DEFAULT TRUE,
  p_error_message TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO event_metrics (
    event_type, source, processing_time_ms, queue_time_ms, 
    handler_time_ms, network_time_ms, retry_count, success,
    error_message, correlation_id, user_id, session_id
  )
  VALUES (
    p_event_type, p_source, p_processing_time_ms, p_queue_time_ms,
    p_handler_time_ms, p_network_time_ms, p_retry_count, p_success,
    p_error_message, p_correlation_id, p_user_id, p_session_id
  )
  RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update event replay status
CREATE OR REPLACE FUNCTION update_replay_status(
  p_replay_id UUID,
  p_status TEXT,
  p_events_replayed INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $
BEGIN
  UPDATE event_replays 
  SET 
    status = p_status,
    events_replayed = COALESCE(p_events_replayed, events_replayed),
    error_message = p_error_message,
    started_at = CASE WHEN p_status = 'running' AND started_at IS NULL THEN NOW() ELSE started_at END,
    completed_at = CASE WHEN p_status IN ('completed', 'failed') THEN NOW() ELSE completed_at END,
    updated_at = NOW()
  WHERE id = p_replay_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_old_events(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_event_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION record_event_metrics(TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, BOOLEAN, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_replay_status(UUID, TEXT, INTEGER, TEXT) TO service_role;

-- Create a view for event analytics (accessible to authenticated users)
CREATE VIEW event_analytics AS
SELECT 
  event_type,
  source,
  DATE_TRUNC('hour', event_time) as hour,
  COUNT(*) as event_count,
  COUNT(DISTINCT correlation_id) as unique_correlations,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM event_store 
WHERE event_time >= NOW() - INTERVAL '24 hours'
GROUP BY event_type, source, DATE_TRUNC('hour', event_time)
ORDER BY hour DESC;

-- Grant access to the analytics view
GRANT SELECT ON event_analytics TO authenticated;

-- System metrics for monitoring
CREATE TABLE system_metrics (
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

-- Alert rules for monitoring
CREATE TABLE alert_rules (
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

-- System alerts
CREATE TABLE system_alerts (
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

-- Indexes for monitoring tables
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_cpu_usage ON system_metrics(cpu_usage);
CREATE INDEX idx_system_metrics_memory_percentage ON system_metrics(memory_percentage);
CREATE INDEX idx_system_metrics_error_rate ON system_metrics(error_rate);

CREATE INDEX idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX idx_alert_rules_metric ON alert_rules(metric);

CREATE INDEX idx_system_alerts_rule_id ON system_alerts(rule_id);
CREATE INDEX idx_system_alerts_triggered_at ON system_alerts(triggered_at);
CREATE INDEX idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved_at ON system_alerts(resolved_at);

-- Enable RLS on monitoring tables
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for monitoring (service role only)
CREATE POLICY system_metrics_policy ON system_metrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY alert_rules_policy ON alert_rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY system_alerts_policy ON system_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  status TEXT,
  cpu_usage NUMERIC,
  memory_percentage NUMERIC,
  error_rate NUMERIC,
  active_alerts BIGINT,
  last_metric_time TIMESTAMPTZ
) AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for monitoring functions
GRANT EXECUTE ON FUNCTION get_system_health() TO authenticated;

-- Insert default alert rules
INSERT INTO alert_rules (name, metric, threshold, operator, duration, severity) VALUES
('High CPU Usage', 'cpu.usage', 80, 'gt', 300, 'high'),
('High Memory Usage', 'memory.percentage', 90, 'gt', 300, 'high'),
('High Error Rate', 'eventSystem.errorRate', 0.1, 'gt', 60, 'critical'),
('High Event Latency', 'eventSystem.averageLatency', 5000, 'gt', 120, 'medium'),
('Queue Depth Alert', 'eventSystem.queueDepth', 1000, 'gt', 180, 'medium');

-- Schedule cleanup job (would be set up in production)
-- SELECT cron.schedule('cleanup-old-events', '0 2 * * *', 'SELECT cleanup_old_events(90);');
-- SELECT cron.schedule('cleanup-old-metrics', '0 3 * * *', 'DELETE FROM system_metrics WHERE created_at < NOW() - INTERVAL ''30 days'';');
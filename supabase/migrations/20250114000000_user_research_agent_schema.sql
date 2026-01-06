-- Fieldnotes (User Research Agent) Database Schema
-- Multi-tenant research intelligence system

-- Research tenants configuration table
CREATE TABLE research_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  config JSONB NOT NULL,
  cost_limit INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research insights table
CREATE TABLE research_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  track_type TEXT NOT NULL,
  finding TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Research briefs table
CREATE TABLE research_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  week_of TIMESTAMPTZ NOT NULL,
  critical JSONB,
  tensions JSONB NOT NULL DEFAULT '[]',
  opportunities JSONB NOT NULL DEFAULT '[]',
  kill_list JSONB NOT NULL DEFAULT '[]',
  reality_check JSONB NOT NULL,
  what_we_shipped JSONB NOT NULL DEFAULT '[]',
  self_deception JSONB,
  format TEXT NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'json')),
  content TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-launch memos table
CREATE TABLE research_pre_launch_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  concept TEXT NOT NULL,
  reality TEXT NOT NULL,
  who_is_this_for JSONB NOT NULL,
  when_would_they_quit JSONB NOT NULL DEFAULT '[]',
  what_will_confuse JSONB NOT NULL DEFAULT '[]',
  buyer_lens JSONB NOT NULL,
  user_lens JSONB NOT NULL,
  language_audit JSONB NOT NULL,
  tension_map JSONB NOT NULL DEFAULT '[]',
  recommendation TEXT NOT NULL CHECK (recommendation IN ('ship', 'dont_ship', 'fix_first')),
  confidence NUMERIC NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cost tracking table
CREATE TABLE research_cost_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('month', 'week', 'day')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  events_processed INTEGER NOT NULL DEFAULT 0,
  llm_tokens_used JSONB NOT NULL DEFAULT '{"gpt-4o-mini": 0, "claude-haiku": 0, "claude-sonnet": 0}',
  analyses_generated INTEGER NOT NULL DEFAULT 0,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  cost_limit NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'warning', 'throttled', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insight cache table
CREATE TABLE research_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  insight JSONB NOT NULL,
  metric_value NUMERIC NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(tenant_id, cache_key)
);

-- Agent challenges table
CREATE TABLE research_agent_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  challenged_agent TEXT NOT NULL,
  question TEXT NOT NULL,
  data_backing JSONB NOT NULL DEFAULT '[]',
  agent_response TEXT,
  synthesis TEXT NOT NULL,
  actionable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage metrics table for detailed cost tracking
CREATE TABLE research_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES research_tenants(tenant_id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  operation TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  cost NUMERIC NOT NULL,
  duration INTEGER NOT NULL, -- milliseconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_research_insights_tenant_id ON research_insights(tenant_id);
CREATE INDEX idx_research_insights_created_at ON research_insights(created_at DESC);
CREATE INDEX idx_research_insights_track_type ON research_insights(track_type);
CREATE INDEX idx_research_insights_severity ON research_insights(severity);

CREATE INDEX idx_research_briefs_tenant_id ON research_briefs(tenant_id);
CREATE INDEX idx_research_briefs_week_of ON research_briefs(week_of DESC);
CREATE INDEX idx_research_briefs_delivered_at ON research_briefs(delivered_at) WHERE delivered_at IS NOT NULL;

CREATE INDEX idx_research_memos_tenant_id ON research_pre_launch_memos(tenant_id);
CREATE INDEX idx_research_memos_created_at ON research_pre_launch_memos(created_at DESC);
CREATE INDEX idx_research_memos_feature_name ON research_pre_launch_memos(feature_name);

CREATE INDEX idx_research_cost_tracking_tenant_id ON research_cost_tracking(tenant_id);
CREATE INDEX idx_research_cost_tracking_period_start ON research_cost_tracking(period_start DESC);
CREATE INDEX idx_research_cost_tracking_status ON research_cost_tracking(status);

CREATE INDEX idx_research_cache_tenant_id ON research_cache(tenant_id);
CREATE INDEX idx_research_cache_expires_at ON research_cache(expires_at);

CREATE INDEX idx_research_challenges_tenant_id ON research_agent_challenges(tenant_id);
CREATE INDEX idx_research_challenges_created_at ON research_agent_challenges(created_at DESC);

CREATE INDEX idx_research_usage_metrics_tenant_id ON research_usage_metrics(tenant_id);
CREATE INDEX idx_research_usage_metrics_timestamp ON research_usage_metrics(timestamp DESC);

-- Enable RLS on all tables
ALTER TABLE research_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_pre_launch_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cost_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_agent_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role has full access, tenant isolation for others)

-- Tenants table: Service role only
CREATE POLICY research_tenants_policy ON research_tenants
  FOR ALL USING (auth.role() = 'service_role');

-- Insights: Tenant isolation
CREATE POLICY research_insights_policy ON research_insights
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Briefs: Tenant isolation
CREATE POLICY research_briefs_policy ON research_briefs
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Memos: Tenant isolation
CREATE POLICY research_memos_policy ON research_pre_launch_memos
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Cost tracking: Tenant isolation
CREATE POLICY research_cost_tracking_policy ON research_cost_tracking
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Cache: Tenant isolation
CREATE POLICY research_cache_policy ON research_cache
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Challenges: Tenant isolation
CREATE POLICY research_challenges_policy ON research_agent_challenges
  FOR ALL USING (
    auth.role() = 'service_role' OR
    tenant_id IN (SELECT tenant_id FROM research_tenants WHERE is_active = TRUE)
  );

-- Usage metrics: Service role only
CREATE POLICY research_usage_metrics_policy ON research_usage_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Functions for data management

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_research_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM research_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current cost status for a tenant
CREATE OR REPLACE FUNCTION get_tenant_cost_status(p_tenant_id TEXT)
RETURNS TABLE(
  current_cost NUMERIC,
  cost_limit NUMERIC,
  percentage_used NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ct.estimated_cost,
    ct.cost_limit,
    ROUND((ct.estimated_cost / ct.cost_limit * 100)::NUMERIC, 2),
    ct.status
  FROM research_cost_tracking ct
  WHERE ct.tenant_id = p_tenant_id
    AND ct.period = 'month'
    AND ct.period_start >= DATE_TRUNC('month', NOW())
  ORDER BY ct.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record usage metrics
CREATE OR REPLACE FUNCTION record_research_usage(
  p_tenant_id TEXT,
  p_operation TEXT,
  p_model TEXT,
  p_tokens_used INTEGER,
  p_cost NUMERIC,
  p_duration INTEGER
)
RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO research_usage_metrics (
    tenant_id, operation, model, tokens_used, cost, duration
  )
  VALUES (
    p_tenant_id, p_operation, p_model, p_tokens_used, p_cost, p_duration
  )
  RETURNING id INTO metric_id;
  
  -- Update cost tracking for current month
  UPDATE research_cost_tracking
  SET 
    estimated_cost = estimated_cost + p_cost,
    llm_tokens_used = jsonb_set(
      llm_tokens_used,
      ARRAY[p_model],
      to_jsonb((llm_tokens_used->>p_model)::INTEGER + p_tokens_used)
    ),
    status = CASE
      WHEN (estimated_cost + p_cost) / cost_limit >= 1.0 THEN 'blocked'
      WHEN (estimated_cost + p_cost) / cost_limit >= 0.9 THEN 'throttled'
      WHEN (estimated_cost + p_cost) / cost_limit >= 0.8 THEN 'warning'
      ELSE 'normal'
    END
  WHERE tenant_id = p_tenant_id
    AND period = 'month'
    AND period_start >= DATE_TRUNC('month', NOW());
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cleanup_research_cache() TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_cost_status(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION record_research_usage(TEXT, TEXT, TEXT, INTEGER, NUMERIC, INTEGER) TO service_role;

-- Create view for insights analytics
CREATE VIEW research_insights_analytics AS
SELECT 
  tenant_id,
  track_type,
  severity,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as insight_count
FROM research_insights
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, track_type, severity, DATE_TRUNC('day', created_at)
ORDER BY day DESC;

GRANT SELECT ON research_insights_analytics TO service_role;

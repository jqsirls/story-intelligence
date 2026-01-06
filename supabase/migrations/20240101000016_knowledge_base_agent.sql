-- Knowledge Base Agent Migration
-- Creates tables and functions for the Knowledge Base Agent system
-- Supports Story Intelligence™ brand education and platform guidance

-- ============================================================================
-- KNOWLEDGE BASE TABLES
-- ============================================================================

-- Knowledge query logs for analytics and improvement
CREATE TABLE IF NOT EXISTS knowledge_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  category TEXT CHECK (category IN ('platform_usage', 'story_creation', 'account_management', 'troubleshooting', 'features', 'general', 'story_intelligence')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  response_type TEXT CHECK (response_type IN ('knowledge_base', 'faq', 'escalation', 'fallback')) NOT NULL,
  response_id TEXT, -- Reference to specific knowledge item
  user_satisfied BOOLEAN,
  escalated_to_support BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support escalations from knowledge base
CREATE TABLE IF NOT EXISTS knowledge_support_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES knowledge_queries(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  escalation_reason TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')) DEFAULT 'pending',
  assigned_to TEXT, -- Support agent identifier
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Knowledge base content for dynamic updates (future use)
CREATE TABLE IF NOT EXISTS knowledge_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT CHECK (content_type IN ('faq', 'story_intelligence', 'platform_feature', 'troubleshooting')) NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[], -- Array of tags for search
  user_types TEXT[] CHECK (user_types <@ ARRAY['child', 'parent', 'teacher', 'organization_admin', 'all']),
  confidence_threshold DECIMAL(3,2) DEFAULT 0.7,
  popularity_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by TEXT, -- Admin user who created/updated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge base analytics for optimization
CREATE TABLE IF NOT EXISTS knowledge_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_queries INTEGER DEFAULT 0,
  resolved_queries INTEGER DEFAULT 0,
  escalated_queries INTEGER DEFAULT 0,
  avg_confidence DECIMAL(3,2),
  top_categories JSONB, -- JSON array of popular categories
  user_satisfaction_rate DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_queries_user_id ON knowledge_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_queries_session_id ON knowledge_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_queries_category ON knowledge_queries(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_queries_created_at ON knowledge_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_queries_escalated ON knowledge_queries(escalated_to_support);

-- Support escalation indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_escalations_status ON knowledge_support_escalations(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_escalations_priority ON knowledge_support_escalations(priority);
CREATE INDEX IF NOT EXISTS idx_knowledge_escalations_created_at ON knowledge_support_escalations(created_at);

-- Content management indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_content_type ON knowledge_content(content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_category ON knowledge_content(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_active ON knowledge_content(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_tags ON knowledge_content USING GIN(tags);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_analytics_date ON knowledge_analytics(date);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all knowledge base tables
ALTER TABLE knowledge_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_support_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_analytics ENABLE ROW LEVEL SECURITY;

-- Knowledge queries: Users can only see their own queries
CREATE POLICY knowledge_queries_user_policy ON knowledge_queries
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'support'
  );

-- Support escalations: Users can see their own, support agents can see assigned
CREATE POLICY knowledge_escalations_policy ON knowledge_support_escalations
  FOR ALL USING (
    auth.uid() = user_id OR 
    auth.jwt() ->> 'role' = 'admin' OR
    auth.jwt() ->> 'role' = 'support'
  );

-- Knowledge content: Read-only for users, full access for admins
CREATE POLICY knowledge_content_read_policy ON knowledge_content
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY knowledge_content_admin_policy ON knowledge_content
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Analytics: Admin only
CREATE POLICY knowledge_analytics_admin_policy ON knowledge_analytics
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to log knowledge queries
CREATE OR REPLACE FUNCTION log_knowledge_query(
  p_user_id UUID,
  p_session_id TEXT,
  p_query_text TEXT,
  p_category TEXT,
  p_confidence_score DECIMAL,
  p_response_type TEXT,
  p_response_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  query_id UUID;
BEGIN
  INSERT INTO knowledge_queries (
    user_id, session_id, query_text, category, 
    confidence_score, response_type, response_id
  ) VALUES (
    p_user_id, p_session_id, p_query_text, p_category,
    p_confidence_score, p_response_type, p_response_id
  ) RETURNING id INTO query_id;
  
  RETURN query_id;
END;
$$;

-- Function to escalate to support
CREATE OR REPLACE FUNCTION escalate_knowledge_query(
  p_query_id UUID,
  p_escalation_reason TEXT,
  p_priority TEXT DEFAULT 'medium'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  escalation_id UUID;
  query_user_id UUID;
BEGIN
  -- Get user_id from the original query
  SELECT user_id INTO query_user_id 
  FROM knowledge_queries 
  WHERE id = p_query_id;
  
  -- Create escalation record
  INSERT INTO knowledge_support_escalations (
    query_id, user_id, escalation_reason, priority
  ) VALUES (
    p_query_id, query_user_id, p_escalation_reason, p_priority
  ) RETURNING id INTO escalation_id;
  
  -- Mark query as escalated
  UPDATE knowledge_queries 
  SET escalated_to_support = TRUE 
  WHERE id = p_query_id;
  
  RETURN escalation_id;
END;
$$;

-- Function to update daily analytics
CREATE OR REPLACE FUNCTION update_knowledge_analytics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_count INTEGER;
  resolved_count INTEGER;
  escalated_count INTEGER;
  avg_conf DECIMAL(3,2);
  satisfaction_rate DECIMAL(3,2);
BEGIN
  -- Calculate daily metrics
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE response_type IN ('knowledge_base', 'faq')),
    COUNT(*) FILTER (WHERE escalated_to_support = TRUE),
    AVG(confidence_score),
    AVG(CASE WHEN user_satisfied THEN 1.0 ELSE 0.0 END)
  INTO total_count, resolved_count, escalated_count, avg_conf, satisfaction_rate
  FROM knowledge_queries
  WHERE DATE(created_at) = p_date;
  
  -- Insert or update analytics record
  INSERT INTO knowledge_analytics (
    date, total_queries, resolved_queries, escalated_queries,
    avg_confidence, user_satisfaction_rate
  ) VALUES (
    p_date, total_count, resolved_count, escalated_count,
    avg_conf, satisfaction_rate
  )
  ON CONFLICT (date) DO UPDATE SET
    total_queries = EXCLUDED.total_queries,
    resolved_queries = EXCLUDED.resolved_queries,
    escalated_queries = EXCLUDED.escalated_queries,
    avg_confidence = EXCLUDED.avg_confidence,
    user_satisfaction_rate = EXCLUDED.user_satisfaction_rate;
END;
$$;

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================

-- Function to clean up old knowledge query logs (GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_knowledge_queries()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete query logs older than 1 year
  DELETE FROM knowledge_queries 
  WHERE created_at < NOW() - INTERVAL '365 days';
  
  -- Delete resolved escalations older than 2 years
  DELETE FROM knowledge_support_escalations 
  WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '730 days';
  
  -- Delete analytics older than 3 years
  DELETE FROM knowledge_analytics 
  WHERE date < CURRENT_DATE - INTERVAL '3 years';
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE knowledge_queries IS 'Logs all queries to the Knowledge Base Agent for analytics and improvement';
COMMENT ON TABLE knowledge_support_escalations IS 'Tracks queries that need human support intervention';
COMMENT ON TABLE knowledge_content IS 'Dynamic knowledge base content (future feature for admin updates)';
COMMENT ON TABLE knowledge_analytics IS 'Daily aggregated metrics for knowledge base performance';

COMMENT ON FUNCTION log_knowledge_query IS 'Logs a knowledge base query with metadata for analytics';
COMMENT ON FUNCTION escalate_knowledge_query IS 'Creates support escalation from knowledge base query';
COMMENT ON FUNCTION update_knowledge_analytics IS 'Updates daily analytics for knowledge base performance';
COMMENT ON FUNCTION cleanup_knowledge_queries IS 'GDPR-compliant cleanup of old knowledge base data';

-- ============================================================================
-- INITIAL DATA SEEDING
-- ============================================================================

-- Seed some initial knowledge content for the Story Intelligence™ brand
INSERT INTO knowledge_content (
  content_type, category, title, content, tags, user_types
) VALUES 
(
  'story_intelligence',
  'brand_overview',
  'What is Story Intelligence™?',
  'Story Intelligence™ is the revolutionary technology created by Storytailor Inc that enables award-caliber personal storytelling. Like OpenAI licenses GPT to power other platforms, Storytailor Inc will eventually license Story Intelligence to empower storytelling across industries.',
  ARRAY['story intelligence', 'brand', 'technology'],
  ARRAY['all']
),
(
  'story_intelligence',
  'si_vs_ai',
  'Why do you say "SI Powered" instead of "AI-powered"?',
  'Story Intelligence™ is specialized narrative intelligence focused on creating award-caliber personal stories. While others say "AI-powered," we say "SI Powered" or "Powered by Story Intelligence™" because our technology is specifically designed for narrative creation, emotional understanding, and family bonding.',
  ARRAY['story intelligence', 'ai', 'branding', 'messaging'],
  ARRAY['all']
),
(
  'story_intelligence',
  'new_category',
  'What new category does Storytailor create?',
  'Storytailor creates a completely new category focused on "story creation + off-screen activities." We don''t create "books" - we create award-caliber stories that generate real-world family activities and memories. This complements traditional reading without replacing authors or illustrators.',
  ARRAY['new category', 'story creation', 'activities', 'books'],
  ARRAY['parent', 'teacher']
);

-- Grant necessary permissions for the service role
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
-- Enhanced Emotion Intelligence System Migration
-- Requirements: 7.1, 7.2, 7.3

-- Response latency tracking for engagement analysis
CREATE TABLE IF NOT EXISTS response_latency_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('character_trait', 'story_choice', 'emotional_checkin', 'general')) NOT NULL,
  question TEXT NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_response_latency_user_session (user_id, session_id),
  INDEX idx_response_latency_created_at (created_at),
  INDEX idx_response_latency_question_type (question_type)
);

-- Story choice tracking for pattern analysis
CREATE TABLE IF NOT EXISTS story_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  story_id UUID REFERENCES stories,
  choice_point TEXT NOT NULL,
  choice_options TEXT[] NOT NULL,
  selected_choice TEXT NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  emotional_context TEXT CHECK (emotional_context IN ('happy', 'sad', 'scared', 'angry', 'neutral')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_story_choices_user (user_id),
  INDEX idx_story_choices_session (session_id),
  INDEX idx_story_choices_created_at (created_at),
  INDEX idx_story_choices_emotional_context (emotional_context)
);

-- Voice analysis results for sophisticated emotion detection
CREATE TABLE IF NOT EXISTS voice_analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  audio_duration NUMERIC NOT NULL,
  sample_rate INTEGER NOT NULL,
  detected_emotions TEXT[] NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  voice_characteristics JSONB NOT NULL,
  emotional_markers JSONB DEFAULT '[]',
  stress_indicators JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Audio analysis data retention
  
  -- Indexes for performance
  INDEX idx_voice_analysis_user (user_id),
  INDEX idx_voice_analysis_session (session_id),
  INDEX idx_voice_analysis_created_at (created_at),
  INDEX idx_voice_analysis_expires_at (expires_at)
);

-- Engagement metrics tracking
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  average_response_time NUMERIC NOT NULL,
  response_time_variance NUMERIC NOT NULL,
  engagement_level TEXT CHECK (engagement_level IN ('high', 'medium', 'low')) NOT NULL,
  attention_span INTEGER NOT NULL, -- seconds
  fatigue_indicators JSONB DEFAULT '[]',
  recommendations TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_engagement_metrics_user (user_id),
  INDEX idx_engagement_metrics_session (session_id),
  INDEX idx_engagement_metrics_level (engagement_level),
  INDEX idx_engagement_metrics_created_at (created_at)
);

-- Choice patterns for developmental insights
CREATE TABLE IF NOT EXISTS choice_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  pattern_type TEXT CHECK (pattern_type IN ('risk_taking', 'safety_seeking', 'creative_exploration', 'social_preference', 'problem_solving')) NOT NULL,
  frequency NUMERIC CHECK (frequency BETWEEN 0 AND 1) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  examples TEXT[] NOT NULL,
  emotional_correlation JSONB,
  developmental_insights TEXT[] DEFAULT '{}',
  time_range JSONB NOT NULL, -- {start: timestamp, end: timestamp}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_choice_patterns_user (user_id),
  INDEX idx_choice_patterns_type (pattern_type),
  INDEX idx_choice_patterns_created_at (created_at),
  
  -- Unique constraint to prevent duplicate patterns for same user/type/timerange
  UNIQUE(user_id, pattern_type, ((time_range->>'start')::timestamptz))
);

-- Longitudinal trend tracking
CREATE TABLE IF NOT EXISTS emotional_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  time_range JSONB NOT NULL, -- {start: timestamp, end: timestamp}
  overall_trend TEXT CHECK (overall_trend IN ('improving', 'declining', 'stable', 'volatile')) NOT NULL,
  trend_strength NUMERIC CHECK (trend_strength BETWEEN 0 AND 1) NOT NULL,
  significant_changes JSONB DEFAULT '[]',
  seasonal_patterns JSONB DEFAULT '[]',
  weekly_patterns JSONB DEFAULT '[]',
  correlations JSONB DEFAULT '[]',
  developmental_milestones JSONB DEFAULT '[]',
  risk_factors JSONB DEFAULT '[]',
  protective_factors JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_emotional_trends_user (user_id),
  INDEX idx_emotional_trends_trend (overall_trend),
  INDEX idx_emotional_trends_created_at (created_at),
  
  -- Unique constraint for user/timerange
  UNIQUE(user_id, ((time_range->>'start')::timestamptz), ((time_range->>'end')::timestamptz))
);

-- Intervention triggers tracking
CREATE TABLE IF NOT EXISTS intervention_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  trigger_type TEXT CHECK (trigger_type IN ('fatigue', 'distress', 'disengagement', 'confusion', 'emotional_distress', 'developmental_concern', 'behavioral_pattern')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) NOT NULL,
  source TEXT CHECK (source IN ('latency_analysis', 'choice_patterns', 'voice_analysis', 'longitudinal_trends')) NOT NULL,
  description TEXT NOT NULL,
  recommendations TEXT[] NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Indexes for performance
  INDEX idx_intervention_triggers_user (user_id),
  INDEX idx_intervention_triggers_type (trigger_type),
  INDEX idx_intervention_triggers_severity (severity),
  INDEX idx_intervention_triggers_detected_at (detected_at),
  INDEX idx_intervention_triggers_unresolved (resolved_at) WHERE resolved_at IS NULL
);

-- Emotional correlations tracking
CREATE TABLE IF NOT EXISTS emotional_correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'scared', 'angry', 'neutral')) NOT NULL,
  preferred_choice_types TEXT[] NOT NULL,
  avoided_choice_types TEXT[] NOT NULL,
  response_time_pattern TEXT CHECK (response_time_pattern IN ('faster', 'slower', 'normal')) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  sample_size INTEGER NOT NULL,
  time_range JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_emotional_correlations_user (user_id),
  INDEX idx_emotional_correlations_mood (mood),
  INDEX idx_emotional_correlations_created_at (created_at),
  
  -- Unique constraint for user/mood/timerange
  UNIQUE(user_id, mood, ((time_range->>'start')::timestamptz))
);

-- Row Level Security Policies

-- Response latency data - users can only access their own data
ALTER TABLE response_latency_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY response_latency_data_policy ON response_latency_data
  FOR ALL USING (user_id = auth.uid());

-- Story choices - users can only access their own data
ALTER TABLE story_choices ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_choices_policy ON story_choices
  FOR ALL USING (user_id = auth.uid());

-- Voice analysis results - users can only access their own data
ALTER TABLE voice_analysis_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_analysis_results_policy ON voice_analysis_results
  FOR ALL USING (user_id = auth.uid());

-- Engagement metrics - users can only access their own data
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY engagement_metrics_policy ON engagement_metrics
  FOR ALL USING (user_id = auth.uid());

-- Choice patterns - users can only access their own data
ALTER TABLE choice_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY choice_patterns_policy ON choice_patterns
  FOR ALL USING (user_id = auth.uid());

-- Emotional trends - users can only access their own data
ALTER TABLE emotional_trends ENABLE ROW LEVEL SECURITY;
CREATE POLICY emotional_trends_policy ON emotional_trends
  FOR ALL USING (user_id = auth.uid());

-- Intervention triggers - users can only access their own data
ALTER TABLE intervention_triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY intervention_triggers_policy ON intervention_triggers
  FOR ALL USING (user_id = auth.uid());

-- Emotional correlations - users can only access their own data
ALTER TABLE emotional_correlations ENABLE ROW LEVEL SECURITY;
CREATE POLICY emotional_correlations_policy ON emotional_correlations
  FOR ALL USING (user_id = auth.uid());

-- Functions for data cleanup and maintenance

-- Function to clean up expired voice analysis data
CREATE OR REPLACE FUNCTION cleanup_expired_voice_analysis()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM voice_analysis_results 
  WHERE expires_at < NOW();
  
  -- Log cleanup activity
  INSERT INTO audit_log (agent_name, action, payload)
  VALUES ('EmotionAgent', 'cleanup_expired_voice_analysis', 
          jsonb_build_object('deleted_at', NOW()));
END;
$$;

-- Function to calculate engagement trends
CREATE OR REPLACE FUNCTION calculate_engagement_trends(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  trend_direction TEXT,
  trend_strength NUMERIC,
  average_engagement TEXT,
  recommendations TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  early_engagement NUMERIC;
  recent_engagement NUMERIC;
  engagement_change NUMERIC;
BEGIN
  -- Calculate early period engagement (first half of time range)
  SELECT AVG(
    CASE engagement_level 
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END
  ) INTO early_engagement
  FROM engagement_metrics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL
    AND created_at <= NOW() - (p_days/2 || ' days')::INTERVAL;

  -- Calculate recent period engagement (second half of time range)
  SELECT AVG(
    CASE engagement_level 
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END
  ) INTO recent_engagement
  FROM engagement_metrics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - (p_days/2 || ' days')::INTERVAL;

  -- Calculate change
  engagement_change := COALESCE(recent_engagement, 2) - COALESCE(early_engagement, 2);

  -- Return results
  RETURN QUERY SELECT
    CASE 
      WHEN engagement_change > 0.3 THEN 'improving'
      WHEN engagement_change < -0.3 THEN 'declining'
      ELSE 'stable'
    END as trend_direction,
    ABS(engagement_change) as trend_strength,
    CASE 
      WHEN COALESCE(recent_engagement, 2) >= 2.5 THEN 'high'
      WHEN COALESCE(recent_engagement, 2) >= 1.5 THEN 'medium'
      ELSE 'low'
    END as average_engagement,
    CASE 
      WHEN engagement_change < -0.3 THEN ARRAY['Consider shorter sessions', 'Try more interactive content', 'Check for external stressors']
      WHEN COALESCE(recent_engagement, 2) < 1.5 THEN ARRAY['Increase engagement through varied activities', 'Monitor attention span', 'Consider break times']
      ELSE ARRAY['Continue current approach', 'Maintain engagement levels']
    END as recommendations;
END;
$$;

-- Function to detect pattern anomalies
CREATE OR REPLACE FUNCTION detect_pattern_anomalies(p_user_id UUID)
RETURNS TABLE (
  anomaly_type TEXT,
  severity TEXT,
  description TEXT,
  detected_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Detect sudden changes in choice patterns
  RETURN QUERY
  WITH pattern_changes AS (
    SELECT 
      cp1.pattern_type,
      cp1.frequency as current_freq,
      cp2.frequency as previous_freq,
      cp1.created_at
    FROM choice_patterns cp1
    LEFT JOIN choice_patterns cp2 ON cp1.user_id = cp2.user_id 
      AND cp1.pattern_type = cp2.pattern_type
      AND cp2.created_at < cp1.created_at
    WHERE cp1.user_id = p_user_id
      AND cp1.created_at >= NOW() - INTERVAL '7 days'
  )
  SELECT 
    'choice_pattern_change' as anomaly_type,
    CASE 
      WHEN ABS(current_freq - COALESCE(previous_freq, 0.5)) > 0.4 THEN 'high'
      WHEN ABS(current_freq - COALESCE(previous_freq, 0.5)) > 0.2 THEN 'medium'
      ELSE 'low'
    END as severity,
    'Significant change in ' || pattern_type || ' pattern frequency' as description,
    created_at as detected_at
  FROM pattern_changes
  WHERE ABS(current_freq - COALESCE(previous_freq, 0.5)) > 0.2;
END;
$$;

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emotions_user_created_at ON emotions(user_id, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_emotions_mood_confidence ON emotions(mood, confidence);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_response_latency_response_time ON response_latency_data(response_time);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_story_choices_response_time ON story_choices(response_time);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON response_latency_data TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_choices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON voice_analysis_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON engagement_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON choice_patterns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emotional_trends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON intervention_triggers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emotional_correlations TO authenticated;

GRANT EXECUTE ON FUNCTION cleanup_expired_voice_analysis() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_engagement_trends(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION detect_pattern_anomalies(UUID) TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE response_latency_data IS 'Tracks response times for engagement analysis and fatigue detection';
COMMENT ON TABLE story_choices IS 'Records story choices for pattern analysis and emotional correlation';
COMMENT ON TABLE voice_analysis_results IS 'Stores sophisticated voice pattern analysis results for emotion detection';
COMMENT ON TABLE engagement_metrics IS 'Aggregated engagement metrics per session for trend analysis';
COMMENT ON TABLE choice_patterns IS 'Identified behavioral patterns from story choices';
COMMENT ON TABLE emotional_trends IS 'Longitudinal emotional trend analysis and developmental insights';
COMMENT ON TABLE intervention_triggers IS 'Detected triggers requiring intervention or attention';
COMMENT ON TABLE emotional_correlations IS 'Correlations between emotions and choice patterns';

COMMENT ON FUNCTION cleanup_expired_voice_analysis() IS 'Cleans up expired voice analysis data for privacy compliance';
COMMENT ON FUNCTION calculate_engagement_trends(UUID, INTEGER) IS 'Calculates engagement trends over specified time period';
COMMENT ON FUNCTION detect_pattern_anomalies(UUID) IS 'Detects anomalies in behavioral patterns that may require attention';

-- Additional tables for predictive emotional support

-- Early intervention signals tracking
CREATE TABLE IF NOT EXISTS early_intervention_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('emotional_decline', 'behavioral_change', 'engagement_drop', 'stress_accumulation', 'social_withdrawal')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  indicators JSONB NOT NULL DEFAULT '[]',
  predicted_outcome TEXT NOT NULL,
  time_to_intervention INTEGER NOT NULL, -- hours
  recommended_actions TEXT[] NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Indexes for performance
  INDEX idx_early_intervention_user (user_id),
  INDEX idx_early_intervention_type (signal_type),
  INDEX idx_early_intervention_severity (severity),
  INDEX idx_early_intervention_detected_at (detected_at),
  INDEX idx_early_intervention_unresolved (resolved_at) WHERE resolved_at IS NULL
);

-- Risk assessments tracking
CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  overall_risk_level TEXT CHECK (overall_risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  risk_factors JSONB NOT NULL DEFAULT '[]',
  protective_factors JSONB NOT NULL DEFAULT '[]',
  intervention_urgency TEXT CHECK (intervention_urgency IN ('none', 'monitor', 'schedule', 'immediate')) NOT NULL,
  recommended_interventions JSONB NOT NULL DEFAULT '[]',
  next_assessment_due TIMESTAMPTZ NOT NULL,
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  assessor TEXT DEFAULT 'system',
  notes TEXT,
  
  -- Indexes for performance
  INDEX idx_risk_assessments_user (user_id),
  INDEX idx_risk_assessments_risk_level (overall_risk_level),
  INDEX idx_risk_assessments_urgency (intervention_urgency),
  INDEX idx_risk_assessments_next_due (next_assessment_due),
  INDEX idx_risk_assessments_date (assessment_date)
);

-- Therapeutic story pathways
CREATE TABLE IF NOT EXISTS therapeutic_pathways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  pathway_name TEXT NOT NULL,
  target_emotions TEXT[] NOT NULL,
  story_progression JSONB NOT NULL,
  expected_outcomes TEXT[] NOT NULL,
  duration INTEGER NOT NULL, -- sessions
  adaptation_triggers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  
  -- Indexes for performance
  INDEX idx_therapeutic_pathways_user (user_id),
  INDEX idx_therapeutic_pathways_status (status),
  INDEX idx_therapeutic_pathways_created_at (created_at)
);

-- Emotional journeys tracking
CREATE TABLE IF NOT EXISTS emotional_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  pathway_id UUID REFERENCES therapeutic_pathways NOT NULL,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  current_step INTEGER DEFAULT 0,
  progress JSONB NOT NULL DEFAULT '[]',
  adaptations JSONB NOT NULL DEFAULT '[]',
  outcomes JSONB NOT NULL DEFAULT '[]',
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'cancelled')) DEFAULT 'active',
  completion_date TIMESTAMPTZ,
  
  -- Indexes for performance
  INDEX idx_emotional_journeys_user (user_id),
  INDEX idx_emotional_journeys_pathway (pathway_id),
  INDEX idx_emotional_journeys_status (status),
  INDEX idx_emotional_journeys_start_date (start_date)
);

-- Story recommendations tracking
CREATE TABLE IF NOT EXISTS story_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  story_type TEXT NOT NULL,
  theme TEXT NOT NULL,
  tone TEXT CHECK (tone IN ('uplifting', 'calming', 'energetic', 'gentle', 'neutral')) NOT NULL,
  reasoning TEXT NOT NULL,
  expected_emotional_impact TEXT NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  adaptations JSONB NOT NULL DEFAULT '[]',
  recommended_at TIMESTAMPTZ DEFAULT NOW(),
  accepted BOOLEAN,
  accepted_at TIMESTAMPTZ,
  feedback TEXT,
  emotional_outcome TEXT,
  
  -- Indexes for performance
  INDEX idx_story_recommendations_user (user_id),
  INDEX idx_story_recommendations_type (story_type),
  INDEX idx_story_recommendations_tone (tone),
  INDEX idx_story_recommendations_recommended_at (recommended_at),
  INDEX idx_story_recommendations_accepted (accepted) WHERE accepted IS NOT NULL
);

-- Crisis indicators and responses
CREATE TABLE IF NOT EXISTS crisis_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  indicator_type TEXT CHECK (indicator_type IN ('emotional_distress', 'behavioral_concern', 'safety_risk', 'self_harm_reference', 'abuse_disclosure')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  confidence NUMERIC CHECK (confidence BETWEEN 0 AND 1) NOT NULL,
  source TEXT CHECK (source IN ('voice_analysis', 'text_content', 'behavioral_pattern', 'direct_disclosure')) NOT NULL,
  evidence TEXT[] NOT NULL,
  context JSONB NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_crisis_indicators_user (user_id),
  INDEX idx_crisis_indicators_session (session_id),
  INDEX idx_crisis_indicators_type (indicator_type),
  INDEX idx_crisis_indicators_severity (severity),
  INDEX idx_crisis_indicators_detected_at (detected_at)
);

-- Crisis responses tracking
CREATE TABLE IF NOT EXISTS crisis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  escalation_actions JSONB NOT NULL,
  immediate_response TEXT NOT NULL,
  parent_notification JSONB NOT NULL,
  professional_referral JSONB,
  follow_up_schedule JSONB NOT NULL,
  documentation_required BOOLEAN NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Indexes for performance
  INDEX idx_crisis_responses_user (user_id),
  INDEX idx_crisis_responses_risk_level (risk_level),
  INDEX idx_crisis_responses_detected_at (detected_at),
  INDEX idx_crisis_responses_unresolved (resolved_at) WHERE resolved_at IS NULL
);

-- Safety plans
CREATE TABLE IF NOT EXISTS safety_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users NOT NULL,
  trigger_signs TEXT[] NOT NULL,
  coping_strategies TEXT[] NOT NULL,
  support_contacts JSONB NOT NULL DEFAULT '[]',
  professional_contacts JSONB NOT NULL DEFAULT '[]',
  safe_environment_steps TEXT[] NOT NULL,
  emergency_contacts JSONB NOT NULL DEFAULT '[]',
  review_schedule TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('active', 'inactive', 'archived')) DEFAULT 'active',
  
  -- Indexes for performance
  INDEX idx_safety_plans_user (user_id),
  INDEX idx_safety_plans_status (status),
  INDEX idx_safety_plans_created_at (created_at)
);

-- Row Level Security Policies for new tables

-- Early intervention signals - users can only access their own data
ALTER TABLE early_intervention_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY early_intervention_signals_policy ON early_intervention_signals
  FOR ALL USING (user_id = auth.uid());

-- Risk assessments - users can only access their own data
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY risk_assessments_policy ON risk_assessments
  FOR ALL USING (user_id = auth.uid());

-- Therapeutic pathways - users can only access their own data
ALTER TABLE therapeutic_pathways ENABLE ROW LEVEL SECURITY;
CREATE POLICY therapeutic_pathways_policy ON therapeutic_pathways
  FOR ALL USING (user_id = auth.uid());

-- Emotional journeys - users can only access their own data
ALTER TABLE emotional_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY emotional_journeys_policy ON emotional_journeys
  FOR ALL USING (user_id = auth.uid());

-- Story recommendations - users can only access their own data
ALTER TABLE story_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_recommendations_policy ON story_recommendations
  FOR ALL USING (user_id = auth.uid());

-- Crisis indicators - users can only access their own data
ALTER TABLE crisis_indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY crisis_indicators_policy ON crisis_indicators
  FOR ALL USING (user_id = auth.uid());

-- Crisis responses - users can only access their own data
ALTER TABLE crisis_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY crisis_responses_policy ON crisis_responses
  FOR ALL USING (user_id = auth.uid());

-- Safety plans - users can only access their own data
ALTER TABLE safety_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY safety_plans_policy ON safety_plans
  FOR ALL USING (user_id = auth.uid());

-- Grant permissions for new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON early_intervention_signals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON risk_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON therapeutic_pathways TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON emotional_journeys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON story_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crisis_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON crisis_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON safety_plans TO authenticated;

-- Additional functions for predictive emotional support

-- Function to calculate intervention priority score
CREATE OR REPLACE FUNCTION calculate_intervention_priority(p_user_id UUID)
RETURNS TABLE (
  priority_score NUMERIC,
  priority_level TEXT,
  recommended_actions TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signal_score NUMERIC := 0;
  risk_score NUMERIC := 0;
  crisis_score NUMERIC := 0;
  total_score NUMERIC;
BEGIN
  -- Calculate early intervention signal score
  SELECT COALESCE(AVG(
    CASE severity 
      WHEN 'critical' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END * confidence
  ), 0) INTO signal_score
  FROM early_intervention_signals
  WHERE user_id = p_user_id
    AND detected_at >= NOW() - INTERVAL '7 days'
    AND resolved_at IS NULL;

  -- Calculate risk assessment score
  SELECT COALESCE(
    CASE overall_risk_level 
      WHEN 'critical' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END, 0
  ) INTO risk_score
  FROM risk_assessments
  WHERE user_id = p_user_id
  ORDER BY assessment_date DESC
  LIMIT 1;

  -- Calculate crisis indicator score
  SELECT COALESCE(AVG(
    CASE severity 
      WHEN 'critical' THEN 4
      WHEN 'high' THEN 3
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 1
    END * confidence
  ), 0) INTO crisis_score
  FROM crisis_indicators
  WHERE user_id = p_user_id
    AND detected_at >= NOW() - INTERVAL '24 hours';

  -- Calculate total priority score
  total_score := (signal_score * 0.4) + (risk_score * 0.4) + (crisis_score * 0.2);

  -- Return results
  RETURN QUERY SELECT
    total_score as priority_score,
    CASE 
      WHEN total_score >= 3.5 THEN 'urgent'
      WHEN total_score >= 2.5 THEN 'high'
      WHEN total_score >= 1.5 THEN 'medium'
      ELSE 'low'
    END as priority_level,
    CASE 
      WHEN total_score >= 3.5 THEN ARRAY['Immediate professional intervention', 'Crisis protocol activation', 'Parent notification']
      WHEN total_score >= 2.5 THEN ARRAY['Schedule professional consultation', 'Increase monitoring', 'Therapeutic pathway activation']
      WHEN total_score >= 1.5 THEN ARRAY['Enhanced emotional support', 'Pattern monitoring', 'Preventive interventions']
      ELSE ARRAY['Continue regular monitoring', 'Maintain supportive environment']
    END as recommended_actions;
END;
$$;

-- Function to generate therapeutic pathway recommendations
CREATE OR REPLACE FUNCTION recommend_therapeutic_pathway(p_user_id UUID)
RETURNS TABLE (
  pathway_type TEXT,
  target_emotions TEXT[],
  estimated_duration INTEGER,
  confidence NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dominant_mood TEXT;
  recent_patterns JSONB;
  risk_level TEXT;
BEGIN
  -- Get dominant recent mood
  SELECT mood INTO dominant_mood
  FROM emotions
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY mood
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- Get risk level
  SELECT overall_risk_level INTO risk_level
  FROM risk_assessments
  WHERE user_id = p_user_id
  ORDER BY assessment_date DESC
  LIMIT 1;

  -- Return pathway recommendations based on mood and risk
  RETURN QUERY SELECT
    CASE 
      WHEN dominant_mood IN ('sad', 'scared') AND risk_level IN ('high', 'critical') THEN 'Crisis Support Pathway'
      WHEN dominant_mood = 'sad' THEN 'Hope and Healing Pathway'
      WHEN dominant_mood = 'scared' THEN 'Courage and Calm Pathway'
      WHEN dominant_mood = 'angry' THEN 'Balance and Understanding Pathway'
      ELSE 'Growth and Discovery Pathway'
    END as pathway_type,
    CASE 
      WHEN dominant_mood IN ('sad', 'scared') THEN ARRAY['happy', 'neutral']::TEXT[]
      WHEN dominant_mood = 'angry' THEN ARRAY['neutral', 'happy']::TEXT[]
      ELSE ARRAY['happy']::TEXT[]
    END as target_emotions,
    CASE 
      WHEN risk_level IN ('high', 'critical') THEN 10
      WHEN risk_level = 'medium' THEN 7
      ELSE 5
    END as estimated_duration,
    CASE 
      WHEN dominant_mood IS NOT NULL AND risk_level IS NOT NULL THEN 0.8
      WHEN dominant_mood IS NOT NULL THEN 0.6
      ELSE 0.4
    END as confidence;
END;
$$;

GRANT EXECUTE ON FUNCTION calculate_intervention_priority(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION recommend_therapeutic_pathway(UUID) TO authenticated;

-- Add comments for new tables
COMMENT ON TABLE early_intervention_signals IS 'Tracks early intervention signals for proactive emotional support';
COMMENT ON TABLE risk_assessments IS 'Comprehensive risk assessments for user emotional wellbeing';
COMMENT ON TABLE therapeutic_pathways IS 'Therapeutic story pathways for structured emotional support';
COMMENT ON TABLE emotional_journeys IS 'User progress through therapeutic pathways';
COMMENT ON TABLE story_recommendations IS 'Mood-based story recommendations with tracking';
COMMENT ON TABLE crisis_indicators IS 'Crisis indicators detected from various sources';
COMMENT ON TABLE crisis_responses IS 'Crisis response protocols and actions taken';
COMMENT ON TABLE safety_plans IS 'Personalized safety plans for users at risk';

COMMENT ON FUNCTION calculate_intervention_priority(UUID) IS 'Calculates intervention priority score based on multiple risk factors';
COMMENT ON FUNCTION recommend_therapeutic_pathway(UUID) IS 'Recommends appropriate therapeutic pathway based on user emotional patterns';
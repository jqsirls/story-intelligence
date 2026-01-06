-- Accessibility Framework Database Schema
-- This migration creates tables for the accessibility and inclusion framework

-- Accessibility profiles for individual users
CREATE TABLE accessibility_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  profile_name TEXT NOT NULL DEFAULT 'Default Profile',
  
  -- Speech and Communication
  speech_processing_delay INTEGER DEFAULT 0 CHECK (speech_processing_delay >= 0 AND speech_processing_delay <= 10000),
  extended_response_time BOOLEAN DEFAULT FALSE,
  alternative_input_methods TEXT[] DEFAULT '{}',
  
  -- Vocabulary and Language
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'standard', 'advanced')) DEFAULT 'standard',
  simplified_language_mode BOOLEAN DEFAULT FALSE,
  custom_vocabulary_terms TEXT[] DEFAULT '{}',
  
  -- Attention and Engagement
  attention_span_minutes INTEGER DEFAULT 15 CHECK (attention_span_minutes >= 1 AND attention_span_minutes <= 60),
  engagement_check_frequency INTEGER DEFAULT 120 CHECK (engagement_check_frequency >= 30 AND engagement_check_frequency <= 600),
  shorter_interaction_cycles BOOLEAN DEFAULT FALSE,
  
  -- Assistive Technology
  screen_reader_compatible BOOLEAN DEFAULT FALSE,
  voice_amplifier_integration BOOLEAN DEFAULT FALSE,
  switch_control_support BOOLEAN DEFAULT FALSE,
  eye_tracking_support BOOLEAN DEFAULT FALSE,
  
  -- Motor and Physical
  extended_timeouts BOOLEAN DEFAULT FALSE,
  motor_difficulty_support BOOLEAN DEFAULT FALSE,
  custom_timeout_duration INTEGER DEFAULT 10000 CHECK (custom_timeout_duration >= 5000 AND custom_timeout_duration <= 60000),
  
  -- Visual and Audio
  voice_pace_adjustment NUMERIC DEFAULT 1.0 CHECK (voice_pace_adjustment >= 0.5 AND voice_pace_adjustment <= 2.0),
  visual_cues_enabled BOOLEAN DEFAULT FALSE,
  high_contrast_mode BOOLEAN DEFAULT FALSE,
  large_text_mode BOOLEAN DEFAULT FALSE,
  
  -- Cognitive Support
  memory_aids_enabled BOOLEAN DEFAULT FALSE,
  repetition_frequency INTEGER DEFAULT 1 CHECK (repetition_frequency >= 1 AND repetition_frequency <= 5),
  structured_prompts BOOLEAN DEFAULT FALSE,
  
  -- Preferences and Settings
  preferred_interaction_style TEXT CHECK (preferred_interaction_style IN ('conversational', 'structured', 'guided')) DEFAULT 'conversational',
  break_reminders BOOLEAN DEFAULT FALSE,
  break_reminder_interval INTEGER DEFAULT 600 CHECK (break_reminder_interval >= 300 AND break_reminder_interval <= 1800),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, profile_name)
);

-- Communication adaptations log
CREATE TABLE communication_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  adaptation_type TEXT CHECK (adaptation_type IN ('speech_delay', 'vocabulary_level', 'attention_span', 'motor_support')) NOT NULL,
  original_input TEXT NOT NULL,
  adapted_response TEXT NOT NULL,
  adaptation_reason TEXT NOT NULL,
  effectiveness_score NUMERIC CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement checks and monitoring
CREATE TABLE engagement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  check_type TEXT CHECK (check_type IN ('attention', 'comprehension', 'interest', 'fatigue')) NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  engagement_level NUMERIC CHECK (engagement_level >= 0 AND engagement_level <= 1) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_taken TEXT
);

-- Engagement metrics
CREATE TABLE engagement_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  response_time INTEGER NOT NULL,
  interaction_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  completion_rate NUMERIC CHECK (completion_rate >= 0 AND completion_rate <= 1) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Assistive technology registrations
CREATE TABLE assistive_technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  technology_type TEXT CHECK (technology_type IN ('screen_reader', 'voice_amplifier', 'switch_control', 'eye_tracking', 'other')) NOT NULL,
  device_name TEXT NOT NULL,
  integration_status TEXT CHECK (integration_status IN ('connected', 'disconnected', 'error', 'testing')) DEFAULT 'disconnected',
  capabilities TEXT[] DEFAULT '{}',
  configuration JSONB DEFAULT '{}',
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vocabulary adaptations and learning
CREATE TABLE vocabulary_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_word TEXT NOT NULL,
  simplified_word TEXT NOT NULL,
  context TEXT NOT NULL,
  age_group TEXT CHECK (age_group IN ('3-5', '6-8', '9-11', '12+')) NOT NULL,
  vocabulary_level TEXT CHECK (vocabulary_level IN ('simple', 'standard', 'advanced')) NOT NULL,
  usage_count INTEGER DEFAULT 0,
  effectiveness NUMERIC DEFAULT 0.5 CHECK (effectiveness >= 0 AND effectiveness <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(original_word, simplified_word, age_group, vocabulary_level)
);

-- Vocabulary usage tracking
CREATE TABLE vocabulary_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  original_word TEXT NOT NULL,
  simplified_word TEXT NOT NULL,
  context TEXT,
  effectiveness NUMERIC CHECK (effectiveness >= 0 AND effectiveness <= 1),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Multi-modal input processing
CREATE TABLE multimodal_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_id TEXT NOT NULL,
  input_type TEXT CHECK (input_type IN ('voice', 'touch', 'gesture', 'switch', 'eye_tracking', 'combined')) NOT NULL,
  input_data JSONB NOT NULL,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  processing_time INTEGER NOT NULL
);

-- Response adaptations log
CREATE TABLE response_adaptations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_response TEXT NOT NULL,
  adapted_response TEXT NOT NULL,
  adaptation_types TEXT[] NOT NULL,
  target_profile UUID REFERENCES accessibility_profiles(id) ON DELETE CASCADE NOT NULL,
  effectiveness_score NUMERIC CHECK (effectiveness_score >= 0 AND effectiveness_score <= 1),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Voice pace adjustments log
CREATE TABLE voice_pace_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  adjusted_text TEXT NOT NULL,
  pace_multiplier NUMERIC NOT NULL,
  pause_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Language simplifications log
CREATE TABLE language_simplifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  original_text TEXT NOT NULL,
  simplified_text TEXT NOT NULL,
  readability_score NUMERIC CHECK (readability_score >= 0 AND readability_score <= 1) NOT NULL,
  simplification_count INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_accessibility_profiles_user_id ON accessibility_profiles(user_id);
CREATE INDEX idx_accessibility_profiles_active ON accessibility_profiles(user_id, is_active);
CREATE INDEX idx_communication_adaptations_user_session ON communication_adaptations(user_id, session_id);
CREATE INDEX idx_communication_adaptations_timestamp ON communication_adaptations(timestamp);
CREATE INDEX idx_engagement_checks_user_session ON engagement_checks(user_id, session_id);
CREATE INDEX idx_engagement_checks_timestamp ON engagement_checks(timestamp);
CREATE INDEX idx_engagement_metrics_user_session ON engagement_metrics(user_id, session_id);
CREATE INDEX idx_assistive_technologies_user_id ON assistive_technologies(user_id);
CREATE INDEX idx_vocabulary_adaptations_lookup ON vocabulary_adaptations(original_word, age_group, vocabulary_level);
CREATE INDEX idx_vocabulary_usage_user_id ON vocabulary_usage_log(user_id);
CREATE INDEX idx_multimodal_inputs_user_session ON multimodal_inputs(user_id, session_id);
CREATE INDEX idx_response_adaptations_profile ON response_adaptations(target_profile);

-- Row Level Security (RLS) policies
ALTER TABLE accessibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistive_technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE multimodal_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_adaptations ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_pace_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_simplifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own data
CREATE POLICY accessibility_profiles_policy ON accessibility_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY communication_adaptations_policy ON communication_adaptations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY engagement_checks_policy ON engagement_checks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY engagement_metrics_policy ON engagement_metrics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY assistive_technologies_policy ON assistive_technologies
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY vocabulary_usage_log_policy ON vocabulary_usage_log
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY multimodal_inputs_policy ON multimodal_inputs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY response_adaptations_policy ON response_adaptations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM accessibility_profiles 
      WHERE id = target_profile AND user_id = auth.uid()
    )
  );

CREATE POLICY voice_pace_adjustments_policy ON voice_pace_adjustments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY language_simplifications_policy ON language_simplifications
  FOR ALL USING (auth.uid() = user_id);

-- Vocabulary adaptations table is public read for all users (no user-specific data)
-- but only system can write to it
CREATE POLICY vocabulary_adaptations_read_policy ON vocabulary_adaptations
  FOR SELECT USING (true);

CREATE POLICY vocabulary_adaptations_write_policy ON vocabulary_adaptations
  FOR INSERT WITH CHECK (false); -- Only system/admin can insert

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_accessibility_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accessibility_profiles_updated_at
  BEFORE UPDATE ON accessibility_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_accessibility_profile_timestamp();

-- Function to clean up old engagement data (privacy compliance)
CREATE OR REPLACE FUNCTION cleanup_old_engagement_data()
RETURNS void AS $$
BEGIN
  -- Delete engagement checks older than 90 days
  DELETE FROM engagement_checks 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete engagement metrics older than 90 days
  DELETE FROM engagement_metrics 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete communication adaptations older than 90 days
  DELETE FROM communication_adaptations 
  WHERE timestamp < NOW() - INTERVAL '90 days';
  
  -- Delete multimodal inputs older than 30 days
  DELETE FROM multimodal_inputs 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete voice pace adjustments older than 30 days
  DELETE FROM voice_pace_adjustments 
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  -- Delete language simplifications older than 30 days
  DELETE FROM language_simplifications 
  WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Insert default vocabulary adaptations
INSERT INTO vocabulary_adaptations (original_word, simplified_word, context, age_group, vocabulary_level, effectiveness) VALUES
  ('magnificent', 'great', 'general', '3-5', 'simple', 0.8),
  ('extraordinary', 'amazing', 'general', '3-5', 'simple', 0.8),
  ('tremendous', 'big', 'size', '3-5', 'simple', 0.9),
  ('fascinating', 'cool', 'general', '3-5', 'simple', 0.8),
  ('adventure', 'trip', 'story', '3-5', 'simple', 0.7),
  ('discover', 'find', 'action', '3-5', 'simple', 0.9),
  ('mysterious', 'strange', 'description', '3-5', 'simple', 0.8),
  ('enormous', 'very big', 'size', '3-5', 'simple', 0.9),
  ('utilize', 'use', 'action', '6-8', 'simple', 0.9),
  ('demonstrate', 'show', 'action', '6-8', 'simple', 0.9),
  ('facilitate', 'help', 'action', '6-8', 'simple', 0.8),
  ('implement', 'do', 'action', '6-8', 'simple', 0.8),
  ('subsequently', 'then', 'sequence', '6-8', 'simple', 0.9),
  ('approximately', 'about', 'quantity', '6-8', 'simple', 0.9);

-- Comments for documentation
COMMENT ON TABLE accessibility_profiles IS 'Individual accessibility profiles for users with specific needs and preferences';
COMMENT ON TABLE communication_adaptations IS 'Log of communication adaptations applied for users';
COMMENT ON TABLE engagement_checks IS 'Engagement monitoring and attention checks during interactions';
COMMENT ON TABLE engagement_metrics IS 'Quantitative engagement metrics for analysis';
COMMENT ON TABLE assistive_technologies IS 'Registered assistive technology devices and their configurations';
COMMENT ON TABLE vocabulary_adaptations IS 'Vocabulary simplification mappings for different age groups and levels';
COMMENT ON TABLE vocabulary_usage_log IS 'Usage tracking for vocabulary adaptations to measure effectiveness';
COMMENT ON TABLE multimodal_inputs IS 'Multi-modal input processing records for accessibility support';
COMMENT ON TABLE response_adaptations IS 'Log of response adaptations applied based on accessibility profiles';
COMMENT ON TABLE voice_pace_adjustments IS 'Voice pace adjustment records for speech processing differences';
COMMENT ON TABLE language_simplifications IS 'Language simplification records for cognitive accessibility';
-- Enhanced database schema and RLS policies for COPPA/GDPR compliance
-- This migration adds missing tables and improves existing policies

-- Audio transcripts table with 30-day TTL for COPPA compliance
CREATE TABLE audio_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  session_id TEXT NOT NULL,
  transcript_text TEXT NOT NULL,
  audio_duration_seconds INTEGER,
  language_code TEXT DEFAULT 'en-US',
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Add missing columns to existing tables for enhanced functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS alexa_person_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_coppa_protected BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_consent_verified BOOLEAN DEFAULT FALSE;

-- Add conversation transcript reference to conversation_states
ALTER TABLE conversation_states ADD COLUMN IF NOT EXISTS transcript_ids UUID[] DEFAULT '{}';

-- Add enhanced audit fields
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS correlation_id TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS pii_hash TEXT; -- SHA-256 hash of any PII

-- Add story interaction tracking for insights
CREATE TABLE story_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  story_id UUID REFERENCES stories NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('created', 'viewed', 'edited', 'shared', 'completed')) NOT NULL,
  interaction_data JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user preferences for accessibility and personalization
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL UNIQUE,
  voice_settings JSONB DEFAULT '{}',
  accessibility_settings JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  privacy_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add data retention policies table for compliance tracking
CREATE TABLE data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  retention_period INTERVAL NOT NULL,
  deletion_strategy TEXT CHECK (deletion_strategy IN ('hard_delete', 'soft_delete', 'anonymize', 'archive')) NOT NULL,
  last_cleanup_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT data_retention_policies_table_name_key UNIQUE (table_name)
);

-- Insert default retention policies
INSERT INTO data_retention_policies (table_name, retention_period, deletion_strategy) VALUES
('audio_transcripts', INTERVAL '30 days', 'hard_delete'),
('emotions', INTERVAL '365 days', 'anonymize'),
('voice_codes', INTERVAL '1 day', 'hard_delete'),
('conversation_states', INTERVAL '24 hours', 'hard_delete'),
('audit_log', INTERVAL '7 years', 'anonymize'); -- Legal requirement for audit logs

-- Create indexes for performance
CREATE INDEX idx_audio_transcripts_user_id ON audio_transcripts(user_id);
CREATE INDEX idx_audio_transcripts_session_id ON audio_transcripts(session_id);
CREATE INDEX idx_audio_transcripts_expires_at ON audio_transcripts(expires_at);
CREATE INDEX idx_story_interactions_user_id ON story_interactions(user_id);
CREATE INDEX idx_story_interactions_story_id ON story_interactions(story_id);
CREATE INDEX idx_story_interactions_session_id ON story_interactions(session_id);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_users_alexa_person_id ON users(alexa_person_id) WHERE alexa_person_id IS NOT NULL;
CREATE INDEX idx_users_is_coppa_protected ON users(is_coppa_protected) WHERE is_coppa_protected = TRUE;

-- Enable RLS on new tables
ALTER TABLE audio_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for new tables

-- Audio transcripts - users can only access their own transcripts
CREATE POLICY audio_transcripts_policy ON audio_transcripts
  FOR ALL USING (user_id = auth.uid());

-- Story interactions - users can only see interactions for stories they have access to
CREATE POLICY story_interactions_policy ON story_interactions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM stories s
      JOIN libraries l ON s.library_id = l.id
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE s.id = story_id AND (
        l.owner = auth.uid() OR 
        lp.user_id = auth.uid()
      )
    )
  );

-- User preferences - users can only access their own preferences
CREATE POLICY user_preferences_policy ON user_preferences
  FOR ALL USING (user_id = auth.uid());

-- Data retention policies - read-only for all authenticated users, admin-only for modifications
CREATE POLICY data_retention_policies_read ON data_retention_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Enhanced permission checking function with COPPA compliance
CREATE OR REPLACE FUNCTION check_library_permission_with_coppa(lib_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_age INTEGER;
  parent_consent BOOLEAN;
  has_permission BOOLEAN;
BEGIN
  -- Get user age and parent consent status
  SELECT age, parent_consent_verified INTO user_age, parent_consent
  FROM users WHERE id = auth.uid();
  
  -- Check if user is COPPA protected (under 13) and needs parent consent
  IF user_age IS NOT NULL AND user_age < 13 AND NOT COALESCE(parent_consent, FALSE) THEN
    RETURN FALSE;
  END IF;
  
  -- Check regular permissions
  SELECT check_library_permission(lib_id, required_role) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced audit logging function with PII hashing
CREATE OR REPLACE FUNCTION log_audit_event_enhanced(
  p_agent_name TEXT,
  p_action TEXT,
  p_payload JSONB,
  p_session_id TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  pii_data TEXT;
  pii_hash_value TEXT;
BEGIN
  -- Extract and hash any PII from payload
  pii_data := COALESCE(p_payload->>'email', '') || 
              COALESCE(p_payload->>'name', '') || 
              COALESCE(p_payload->>'phone', '');
  
  IF LENGTH(pii_data) > 0 THEN
    pii_hash_value := encode(digest(pii_data, 'sha256'), 'hex');
  END IF;
  
  INSERT INTO audit_log (
    user_id, agent_name, action, payload, session_id, 
    correlation_id, pii_hash, ip_address, user_agent
  )
  VALUES (
    auth.uid(), p_agent_name, p_action, p_payload, p_session_id,
    p_correlation_id, pii_hash_value, p_ip_address, p_user_agent
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check COPPA compliance for content creation
CREATE OR REPLACE FUNCTION check_coppa_compliance(p_user_id UUID, p_library_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_age INTEGER;
  parent_consent BOOLEAN;
  is_sub_library BOOLEAN;
BEGIN
  -- Get user information
  SELECT age, parent_consent_verified INTO user_age, parent_consent
  FROM users WHERE id = p_user_id;
  
  -- Check if this is a sub-library (has parent_library)
  SELECT (parent_library IS NOT NULL) INTO is_sub_library
  FROM libraries WHERE id = p_library_id;
  
  -- If user is under 13 and creating content in a sub-library, require parent consent
  IF user_age IS NOT NULL AND user_age < 13 AND is_sub_library THEN
    RETURN COALESCE(parent_consent, FALSE);
  END IF;
  
  -- Otherwise, allow the operation
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced cleanup function with comprehensive data retention
CREATE OR REPLACE FUNCTION cleanup_expired_data_enhanced()
RETURNS TABLE(
  table_name TEXT,
  records_processed INTEGER,
  action_taken TEXT
) AS $$
DECLARE
  policy_record RECORD;
  sql_command TEXT;
  affected_rows INTEGER;
BEGIN
  -- Process each active retention policy
  FOR policy_record IN 
    SELECT * FROM data_retention_policies WHERE is_active = TRUE
  LOOP
    affected_rows := 0;
    
    CASE policy_record.deletion_strategy
      WHEN 'hard_delete' THEN
        -- Hard delete expired records
        EXECUTE format(
          'DELETE FROM %I WHERE expires_at < NOW() OR created_at < NOW() - %L',
          policy_record.table_name,
          policy_record.retention_period
        );
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        
      WHEN 'soft_delete' THEN
        -- Soft delete by setting a deleted flag (if column exists)
        BEGIN
          EXECUTE format(
            'UPDATE %I SET deleted_at = NOW() WHERE deleted_at IS NULL AND (expires_at < NOW() OR created_at < NOW() - %L)',
            policy_record.table_name,
            policy_record.retention_period
          );
          GET DIAGNOSTICS affected_rows = ROW_COUNT;
        EXCEPTION
          WHEN undefined_column THEN
            -- If deleted_at column doesn't exist, skip soft delete
            affected_rows := 0;
        END;
        
      WHEN 'anonymize' THEN
        -- Anonymize old records based on table
        IF policy_record.table_name = 'emotions' THEN
          EXECUTE format(
            'UPDATE emotions SET context = jsonb_build_object(''anonymized'', true, ''original_timestamp'', created_at), user_id = NULL WHERE expires_at < NOW()'
          );
          GET DIAGNOSTICS affected_rows = ROW_COUNT;
        ELSIF policy_record.table_name = 'audit_log' THEN
          EXECUTE format(
            'UPDATE audit_log SET payload = jsonb_build_object(''anonymized'', true, ''original_timestamp'', created_at), pii_hash = NULL WHERE created_at < NOW() - %L',
            policy_record.retention_period
          );
          GET DIAGNOSTICS affected_rows = ROW_COUNT;
        END IF;
    END CASE;
    
    -- Update last cleanup timestamp
    UPDATE data_retention_policies 
    SET last_cleanup_at = NOW() 
    WHERE id = policy_record.id;
    
    -- Return results
    table_name := policy_record.table_name;
    records_processed := affected_rows;
    action_taken := policy_record.deletion_strategy;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for GDPR-compliant data export
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  user_data JSONB := '{}';
  temp_data JSONB;
BEGIN
  -- Verify user can only export their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Users can only export their own data';
  END IF;
  
  -- Export user profile
  SELECT to_jsonb(u.*) INTO temp_data
  FROM users u WHERE id = p_user_id;
  user_data := jsonb_set(user_data, '{profile}', temp_data);
  
  -- Export user preferences
  SELECT to_jsonb(up.*) INTO temp_data
  FROM user_preferences up WHERE user_id = p_user_id;
  user_data := jsonb_set(user_data, '{preferences}', COALESCE(temp_data, '{}'::jsonb));
  
  -- Export libraries owned by user
  SELECT jsonb_agg(to_jsonb(l.*)) INTO temp_data
  FROM libraries l WHERE owner = p_user_id;
  user_data := jsonb_set(user_data, '{owned_libraries}', COALESCE(temp_data, '[]'::jsonb));
  
  -- Export stories in user's libraries
  SELECT jsonb_agg(to_jsonb(s.*)) INTO temp_data
  FROM stories s
  JOIN libraries l ON s.library_id = l.id
  WHERE l.owner = p_user_id OR EXISTS (
    SELECT 1 FROM library_permissions lp 
    WHERE lp.library_id = l.id AND lp.user_id = p_user_id
  );
  user_data := jsonb_set(user_data, '{stories}', COALESCE(temp_data, '[]'::jsonb));
  
  -- Export emotions (non-anonymized only)
  SELECT jsonb_agg(to_jsonb(e.*)) INTO temp_data
  FROM emotions e 
  WHERE user_id = p_user_id AND context->>'anonymized' IS NULL;
  user_data := jsonb_set(user_data, '{emotions}', COALESCE(temp_data, '[]'::jsonb));
  
  -- Export subscriptions
  SELECT jsonb_agg(to_jsonb(s.*)) INTO temp_data
  FROM subscriptions s WHERE user_id = p_user_id;
  user_data := jsonb_set(user_data, '{subscriptions}', COALESCE(temp_data, '[]'::jsonb));
  
  -- Export story interactions
  SELECT jsonb_agg(to_jsonb(si.*)) INTO temp_data
  FROM story_interactions si WHERE user_id = p_user_id;
  user_data := jsonb_set(user_data, '{story_interactions}', COALESCE(temp_data, '[]'::jsonb));
  
  -- Add export metadata
  user_data := jsonb_set(user_data, '{export_metadata}', jsonb_build_object(
    'exported_at', NOW(),
    'export_version', '1.0',
    'compliance_note', 'This export contains all personal data as required by GDPR Article 15'
  ));
  
  RETURN user_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for GDPR-compliant data deletion
CREATE OR REPLACE FUNCTION delete_user_data(p_user_id UUID, p_confirmation_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  expected_token TEXT;
BEGIN
  -- Verify user can only delete their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Users can only delete their own data';
  END IF;
  
  -- Generate expected confirmation token (in production, this would be sent via email)
  expected_token := encode(digest(p_user_id::text || 'DELETE_CONFIRMATION', 'sha256'), 'hex');
  
  IF p_confirmation_token != expected_token THEN
    RAISE EXCEPTION 'Invalid confirmation token';
  END IF;
  
  -- Log the deletion request
  PERFORM log_audit_event_enhanced(
    'GDPR_DELETION',
    'user_data_deletion_requested',
    jsonb_build_object('user_id', p_user_id)
  );
  
  -- Delete user data in correct order (respecting foreign key constraints)
  DELETE FROM audio_transcripts WHERE user_id = p_user_id;
  DELETE FROM story_interactions WHERE user_id = p_user_id;
  DELETE FROM user_preferences WHERE user_id = p_user_id;
  DELETE FROM emotions WHERE user_id = p_user_id;
  DELETE FROM conversation_states WHERE user_id = p_user_id;
  DELETE FROM subscriptions WHERE user_id = p_user_id;
  DELETE FROM alexa_user_mappings WHERE supabase_user_id = p_user_id;
  
  -- Transfer library ownership or delete libraries
  -- (This would need business logic to handle library transfers)
  UPDATE libraries SET owner = NULL WHERE owner = p_user_id;
  DELETE FROM library_permissions WHERE user_id = p_user_id;
  
  -- Anonymize audit logs instead of deleting (for compliance)
  UPDATE audit_log 
  SET user_id = NULL, 
      payload = jsonb_build_object('anonymized', true, 'deletion_date', NOW()),
      pii_hash = NULL
  WHERE user_id = p_user_id;
  
  -- Finally delete the user record
  DELETE FROM users WHERE id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically set COPPA protection flag
CREATE OR REPLACE FUNCTION set_coppa_protection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.age IS NOT NULL AND NEW.age < 13 THEN
    NEW.is_coppa_protected := TRUE;
  ELSE
    NEW.is_coppa_protected := FALSE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_coppa_protection
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_coppa_protection();

-- Create a trigger to validate COPPA compliance before content creation
CREATE OR REPLACE FUNCTION validate_coppa_before_story_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT check_coppa_compliance(auth.uid(), NEW.library_id) THEN
    RAISE EXCEPTION 'COPPA compliance violation: Parent consent required for users under 13 creating content in sub-libraries';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_coppa_story_creation
  BEFORE INSERT ON stories
  FOR EACH ROW
  EXECUTE FUNCTION validate_coppa_before_story_creation();

-- Update existing cleanup function call to use enhanced version
-- This would be scheduled in production: SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data_enhanced();');

-- Grant necessary permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_library_permission_with_coppa(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION log_audit_event_enhanced(TEXT, TEXT, JSONB, TEXT, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_coppa_compliance(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_user_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_data_enhanced() TO service_role;
-- RLS Policies for COPPA/GDPR compliance

-- Users can only see their own data
CREATE POLICY users_policy ON users
  FOR ALL USING (auth.uid() = id);

-- Library access based on permissions
CREATE POLICY library_access ON libraries
  FOR ALL USING (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM library_permissions 
      WHERE library_id = id AND user_id = auth.uid()
    )
  );

-- Library permissions - users can see permissions for libraries they have access to
CREATE POLICY library_permissions_policy ON library_permissions
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM libraries l
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR
        EXISTS (
          SELECT 1 FROM library_permissions lp2
          WHERE lp2.library_id = l.id 
          AND lp2.user_id = auth.uid() 
          AND lp2.role IN ('Owner', 'Admin')
        )
      )
    )
  );

-- Stories inherit library permissions
CREATE POLICY story_access ON stories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM libraries l
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR 
        lp.user_id = auth.uid()
      )
    )
  );

-- Characters inherit story permissions
CREATE POLICY character_access ON characters
  FOR ALL USING (
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

-- Emotions - users can only see their own emotions
CREATE POLICY emotion_access ON emotions
  FOR ALL USING (user_id = auth.uid());

-- Subscriptions - users can only see their own subscriptions
CREATE POLICY subscription_access ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Media assets inherit story permissions
CREATE POLICY media_asset_access ON media_assets
  FOR ALL USING (
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

-- Audit log - users can only see their own audit entries
CREATE POLICY audit_log_access ON audit_log
  FOR ALL USING (user_id = auth.uid());

-- Alexa user mappings - users can only see their own mappings
CREATE POLICY alexa_mapping_access ON alexa_user_mappings
  FOR ALL USING (supabase_user_id = auth.uid());

-- Voice codes - users can only see codes for their email
CREATE POLICY voice_code_access ON voice_codes
  FOR ALL USING (
    email IN (
      SELECT email FROM users WHERE id = auth.uid()
    )
  );

-- Conversation states - users can only see their own conversation states
CREATE POLICY conversation_state_access ON conversation_states
  FOR ALL USING (user_id = auth.uid());

-- Functions for permission checking
CREATE OR REPLACE FUNCTION check_library_permission(lib_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM libraries l
    LEFT JOIN library_permissions lp ON l.id = lp.library_id
    WHERE l.id = lib_id AND (
      l.owner = auth.uid() OR
      (lp.user_id = auth.uid() AND 
       CASE required_role
         WHEN 'Owner' THEN lp.role = 'Owner'
         WHEN 'Admin' THEN lp.role IN ('Owner', 'Admin')
         WHEN 'Editor' THEN lp.role IN ('Owner', 'Admin', 'Editor')
         WHEN 'Viewer' THEN lp.role IN ('Owner', 'Admin', 'Editor', 'Viewer')
         ELSE FALSE
       END)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for audit logging
CREATE OR REPLACE FUNCTION log_audit_event(
  p_agent_name TEXT,
  p_action TEXT,
  p_payload JSONB,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_log (user_id, agent_name, action, payload, ip_address, user_agent)
  VALUES (auth.uid(), p_agent_name, p_action, p_payload, p_ip_address, p_user_agent)
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for automatic data cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
  -- Delete expired emotions (365-day TTL)
  DELETE FROM emotions WHERE expires_at < NOW();
  
  -- Delete expired voice codes
  DELETE FROM voice_codes WHERE expires_at < NOW();
  
  -- Delete expired conversation states
  DELETE FROM conversation_states WHERE expires_at < NOW();
  
  -- Anonymize old audit logs (keep for compliance but remove PII)
  UPDATE audit_log 
  SET payload = jsonb_build_object('anonymized', true, 'original_timestamp', created_at)
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- This would be set up in production environment
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT cleanup_expired_data();');
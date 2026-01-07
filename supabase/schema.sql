--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: accept_transfer_via_magic_link(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.accept_transfer_via_magic_link(p_token text, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  link_record RECORD;
  transfer_record RECORD;
  result JSONB;
BEGIN
  -- Find the magic link
  SELECT * INTO link_record
  FROM pending_transfer_magic_links
  WHERE magic_token = p_token
    AND used_at IS NULL
    AND expires_at > NOW();
  
  IF link_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired magic link'
    );
  END IF;
  
  -- Get transfer details
  SELECT * INTO transfer_record
  FROM story_transfers
  WHERE id = link_record.transfer_id
    AND status = 'pending';
  
  IF transfer_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transfer not found or already processed'
    );
  END IF;
  
  -- Update transfer to point to new user
  UPDATE story_transfers
  SET to_user_id = p_user_id,
      status = 'accepted',
      responded_at = NOW()
  WHERE id = link_record.transfer_id;
  
  -- Mark magic link as used
  UPDATE pending_transfer_magic_links
  SET used_at = NOW()
  WHERE id = link_record.id;
  
  -- Perform the transfer
  IF transfer_record.transfer_type = 'move' THEN
    UPDATE stories
    SET library_id = transfer_record.to_library_id
    WHERE id = transfer_record.story_id;
  ELSE
    -- Copy: duplicate the story
    INSERT INTO stories (
      library_id,
      creator_user_id,
      title,
      content,
      status,
      age_rating
    )
    SELECT 
      transfer_record.to_library_id,
      transfer_record.from_user_id,  -- Keep original creator
      title,
      content,
      status,
      age_rating
    FROM stories
    WHERE id = transfer_record.story_id;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'transferId', link_record.transfer_id,
    'storyId', transfer_record.story_id,
    'transferType', transfer_record.transfer_type
  );
END;
$$;


--
-- Name: anonymize_old_distress_patterns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.anonymize_old_distress_patterns() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: auto_create_email_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_create_email_preferences() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: calculate_engagement_trends(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_engagement_trends(p_user_id uuid, p_days integer DEFAULT 30) RETURNS TABLE(trend_direction text, trend_strength numeric, average_engagement text, recommendations text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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
  FROM emotion_engagement_metrics
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
  FROM emotion_engagement_metrics
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


--
-- Name: FUNCTION calculate_engagement_trends(p_user_id uuid, p_days integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_engagement_trends(p_user_id uuid, p_days integer) IS 'Calculates engagement trends over specified time period';


--
-- Name: calculate_intervention_priority(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_intervention_priority(p_user_id uuid) RETURNS TABLE(priority_score numeric, priority_level text, recommended_actions text[])
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION calculate_intervention_priority(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_intervention_priority(p_user_id uuid) IS 'Calculates intervention priority score based on multiple risk factors';


--
-- Name: calculate_story_effectiveness(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_story_effectiveness(p_story_id uuid, p_user_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_consumption consumption_metrics%ROWTYPE;
  v_baseline JSONB;
  v_score DECIMAL;
BEGIN
  -- Get consumption data
  SELECT * INTO v_consumption
  FROM public.consumption_metrics
  WHERE story_id = p_story_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN 0.00;
  END IF;
  
  -- Get user's baseline (average across all stories)
  SELECT JSONB_BUILD_OBJECT(
    'avg_engagement', AVG(engagement_score),
    'avg_completion', AVG(completion_rate),
    'avg_replays', AVG(replay_count)
  ) INTO v_baseline
  FROM public.consumption_metrics
  WHERE user_id = p_user_id;
  
  -- Calculate comparative score
  -- This story vs user's baseline (not absolute)
  v_score := (
    v_consumption.engagement_score + 
    v_consumption.completion_rate +
    (v_consumption.replay_count * 10) -- Replays are strong signal
  ) / 3;
  
  -- Update effectiveness table
  INSERT INTO public.story_effectiveness (
    story_id,
    user_id,
    effectiveness_score,
    engagement_vs_baseline,
    comparison_baseline,
    calculated_at
  )
  VALUES (
    p_story_id,
    p_user_id,
    LEAST(v_score, 100.00),
    v_consumption.engagement_score - (v_baseline->>'avg_engagement')::DECIMAL,
    v_baseline,
    NOW()
  )
  ON CONFLICT (story_id, user_id) DO UPDATE SET
    effectiveness_score = LEAST(v_score, 100.00),
    engagement_vs_baseline = v_consumption.engagement_score - (v_baseline->>'avg_engagement')::DECIMAL,
    comparison_baseline = v_baseline,
    updated_at = NOW();
  
  RETURN LEAST(v_score, 100.00);
END;
$$;


--
-- Name: calculate_user_credits(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_user_credits(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.reward_ledger
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
$$;


--
-- Name: check_coppa_compliance(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_coppa_compliance(p_user_id uuid, p_library_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: check_library_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_library_permission(lib_id uuid, required_role text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: check_library_permission_with_coppa(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_library_permission_with_coppa(lib_id uuid, required_role text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: check_negative_feedback_alert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_negative_feedback_alert() RETURNS TABLE(story_id uuid, negative_count bigint, character_id uuid, character_negative_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  -- Story negative feedback
  SELECT 
    sf.story_id,
    COUNT(*)::BIGINT as negative_count,
    NULL::UUID as character_id,
    NULL::BIGINT as character_negative_count
  FROM story_feedback sf
  WHERE sf.sentiment = 'negative'
    AND sf.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY sf.story_id
  HAVING COUNT(*) >= 3
  
  UNION ALL
  
  -- Character negative feedback
  SELECT 
    NULL::UUID as story_id,
    NULL::BIGINT as negative_count,
    cf.character_id,
    COUNT(*)::BIGINT as character_negative_count
  FROM character_feedback cf
  WHERE cf.sentiment = 'negative'
    AND cf.created_at > NOW() - INTERVAL '24 hours'
  GROUP BY cf.character_id
  HAVING COUNT(*) >= 3;
END;
$$;


--
-- Name: check_rate_limit(text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_identifier text, p_action text, p_max_attempts integer, p_window_seconds integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  current_attempts INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Clean up expired rate limit entries first
  DELETE FROM auth_rate_limits WHERE expires_at < NOW();
  
  -- Get current attempts within the window
  SELECT attempts, window_start INTO current_attempts, window_start
  FROM auth_rate_limits
  WHERE identifier = p_identifier 
    AND action = p_action
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no existing record or window expired, create new one
  IF current_attempts IS NULL THEN
    INSERT INTO auth_rate_limits (
      identifier, 
      action, 
      attempts, 
      window_start,
      expires_at
    ) VALUES (
      p_identifier,
      p_action,
      1,
      NOW(),
      NOW() + (p_window_seconds || ' seconds')::INTERVAL
    );
    RETURN TRUE;
  END IF;
  
  -- Check if limit exceeded
  IF current_attempts >= p_max_attempts THEN
    RETURN FALSE;
  END IF;
  
  -- Increment attempts
  UPDATE auth_rate_limits
  SET attempts = attempts + 1
  WHERE identifier = p_identifier 
    AND action = p_action
    AND expires_at > NOW();
  
  RETURN TRUE;
END;
$$;


--
-- Name: cleanup_auth_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_auth_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired sessions
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_expired_age_verification_audit(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_age_verification_audit() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM age_verification_audit 
  WHERE expires_at < NOW();
END;
$$;


--
-- Name: cleanup_expired_checkpoints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_checkpoints() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_checkpoints
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_checkpoints(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_checkpoints() IS 'Cleans up expired conversation checkpoints';


--
-- Name: cleanup_expired_conversation_sessions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_conversation_sessions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_sessions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_conversation_sessions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_conversation_sessions() IS 'Cleans up expired conversation sessions';


--
-- Name: cleanup_expired_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_data() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: cleanup_expired_data_enhanced(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_data_enhanced() RETURNS TABLE(table_name text, records_processed integer, action_taken text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: cleanup_expired_device_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_device_tokens() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired tokens
  UPDATE device_tokens 
  SET status = 'expired', updated_at = NOW()
  WHERE expires_at < NOW() AND status = 'active';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Clean up old expired tokens (keep for 30 days for audit)
  DELETE FROM device_tokens 
  WHERE status = 'expired' 
  AND updated_at < NOW() - INTERVAL '30 days';
  
  -- Clean up expired connection logs
  DELETE FROM device_connection_logs 
  WHERE expires_at < NOW();
  
  -- Clean up inactive devices
  DELETE FROM smart_home_devices 
  WHERE expires_at < NOW() 
  AND connection_status = 'disconnected';
  
  RETURN expired_count;
END;
$$;


--
-- Name: cleanup_expired_interruptions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_interruptions() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM conversation_interruptions
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_interruptions(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_interruptions() IS 'Cleans up expired conversation interruptions';


--
-- Name: cleanup_expired_library_consent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_library_consent() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM library_consent 
  WHERE expires_at < NOW() 
    AND consent_status = 'pending';
END;
$$;


--
-- Name: cleanup_expired_localization_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_localization_cache() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM localization_cache WHERE expires_at < NOW();
END;
$$;


--
-- Name: cleanup_expired_oauth_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_oauth_tokens() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Delete expired authorization codes
    DELETE FROM oauth_authorization_codes 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Delete expired access tokens
    DELETE FROM oauth_access_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP AND revoked_at IS NULL;
    
    -- Delete expired refresh tokens
    DELETE FROM oauth_refresh_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP AND revoked_at IS NULL;
END;
$$;


--
-- Name: cleanup_expired_transfer_requests(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_transfer_requests() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE story_transfer_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;


--
-- Name: cleanup_expired_user_separations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_user_separations() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_context_separations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_expired_user_separations(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_user_separations() IS 'Cleans up expired user context separations';


--
-- Name: cleanup_expired_voice_analysis(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_voice_analysis() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION cleanup_expired_voice_analysis(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_expired_voice_analysis() IS 'Cleans up expired voice analysis data for privacy compliance';


--
-- Name: cleanup_knowledge_queries(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_knowledge_queries() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION cleanup_knowledge_queries(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_knowledge_queries() IS 'GDPR-compliant cleanup of old knowledge base data';


--
-- Name: cleanup_old_a2a_tasks(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_a2a_tasks() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM a2a_tasks
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND state IN ('completed', 'failed', 'canceled');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_engagement_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_engagement_data() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: cleanup_old_events(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_events(retention_days integer DEFAULT 90) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: cleanup_old_safety_incidents(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_safety_incidents() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM safety_incidents 
  WHERE resolved_at IS NOT NULL 
    AND resolved_at < NOW() - INTERVAL '2 years';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_old_webhook_deliveries(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_webhook_deliveries() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('success', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_refresh_tokens(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_refresh_tokens() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired or revoked refresh tokens
  DELETE FROM refresh_tokens 
  WHERE expires_at < NOW() OR revoked = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_research_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_research_cache() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM research_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_voice_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_voice_codes() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired voice codes
  DELETE FROM voice_codes 
  WHERE expires_at < NOW() OR used = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: cleanup_voice_metrics(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_voice_metrics(p_retention_days integer DEFAULT 30) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM voice_synthesis_metrics
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;


--
-- Name: create_character_in_library(uuid, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_character_in_library(p_library_id uuid, p_name text, p_traits jsonb, p_art_prompt text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  character_id UUID;
BEGIN
  -- Check if user has permission to create characters in this library
  IF NOT check_library_permission(p_library_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to create character in library';
  END IF;
  
  -- Check COPPA compliance
  IF NOT check_coppa_compliance(auth.uid(), p_library_id) THEN
    RAISE EXCEPTION 'COPPA compliance violation: Parent consent required';
  END IF;
  
  -- Create the character
  INSERT INTO characters (library_id, name, traits, art_prompt)
  VALUES (p_library_id, p_name, p_traits, p_art_prompt)
  RETURNING id INTO character_id;
  
  -- Log the creation
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_created',
    jsonb_build_object(
      'character_id', character_id,
      'library_id', p_library_id,
      'character_name', p_name
    )
  );
  
  RETURN character_id;
END;
$$;


--
-- Name: create_default_storytailor_id_for_user(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_storytailor_id_for_user(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_library_id UUID;
  v_user_exists BOOLEAN;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User does not exist: %', p_user_id;
  END IF;

  -- Check if user already has a library (main library, not sub-library)
  SELECT id INTO v_library_id 
  FROM libraries 
  WHERE owner = p_user_id 
  AND parent_library IS NULL 
  LIMIT 1;

  -- If library exists, return it
  IF v_library_id IS NOT NULL THEN
    RETURN v_library_id;
  END IF;

  -- Create default library (Storytailor ID)
  INSERT INTO libraries (owner, name, is_storytailor_id)
  VALUES (p_user_id, 'My Stories', true)
  RETURNING id INTO v_library_id;

  -- Create owner permission
  INSERT INTO library_permissions (library_id, user_id, role, granted_by)
  VALUES (v_library_id, p_user_id, 'Owner', p_user_id);

  RETURN v_library_id;
END;
$$;


--
-- Name: create_library_owner_permission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_library_owner_permission() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO library_permissions (library_id, user_id, role, granted_by, created_at)
  VALUES (NEW.id, NEW.owner, 'Owner', NEW.owner, NOW())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: create_notification(uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text, p_data jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


--
-- Name: create_story_transfer_request(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_story_transfer_request(p_story_id uuid, p_to_library_id uuid, p_transfer_message text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  transfer_id UUID;
  from_library_id UUID;
BEGIN
  -- Get the story's current library
  SELECT library_id INTO from_library_id
  FROM stories WHERE id = p_story_id;
  
  IF from_library_id IS NULL THEN
    RAISE EXCEPTION 'Story not found';
  END IF;
  
  -- Check permission on source library
  IF NOT check_library_permission_with_coppa(from_library_id, 'Editor') THEN
    RAISE EXCEPTION 'Editor access required on source library';
  END IF;
  
  -- Create transfer request
  INSERT INTO story_transfer_requests (
    story_id, from_library_id, to_library_id, 
    requested_by, transfer_message
  )
  VALUES (
    p_story_id, from_library_id, p_to_library_id,
    auth.uid(), p_transfer_message
  )
  RETURNING id INTO transfer_id;
  
  RETURN transfer_id;
END;
$$;


--
-- Name: create_sub_library_with_avatar(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_sub_library_with_avatar(p_parent_library_id uuid, p_name text, p_avatar_type text, p_avatar_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  new_library_id UUID;
BEGIN
  -- Check permission on parent library
  IF NOT check_library_permission_with_coppa(p_parent_library_id, 'Admin') THEN
    RAISE EXCEPTION 'Admin access required on parent library';
  END IF;
  
  -- Create sub-library
  INSERT INTO libraries (owner, name, parent_library)
  VALUES (auth.uid(), p_name, p_parent_library_id)
  RETURNING id INTO new_library_id;
  
  -- Create owner permission
  INSERT INTO library_permissions (library_id, user_id, role, granted_by)
  VALUES (new_library_id, auth.uid(), 'Owner', auth.uid());
  
  -- Create avatar
  INSERT INTO sub_library_avatars (library_id, avatar_type, avatar_data)
  VALUES (new_library_id, p_avatar_type, p_avatar_data);
  
  RETURN new_library_id;
END;
$$;


--
-- Name: deduct_story_pack_credit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.deduct_story_pack_credit(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  pack_record RECORD;
BEGIN
  -- Find the first non-expired pack with remaining stories
  SELECT * INTO pack_record
  FROM story_packs
  WHERE user_id = p_user_id
    AND stories_remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY purchased_at ASC
  LIMIT 1;
  
  IF pack_record IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct one story
  UPDATE story_packs
  SET stories_remaining = stories_remaining - 1,
      updated_at = NOW()
  WHERE id = pack_record.id;
  
  RETURN TRUE;
END;
$$;


--
-- Name: delete_character(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_character(p_character_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  lib_id UUID;
BEGIN
  -- Get library_id for permission check
  SELECT library_id INTO lib_id FROM characters WHERE id = p_character_id;
  
  IF lib_id IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;
  
  -- Check permissions
  IF NOT check_library_permission(lib_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to delete character';
  END IF;
  
  -- Delete the character
  DELETE FROM characters WHERE id = p_character_id;
  
  -- Log the deletion
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_deleted',
    jsonb_build_object(
      'character_id', p_character_id,
      'library_id', lib_id
    )
  );
  
  RETURN TRUE;
END;
$$;


--
-- Name: delete_user_data(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_data(p_user_id uuid, p_confirmation_token text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: detect_pattern_anomalies(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detect_pattern_anomalies(p_user_id uuid) RETURNS TABLE(anomaly_type text, severity text, description text, detected_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION detect_pattern_anomalies(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.detect_pattern_anomalies(p_user_id uuid) IS 'Detects anomalies in behavioral patterns that may require attention';


--
-- Name: enforce_conversation_state_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_conversation_state_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate transition
  IF NOT validate_state_transition('conversation', OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid state transition: % → % for conversation %', 
      OLD.status, NEW.status, OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Set ended_at when transitioning to terminal state
  IF NEW.status = 'ended' THEN
    NEW.ended_at := NOW();
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;


--
-- Name: enforce_story_state_transition(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_story_state_transition() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate transition
  IF NOT validate_state_transition('story', OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Invalid state transition: % → % for story %', 
      OLD.status, NEW.status, OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$;


--
-- Name: ensure_public_user_exists(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_public_user_exists(auth_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    public_user_id UUID;
BEGIN
    -- Check if public.users record exists
    SELECT id INTO public_user_id
    FROM public.users
    WHERE id = auth_user_id;
    
    -- If it doesn't exist, create it (this should be handled by auth triggers in production)
    -- For now, we'll just return the auth_user_id
    IF public_user_id IS NULL THEN
        -- In production, this should be handled by auth triggers
        -- For now, we'll assume the record should exist
        RETURN auth_user_id;
    END IF;
    
    RETURN public_user_id;
END;
$$;


--
-- Name: escalate_knowledge_query(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.escalate_knowledge_query(p_query_id uuid, p_escalation_reason text, p_priority text DEFAULT 'medium'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION escalate_knowledge_query(p_query_id uuid, p_escalation_reason text, p_priority text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.escalate_knowledge_query(p_query_id uuid, p_escalation_reason text, p_priority text) IS 'Creates support escalation from knowledge base query';


--
-- Name: export_user_data(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_user_data(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: generate_gift_card_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_gift_card_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    -- Generate 12-character alphanumeric code (uppercase, no confusing chars)
    code := UPPER(
      SUBSTRING(
        MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT),
        1, 12
      )
    );
    -- Replace confusing characters
    code := REPLACE(REPLACE(REPLACE(REPLACE(code, '0', 'A'), 'O', 'B'), 'I', 'C'), '1', 'D');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM gift_cards WHERE gift_cards.code = code) INTO code_exists;
  END LOOP;
  
  RETURN code;
END;
$$;


--
-- Name: generate_invite_discount(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invite_discount(p_created_by uuid, p_type text, p_discount_percentage integer, p_valid_days integer DEFAULT 30) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  discount_code TEXT;
  code_exists BOOLEAN := TRUE;
BEGIN
  -- Generate unique discount code
  WHILE code_exists LOOP
    discount_code := upper(substring(md5(random()::text) from 1 for 8));
    
    SELECT EXISTS(
      SELECT 1 FROM invite_discounts WHERE code = discount_code
    ) INTO code_exists;
  END LOOP;
  
  -- Insert the discount code
  INSERT INTO invite_discounts (
    code,
    type,
    discount_percentage,
    valid_until,
    created_by
  )
  VALUES (
    discount_code,
    p_type,
    p_discount_percentage,
    NOW() + (p_valid_days || ' days')::INTERVAL,
    p_created_by
  );
  
  RETURN discount_code;
END;
$$;


--
-- Name: generate_transfer_magic_token(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_transfer_magic_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  token TEXT;
  token_exists BOOLEAN := TRUE;
BEGIN
  WHILE token_exists LOOP
    -- Generate 32-character hex token
    token := encode(gen_random_bytes(16), 'hex');
    
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM pending_transfer_magic_links WHERE magic_token = token) INTO token_exists;
  END LOOP;
  
  RETURN token;
END;
$$;


--
-- Name: get_active_webhooks_for_platform(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_active_webhooks_for_platform(platform_name text) RETURNS TABLE(id uuid, config jsonb, verification_token text, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.id,
    wr.config,
    wr.verification_token,
    wr.created_at
  FROM webhook_registrations wr
  WHERE wr.platform = platform_name
    AND wr.status = 'active';
END;
$$;


--
-- Name: get_character_feedback_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_character_feedback_summary(p_character_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'averageRating', COALESCE(AVG(rating), 0),
    'sentimentCounts', jsonb_build_object(
      'positive', COUNT(*) FILTER (WHERE sentiment = 'positive'),
      'neutral', COUNT(*) FILTER (WHERE sentiment = 'neutral'),
      'negative', COUNT(*) FILTER (WHERE sentiment = 'negative')
    ),
    'ratingDistribution', jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  ) INTO result
  FROM character_feedback
  WHERE character_id = p_character_id;
  
  RETURN result;
END;
$$;


--
-- Name: get_checkpoint_stats(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_checkpoint_stats(user_id_param uuid DEFAULT NULL::uuid, time_range_hours integer DEFAULT 24) RETURNS TABLE(total_checkpoints bigint, checkpoints_by_phase jsonb, avg_checkpoints_per_session numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  WITH checkpoint_stats AS (
    SELECT 
      COUNT(*) as total,
      jsonb_object_agg(conversation_phase, phase_count) as by_phase,
      AVG(session_checkpoint_count) as avg_per_session
    FROM (
      SELECT 
        conversation_phase,
        COUNT(*) as phase_count
      FROM conversation_checkpoints
      WHERE 
        (user_id_param IS NULL OR user_id = user_id_param)
        AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
      GROUP BY conversation_phase
    ) phase_counts
    CROSS JOIN (
      SELECT AVG(checkpoint_count) as session_checkpoint_count
      FROM (
        SELECT session_id, COUNT(*) as checkpoint_count
        FROM conversation_checkpoints
        WHERE 
          (user_id_param IS NULL OR user_id = user_id_param)
          AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
        GROUP BY session_id
      ) session_counts
    ) session_stats
  )
  SELECT 
    total,
    by_phase,
    ROUND(avg_per_session, 2)
  FROM checkpoint_stats;
END;
$$;


--
-- Name: FUNCTION get_checkpoint_stats(user_id_param uuid, time_range_hours integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_checkpoint_stats(user_id_param uuid, time_range_hours integer) IS 'Returns checkpoint creation statistics';


--
-- Name: get_cultural_context_with_defaults(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cultural_context_with_defaults(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  context JSONB;
BEGIN
  SELECT to_jsonb(cc.*) INTO context
  FROM cultural_contexts cc
  WHERE cc.user_id = p_user_id;
  
  -- If no context exists, return default
  IF context IS NULL THEN
    context := jsonb_build_object(
      'primary_language', 'en',
      'secondary_languages', '[]'::jsonb,
      'cultural_background', '[]'::jsonb,
      'religious_considerations', '[]'::jsonb,
      'family_structure', jsonb_build_object(
        'type', 'nuclear',
        'parentTerms', jsonb_build_object(
          'mother', '["mom", "mama", "mother", "mommy"]'::jsonb,
          'father', '["dad", "papa", "father", "daddy"]'::jsonb,
          'parent', '["parent", "guardian"]'::jsonb
        ),
        'siblingTerms', jsonb_build_object(
          'brother', '["brother", "bro"]'::jsonb,
          'sister', '["sister", "sis"]'::jsonb,
          'sibling', '["sibling", "brother or sister"]'::jsonb
        ),
        'extendedFamilyTerms', jsonb_build_object(
          'grandmother', '["grandma", "grandmother", "nana"]'::jsonb,
          'grandfather', '["grandpa", "grandfather", "papa"]'::jsonb,
          'aunt', '["aunt", "auntie"]'::jsonb,
          'uncle', '["uncle"]'::jsonb,
          'cousin', '["cousin"]'::jsonb
        )
      ),
      'celebrations_and_holidays', '[]'::jsonb,
      'storytelling_traditions', '[]'::jsonb,
      'taboo_topics', '[]'::jsonb,
      'preferred_narrative_styles', '[]'::jsonb
    );
  END IF;
  
  RETURN context;
END;
$$;


--
-- Name: get_event_statistics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_event_statistics() RETURNS TABLE(total_events bigint, events_by_type jsonb, events_by_source jsonb, oldest_event timestamp with time zone, newest_event timestamp with time zone, active_correlations bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: get_hierarchical_library_stories(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_hierarchical_library_stories(p_library_id uuid) RETURNS TABLE(story_id uuid, library_id uuid, library_name text, title text, content jsonb, status text, age_rating integer, created_at timestamp with time zone, finalized_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Check permission on main library
  IF NOT check_library_permission_with_coppa(p_library_id, 'Viewer') THEN
    RAISE EXCEPTION 'Access denied to library';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.id as story_id,
    s.library_id,
    l.name as library_name,
    s.title,
    s.content,
    s.status,
    s.age_rating,
    s.created_at,
    s.finalized_at
  FROM stories s
  JOIN libraries l ON s.library_id = l.id
  WHERE l.id = p_library_id 
     OR l.parent_library = p_library_id
  ORDER BY s.created_at DESC;
END;
$$;


--
-- Name: get_interruption_recovery_stats(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_interruption_recovery_stats(user_id_param uuid DEFAULT NULL::uuid, time_range_hours integer DEFAULT 24) RETURNS TABLE(total_interruptions bigint, recovered_interruptions bigint, recovery_rate numeric, avg_recovery_attempts numeric, most_common_interruption_type text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  WITH interruption_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_recovered = true) as recovered,
      AVG(recovery_attempts) FILTER (WHERE is_recovered = true) as avg_attempts,
      MODE() WITHIN GROUP (ORDER BY interruption_type) as common_type
    FROM conversation_interruptions
    WHERE 
      (user_id_param IS NULL OR user_id = user_id_param)
      AND created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
  )
  SELECT 
    total,
    recovered,
    CASE 
      WHEN total > 0 THEN ROUND((recovered::NUMERIC / total::NUMERIC) * 100, 2)
      ELSE 0
    END as recovery_rate,
    ROUND(avg_attempts, 2),
    common_type
  FROM interruption_stats;
END;
$$;


--
-- Name: FUNCTION get_interruption_recovery_stats(user_id_param uuid, time_range_hours integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_interruption_recovery_stats(user_id_param uuid, time_range_hours integer) IS 'Returns interruption and recovery statistics';


--
-- Name: get_library_characters(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_library_characters(p_library_id uuid) RETURNS TABLE(id uuid, name text, traits jsonb, art_prompt text, appearance_url text, created_at timestamp with time zone, updated_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Check permissions
  IF NOT check_library_permission(p_library_id, 'Viewer') THEN
    RAISE EXCEPTION 'Insufficient permissions to view library characters';
  END IF;
  
  RETURN QUERY
  SELECT c.id, c.name, c.traits, c.art_prompt, c.appearance_url, c.created_at, c.updated_at
  FROM characters c
  WHERE c.library_id = p_library_id
  ORDER BY c.created_at DESC;
END;
$$;


--
-- Name: get_pending_webhook_deliveries(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pending_webhook_deliveries(limit_count integer DEFAULT 100) RETURNS TABLE(id uuid, webhook_id uuid, event_id text, event_type text, attempt integer, payload jsonb, next_retry_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wd.id,
    wd.webhook_id,
    wd.event_id,
    wd.event_type,
    wd.attempt,
    wd.payload,
    wd.next_retry_at
  FROM webhook_deliveries wd
  INNER JOIN webhooks w ON w.id = wd.webhook_id
  WHERE wd.status IN ('pending', 'retrying')
    AND w.is_active = TRUE
    AND (wd.next_retry_at IS NULL OR wd.next_retry_at <= NOW())
  ORDER BY wd.created_at ASC
  LIMIT limit_count;
END;
$$;


--
-- Name: get_safety_metrics(timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_safety_metrics(start_date timestamp with time zone, end_date timestamp with time zone) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: get_story_feedback_summary(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_story_feedback_summary(p_story_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'averageRating', COALESCE(AVG(rating), 0),
    'sentimentCounts', jsonb_build_object(
      'positive', COUNT(*) FILTER (WHERE sentiment = 'positive'),
      'neutral', COUNT(*) FILTER (WHERE sentiment = 'neutral'),
      'negative', COUNT(*) FILTER (WHERE sentiment = 'negative')
    ),
    'ratingDistribution', jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE rating = 1),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '5', COUNT(*) FILTER (WHERE rating = 5)
    )
  ) INTO result
  FROM story_feedback
  WHERE story_id = p_story_id;
  
  RETURN result;
END;
$$;


--
-- Name: get_sub_library_emotional_patterns(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_sub_library_emotional_patterns(p_sub_library_id uuid, p_days_back integer DEFAULT 30) RETURNS TABLE(mood text, frequency bigint, avg_confidence numeric, trend text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  -- Check permission
  IF NOT check_library_permission_with_coppa(p_sub_library_id, 'Viewer') THEN
    RAISE EXCEPTION 'Access denied to sub-library';
  END IF;
  
  RETURN QUERY
  SELECT 
    e.mood,
    COUNT(*) as frequency,
    AVG(e.confidence) as avg_confidence,
    'stable'::TEXT as trend -- Would need historical analysis for real trends
  FROM emotions e
  WHERE e.sub_library_id = p_sub_library_id
    AND e.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY e.mood
  ORDER BY frequency DESC;
END;
$$;


--
-- Name: get_system_health(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_system_health() RETURNS TABLE(status text, cpu_usage numeric, memory_percentage numeric, error_rate numeric, active_alerts bigint, last_metric_time timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: get_tenant_cost_status(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tenant_cost_status(p_tenant_id text) RETURNS TABLE(current_cost numeric, cost_limit numeric, percentage_used numeric, status text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: get_total_pack_credits(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_total_pack_credits(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  total_credits INTEGER;
BEGIN
  SELECT COALESCE(SUM(stories_remaining), 0) INTO total_credits
  FROM story_packs
  WHERE user_id = p_user_id
    AND stories_remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW());
  
  RETURN total_credits;
END;
$$;


--
-- Name: get_user_active_tokens(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_active_tokens(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  token_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO token_count
  FROM refresh_tokens
  WHERE user_id = p_user_id 
    AND revoked = FALSE 
    AND expires_at > NOW();
  
  RETURN token_count;
END;
$$;


--
-- Name: get_user_daily_voice_cost(uuid, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_daily_voice_cost(p_user_id uuid, p_date date DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  total_cost DECIMAL(10, 6);
BEGIN
  SELECT COALESCE(SUM(cost_usd), 0) INTO total_cost
  FROM voice_cost_tracking
  WHERE user_id = p_user_id AND date = p_date;
  
  RETURN total_cost;
END;
$$;


--
-- Name: get_user_default_storytailor_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_default_storytailor_id(p_user_id uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_library_id UUID;
BEGIN
  -- Get user's main library (not sub-library)
  SELECT id INTO v_library_id 
  FROM libraries 
  WHERE owner = p_user_id 
  AND parent_library IS NULL 
  AND is_storytailor_id = true
  ORDER BY created_at ASC
  LIMIT 1;

  -- If no library exists, create one
  IF v_library_id IS NULL THEN
    SELECT create_default_storytailor_id_for_user(p_user_id) INTO v_library_id;
  END IF;

  RETURN v_library_id;
END;
$$;


--
-- Name: get_voice_performance_metrics(integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_voice_performance_metrics(p_time_range_hours integer DEFAULT 24, p_engine text DEFAULT NULL::text) RETURNS TABLE(total_requests bigint, successful_requests bigint, success_rate numeric, avg_latency_ms numeric, total_cost_usd numeric, avg_cost_per_request numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE success = true) as successful_requests,
    ROUND(
      COUNT(*) FILTER (WHERE success = true)::DECIMAL / NULLIF(COUNT(*), 0),
      4
    ) as success_rate,
    ROUND(AVG(latency_ms), 2) as avg_latency_ms,
    COALESCE(SUM(cost_usd), 0) as total_cost_usd,
    ROUND(
      COALESCE(SUM(cost_usd), 0) / NULLIF(COUNT(*), 0),
      6
    ) as avg_cost_per_request
  FROM voice_synthesis_metrics
  WHERE created_at >= NOW() - (p_time_range_hours || ' hours')::INTERVAL
    AND (p_engine IS NULL OR engine = p_engine);
END;
$$;


--
-- Name: get_webvtt_phase1_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_webvtt_phase1_stats() RETURNS TABLE(total_files bigint, phase1_compliant_files bigint, average_p90_accuracy numeric, compliance_rate numeric)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE sync_accuracy_p90_ms <= 5.0) as phase1_compliant_files,
        AVG(sync_accuracy_p90_ms) as average_p90_accuracy,
        (COUNT(*) FILTER (WHERE sync_accuracy_p90_ms <= 5.0) * 100.0 / NULLIF(COUNT(*), 0)) as compliance_rate
    FROM webvtt_files
    WHERE created_at >= NOW() - INTERVAL '30 days';
END;
$$;


--
-- Name: has_valid_voice_cloning_consent(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_valid_voice_cloning_consent(p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  consent_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM parental_consents
    WHERE user_id = p_user_id
      AND consent_type = 'voice_cloning'
      AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND revoked_at IS NULL
  ) INTO consent_exists;
  
  RETURN consent_exists;
END;
$$;


--
-- Name: increment_attempts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_attempts() RETURNS integer
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN 1; -- This will be used in an UPDATE with attempts = attempts + increment_attempts()
END;
$$;


--
-- Name: increment_story_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_story_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.creator_user_id IS NOT NULL THEN
    -- Use creator_user_id for quota attribution (correct for transfers)
    UPDATE users
    SET lifetime_stories_created = COALESCE(lifetime_stories_created, 0) + 1
    WHERE id = NEW.creator_user_id;  -- Use creator, not library owner
  ELSE
    -- Fallback for old stories without creator_user_id
    UPDATE users
    SET lifetime_stories_created = COALESCE(lifetime_stories_created, 0) + 1
    WHERE id = (SELECT owner FROM libraries WHERE id = NEW.library_id);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: is_org_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_admin(p_org_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    SET row_security TO 'off'
    AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = p_org_id
        AND o.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = p_org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role = ANY (ARRAY['owner'::text, 'admin'::text])
    );
$$;


--
-- Name: is_org_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_org_member(p_org_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_catalog'
    SET row_security TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;


--
-- Name: log_audit_event(text, text, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event(p_agent_name text, p_action text, p_payload jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO audit_log (user_id, agent_name, action, payload, ip_address, user_agent)
  VALUES (auth.uid(), p_agent_name, p_action, p_payload, p_ip_address, p_user_agent)
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;


--
-- Name: log_audit_event_enhanced(text, text, jsonb, text, text, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_event_enhanced(p_agent_name text, p_action text, p_payload jsonb, p_session_id text DEFAULT NULL::text, p_correlation_id text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: log_deletion_audit(uuid, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_deletion_audit(p_deletion_request_id uuid, p_deletion_type text, p_user_id uuid, p_action text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_log_id UUID;
  v_entity_type TEXT;
  v_entity_id UUID;
BEGIN
  -- Determine entity type and ID based on deletion type
  CASE p_deletion_type
    WHEN 'account' THEN
      v_entity_type := 'user';
      v_entity_id := p_user_id;
    WHEN 'story' THEN
      v_entity_type := 'story';
      -- Get story ID from deletion_request if available
      SELECT target_id INTO v_entity_id
      FROM deletion_requests
      WHERE request_id = p_deletion_request_id;
    WHEN 'character' THEN
      v_entity_type := 'character';
      -- Get character ID from deletion_request if available
      SELECT target_id INTO v_entity_id
      FROM deletion_requests
      WHERE request_id = p_deletion_request_id;
    ELSE
      v_entity_type := p_deletion_type;
      v_entity_id := NULL;
  END CASE;

  -- Insert audit log entry
  INSERT INTO deletion_audit_log (
    original_user_id,
    entity_type,
    entity_id,
    deletion_type,
    metadata
  ) VALUES (
    p_user_id,
    v_entity_type,
    v_entity_id,
    p_deletion_type,
    jsonb_build_object(
      'action', p_action,
      'deletion_request_id', p_deletion_request_id,
      'metadata', p_metadata
    )
  )
  RETURNING log_id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


--
-- Name: log_knowledge_query(uuid, text, text, text, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_knowledge_query(p_user_id uuid, p_session_id text, p_query_text text, p_category text, p_confidence_score numeric, p_response_type text, p_response_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION log_knowledge_query(p_user_id uuid, p_session_id text, p_query_text text, p_category text, p_confidence_score numeric, p_response_type text, p_response_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.log_knowledge_query(p_user_id uuid, p_session_id text, p_query_text text, p_category text, p_confidence_score numeric, p_response_type text, p_response_id text) IS 'Logs a knowledge base query with metadata for analytics';


--
-- Name: log_platform_integration_event(text, text, uuid, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_platform_integration_event(platform_name text, event_type_name text, user_id_param uuid DEFAULT NULL::uuid, session_id_param text DEFAULT NULL::text, payload_data jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO platform_integration_events (
    platform,
    event_type,
    user_id,
    session_id,
    payload
  ) VALUES (
    platform_name,
    event_type_name,
    user_id_param,
    session_id_param,
    payload_data
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;


--
-- Name: log_smart_home_action(uuid, uuid, text, boolean, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_smart_home_action(p_user_id uuid, p_device_id uuid, p_action text, p_success boolean, p_platform text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO device_connection_logs (
    device_id, action, success, error_message, platform, session_id
  )
  VALUES (
    p_device_id, p_action, p_success, p_error_message, p_platform, p_session_id
  )
  RETURNING id INTO log_id;
  
  -- Also log in main audit log for compliance
  PERFORM log_audit_event_enhanced(
    'SmartHomeAgent',
    p_action,
    jsonb_build_object(
      'deviceId', p_device_id,
      'success', p_success,
      'platform', p_platform,
      'errorMessage', p_error_message
    ),
    p_session_id,
    NULL, -- correlation_id
    NULL, -- ip_address
    NULL  -- user_agent
  );
  
  RETURN log_id;
END;
$$;


--
-- Name: manage_organization_seats(uuid, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.manage_organization_seats(p_organization_id uuid, p_action text, p_user_id uuid DEFAULT NULL::uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  current_used_seats INTEGER;
  max_seats INTEGER;
  result BOOLEAN := FALSE;
BEGIN
  -- Get current seat usage
  SELECT used_seats, seat_count INTO current_used_seats, max_seats
  FROM organization_accounts
  WHERE id = p_organization_id;
  
  IF p_action = 'add' AND p_user_id IS NOT NULL THEN
    -- Check if we have available seats
    IF current_used_seats < max_seats THEN
      -- Add user to organization
      INSERT INTO organization_members (organization_id, user_id)
      VALUES (p_organization_id, p_user_id)
      ON CONFLICT (organization_id, user_id) DO NOTHING;
      
      -- Update used seats count
      UPDATE organization_accounts
      SET used_seats = used_seats + 1, updated_at = NOW()
      WHERE id = p_organization_id;
      
      result := TRUE;
    END IF;
  ELSIF p_action = 'remove' AND p_user_id IS NOT NULL THEN
    -- Remove user from organization
    DELETE FROM organization_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id;
    
    -- Update used seats count
    UPDATE organization_accounts
    SET used_seats = GREATEST(0, used_seats - 1), updated_at = NOW()
    WHERE id = p_organization_id;
    
    result := TRUE;
  END IF;
  
  RETURN result;
END;
$$;


--
-- Name: notify_story_complete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notify_story_complete() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_library_owner UUID;
BEGIN
  -- When overall status changes to complete, create notification
  -- Handle NULL asset_generation_status gracefully
  IF (NEW.asset_generation_status IS NOT NULL 
      AND NEW.asset_generation_status->>'overall' = 'complete' 
      AND (OLD.asset_generation_status IS NULL OR OLD.asset_generation_status->>'overall' != 'complete')) THEN
    -- Get library owner (stories belong to libraries, not directly to users)
    SELECT owner INTO v_library_owner
    FROM libraries
    WHERE id = NEW.library_id;
    
    -- Only create notification if we found the library owner
    IF v_library_owner IS NOT NULL THEN
      PERFORM create_notification(
        v_library_owner,
        'story_ready',
        'Your story is ready!',
        format('"%s" is complete with all assets.', NEW.title),
        jsonb_build_object(
          'storyId', NEW.id,
          'title', NEW.title,
          'coverUrl', COALESCE(NEW.cover_art_url, '')
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: recommend_therapeutic_pathway(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recommend_therapeutic_pathway(p_user_id uuid) RETURNS TABLE(pathway_type text, target_emotions text[], estimated_duration integer, confidence numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION recommend_therapeutic_pathway(p_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.recommend_therapeutic_pathway(p_user_id uuid) IS 'Recommends appropriate therapeutic pathway based on user emotional patterns';


--
-- Name: record_event_metrics(text, text, integer, integer, integer, integer, integer, boolean, text, text, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_event_metrics(p_event_type text, p_source text, p_processing_time_ms integer, p_queue_time_ms integer DEFAULT 0, p_handler_time_ms integer DEFAULT 0, p_network_time_ms integer DEFAULT 0, p_retry_count integer DEFAULT 0, p_success boolean DEFAULT true, p_error_message text DEFAULT NULL::text, p_correlation_id text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_session_id text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: record_research_usage(text, text, text, integer, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_research_usage(p_tenant_id text, p_operation text, p_model text, p_tokens_used integer, p_cost numeric, p_duration integer) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;


--
-- Name: redeem_gift_card(text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_gift_card(p_code text, p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  card_record RECORD;
  current_sub RECORD;
  new_end_date TIMESTAMPTZ;
  result JSONB;
BEGIN
  -- Find the gift card
  SELECT * INTO card_record
  FROM gift_cards
  WHERE code = p_code
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF card_record IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid or expired gift card code'
    );
  END IF;
  
  -- Check if already redeemed
  IF card_record.redeemed_by IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Gift card already redeemed'
    );
  END IF;
  
  -- Get current subscription (if any)
  SELECT * INTO current_sub
  FROM subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate new end date (stacking)
  IF current_sub IS NOT NULL AND current_sub.current_period_end IS NOT NULL THEN
    -- Extend from current end date
    new_end_date := current_sub.current_period_end::TIMESTAMPTZ + (card_record.value_months || ' months')::INTERVAL;
    
    -- Update subscription
    UPDATE subscriptions
    SET current_period_end = new_end_date::TEXT,
        updated_at = NOW()
    WHERE id = current_sub.id;
  ELSE
    -- No active subscription - create one with gift card period
    new_end_date := NOW() + (card_record.value_months || ' months')::INTERVAL;
    
    INSERT INTO subscriptions (
      user_id,
      plan_id,
      status,
      current_period_start,
      current_period_end
    ) VALUES (
      p_user_id,
      'pro_individual',
      'active',
      NOW()::TEXT,
      new_end_date::TEXT
    );
  END IF;
  
  -- Mark gift card as redeemed
  UPDATE gift_cards
  SET redeemed_by = p_user_id,
      redeemed_at = NOW(),
      status = 'redeemed',
      updated_at = NOW()
  WHERE id = card_record.id;
  
  -- Record redemption
  INSERT INTO gift_card_redemptions (
    user_id,
    gift_card_id,
    months_added,
    subscription_extended_to
  ) VALUES (
    p_user_id,
    card_record.id,
    card_record.value_months,
    new_end_date
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'monthsAdded', card_record.value_months,
    'subscriptionExtendedTo', new_end_date,
    'giftCardId', card_record.id
  );
END;
$$;


--
-- Name: register_universal_platform(text, text, text[], jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_universal_platform(platform_name_param text, version_param text, capabilities_param text[], config_data jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  config_id UUID;
BEGIN
  INSERT INTO universal_platform_configs (
    platform_name,
    version,
    capabilities,
    request_format,
    response_format,
    authentication_config,
    endpoints,
    request_mapping,
    response_mapping,
    smart_home_mapping
  ) VALUES (
    platform_name_param,
    version_param,
    capabilities_param,
    COALESCE(config_data->>'request_format', 'json'),
    COALESCE(config_data->>'response_format', 'json'),
    config_data->'authentication',
    config_data->'endpoints',
    config_data->'request_mapping',
    config_data->'response_mapping',
    config_data->'smart_home_mapping'
  ) RETURNING id INTO config_id;
  
  RETURN config_id;
END;
$$;


--
-- Name: reset_rate_limit(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reset_rate_limit(p_identifier text, p_action text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  DELETE FROM auth_rate_limits
  WHERE identifier = p_identifier 
    AND action = p_action;
  
  RETURN TRUE;
END;
$$;


--
-- Name: respond_to_story_transfer(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.respond_to_story_transfer(p_transfer_id uuid, p_response text, p_response_message text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  transfer_record RECORD;
BEGIN
  -- Get transfer request details
  SELECT * INTO transfer_record
  FROM story_transfer_requests
  WHERE id = p_transfer_id AND status = 'pending';
  
  IF transfer_record IS NULL THEN
    RAISE EXCEPTION 'Transfer request not found or already processed';
  END IF;
  
  -- Check permission on target library
  IF NOT check_library_permission_with_coppa(transfer_record.to_library_id, 'Admin') THEN
    RAISE EXCEPTION 'Admin access required on target library';
  END IF;
  
  -- Update transfer request
  UPDATE story_transfer_requests
  SET status = p_response,
      response_message = p_response_message,
      responded_at = NOW(),
      responded_by = auth.uid()
  WHERE id = p_transfer_id;
  
  -- If accepted, move the story
  IF p_response = 'accepted' THEN
    UPDATE stories
    SET library_id = transfer_record.to_library_id
    WHERE id = transfer_record.story_id;
  END IF;
  
  RETURN TRUE;
END;
$$;


--
-- Name: revoke_all_user_tokens(uuid, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_all_user_tokens(p_user_id uuid, p_reason character varying DEFAULT 'user_requested'::character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    -- Revoke all refresh tokens
    UPDATE oauth_refresh_tokens 
    SET revoked_at = CURRENT_TIMESTAMP,
        revocation_reason = p_reason
    WHERE user_id = p_user_id 
    AND revoked_at IS NULL;
    
    -- Revoke all access tokens
    UPDATE oauth_access_tokens 
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
    AND revoked_at IS NULL;
END;
$$;


--
-- Name: revoke_user_sessions(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_user_sessions(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the session revocation
  PERFORM log_audit_event_enhanced(
    'AuthAgent',
    'sessions_revoked',
    jsonb_build_object('user_id', p_user_id, 'revoked_count', deleted_count)
  );
  
  RETURN deleted_count;
END;
$$;


--
-- Name: revoke_user_tokens(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_user_tokens(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  revoked_count INTEGER;
BEGIN
  UPDATE refresh_tokens 
  SET revoked = TRUE 
  WHERE user_id = p_user_id AND revoked = FALSE;
  
  GET DIAGNOSTICS revoked_count = ROW_COUNT;
  
  -- Log the revocation event
  PERFORM log_audit_event_enhanced(
    'AuthAgent',
    'tokens_revoked',
    jsonb_build_object('user_id', p_user_id, 'revoked_count', revoked_count)
  );
  
  RETURN revoked_count;
END;
$$;


--
-- Name: revoke_voice_clone(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revoke_voice_clone(p_user_id uuid, p_reason text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  clone_count INTEGER;
BEGIN
  -- Update voice clone status
  UPDATE voice_clones
  SET revoked_at = NOW(),
      revocation_reason = p_reason,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS clone_count = ROW_COUNT;
  
  -- Log the revocation event
  IF clone_count > 0 THEN
    PERFORM log_audit_event_enhanced(
      'VoiceService',
      'voice_clone_revoked',
      jsonb_build_object(
        'user_id', p_user_id,
        'reason', p_reason,
        'revoked_count', clone_count
      )
    );
  END IF;
  
  RETURN clone_count > 0;
END;
$$;


--
-- Name: schedule_webhook_retry(uuid, timestamp with time zone, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.schedule_webhook_retry(delivery_id uuid, next_retry_at_param timestamp with time zone, attempt_count integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE webhook_deliveries
  SET 
    status = 'retrying',
    attempt = attempt_count,
    next_retry_at = next_retry_at_param,
    updated_at = NOW()
  WHERE id = delivery_id;
END;
$$;


--
-- Name: share_character(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.share_character(p_character_id uuid, p_target_library_id uuid, p_share_type text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  character_record RECORD;
  source_library_id UUID;
  new_character_id UUID;
  share_id UUID;
BEGIN
  -- Get character and source library
  SELECT c.* INTO character_record
  FROM characters c
  WHERE c.id = p_character_id;
  
  SELECT s.library_id INTO source_library_id
  FROM stories s
  WHERE s.id = character_record.story_id;
  
  IF character_record IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;
  
  -- Check permissions
  IF NOT check_library_permission_with_coppa(source_library_id, 'Editor') THEN
    RAISE EXCEPTION 'Editor access required on source library';
  END IF;
  
  IF NOT check_library_permission_with_coppa(p_target_library_id, 'Editor') THEN
    RAISE EXCEPTION 'Editor access required on target library';
  END IF;
  
  -- For copy type, create a new character
  IF p_share_type = 'copy' THEN
    -- This would need a target story in the target library
    -- For now, we'll just record the share intent
    new_character_id := NULL;
  END IF;
  
  -- Record the share
  INSERT INTO character_shares (
    character_id, source_library_id, target_library_id,
    share_type, shared_by, new_character_id
  )
  VALUES (
    p_character_id, source_library_id, p_target_library_id,
    p_share_type, auth.uid(), new_character_id
  )
  RETURNING id INTO share_id;
  
  RETURN share_id;
END;
$$;


--
-- Name: should_send_email(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.should_send_email(p_user_id uuid, p_email_type text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_preferences email_preferences%ROWTYPE;
  v_daily_count INTEGER;
  v_weekly_count INTEGER;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM public.email_preferences
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Default to allowing if preferences not set
    RETURN TRUE;
  END IF;
  
  -- Check category preferences
  IF p_email_type LIKE '%insight%' AND NOT v_preferences.insights THEN
    RETURN FALSE;
  END IF;
  IF p_email_type LIKE '%marketing%' AND NOT v_preferences.marketing THEN
    RETURN FALSE;
  END IF;
  IF p_email_type LIKE '%reminder%' AND NOT v_preferences.reminders THEN
    RETURN FALSE;
  END IF;
  
  -- Check frequency caps
  -- Daily: Max 1 insight email
  SELECT COUNT(*) INTO v_daily_count
  FROM public.email_delivery_log
  WHERE user_id = p_user_id
    AND email_type LIKE '%insight%'
    AND sent_at > NOW() - INTERVAL '1 day';
  
  IF v_daily_count >= 1 AND p_email_type LIKE '%insight%' THEN
    RETURN FALSE;
  END IF;
  
  -- Weekly: Max 2 marketing emails
  SELECT COUNT(*) INTO v_weekly_count
  FROM public.email_delivery_log
  WHERE user_id = p_user_id
    AND email_type LIKE '%marketing%'
    AND sent_at > NOW() - INTERVAL '7 days';
  
  IF v_weekly_count >= 2 AND p_email_type LIKE '%marketing%' THEN
    RETURN FALSE;
  END IF;
  
  -- Check quiet hours (simplified - should consider timezone)
  IF v_preferences.quiet_hours_start IS NOT NULL 
     AND v_preferences.quiet_hours_end IS NOT NULL 
     AND NOT p_email_type LIKE '%crisis%' -- Crisis always sends
  THEN
    -- Simplified check (doesn't account for timezone properly)
    IF CURRENT_TIME BETWEEN v_preferences.quiet_hours_start AND v_preferences.quiet_hours_end THEN
      RETURN FALSE;
    END IF;
  END IF;
  
  RETURN TRUE;
END;
$$;


--
-- Name: track_consumption_event(uuid, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_consumption_event(p_story_id uuid, p_user_id uuid, p_event_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Insert or update consumption metrics
  INSERT INTO public.consumption_metrics (
    story_id,
    user_id,
    read_count,
    total_duration_seconds,
    completion_rate,
    replay_count,
    first_read_at,
    last_read_at,
    interaction_events
  )
  VALUES (
    p_story_id,
    p_user_id,
    1,
    COALESCE((p_event_data->>'duration_seconds')::INTEGER, 0),
    COALESCE((p_event_data->>'completion_rate')::DECIMAL, 0.00),
    COALESCE((p_event_data->>'replay_count')::INTEGER, 0),
    NOW(),
    NOW(),
    JSONB_BUILD_ARRAY(p_event_data)
  )
  ON CONFLICT (story_id, user_id) DO UPDATE SET
    read_count = consumption_metrics.read_count + 1,
    total_duration_seconds = consumption_metrics.total_duration_seconds + COALESCE((p_event_data->>'duration_seconds')::INTEGER, 0),
    completion_rate = COALESCE((p_event_data->>'completion_rate')::DECIMAL, consumption_metrics.completion_rate),
    replay_count = consumption_metrics.replay_count + COALESCE((p_event_data->>'replay_count')::INTEGER, 0),
    last_read_at = NOW(),
    interaction_events = consumption_metrics.interaction_events || JSONB_BUILD_ARRAY(p_event_data),
    updated_at = NOW();
END;
$$;


--
-- Name: update_a2a_tasks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_a2a_tasks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_accessibility_profile_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_accessibility_profile_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_api_keys_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_api_keys_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_asset_status(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_asset_status(p_story_id uuid, p_asset_type text, p_status text, p_url text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Update the asset_generation_status JSONB
  -- Note: stories table doesn't have updated_at column, so we only update asset_generation_status
  UPDATE stories
  SET 
    asset_generation_status = jsonb_set(
      COALESCE(asset_generation_status, '{"overall": "pending", "assets": {}}'::jsonb),
      ARRAY['assets', p_asset_type],
      jsonb_build_object('status', p_status, 'url', p_url, 'updatedAt', NOW())
    )
  WHERE id = p_story_id;
  
  -- Check if all assets are complete
  IF NOT EXISTS (
    SELECT 1 FROM asset_generation_jobs 
    WHERE story_id = p_story_id 
    AND status IN ('queued', 'generating')
  ) THEN
    UPDATE stories
    SET 
      asset_generation_status = jsonb_set(
        COALESCE(asset_generation_status, '{"overall": "pending", "assets": {}}'::jsonb),
        '{overall}',
        '"complete"'
      ),
      asset_generation_completed_at = NOW()
    WHERE id = p_story_id;
  END IF;
END;
$$;


--
-- Name: update_character(uuid, text, jsonb, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_character(p_character_id uuid, p_name text DEFAULT NULL::text, p_traits jsonb DEFAULT NULL::jsonb, p_art_prompt text DEFAULT NULL::text, p_appearance_url text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  lib_id UUID;
BEGIN
  -- Get library_id for permission check
  SELECT library_id INTO lib_id FROM characters WHERE id = p_character_id;
  
  IF lib_id IS NULL THEN
    RAISE EXCEPTION 'Character not found';
  END IF;
  
  -- Check permissions
  IF NOT check_library_permission(lib_id, 'Editor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update character';
  END IF;
  
  -- Update the character
  UPDATE characters 
  SET 
    name = COALESCE(p_name, name),
    traits = COALESCE(p_traits, traits),
    art_prompt = COALESCE(p_art_prompt, art_prompt),
    appearance_url = COALESCE(p_appearance_url, appearance_url),
    updated_at = NOW()
  WHERE id = p_character_id;
  
  -- Log the update
  PERFORM log_audit_event_enhanced(
    'ContentAgent',
    'character_updated',
    jsonb_build_object(
      'character_id', p_character_id,
      'library_id', lib_id
    )
  );
  
  RETURN TRUE;
END;
$$;


--
-- Name: update_conversation_sessions_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_sessions_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_cultural_context(uuid, text, text[], text[], text[], jsonb, text[], text[], text[], text[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_cultural_context(p_user_id uuid, p_primary_language text DEFAULT NULL::text, p_secondary_languages text[] DEFAULT NULL::text[], p_cultural_background text[] DEFAULT NULL::text[], p_religious_considerations text[] DEFAULT NULL::text[], p_family_structure jsonb DEFAULT NULL::jsonb, p_celebrations_and_holidays text[] DEFAULT NULL::text[], p_storytelling_traditions text[] DEFAULT NULL::text[], p_taboo_topics text[] DEFAULT NULL::text[], p_preferred_narrative_styles text[] DEFAULT NULL::text[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  updated_context JSONB;
BEGIN
  -- Upsert cultural context
  INSERT INTO cultural_contexts (
    user_id,
    primary_language,
    secondary_languages,
    cultural_background,
    religious_considerations,
    family_structure,
    celebrations_and_holidays,
    storytelling_traditions,
    taboo_topics,
    preferred_narrative_styles,
    updated_at
  ) VALUES (
    p_user_id,
    COALESCE(p_primary_language, 'en'),
    COALESCE(p_secondary_languages, '{}'),
    COALESCE(p_cultural_background, '{}'),
    COALESCE(p_religious_considerations, '{}'),
    COALESCE(p_family_structure, '{}'),
    COALESCE(p_celebrations_and_holidays, '{}'),
    COALESCE(p_storytelling_traditions, '{}'),
    COALESCE(p_taboo_topics, '{}'),
    COALESCE(p_preferred_narrative_styles, '{}'),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    primary_language = COALESCE(p_primary_language, cultural_contexts.primary_language),
    secondary_languages = COALESCE(p_secondary_languages, cultural_contexts.secondary_languages),
    cultural_background = COALESCE(p_cultural_background, cultural_contexts.cultural_background),
    religious_considerations = COALESCE(p_religious_considerations, cultural_contexts.religious_considerations),
    family_structure = COALESCE(p_family_structure, cultural_contexts.family_structure),
    celebrations_and_holidays = COALESCE(p_celebrations_and_holidays, cultural_contexts.celebrations_and_holidays),
    storytelling_traditions = COALESCE(p_storytelling_traditions, cultural_contexts.storytelling_traditions),
    taboo_topics = COALESCE(p_taboo_topics, cultural_contexts.taboo_topics),
    preferred_narrative_styles = COALESCE(p_preferred_narrative_styles, cultural_contexts.preferred_narrative_styles),
    updated_at = NOW()
  RETURNING to_jsonb(cultural_contexts.*) INTO updated_context;
  
  RETURN updated_context;
END;
$$;


--
-- Name: update_daily_healing_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_daily_healing_metrics() RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_incident_knowledge_success_rate(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_incident_knowledge_success_rate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_knowledge_analytics(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_knowledge_analytics(p_date date DEFAULT CURRENT_DATE) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
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


--
-- Name: FUNCTION update_knowledge_analytics(p_date date); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_knowledge_analytics(p_date date) IS 'Updates daily analytics for knowledge base performance';


--
-- Name: update_library_consent_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_library_consent_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_replay_status(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_replay_status(p_replay_id uuid, p_status text, p_events_replayed integer DEFAULT NULL::integer, p_error_message text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
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
$$;


--
-- Name: update_subscription_status(text, text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_subscription_status(p_stripe_subscription_id text, p_status text, p_current_period_start timestamp with time zone, p_current_period_end timestamp with time zone) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE subscriptions 
  SET 
    status = p_status,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    updated_at = NOW()
  WHERE stripe_subscription_id = p_stripe_subscription_id;
  
  -- Log the status change
  INSERT INTO billing_events (
    user_id,
    subscription_id,
    event_type,
    event_data
  )
  SELECT 
    s.user_id,
    s.id,
    'subscription_status_changed',
    jsonb_build_object(
      'old_status', s.status,
      'new_status', p_status,
      'stripe_subscription_id', p_stripe_subscription_id
    )
  FROM subscriptions s
  WHERE s.stripe_subscription_id = p_stripe_subscription_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_webhook_delivery(uuid, text, integer, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_webhook_delivery(delivery_id uuid, delivery_status text, response_code_param integer DEFAULT NULL::integer, response_body_param text DEFAULT NULL::text, error_message_param text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  webhook_uuid UUID;
BEGIN
  -- Get webhook_id from delivery
  SELECT webhook_id INTO webhook_uuid
  FROM webhook_deliveries
  WHERE id = delivery_id;
  
  -- Update delivery record
  UPDATE webhook_deliveries
  SET 
    status = delivery_status,
    response_code = response_code_param,
    response_body = response_body_param,
    error_message = error_message_param,
    delivered_at = CASE WHEN delivery_status = 'success' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = delivery_id;
  
  -- Update webhook's last delivery info
  IF webhook_uuid IS NOT NULL THEN
    UPDATE webhooks
    SET 
      last_delivery_timestamp = NOW(),
      last_delivery_status = delivery_status,
      last_delivery_response_code = response_code_param,
      last_delivery_error = error_message_param,
      updated_at = NOW()
    WHERE id = webhook_uuid;
  END IF;
END;
$$;


--
-- Name: update_webhook_delivery_status(uuid, text, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_webhook_delivery_status(webhook_id uuid, delivery_status text, response_code integer DEFAULT NULL::integer, error_message text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  UPDATE webhook_registrations
  SET 
    last_delivery_timestamp = NOW(),
    last_delivery_status = delivery_status,
    last_delivery_response_code = response_code,
    last_delivery_error = error_message,
    updated_at = NOW()
  WHERE id = webhook_id;
END;
$$;


--
-- Name: update_webvtt_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_webvtt_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: validate_coppa_before_story_creation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_coppa_before_story_creation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT check_coppa_compliance(auth.uid(), NEW.library_id) THEN
    RAISE EXCEPTION 'COPPA compliance violation: Parent consent required for users under 13 creating content in sub-libraries';
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: validate_phase1_webvtt_compliance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_phase1_webvtt_compliance(file_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    p90_accuracy DECIMAL(5,2);
BEGIN
    SELECT sync_accuracy_p90_ms INTO p90_accuracy
    FROM webvtt_files
    WHERE id = file_id;
    
    RETURN p90_accuracy IS NOT NULL AND p90_accuracy <= 5.0;
END;
$$;


--
-- Name: validate_smart_home_consent(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_smart_home_consent(p_user_id uuid, p_device_type text, p_platform text) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  user_age INTEGER;
  has_consent BOOLEAN := FALSE;
BEGIN
  -- Get user age
  SELECT age INTO user_age FROM users WHERE id = p_user_id;
  
  -- Check if user has valid consent for smart home integration
  SELECT EXISTS (
    SELECT 1 FROM iot_consent_records icr
    JOIN smart_home_devices shd ON icr.device_id = shd.id
    WHERE icr.user_id = p_user_id
    AND shd.device_type = p_device_type
    AND icr.platform = p_platform
    AND icr.consent_scope->>'basicLighting' = 'true'
    AND icr.withdrawal_timestamp IS NULL
    AND (
      user_age >= 13 OR 
      (user_age < 13 AND icr.parent_consent = TRUE)
    )
  ) INTO has_consent;
  
  RETURN has_consent;
END;
$$;


--
-- Name: validate_state_transition(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_state_transition(p_resource text, p_current_state text, p_new_state text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_valid_transitions JSONB;
BEGIN
  -- State machine definitions matching LifecycleEnforcementMiddleware.ts
  v_valid_transitions := '{
    "story": {
      "draft": ["generating", "archived"],
      "generating": ["ready", "failed"],
      "ready": ["archived", "generating"],
      "failed": ["generating", "archived"],
      "archived": ["ready"]
    },
    "asset": {
      "queued": ["generating"],
      "generating": ["ready", "failed"],
      "ready": ["generating"],
      "failed": ["generating", "canceled"],
      "canceled": []
    },
    "conversation": {
      "initializing": ["active", "failed"],
      "active": ["paused", "ended", "failed"],
      "paused": ["active", "ended"],
      "ended": [],
      "failed": ["initializing"]
    },
    "transfer": {
      "pending": ["accepted", "declined", "expired", "cancelled"],
      "accepted": [],
      "declined": [],
      "expired": [],
      "cancelled": []
    },
    "subscription": {
      "trialing": ["active", "canceled"],
      "active": ["past_due", "canceled", "paused"],
      "past_due": ["active", "canceled"],
      "paused": ["active", "canceled"],
      "canceled": []
    },
    "job": {
      "queued": ["generating", "canceled"],
      "generating": ["ready", "failed", "canceled"],
      "ready": [],
      "failed": ["queued"],
      "canceled": []
    }
  }'::jsonb;

  -- Check if transition is valid
  RETURN (
    v_valid_transitions->p_resource->p_current_state ? p_new_state
  );
END;
$$;


--
-- Name: FUNCTION validate_state_transition(p_resource text, p_current_state text, p_new_state text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_state_transition(p_resource text, p_current_state text, p_new_state text) IS 'Validates state transitions against canonical state machines from LifecycleEnforcementMiddleware.ts';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: a2a_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.a2a_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id text NOT NULL,
    state text NOT NULL,
    client_agent_id text NOT NULL,
    remote_agent_id text NOT NULL,
    method text NOT NULL,
    params jsonb DEFAULT '{}'::jsonb NOT NULL,
    result jsonb,
    error jsonb,
    session_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT a2a_tasks_state_check CHECK ((state = ANY (ARRAY['submitted'::text, 'working'::text, 'input-required'::text, 'completed'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: TABLE a2a_tasks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.a2a_tasks IS 'A2A protocol task storage for external agent/partner integration';


--
-- Name: COLUMN a2a_tasks.task_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.task_id IS 'Unique task identifier (UUID v4)';


--
-- Name: COLUMN a2a_tasks.state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.state IS 'Task state: submitted, working, input-required, completed, failed, canceled';


--
-- Name: COLUMN a2a_tasks.client_agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.client_agent_id IS 'ID of the client agent that created the task';


--
-- Name: COLUMN a2a_tasks.remote_agent_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.remote_agent_id IS 'ID of the remote agent (Storytailor)';


--
-- Name: COLUMN a2a_tasks.method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.method IS 'A2A method name (e.g., story.generate, emotion.checkin)';


--
-- Name: COLUMN a2a_tasks.params; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.params IS 'Method parameters (JSONB)';


--
-- Name: COLUMN a2a_tasks.result; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.result IS 'Task result/artifact (JSONB)';


--
-- Name: COLUMN a2a_tasks.error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.a2a_tasks.error IS 'Error information if task failed (JSONB)';


--
-- Name: accessibility_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accessibility_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_name text DEFAULT 'Default Profile'::text NOT NULL,
    speech_processing_delay integer DEFAULT 0,
    extended_response_time boolean DEFAULT false,
    alternative_input_methods text[] DEFAULT '{}'::text[],
    vocabulary_level text DEFAULT 'standard'::text,
    simplified_language_mode boolean DEFAULT false,
    custom_vocabulary_terms text[] DEFAULT '{}'::text[],
    attention_span_minutes integer DEFAULT 15,
    engagement_check_frequency integer DEFAULT 120,
    shorter_interaction_cycles boolean DEFAULT false,
    screen_reader_compatible boolean DEFAULT false,
    voice_amplifier_integration boolean DEFAULT false,
    switch_control_support boolean DEFAULT false,
    eye_tracking_support boolean DEFAULT false,
    extended_timeouts boolean DEFAULT false,
    motor_difficulty_support boolean DEFAULT false,
    custom_timeout_duration integer DEFAULT 10000,
    voice_pace_adjustment numeric DEFAULT 1.0,
    visual_cues_enabled boolean DEFAULT false,
    high_contrast_mode boolean DEFAULT false,
    large_text_mode boolean DEFAULT false,
    memory_aids_enabled boolean DEFAULT false,
    repetition_frequency integer DEFAULT 1,
    structured_prompts boolean DEFAULT false,
    preferred_interaction_style text DEFAULT 'conversational'::text,
    break_reminders boolean DEFAULT false,
    break_reminder_interval integer DEFAULT 600,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    CONSTRAINT accessibility_profiles_attention_span_minutes_check CHECK (((attention_span_minutes >= 1) AND (attention_span_minutes <= 60))),
    CONSTRAINT accessibility_profiles_break_reminder_interval_check CHECK (((break_reminder_interval >= 300) AND (break_reminder_interval <= 1800))),
    CONSTRAINT accessibility_profiles_custom_timeout_duration_check CHECK (((custom_timeout_duration >= 5000) AND (custom_timeout_duration <= 60000))),
    CONSTRAINT accessibility_profiles_engagement_check_frequency_check CHECK (((engagement_check_frequency >= 30) AND (engagement_check_frequency <= 600))),
    CONSTRAINT accessibility_profiles_preferred_interaction_style_check CHECK ((preferred_interaction_style = ANY (ARRAY['conversational'::text, 'structured'::text, 'guided'::text]))),
    CONSTRAINT accessibility_profiles_repetition_frequency_check CHECK (((repetition_frequency >= 1) AND (repetition_frequency <= 5))),
    CONSTRAINT accessibility_profiles_speech_processing_delay_check CHECK (((speech_processing_delay >= 0) AND (speech_processing_delay <= 10000))),
    CONSTRAINT accessibility_profiles_vocabulary_level_check CHECK ((vocabulary_level = ANY (ARRAY['simple'::text, 'standard'::text, 'advanced'::text]))),
    CONSTRAINT accessibility_profiles_voice_pace_adjustment_check CHECK (((voice_pace_adjustment >= 0.5) AND (voice_pace_adjustment <= 2.0)))
);


--
-- Name: TABLE accessibility_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.accessibility_profiles IS 'Individual accessibility profiles for users with specific needs and preferences';


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: affiliate_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    referral_code text NOT NULL,
    tracking_link text NOT NULL,
    payment_method text,
    payment_account_id text,
    tax_info jsonb,
    total_earnings numeric(10,2) DEFAULT 0,
    pending_earnings numeric(10,2) DEFAULT 0,
    paid_earnings numeric(10,2) DEFAULT 0,
    total_referrals integer DEFAULT 0,
    active_referrals integer DEFAULT 0,
    converted_referrals integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT affiliate_accounts_payment_method_check CHECK ((payment_method = ANY (ARRAY['stripe'::text, 'paypal'::text]))),
    CONSTRAINT affiliate_accounts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'closed'::text])))
);


--
-- Name: TABLE affiliate_accounts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.affiliate_accounts IS 'Affiliate program accounts and earnings';


--
-- Name: affiliate_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.affiliate_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    affiliate_id uuid NOT NULL,
    referred_user_id uuid,
    referred_email text,
    status text DEFAULT 'pending'::text,
    signup_date timestamp with time zone,
    conversion_date timestamp with time zone,
    revenue_generated numeric(10,2) DEFAULT 0,
    commission_earned numeric(10,2) DEFAULT 0,
    commission_paid boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT affiliate_referrals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'active'::text, 'converted'::text, 'churned'::text])))
);


--
-- Name: TABLE affiliate_referrals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.affiliate_referrals IS 'Individual referral tracking for affiliates';


--
-- Name: age_verification_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.age_verification_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    verification_method text NOT NULL,
    verification_attestation boolean,
    derived_bucket text NOT NULL,
    country text NOT NULL,
    policy_version text NOT NULL,
    evaluated_threshold integer NOT NULL,
    evaluated_at timestamp with time zone DEFAULT now(),
    encrypted_verification_value bytea,
    encryption_key_id text,
    expires_at timestamp with time zone DEFAULT (now() + '90 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT age_verification_audit_verification_method_check CHECK ((verification_method = ANY (ARRAY['confirmation'::text, 'birthYear'::text, 'ageRange'::text])))
);


--
-- Name: alert_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alert_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    metric text NOT NULL,
    threshold numeric NOT NULL,
    operator text NOT NULL,
    duration integer NOT NULL,
    severity text NOT NULL,
    enabled boolean DEFAULT true,
    last_triggered timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT alert_rules_operator_check CHECK ((operator = ANY (ARRAY['gt'::text, 'lt'::text, 'eq'::text, 'gte'::text, 'lte'::text]))),
    CONSTRAINT alert_rules_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: alexa_user_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alexa_user_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alexa_person_id text NOT NULL,
    supabase_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    name text NOT NULL,
    permissions text[] DEFAULT '{}'::text[],
    rate_limit_requests integer DEFAULT 1000,
    rate_limit_window integer DEFAULT 3600,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: asset_generation_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_generation_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    asset_type text NOT NULL,
    status text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text,
    retry_count integer DEFAULT 0,
    cost numeric(10,4),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT asset_generation_jobs_asset_type_check CHECK ((asset_type = ANY (ARRAY['audio'::text, 'webvtt'::text, 'cover'::text, 'scene_1'::text, 'scene_2'::text, 'scene_3'::text, 'scene_4'::text, 'activities'::text, 'pdf'::text, 'qr'::text, 'color_palettes'::text, 'music'::text, 'sfx'::text]))),
    CONSTRAINT asset_generation_jobs_status_check CHECK ((status = ANY (ARRAY['queued'::text, 'generating'::text, 'ready'::text, 'failed'::text, 'canceled'::text])))
);


--
-- Name: TABLE asset_generation_jobs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.asset_generation_jobs IS 'Tracks individual asset generation progress for progressive loading';


--
-- Name: assistive_technologies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assistive_technologies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    technology_type text NOT NULL,
    device_name text NOT NULL,
    integration_status text DEFAULT 'disconnected'::text,
    capabilities text[] DEFAULT '{}'::text[],
    configuration jsonb DEFAULT '{}'::jsonb,
    last_used timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT assistive_technologies_integration_status_check CHECK ((integration_status = ANY (ARRAY['connected'::text, 'disconnected'::text, 'error'::text, 'testing'::text]))),
    CONSTRAINT assistive_technologies_technology_type_check CHECK ((technology_type = ANY (ARRAY['screen_reader'::text, 'voice_amplifier'::text, 'switch_control'::text, 'eye_tracking'::text, 'other'::text])))
);


--
-- Name: TABLE assistive_technologies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.assistive_technologies IS 'Registered assistive technology devices and their configurations';


--
-- Name: audio_transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audio_transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    transcript_text text NOT NULL,
    audio_duration_seconds integer,
    language_code text DEFAULT 'en-US'::text,
    confidence_score numeric,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    CONSTRAINT audio_transcripts_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    agent_name text NOT NULL,
    action text NOT NULL,
    payload jsonb NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now(),
    session_id text,
    correlation_id text,
    pii_hash text
);


--
-- Name: auth_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    action text NOT NULL,
    attempts integer DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_token text NOT NULL,
    alexa_person_id text,
    device_type text,
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone NOT NULL,
    last_activity timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    platform text DEFAULT 'alexa_plus'::text,
    platform_capabilities text[] DEFAULT '{}'::text[],
    smart_home_enabled boolean DEFAULT false,
    CONSTRAINT auth_sessions_device_type_check CHECK ((device_type = ANY (ARRAY['voice'::text, 'screen'::text])))
);


--
-- Name: billing_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    subscription_id uuid,
    event_type text NOT NULL,
    stripe_event_id text,
    event_data jsonb,
    processed_at timestamp with time zone DEFAULT now()
);


--
-- Name: character_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sentiment text NOT NULL,
    rating integer,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT character_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT character_feedback_sentiment_check CHECK ((sentiment = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text])))
);


--
-- Name: character_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.character_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    character_id uuid NOT NULL,
    source_library_id uuid NOT NULL,
    target_library_id uuid NOT NULL,
    share_type text NOT NULL,
    shared_by uuid NOT NULL,
    new_character_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT character_shares_share_type_check CHECK ((share_type = ANY (ARRAY['copy'::text, 'reference'::text])))
);


--
-- Name: characters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.characters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid,
    name text NOT NULL,
    traits jsonb NOT NULL,
    appearance_url text,
    created_at timestamp with time zone DEFAULT now(),
    library_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    art_prompt text,
    reference_images jsonb DEFAULT '[]'::jsonb,
    color_palette jsonb DEFAULT '[]'::jsonb,
    birth_certificate_url text,
    usage_milestones jsonb DEFAULT '{}'::jsonb,
    is_primary boolean DEFAULT false,
    creator_user_id uuid
);


--
-- Name: COLUMN characters.reference_images; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.characters.reference_images IS 'Array of reference image objects for visual consistency across story illustrations:
[{
  "type": "headshot" | "bodyshot",
  "url": "https://...",
  "prompt": "Full prompt used to generate image",
  "traitsValidated": true/false,
  "createdAt": "ISO8601 timestamp"
}]

The traitsValidated flag indicates whether vision model confirmed that all inclusivity traits are visible in the image. This combats AI bias toward "perfect" features.';


--
-- Name: COLUMN characters.color_palette; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.characters.color_palette IS 'Character signature colors (3 hex codes) for HUE consistency across stories. Extracted from character headshot during creation.';


--
-- Name: choice_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.choice_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pattern_type text NOT NULL,
    frequency numeric NOT NULL,
    confidence numeric NOT NULL,
    examples text[] NOT NULL,
    emotional_correlation jsonb,
    developmental_insights text[] DEFAULT '{}'::text[],
    time_range jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT choice_patterns_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT choice_patterns_frequency_check CHECK (((frequency >= (0)::numeric) AND (frequency <= (1)::numeric))),
    CONSTRAINT choice_patterns_pattern_type_check CHECK ((pattern_type = ANY (ARRAY['risk_taking'::text, 'safety_seeking'::text, 'creative_exploration'::text, 'social_preference'::text, 'problem_solving'::text])))
);


--
-- Name: TABLE choice_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.choice_patterns IS 'Identified behavioral patterns from story choices';


--
-- Name: circuit_breaker_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.circuit_breaker_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_name text NOT NULL,
    state text NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    last_failure_at timestamp with time zone,
    next_attempt_at timestamp with time zone,
    success_count integer DEFAULT 0 NOT NULL,
    failure_threshold integer DEFAULT 5 NOT NULL,
    timeout_ms integer DEFAULT 60000 NOT NULL,
    success_threshold integer DEFAULT 3 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT circuit_breaker_state_state_check CHECK ((state = ANY (ARRAY['closed'::text, 'open'::text, 'half_open'::text]))),
    CONSTRAINT valid_counts CHECK (((failure_count >= 0) AND (success_count >= 0) AND (failure_threshold > 0) AND (success_threshold > 0) AND (timeout_ms > 0)))
);


--
-- Name: classroom_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classroom_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_date timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true
);


--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    teacher_id uuid NOT NULL,
    school_id uuid NOT NULL,
    grade_level text NOT NULL,
    subject text NOT NULL,
    curriculum_framework_id uuid,
    settings jsonb DEFAULT '{"assessmentMode": "both", "contentFiltering": "moderate", "collaborativeMode": true, "parentNotifications": true}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: communication_adaptations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_adaptations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    adaptation_type text NOT NULL,
    original_input text NOT NULL,
    adapted_response text NOT NULL,
    adaptation_reason text NOT NULL,
    effectiveness_score numeric,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT communication_adaptations_adaptation_type_check CHECK ((adaptation_type = ANY (ARRAY['speech_delay'::text, 'vocabulary_level'::text, 'attention_span'::text, 'motor_support'::text]))),
    CONSTRAINT communication_adaptations_effectiveness_score_check CHECK (((effectiveness_score >= (0)::numeric) AND (effectiveness_score <= (1)::numeric)))
);


--
-- Name: TABLE communication_adaptations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.communication_adaptations IS 'Log of communication adaptations applied for users';


--
-- Name: communication_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communication_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_pace text DEFAULT 'normal'::text,
    vocabulary_level text DEFAULT 'standard'::text,
    attention_span integer DEFAULT 30,
    processing_delay integer DEFAULT 0,
    preferred_interaction_style text DEFAULT 'gentle'::text,
    trigger_words text[] DEFAULT '{}'::text[],
    comfort_topics text[] DEFAULT '{}'::text[],
    special_needs jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT communication_profiles_preferred_interaction_style_check CHECK ((preferred_interaction_style = ANY (ARRAY['direct'::text, 'gentle'::text, 'playful'::text, 'structured'::text]))),
    CONSTRAINT communication_profiles_preferred_pace_check CHECK ((preferred_pace = ANY (ARRAY['slow'::text, 'normal'::text, 'fast'::text]))),
    CONSTRAINT communication_profiles_vocabulary_level_check CHECK ((vocabulary_level = ANY (ARRAY['simple'::text, 'standard'::text, 'advanced'::text])))
);


--
-- Name: consumption_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumption_metrics (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    story_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_count integer DEFAULT 0 NOT NULL,
    total_duration_seconds integer DEFAULT 0 NOT NULL,
    completion_rate numeric(5,2) DEFAULT 0.00,
    replay_count integer DEFAULT 0 NOT NULL,
    replay_patterns jsonb DEFAULT '[]'::jsonb,
    engagement_score numeric(5,2) DEFAULT 0.00,
    pause_patterns jsonb DEFAULT '[]'::jsonb,
    interaction_events jsonb DEFAULT '[]'::jsonb,
    first_read_at timestamp with time zone,
    last_read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT consumption_metrics_completion_rate_check CHECK (((completion_rate >= (0)::numeric) AND (completion_rate <= (100)::numeric))),
    CONSTRAINT consumption_metrics_engagement_score_check CHECK (((engagement_score >= (0)::numeric) AND (engagement_score <= (100)::numeric)))
);


--
-- Name: content_filtering_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_filtering_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid,
    original_content_hash text NOT NULL,
    filtered_content_hash text NOT NULL,
    filter_level text NOT NULL,
    modifications text[] NOT NULL,
    filtered_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_filtering_logs_filter_level_check CHECK ((filter_level = ANY (ARRAY['strict'::text, 'moderate'::text, 'standard'::text])))
);


--
-- Name: content_safety_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_safety_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    user_input text NOT NULL,
    inappropriate_categories text[] DEFAULT '{}'::text[],
    severity text NOT NULL,
    confidence numeric NOT NULL,
    redirection_response text NOT NULL,
    educational_opportunity jsonb,
    escalation_required boolean DEFAULT false NOT NULL,
    pattern_concern boolean DEFAULT false NOT NULL,
    previous_inappropriate_count integer DEFAULT 0,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_safety_logs_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT content_safety_logs_severity_check CHECK ((severity = ANY (ARRAY['mild'::text, 'moderate'::text, 'severe'::text, 'extreme'::text])))
);


--
-- Name: conversation_checkpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_checkpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkpoint_id text NOT NULL,
    session_id text NOT NULL,
    user_id uuid NOT NULL,
    conversation_phase text NOT NULL,
    story_state jsonb DEFAULT '{}'::jsonb NOT NULL,
    conversation_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    device_context jsonb DEFAULT '{}'::jsonb,
    user_context jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: TABLE conversation_checkpoints; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_checkpoints IS 'Stores conversation state checkpoints for interruption recovery';


--
-- Name: conversation_interruptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_interruptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    interruption_id text NOT NULL,
    session_id text NOT NULL,
    user_id uuid NOT NULL,
    interruption_type text NOT NULL,
    checkpoint_id text,
    resumption_prompt text NOT NULL,
    context_snapshot jsonb DEFAULT '{}'::jsonb,
    recovery_attempts integer DEFAULT 0,
    max_recovery_attempts integer DEFAULT 3,
    is_recovered boolean DEFAULT false,
    recovered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT conversation_interruptions_interruption_type_check CHECK ((interruption_type = ANY (ARRAY['user_stop'::text, 'system_error'::text, 'timeout'::text, 'device_switch'::text, 'network_loss'::text, 'external_interrupt'::text, 'multi_user_switch'::text])))
);


--
-- Name: TABLE conversation_interruptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_interruptions IS 'Tracks conversation interruptions and recovery attempts';


--
-- Name: conversation_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid NOT NULL,
    parent_session_id text,
    conversation_phase text NOT NULL,
    story_state jsonb DEFAULT '{}'::jsonb,
    conversation_context jsonb DEFAULT '{}'::jsonb,
    device_history jsonb DEFAULT '[]'::jsonb,
    user_context jsonb DEFAULT '{}'::jsonb,
    interruption_count integer DEFAULT 0,
    checkpoint_count integer DEFAULT 0,
    last_checkpoint_at timestamp with time zone,
    last_interruption_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval)
);


--
-- Name: TABLE conversation_sessions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_sessions IS 'Enhanced conversation session tracking with interruption support';


--
-- Name: conversation_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_states (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid NOT NULL,
    state jsonb NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    transcript_ids uuid[] DEFAULT '{}'::uuid[]
);


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    profile_id uuid,
    channel text NOT NULL,
    session_id text,
    status text DEFAULT 'initializing'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    ended_at timestamp with time zone,
    last_message_at timestamp with time zone,
    message_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT conversations_channel_check CHECK ((channel = ANY (ARRAY['alexa'::text, 'web'::text, 'api'::text, 'avatar'::text]))),
    CONSTRAINT conversations_status_check CHECK ((status = ANY (ARRAY['initializing'::text, 'active'::text, 'paused'::text, 'ended'::text, 'failed'::text])))
);


--
-- Name: TABLE conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversations IS 'Tracks conversation sessions with lifecycle state management';


--
-- Name: COLUMN conversations.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversations.status IS 'Lifecycle state: initializing → active → paused/ended/failed';


--
-- Name: crisis_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    indicator_type text NOT NULL,
    severity text NOT NULL,
    confidence numeric NOT NULL,
    source text NOT NULL,
    evidence text[] NOT NULL,
    context jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crisis_indicators_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT crisis_indicators_indicator_type_check CHECK ((indicator_type = ANY (ARRAY['emotional_distress'::text, 'behavioral_concern'::text, 'safety_risk'::text, 'self_harm_reference'::text, 'abuse_disclosure'::text]))),
    CONSTRAINT crisis_indicators_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT crisis_indicators_source_check CHECK ((source = ANY (ARRAY['voice_analysis'::text, 'text_content'::text, 'behavioral_pattern'::text, 'direct_disclosure'::text])))
);


--
-- Name: TABLE crisis_indicators; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crisis_indicators IS 'Crisis indicators detected from various sources';


--
-- Name: crisis_intervention_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_intervention_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    crisis_type text NOT NULL,
    severity text NOT NULL,
    intervention_type text NOT NULL,
    intervention_triggered boolean DEFAULT false NOT NULL,
    resources_provided jsonb DEFAULT '[]'::jsonb,
    escalation_level integer NOT NULL,
    follow_up_required boolean DEFAULT true NOT NULL,
    reporting_completed boolean DEFAULT false NOT NULL,
    context text,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT crisis_intervention_logs_crisis_type_check CHECK ((crisis_type = ANY (ARRAY['suicidal_ideation'::text, 'self_harm'::text, 'abuse_disclosure'::text, 'immediate_danger'::text, 'mental_health_emergency'::text, 'substance_emergency'::text]))),
    CONSTRAINT crisis_intervention_logs_escalation_level_check CHECK (((escalation_level >= 1) AND (escalation_level <= 5))),
    CONSTRAINT crisis_intervention_logs_intervention_type_check CHECK ((intervention_type = ANY (ARRAY['automated_response'::text, 'human_handoff'::text, 'emergency_services'::text, 'parent_notification'::text]))),
    CONSTRAINT crisis_intervention_logs_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: crisis_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crisis_id text NOT NULL,
    user_id uuid NOT NULL,
    risk_level text NOT NULL,
    escalation_actions jsonb NOT NULL,
    immediate_response text NOT NULL,
    parent_notification jsonb NOT NULL,
    professional_referral jsonb,
    follow_up_schedule jsonb NOT NULL,
    documentation_required boolean NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text,
    CONSTRAINT crisis_responses_risk_level_check CHECK ((risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: TABLE crisis_responses; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.crisis_responses IS 'Crisis response protocols and actions taken';


--
-- Name: cultural_character_traits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultural_character_traits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trait text NOT NULL,
    cultural_variations jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE cultural_character_traits; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cultural_character_traits IS 'Cultural variations for character traits';


--
-- Name: cultural_contexts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultural_contexts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    primary_language text DEFAULT 'en'::text NOT NULL,
    secondary_languages text[] DEFAULT '{}'::text[],
    cultural_background text[] DEFAULT '{}'::text[],
    religious_considerations text[] DEFAULT '{}'::text[],
    family_structure jsonb DEFAULT '{}'::jsonb,
    celebrations_and_holidays text[] DEFAULT '{}'::text[],
    storytelling_traditions text[] DEFAULT '{}'::text[],
    taboo_topics text[] DEFAULT '{}'::text[],
    preferred_narrative_styles text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE cultural_contexts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cultural_contexts IS 'Stores cultural preferences and context for users to enable culturally-aware storytelling';


--
-- Name: cultural_sensitivity_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cultural_sensitivity_filters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cultural_context text NOT NULL,
    sensitive_topics text[] DEFAULT '{}'::text[],
    appropriate_alternatives jsonb DEFAULT '{}'::jsonb,
    respectful_language jsonb DEFAULT '{}'::jsonb,
    avoidance_patterns text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE cultural_sensitivity_filters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cultural_sensitivity_filters IS 'Contains cultural sensitivity guidelines and filters';


--
-- Name: curriculum_alignment_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_alignment_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid,
    content_hash text NOT NULL,
    grade_level text NOT NULL,
    subject_area text NOT NULL,
    alignment_score numeric NOT NULL,
    matched_objectives text[] NOT NULL,
    vocabulary_level text NOT NULL,
    readability_score numeric NOT NULL,
    suggested_modifications text[] DEFAULT '{}'::text[],
    analysis_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT curriculum_alignment_results_alignment_score_check CHECK (((alignment_score >= (0)::numeric) AND (alignment_score <= (100)::numeric))),
    CONSTRAINT curriculum_alignment_results_vocabulary_level_check CHECK ((vocabulary_level = ANY (ARRAY['below'::text, 'appropriate'::text, 'above'::text])))
);


--
-- Name: curriculum_frameworks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.curriculum_frameworks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    region text NOT NULL,
    type text NOT NULL,
    grade_range_min text NOT NULL,
    grade_range_max text NOT NULL,
    subjects text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT curriculum_frameworks_type_check CHECK ((type = ANY (ARRAY['common-core'::text, 'ngss'::text, 'national-curriculum'::text, 'state-standards'::text, 'custom'::text])))
);


--
-- Name: data_retention_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.data_retention_policies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_name text NOT NULL,
    retention_period interval NOT NULL,
    deletion_strategy text NOT NULL,
    last_cleanup_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT data_retention_policies_deletion_strategy_check CHECK ((deletion_strategy = ANY (ARRAY['hard_delete'::text, 'soft_delete'::text, 'anonymize'::text, 'archive'::text])))
);


--
-- Name: deletion_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deletion_audit_log (
    log_id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_user_id uuid,
    entity_type text NOT NULL,
    entity_id uuid,
    deletion_type text NOT NULL,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb
);


--
-- Name: deletion_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deletion_requests (
    request_id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    deletion_type text NOT NULL,
    target_id uuid NOT NULL,
    reason text,
    immediate boolean DEFAULT false,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_deletion_at timestamp with time zone,
    status text NOT NULL,
    metadata jsonb,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT deletion_requests_deletion_type_check CHECK ((deletion_type = ANY (ARRAY['account'::text, 'story'::text, 'character'::text, 'library_member'::text, 'conversation_assets'::text]))),
    CONSTRAINT deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'scheduled'::text, 'processing'::text, 'completed'::text, 'cancelled'::text, 'failed'::text, 'hibernated'::text])))
);


--
-- Name: device_connection_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_connection_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_id uuid NOT NULL,
    action text NOT NULL,
    success boolean NOT NULL,
    error_message text,
    platform text,
    session_id text,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
);


--
-- Name: device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    device_type text NOT NULL,
    encrypted_token text NOT NULL,
    token_type text NOT NULL,
    expires_at timestamp with time zone,
    refresh_token_encrypted text,
    last_refreshed timestamp with time zone DEFAULT now(),
    refresh_attempts integer DEFAULT 0,
    status text DEFAULT 'active'::text,
    encryption_key_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: distress_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distress_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    distress_level text NOT NULL,
    confidence numeric NOT NULL,
    indicators jsonb DEFAULT '[]'::jsonb NOT NULL,
    voice_patterns jsonb,
    behavioral_patterns jsonb NOT NULL,
    recommended_actions jsonb DEFAULT '[]'::jsonb,
    immediate_attention_required boolean DEFAULT false NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT distress_patterns_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT distress_patterns_distress_level_check CHECK ((distress_level = ANY (ARRAY['none'::text, 'mild'::text, 'moderate'::text, 'severe'::text, 'critical'::text])))
);


--
-- Name: early_intervention_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.early_intervention_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    signal_type text NOT NULL,
    severity text NOT NULL,
    confidence numeric NOT NULL,
    indicators jsonb DEFAULT '[]'::jsonb NOT NULL,
    predicted_outcome text NOT NULL,
    time_to_intervention integer NOT NULL,
    recommended_actions text[] NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text,
    CONSTRAINT early_intervention_signals_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT early_intervention_signals_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT early_intervention_signals_signal_type_check CHECK ((signal_type = ANY (ARRAY['emotional_decline'::text, 'behavioral_change'::text, 'engagement_drop'::text, 'stress_accumulation'::text, 'social_withdrawal'::text])))
);


--
-- Name: TABLE early_intervention_signals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.early_intervention_signals IS 'Tracks early intervention signals for proactive emotional support';


--
-- Name: educational_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.educational_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    story_id uuid,
    learning_objective_id uuid NOT NULL,
    assessment_score numeric NOT NULL,
    completion_time integer NOT NULL,
    engagement_metrics jsonb NOT NULL,
    teacher_notes text,
    parent_feedback text,
    achieved_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT educational_outcomes_assessment_score_check CHECK (((assessment_score >= (0)::numeric) AND (assessment_score <= (100)::numeric)))
);


--
-- Name: email_delivery_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_delivery_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    email_type text NOT NULL,
    template_id text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    provider text NOT NULL,
    provider_message_id text,
    status text DEFAULT 'sent'::text NOT NULL,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_delivery_log_provider_check CHECK ((provider = ANY (ARRAY['sendgrid'::text, 'ses'::text]))),
    CONSTRAINT email_delivery_log_status_check CHECK ((status = ANY (ARRAY['sent'::text, 'delivered'::text, 'opened'::text, 'clicked'::text, 'bounced'::text, 'failed'::text, 'unsubscribed'::text])))
);


--
-- Name: email_engagement_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_engagement_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_type text NOT NULL,
    message_id text,
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    sent_at timestamp with time zone DEFAULT now(),
    metadata jsonb
);


--
-- Name: email_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_preferences (
    user_id uuid NOT NULL,
    transactional boolean DEFAULT true NOT NULL,
    insights boolean DEFAULT true NOT NULL,
    marketing boolean DEFAULT true NOT NULL,
    reminders boolean DEFAULT true NOT NULL,
    digest_frequency text DEFAULT 'evening'::text NOT NULL,
    insights_frequency text DEFAULT 'weekly'::text NOT NULL,
    quiet_hours_start time without time zone,
    quiet_hours_end time without time zone,
    timezone text DEFAULT 'UTC'::text NOT NULL,
    daily_moment text DEFAULT 'evening'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_preferences_daily_moment_check CHECK ((daily_moment = ANY (ARRAY['morning'::text, 'evening'::text, 'off'::text]))),
    CONSTRAINT email_preferences_digest_frequency_check CHECK ((digest_frequency = ANY (ARRAY['morning'::text, 'evening'::text, 'off'::text]))),
    CONSTRAINT email_preferences_insights_frequency_check CHECK ((insights_frequency = ANY (ARRAY['weekly'::text, 'monthly'::text, 'off'::text])))
);


--
-- Name: emotion_engagement_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotion_engagement_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    average_response_time numeric NOT NULL,
    response_time_variance numeric NOT NULL,
    engagement_level text NOT NULL,
    attention_span integer NOT NULL,
    fatigue_indicators jsonb DEFAULT '[]'::jsonb,
    recommendations text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emotion_engagement_metrics_engagement_level_check CHECK ((engagement_level = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: TABLE emotion_engagement_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emotion_engagement_metrics IS 'Aggregated engagement metrics per session for trend analysis';


--
-- Name: emotional_correlations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotional_correlations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mood text NOT NULL,
    preferred_choice_types text[] NOT NULL,
    avoided_choice_types text[] NOT NULL,
    response_time_pattern text NOT NULL,
    confidence numeric NOT NULL,
    sample_size integer NOT NULL,
    time_range jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emotional_correlations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT emotional_correlations_mood_check CHECK ((mood = ANY (ARRAY['happy'::text, 'sad'::text, 'scared'::text, 'angry'::text, 'neutral'::text]))),
    CONSTRAINT emotional_correlations_response_time_pattern_check CHECK ((response_time_pattern = ANY (ARRAY['faster'::text, 'slower'::text, 'normal'::text])))
);


--
-- Name: TABLE emotional_correlations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emotional_correlations IS 'Correlations between emotions and choice patterns';


--
-- Name: emotional_journeys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotional_journeys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    journey_id text NOT NULL,
    user_id uuid NOT NULL,
    pathway_id uuid NOT NULL,
    start_date timestamp with time zone DEFAULT now(),
    current_step integer DEFAULT 0,
    progress jsonb DEFAULT '[]'::jsonb NOT NULL,
    adaptations jsonb DEFAULT '[]'::jsonb NOT NULL,
    outcomes jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'active'::text,
    completion_date timestamp with time zone,
    CONSTRAINT emotional_journeys_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text, 'cancelled'::text])))
);


--
-- Name: TABLE emotional_journeys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emotional_journeys IS 'User progress through therapeutic pathways';


--
-- Name: emotional_trends; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotional_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    time_range jsonb NOT NULL,
    overall_trend text NOT NULL,
    trend_strength numeric NOT NULL,
    significant_changes jsonb DEFAULT '[]'::jsonb,
    seasonal_patterns jsonb DEFAULT '[]'::jsonb,
    weekly_patterns jsonb DEFAULT '[]'::jsonb,
    correlations jsonb DEFAULT '[]'::jsonb,
    developmental_milestones jsonb DEFAULT '[]'::jsonb,
    risk_factors jsonb DEFAULT '[]'::jsonb,
    protective_factors jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT emotional_trends_overall_trend_check CHECK ((overall_trend = ANY (ARRAY['improving'::text, 'declining'::text, 'stable'::text, 'volatile'::text]))),
    CONSTRAINT emotional_trends_trend_strength_check CHECK (((trend_strength >= (0)::numeric) AND (trend_strength <= (1)::numeric)))
);


--
-- Name: TABLE emotional_trends; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.emotional_trends IS 'Longitudinal emotional trend analysis and developmental insights';


--
-- Name: emotions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    library_id uuid,
    mood text NOT NULL,
    confidence numeric NOT NULL,
    context jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '365 days'::interval),
    sub_library_id uuid,
    CONSTRAINT emotions_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT emotions_mood_check CHECK ((mood = ANY (ARRAY['happy'::text, 'sad'::text, 'scared'::text, 'angry'::text, 'neutral'::text])))
);


--
-- Name: engagement_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engagement_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    check_type text NOT NULL,
    prompt text NOT NULL,
    response text,
    engagement_level numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    action_taken text,
    CONSTRAINT engagement_checks_check_type_check CHECK ((check_type = ANY (ARRAY['attention'::text, 'comprehension'::text, 'interest'::text, 'fatigue'::text]))),
    CONSTRAINT engagement_checks_engagement_level_check CHECK (((engagement_level >= (0)::numeric) AND (engagement_level <= (1)::numeric)))
);


--
-- Name: TABLE engagement_checks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.engagement_checks IS 'Engagement monitoring and attention checks during interactions';


--
-- Name: engagement_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.engagement_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    response_time integer NOT NULL,
    interaction_count integer NOT NULL,
    error_count integer NOT NULL,
    completion_rate numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT engagement_metrics_completion_rate_check CHECK (((completion_rate >= (0)::numeric) AND (completion_rate <= (1)::numeric)))
);


--
-- Name: TABLE engagement_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.engagement_metrics IS 'Quantitative engagement metrics for analysis';


--
-- Name: event_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_store (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    source text NOT NULL,
    spec_version text DEFAULT '1.0'::text NOT NULL,
    event_time timestamp with time zone NOT NULL,
    data_content_type text DEFAULT 'application/json'::text,
    data_schema text,
    subject text,
    data jsonb,
    correlation_id text,
    user_id uuid,
    session_id text,
    agent_name text,
    platform text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.event_analytics AS
 SELECT event_type,
    source,
    date_trunc('hour'::text, event_time) AS hour,
    count(*) AS event_count,
    count(DISTINCT correlation_id) AS unique_correlations,
    count(DISTINCT user_id) AS unique_users,
    count(DISTINCT session_id) AS unique_sessions
   FROM public.event_store
  WHERE (event_time >= (now() - '24:00:00'::interval))
  GROUP BY event_type, source, (date_trunc('hour'::text, event_time))
  ORDER BY (date_trunc('hour'::text, event_time)) DESC;


--
-- Name: event_correlations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_correlations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    correlation_id text NOT NULL,
    root_event_id text NOT NULL,
    parent_event_id text,
    caused_by text,
    related_events text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    source text NOT NULL,
    processing_time_ms integer NOT NULL,
    queue_time_ms integer DEFAULT 0,
    handler_time_ms integer DEFAULT 0,
    network_time_ms integer DEFAULT 0,
    retry_count integer DEFAULT 0,
    success boolean NOT NULL,
    error_message text,
    correlation_id text,
    user_id uuid,
    session_id text,
    processed_at timestamp with time zone DEFAULT now()
);


--
-- Name: event_replays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_replays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    replay_name text NOT NULL,
    event_source_arn text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    destination text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text,
    events_replayed integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    error_message text
);


--
-- Name: event_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id text NOT NULL,
    event_types text[] NOT NULL,
    source_filter text,
    rule_name text NOT NULL,
    queue_url text NOT NULL,
    queue_arn text NOT NULL,
    filter_pattern jsonb,
    retry_policy jsonb,
    dead_letter_queue text,
    status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: family_structure_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.family_structure_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    structure_type text NOT NULL,
    description text NOT NULL,
    common_terms jsonb DEFAULT '{}'::jsonb NOT NULL,
    cultural_considerations text[] DEFAULT '{}'::text[],
    storytelling_approaches text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE family_structure_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.family_structure_templates IS 'Templates for different family structures';


--
-- Name: gift_card_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_card_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    gift_card_id uuid NOT NULL,
    months_added integer NOT NULL,
    subscription_extended_to timestamp with time zone NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_card_redemptions_months_added_check CHECK ((months_added > 0))
);


--
-- Name: gift_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gift_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    value_months integer NOT NULL,
    purchased_by uuid,
    redeemed_by uuid,
    status text DEFAULT 'active'::text,
    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    purchased_at timestamp with time zone DEFAULT now(),
    redeemed_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT gift_cards_status_check CHECK ((status = ANY (ARRAY['active'::text, 'redeemed'::text, 'expired'::text]))),
    CONSTRAINT gift_cards_type_check CHECK ((type = ANY (ARRAY['1_month'::text, '3_month'::text, '6_month'::text, '12_month'::text]))),
    CONSTRAINT gift_cards_value_months_check CHECK ((value_months > 0))
);


--
-- Name: group_storytelling_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_storytelling_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    facilitator_id uuid NOT NULL,
    story_prompt text NOT NULL,
    learning_objectives text[] NOT NULL,
    max_participants integer DEFAULT 6,
    session_type text DEFAULT 'collaborative'::text,
    status text DEFAULT 'scheduled'::text,
    scheduled_start timestamp with time zone NOT NULL,
    actual_start timestamp with time zone,
    actual_end timestamp with time zone,
    story_content text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT group_storytelling_sessions_session_type_check CHECK ((session_type = ANY (ARRAY['collaborative'::text, 'turn-based'::text, 'guided'::text]))),
    CONSTRAINT group_storytelling_sessions_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'active'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: healing_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.healing_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    agent_name text NOT NULL,
    incidents_detected integer DEFAULT 0 NOT NULL,
    incidents_resolved integer DEFAULT 0 NOT NULL,
    average_resolution_time_ms integer,
    story_sessions_protected integer DEFAULT 0 NOT NULL,
    parent_notifications_sent integer DEFAULT 0 NOT NULL,
    false_positive_count integer DEFAULT 0 NOT NULL,
    system_availability_percent numeric(5,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_metrics CHECK (((incidents_detected >= 0) AND (incidents_resolved >= 0) AND (incidents_resolved <= incidents_detected) AND (story_sessions_protected >= 0) AND (parent_notifications_sent >= 0) AND (false_positive_count >= 0) AND ((system_availability_percent IS NULL) OR ((system_availability_percent >= 0.00) AND (system_availability_percent <= 100.00)))))
);


--
-- Name: hibernated_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hibernated_accounts (
    user_id uuid NOT NULL,
    original_tier text,
    glacier_archive_id text,
    hibernated_at timestamp with time zone DEFAULT now() NOT NULL,
    data_size_bytes bigint,
    restoration_requested_at timestamp with time zone,
    status text DEFAULT 'hibernated'::text,
    CONSTRAINT hibernated_accounts_status_check CHECK ((status = ANY (ARRAY['hibernated'::text, 'restoring'::text, 'restored'::text])))
);


--
-- Name: human_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.human_overrides (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pipeline_type text NOT NULL,
    system_action text NOT NULL,
    system_confidence numeric(5,2) NOT NULL,
    human_override text NOT NULL,
    override_type text NOT NULL,
    reasoning text,
    user_id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT human_overrides_override_type_check CHECK ((override_type = ANY (ARRAY['ESCALATED_TO_PROFESSIONAL'::text, 'FALSE_POSITIVE'::text, 'RECOMMENDATION_IGNORED'::text, 'PREFERENCE_CONFLICT'::text, 'BETTER_ALTERNATIVE'::text, 'TIMING_WRONG'::text]))),
    CONSTRAINT human_overrides_system_confidence_check CHECK (((system_confidence >= (0)::numeric) AND (system_confidence <= (1)::numeric)))
);


--
-- Name: incident_knowledge; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_knowledge (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_type text NOT NULL,
    error_signature text NOT NULL,
    error_pattern jsonb NOT NULL,
    healing_action jsonb NOT NULL,
    success_rate numeric(5,4) DEFAULT 0.0000 NOT NULL,
    application_count integer DEFAULT 0 NOT NULL,
    last_applied timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    affected_agents text[] DEFAULT '{}'::text[] NOT NULL,
    severity text NOT NULL,
    autonomy_level integer NOT NULL,
    CONSTRAINT incident_knowledge_autonomy_level_check CHECK ((autonomy_level = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT incident_knowledge_incident_type_check CHECK ((incident_type = ANY (ARRAY['agent_failure'::text, 'api_timeout'::text, 'database_error'::text, 'memory_leak'::text, 'rate_limit'::text, 'circuit_breaker'::text]))),
    CONSTRAINT incident_knowledge_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT valid_application_count CHECK ((application_count >= 0)),
    CONSTRAINT valid_success_rate CHECK (((success_rate >= 0.0) AND (success_rate <= 1.0)))
);


--
-- Name: incident_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.incident_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    incident_type text NOT NULL,
    error_pattern jsonb NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    healing_action jsonb,
    success boolean DEFAULT false NOT NULL,
    resolution_time_ms integer,
    impacted_users integer DEFAULT 0 NOT NULL,
    story_sessions_affected integer DEFAULT 0 NOT NULL,
    agent_name text NOT NULL,
    user_id uuid,
    session_id text,
    story_id uuid,
    active_conversation boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT resolved_incidents_have_resolution_time CHECK ((((resolved_at IS NULL) AND (resolution_time_ms IS NULL)) OR ((resolved_at IS NOT NULL) AND (resolution_time_ms IS NOT NULL)))),
    CONSTRAINT valid_impact_counts CHECK (((impacted_users >= 0) AND (story_sessions_affected >= 0))),
    CONSTRAINT valid_resolution_time CHECK (((resolution_time_ms IS NULL) OR (resolution_time_ms >= 0)))
);


--
-- Name: intervention_triggers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intervention_triggers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trigger_type text NOT NULL,
    severity text NOT NULL,
    source text NOT NULL,
    description text NOT NULL,
    recommendations text[] NOT NULL,
    detected_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    resolution_notes text,
    CONSTRAINT intervention_triggers_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT intervention_triggers_source_check CHECK ((source = ANY (ARRAY['latency_analysis'::text, 'choice_patterns'::text, 'voice_analysis'::text, 'longitudinal_trends'::text]))),
    CONSTRAINT intervention_triggers_trigger_type_check CHECK ((trigger_type = ANY (ARRAY['fatigue'::text, 'distress'::text, 'disengagement'::text, 'confusion'::text, 'emotional_distress'::text, 'developmental_concern'::text, 'behavioral_pattern'::text])))
);


--
-- Name: TABLE intervention_triggers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.intervention_triggers IS 'Detected triggers requiring intervention or attention';


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    from_user_id uuid NOT NULL,
    to_email text NOT NULL,
    to_user_id uuid,
    library_id uuid,
    role text,
    invite_code text NOT NULL,
    invite_url text,
    personal_message text,
    discount_percentage integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invitations_role_check CHECK ((role = ANY (ARRAY['Viewer'::text, 'Editor'::text, 'Admin'::text]))),
    CONSTRAINT invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'canceled'::text]))),
    CONSTRAINT invitations_type_check CHECK ((type = ANY (ARRAY['friend'::text, 'library'::text])))
);


--
-- Name: TABLE invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.invitations IS 'Friend and library invitation tracking';


--
-- Name: invite_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    type text NOT NULL,
    discount_percentage integer NOT NULL,
    valid_until timestamp with time zone NOT NULL,
    used_by uuid,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invite_discounts_discount_percentage_check CHECK (((discount_percentage > 0) AND (discount_percentage <= 100))),
    CONSTRAINT invite_discounts_type_check CHECK ((type = ANY (ARRAY['user_invite'::text, 'story_transfer'::text])))
);


--
-- Name: iot_consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.iot_consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id uuid NOT NULL,
    consent_scope jsonb NOT NULL,
    consent_method text NOT NULL,
    parent_consent boolean DEFAULT false,
    consent_timestamp timestamp with time zone DEFAULT now(),
    withdrawal_timestamp timestamp with time zone,
    withdrawal_method text,
    legal_basis text NOT NULL,
    platform text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: ip_detection_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_detection_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid,
    detection_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    detection_method text,
    detected_characters jsonb,
    confidence_scores jsonb,
    attribution_added boolean DEFAULT false NOT NULL,
    attribution_displayed_at timestamp with time zone,
    user_id uuid,
    session_id text,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: TABLE ip_detection_audit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_detection_audit IS 'Audit trail for IP detection attempts and attribution display';


--
-- Name: ip_disputes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_disputes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid,
    reported_by uuid,
    dispute_type text NOT NULL,
    character_name text NOT NULL,
    franchise text,
    owner text,
    status text DEFAULT 'pending'::text NOT NULL,
    resolution text,
    resolved_by uuid,
    resolved_at timestamp with time zone,
    legal_escalated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ip_disputes_dispute_type_check CHECK ((dispute_type = ANY (ARRAY['missed_detection'::text, 'false_positive'::text, 'rights_holder_claim'::text, 'user_question'::text]))),
    CONSTRAINT ip_disputes_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'escalated'::text])))
);


--
-- Name: TABLE ip_disputes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ip_disputes IS 'Tracks IP attribution disputes and user reports';


--
-- Name: knowledge_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_queries integer DEFAULT 0,
    resolved_queries integer DEFAULT 0,
    escalated_queries integer DEFAULT 0,
    avg_confidence numeric(3,2),
    top_categories jsonb,
    user_satisfaction_rate numeric(3,2),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE knowledge_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledge_analytics IS 'Daily aggregated metrics for knowledge base performance';


--
-- Name: knowledge_content; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_content (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_type text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    tags text[],
    user_types text[],
    confidence_threshold numeric(3,2) DEFAULT 0.7,
    popularity_score integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT knowledge_content_content_type_check CHECK ((content_type = ANY (ARRAY['faq'::text, 'story_intelligence'::text, 'platform_feature'::text, 'troubleshooting'::text]))),
    CONSTRAINT knowledge_content_user_types_check CHECK ((user_types <@ ARRAY['child'::text, 'parent'::text, 'teacher'::text, 'organization_admin'::text, 'all'::text]))
);


--
-- Name: TABLE knowledge_content; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledge_content IS 'Dynamic knowledge base content (future feature for admin updates)';


--
-- Name: knowledge_queries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_queries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_id text NOT NULL,
    query_text text NOT NULL,
    category text,
    confidence_score numeric(3,2),
    response_type text NOT NULL,
    response_id text,
    user_satisfied boolean,
    escalated_to_support boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT knowledge_queries_category_check CHECK ((category = ANY (ARRAY['platform_usage'::text, 'story_creation'::text, 'account_management'::text, 'troubleshooting'::text, 'features'::text, 'general'::text, 'story_intelligence'::text]))),
    CONSTRAINT knowledge_queries_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT knowledge_queries_response_type_check CHECK ((response_type = ANY (ARRAY['knowledge_base'::text, 'faq'::text, 'escalation'::text, 'fallback'::text])))
);


--
-- Name: TABLE knowledge_queries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledge_queries IS 'Logs all queries to the Knowledge Base Agent for analytics and improvement';


--
-- Name: knowledge_support_escalations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_support_escalations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    query_id uuid NOT NULL,
    user_id uuid,
    escalation_reason text NOT NULL,
    priority text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text,
    assigned_to text,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT knowledge_support_escalations_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT knowledge_support_escalations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);


--
-- Name: TABLE knowledge_support_escalations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledge_support_escalations IS 'Tracks queries that need human support intervention';


--
-- Name: language_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    native_name text NOT NULL,
    rtl boolean DEFAULT false,
    formality text DEFAULT 'mixed'::text,
    dialect_variant text,
    proficiency_level text DEFAULT 'native'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT language_profiles_formality_check CHECK ((formality = ANY (ARRAY['formal'::text, 'informal'::text, 'mixed'::text]))),
    CONSTRAINT language_profiles_proficiency_level_check CHECK ((proficiency_level = ANY (ARRAY['native'::text, 'fluent'::text, 'intermediate'::text, 'beginner'::text])))
);


--
-- Name: TABLE language_profiles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.language_profiles IS 'Supported languages with their characteristics';


--
-- Name: language_simplifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.language_simplifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_text text NOT NULL,
    simplified_text text NOT NULL,
    readability_score numeric NOT NULL,
    simplification_count integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT language_simplifications_readability_score_check CHECK (((readability_score >= (0)::numeric) AND (readability_score <= (1)::numeric)))
);


--
-- Name: TABLE language_simplifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.language_simplifications IS 'Language simplification records for cognitive accessibility';


--
-- Name: learning_objectives; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    framework_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    grade_level text NOT NULL,
    subject_area text NOT NULL,
    standards text[] NOT NULL,
    skills text[] NOT NULL,
    assessment_criteria text[] NOT NULL,
    difficulty text NOT NULL,
    estimated_duration integer NOT NULL,
    prerequisites text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT learning_objectives_difficulty_check CHECK ((difficulty = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text])))
);


--
-- Name: libraries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.libraries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner uuid NOT NULL,
    name text NOT NULL,
    parent_library uuid,
    created_at timestamp with time zone DEFAULT now(),
    primary_character_id uuid,
    is_storytailor_id boolean DEFAULT true,
    age_range text,
    is_minor boolean,
    consent_status text DEFAULT 'none'::text,
    policy_version text,
    evaluated_at timestamp with time zone,
    CONSTRAINT libraries_age_range_check CHECK ((age_range = ANY (ARRAY['3-5'::text, '6-8'::text, '9-10'::text, '11-12'::text, '13-15'::text, '16-17'::text]))),
    CONSTRAINT libraries_consent_status_check CHECK ((consent_status = ANY (ARRAY['none'::text, 'pending'::text, 'verified'::text, 'revoked'::text])))
);


--
-- Name: library_consent; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_consent (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    library_id uuid NOT NULL,
    adult_user_id uuid NOT NULL,
    consent_status text DEFAULT 'pending'::text NOT NULL,
    consent_method text NOT NULL,
    verification_token text NOT NULL,
    consent_scope jsonb DEFAULT '{}'::jsonb NOT NULL,
    consent_record_id text NOT NULL,
    requested_at timestamp with time zone DEFAULT now(),
    verified_at timestamp with time zone,
    revoked_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT library_consent_consent_method_check CHECK ((consent_method = ANY (ARRAY['email'::text, 'sms'::text, 'video_call'::text, 'id_verification'::text, 'voice'::text, 'app'::text]))),
    CONSTRAINT library_consent_consent_status_check CHECK ((consent_status = ANY (ARRAY['pending'::text, 'verified'::text, 'revoked'::text])))
);


--
-- Name: library_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    library_id uuid NOT NULL,
    total_stories integer DEFAULT 0,
    total_characters integer DEFAULT 0,
    most_active_user uuid,
    story_completion_rate numeric DEFAULT 0,
    average_story_rating numeric,
    popular_story_types text[] DEFAULT '{}'::text[],
    emotional_patterns jsonb DEFAULT '[]'::jsonb,
    usage_statistics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT library_insights_average_story_rating_check CHECK (((average_story_rating >= (0)::numeric) AND (average_story_rating <= (5)::numeric))),
    CONSTRAINT library_insights_story_completion_rate_check CHECK (((story_completion_rate >= (0)::numeric) AND (story_completion_rate <= (100)::numeric)))
);


--
-- Name: library_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.library_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    library_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL,
    granted_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT library_permissions_role_check CHECK ((role = ANY (ARRAY['Owner'::text, 'Admin'::text, 'Editor'::text, 'Viewer'::text])))
);


--
-- Name: localization_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.localization_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_hash text NOT NULL,
    source_language text NOT NULL,
    target_language text NOT NULL,
    cultural_context_hash text NOT NULL,
    localized_content text NOT NULL,
    cultural_adaptations text[] DEFAULT '{}'::text[],
    language_notes text[] DEFAULT '{}'::text[],
    confidence_score numeric DEFAULT 0.8,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    CONSTRAINT localization_cache_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric)))
);


--
-- Name: TABLE localization_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.localization_cache IS 'Cache for translated and culturally adapted content';


--
-- Name: mandatory_reporting_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mandatory_reporting_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_type text NOT NULL,
    severity text NOT NULL,
    evidence text[] DEFAULT '{}'::text[] NOT NULL,
    reporting_agency text NOT NULL,
    reported_at timestamp with time zone DEFAULT now() NOT NULL,
    report_number text,
    follow_up_required boolean DEFAULT true NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mandatory_reporting_records_report_type_check CHECK ((report_type = ANY (ARRAY['physical_abuse'::text, 'emotional_abuse'::text, 'sexual_abuse'::text, 'neglect'::text, 'suicidal_ideation'::text, 'self_harm'::text, 'mental_health_crisis'::text]))),
    CONSTRAINT mandatory_reporting_records_severity_check CHECK ((severity = ANY (ARRAY['high'::text, 'critical'::text]))),
    CONSTRAINT mandatory_reporting_records_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'submitted'::text, 'acknowledged'::text, 'investigating'::text, 'resolved'::text])))
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    asset_type text NOT NULL,
    url text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    deletion_request_id uuid,
    glacier_archive_id text,
    CONSTRAINT media_assets_asset_type_check CHECK ((asset_type = ANY (ARRAY['audio'::text, 'image'::text, 'pdf'::text, 'activity'::text])))
);


--
-- Name: multimodal_inputs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.multimodal_inputs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    input_type text NOT NULL,
    input_data jsonb NOT NULL,
    confidence numeric NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    processing_time integer NOT NULL,
    CONSTRAINT multimodal_inputs_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT multimodal_inputs_input_type_check CHECK ((input_type = ANY (ARRAY['voice'::text, 'touch'::text, 'gesture'::text, 'switch'::text, 'eye_tracking'::text, 'combined'::text])))
);


--
-- Name: TABLE multimodal_inputs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.multimodal_inputs IS 'Multi-modal input processing records for accessibility support';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['story_ready'::text, 'asset_ready'::text, 'story_shared'::text, 'library_invite'::text, 'transfer_request'::text, 'permission_granted'::text, 'subscription_update'::text, 'activity_suggestion'::text, 'system'::text])))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'In-app notification center for story completion, transfers, etc.';


--
-- Name: oauth_access_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_access_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(255) NOT NULL,
    client_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    scope text NOT NULL,
    audience text[],
    token_type character varying(50) DEFAULT 'Bearer'::character varying,
    expires_at timestamp with time zone NOT NULL,
    issued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    refresh_token_id uuid,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    last_used_at timestamp with time zone,
    use_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: oauth_authorization_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_authorization_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(255) NOT NULL,
    client_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    redirect_uri character varying(500) NOT NULL,
    scope text NOT NULL,
    state text,
    nonce text,
    code_challenge text,
    code_challenge_method character varying(50),
    session_id uuid,
    auth_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: oauth_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id character varying(255) NOT NULL,
    client_secret character varying(255),
    client_name character varying(255) NOT NULL,
    client_type character varying(50) NOT NULL,
    redirect_uris text[] NOT NULL,
    allowed_grant_types text[] DEFAULT ARRAY['authorization_code'::text] NOT NULL,
    allowed_response_types text[] DEFAULT ARRAY['code'::text] NOT NULL,
    allowed_scopes text[] DEFAULT ARRAY['openid'::text, 'profile'::text, 'email'::text] NOT NULL,
    require_pkce boolean DEFAULT true,
    allowed_code_challenge_methods text[] DEFAULT ARRAY['S256'::text],
    access_token_ttl integer DEFAULT 3600,
    refresh_token_ttl integer DEFAULT 2592000,
    id_token_ttl integer DEFAULT 3600,
    logo_uri character varying(500),
    policy_uri character varying(500),
    tos_uri character varying(500),
    contacts text[],
    token_endpoint_auth_method character varying(50) DEFAULT 'client_secret_basic'::character varying,
    jwks_uri character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    application_type character varying(50) DEFAULT 'web'::character varying,
    sector_identifier_uri character varying(500),
    subject_type character varying(50) DEFAULT 'public'::character varying,
    id_token_signed_response_alg character varying(50) DEFAULT 'RS256'::character varying,
    userinfo_signed_response_alg character varying(50),
    requires_parental_consent boolean DEFAULT true,
    age_gate_enabled boolean DEFAULT true,
    min_age_requirement integer DEFAULT 13,
    CONSTRAINT oauth_clients_client_type_check CHECK (((client_type)::text = ANY ((ARRAY['confidential'::character varying, 'public'::character varying])::text[])))
);


--
-- Name: oauth_consent_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_consent_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id character varying(255) NOT NULL,
    granted_scopes text[] NOT NULL,
    denied_scopes text[],
    requires_parental_consent boolean DEFAULT false,
    parent_user_id uuid,
    parent_consent_method character varying(100),
    parent_consent_timestamp timestamp with time zone,
    parent_consent_ip inet,
    consent_given_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    consent_expires_at timestamp with time zone,
    consent_revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: oauth_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type character varying(100) NOT NULL,
    client_id character varying(255),
    user_id uuid,
    event_data jsonb,
    success boolean NOT NULL,
    error_code character varying(100),
    error_description text,
    ip_address inet,
    user_agent text,
    session_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: oauth_id_token_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_id_token_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_username character varying(255),
    profile_url character varying(500),
    picture_url character varying(500),
    website character varying(500),
    email_verified boolean DEFAULT false,
    gender character varying(50),
    birthdate date,
    zoneinfo character varying(100),
    locale character varying(50),
    phone_number character varying(50),
    phone_number_verified boolean DEFAULT false,
    address_formatted text,
    address_street text,
    address_locality character varying(255),
    address_region character varying(255),
    address_postal_code character varying(50),
    address_country character varying(100),
    character_ids uuid[],
    family_id uuid,
    subscription_tier character varying(50),
    content_preferences jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: oauth_jwks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_jwks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kid character varying(255) NOT NULL,
    kty character varying(50) NOT NULL,
    use character varying(50) NOT NULL,
    alg character varying(50) NOT NULL,
    public_key text NOT NULL,
    private_key_encrypted text NOT NULL,
    valid_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp with time zone,
    revoked_at timestamp with time zone,
    revocation_reason character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    rotated_from_kid character varying(255)
);


--
-- Name: oauth_refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth_refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(255) NOT NULL,
    client_id character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    scope text NOT NULL,
    previous_token_hash character varying(255),
    rotation_count integer DEFAULT 0,
    expires_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoked_by uuid,
    revocation_reason character varying(255),
    device_id character varying(255),
    session_id uuid,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organization_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    owner_id uuid NOT NULL,
    subscription_id text NOT NULL,
    seat_count integer DEFAULT 1 NOT NULL,
    used_seats integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_seat_usage CHECK ((used_seats <= seat_count))
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT organization_members_role_check CHECK ((role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]))),
    CONSTRAINT organization_members_status_check CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'inactive'::text, 'removed'::text])))
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    owner_id uuid NOT NULL,
    subscription_tier text DEFAULT 'free'::text,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT 'organization'::text NOT NULL,
    billing_email text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    stripe_customer_id text,
    stripe_subscription_id text,
    max_seats integer DEFAULT 1 NOT NULL,
    used_seats integer DEFAULT 0 NOT NULL,
    CONSTRAINT valid_seat_usage CHECK ((used_seats <= max_seats))
);


--
-- Name: parent_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    parent_email text NOT NULL,
    notification_type text NOT NULL,
    severity text NOT NULL,
    message text NOT NULL,
    actions_taken text[] DEFAULT '{}'::text[] NOT NULL,
    recommended_actions text[] DEFAULT '{}'::text[] NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    delivery_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parent_notifications_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text]))),
    CONSTRAINT parent_notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['safety_concern'::text, 'inappropriate_content'::text, 'distress_detected'::text, 'crisis_intervention'::text]))),
    CONSTRAINT parent_notifications_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: parent_teacher_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parent_teacher_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    parent_email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'general'::text,
    priority text DEFAULT 'medium'::text,
    attachments jsonb DEFAULT '[]'::jsonb,
    parent_response text,
    response_date timestamp with time zone,
    is_read boolean DEFAULT false,
    sent_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parent_teacher_communications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT parent_teacher_communications_type_check CHECK ((type = ANY (ARRAY['progress_update'::text, 'concern'::text, 'achievement'::text, 'general'::text, 'assignment'::text])))
);


--
-- Name: parental_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parental_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    parent_email text NOT NULL,
    consent_type text NOT NULL,
    status text DEFAULT 'pending'::text,
    consent_document_url text,
    ip_address inet,
    user_agent text,
    expires_at timestamp with time zone,
    granted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT parental_consents_consent_type_check CHECK ((consent_type = ANY (ARRAY['voice_cloning'::text, 'data_collection'::text, 'marketing'::text]))),
    CONSTRAINT parental_consents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'denied'::text, 'revoked'::text])))
);


--
-- Name: participant_contributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participant_contributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    contribution text NOT NULL,
    word_count integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pending_transfer_magic_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_transfer_magic_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transfer_id uuid NOT NULL,
    recipient_email text NOT NULL,
    magic_token text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    used_at timestamp with time zone
);


--
-- Name: pipeline_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pipeline_executions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pipeline_type text NOT NULL,
    pipeline_name text NOT NULL,
    user_id uuid,
    triggered_by text NOT NULL,
    trigger_data jsonb DEFAULT '{}'::jsonb,
    vetoed boolean DEFAULT false NOT NULL,
    veto_reason text,
    confidence_score numeric(5,2),
    status text DEFAULT 'pending'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    result jsonb DEFAULT '{}'::jsonb,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pipeline_executions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'completed'::text, 'failed'::text, 'vetoed'::text]))),
    CONSTRAINT pipeline_executions_triggered_by_check CHECK ((triggered_by = ANY (ARRAY['event'::text, 'schedule'::text, 'manual'::text, 'retry'::text])))
);


--
-- Name: platform_embedding_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_embedding_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    skill_id text,
    action_id text,
    shortcut_id text,
    invocation_name text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    keywords text[] DEFAULT '{}'::text[],
    privacy_policy_url text NOT NULL,
    terms_of_use_url text NOT NULL,
    supported_locales text[] DEFAULT '{en-US}'::text[],
    target_audience text DEFAULT 'family'::text,
    content_rating text DEFAULT 'everyone'::text,
    permissions jsonb DEFAULT '[]'::jsonb,
    smart_home_integration jsonb,
    embedding_code text,
    status text DEFAULT 'draft'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT platform_embedding_configs_content_rating_check CHECK ((content_rating = ANY (ARRAY['everyone'::text, 'teen'::text, 'mature'::text]))),
    CONSTRAINT platform_embedding_configs_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'inactive'::text, 'error'::text]))),
    CONSTRAINT platform_embedding_configs_target_audience_check CHECK ((target_audience = ANY (ARRAY['children'::text, 'adults'::text, 'family'::text])))
);


--
-- Name: platform_integration_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_integration_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    event_type text NOT NULL,
    user_id uuid,
    session_id text,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone DEFAULT now(),
    processing_status text DEFAULT 'processed'::text,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT platform_integration_events_processing_status_check CHECK ((processing_status = ANY (ARRAY['processed'::text, 'failed'::text, 'ignored'::text])))
);


--
-- Name: push_device_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_device_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_token text NOT NULL,
    platform text NOT NULL,
    device_name text,
    enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT push_device_tokens_platform_check CHECK ((platform = ANY (ARRAY['ios'::text, 'android'::text, 'web'::text])))
);


--
-- Name: TABLE push_device_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_device_tokens IS 'Device tokens for mobile and web push notifications';


--
-- Name: qr_code_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.qr_code_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    scanned_at timestamp with time zone DEFAULT now(),
    user_agent text,
    ip_hash text,
    referrer text
);


--
-- Name: TABLE qr_code_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.qr_code_analytics IS 'QR code scan analytics for stories';


--
-- Name: recommendation_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recommendation_outcomes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    recommendation_type text NOT NULL,
    recommendation text NOT NULL,
    context jsonb DEFAULT '{}'::jsonb NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    user_followed boolean,
    followed_at timestamp with time zone,
    effectiveness_result numeric(5,2),
    outcome text,
    outcome_determined_at timestamp with time zone,
    repeat_safe boolean DEFAULT true,
    decline_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendation_outcomes_outcome_check CHECK ((outcome = ANY (ARRAY['SUCCESS'::text, 'DECLINED'::text, 'IGNORED'::text, 'PENDING'::text]))),
    CONSTRAINT recommendation_outcomes_recommendation_type_check CHECK ((recommendation_type = ANY (ARRAY['story_theme'::text, 'character'::text, 'timing'::text, 'therapeutic_pathway'::text, 'user_action'::text])))
);


--
-- Name: referral_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referee_id uuid NOT NULL,
    discount_code text,
    reward_amount integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    reward_type text,
    reward_value integer,
    reward_status text DEFAULT 'pending'::text,
    lifetime_value integer DEFAULT 0,
    CONSTRAINT referral_tracking_reward_status_check CHECK ((reward_status = ANY (ARRAY['pending'::text, 'issued'::text, 'failed'::text]))),
    CONSTRAINT referral_tracking_reward_type_check CHECK ((reward_type = ANY (ARRAY['casual'::text, 'affiliate'::text, 'teacher'::text, 'milestone'::text]))),
    CONSTRAINT referral_tracking_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text])))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: religious_sensitivity_guidelines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.religious_sensitivity_guidelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    religion text NOT NULL,
    sensitive_topics text[] DEFAULT '{}'::text[],
    appropriate_alternatives jsonb DEFAULT '{}'::jsonb,
    respectful_language text[] DEFAULT '{}'::text[],
    celebrations_to_include text[] DEFAULT '{}'::text[],
    celebrations_to_avoid text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE religious_sensitivity_guidelines; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.religious_sensitivity_guidelines IS 'Guidelines for religious sensitivity in content';


--
-- Name: research_agent_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_agent_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    challenged_agent text NOT NULL,
    question text NOT NULL,
    data_backing jsonb DEFAULT '[]'::jsonb NOT NULL,
    agent_response text,
    synthesis text NOT NULL,
    actionable boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: research_briefs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_briefs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    week_of timestamp with time zone NOT NULL,
    critical jsonb,
    tensions jsonb DEFAULT '[]'::jsonb NOT NULL,
    opportunities jsonb DEFAULT '[]'::jsonb NOT NULL,
    kill_list jsonb DEFAULT '[]'::jsonb NOT NULL,
    reality_check jsonb NOT NULL,
    what_we_shipped jsonb DEFAULT '[]'::jsonb NOT NULL,
    self_deception jsonb,
    format text DEFAULT 'markdown'::text NOT NULL,
    content text NOT NULL,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT research_briefs_format_check CHECK ((format = ANY (ARRAY['markdown'::text, 'json'::text])))
);


--
-- Name: research_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    cache_key text NOT NULL,
    insight jsonb NOT NULL,
    metric_value numeric NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: research_cost_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_cost_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    period text NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    events_processed integer DEFAULT 0 NOT NULL,
    llm_tokens_used jsonb DEFAULT '{"gpt-4o-mini": 0, "claude-haiku": 0, "claude-sonnet": 0}'::jsonb NOT NULL,
    analyses_generated integer DEFAULT 0 NOT NULL,
    estimated_cost numeric DEFAULT 0 NOT NULL,
    cost_limit numeric NOT NULL,
    status text DEFAULT 'normal'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT research_cost_tracking_period_check CHECK ((period = ANY (ARRAY['month'::text, 'week'::text, 'day'::text]))),
    CONSTRAINT research_cost_tracking_status_check CHECK ((status = ANY (ARRAY['normal'::text, 'warning'::text, 'throttled'::text, 'blocked'::text])))
);


--
-- Name: research_insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    track_type text NOT NULL,
    finding text NOT NULL,
    evidence jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommendation text NOT NULL,
    severity text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT research_insights_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: research_insights_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.research_insights_analytics AS
 SELECT tenant_id,
    track_type,
    severity,
    date_trunc('day'::text, created_at) AS day,
    count(*) AS insight_count
   FROM public.research_insights
  WHERE (created_at >= (now() - '30 days'::interval))
  GROUP BY tenant_id, track_type, severity, (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;


--
-- Name: research_pre_launch_memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_pre_launch_memos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    feature_name text NOT NULL,
    concept text NOT NULL,
    reality text NOT NULL,
    who_is_this_for jsonb NOT NULL,
    when_would_they_quit jsonb DEFAULT '[]'::jsonb NOT NULL,
    what_will_confuse jsonb DEFAULT '[]'::jsonb NOT NULL,
    buyer_lens jsonb NOT NULL,
    user_lens jsonb NOT NULL,
    language_audit jsonb NOT NULL,
    tension_map jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommendation text NOT NULL,
    confidence numeric NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT research_pre_launch_memos_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT research_pre_launch_memos_recommendation_check CHECK ((recommendation = ANY (ARRAY['ship'::text, 'dont_ship'::text, 'fix_first'::text])))
);


--
-- Name: research_tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    config jsonb NOT NULL,
    cost_limit integer DEFAULT 300 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: research_usage_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.research_usage_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id text NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    operation text NOT NULL,
    model text NOT NULL,
    tokens_used integer NOT NULL,
    cost numeric NOT NULL,
    duration integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: response_adaptations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_adaptations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_response text NOT NULL,
    adapted_response text NOT NULL,
    adaptation_types text[] NOT NULL,
    target_profile uuid NOT NULL,
    effectiveness_score numeric,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT response_adaptations_effectiveness_score_check CHECK (((effectiveness_score >= (0)::numeric) AND (effectiveness_score <= (1)::numeric)))
);


--
-- Name: TABLE response_adaptations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.response_adaptations IS 'Log of response adaptations applied based on accessibility profiles';


--
-- Name: response_latency_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.response_latency_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    question_type text NOT NULL,
    question text NOT NULL,
    response_time integer NOT NULL,
    context jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT response_latency_data_question_type_check CHECK ((question_type = ANY (ARRAY['character_trait'::text, 'story_choice'::text, 'emotional_checkin'::text, 'general'::text])))
);


--
-- Name: TABLE response_latency_data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.response_latency_data IS 'Tracks response times for engagement analysis and fatigue detection';


--
-- Name: reward_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reward_ledger (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    source text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'usd'::text NOT NULL,
    stripe_balance_txn_id text,
    stripe_customer_id text,
    status text DEFAULT 'pending'::text NOT NULL,
    applied_to_invoice text,
    applied_at timestamp with time zone,
    expires_at timestamp with time zone,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reward_ledger_amount_check CHECK ((amount > 0)),
    CONSTRAINT reward_ledger_source_check CHECK ((source = ANY (ARRAY['referral'::text, 'story_share'::text, 'teacher_referral'::text, 'milestone_bonus'::text, 'power_user_reward'::text, 'seasonal_campaign'::text, 'manual_credit'::text]))),
    CONSTRAINT reward_ledger_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'applied'::text, 'expired'::text, 'refunded'::text])))
);


--
-- Name: risk_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.risk_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    overall_risk_level text NOT NULL,
    risk_factors jsonb DEFAULT '[]'::jsonb NOT NULL,
    protective_factors jsonb DEFAULT '[]'::jsonb NOT NULL,
    intervention_urgency text NOT NULL,
    recommended_interventions jsonb DEFAULT '[]'::jsonb NOT NULL,
    next_assessment_due timestamp with time zone NOT NULL,
    assessment_date timestamp with time zone DEFAULT now(),
    assessor text DEFAULT 'system'::text,
    notes text,
    CONSTRAINT risk_assessments_intervention_urgency_check CHECK ((intervention_urgency = ANY (ARRAY['none'::text, 'monitor'::text, 'schedule'::text, 'immediate'::text]))),
    CONSTRAINT risk_assessments_overall_risk_level_check CHECK ((overall_risk_level = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: TABLE risk_assessments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.risk_assessments IS 'Comprehensive risk assessments for user emotional wellbeing';


--
-- Name: safety_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safety_incidents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    incident_type text NOT NULL,
    severity text NOT NULL,
    description text NOT NULL,
    context text NOT NULL,
    actions_taken text[] DEFAULT '{}'::text[] NOT NULL,
    reporting_required boolean DEFAULT false NOT NULL,
    reporting_completed boolean DEFAULT false NOT NULL,
    follow_up_required boolean DEFAULT false NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT safety_incidents_incident_type_check CHECK ((incident_type = ANY (ARRAY['physical_abuse'::text, 'emotional_abuse'::text, 'sexual_abuse'::text, 'neglect'::text, 'bullying'::text, 'self_harm'::text, 'suicidal_ideation'::text, 'substance_abuse'::text, 'domestic_violence'::text, 'mental_health_crisis'::text, 'unsafe_situation'::text, 'sexual_content'::text, 'violence'::text, 'profanity'::text, 'hate_speech'::text, 'dangerous_activities'::text, 'inappropriate_relationships'::text, 'personal_information'::text, 'scary_content'::text]))),
    CONSTRAINT safety_incidents_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])))
);


--
-- Name: safety_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.safety_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plan_id text NOT NULL,
    user_id uuid NOT NULL,
    trigger_signs text[] NOT NULL,
    coping_strategies text[] NOT NULL,
    support_contacts jsonb DEFAULT '[]'::jsonb NOT NULL,
    professional_contacts jsonb DEFAULT '[]'::jsonb NOT NULL,
    safe_environment_steps text[] NOT NULL,
    emergency_contacts jsonb DEFAULT '[]'::jsonb NOT NULL,
    review_schedule text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    CONSTRAINT safety_plans_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'archived'::text])))
);


--
-- Name: TABLE safety_plans; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.safety_plans IS 'Personalized safety plans for users at risk';


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    district text,
    address jsonb,
    contact_info jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: self_healing_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.self_healing_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    autonomy_level integer DEFAULT 1 NOT NULL,
    max_actions_per_hour integer DEFAULT 10 NOT NULL,
    story_session_protection boolean DEFAULT true NOT NULL,
    parent_notification boolean DEFAULT true NOT NULL,
    allowed_start_time time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    allowed_end_time time without time zone DEFAULT '19:00:00'::time without time zone NOT NULL,
    timezone text DEFAULT 'America/Chicago'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT self_healing_config_autonomy_level_check CHECK ((autonomy_level = ANY (ARRAY[1, 2, 3]))),
    CONSTRAINT valid_max_actions CHECK ((max_actions_per_hour > 0)),
    CONSTRAINT valid_time_window CHECK ((allowed_start_time < allowed_end_time))
);


--
-- Name: session_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    token_hash text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: smart_home_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smart_home_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_type text NOT NULL,
    device_id_hash text NOT NULL,
    device_name text NOT NULL,
    room_id text NOT NULL,
    room_name text,
    platform text DEFAULT 'alexa_plus'::text,
    platform_capabilities text[] DEFAULT '{}'::text[],
    connection_status text DEFAULT 'disconnected'::text,
    consent_given boolean DEFAULT false,
    parent_consent boolean DEFAULT false,
    consent_scope jsonb DEFAULT '{}'::jsonb,
    data_retention_preference text DEFAULT 'minimal'::text,
    device_metadata jsonb DEFAULT '{}'::jsonb,
    connected_at timestamp with time zone,
    last_used_at timestamp with time zone,
    token_expires_at timestamp with time zone,
    last_token_refresh timestamp with time zone,
    refresh_attempts integer DEFAULT 0,
    token_status text DEFAULT 'active'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: sonos_devices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonos_devices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    device_id text NOT NULL,
    name text NOT NULL,
    room_id text NOT NULL,
    room_name text,
    household_id text NOT NULL,
    capabilities jsonb DEFAULT '{}'::jsonb,
    location text,
    role text,
    connection_status text DEFAULT 'disconnected'::text,
    consent_given boolean DEFAULT false,
    parent_consent boolean DEFAULT false,
    consent_scope jsonb DEFAULT '{}'::jsonb,
    data_retention_preference text DEFAULT 'minimal'::text,
    device_metadata jsonb DEFAULT '{}'::jsonb,
    connected_at timestamp with time zone,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval)
);


--
-- Name: TABLE sonos_devices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sonos_devices IS 'Stores discovered Sonos speakers with location and role for spatial audio orchestration';


--
-- Name: COLUMN sonos_devices.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sonos_devices.location IS 'Physical location in room: left, right, center, back_left, back_right, front_left, front_right';


--
-- Name: COLUMN sonos_devices.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sonos_devices.role IS 'Speaker role: main (narration), spatial (sound effects), ambiance (background music)';


--
-- Name: sonos_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonos_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    group_id text NOT NULL,
    name text NOT NULL,
    room_id text NOT NULL,
    household_id text NOT NULL,
    speaker_ids text[] NOT NULL,
    group_type text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sonos_groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sonos_groups IS 'Stores Sonos speaker groups for coordinated spatial audio playback';


--
-- Name: COLUMN sonos_groups.group_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sonos_groups.group_type IS 'Group type: main (narration), spatial (sound effects), ambiance (background music)';


--
-- Name: sonos_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sonos_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    household_id text NOT NULL,
    access_token_encrypted text NOT NULL,
    refresh_token_encrypted text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    last_refresh timestamp with time zone,
    refresh_attempts integer DEFAULT 0,
    token_status text DEFAULT 'active'::text,
    encryption_key_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE sonos_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.sonos_tokens IS 'Stores encrypted OAuth tokens for Sonos Control API access';


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    library_id uuid NOT NULL,
    title text NOT NULL,
    content jsonb NOT NULL,
    status text DEFAULT 'draft'::text,
    age_rating integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    finalized_at timestamp with time zone,
    asset_generation_status jsonb DEFAULT '{"assets": {}, "overall": "pending"}'::jsonb,
    asset_generation_started_at timestamp with time zone,
    asset_generation_completed_at timestamp with time zone,
    audio_url text,
    webvtt_url text,
    audio_duration numeric,
    audio_voice_id text,
    cover_art_url text,
    scene_art_urls text[],
    color_palettes jsonb,
    activities jsonb,
    pdf_url text,
    pdf_pages integer,
    pdf_file_size bigint,
    qr_code_url text,
    qr_public_url text,
    qr_scan_count integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    profile_id uuid,
    audio_words jsonb,
    audio_blocks jsonb,
    audio_sfx_url text,
    audio_sfx_cues jsonb,
    spatial_audio_tracks jsonb,
    story_type_id uuid,
    hue_extracted_colors jsonb DEFAULT '{}'::jsonb,
    effectiveness_score numeric(5,2) DEFAULT 0.00,
    consumption_insights jsonb DEFAULT '{}'::jsonb,
    creator_user_id uuid,
    CONSTRAINT stories_effectiveness_score_check CHECK (((effectiveness_score >= (0)::numeric) AND (effectiveness_score <= (100)::numeric))),
    CONSTRAINT stories_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'generating'::text, 'ready'::text, 'failed'::text, 'archived'::text])))
);


--
-- Name: COLUMN stories.asset_generation_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.asset_generation_status IS 'JSONB tracking status of each asset: {overall, assets: {audio: {status, url}, ...}}';


--
-- Name: COLUMN stories.color_palettes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.color_palettes IS 'Extracted color palettes for Hue integration: {cover: [...], scenes: [[...], ...]}';


--
-- Name: COLUMN stories.activities; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.activities IS 'JSON array of 3 activities: 2 fun + 1 user-context specific';


--
-- Name: COLUMN stories.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.metadata IS 'JSONB field for story metadata including IP attributions';


--
-- Name: COLUMN stories.profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.profile_id IS 'Child profile this story belongs to (for multi-child household support). NULL if story belongs to parent library.';


--
-- Name: COLUMN stories.audio_words; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.audio_words IS 'Array of {txt, start, end} word timestamps from ElevenLabs with-timestamps API';


--
-- Name: COLUMN stories.audio_blocks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.audio_blocks IS 'Object {a, b, c, d} with HTML spans for 4 story beats. Each block contains <span data-start="..." data-end="...">word</span> elements.';


--
-- Name: COLUMN stories.audio_sfx_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.audio_sfx_url IS 'URL to SFX bed audio file (Pro users only). Mixed with narration for background sound effects.';


--
-- Name: COLUMN stories.audio_sfx_cues; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.audio_sfx_cues IS 'Array of SFX cues {start, prompt, duration} for Pro users. Used for synchronized playback.';


--
-- Name: COLUMN stories.spatial_audio_tracks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.spatial_audio_tracks IS 'Multi-track audio for Sonos: {background_music_url, sfx_left_url, sfx_right_url, slow_narration_url}. Generated now to avoid costly regeneration later.';


--
-- Name: COLUMN stories.hue_extracted_colors; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.stories.hue_extracted_colors IS 'Extracted HUE colors (15 hex codes): coverHex1-3, sceneAHex1-3, sceneBHex1-3, sceneCHex1-3, sceneDHex1-3. These override story type base colors with story-specific palettes.';


--
-- Name: story_choices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_choices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    story_id uuid,
    choice_point text NOT NULL,
    choice_options text[] NOT NULL,
    selected_choice text NOT NULL,
    response_time integer NOT NULL,
    emotional_context text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_choices_emotional_context_check CHECK ((emotional_context = ANY (ARRAY['happy'::text, 'sad'::text, 'scared'::text, 'angry'::text, 'neutral'::text])))
);


--
-- Name: TABLE story_choices; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_choices IS 'Records story choices for pattern analysis and emotional correlation';


--
-- Name: story_credits_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_credits_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credit_type text NOT NULL,
    amount numeric NOT NULL,
    source_id uuid,
    earned_at timestamp with time zone DEFAULT now(),
    notes text,
    CONSTRAINT story_credits_ledger_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT story_credits_ledger_credit_type_check CHECK ((credit_type = ANY (ARRAY['base'::text, 'profile_complete'::text, 'smart_home_connect'::text, 'referral_accepted'::text])))
);


--
-- Name: story_effectiveness; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_effectiveness (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    story_id uuid NOT NULL,
    effectiveness_score numeric(5,2) DEFAULT 0.00,
    mood_impact jsonb DEFAULT '{}'::jsonb,
    engagement_vs_baseline numeric(5,2),
    completion_vs_baseline numeric(5,2),
    context_tags text[] DEFAULT '{}'::text[],
    comparison_baseline jsonb DEFAULT '{}'::jsonb,
    recommended_for text[] DEFAULT '{}'::text[],
    confidence_score numeric(5,2) DEFAULT 0.00,
    user_id uuid NOT NULL,
    calculated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT story_effectiveness_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT story_effectiveness_effectiveness_score_check CHECK (((effectiveness_score >= (0)::numeric) AND (effectiveness_score <= (100)::numeric)))
);


--
-- Name: story_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    user_id uuid NOT NULL,
    sentiment text NOT NULL,
    rating integer,
    message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT story_feedback_sentiment_check CHECK ((sentiment = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text])))
);


--
-- Name: story_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_interactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    story_id uuid NOT NULL,
    interaction_type text NOT NULL,
    interaction_data jsonb DEFAULT '{}'::jsonb,
    session_id text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_interactions_interaction_type_check CHECK ((interaction_type = ANY (ARRAY['created'::text, 'viewed'::text, 'edited'::text, 'shared'::text, 'completed'::text])))
);


--
-- Name: story_lighting_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_lighting_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_type text NOT NULL,
    profile_name text NOT NULL,
    base_profile jsonb NOT NULL,
    narrative_events jsonb DEFAULT '{}'::jsonb,
    age_appropriate jsonb NOT NULL,
    platform_compatibility text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: story_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pack_type text NOT NULL,
    stories_remaining integer NOT NULL,
    stripe_payment_intent_id text,
    stripe_checkout_session_id text,
    purchased_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_packs_pack_type_check CHECK ((pack_type = ANY (ARRAY['5_pack'::text, '10_pack'::text, '25_pack'::text]))),
    CONSTRAINT story_packs_stories_remaining_check CHECK ((stories_remaining >= 0))
);


--
-- Name: story_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    story_type text NOT NULL,
    theme text NOT NULL,
    tone text NOT NULL,
    reasoning text NOT NULL,
    expected_emotional_impact text NOT NULL,
    confidence numeric NOT NULL,
    adaptations jsonb DEFAULT '[]'::jsonb NOT NULL,
    recommended_at timestamp with time zone DEFAULT now(),
    accepted boolean,
    accepted_at timestamp with time zone,
    feedback text,
    emotional_outcome text,
    CONSTRAINT story_recommendations_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT story_recommendations_tone_check CHECK ((tone = ANY (ARRAY['uplifting'::text, 'calming'::text, 'energetic'::text, 'gentle'::text, 'neutral'::text])))
);


--
-- Name: TABLE story_recommendations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_recommendations IS 'Mood-based story recommendations with tracking';


--
-- Name: story_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    grade_level text NOT NULL,
    subject_area text NOT NULL,
    learning_objectives text[] NOT NULL,
    story_structure jsonb NOT NULL,
    character_guidelines jsonb NOT NULL,
    assessment_questions jsonb NOT NULL,
    vocabulary jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: story_transfer_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_transfer_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    from_library_id uuid NOT NULL,
    to_library_id uuid NOT NULL,
    requested_by uuid NOT NULL,
    status text DEFAULT 'pending'::text,
    transfer_message text,
    response_message text,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    responded_at timestamp with time zone,
    responded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_transfer_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: story_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    from_library_id uuid NOT NULL,
    to_library_id uuid NOT NULL,
    from_user_id uuid NOT NULL,
    to_user_id uuid NOT NULL,
    transfer_type text DEFAULT 'move'::text,
    transfer_message text,
    status text DEFAULT 'pending'::text,
    response_message text,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'rejected'::text, 'expired'::text, 'cancelled'::text]))),
    CONSTRAINT story_transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['move'::text, 'copy'::text])))
);


--
-- Name: TABLE story_transfers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_transfers IS 'Story transfer requests between libraries';


--
-- Name: story_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.story_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type_id text NOT NULL,
    type_name text NOT NULL,
    type_description text,
    hue_base_hex text DEFAULT '#1e90ff'::text,
    hue_base_bri integer DEFAULT 180,
    hue_style text DEFAULT 'pulse'::text,
    hue_jolt_pct numeric DEFAULT 1.15,
    hue_jolt_ms integer DEFAULT 500,
    hue_tt_in integer DEFAULT 36,
    hue_tt_scene integer DEFAULT 90,
    hue_rotate_every_ms integer DEFAULT 4000,
    hue_per_bulb_ms integer DEFAULT 100,
    hue_breathe_pct numeric DEFAULT 0.15,
    hue_breathe_period_ms integer DEFAULT 8000,
    hue_motion text DEFAULT 'balanced'::text,
    hue_pause_style text DEFAULT 'sway'::text,
    hue_tempo_ms integer DEFAULT 3200,
    hue_lead_ms integer DEFAULT 300,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT story_types_hue_base_bri_check CHECK (((hue_base_bri >= 0) AND (hue_base_bri <= 254))),
    CONSTRAINT story_types_hue_jolt_pct_check CHECK (((hue_jolt_pct >= 1.0) AND (hue_jolt_pct <= 2.0))),
    CONSTRAINT story_types_hue_style_check CHECK ((hue_style = ANY (ARRAY['calm'::text, 'pulse'::text, 'bold'::text])))
);


--
-- Name: TABLE story_types; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.story_types IS 'V2 story type configuration with 15 HUE fields per type. Defines base animation style, timing, and default colors for each story category.';


--
-- Name: COLUMN story_types.type_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_types.type_id IS 'V2 Airtable record ID (e.g., recrt7JbFltfYdE6o) - preserved for compatibility';


--
-- Name: COLUMN story_types.hue_base_hex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_types.hue_base_hex IS 'Base color hex code for this story type (e.g., #3db8c8 for Mental Health)';


--
-- Name: COLUMN story_types.hue_base_bri; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_types.hue_base_bri IS 'Base brightness (0-254) for this story type';


--
-- Name: COLUMN story_types.hue_style; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.story_types.hue_style IS 'Animation style: calm (soothing), pulse (engaging), bold (energetic)';


--
-- Name: storytelling_traditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storytelling_traditions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    cultural_origin text[] NOT NULL,
    narrative_structure text NOT NULL,
    common_themes text[] DEFAULT '{}'::text[],
    character_archetypes text[] DEFAULT '{}'::text[],
    moral_framework text NOT NULL,
    adaptation_guidelines text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE storytelling_traditions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.storytelling_traditions IS 'Defines storytelling patterns and traditions from different cultures';


--
-- Name: student_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    learning_objective_id uuid NOT NULL,
    attempts integer DEFAULT 0,
    best_score numeric DEFAULT 0,
    average_score numeric DEFAULT 0,
    total_time_spent integer DEFAULT 0,
    last_attempt_date timestamp with time zone,
    mastery_level text DEFAULT 'not-started'::text,
    trends jsonb DEFAULT '{"stagnant": true, "declining": false, "improving": false}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT student_progress_mastery_level_check CHECK ((mastery_level = ANY (ARRAY['not-started'::text, 'developing'::text, 'proficient'::text, 'advanced'::text])))
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    grade_level text NOT NULL,
    parent_email text,
    special_needs text[] DEFAULT '{}'::text[],
    learning_preferences jsonb DEFAULT '{}'::jsonb,
    enrollment_date timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sub_library_avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_library_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    library_id uuid NOT NULL,
    avatar_type text NOT NULL,
    avatar_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sub_library_avatars_avatar_type_check CHECK ((avatar_type = ANY (ARRAY['animal'::text, 'character'::text, 'symbol'::text, 'color'::text])))
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stripe_subscription_id text,
    plan_id text NOT NULL,
    status text NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'canceled'::text, 'past_due'::text, 'unpaid'::text, 'incomplete'::text, 'incomplete_expired'::text, 'trialing'::text])))
);


--
-- Name: system_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rule_id uuid NOT NULL,
    rule_name text NOT NULL,
    metric text NOT NULL,
    threshold numeric NOT NULL,
    actual_value numeric NOT NULL,
    severity text NOT NULL,
    triggered_at timestamp with time zone NOT NULL,
    resolved_at timestamp with time zone,
    acknowledged_at timestamp with time zone,
    acknowledged_by uuid,
    resolution_notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: system_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    cpu_usage numeric NOT NULL,
    cpu_load_average numeric[] NOT NULL,
    memory_used bigint NOT NULL,
    memory_total bigint NOT NULL,
    memory_percentage numeric NOT NULL,
    events_published integer DEFAULT 0 NOT NULL,
    events_processed integer DEFAULT 0 NOT NULL,
    average_latency numeric DEFAULT 0 NOT NULL,
    error_rate numeric DEFAULT 0 NOT NULL,
    queue_depth integer DEFAULT 0 NOT NULL,
    agent_metrics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    school_id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    subjects text[] NOT NULL,
    grade_levels text[] NOT NULL,
    certifications text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: therapeutic_pathways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.therapeutic_pathways (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pathway_name text NOT NULL,
    target_emotions text[] NOT NULL,
    story_progression jsonb NOT NULL,
    expected_outcomes text[] NOT NULL,
    duration integer NOT NULL,
    adaptation_triggers jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'active'::text,
    CONSTRAINT therapeutic_pathways_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'paused'::text, 'cancelled'::text])))
);


--
-- Name: TABLE therapeutic_pathways; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.therapeutic_pathways IS 'Therapeutic story pathways for structured emotional support';


--
-- Name: universal_platform_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universal_platform_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform_name text NOT NULL,
    version text NOT NULL,
    capabilities text[] DEFAULT '{}'::text[],
    request_format text DEFAULT 'json'::text,
    response_format text DEFAULT 'json'::text,
    authentication_config jsonb NOT NULL,
    endpoints jsonb NOT NULL,
    request_mapping jsonb NOT NULL,
    response_mapping jsonb NOT NULL,
    smart_home_mapping jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT universal_platform_configs_request_format_check CHECK ((request_format = ANY (ARRAY['json'::text, 'xml'::text, 'form_data'::text, 'custom'::text]))),
    CONSTRAINT universal_platform_configs_response_format_check CHECK ((response_format = ANY (ARRAY['json'::text, 'xml'::text, 'custom'::text])))
);


--
-- Name: user_context_separations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_context_separations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    separation_id text NOT NULL,
    session_id text NOT NULL,
    primary_user_id uuid NOT NULL,
    all_user_ids uuid[] NOT NULL,
    user_contexts jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval)
);


--
-- Name: TABLE user_context_separations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_context_separations IS 'Manages multi-user context separation on shared devices';


--
-- Name: user_hue_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_hue_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    connected boolean DEFAULT false,
    access_token text,
    refresh_token text,
    bridge_ip text,
    selection_type text,
    selection_id text,
    selection_name text,
    intensity text DEFAULT 'regular'::text,
    last_sync_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_hue_settings_intensity_check CHECK ((intensity = ANY (ARRAY['off'::text, 'light'::text, 'regular'::text, 'bold'::text]))),
    CONSTRAINT user_hue_settings_selection_type_check CHECK ((selection_type = ANY (ARRAY['room'::text, 'zone'::text])))
);


--
-- Name: TABLE user_hue_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_hue_settings IS 'Philips Hue integration settings per user';


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    voice_settings jsonb DEFAULT '{}'::jsonb,
    accessibility_settings jsonb DEFAULT '{}'::jsonb,
    content_preferences jsonb DEFAULT '{}'::jsonb,
    privacy_settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_tiers (
    user_id uuid NOT NULL,
    tier text NOT NULL,
    tier_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone DEFAULT now() NOT NULL,
    last_engagement_at timestamp with time zone,
    inactivity_warnings_sent integer DEFAULT 0,
    next_warning_at timestamp with time zone,
    hibernation_eligible boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_tiers_tier_check CHECK ((tier = ANY (ARRAY['free_never_paid'::text, 'former_paid'::text, 'current_paid'::text, 'institutional'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    email_confirmed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    alexa_person_id text,
    last_login_at timestamp with time zone,
    is_coppa_protected boolean DEFAULT false,
    parent_consent_verified boolean DEFAULT false,
    role text,
    user_type text,
    first_name text,
    last_name text,
    subscription_tier text,
    first_paid_at timestamp with time zone,
    hibernated_at timestamp with time zone,
    country text,
    locale text,
    is_minor boolean DEFAULT false,
    policy_version text,
    evaluated_at timestamp with time zone,
    minor_threshold integer,
    applicable_framework text,
    lifetime_stories_created integer DEFAULT 0,
    lifetime_characters_created integer DEFAULT 0,
    available_story_credits numeric DEFAULT 2.0,
    profile_completed boolean DEFAULT false,
    smart_home_connected boolean DEFAULT false,
    test_mode_authorized boolean DEFAULT false NOT NULL,
    CONSTRAINT check_user_type CHECK ((user_type = ANY (ARRAY['child'::text, 'parent'::text, 'guardian'::text, 'grandparent'::text, 'aunt_uncle'::text, 'older_sibling'::text, 'foster_caregiver'::text, 'teacher'::text, 'librarian'::text, 'afterschool_leader'::text, 'childcare_provider'::text, 'nanny'::text, 'child_life_specialist'::text, 'therapist'::text, 'medical_professional'::text, 'coach_mentor'::text, 'enthusiast'::text, 'other'::text]))),
    CONSTRAINT users_adults_not_minor CHECK ((is_minor = false)),
    CONSTRAINT users_country_check CHECK ((char_length(country) = 2))
);


--
-- Name: COLUMN users.user_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.user_type IS 'User type classification for proper age validation and COPPA compliance';


--
-- Name: COLUMN users.test_mode_authorized; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.test_mode_authorized IS 'Allows user to bypass quota restrictions when X-Test-Mode header is true. For authorized test users only.';


--
-- Name: vocabulary_adaptations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocabulary_adaptations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_word text NOT NULL,
    simplified_word text NOT NULL,
    context text NOT NULL,
    age_group text NOT NULL,
    vocabulary_level text NOT NULL,
    usage_count integer DEFAULT 0,
    effectiveness numeric DEFAULT 0.5,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vocabulary_adaptations_age_group_check CHECK ((age_group = ANY (ARRAY['3-5'::text, '6-8'::text, '9-11'::text, '12+'::text]))),
    CONSTRAINT vocabulary_adaptations_effectiveness_check CHECK (((effectiveness >= (0)::numeric) AND (effectiveness <= (1)::numeric))),
    CONSTRAINT vocabulary_adaptations_vocabulary_level_check CHECK ((vocabulary_level = ANY (ARRAY['simple'::text, 'standard'::text, 'advanced'::text])))
);


--
-- Name: TABLE vocabulary_adaptations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vocabulary_adaptations IS 'Vocabulary simplification mappings for different age groups and levels';


--
-- Name: vocabulary_usage_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vocabulary_usage_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_word text NOT NULL,
    simplified_word text NOT NULL,
    context text,
    effectiveness numeric,
    "timestamp" timestamp with time zone DEFAULT now(),
    CONSTRAINT vocabulary_usage_log_effectiveness_check CHECK (((effectiveness >= (0)::numeric) AND (effectiveness <= (1)::numeric)))
);


--
-- Name: TABLE vocabulary_usage_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vocabulary_usage_log IS 'Usage tracking for vocabulary adaptations to measure effectiveness';


--
-- Name: voice_analysis_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_analysis_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_id text NOT NULL,
    audio_duration numeric NOT NULL,
    sample_rate integer NOT NULL,
    detected_emotions text[] NOT NULL,
    confidence numeric NOT NULL,
    voice_characteristics jsonb NOT NULL,
    emotional_markers jsonb DEFAULT '[]'::jsonb,
    stress_indicators jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    CONSTRAINT voice_analysis_results_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);


--
-- Name: TABLE voice_analysis_results; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.voice_analysis_results IS 'Stores sophisticated voice pattern analysis results for emotion detection';


--
-- Name: voice_clones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_clones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    voice_id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'processing'::text,
    parent_consent_id uuid NOT NULL,
    revoked_at timestamp with time zone,
    revocation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT voice_clones_status_check CHECK ((status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text])))
);


--
-- Name: voice_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    attempts integer DEFAULT 0,
    used boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: voice_cost_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_cost_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    engine text NOT NULL,
    character_count integer NOT NULL,
    cost_usd numeric(10,6) NOT NULL,
    request_type text NOT NULL,
    session_id text,
    date date DEFAULT CURRENT_DATE,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT voice_cost_tracking_engine_check CHECK ((engine = ANY (ARRAY['elevenlabs'::text, 'polly'::text]))),
    CONSTRAINT voice_cost_tracking_request_type_check CHECK ((request_type = ANY (ARRAY['stream'::text, 'longform'::text])))
);


--
-- Name: voice_pace_adjustments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_pace_adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_text text NOT NULL,
    adjusted_text text NOT NULL,
    pace_multiplier numeric NOT NULL,
    pause_count integer NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE voice_pace_adjustments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.voice_pace_adjustments IS 'Voice pace adjustment records for speech processing differences';


--
-- Name: voice_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    preferred_engine text DEFAULT 'auto'::text,
    voice_id text,
    speed numeric(3,2) DEFAULT 1.0,
    emotion text DEFAULT 'neutral'::text,
    language text DEFAULT 'en-US'::text,
    enable_voice_cloning boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT voice_preferences_preferred_engine_check CHECK ((preferred_engine = ANY (ARRAY['elevenlabs'::text, 'polly'::text, 'auto'::text]))),
    CONSTRAINT voice_preferences_speed_check CHECK (((speed >= 0.5) AND (speed <= 2.0)))
);


--
-- Name: voice_synthesis_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_synthesis_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid,
    engine text NOT NULL,
    request_type text NOT NULL,
    text_length integer NOT NULL,
    language text NOT NULL,
    emotion text,
    voice_id text,
    latency_ms integer NOT NULL,
    success boolean NOT NULL,
    error_code text,
    error_message text,
    cost_usd numeric(10,6),
    audio_duration_seconds numeric(8,3),
    character_count integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT voice_synthesis_metrics_engine_check CHECK ((engine = ANY (ARRAY['elevenlabs'::text, 'polly'::text]))),
    CONSTRAINT voice_synthesis_metrics_request_type_check CHECK ((request_type = ANY (ARRAY['stream'::text, 'longform'::text])))
);


--
-- Name: voice_synthesis_daily_stats; Type: MATERIALIZED VIEW; Schema: public; Owner: -
--

CREATE MATERIALIZED VIEW public.voice_synthesis_daily_stats AS
 SELECT date_trunc('day'::text, created_at) AS date,
    engine,
    count(*) AS total_requests,
    count(*) FILTER (WHERE (success = true)) AS successful_requests,
    round(avg(latency_ms), 2) AS avg_latency_ms,
    COALESCE(sum(cost_usd), (0)::numeric) AS total_cost_usd,
    sum(character_count) AS total_characters
   FROM public.voice_synthesis_metrics
  GROUP BY (date_trunc('day'::text, created_at)), engine
  ORDER BY (date_trunc('day'::text, created_at)) DESC, engine
  WITH NO DATA;


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event_id text NOT NULL,
    event_type text NOT NULL,
    attempt integer DEFAULT 1,
    status text DEFAULT 'pending'::text,
    response_code integer,
    response_body text,
    error_message text,
    delivered_at timestamp with time zone,
    next_retry_at timestamp with time zone,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text, 'retrying'::text])))
);


--
-- Name: webhook_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    platform text NOT NULL,
    config jsonb NOT NULL,
    status text DEFAULT 'active'::text,
    verification_token text,
    last_delivery_timestamp timestamp with time zone,
    last_delivery_status text,
    last_delivery_response_code integer,
    last_delivery_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_registrations_last_delivery_status_check CHECK ((last_delivery_status = ANY (ARRAY['success'::text, 'failed'::text]))),
    CONSTRAINT webhook_registrations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'error'::text])))
);


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[] NOT NULL,
    secret text NOT NULL,
    is_active boolean DEFAULT true,
    retry_policy jsonb DEFAULT '{"maxDelayMs": 30000, "maxRetries": 3, "initialDelayMs": 1000, "backoffMultiplier": 2}'::jsonb,
    timeout_ms integer DEFAULT 10000,
    headers jsonb DEFAULT '{}'::jsonb,
    last_delivery_timestamp timestamp with time zone,
    last_delivery_status text,
    last_delivery_response_code integer,
    last_delivery_error text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhooks_last_delivery_status_check CHECK ((last_delivery_status = ANY (ARRAY['success'::text, 'failed'::text, 'pending'::text])))
);


--
-- Name: webvtt_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webvtt_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    story_id uuid NOT NULL,
    user_id uuid NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    word_count integer DEFAULT 0 NOT NULL,
    sync_accuracy_p50_ms numeric(5,2),
    sync_accuracy_p90_ms numeric(5,2) NOT NULL,
    sync_accuracy_p99_ms numeric(5,2),
    sync_accuracy_average_ms numeric(5,2),
    processing_time_ms integer,
    audio_url text NOT NULL,
    text_content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webvtt_sync_accuracy_p90_check CHECK ((sync_accuracy_p90_ms <= 5.0))
);


--
-- Name: TABLE webvtt_files; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webvtt_files IS 'WebVTT synchronization files for Phase 1 - word-level audio sync with ≤5ms P90 accuracy';


--
-- Name: COLUMN webvtt_files.sync_accuracy_p90_ms; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webvtt_files.sync_accuracy_p90_ms IS 'Phase 1 DoD requirement: P90 sync accuracy must be ≤ 5ms';


--
-- Name: webvtt_generation_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webvtt_generation_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webvtt_file_id uuid NOT NULL,
    generation_time_ms integer NOT NULL,
    validation_time_ms integer,
    phase1_compliant boolean DEFAULT false NOT NULL,
    accuracy_deviation_ms numeric(5,2),
    generated_by text DEFAULT 'Story Intelligence™'::text,
    api_version text DEFAULT '1.0.0'::text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE webvtt_generation_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webvtt_generation_metrics IS 'Performance and quality metrics for WebVTT generation monitoring';


--
-- Name: COLUMN webvtt_generation_metrics.phase1_compliant; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.webvtt_generation_metrics.phase1_compliant IS 'Whether the WebVTT file meets Phase 1 DoD requirements';


--
-- Name: webvtt_word_timestamps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webvtt_word_timestamps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webvtt_file_id uuid NOT NULL,
    word_text text NOT NULL,
    word_index integer NOT NULL,
    start_time_ms integer NOT NULL,
    end_time_ms integer NOT NULL,
    duration_ms integer GENERATED ALWAYS AS ((end_time_ms - start_time_ms)) STORED,
    confidence_score numeric(3,2) DEFAULT 0.95,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webvtt_confidence_check CHECK (((confidence_score >= 0.0) AND (confidence_score <= 1.0))),
    CONSTRAINT webvtt_word_timing_check CHECK ((end_time_ms > start_time_ms))
);


--
-- Name: TABLE webvtt_word_timestamps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webvtt_word_timestamps IS 'Individual word timestamps for karaoke-style highlighting';


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: a2a_tasks a2a_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.a2a_tasks
    ADD CONSTRAINT a2a_tasks_pkey PRIMARY KEY (id);


--
-- Name: a2a_tasks a2a_tasks_task_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.a2a_tasks
    ADD CONSTRAINT a2a_tasks_task_id_key UNIQUE (task_id);


--
-- Name: accessibility_profiles accessibility_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessibility_profiles
    ADD CONSTRAINT accessibility_profiles_pkey PRIMARY KEY (id);


--
-- Name: accessibility_profiles accessibility_profiles_user_id_profile_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessibility_profiles
    ADD CONSTRAINT accessibility_profiles_user_id_profile_name_key UNIQUE (user_id, profile_name);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: affiliate_accounts affiliate_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_accounts
    ADD CONSTRAINT affiliate_accounts_pkey PRIMARY KEY (id);


--
-- Name: affiliate_accounts affiliate_accounts_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_accounts
    ADD CONSTRAINT affiliate_accounts_referral_code_key UNIQUE (referral_code);


--
-- Name: affiliate_accounts affiliate_accounts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_accounts
    ADD CONSTRAINT affiliate_accounts_user_id_key UNIQUE (user_id);


--
-- Name: affiliate_referrals affiliate_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_pkey PRIMARY KEY (id);


--
-- Name: age_verification_audit age_verification_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_verification_audit
    ADD CONSTRAINT age_verification_audit_pkey PRIMARY KEY (id);


--
-- Name: alert_rules alert_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alert_rules
    ADD CONSTRAINT alert_rules_pkey PRIMARY KEY (id);


--
-- Name: alexa_user_mappings alexa_user_mappings_alexa_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alexa_user_mappings
    ADD CONSTRAINT alexa_user_mappings_alexa_person_id_key UNIQUE (alexa_person_id);


--
-- Name: alexa_user_mappings alexa_user_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alexa_user_mappings
    ADD CONSTRAINT alexa_user_mappings_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: asset_generation_jobs asset_generation_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_generation_jobs
    ADD CONSTRAINT asset_generation_jobs_pkey PRIMARY KEY (id);


--
-- Name: assistive_technologies assistive_technologies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistive_technologies
    ADD CONSTRAINT assistive_technologies_pkey PRIMARY KEY (id);


--
-- Name: audio_transcripts audio_transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_transcripts
    ADD CONSTRAINT audio_transcripts_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: auth_rate_limits auth_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_rate_limits
    ADD CONSTRAINT auth_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_session_token_key UNIQUE (session_token);


--
-- Name: billing_events billing_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_pkey PRIMARY KEY (id);


--
-- Name: character_feedback character_feedback_character_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_feedback
    ADD CONSTRAINT character_feedback_character_id_user_id_key UNIQUE (character_id, user_id);


--
-- Name: character_feedback character_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_feedback
    ADD CONSTRAINT character_feedback_pkey PRIMARY KEY (id);


--
-- Name: character_shares character_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_pkey PRIMARY KEY (id);


--
-- Name: characters characters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_pkey PRIMARY KEY (id);


--
-- Name: choice_patterns choice_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_patterns
    ADD CONSTRAINT choice_patterns_pkey PRIMARY KEY (id);


--
-- Name: circuit_breaker_state circuit_breaker_state_agent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_breaker_state
    ADD CONSTRAINT circuit_breaker_state_agent_name_key UNIQUE (agent_name);


--
-- Name: circuit_breaker_state circuit_breaker_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.circuit_breaker_state
    ADD CONSTRAINT circuit_breaker_state_pkey PRIMARY KEY (id);


--
-- Name: classroom_enrollments classroom_enrollments_classroom_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_enrollments
    ADD CONSTRAINT classroom_enrollments_classroom_id_student_id_key UNIQUE (classroom_id, student_id);


--
-- Name: classroom_enrollments classroom_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_enrollments
    ADD CONSTRAINT classroom_enrollments_pkey PRIMARY KEY (id);


--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- Name: communication_adaptations communication_adaptations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_adaptations
    ADD CONSTRAINT communication_adaptations_pkey PRIMARY KEY (id);


--
-- Name: communication_profiles communication_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_profiles
    ADD CONSTRAINT communication_profiles_pkey PRIMARY KEY (id);


--
-- Name: communication_profiles communication_profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_profiles
    ADD CONSTRAINT communication_profiles_user_id_key UNIQUE (user_id);


--
-- Name: consumption_metrics consumption_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_metrics
    ADD CONSTRAINT consumption_metrics_pkey PRIMARY KEY (id);


--
-- Name: consumption_metrics consumption_metrics_story_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_metrics
    ADD CONSTRAINT consumption_metrics_story_id_user_id_key UNIQUE (story_id, user_id);


--
-- Name: content_filtering_logs content_filtering_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_filtering_logs
    ADD CONSTRAINT content_filtering_logs_pkey PRIMARY KEY (id);


--
-- Name: content_safety_logs content_safety_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_safety_logs
    ADD CONSTRAINT content_safety_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_checkpoints conversation_checkpoints_checkpoint_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_checkpoint_id_key UNIQUE (checkpoint_id);


--
-- Name: conversation_checkpoints conversation_checkpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_pkey PRIMARY KEY (id);


--
-- Name: conversation_interruptions conversation_interruptions_interruption_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_interruptions
    ADD CONSTRAINT conversation_interruptions_interruption_id_key UNIQUE (interruption_id);


--
-- Name: conversation_interruptions conversation_interruptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_interruptions
    ADD CONSTRAINT conversation_interruptions_pkey PRIMARY KEY (id);


--
-- Name: conversation_sessions conversation_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sessions
    ADD CONSTRAINT conversation_sessions_pkey PRIMARY KEY (id);


--
-- Name: conversation_sessions conversation_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sessions
    ADD CONSTRAINT conversation_sessions_session_id_key UNIQUE (session_id);


--
-- Name: conversation_states conversation_states_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_states
    ADD CONSTRAINT conversation_states_pkey PRIMARY KEY (id);


--
-- Name: conversation_states conversation_states_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_states
    ADD CONSTRAINT conversation_states_session_id_key UNIQUE (session_id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: crisis_indicators crisis_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_indicators
    ADD CONSTRAINT crisis_indicators_pkey PRIMARY KEY (id);


--
-- Name: crisis_intervention_logs crisis_intervention_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_intervention_logs
    ADD CONSTRAINT crisis_intervention_logs_pkey PRIMARY KEY (id);


--
-- Name: crisis_responses crisis_responses_crisis_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_responses
    ADD CONSTRAINT crisis_responses_crisis_id_key UNIQUE (crisis_id);


--
-- Name: crisis_responses crisis_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_responses
    ADD CONSTRAINT crisis_responses_pkey PRIMARY KEY (id);


--
-- Name: cultural_character_traits cultural_character_traits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_character_traits
    ADD CONSTRAINT cultural_character_traits_pkey PRIMARY KEY (id);


--
-- Name: cultural_character_traits cultural_character_traits_trait_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_character_traits
    ADD CONSTRAINT cultural_character_traits_trait_key UNIQUE (trait);


--
-- Name: cultural_contexts cultural_contexts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_contexts
    ADD CONSTRAINT cultural_contexts_pkey PRIMARY KEY (id);


--
-- Name: cultural_contexts cultural_contexts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_contexts
    ADD CONSTRAINT cultural_contexts_user_id_key UNIQUE (user_id);


--
-- Name: cultural_sensitivity_filters cultural_sensitivity_filters_cultural_context_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_sensitivity_filters
    ADD CONSTRAINT cultural_sensitivity_filters_cultural_context_key UNIQUE (cultural_context);


--
-- Name: cultural_sensitivity_filters cultural_sensitivity_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_sensitivity_filters
    ADD CONSTRAINT cultural_sensitivity_filters_pkey PRIMARY KEY (id);


--
-- Name: curriculum_alignment_results curriculum_alignment_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_alignment_results
    ADD CONSTRAINT curriculum_alignment_results_pkey PRIMARY KEY (id);


--
-- Name: curriculum_frameworks curriculum_frameworks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_frameworks
    ADD CONSTRAINT curriculum_frameworks_pkey PRIMARY KEY (id);


--
-- Name: data_retention_policies data_retention_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_pkey PRIMARY KEY (id);


--
-- Name: data_retention_policies data_retention_policies_table_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.data_retention_policies
    ADD CONSTRAINT data_retention_policies_table_name_key UNIQUE (table_name);


--
-- Name: deletion_audit_log deletion_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_audit_log
    ADD CONSTRAINT deletion_audit_log_pkey PRIMARY KEY (log_id);


--
-- Name: deletion_requests deletion_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT deletion_requests_pkey PRIMARY KEY (request_id);


--
-- Name: device_connection_logs device_connection_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_connection_logs
    ADD CONSTRAINT device_connection_logs_pkey PRIMARY KEY (id);


--
-- Name: device_tokens device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_pkey PRIMARY KEY (id);


--
-- Name: distress_patterns distress_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distress_patterns
    ADD CONSTRAINT distress_patterns_pkey PRIMARY KEY (id);


--
-- Name: early_intervention_signals early_intervention_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_intervention_signals
    ADD CONSTRAINT early_intervention_signals_pkey PRIMARY KEY (id);


--
-- Name: educational_outcomes educational_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_outcomes
    ADD CONSTRAINT educational_outcomes_pkey PRIMARY KEY (id);


--
-- Name: email_delivery_log email_delivery_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_delivery_log
    ADD CONSTRAINT email_delivery_log_pkey PRIMARY KEY (id);


--
-- Name: email_engagement_tracking email_engagement_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_engagement_tracking
    ADD CONSTRAINT email_engagement_tracking_pkey PRIMARY KEY (id);


--
-- Name: email_preferences email_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_preferences
    ADD CONSTRAINT email_preferences_pkey PRIMARY KEY (user_id);


--
-- Name: emotion_engagement_metrics emotion_engagement_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_engagement_metrics
    ADD CONSTRAINT emotion_engagement_metrics_pkey PRIMARY KEY (id);


--
-- Name: emotional_correlations emotional_correlations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_correlations
    ADD CONSTRAINT emotional_correlations_pkey PRIMARY KEY (id);


--
-- Name: emotional_journeys emotional_journeys_journey_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_journeys
    ADD CONSTRAINT emotional_journeys_journey_id_key UNIQUE (journey_id);


--
-- Name: emotional_journeys emotional_journeys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_journeys
    ADD CONSTRAINT emotional_journeys_pkey PRIMARY KEY (id);


--
-- Name: emotional_trends emotional_trends_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trends
    ADD CONSTRAINT emotional_trends_pkey PRIMARY KEY (id);


--
-- Name: emotions emotions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_pkey PRIMARY KEY (id);


--
-- Name: engagement_checks engagement_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_checks
    ADD CONSTRAINT engagement_checks_pkey PRIMARY KEY (id);


--
-- Name: engagement_metrics engagement_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_metrics
    ADD CONSTRAINT engagement_metrics_pkey PRIMARY KEY (id);


--
-- Name: event_correlations event_correlations_correlation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_correlations
    ADD CONSTRAINT event_correlations_correlation_id_key UNIQUE (correlation_id);


--
-- Name: event_correlations event_correlations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_correlations
    ADD CONSTRAINT event_correlations_pkey PRIMARY KEY (id);


--
-- Name: event_metrics event_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_metrics
    ADD CONSTRAINT event_metrics_pkey PRIMARY KEY (id);


--
-- Name: event_replays event_replays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_replays
    ADD CONSTRAINT event_replays_pkey PRIMARY KEY (id);


--
-- Name: event_store event_store_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_event_id_key UNIQUE (event_id);


--
-- Name: event_store event_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_pkey PRIMARY KEY (id);


--
-- Name: event_subscriptions event_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_subscriptions
    ADD CONSTRAINT event_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: event_subscriptions event_subscriptions_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_subscriptions
    ADD CONSTRAINT event_subscriptions_subscription_id_key UNIQUE (subscription_id);


--
-- Name: family_structure_templates family_structure_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_structure_templates
    ADD CONSTRAINT family_structure_templates_pkey PRIMARY KEY (id);


--
-- Name: family_structure_templates family_structure_templates_structure_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.family_structure_templates
    ADD CONSTRAINT family_structure_templates_structure_type_key UNIQUE (structure_type);


--
-- Name: gift_card_redemptions gift_card_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_pkey PRIMARY KEY (id);


--
-- Name: gift_cards gift_cards_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_code_key UNIQUE (code);


--
-- Name: gift_cards gift_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_pkey PRIMARY KEY (id);


--
-- Name: group_storytelling_sessions group_storytelling_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_storytelling_sessions
    ADD CONSTRAINT group_storytelling_sessions_pkey PRIMARY KEY (id);


--
-- Name: healing_metrics healing_metrics_date_agent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healing_metrics
    ADD CONSTRAINT healing_metrics_date_agent_name_key UNIQUE (date, agent_name);


--
-- Name: healing_metrics healing_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.healing_metrics
    ADD CONSTRAINT healing_metrics_pkey PRIMARY KEY (id);


--
-- Name: hibernated_accounts hibernated_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hibernated_accounts
    ADD CONSTRAINT hibernated_accounts_pkey PRIMARY KEY (user_id);


--
-- Name: human_overrides human_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_overrides
    ADD CONSTRAINT human_overrides_pkey PRIMARY KEY (id);


--
-- Name: incident_knowledge incident_knowledge_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_knowledge
    ADD CONSTRAINT incident_knowledge_pkey PRIMARY KEY (id);


--
-- Name: incident_records incident_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_records
    ADD CONSTRAINT incident_records_pkey PRIMARY KEY (id);


--
-- Name: intervention_triggers intervention_triggers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_triggers
    ADD CONSTRAINT intervention_triggers_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invite_code_key UNIQUE (invite_code);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invite_discounts invite_discounts_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_discounts
    ADD CONSTRAINT invite_discounts_code_key UNIQUE (code);


--
-- Name: invite_discounts invite_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_discounts
    ADD CONSTRAINT invite_discounts_pkey PRIMARY KEY (id);


--
-- Name: iot_consent_records iot_consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_consent_records
    ADD CONSTRAINT iot_consent_records_pkey PRIMARY KEY (id);


--
-- Name: ip_detection_audit ip_detection_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_detection_audit
    ADD CONSTRAINT ip_detection_audit_pkey PRIMARY KEY (id);


--
-- Name: ip_disputes ip_disputes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_disputes
    ADD CONSTRAINT ip_disputes_pkey PRIMARY KEY (id);


--
-- Name: knowledge_analytics knowledge_analytics_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_analytics
    ADD CONSTRAINT knowledge_analytics_date_key UNIQUE (date);


--
-- Name: knowledge_analytics knowledge_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_analytics
    ADD CONSTRAINT knowledge_analytics_pkey PRIMARY KEY (id);


--
-- Name: knowledge_content knowledge_content_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_content
    ADD CONSTRAINT knowledge_content_pkey PRIMARY KEY (id);


--
-- Name: knowledge_queries knowledge_queries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_queries
    ADD CONSTRAINT knowledge_queries_pkey PRIMARY KEY (id);


--
-- Name: knowledge_support_escalations knowledge_support_escalations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_support_escalations
    ADD CONSTRAINT knowledge_support_escalations_pkey PRIMARY KEY (id);


--
-- Name: language_profiles language_profiles_code_dialect_variant_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_profiles
    ADD CONSTRAINT language_profiles_code_dialect_variant_key UNIQUE (code, dialect_variant);


--
-- Name: language_profiles language_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_profiles
    ADD CONSTRAINT language_profiles_pkey PRIMARY KEY (id);


--
-- Name: language_simplifications language_simplifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_simplifications
    ADD CONSTRAINT language_simplifications_pkey PRIMARY KEY (id);


--
-- Name: learning_objectives learning_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_objectives
    ADD CONSTRAINT learning_objectives_pkey PRIMARY KEY (id);


--
-- Name: libraries libraries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_pkey PRIMARY KEY (id);


--
-- Name: library_consent library_consent_consent_record_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_consent
    ADD CONSTRAINT library_consent_consent_record_id_key UNIQUE (consent_record_id);


--
-- Name: library_consent library_consent_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_consent
    ADD CONSTRAINT library_consent_pkey PRIMARY KEY (id);


--
-- Name: library_insights library_insights_library_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_insights
    ADD CONSTRAINT library_insights_library_id_key UNIQUE (library_id);


--
-- Name: library_insights library_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_insights
    ADD CONSTRAINT library_insights_pkey PRIMARY KEY (id);


--
-- Name: library_permissions library_permissions_library_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_permissions
    ADD CONSTRAINT library_permissions_library_id_user_id_key UNIQUE (library_id, user_id);


--
-- Name: library_permissions library_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_permissions
    ADD CONSTRAINT library_permissions_pkey PRIMARY KEY (id);


--
-- Name: localization_cache localization_cache_content_hash_source_language_target_lang_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization_cache
    ADD CONSTRAINT localization_cache_content_hash_source_language_target_lang_key UNIQUE (content_hash, source_language, target_language, cultural_context_hash);


--
-- Name: localization_cache localization_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.localization_cache
    ADD CONSTRAINT localization_cache_pkey PRIMARY KEY (id);


--
-- Name: mandatory_reporting_records mandatory_reporting_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mandatory_reporting_records
    ADD CONSTRAINT mandatory_reporting_records_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: multimodal_inputs multimodal_inputs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multimodal_inputs
    ADD CONSTRAINT multimodal_inputs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_tokens oauth_access_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_access_tokens oauth_access_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: oauth_authorization_codes oauth_authorization_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT oauth_authorization_codes_code_key UNIQUE (code);


--
-- Name: oauth_authorization_codes oauth_authorization_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT oauth_authorization_codes_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT oauth_clients_client_id_key UNIQUE (client_id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consent_records oauth_consent_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_consent_records
    ADD CONSTRAINT oauth_consent_records_pkey PRIMARY KEY (id);


--
-- Name: oauth_consent_records oauth_consent_records_user_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_consent_records
    ADD CONSTRAINT oauth_consent_records_user_id_client_id_key UNIQUE (user_id, client_id);


--
-- Name: oauth_events oauth_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_events
    ADD CONSTRAINT oauth_events_pkey PRIMARY KEY (id);


--
-- Name: oauth_id_token_claims oauth_id_token_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_id_token_claims
    ADD CONSTRAINT oauth_id_token_claims_pkey PRIMARY KEY (id);


--
-- Name: oauth_jwks oauth_jwks_kid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_jwks
    ADD CONSTRAINT oauth_jwks_kid_key UNIQUE (kid);


--
-- Name: oauth_jwks oauth_jwks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_jwks
    ADD CONSTRAINT oauth_jwks_pkey PRIMARY KEY (id);


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: organization_accounts organization_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_accounts
    ADD CONSTRAINT organization_accounts_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_org_user_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_org_user_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: parent_notifications parent_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_notifications
    ADD CONSTRAINT parent_notifications_pkey PRIMARY KEY (id);


--
-- Name: parent_teacher_communications parent_teacher_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_teacher_communications
    ADD CONSTRAINT parent_teacher_communications_pkey PRIMARY KEY (id);


--
-- Name: parental_consents parental_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parental_consents
    ADD CONSTRAINT parental_consents_pkey PRIMARY KEY (id);


--
-- Name: participant_contributions participant_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_contributions
    ADD CONSTRAINT participant_contributions_pkey PRIMARY KEY (id);


--
-- Name: pending_transfer_magic_links pending_transfer_magic_links_magic_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transfer_magic_links
    ADD CONSTRAINT pending_transfer_magic_links_magic_token_key UNIQUE (magic_token);


--
-- Name: pending_transfer_magic_links pending_transfer_magic_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transfer_magic_links
    ADD CONSTRAINT pending_transfer_magic_links_pkey PRIMARY KEY (id);


--
-- Name: pipeline_executions pipeline_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_executions
    ADD CONSTRAINT pipeline_executions_pkey PRIMARY KEY (id);


--
-- Name: platform_embedding_configs platform_embedding_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_embedding_configs
    ADD CONSTRAINT platform_embedding_configs_pkey PRIMARY KEY (id);


--
-- Name: platform_integration_events platform_integration_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_integration_events
    ADD CONSTRAINT platform_integration_events_pkey PRIMARY KEY (id);


--
-- Name: push_device_tokens push_device_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_device_tokens
    ADD CONSTRAINT push_device_tokens_pkey PRIMARY KEY (id);


--
-- Name: push_device_tokens push_device_tokens_user_id_device_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_device_tokens
    ADD CONSTRAINT push_device_tokens_user_id_device_token_key UNIQUE (user_id, device_token);


--
-- Name: qr_code_analytics qr_code_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_code_analytics
    ADD CONSTRAINT qr_code_analytics_pkey PRIMARY KEY (id);


--
-- Name: recommendation_outcomes recommendation_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_outcomes
    ADD CONSTRAINT recommendation_outcomes_pkey PRIMARY KEY (id);


--
-- Name: referral_tracking referral_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_tracking
    ADD CONSTRAINT referral_tracking_pkey PRIMARY KEY (id);


--
-- Name: referral_tracking referral_tracking_referrer_id_referee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_tracking
    ADD CONSTRAINT referral_tracking_referrer_id_referee_id_key UNIQUE (referrer_id, referee_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: religious_sensitivity_guidelines religious_sensitivity_guidelines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.religious_sensitivity_guidelines
    ADD CONSTRAINT religious_sensitivity_guidelines_pkey PRIMARY KEY (id);


--
-- Name: religious_sensitivity_guidelines religious_sensitivity_guidelines_religion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.religious_sensitivity_guidelines
    ADD CONSTRAINT religious_sensitivity_guidelines_religion_key UNIQUE (religion);


--
-- Name: research_agent_challenges research_agent_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_agent_challenges
    ADD CONSTRAINT research_agent_challenges_pkey PRIMARY KEY (id);


--
-- Name: research_briefs research_briefs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_briefs
    ADD CONSTRAINT research_briefs_pkey PRIMARY KEY (id);


--
-- Name: research_cache research_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_cache
    ADD CONSTRAINT research_cache_pkey PRIMARY KEY (id);


--
-- Name: research_cache research_cache_tenant_id_cache_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_cache
    ADD CONSTRAINT research_cache_tenant_id_cache_key_key UNIQUE (tenant_id, cache_key);


--
-- Name: research_cost_tracking research_cost_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_cost_tracking
    ADD CONSTRAINT research_cost_tracking_pkey PRIMARY KEY (id);


--
-- Name: research_insights research_insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_insights
    ADD CONSTRAINT research_insights_pkey PRIMARY KEY (id);


--
-- Name: research_pre_launch_memos research_pre_launch_memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_pre_launch_memos
    ADD CONSTRAINT research_pre_launch_memos_pkey PRIMARY KEY (id);


--
-- Name: research_tenants research_tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_tenants
    ADD CONSTRAINT research_tenants_pkey PRIMARY KEY (id);


--
-- Name: research_tenants research_tenants_tenant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_tenants
    ADD CONSTRAINT research_tenants_tenant_id_key UNIQUE (tenant_id);


--
-- Name: research_usage_metrics research_usage_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_usage_metrics
    ADD CONSTRAINT research_usage_metrics_pkey PRIMARY KEY (id);


--
-- Name: response_adaptations response_adaptations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_adaptations
    ADD CONSTRAINT response_adaptations_pkey PRIMARY KEY (id);


--
-- Name: response_latency_data response_latency_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_latency_data
    ADD CONSTRAINT response_latency_data_pkey PRIMARY KEY (id);


--
-- Name: reward_ledger reward_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_ledger
    ADD CONSTRAINT reward_ledger_pkey PRIMARY KEY (id);


--
-- Name: risk_assessments risk_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_pkey PRIMARY KEY (id);


--
-- Name: safety_incidents safety_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_incidents
    ADD CONSTRAINT safety_incidents_pkey PRIMARY KEY (id);


--
-- Name: safety_plans safety_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_plans
    ADD CONSTRAINT safety_plans_pkey PRIMARY KEY (id);


--
-- Name: safety_plans safety_plans_plan_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_plans
    ADD CONSTRAINT safety_plans_plan_id_key UNIQUE (plan_id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: self_healing_config self_healing_config_agent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.self_healing_config
    ADD CONSTRAINT self_healing_config_agent_name_key UNIQUE (agent_name);


--
-- Name: self_healing_config self_healing_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.self_healing_config
    ADD CONSTRAINT self_healing_config_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_pkey PRIMARY KEY (id);


--
-- Name: session_participants session_participants_session_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_student_id_key UNIQUE (session_id, student_id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: smart_home_devices smart_home_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_home_devices
    ADD CONSTRAINT smart_home_devices_pkey PRIMARY KEY (id);


--
-- Name: sonos_devices sonos_devices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_devices
    ADD CONSTRAINT sonos_devices_pkey PRIMARY KEY (id);


--
-- Name: sonos_groups sonos_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_groups
    ADD CONSTRAINT sonos_groups_pkey PRIMARY KEY (id);


--
-- Name: sonos_groups sonos_groups_user_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_groups
    ADD CONSTRAINT sonos_groups_user_id_group_id_key UNIQUE (user_id, group_id);


--
-- Name: sonos_tokens sonos_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_tokens
    ADD CONSTRAINT sonos_tokens_pkey PRIMARY KEY (id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: story_choices story_choices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_choices
    ADD CONSTRAINT story_choices_pkey PRIMARY KEY (id);


--
-- Name: story_credits_ledger story_credits_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_credits_ledger
    ADD CONSTRAINT story_credits_ledger_pkey PRIMARY KEY (id);


--
-- Name: story_effectiveness story_effectiveness_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_effectiveness
    ADD CONSTRAINT story_effectiveness_pkey PRIMARY KEY (id);


--
-- Name: story_effectiveness story_effectiveness_story_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_effectiveness
    ADD CONSTRAINT story_effectiveness_story_id_user_id_key UNIQUE (story_id, user_id);


--
-- Name: story_feedback story_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_feedback
    ADD CONSTRAINT story_feedback_pkey PRIMARY KEY (id);


--
-- Name: story_feedback story_feedback_story_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_feedback
    ADD CONSTRAINT story_feedback_story_id_user_id_key UNIQUE (story_id, user_id);


--
-- Name: story_interactions story_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_interactions
    ADD CONSTRAINT story_interactions_pkey PRIMARY KEY (id);


--
-- Name: story_lighting_profiles story_lighting_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_lighting_profiles
    ADD CONSTRAINT story_lighting_profiles_pkey PRIMARY KEY (id);


--
-- Name: story_lighting_profiles story_lighting_profiles_story_type_profile_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_lighting_profiles
    ADD CONSTRAINT story_lighting_profiles_story_type_profile_name_key UNIQUE (story_type, profile_name);


--
-- Name: story_packs story_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_packs
    ADD CONSTRAINT story_packs_pkey PRIMARY KEY (id);


--
-- Name: story_recommendations story_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_recommendations
    ADD CONSTRAINT story_recommendations_pkey PRIMARY KEY (id);


--
-- Name: story_templates story_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_templates
    ADD CONSTRAINT story_templates_pkey PRIMARY KEY (id);


--
-- Name: story_transfer_requests story_transfer_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_pkey PRIMARY KEY (id);


--
-- Name: story_transfers story_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfers
    ADD CONSTRAINT story_transfers_pkey PRIMARY KEY (id);


--
-- Name: story_types story_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_types
    ADD CONSTRAINT story_types_pkey PRIMARY KEY (id);


--
-- Name: story_types story_types_type_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_types
    ADD CONSTRAINT story_types_type_id_key UNIQUE (type_id);


--
-- Name: story_types story_types_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_types
    ADD CONSTRAINT story_types_type_name_key UNIQUE (type_name);


--
-- Name: storytelling_traditions storytelling_traditions_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storytelling_traditions
    ADD CONSTRAINT storytelling_traditions_name_key UNIQUE (name);


--
-- Name: storytelling_traditions storytelling_traditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storytelling_traditions
    ADD CONSTRAINT storytelling_traditions_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_pkey PRIMARY KEY (id);


--
-- Name: student_progress student_progress_student_id_learning_objective_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_student_id_learning_objective_id_key UNIQUE (student_id, learning_objective_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: sub_library_avatars sub_library_avatars_library_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_library_avatars
    ADD CONSTRAINT sub_library_avatars_library_id_key UNIQUE (library_id);


--
-- Name: sub_library_avatars sub_library_avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_library_avatars
    ADD CONSTRAINT sub_library_avatars_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: system_alerts system_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_pkey PRIMARY KEY (id);


--
-- Name: system_metrics system_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_metrics
    ADD CONSTRAINT system_metrics_pkey PRIMARY KEY (id);


--
-- Name: teachers teachers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_email_key UNIQUE (email);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: therapeutic_pathways therapeutic_pathways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapeutic_pathways
    ADD CONSTRAINT therapeutic_pathways_pkey PRIMARY KEY (id);


--
-- Name: universal_platform_configs universal_platform_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universal_platform_configs
    ADD CONSTRAINT universal_platform_configs_pkey PRIMARY KEY (id);


--
-- Name: universal_platform_configs universal_platform_configs_platform_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universal_platform_configs
    ADD CONSTRAINT universal_platform_configs_platform_name_key UNIQUE (platform_name);


--
-- Name: user_context_separations user_context_separations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_context_separations
    ADD CONSTRAINT user_context_separations_pkey PRIMARY KEY (id);


--
-- Name: user_context_separations user_context_separations_separation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_context_separations
    ADD CONSTRAINT user_context_separations_separation_id_key UNIQUE (separation_id);


--
-- Name: user_hue_settings user_hue_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_hue_settings
    ADD CONSTRAINT user_hue_settings_pkey PRIMARY KEY (id);


--
-- Name: user_hue_settings user_hue_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_hue_settings
    ADD CONSTRAINT user_hue_settings_user_id_key UNIQUE (user_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_tiers user_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tiers
    ADD CONSTRAINT user_tiers_pkey PRIMARY KEY (user_id);


--
-- Name: users users_alexa_person_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_alexa_person_id_key UNIQUE (alexa_person_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vocabulary_adaptations vocabulary_adaptations_original_word_simplified_word_age_gr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulary_adaptations
    ADD CONSTRAINT vocabulary_adaptations_original_word_simplified_word_age_gr_key UNIQUE (original_word, simplified_word, age_group, vocabulary_level);


--
-- Name: vocabulary_adaptations vocabulary_adaptations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulary_adaptations
    ADD CONSTRAINT vocabulary_adaptations_pkey PRIMARY KEY (id);


--
-- Name: vocabulary_usage_log vocabulary_usage_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulary_usage_log
    ADD CONSTRAINT vocabulary_usage_log_pkey PRIMARY KEY (id);


--
-- Name: voice_analysis_results voice_analysis_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_analysis_results
    ADD CONSTRAINT voice_analysis_results_pkey PRIMARY KEY (id);


--
-- Name: voice_clones voice_clones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_clones
    ADD CONSTRAINT voice_clones_pkey PRIMARY KEY (id);


--
-- Name: voice_clones voice_clones_voice_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_clones
    ADD CONSTRAINT voice_clones_voice_id_key UNIQUE (voice_id);


--
-- Name: voice_codes voice_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_codes
    ADD CONSTRAINT voice_codes_pkey PRIMARY KEY (id);


--
-- Name: voice_cost_tracking voice_cost_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_cost_tracking
    ADD CONSTRAINT voice_cost_tracking_pkey PRIMARY KEY (id);


--
-- Name: voice_pace_adjustments voice_pace_adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_pace_adjustments
    ADD CONSTRAINT voice_pace_adjustments_pkey PRIMARY KEY (id);


--
-- Name: voice_preferences voice_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_preferences
    ADD CONSTRAINT voice_preferences_pkey PRIMARY KEY (id);


--
-- Name: voice_preferences voice_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_preferences
    ADD CONSTRAINT voice_preferences_user_id_key UNIQUE (user_id);


--
-- Name: voice_synthesis_metrics voice_synthesis_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_synthesis_metrics
    ADD CONSTRAINT voice_synthesis_metrics_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhook_registrations webhook_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_registrations
    ADD CONSTRAINT webhook_registrations_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: webvtt_files webvtt_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_files
    ADD CONSTRAINT webvtt_files_pkey PRIMARY KEY (id);


--
-- Name: webvtt_files webvtt_files_story_user_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_files
    ADD CONSTRAINT webvtt_files_story_user_unique UNIQUE (story_id, user_id);


--
-- Name: webvtt_generation_metrics webvtt_generation_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_generation_metrics
    ADD CONSTRAINT webvtt_generation_metrics_pkey PRIMARY KEY (id);


--
-- Name: webvtt_word_timestamps webvtt_word_timestamps_file_index_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_word_timestamps
    ADD CONSTRAINT webvtt_word_timestamps_file_index_unique UNIQUE (webvtt_file_id, word_index);


--
-- Name: webvtt_word_timestamps webvtt_word_timestamps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_word_timestamps
    ADD CONSTRAINT webvtt_word_timestamps_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: idx_a2a_tasks_client_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_a2a_tasks_client_agent ON public.a2a_tasks USING btree (client_agent_id);


--
-- Name: idx_a2a_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_a2a_tasks_created_at ON public.a2a_tasks USING btree (created_at DESC);


--
-- Name: idx_a2a_tasks_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_a2a_tasks_session ON public.a2a_tasks USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_a2a_tasks_state; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_a2a_tasks_state ON public.a2a_tasks USING btree (state);


--
-- Name: idx_a2a_tasks_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_a2a_tasks_task_id ON public.a2a_tasks USING btree (task_id);


--
-- Name: idx_accessibility_profiles_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accessibility_profiles_active ON public.accessibility_profiles USING btree (user_id, is_active);


--
-- Name: idx_accessibility_profiles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accessibility_profiles_user_id ON public.accessibility_profiles USING btree (user_id);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_org_id ON public.activity_logs USING btree (organization_id);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_age_verification_audit_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_verification_audit_country ON public.age_verification_audit USING btree (country);


--
-- Name: idx_age_verification_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_verification_audit_created_at ON public.age_verification_audit USING btree (created_at);


--
-- Name: idx_age_verification_audit_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_verification_audit_expires_at ON public.age_verification_audit USING btree (expires_at);


--
-- Name: idx_age_verification_audit_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_age_verification_audit_user_id ON public.age_verification_audit USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_alert_rules_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_rules_enabled ON public.alert_rules USING btree (enabled);


--
-- Name: idx_alert_rules_metric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alert_rules_metric ON public.alert_rules USING btree (metric);


--
-- Name: idx_alexa_user_mappings_alexa_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_alexa_user_mappings_alexa_person_id ON public.alexa_user_mappings USING btree (alexa_person_id);


--
-- Name: idx_api_keys_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_is_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_asset_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_jobs_status ON public.asset_generation_jobs USING btree (status, created_at);


--
-- Name: idx_asset_jobs_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_jobs_story ON public.asset_generation_jobs USING btree (story_id, status);


--
-- Name: idx_asset_jobs_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_jobs_type ON public.asset_generation_jobs USING btree (asset_type, status);


--
-- Name: idx_assistive_technologies_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assistive_technologies_user_id ON public.assistive_technologies USING btree (user_id);


--
-- Name: idx_audio_transcripts_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_transcripts_expires_at ON public.audio_transcripts USING btree (expires_at);


--
-- Name: idx_audio_transcripts_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_transcripts_session_id ON public.audio_transcripts USING btree (session_id);


--
-- Name: idx_audio_transcripts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audio_transcripts_user_id ON public.audio_transcripts USING btree (user_id);


--
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- Name: idx_auth_rate_limits_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_rate_limits_expires_at ON public.auth_rate_limits USING btree (expires_at);


--
-- Name: idx_auth_rate_limits_identifier_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_rate_limits_identifier_action ON public.auth_rate_limits USING btree (identifier, action);


--
-- Name: idx_auth_sessions_alexa_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_alexa_person_id ON public.auth_sessions USING btree (alexa_person_id) WHERE (alexa_person_id IS NOT NULL);


--
-- Name: idx_auth_sessions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_expires_at ON public.auth_sessions USING btree (expires_at);


--
-- Name: idx_auth_sessions_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_platform ON public.auth_sessions USING btree (platform);


--
-- Name: idx_auth_sessions_session_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_session_token ON public.auth_sessions USING btree (session_token);


--
-- Name: idx_auth_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_sessions_user_id ON public.auth_sessions USING btree (user_id);


--
-- Name: idx_billing_events_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_events_subscription ON public.billing_events USING btree (subscription_id);


--
-- Name: idx_billing_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_events_user ON public.billing_events USING btree (user_id);


--
-- Name: idx_character_feedback_character; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_feedback_character ON public.character_feedback USING btree (character_id);


--
-- Name: idx_character_feedback_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_feedback_created ON public.character_feedback USING btree (created_at);


--
-- Name: idx_character_feedback_sentiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_feedback_sentiment ON public.character_feedback USING btree (sentiment);


--
-- Name: idx_character_feedback_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_feedback_user ON public.character_feedback USING btree (user_id);


--
-- Name: idx_character_shares_character_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_shares_character_id ON public.character_shares USING btree (character_id);


--
-- Name: idx_character_shares_source_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_shares_source_library ON public.character_shares USING btree (source_library_id);


--
-- Name: idx_character_shares_target_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_character_shares_target_library ON public.character_shares USING btree (target_library_id);


--
-- Name: idx_characters_is_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_is_primary ON public.characters USING btree (is_primary) WHERE (is_primary = true);


--
-- Name: idx_characters_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_library_id ON public.characters USING btree (library_id);


--
-- Name: idx_characters_reference_images; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_reference_images ON public.characters USING gin (reference_images);


--
-- Name: idx_characters_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_characters_story_id ON public.characters USING btree (story_id);


--
-- Name: idx_choice_patterns_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_choice_patterns_created_at ON public.choice_patterns USING btree (created_at);


--
-- Name: idx_choice_patterns_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_choice_patterns_type ON public.choice_patterns USING btree (pattern_type);


--
-- Name: idx_choice_patterns_unique_user_type_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_choice_patterns_unique_user_type_start ON public.choice_patterns USING btree (user_id, pattern_type, ((time_range ->> 'start'::text)));


--
-- Name: idx_choice_patterns_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_choice_patterns_user ON public.choice_patterns USING btree (user_id);


--
-- Name: idx_circuit_breaker_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_circuit_breaker_agent ON public.circuit_breaker_state USING btree (agent_name);


--
-- Name: idx_classroom_enrollments_classroom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_enrollments_classroom ON public.classroom_enrollments USING btree (classroom_id);


--
-- Name: idx_classroom_enrollments_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_classroom_enrollments_student ON public.classroom_enrollments USING btree (student_id);


--
-- Name: idx_communication_adaptations_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_adaptations_timestamp ON public.communication_adaptations USING btree ("timestamp");


--
-- Name: idx_communication_adaptations_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_communication_adaptations_user_session ON public.communication_adaptations USING btree (user_id, session_id);


--
-- Name: idx_consumption_metrics_engagement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_metrics_engagement ON public.consumption_metrics USING btree (engagement_score) WHERE (engagement_score > (70)::numeric);


--
-- Name: idx_consumption_metrics_last_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_metrics_last_read ON public.consumption_metrics USING btree (last_read_at);


--
-- Name: idx_consumption_metrics_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_metrics_story ON public.consumption_metrics USING btree (story_id);


--
-- Name: idx_consumption_metrics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumption_metrics_user ON public.consumption_metrics USING btree (user_id);


--
-- Name: idx_content_safety_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_safety_pattern ON public.content_safety_logs USING btree (user_id, pattern_concern) WHERE (pattern_concern = true);


--
-- Name: idx_content_safety_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_safety_timestamp ON public.content_safety_logs USING btree ("timestamp");


--
-- Name: idx_content_safety_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_safety_user_id ON public.content_safety_logs USING btree (user_id);


--
-- Name: idx_conversation_checkpoints_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_checkpoints_created_at ON public.conversation_checkpoints USING btree (created_at);


--
-- Name: idx_conversation_checkpoints_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_checkpoints_expires_at ON public.conversation_checkpoints USING btree (expires_at);


--
-- Name: idx_conversation_checkpoints_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_checkpoints_session_id ON public.conversation_checkpoints USING btree (session_id);


--
-- Name: idx_conversation_checkpoints_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_checkpoints_user_id ON public.conversation_checkpoints USING btree (user_id);


--
-- Name: idx_conversation_interruptions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_interruptions_created_at ON public.conversation_interruptions USING btree (created_at);


--
-- Name: idx_conversation_interruptions_recovered; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_interruptions_recovered ON public.conversation_interruptions USING btree (is_recovered);


--
-- Name: idx_conversation_interruptions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_interruptions_session_id ON public.conversation_interruptions USING btree (session_id);


--
-- Name: idx_conversation_interruptions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_interruptions_type ON public.conversation_interruptions USING btree (interruption_type);


--
-- Name: idx_conversation_interruptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_interruptions_user_id ON public.conversation_interruptions USING btree (user_id);


--
-- Name: idx_conversation_sessions_parent_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sessions_parent_session ON public.conversation_sessions USING btree (parent_session_id);


--
-- Name: idx_conversation_sessions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sessions_session_id ON public.conversation_sessions USING btree (session_id);


--
-- Name: idx_conversation_sessions_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sessions_updated_at ON public.conversation_sessions USING btree (updated_at);


--
-- Name: idx_conversation_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_sessions_user_id ON public.conversation_sessions USING btree (user_id);


--
-- Name: idx_conversation_states_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_states_expires_at ON public.conversation_states USING btree (expires_at);


--
-- Name: idx_conversation_states_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_states_session_id ON public.conversation_states USING btree (session_id);


--
-- Name: idx_conversations_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_session ON public.conversations USING btree (session_id);


--
-- Name: idx_conversations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_status ON public.conversations USING btree (status, created_at DESC);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.conversations USING btree (user_id, status);


--
-- Name: idx_credits_ledger_earned_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credits_ledger_earned_at ON public.story_credits_ledger USING btree (earned_at);


--
-- Name: idx_credits_ledger_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credits_ledger_type ON public.story_credits_ledger USING btree (credit_type);


--
-- Name: idx_credits_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credits_ledger_user ON public.story_credits_ledger USING btree (user_id);


--
-- Name: idx_crisis_indicators_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_indicators_detected_at ON public.crisis_indicators USING btree (detected_at);


--
-- Name: idx_crisis_indicators_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_indicators_session ON public.crisis_indicators USING btree (session_id);


--
-- Name: idx_crisis_indicators_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_indicators_severity ON public.crisis_indicators USING btree (severity);


--
-- Name: idx_crisis_indicators_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_indicators_type ON public.crisis_indicators USING btree (indicator_type);


--
-- Name: idx_crisis_indicators_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_indicators_user ON public.crisis_indicators USING btree (user_id);


--
-- Name: idx_crisis_logs_escalation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_logs_escalation ON public.crisis_intervention_logs USING btree (escalation_level);


--
-- Name: idx_crisis_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_logs_timestamp ON public.crisis_intervention_logs USING btree ("timestamp");


--
-- Name: idx_crisis_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_logs_user_id ON public.crisis_intervention_logs USING btree (user_id);


--
-- Name: idx_crisis_responses_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_responses_detected_at ON public.crisis_responses USING btree (detected_at);


--
-- Name: idx_crisis_responses_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_responses_risk_level ON public.crisis_responses USING btree (risk_level);


--
-- Name: idx_crisis_responses_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_responses_unresolved ON public.crisis_responses USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_crisis_responses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crisis_responses_user ON public.crisis_responses USING btree (user_id);


--
-- Name: idx_cultural_contexts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cultural_contexts_user_id ON public.cultural_contexts USING btree (user_id);


--
-- Name: idx_cultural_sensitivity_filters_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cultural_sensitivity_filters_context ON public.cultural_sensitivity_filters USING btree (cultural_context);


--
-- Name: idx_deletion_requests_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deletion_requests_scheduled_at ON public.deletion_requests USING btree (scheduled_deletion_at);


--
-- Name: idx_deletion_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deletion_requests_status ON public.deletion_requests USING btree (status);


--
-- Name: idx_deletion_requests_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deletion_requests_user_id ON public.deletion_requests USING btree (user_id);


--
-- Name: idx_device_connection_logs_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_connection_logs_expires_at ON public.device_connection_logs USING btree (expires_at);


--
-- Name: idx_device_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_expires_at ON public.device_tokens USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_device_tokens_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_status ON public.device_tokens USING btree (status);


--
-- Name: idx_device_tokens_user_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_device_tokens_user_device ON public.device_tokens USING btree (user_id, device_id);


--
-- Name: idx_distress_patterns_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distress_patterns_level ON public.distress_patterns USING btree (distress_level);


--
-- Name: idx_distress_patterns_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distress_patterns_timestamp ON public.distress_patterns USING btree ("timestamp");


--
-- Name: idx_distress_patterns_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distress_patterns_user_id ON public.distress_patterns USING btree (user_id);


--
-- Name: idx_early_intervention_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_intervention_detected_at ON public.early_intervention_signals USING btree (detected_at);


--
-- Name: idx_early_intervention_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_intervention_severity ON public.early_intervention_signals USING btree (severity);


--
-- Name: idx_early_intervention_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_intervention_type ON public.early_intervention_signals USING btree (signal_type);


--
-- Name: idx_early_intervention_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_intervention_unresolved ON public.early_intervention_signals USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_early_intervention_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_early_intervention_user ON public.early_intervention_signals USING btree (user_id);


--
-- Name: idx_educational_outcomes_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_educational_outcomes_objective ON public.educational_outcomes USING btree (learning_objective_id);


--
-- Name: idx_educational_outcomes_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_educational_outcomes_student ON public.educational_outcomes USING btree (student_id);


--
-- Name: idx_email_delivery_log_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_delivery_log_sent_at ON public.email_delivery_log USING btree (sent_at);


--
-- Name: idx_email_delivery_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_delivery_log_status ON public.email_delivery_log USING btree (status);


--
-- Name: idx_email_delivery_log_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_delivery_log_type ON public.email_delivery_log USING btree (email_type);


--
-- Name: idx_email_delivery_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_delivery_log_user ON public.email_delivery_log USING btree (user_id);


--
-- Name: idx_email_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_tracking_user_id ON public.email_engagement_tracking USING btree (user_id);


--
-- Name: idx_emotion_engagement_metrics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_engagement_metrics_created_at ON public.emotion_engagement_metrics USING btree (created_at);


--
-- Name: idx_emotion_engagement_metrics_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_engagement_metrics_level ON public.emotion_engagement_metrics USING btree (engagement_level);


--
-- Name: idx_emotion_engagement_metrics_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_engagement_metrics_session ON public.emotion_engagement_metrics USING btree (session_id);


--
-- Name: idx_emotion_engagement_metrics_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotion_engagement_metrics_user ON public.emotion_engagement_metrics USING btree (user_id);


--
-- Name: idx_emotional_correlations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_correlations_created_at ON public.emotional_correlations USING btree (created_at);


--
-- Name: idx_emotional_correlations_mood; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_correlations_mood ON public.emotional_correlations USING btree (mood);


--
-- Name: idx_emotional_correlations_unique_user_mood_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_correlations_unique_user_mood_start ON public.emotional_correlations USING btree (user_id, mood, ((time_range ->> 'start'::text)));


--
-- Name: idx_emotional_correlations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_correlations_user ON public.emotional_correlations USING btree (user_id);


--
-- Name: idx_emotional_journeys_pathway; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_journeys_pathway ON public.emotional_journeys USING btree (pathway_id);


--
-- Name: idx_emotional_journeys_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_journeys_start_date ON public.emotional_journeys USING btree (start_date);


--
-- Name: idx_emotional_journeys_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_journeys_status ON public.emotional_journeys USING btree (status);


--
-- Name: idx_emotional_journeys_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_journeys_user ON public.emotional_journeys USING btree (user_id);


--
-- Name: idx_emotional_trends_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_trends_created_at ON public.emotional_trends USING btree (created_at);


--
-- Name: idx_emotional_trends_trend; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_trends_trend ON public.emotional_trends USING btree (overall_trend);


--
-- Name: idx_emotional_trends_unique_user_start_end; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_trends_unique_user_start_end ON public.emotional_trends USING btree (user_id, ((time_range ->> 'start'::text)), ((time_range ->> 'end'::text)));


--
-- Name: idx_emotional_trends_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotional_trends_user ON public.emotional_trends USING btree (user_id);


--
-- Name: idx_emotions_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_expires_at ON public.emotions USING btree (expires_at);


--
-- Name: idx_emotions_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_library_id ON public.emotions USING btree (library_id);


--
-- Name: idx_emotions_mood_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_mood_confidence ON public.emotions USING btree (mood, confidence);


--
-- Name: idx_emotions_sub_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_sub_library_id ON public.emotions USING btree (sub_library_id) WHERE (sub_library_id IS NOT NULL);


--
-- Name: idx_emotions_user_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_user_created_at ON public.emotions USING btree (user_id, created_at);


--
-- Name: idx_emotions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_emotions_user_id ON public.emotions USING btree (user_id);


--
-- Name: idx_engagement_checks_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_checks_timestamp ON public.engagement_checks USING btree ("timestamp");


--
-- Name: idx_engagement_checks_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_checks_user_session ON public.engagement_checks USING btree (user_id, session_id);


--
-- Name: idx_engagement_metrics_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_engagement_metrics_user_session ON public.engagement_metrics USING btree (user_id, session_id);


--
-- Name: idx_event_correlations_correlation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_correlations_correlation_id ON public.event_correlations USING btree (correlation_id);


--
-- Name: idx_event_correlations_parent_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_correlations_parent_event_id ON public.event_correlations USING btree (parent_event_id) WHERE (parent_event_id IS NOT NULL);


--
-- Name: idx_event_correlations_root_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_correlations_root_event_id ON public.event_correlations USING btree (root_event_id);


--
-- Name: idx_event_metrics_correlation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_metrics_correlation_id ON public.event_metrics USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_event_metrics_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_metrics_event_type ON public.event_metrics USING btree (event_type);


--
-- Name: idx_event_metrics_processed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_metrics_processed_at ON public.event_metrics USING btree (processed_at);


--
-- Name: idx_event_metrics_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_metrics_source ON public.event_metrics USING btree (source);


--
-- Name: idx_event_metrics_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_metrics_success ON public.event_metrics USING btree (success);


--
-- Name: idx_event_replays_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_replays_created_at ON public.event_replays USING btree (created_at);


--
-- Name: idx_event_replays_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_replays_status ON public.event_replays USING btree (status);


--
-- Name: idx_event_store_agent_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_agent_name ON public.event_store USING btree (agent_name) WHERE (agent_name IS NOT NULL);


--
-- Name: idx_event_store_correlation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_correlation_id ON public.event_store USING btree (correlation_id) WHERE (correlation_id IS NOT NULL);


--
-- Name: idx_event_store_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_id ON public.event_store USING btree (event_id);


--
-- Name: idx_event_store_event_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_time ON public.event_store USING btree (event_time);


--
-- Name: idx_event_store_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_event_type ON public.event_store USING btree (event_type);


--
-- Name: idx_event_store_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_session_id ON public.event_store USING btree (session_id) WHERE (session_id IS NOT NULL);


--
-- Name: idx_event_store_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_source ON public.event_store USING btree (source);


--
-- Name: idx_event_store_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_store_user_id ON public.event_store USING btree (user_id) WHERE (user_id IS NOT NULL);


--
-- Name: idx_event_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_subscriptions_status ON public.event_subscriptions USING btree (status);


--
-- Name: idx_event_subscriptions_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_subscriptions_subscription_id ON public.event_subscriptions USING btree (subscription_id);


--
-- Name: idx_family_structure_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_family_structure_type ON public.family_structure_templates USING btree (structure_type);


--
-- Name: idx_gift_cards_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_code ON public.gift_cards USING btree (code);


--
-- Name: idx_gift_cards_purchased_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_purchased_by ON public.gift_cards USING btree (purchased_by);


--
-- Name: idx_gift_cards_redeemed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_redeemed_by ON public.gift_cards USING btree (redeemed_by);


--
-- Name: idx_gift_cards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gift_cards_status ON public.gift_cards USING btree (status) WHERE (status = 'active'::text);


--
-- Name: idx_healing_metrics_date_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_healing_metrics_date_agent ON public.healing_metrics USING btree (date DESC, agent_name);


--
-- Name: idx_human_overrides_occurred; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_human_overrides_occurred ON public.human_overrides USING btree (occurred_at);


--
-- Name: idx_human_overrides_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_human_overrides_type ON public.human_overrides USING btree (pipeline_type, override_type);


--
-- Name: idx_human_overrides_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_human_overrides_user ON public.human_overrides USING btree (user_id);


--
-- Name: idx_incident_knowledge_success_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_knowledge_success_rate ON public.incident_knowledge USING btree (success_rate DESC);


--
-- Name: idx_incident_knowledge_type_signature; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_knowledge_type_signature ON public.incident_knowledge USING btree (incident_type, error_signature);


--
-- Name: idx_incident_records_agent_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_records_agent_name ON public.incident_records USING btree (agent_name);


--
-- Name: idx_incident_records_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_records_detected_at ON public.incident_records USING btree (detected_at DESC);


--
-- Name: idx_incident_records_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_incident_records_user_session ON public.incident_records USING btree (user_id, session_id);


--
-- Name: idx_intervention_triggers_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_triggers_detected_at ON public.intervention_triggers USING btree (detected_at);


--
-- Name: idx_intervention_triggers_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_triggers_severity ON public.intervention_triggers USING btree (severity);


--
-- Name: idx_intervention_triggers_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_triggers_type ON public.intervention_triggers USING btree (trigger_type);


--
-- Name: idx_intervention_triggers_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_triggers_unresolved ON public.intervention_triggers USING btree (resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_intervention_triggers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intervention_triggers_user ON public.intervention_triggers USING btree (user_id);


--
-- Name: idx_invitations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_code ON public.invitations USING btree (invite_code);


--
-- Name: idx_invitations_from_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_from_user ON public.invitations USING btree (from_user_id, status);


--
-- Name: idx_invitations_to_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_to_email ON public.invitations USING btree (to_email, status);


--
-- Name: idx_invite_discounts_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_discounts_code ON public.invite_discounts USING btree (code);


--
-- Name: idx_invite_discounts_used_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_discounts_used_by ON public.invite_discounts USING btree (used_by);


--
-- Name: idx_iot_consent_records_user_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iot_consent_records_user_device ON public.iot_consent_records USING btree (user_id, device_id);


--
-- Name: idx_ip_audit_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_audit_method ON public.ip_detection_audit USING btree (detection_method);


--
-- Name: idx_ip_audit_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_audit_story_id ON public.ip_detection_audit USING btree (story_id);


--
-- Name: idx_ip_audit_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_audit_timestamp ON public.ip_detection_audit USING btree (detection_timestamp);


--
-- Name: idx_ip_audit_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_audit_user_id ON public.ip_detection_audit USING btree (user_id);


--
-- Name: idx_ip_disputes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_disputes_created_at ON public.ip_disputes USING btree (created_at);


--
-- Name: idx_ip_disputes_legal_escalated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_disputes_legal_escalated ON public.ip_disputes USING btree (legal_escalated);


--
-- Name: idx_ip_disputes_reported_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_disputes_reported_by ON public.ip_disputes USING btree (reported_by);


--
-- Name: idx_ip_disputes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_disputes_status ON public.ip_disputes USING btree (status);


--
-- Name: idx_ip_disputes_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_disputes_story_id ON public.ip_disputes USING btree (story_id);


--
-- Name: idx_knowledge_analytics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_analytics_date ON public.knowledge_analytics USING btree (date);


--
-- Name: idx_knowledge_content_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_content_active ON public.knowledge_content USING btree (is_active);


--
-- Name: idx_knowledge_content_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_content_category ON public.knowledge_content USING btree (category);


--
-- Name: idx_knowledge_content_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_content_tags ON public.knowledge_content USING gin (tags);


--
-- Name: idx_knowledge_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_content_type ON public.knowledge_content USING btree (content_type);


--
-- Name: idx_knowledge_escalations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_escalations_created_at ON public.knowledge_support_escalations USING btree (created_at);


--
-- Name: idx_knowledge_escalations_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_escalations_priority ON public.knowledge_support_escalations USING btree (priority);


--
-- Name: idx_knowledge_escalations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_escalations_status ON public.knowledge_support_escalations USING btree (status);


--
-- Name: idx_knowledge_queries_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_queries_category ON public.knowledge_queries USING btree (category);


--
-- Name: idx_knowledge_queries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_queries_created_at ON public.knowledge_queries USING btree (created_at);


--
-- Name: idx_knowledge_queries_escalated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_queries_escalated ON public.knowledge_queries USING btree (escalated_to_support);


--
-- Name: idx_knowledge_queries_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_queries_session_id ON public.knowledge_queries USING btree (session_id);


--
-- Name: idx_knowledge_queries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_queries_user_id ON public.knowledge_queries USING btree (user_id);


--
-- Name: idx_language_profiles_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_language_profiles_code ON public.language_profiles USING btree (code);


--
-- Name: idx_learning_objectives_framework; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_objectives_framework ON public.learning_objectives USING btree (framework_id);


--
-- Name: idx_learning_objectives_grade_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_learning_objectives_grade_subject ON public.learning_objectives USING btree (grade_level, subject_area);


--
-- Name: idx_libraries_age_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_age_range ON public.libraries USING btree (age_range) WHERE (age_range IS NOT NULL);


--
-- Name: idx_libraries_consent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_consent_status ON public.libraries USING btree (consent_status) WHERE (consent_status IS NOT NULL);


--
-- Name: idx_libraries_is_minor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_is_minor ON public.libraries USING btree (is_minor) WHERE (is_minor IS NOT NULL);


--
-- Name: idx_libraries_is_storytailor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_is_storytailor_id ON public.libraries USING btree (is_storytailor_id) WHERE (is_storytailor_id = true);


--
-- Name: idx_libraries_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_owner ON public.libraries USING btree (owner);


--
-- Name: idx_libraries_parent_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_libraries_parent_library ON public.libraries USING btree (parent_library) WHERE (parent_library IS NOT NULL);


--
-- Name: idx_libraries_primary_character; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_libraries_primary_character ON public.libraries USING btree (primary_character_id) WHERE (primary_character_id IS NOT NULL);


--
-- Name: idx_library_consent_adult_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_adult_user_id ON public.library_consent USING btree (adult_user_id);


--
-- Name: idx_library_consent_consent_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_consent_record_id ON public.library_consent USING btree (consent_record_id);


--
-- Name: idx_library_consent_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_expires_at ON public.library_consent USING btree (expires_at);


--
-- Name: idx_library_consent_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_library_id ON public.library_consent USING btree (library_id);


--
-- Name: idx_library_consent_requested_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_requested_at ON public.library_consent USING btree (requested_at);


--
-- Name: idx_library_consent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_status ON public.library_consent USING btree (consent_status);


--
-- Name: idx_library_consent_verification_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_consent_verification_token ON public.library_consent USING btree (verification_token);


--
-- Name: idx_library_insights_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_insights_library_id ON public.library_insights USING btree (library_id);


--
-- Name: idx_library_insights_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_insights_updated_at ON public.library_insights USING btree (updated_at);


--
-- Name: idx_library_permissions_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_permissions_library_id ON public.library_permissions USING btree (library_id);


--
-- Name: idx_library_permissions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_library_permissions_user_id ON public.library_permissions USING btree (user_id);


--
-- Name: idx_localization_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_localization_cache_expires ON public.localization_cache USING btree (expires_at);


--
-- Name: idx_localization_cache_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_localization_cache_hash ON public.localization_cache USING btree (content_hash, source_language, target_language);


--
-- Name: idx_magic_links_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_links_email ON public.pending_transfer_magic_links USING btree (recipient_email);


--
-- Name: idx_magic_links_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_links_token ON public.pending_transfer_magic_links USING btree (magic_token) WHERE (used_at IS NULL);


--
-- Name: idx_magic_links_transfer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_links_transfer ON public.pending_transfer_magic_links USING btree (transfer_id);


--
-- Name: idx_mandatory_reports_reported_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mandatory_reports_reported_at ON public.mandatory_reporting_records USING btree (reported_at);


--
-- Name: idx_mandatory_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mandatory_reports_status ON public.mandatory_reporting_records USING btree (status);


--
-- Name: idx_mandatory_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mandatory_reports_user_id ON public.mandatory_reporting_records USING btree (user_id);


--
-- Name: idx_media_assets_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_assets_story_id ON public.media_assets USING btree (story_id);


--
-- Name: idx_multimodal_inputs_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_multimodal_inputs_user_session ON public.multimodal_inputs USING btree (user_id, session_id);


--
-- Name: idx_notifications_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_expires ON public.notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (user_id, type);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, read, created_at DESC);


--
-- Name: idx_oauth_access_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_access_tokens_expires_at ON public.oauth_access_tokens USING btree (expires_at);


--
-- Name: idx_oauth_access_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_access_tokens_token_hash ON public.oauth_access_tokens USING btree (token_hash);


--
-- Name: idx_oauth_authorization_codes_client_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_authorization_codes_client_user ON public.oauth_authorization_codes USING btree (client_id, user_id);


--
-- Name: idx_oauth_authorization_codes_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_authorization_codes_expires_at ON public.oauth_authorization_codes USING btree (expires_at);


--
-- Name: idx_oauth_consent_records_user_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_consent_records_user_client ON public.oauth_consent_records USING btree (user_id, client_id);


--
-- Name: idx_oauth_events_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_events_client_id ON public.oauth_events USING btree (client_id);


--
-- Name: idx_oauth_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_events_created_at ON public.oauth_events USING btree (created_at DESC);


--
-- Name: idx_oauth_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_events_user_id ON public.oauth_events USING btree (user_id);


--
-- Name: idx_oauth_refresh_tokens_client_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_refresh_tokens_client_user ON public.oauth_refresh_tokens USING btree (client_id, user_id);


--
-- Name: idx_oauth_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oauth_refresh_tokens_expires_at ON public.oauth_refresh_tokens USING btree (expires_at);


--
-- Name: idx_organization_accounts_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_accounts_owner ON public.organization_accounts USING btree (owner_id);


--
-- Name: idx_organization_members_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_org ON public.organization_members USING btree (organization_id);


--
-- Name: idx_organization_members_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_organization_id ON public.organization_members USING btree (organization_id);


--
-- Name: idx_organization_members_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_user ON public.organization_members USING btree (user_id);


--
-- Name: idx_organization_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_user_id ON public.organization_members USING btree (user_id);


--
-- Name: idx_organizations_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_owner_id ON public.organizations USING btree (owner_id);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_parent_communications_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_communications_student ON public.parent_teacher_communications USING btree (student_id);


--
-- Name: idx_parent_communications_teacher; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_communications_teacher ON public.parent_teacher_communications USING btree (teacher_id);


--
-- Name: idx_parent_notifications_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_notifications_severity ON public.parent_notifications USING btree (severity);


--
-- Name: idx_parent_notifications_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_notifications_timestamp ON public.parent_notifications USING btree ("timestamp");


--
-- Name: idx_parent_notifications_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parent_notifications_user_id ON public.parent_notifications USING btree (user_id);


--
-- Name: idx_parental_consents_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parental_consents_expires_at ON public.parental_consents USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_parental_consents_parent_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parental_consents_parent_email ON public.parental_consents USING btree (parent_email);


--
-- Name: idx_parental_consents_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parental_consents_type_status ON public.parental_consents USING btree (consent_type, status);


--
-- Name: idx_parental_consents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parental_consents_user_id ON public.parental_consents USING btree (user_id);


--
-- Name: idx_pipeline_executions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_executions_created ON public.pipeline_executions USING btree (created_at);


--
-- Name: idx_pipeline_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_executions_status ON public.pipeline_executions USING btree (status);


--
-- Name: idx_pipeline_executions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_executions_type ON public.pipeline_executions USING btree (pipeline_type);


--
-- Name: idx_pipeline_executions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_executions_user ON public.pipeline_executions USING btree (user_id);


--
-- Name: idx_pipeline_executions_vetoed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pipeline_executions_vetoed ON public.pipeline_executions USING btree (vetoed) WHERE (vetoed = true);


--
-- Name: idx_platform_embedding_configs_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_embedding_configs_platform ON public.platform_embedding_configs USING btree (platform);


--
-- Name: idx_platform_embedding_configs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_embedding_configs_status ON public.platform_embedding_configs USING btree (status);


--
-- Name: idx_platform_integration_events_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_integration_events_event_type ON public.platform_integration_events USING btree (event_type);


--
-- Name: idx_platform_integration_events_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_integration_events_platform ON public.platform_integration_events USING btree (platform);


--
-- Name: idx_platform_integration_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_integration_events_user_id ON public.platform_integration_events USING btree (user_id);


--
-- Name: idx_push_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_tokens_user ON public.push_device_tokens USING btree (user_id, enabled);


--
-- Name: idx_qr_analytics_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_qr_analytics_story ON public.qr_code_analytics USING btree (story_id, scanned_at DESC);


--
-- Name: idx_recommendation_outcomes_declined; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_outcomes_declined ON public.recommendation_outcomes USING btree (outcome) WHERE (outcome = 'DECLINED'::text);


--
-- Name: idx_recommendation_outcomes_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_outcomes_pending ON public.recommendation_outcomes USING btree (outcome) WHERE (outcome = 'PENDING'::text);


--
-- Name: idx_recommendation_outcomes_type_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_outcomes_type_context ON public.recommendation_outcomes USING btree (recommendation_type, (((context ->> 'childAge'::text))::integer));


--
-- Name: idx_recommendation_outcomes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recommendation_outcomes_user ON public.recommendation_outcomes USING btree (user_id);


--
-- Name: idx_redemptions_gift_card; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_gift_card ON public.gift_card_redemptions USING btree (gift_card_id);


--
-- Name: idx_redemptions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_redemptions_user ON public.gift_card_redemptions USING btree (user_id);


--
-- Name: idx_referral_tracking_referee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_tracking_referee ON public.referral_tracking USING btree (referee_id);


--
-- Name: idx_referral_tracking_referrer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referral_tracking_referrer ON public.referral_tracking USING btree (referrer_id);


--
-- Name: idx_referrals_affiliate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_referrals_affiliate ON public.affiliate_referrals USING btree (affiliate_id, status);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_revoked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_revoked ON public.refresh_tokens USING btree (revoked) WHERE (revoked = false);


--
-- Name: idx_refresh_tokens_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_religious_guidelines_religion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_religious_guidelines_religion ON public.religious_sensitivity_guidelines USING btree (religion);


--
-- Name: idx_research_briefs_delivered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_briefs_delivered_at ON public.research_briefs USING btree (delivered_at) WHERE (delivered_at IS NOT NULL);


--
-- Name: idx_research_briefs_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_briefs_tenant_id ON public.research_briefs USING btree (tenant_id);


--
-- Name: idx_research_briefs_week_of; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_briefs_week_of ON public.research_briefs USING btree (week_of DESC);


--
-- Name: idx_research_cache_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_cache_expires_at ON public.research_cache USING btree (expires_at);


--
-- Name: idx_research_cache_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_cache_tenant_id ON public.research_cache USING btree (tenant_id);


--
-- Name: idx_research_challenges_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_challenges_created_at ON public.research_agent_challenges USING btree (created_at DESC);


--
-- Name: idx_research_challenges_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_challenges_tenant_id ON public.research_agent_challenges USING btree (tenant_id);


--
-- Name: idx_research_cost_tracking_period_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_cost_tracking_period_start ON public.research_cost_tracking USING btree (period_start DESC);


--
-- Name: idx_research_cost_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_cost_tracking_status ON public.research_cost_tracking USING btree (status);


--
-- Name: idx_research_cost_tracking_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_cost_tracking_tenant_id ON public.research_cost_tracking USING btree (tenant_id);


--
-- Name: idx_research_insights_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_insights_created_at ON public.research_insights USING btree (created_at DESC);


--
-- Name: idx_research_insights_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_insights_severity ON public.research_insights USING btree (severity);


--
-- Name: idx_research_insights_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_insights_tenant_id ON public.research_insights USING btree (tenant_id);


--
-- Name: idx_research_insights_track_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_insights_track_type ON public.research_insights USING btree (track_type);


--
-- Name: idx_research_memos_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_memos_created_at ON public.research_pre_launch_memos USING btree (created_at DESC);


--
-- Name: idx_research_memos_feature_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_memos_feature_name ON public.research_pre_launch_memos USING btree (feature_name);


--
-- Name: idx_research_memos_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_memos_tenant_id ON public.research_pre_launch_memos USING btree (tenant_id);


--
-- Name: idx_research_usage_metrics_tenant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_usage_metrics_tenant_id ON public.research_usage_metrics USING btree (tenant_id);


--
-- Name: idx_research_usage_metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_research_usage_metrics_timestamp ON public.research_usage_metrics USING btree ("timestamp" DESC);


--
-- Name: idx_response_adaptations_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_adaptations_profile ON public.response_adaptations USING btree (target_profile);


--
-- Name: idx_response_latency_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_latency_created_at ON public.response_latency_data USING btree (created_at);


--
-- Name: idx_response_latency_question_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_latency_question_type ON public.response_latency_data USING btree (question_type);


--
-- Name: idx_response_latency_response_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_latency_response_time ON public.response_latency_data USING btree (response_time);


--
-- Name: idx_response_latency_user_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_response_latency_user_session ON public.response_latency_data USING btree (user_id, session_id);


--
-- Name: idx_reward_ledger_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_ledger_expires ON public.reward_ledger USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (status = 'pending'::text));


--
-- Name: idx_reward_ledger_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_ledger_status ON public.reward_ledger USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_reward_ledger_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reward_ledger_user ON public.reward_ledger USING btree (user_id);


--
-- Name: idx_risk_assessments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_date ON public.risk_assessments USING btree (assessment_date);


--
-- Name: idx_risk_assessments_next_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_next_due ON public.risk_assessments USING btree (next_assessment_due);


--
-- Name: idx_risk_assessments_risk_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_risk_level ON public.risk_assessments USING btree (overall_risk_level);


--
-- Name: idx_risk_assessments_urgency; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_urgency ON public.risk_assessments USING btree (intervention_urgency);


--
-- Name: idx_risk_assessments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_risk_assessments_user ON public.risk_assessments USING btree (user_id);


--
-- Name: idx_safety_incidents_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_incidents_severity ON public.safety_incidents USING btree (severity);


--
-- Name: idx_safety_incidents_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_incidents_timestamp ON public.safety_incidents USING btree ("timestamp");


--
-- Name: idx_safety_incidents_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_incidents_type ON public.safety_incidents USING btree (incident_type);


--
-- Name: idx_safety_incidents_unresolved; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_incidents_unresolved ON public.safety_incidents USING btree (user_id, resolved_at) WHERE (resolved_at IS NULL);


--
-- Name: idx_safety_incidents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_incidents_user_id ON public.safety_incidents USING btree (user_id);


--
-- Name: idx_safety_plans_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_plans_created_at ON public.safety_plans USING btree (created_at);


--
-- Name: idx_safety_plans_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_plans_status ON public.safety_plans USING btree (status);


--
-- Name: idx_safety_plans_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_safety_plans_user ON public.safety_plans USING btree (user_id);


--
-- Name: idx_session_participants_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_participants_session ON public.session_participants USING btree (session_id);


--
-- Name: idx_session_participants_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_participants_student ON public.session_participants USING btree (student_id);


--
-- Name: idx_sessions_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token_hash ON public.sessions USING btree (token_hash);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_smart_home_devices_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_home_devices_expires_at ON public.smart_home_devices USING btree (expires_at);


--
-- Name: idx_smart_home_devices_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_home_devices_platform ON public.smart_home_devices USING btree (platform);


--
-- Name: idx_smart_home_devices_token_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_home_devices_token_status ON public.smart_home_devices USING btree (token_status);


--
-- Name: idx_smart_home_devices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_home_devices_user_id ON public.smart_home_devices USING btree (user_id);


--
-- Name: idx_sonos_devices_connection_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_devices_connection_status ON public.sonos_devices USING btree (connection_status);


--
-- Name: idx_sonos_devices_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_devices_household_id ON public.sonos_devices USING btree (household_id);


--
-- Name: idx_sonos_devices_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_devices_room_id ON public.sonos_devices USING btree (room_id);


--
-- Name: idx_sonos_devices_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_devices_user_id ON public.sonos_devices USING btree (user_id);


--
-- Name: idx_sonos_groups_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_groups_household_id ON public.sonos_groups USING btree (household_id);


--
-- Name: idx_sonos_groups_room_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_groups_room_id ON public.sonos_groups USING btree (room_id);


--
-- Name: idx_sonos_groups_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_groups_type ON public.sonos_groups USING btree (group_type);


--
-- Name: idx_sonos_groups_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_groups_user_id ON public.sonos_groups USING btree (user_id);


--
-- Name: idx_sonos_tokens_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_tokens_expires_at ON public.sonos_tokens USING btree (expires_at);


--
-- Name: idx_sonos_tokens_household_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_tokens_household_id ON public.sonos_tokens USING btree (household_id);


--
-- Name: idx_sonos_tokens_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_tokens_status ON public.sonos_tokens USING btree (token_status);


--
-- Name: idx_sonos_tokens_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sonos_tokens_user_id ON public.sonos_tokens USING btree (user_id);


--
-- Name: idx_stories_asset_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_asset_status ON public.stories USING gin (asset_generation_status);


--
-- Name: idx_stories_audio_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_audio_data ON public.stories USING btree (id) WHERE (audio_words IS NOT NULL);


--
-- Name: idx_stories_audio_jsonb; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_audio_jsonb ON public.stories USING gin (audio_words, audio_blocks, audio_sfx_cues, spatial_audio_tracks);


--
-- Name: idx_stories_hue_colors; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_hue_colors ON public.stories USING gin (hue_extracted_colors);


--
-- Name: idx_stories_library_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_library_created ON public.stories USING btree (library_id, created_at DESC);


--
-- Name: idx_stories_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_library_id ON public.stories USING btree (library_id);


--
-- Name: idx_stories_lifecycle_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_lifecycle_status ON public.stories USING btree (status);


--
-- Name: idx_stories_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_profile_id ON public.stories USING btree (profile_id);


--
-- Name: idx_stories_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_status ON public.stories USING btree (status);


--
-- Name: idx_stories_story_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_story_type_id ON public.stories USING btree (story_type_id);


--
-- Name: idx_story_choices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_choices_created_at ON public.story_choices USING btree (created_at);


--
-- Name: idx_story_choices_emotional_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_choices_emotional_context ON public.story_choices USING btree (emotional_context);


--
-- Name: idx_story_choices_response_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_choices_response_time ON public.story_choices USING btree (response_time);


--
-- Name: idx_story_choices_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_choices_session ON public.story_choices USING btree (session_id);


--
-- Name: idx_story_choices_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_choices_user ON public.story_choices USING btree (user_id);


--
-- Name: idx_story_effectiveness_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_effectiveness_context ON public.story_effectiveness USING gin (context_tags);


--
-- Name: idx_story_effectiveness_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_effectiveness_score ON public.story_effectiveness USING btree (effectiveness_score) WHERE (effectiveness_score > (70)::numeric);


--
-- Name: idx_story_effectiveness_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_effectiveness_story ON public.story_effectiveness USING btree (story_id);


--
-- Name: idx_story_effectiveness_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_effectiveness_user ON public.story_effectiveness USING btree (user_id);


--
-- Name: idx_story_feedback_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_feedback_created ON public.story_feedback USING btree (created_at);


--
-- Name: idx_story_feedback_sentiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_feedback_sentiment ON public.story_feedback USING btree (sentiment);


--
-- Name: idx_story_feedback_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_feedback_story ON public.story_feedback USING btree (story_id);


--
-- Name: idx_story_feedback_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_feedback_user ON public.story_feedback USING btree (user_id);


--
-- Name: idx_story_interactions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_interactions_session_id ON public.story_interactions USING btree (session_id);


--
-- Name: idx_story_interactions_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_interactions_story_id ON public.story_interactions USING btree (story_id);


--
-- Name: idx_story_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_interactions_user_id ON public.story_interactions USING btree (user_id);


--
-- Name: idx_story_lighting_profiles_story_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_lighting_profiles_story_type ON public.story_lighting_profiles USING btree (story_type);


--
-- Name: idx_story_packs_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_packs_expires ON public.story_packs USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_story_packs_remaining; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_packs_remaining ON public.story_packs USING btree (user_id, stories_remaining) WHERE (stories_remaining > 0);


--
-- Name: idx_story_packs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_packs_user ON public.story_packs USING btree (user_id);


--
-- Name: idx_story_recommendations_accepted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_recommendations_accepted ON public.story_recommendations USING btree (accepted) WHERE (accepted IS NOT NULL);


--
-- Name: idx_story_recommendations_recommended_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_recommendations_recommended_at ON public.story_recommendations USING btree (recommended_at);


--
-- Name: idx_story_recommendations_tone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_recommendations_tone ON public.story_recommendations USING btree (tone);


--
-- Name: idx_story_recommendations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_recommendations_type ON public.story_recommendations USING btree (story_type);


--
-- Name: idx_story_recommendations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_recommendations_user ON public.story_recommendations USING btree (user_id);


--
-- Name: idx_story_templates_grade_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_templates_grade_subject ON public.story_templates USING btree (grade_level, subject_area);


--
-- Name: idx_story_transfer_requests_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_transfer_requests_expires_at ON public.story_transfer_requests USING btree (expires_at);


--
-- Name: idx_story_transfer_requests_from_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_transfer_requests_from_library ON public.story_transfer_requests USING btree (from_library_id);


--
-- Name: idx_story_transfer_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_transfer_requests_status ON public.story_transfer_requests USING btree (status);


--
-- Name: idx_story_transfer_requests_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_transfer_requests_story_id ON public.story_transfer_requests USING btree (story_id);


--
-- Name: idx_story_transfer_requests_to_library; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_transfer_requests_to_library ON public.story_transfer_requests USING btree (to_library_id);


--
-- Name: idx_story_types_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_story_types_name ON public.story_types USING btree (type_name);


--
-- Name: idx_storytelling_traditions_cultural_origin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_storytelling_traditions_cultural_origin ON public.storytelling_traditions USING gin (cultural_origin);


--
-- Name: idx_student_progress_objective; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_progress_objective ON public.student_progress USING btree (learning_objective_id);


--
-- Name: idx_student_progress_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_progress_student ON public.student_progress USING btree (student_id);


--
-- Name: idx_sub_library_avatars_library_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_library_avatars_library_id ON public.sub_library_avatars USING btree (library_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_stripe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions USING btree (stripe_subscription_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_system_alerts_resolved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_resolved_at ON public.system_alerts USING btree (resolved_at);


--
-- Name: idx_system_alerts_rule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_rule_id ON public.system_alerts USING btree (rule_id);


--
-- Name: idx_system_alerts_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_severity ON public.system_alerts USING btree (severity);


--
-- Name: idx_system_alerts_triggered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_alerts_triggered_at ON public.system_alerts USING btree (triggered_at);


--
-- Name: idx_system_metrics_cpu_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_metrics_cpu_usage ON public.system_metrics USING btree (cpu_usage);


--
-- Name: idx_system_metrics_error_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_metrics_error_rate ON public.system_metrics USING btree (error_rate);


--
-- Name: idx_system_metrics_memory_percentage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_metrics_memory_percentage ON public.system_metrics USING btree (memory_percentage);


--
-- Name: idx_system_metrics_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_metrics_timestamp ON public.system_metrics USING btree ("timestamp");


--
-- Name: idx_therapeutic_pathways_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapeutic_pathways_created_at ON public.therapeutic_pathways USING btree (created_at);


--
-- Name: idx_therapeutic_pathways_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapeutic_pathways_status ON public.therapeutic_pathways USING btree (status);


--
-- Name: idx_therapeutic_pathways_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_therapeutic_pathways_user ON public.therapeutic_pathways USING btree (user_id);


--
-- Name: idx_transfers_from_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_from_user ON public.story_transfers USING btree (from_user_id, status);


--
-- Name: idx_transfers_story; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_story ON public.story_transfers USING btree (story_id);


--
-- Name: idx_transfers_to_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transfers_to_user ON public.story_transfers USING btree (to_user_id, status);


--
-- Name: idx_universal_platform_configs_platform_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_universal_platform_configs_platform_name ON public.universal_platform_configs USING btree (platform_name);


--
-- Name: idx_user_context_separations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_context_separations_created_at ON public.user_context_separations USING btree (created_at);


--
-- Name: idx_user_context_separations_primary_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_context_separations_primary_user ON public.user_context_separations USING btree (primary_user_id);


--
-- Name: idx_user_context_separations_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_context_separations_session_id ON public.user_context_separations USING btree (session_id);


--
-- Name: idx_user_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_preferences_user_id ON public.user_preferences USING btree (user_id);


--
-- Name: idx_users_alexa_person_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_alexa_person_id ON public.users USING btree (alexa_person_id) WHERE (alexa_person_id IS NOT NULL);


--
-- Name: idx_users_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_country ON public.users USING btree (country) WHERE (country IS NOT NULL);


--
-- Name: idx_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_id ON public.users USING btree (id);


--
-- Name: idx_users_is_coppa_protected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_coppa_protected ON public.users USING btree (is_coppa_protected) WHERE (is_coppa_protected = true);


--
-- Name: idx_users_is_minor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_minor ON public.users USING btree (is_minor);


--
-- Name: idx_users_test_mode_authorized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_test_mode_authorized ON public.users USING btree (test_mode_authorized) WHERE (test_mode_authorized = true);


--
-- Name: idx_users_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_user_type ON public.users USING btree (user_type);


--
-- Name: idx_vocabulary_adaptations_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vocabulary_adaptations_lookup ON public.vocabulary_adaptations USING btree (original_word, age_group, vocabulary_level);


--
-- Name: idx_vocabulary_usage_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vocabulary_usage_user_id ON public.vocabulary_usage_log USING btree (user_id);


--
-- Name: idx_voice_analysis_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_analysis_created_at ON public.voice_analysis_results USING btree (created_at);


--
-- Name: idx_voice_analysis_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_analysis_expires_at ON public.voice_analysis_results USING btree (expires_at);


--
-- Name: idx_voice_analysis_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_analysis_session ON public.voice_analysis_results USING btree (session_id);


--
-- Name: idx_voice_analysis_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_analysis_user ON public.voice_analysis_results USING btree (user_id);


--
-- Name: idx_voice_clones_revoked_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_clones_revoked_at ON public.voice_clones USING btree (revoked_at) WHERE (revoked_at IS NULL);


--
-- Name: idx_voice_clones_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_clones_status ON public.voice_clones USING btree (status);


--
-- Name: idx_voice_clones_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_clones_user_id ON public.voice_clones USING btree (user_id);


--
-- Name: idx_voice_clones_voice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_clones_voice_id ON public.voice_clones USING btree (voice_id);


--
-- Name: idx_voice_codes_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_codes_email ON public.voice_codes USING btree (email);


--
-- Name: idx_voice_codes_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_codes_expires_at ON public.voice_codes USING btree (expires_at);


--
-- Name: idx_voice_cost_tracking_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_cost_tracking_date ON public.voice_cost_tracking USING btree (date);


--
-- Name: idx_voice_cost_tracking_engine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_cost_tracking_engine ON public.voice_cost_tracking USING btree (engine);


--
-- Name: idx_voice_cost_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_cost_tracking_user_id ON public.voice_cost_tracking USING btree (user_id);


--
-- Name: idx_voice_preferences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_preferences_user_id ON public.voice_preferences USING btree (user_id);


--
-- Name: idx_voice_synthesis_daily_stats_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_daily_stats_date ON public.voice_synthesis_daily_stats USING btree (date);


--
-- Name: idx_voice_synthesis_metrics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_metrics_created_at ON public.voice_synthesis_metrics USING btree (created_at);


--
-- Name: idx_voice_synthesis_metrics_engine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_metrics_engine ON public.voice_synthesis_metrics USING btree (engine);


--
-- Name: idx_voice_synthesis_metrics_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_metrics_session_id ON public.voice_synthesis_metrics USING btree (session_id);


--
-- Name: idx_voice_synthesis_metrics_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_metrics_success ON public.voice_synthesis_metrics USING btree (success);


--
-- Name: idx_voice_synthesis_metrics_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_synthesis_metrics_user_id ON public.voice_synthesis_metrics USING btree (user_id);


--
-- Name: idx_webhook_deliveries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_created_at ON public.webhook_deliveries USING btree (created_at);


--
-- Name: idx_webhook_deliveries_next_retry_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_next_retry_at ON public.webhook_deliveries USING btree (next_retry_at) WHERE (next_retry_at IS NOT NULL);


--
-- Name: idx_webhook_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (status);


--
-- Name: idx_webhook_deliveries_webhook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_webhook_id ON public.webhook_deliveries USING btree (webhook_id);


--
-- Name: idx_webhook_registrations_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_registrations_platform ON public.webhook_registrations USING btree (platform);


--
-- Name: idx_webhook_registrations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_registrations_status ON public.webhook_registrations USING btree (status);


--
-- Name: idx_webhooks_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhooks_is_active ON public.webhooks USING btree (is_active);


--
-- Name: idx_webhooks_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhooks_user_id ON public.webhooks USING btree (user_id);


--
-- Name: idx_webvtt_files_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_files_created_at ON public.webvtt_files USING btree (created_at);


--
-- Name: idx_webvtt_files_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_files_story_id ON public.webvtt_files USING btree (story_id);


--
-- Name: idx_webvtt_files_sync_accuracy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_files_sync_accuracy ON public.webvtt_files USING btree (sync_accuracy_p90_ms);


--
-- Name: idx_webvtt_files_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_files_user_id ON public.webvtt_files USING btree (user_id);


--
-- Name: idx_webvtt_metrics_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_metrics_file_id ON public.webvtt_generation_metrics USING btree (webvtt_file_id);


--
-- Name: idx_webvtt_metrics_phase1_compliant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_metrics_phase1_compliant ON public.webvtt_generation_metrics USING btree (phase1_compliant);


--
-- Name: idx_webvtt_word_timestamps_file_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_word_timestamps_file_id ON public.webvtt_word_timestamps USING btree (webvtt_file_id);


--
-- Name: idx_webvtt_word_timestamps_timing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webvtt_word_timestamps_timing ON public.webvtt_word_timestamps USING btree (start_time_ms, end_time_ms);


--
-- Name: users trigger_auto_create_email_preferences; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER trigger_auto_create_email_preferences AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.auto_create_email_preferences();


--
-- Name: accessibility_profiles accessibility_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER accessibility_profiles_updated_at BEFORE UPDATE ON public.accessibility_profiles FOR EACH ROW EXECUTE FUNCTION public.update_accessibility_profile_timestamp();


--
-- Name: libraries auto_create_library_owner_permission; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_create_library_owner_permission AFTER INSERT ON public.libraries FOR EACH ROW EXECUTE FUNCTION public.create_library_owner_permission();


--
-- Name: conversation_sessions conversation_sessions_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER conversation_sessions_updated_at_trigger BEFORE UPDATE ON public.conversation_sessions FOR EACH ROW EXECUTE FUNCTION public.update_conversation_sessions_updated_at();


--
-- Name: conversations conversation_state_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER conversation_state_transition BEFORE UPDATE OF status ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_state_transition();


--
-- Name: stories story_complete_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER story_complete_notification AFTER UPDATE OF asset_generation_status ON public.stories FOR EACH ROW EXECUTE FUNCTION public.notify_story_complete();


--
-- Name: stories story_state_transition; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER story_state_transition BEFORE UPDATE OF status ON public.stories FOR EACH ROW EXECUTE FUNCTION public.enforce_story_state_transition();


--
-- Name: stories trigger_increment_story_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_increment_story_count AFTER INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.increment_story_count();


--
-- Name: a2a_tasks trigger_update_a2a_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_a2a_tasks_updated_at BEFORE UPDATE ON public.a2a_tasks FOR EACH ROW EXECUTE FUNCTION public.update_a2a_tasks_updated_at();


--
-- Name: library_consent trigger_update_library_consent_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_library_consent_updated_at BEFORE UPDATE ON public.library_consent FOR EACH ROW EXECUTE FUNCTION public.update_library_consent_updated_at();


--
-- Name: stories trigger_validate_coppa_story_creation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_coppa_story_creation BEFORE INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.validate_coppa_before_story_creation();


--
-- Name: api_keys update_api_keys_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at_trigger BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_api_keys_updated_at();


--
-- Name: classrooms update_classrooms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: communication_profiles update_communication_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_communication_profiles_updated_at BEFORE UPDATE ON public.communication_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: consumption_metrics update_consumption_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_consumption_metrics_updated_at BEFORE UPDATE ON public.consumption_metrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: curriculum_frameworks update_curriculum_frameworks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_curriculum_frameworks_updated_at BEFORE UPDATE ON public.curriculum_frameworks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_delivery_log update_email_delivery_log_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_delivery_log_updated_at BEFORE UPDATE ON public.email_delivery_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: email_preferences update_email_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON public.email_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_storytelling_sessions update_group_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_sessions_updated_at BEFORE UPDATE ON public.group_storytelling_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: incident_records update_incident_knowledge_success_rate_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_incident_knowledge_success_rate_trigger AFTER UPDATE ON public.incident_records FOR EACH ROW EXECUTE FUNCTION public.update_incident_knowledge_success_rate();


--
-- Name: learning_objectives update_learning_objectives_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_learning_objectives_updated_at BEFORE UPDATE ON public.learning_objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mandatory_reporting_records update_mandatory_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mandatory_reports_updated_at BEFORE UPDATE ON public.mandatory_reporting_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: oauth_clients update_oauth_clients_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_oauth_clients_updated_at BEFORE UPDATE ON public.oauth_clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: oauth_consent_records update_oauth_consent_records_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_oauth_consent_records_updated_at BEFORE UPDATE ON public.oauth_consent_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: oauth_id_token_claims update_oauth_id_token_claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_oauth_id_token_claims_updated_at BEFORE UPDATE ON public.oauth_id_token_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_accounts update_organization_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_accounts_updated_at BEFORE UPDATE ON public.organization_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_members update_organization_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: parental_consents update_parental_consents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_parental_consents_updated_at BEFORE UPDATE ON public.parental_consents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pipeline_executions update_pipeline_executions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pipeline_executions_updated_at BEFORE UPDATE ON public.pipeline_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_embedding_configs update_platform_embedding_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_embedding_configs_updated_at BEFORE UPDATE ON public.platform_embedding_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: recommendation_outcomes update_recommendation_outcomes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recommendation_outcomes_updated_at BEFORE UPDATE ON public.recommendation_outcomes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reward_ledger update_reward_ledger_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reward_ledger_updated_at BEFORE UPDATE ON public.reward_ledger FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: safety_incidents update_safety_incidents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON public.safety_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: schools update_schools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: story_effectiveness update_story_effectiveness_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_story_effectiveness_updated_at BEFORE UPDATE ON public.story_effectiveness FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: story_templates update_story_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_story_templates_updated_at BEFORE UPDATE ON public.story_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_progress update_student_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teachers update_teachers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: universal_platform_configs update_universal_platform_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_universal_platform_configs_updated_at BEFORE UPDATE ON public.universal_platform_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: voice_clones update_voice_clones_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_voice_clones_updated_at BEFORE UPDATE ON public.voice_clones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: voice_preferences update_voice_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_voice_preferences_updated_at BEFORE UPDATE ON public.voice_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhook_registrations update_webhook_registrations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webhook_registrations_updated_at BEFORE UPDATE ON public.webhook_registrations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webhooks update_webhooks_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webhooks_updated_at_trigger BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: webvtt_files update_webvtt_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_webvtt_files_updated_at BEFORE UPDATE ON public.webvtt_files FOR EACH ROW EXECUTE FUNCTION public.update_webvtt_updated_at();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: accessibility_profiles accessibility_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessibility_profiles
    ADD CONSTRAINT accessibility_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: affiliate_accounts affiliate_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_accounts
    ADD CONSTRAINT affiliate_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: affiliate_referrals affiliate_referrals_affiliate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_affiliate_id_fkey FOREIGN KEY (affiliate_id) REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE;


--
-- Name: affiliate_referrals affiliate_referrals_referred_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.affiliate_referrals
    ADD CONSTRAINT affiliate_referrals_referred_user_id_fkey FOREIGN KEY (referred_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: age_verification_audit age_verification_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.age_verification_audit
    ADD CONSTRAINT age_verification_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: alexa_user_mappings alexa_user_mappings_supabase_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alexa_user_mappings
    ADD CONSTRAINT alexa_user_mappings_supabase_user_id_fkey FOREIGN KEY (supabase_user_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: asset_generation_jobs asset_generation_jobs_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_generation_jobs
    ADD CONSTRAINT asset_generation_jobs_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: assistive_technologies assistive_technologies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assistive_technologies
    ADD CONSTRAINT assistive_technologies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audio_transcripts audio_transcripts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audio_transcripts
    ADD CONSTRAINT audio_transcripts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: auth_sessions auth_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: billing_events billing_events_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: billing_events billing_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_events
    ADD CONSTRAINT billing_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: character_feedback character_feedback_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_feedback
    ADD CONSTRAINT character_feedback_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE CASCADE;


--
-- Name: character_feedback character_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_feedback
    ADD CONSTRAINT character_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: character_shares character_shares_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id);


--
-- Name: character_shares character_shares_new_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_new_character_id_fkey FOREIGN KEY (new_character_id) REFERENCES public.characters(id);


--
-- Name: character_shares character_shares_shared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_shared_by_fkey FOREIGN KEY (shared_by) REFERENCES public.users(id);


--
-- Name: character_shares character_shares_source_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_source_library_id_fkey FOREIGN KEY (source_library_id) REFERENCES public.libraries(id);


--
-- Name: character_shares character_shares_target_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.character_shares
    ADD CONSTRAINT character_shares_target_library_id_fkey FOREIGN KEY (target_library_id) REFERENCES public.libraries(id);


--
-- Name: characters characters_creator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: characters characters_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: characters characters_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.characters
    ADD CONSTRAINT characters_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: choice_patterns choice_patterns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.choice_patterns
    ADD CONSTRAINT choice_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: classroom_enrollments classroom_enrollments_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_enrollments
    ADD CONSTRAINT classroom_enrollments_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: classroom_enrollments classroom_enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classroom_enrollments
    ADD CONSTRAINT classroom_enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: classrooms classrooms_curriculum_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_curriculum_framework_id_fkey FOREIGN KEY (curriculum_framework_id) REFERENCES public.curriculum_frameworks(id);


--
-- Name: classrooms classrooms_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: classrooms classrooms_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- Name: communication_adaptations communication_adaptations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_adaptations
    ADD CONSTRAINT communication_adaptations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: communication_profiles communication_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communication_profiles
    ADD CONSTRAINT communication_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: consumption_metrics consumption_metrics_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_metrics
    ADD CONSTRAINT consumption_metrics_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: consumption_metrics consumption_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumption_metrics
    ADD CONSTRAINT consumption_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: content_filtering_logs content_filtering_logs_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_filtering_logs
    ADD CONSTRAINT content_filtering_logs_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: content_safety_logs content_safety_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_safety_logs
    ADD CONSTRAINT content_safety_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_checkpoints conversation_checkpoints_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_checkpoints
    ADD CONSTRAINT conversation_checkpoints_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_interruptions conversation_interruptions_checkpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_interruptions
    ADD CONSTRAINT conversation_interruptions_checkpoint_id_fkey FOREIGN KEY (checkpoint_id) REFERENCES public.conversation_checkpoints(checkpoint_id);


--
-- Name: conversation_interruptions conversation_interruptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_interruptions
    ADD CONSTRAINT conversation_interruptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_sessions conversation_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_sessions
    ADD CONSTRAINT conversation_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversation_states conversation_states_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_states
    ADD CONSTRAINT conversation_states_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: crisis_indicators crisis_indicators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_indicators
    ADD CONSTRAINT crisis_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: crisis_intervention_logs crisis_intervention_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_intervention_logs
    ADD CONSTRAINT crisis_intervention_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: crisis_responses crisis_responses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_responses
    ADD CONSTRAINT crisis_responses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: cultural_contexts cultural_contexts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cultural_contexts
    ADD CONSTRAINT cultural_contexts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: curriculum_alignment_results curriculum_alignment_results_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.curriculum_alignment_results
    ADD CONSTRAINT curriculum_alignment_results_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: deletion_requests deletion_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deletion_requests
    ADD CONSTRAINT deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: device_connection_logs device_connection_logs_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_connection_logs
    ADD CONSTRAINT device_connection_logs_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.smart_home_devices(id);


--
-- Name: device_tokens device_tokens_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.smart_home_devices(id);


--
-- Name: device_tokens device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_tokens
    ADD CONSTRAINT device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: distress_patterns distress_patterns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distress_patterns
    ADD CONSTRAINT distress_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: early_intervention_signals early_intervention_signals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.early_intervention_signals
    ADD CONSTRAINT early_intervention_signals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: educational_outcomes educational_outcomes_learning_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_outcomes
    ADD CONSTRAINT educational_outcomes_learning_objective_id_fkey FOREIGN KEY (learning_objective_id) REFERENCES public.learning_objectives(id);


--
-- Name: educational_outcomes educational_outcomes_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_outcomes
    ADD CONSTRAINT educational_outcomes_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: educational_outcomes educational_outcomes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.educational_outcomes
    ADD CONSTRAINT educational_outcomes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: email_delivery_log email_delivery_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_delivery_log
    ADD CONSTRAINT email_delivery_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_engagement_tracking email_engagement_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_engagement_tracking
    ADD CONSTRAINT email_engagement_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: email_preferences email_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_preferences
    ADD CONSTRAINT email_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: emotion_engagement_metrics emotion_engagement_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotion_engagement_metrics
    ADD CONSTRAINT emotion_engagement_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: emotional_correlations emotional_correlations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_correlations
    ADD CONSTRAINT emotional_correlations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: emotional_journeys emotional_journeys_pathway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_journeys
    ADD CONSTRAINT emotional_journeys_pathway_id_fkey FOREIGN KEY (pathway_id) REFERENCES public.therapeutic_pathways(id);


--
-- Name: emotional_journeys emotional_journeys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_journeys
    ADD CONSTRAINT emotional_journeys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: emotional_trends emotional_trends_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotional_trends
    ADD CONSTRAINT emotional_trends_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: emotions emotions_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: emotions emotions_sub_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_sub_library_id_fkey FOREIGN KEY (sub_library_id) REFERENCES public.libraries(id);


--
-- Name: emotions emotions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emotions
    ADD CONSTRAINT emotions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: engagement_checks engagement_checks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_checks
    ADD CONSTRAINT engagement_checks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: engagement_metrics engagement_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.engagement_metrics
    ADD CONSTRAINT engagement_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: event_metrics event_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_metrics
    ADD CONSTRAINT event_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: event_store event_store_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_store
    ADD CONSTRAINT event_store_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: gift_card_redemptions gift_card_redemptions_gift_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_gift_card_id_fkey FOREIGN KEY (gift_card_id) REFERENCES public.gift_cards(id) ON DELETE CASCADE;


--
-- Name: gift_card_redemptions gift_card_redemptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_card_redemptions
    ADD CONSTRAINT gift_card_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: gift_cards gift_cards_purchased_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_purchased_by_fkey FOREIGN KEY (purchased_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: gift_cards gift_cards_redeemed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gift_cards
    ADD CONSTRAINT gift_cards_redeemed_by_fkey FOREIGN KEY (redeemed_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: group_storytelling_sessions group_storytelling_sessions_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_storytelling_sessions
    ADD CONSTRAINT group_storytelling_sessions_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id);


--
-- Name: group_storytelling_sessions group_storytelling_sessions_facilitator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_storytelling_sessions
    ADD CONSTRAINT group_storytelling_sessions_facilitator_id_fkey FOREIGN KEY (facilitator_id) REFERENCES public.teachers(id);


--
-- Name: hibernated_accounts hibernated_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hibernated_accounts
    ADD CONSTRAINT hibernated_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: human_overrides human_overrides_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.human_overrides
    ADD CONSTRAINT human_overrides_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: incident_records incident_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.incident_records
    ADD CONSTRAINT incident_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: intervention_triggers intervention_triggers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intervention_triggers
    ADD CONSTRAINT intervention_triggers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invitations invitations_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: invite_discounts invite_discounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_discounts
    ADD CONSTRAINT invite_discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: invite_discounts invite_discounts_used_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_discounts
    ADD CONSTRAINT invite_discounts_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: iot_consent_records iot_consent_records_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_consent_records
    ADD CONSTRAINT iot_consent_records_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.smart_home_devices(id);


--
-- Name: iot_consent_records iot_consent_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.iot_consent_records
    ADD CONSTRAINT iot_consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ip_detection_audit ip_detection_audit_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_detection_audit
    ADD CONSTRAINT ip_detection_audit_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: ip_detection_audit ip_detection_audit_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_detection_audit
    ADD CONSTRAINT ip_detection_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ip_disputes ip_disputes_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_disputes
    ADD CONSTRAINT ip_disputes_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ip_disputes ip_disputes_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_disputes
    ADD CONSTRAINT ip_disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: ip_disputes ip_disputes_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_disputes
    ADD CONSTRAINT ip_disputes_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: knowledge_queries knowledge_queries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_queries
    ADD CONSTRAINT knowledge_queries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_support_escalations knowledge_support_escalations_query_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_support_escalations
    ADD CONSTRAINT knowledge_support_escalations_query_id_fkey FOREIGN KEY (query_id) REFERENCES public.knowledge_queries(id) ON DELETE CASCADE;


--
-- Name: knowledge_support_escalations knowledge_support_escalations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_support_escalations
    ADD CONSTRAINT knowledge_support_escalations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: language_simplifications language_simplifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.language_simplifications
    ADD CONSTRAINT language_simplifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: learning_objectives learning_objectives_framework_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_objectives
    ADD CONSTRAINT learning_objectives_framework_id_fkey FOREIGN KEY (framework_id) REFERENCES public.curriculum_frameworks(id);


--
-- Name: libraries libraries_owner_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_owner_fkey FOREIGN KEY (owner) REFERENCES public.users(id);


--
-- Name: libraries libraries_parent_library_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_parent_library_fkey FOREIGN KEY (parent_library) REFERENCES public.libraries(id);


--
-- Name: libraries libraries_primary_character_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_primary_character_id_fkey FOREIGN KEY (primary_character_id) REFERENCES public.characters(id);


--
-- Name: library_consent library_consent_adult_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_consent
    ADD CONSTRAINT library_consent_adult_user_id_fkey FOREIGN KEY (adult_user_id) REFERENCES public.users(id);


--
-- Name: library_consent library_consent_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_consent
    ADD CONSTRAINT library_consent_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: library_insights library_insights_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_insights
    ADD CONSTRAINT library_insights_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: library_insights library_insights_most_active_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_insights
    ADD CONSTRAINT library_insights_most_active_user_fkey FOREIGN KEY (most_active_user) REFERENCES public.users(id);


--
-- Name: library_permissions library_permissions_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_permissions
    ADD CONSTRAINT library_permissions_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: library_permissions library_permissions_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_permissions
    ADD CONSTRAINT library_permissions_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: library_permissions library_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.library_permissions
    ADD CONSTRAINT library_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: mandatory_reporting_records mandatory_reporting_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mandatory_reporting_records
    ADD CONSTRAINT mandatory_reporting_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: media_assets media_assets_deletion_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_deletion_request_id_fkey FOREIGN KEY (deletion_request_id) REFERENCES public.deletion_requests(request_id) ON DELETE SET NULL;


--
-- Name: media_assets media_assets_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: multimodal_inputs multimodal_inputs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.multimodal_inputs
    ADD CONSTRAINT multimodal_inputs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens oauth_access_tokens_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens oauth_access_tokens_refresh_token_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_refresh_token_id_fkey FOREIGN KEY (refresh_token_id) REFERENCES public.oauth_refresh_tokens(id) ON DELETE CASCADE;


--
-- Name: oauth_access_tokens oauth_access_tokens_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id);


--
-- Name: oauth_access_tokens oauth_access_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_access_tokens
    ADD CONSTRAINT oauth_access_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorization_codes oauth_authorization_codes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT oauth_authorization_codes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE;


--
-- Name: oauth_authorization_codes oauth_authorization_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_authorization_codes
    ADD CONSTRAINT oauth_authorization_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_clients oauth_clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_clients
    ADD CONSTRAINT oauth_clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: oauth_consent_records oauth_consent_records_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_consent_records
    ADD CONSTRAINT oauth_consent_records_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE;


--
-- Name: oauth_consent_records oauth_consent_records_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_consent_records
    ADD CONSTRAINT oauth_consent_records_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES auth.users(id);


--
-- Name: oauth_consent_records oauth_consent_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_consent_records
    ADD CONSTRAINT oauth_consent_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_events oauth_events_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_events
    ADD CONSTRAINT oauth_events_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.oauth_clients(client_id);


--
-- Name: oauth_events oauth_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_events
    ADD CONSTRAINT oauth_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: oauth_id_token_claims oauth_id_token_claims_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_id_token_claims
    ADD CONSTRAINT oauth_id_token_claims_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE;


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_revoked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES auth.users(id);


--
-- Name: oauth_refresh_tokens oauth_refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth_refresh_tokens
    ADD CONSTRAINT oauth_refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organization_accounts organization_accounts_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_accounts
    ADD CONSTRAINT organization_accounts_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: parent_notifications parent_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_notifications
    ADD CONSTRAINT parent_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: parent_teacher_communications parent_teacher_communications_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_teacher_communications
    ADD CONSTRAINT parent_teacher_communications_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: parent_teacher_communications parent_teacher_communications_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parent_teacher_communications
    ADD CONSTRAINT parent_teacher_communications_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id);


--
-- Name: parental_consents parental_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parental_consents
    ADD CONSTRAINT parental_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: participant_contributions participant_contributions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_contributions
    ADD CONSTRAINT participant_contributions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_storytelling_sessions(id);


--
-- Name: participant_contributions participant_contributions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participant_contributions
    ADD CONSTRAINT participant_contributions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: pending_transfer_magic_links pending_transfer_magic_links_transfer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transfer_magic_links
    ADD CONSTRAINT pending_transfer_magic_links_transfer_id_fkey FOREIGN KEY (transfer_id) REFERENCES public.story_transfers(id) ON DELETE CASCADE;


--
-- Name: pipeline_executions pipeline_executions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pipeline_executions
    ADD CONSTRAINT pipeline_executions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: platform_integration_events platform_integration_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_integration_events
    ADD CONSTRAINT platform_integration_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: push_device_tokens push_device_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_device_tokens
    ADD CONSTRAINT push_device_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: qr_code_analytics qr_code_analytics_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.qr_code_analytics
    ADD CONSTRAINT qr_code_analytics_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: recommendation_outcomes recommendation_outcomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recommendation_outcomes
    ADD CONSTRAINT recommendation_outcomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_tracking referral_tracking_discount_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_tracking
    ADD CONSTRAINT referral_tracking_discount_code_fkey FOREIGN KEY (discount_code) REFERENCES public.invite_discounts(code) ON DELETE SET NULL;


--
-- Name: referral_tracking referral_tracking_referee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_tracking
    ADD CONSTRAINT referral_tracking_referee_id_fkey FOREIGN KEY (referee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: referral_tracking referral_tracking_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_tracking
    ADD CONSTRAINT referral_tracking_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: research_agent_challenges research_agent_challenges_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_agent_challenges
    ADD CONSTRAINT research_agent_challenges_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_briefs research_briefs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_briefs
    ADD CONSTRAINT research_briefs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_cache research_cache_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_cache
    ADD CONSTRAINT research_cache_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_cost_tracking research_cost_tracking_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_cost_tracking
    ADD CONSTRAINT research_cost_tracking_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_insights research_insights_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_insights
    ADD CONSTRAINT research_insights_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_pre_launch_memos research_pre_launch_memos_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_pre_launch_memos
    ADD CONSTRAINT research_pre_launch_memos_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: research_usage_metrics research_usage_metrics_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.research_usage_metrics
    ADD CONSTRAINT research_usage_metrics_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.research_tenants(tenant_id) ON DELETE CASCADE;


--
-- Name: response_adaptations response_adaptations_target_profile_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_adaptations
    ADD CONSTRAINT response_adaptations_target_profile_fkey FOREIGN KEY (target_profile) REFERENCES public.accessibility_profiles(id) ON DELETE CASCADE;


--
-- Name: response_latency_data response_latency_data_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.response_latency_data
    ADD CONSTRAINT response_latency_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: reward_ledger reward_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reward_ledger
    ADD CONSTRAINT reward_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: risk_assessments risk_assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.risk_assessments
    ADD CONSTRAINT risk_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: safety_incidents safety_incidents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_incidents
    ADD CONSTRAINT safety_incidents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: safety_plans safety_plans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.safety_plans
    ADD CONSTRAINT safety_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: session_participants session_participants_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.group_storytelling_sessions(id);


--
-- Name: session_participants session_participants_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_participants
    ADD CONSTRAINT session_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: smart_home_devices smart_home_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_home_devices
    ADD CONSTRAINT smart_home_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sonos_devices sonos_devices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_devices
    ADD CONSTRAINT sonos_devices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sonos_groups sonos_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_groups
    ADD CONSTRAINT sonos_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sonos_tokens sonos_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sonos_tokens
    ADD CONSTRAINT sonos_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: stories stories_creator_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_creator_user_id_fkey FOREIGN KEY (creator_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: stories stories_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: stories stories_story_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_story_type_id_fkey FOREIGN KEY (story_type_id) REFERENCES public.story_types(id) ON DELETE SET NULL;


--
-- Name: story_choices story_choices_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_choices
    ADD CONSTRAINT story_choices_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: story_choices story_choices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_choices
    ADD CONSTRAINT story_choices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: story_credits_ledger story_credits_ledger_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_credits_ledger
    ADD CONSTRAINT story_credits_ledger_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_effectiveness story_effectiveness_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_effectiveness
    ADD CONSTRAINT story_effectiveness_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_effectiveness story_effectiveness_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_effectiveness
    ADD CONSTRAINT story_effectiveness_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_feedback story_feedback_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_feedback
    ADD CONSTRAINT story_feedback_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_feedback story_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_feedback
    ADD CONSTRAINT story_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_interactions story_interactions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_interactions
    ADD CONSTRAINT story_interactions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: story_interactions story_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_interactions
    ADD CONSTRAINT story_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: story_packs story_packs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_packs
    ADD CONSTRAINT story_packs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: story_recommendations story_recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_recommendations
    ADD CONSTRAINT story_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: story_transfer_requests story_transfer_requests_from_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_from_library_id_fkey FOREIGN KEY (from_library_id) REFERENCES public.libraries(id);


--
-- Name: story_transfer_requests story_transfer_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id);


--
-- Name: story_transfer_requests story_transfer_requests_responded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES public.users(id);


--
-- Name: story_transfer_requests story_transfer_requests_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id);


--
-- Name: story_transfer_requests story_transfer_requests_to_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfer_requests
    ADD CONSTRAINT story_transfer_requests_to_library_id_fkey FOREIGN KEY (to_library_id) REFERENCES public.libraries(id);


--
-- Name: story_transfers story_transfers_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfers
    ADD CONSTRAINT story_transfers_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: story_transfers story_transfers_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfers
    ADD CONSTRAINT story_transfers_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: story_transfers story_transfers_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.story_transfers
    ADD CONSTRAINT story_transfers_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_progress student_progress_learning_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_learning_objective_id_fkey FOREIGN KEY (learning_objective_id) REFERENCES public.learning_objectives(id);


--
-- Name: student_progress student_progress_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_progress
    ADD CONSTRAINT student_progress_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id);


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: sub_library_avatars sub_library_avatars_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_library_avatars
    ADD CONSTRAINT sub_library_avatars_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: system_alerts system_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.users(id);


--
-- Name: system_alerts system_alerts_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_alerts
    ADD CONSTRAINT system_alerts_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.alert_rules(id);


--
-- Name: teachers teachers_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: teachers teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: therapeutic_pathways therapeutic_pathways_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.therapeutic_pathways
    ADD CONSTRAINT therapeutic_pathways_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_context_separations user_context_separations_primary_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_context_separations
    ADD CONSTRAINT user_context_separations_primary_user_id_fkey FOREIGN KEY (primary_user_id) REFERENCES public.users(id);


--
-- Name: user_hue_settings user_hue_settings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_hue_settings
    ADD CONSTRAINT user_hue_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_preferences user_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: user_tiers user_tiers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tiers
    ADD CONSTRAINT user_tiers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_tiers user_tiers_user_id_public_users_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_tiers
    ADD CONSTRAINT user_tiers_user_id_public_users_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: CONSTRAINT user_tiers_user_id_public_users_fkey ON user_tiers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT user_tiers_user_id_public_users_fkey ON public.user_tiers IS 'Foreign key relationship to public.users.id to enable Supabase PostgREST relationship queries. 
This constraint ensures user_tiers.user_id references public.users.id, which should match auth.users.id.';


--
-- Name: vocabulary_usage_log vocabulary_usage_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vocabulary_usage_log
    ADD CONSTRAINT vocabulary_usage_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_analysis_results voice_analysis_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_analysis_results
    ADD CONSTRAINT voice_analysis_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: voice_clones voice_clones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_clones
    ADD CONSTRAINT voice_clones_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_cost_tracking voice_cost_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_cost_tracking
    ADD CONSTRAINT voice_cost_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: voice_pace_adjustments voice_pace_adjustments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_pace_adjustments
    ADD CONSTRAINT voice_pace_adjustments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_preferences voice_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_preferences
    ADD CONSTRAINT voice_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: voice_synthesis_metrics voice_synthesis_metrics_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_synthesis_metrics
    ADD CONSTRAINT voice_synthesis_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;


--
-- Name: webhooks webhooks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: webvtt_files webvtt_files_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_files
    ADD CONSTRAINT webvtt_files_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE CASCADE;


--
-- Name: webvtt_files webvtt_files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_files
    ADD CONSTRAINT webvtt_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webvtt_generation_metrics webvtt_generation_metrics_webvtt_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_generation_metrics
    ADD CONSTRAINT webvtt_generation_metrics_webvtt_file_id_fkey FOREIGN KEY (webvtt_file_id) REFERENCES public.webvtt_files(id) ON DELETE CASCADE;


--
-- Name: webvtt_word_timestamps webvtt_word_timestamps_webvtt_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webvtt_word_timestamps
    ADD CONSTRAINT webvtt_word_timestamps_webvtt_file_id_fkey FOREIGN KEY (webvtt_file_id) REFERENCES public.webvtt_files(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_jwks Active JWKS are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Active JWKS are publicly readable" ON public.oauth_jwks FOR SELECT USING (((is_active = true) AND (revoked_at IS NULL)));


--
-- Name: oauth_events Admins can view all OAuth events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all OAuth events" ON public.oauth_events FOR SELECT USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: healing_metrics Admins can view healing metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view healing metrics" ON public.healing_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: incident_knowledge Admins can view incident knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view incident knowledge" ON public.incident_knowledge FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: incident_records Admins can view incident records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view incident records" ON public.incident_records FOR SELECT USING ((EXISTS ( SELECT 1
   FROM auth.users
  WHERE ((users.id = auth.uid()) AND ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text)))));


--
-- Name: oauth_clients OAuth clients are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "OAuth clients are publicly readable" ON public.oauth_clients FOR SELECT USING ((is_active = true));


--
-- Name: oauth_clients Only admins can manage OAuth clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can manage OAuth clients" ON public.oauth_clients USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: oauth_jwks Only system can manage JWKS; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only system can manage JWKS" ON public.oauth_jwks USING (((auth.jwt() ->> 'role'::text) = 'system'::text));


--
-- Name: deletion_audit_log Service role can manage deletion_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage deletion_audit_log" ON public.deletion_audit_log USING ((auth.role() = 'service_role'::text));


--
-- Name: deletion_requests Service role can manage deletion_requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage deletion_requests" ON public.deletion_requests USING ((auth.role() = 'service_role'::text));


--
-- Name: email_engagement_tracking Service role can manage email_engagement_tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage email_engagement_tracking" ON public.email_engagement_tracking USING ((auth.role() = 'service_role'::text));


--
-- Name: hibernated_accounts Service role can manage hibernated_accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage hibernated_accounts" ON public.hibernated_accounts USING ((auth.role() = 'service_role'::text));


--
-- Name: user_tiers Service role can manage user_tiers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage user_tiers" ON public.user_tiers USING ((auth.role() = 'service_role'::text));


--
-- Name: reward_ledger Service role has full access to all tables; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to all tables" ON public.reward_ledger USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: consumption_metrics Service role has full access to consumption_metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to consumption_metrics" ON public.consumption_metrics USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: email_delivery_log Service role has full access to email_delivery_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to email_delivery_log" ON public.email_delivery_log USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: human_overrides Service role has full access to human_overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to human_overrides" ON public.human_overrides USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: pipeline_executions Service role has full access to pipeline_executions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to pipeline_executions" ON public.pipeline_executions USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: recommendation_outcomes Service role has full access to recommendation_outcomes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to recommendation_outcomes" ON public.recommendation_outcomes USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: story_effectiveness Service role has full access to story_effectiveness; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role has full access to story_effectiveness" ON public.story_effectiveness USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: webvtt_generation_metrics System can create generation metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can create generation metrics" ON public.webvtt_generation_metrics FOR INSERT WITH CHECK (true);


--
-- Name: circuit_breaker_state System can manage circuit breaker state; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage circuit breaker state" ON public.circuit_breaker_state USING ((auth.role() = 'service_role'::text));


--
-- Name: self_healing_config System can manage healing config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage healing config" ON public.self_healing_config USING ((auth.role() = 'service_role'::text));


--
-- Name: healing_metrics System can manage healing metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage healing metrics" ON public.healing_metrics USING ((auth.role() = 'service_role'::text));


--
-- Name: incident_knowledge System can manage incident knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage incident knowledge" ON public.incident_knowledge USING ((auth.role() = 'service_role'::text));


--
-- Name: incident_records System can manage incident records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can manage incident records" ON public.incident_records USING ((auth.role() = 'service_role'::text));


--
-- Name: deletion_requests Users can cancel their pending deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can cancel their pending deletion requests" ON public.deletion_requests FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: webvtt_files Users can create WebVTT files for their stories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create WebVTT files for their stories" ON public.webvtt_files FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.stories
  WHERE ((stories.id = webvtt_files.story_id) AND (webvtt_files.user_id = auth.uid()))))));


--
-- Name: deletion_requests Users can create deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create deletion requests" ON public.deletion_requests FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: webvtt_word_timestamps Users can create word timestamps for their WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create word timestamps for their WebVTT files" ON public.webvtt_word_timestamps FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.webvtt_files
  WHERE ((webvtt_files.id = webvtt_word_timestamps.webvtt_file_id) AND (webvtt_files.user_id = auth.uid())))));


--
-- Name: webvtt_files Users can delete their own WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own WebVTT files" ON public.webvtt_files FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: oauth_id_token_claims Users can manage their own claims; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own claims" ON public.oauth_id_token_claims USING ((auth.uid() = user_id));


--
-- Name: oauth_consent_records Users can manage their own consent; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own consent" ON public.oauth_consent_records USING (((auth.uid() = user_id) OR (auth.uid() = parent_user_id)));


--
-- Name: email_preferences Users can manage their own email preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own email preferences" ON public.email_preferences USING ((auth.uid() = user_id));


--
-- Name: oauth_access_tokens Users can only access their own access tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can only access their own access tokens" ON public.oauth_access_tokens USING ((auth.uid() = user_id));


--
-- Name: oauth_authorization_codes Users can only access their own auth codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can only access their own auth codes" ON public.oauth_authorization_codes USING ((auth.uid() = user_id));


--
-- Name: oauth_refresh_tokens Users can only access their own refresh tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can only access their own refresh tokens" ON public.oauth_refresh_tokens USING ((auth.uid() = user_id));


--
-- Name: webvtt_files Users can update their own WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own WebVTT files" ON public.webvtt_files FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: webvtt_generation_metrics Users can view metrics for their WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view metrics for their WebVTT files" ON public.webvtt_generation_metrics FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.webvtt_files
  WHERE ((webvtt_files.id = webvtt_generation_metrics.webvtt_file_id) AND (webvtt_files.user_id = auth.uid())))));


--
-- Name: oauth_events Users can view their own OAuth events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own OAuth events" ON public.oauth_events FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: webvtt_files Users can view their own WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own WebVTT files" ON public.webvtt_files FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: consumption_metrics Users can view their own consumption metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own consumption metrics" ON public.consumption_metrics FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: deletion_requests Users can view their own deletion requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own deletion requests" ON public.deletion_requests FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: email_delivery_log Users can view their own email delivery log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own email delivery log" ON public.email_delivery_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: recommendation_outcomes Users can view their own recommendation outcomes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recommendation outcomes" ON public.recommendation_outcomes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: reward_ledger Users can view their own reward ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reward ledger" ON public.reward_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: story_effectiveness Users can view their own story effectiveness; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own story effectiveness" ON public.story_effectiveness FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_tiers Users can view their own tier info; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own tier info" ON public.user_tiers FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: webvtt_word_timestamps Users can view word timestamps for their WebVTT files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view word timestamps for their WebVTT files" ON public.webvtt_word_timestamps FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.webvtt_files
  WHERE ((webvtt_files.id = webvtt_word_timestamps.webvtt_file_id) AND (webvtt_files.user_id = auth.uid())))));


--
-- Name: accessibility_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accessibility_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: accessibility_profiles accessibility_profiles_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY accessibility_profiles_policy ON public.accessibility_profiles USING ((auth.uid() = user_id));


--
-- Name: affiliate_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.affiliate_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: affiliate_accounts affiliate_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY affiliate_policy ON public.affiliate_accounts USING ((user_id = auth.uid()));


--
-- Name: alert_rules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

--
-- Name: alert_rules alert_rules_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alert_rules_policy ON public.alert_rules USING ((auth.role() = 'service_role'::text));


--
-- Name: alexa_user_mappings alexa_mapping_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alexa_mapping_access ON public.alexa_user_mappings USING ((supabase_user_id = auth.uid()));


--
-- Name: alexa_user_mappings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.alexa_user_mappings ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys api_keys_user_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY api_keys_user_policy ON public.api_keys USING ((((user_id IS NOT NULL) AND (auth.uid() = user_id)) OR (auth.role() = 'service_role'::text)));


--
-- Name: assistive_technologies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assistive_technologies ENABLE ROW LEVEL SECURITY;

--
-- Name: assistive_technologies assistive_technologies_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY assistive_technologies_policy ON public.assistive_technologies USING ((auth.uid() = user_id));


--
-- Name: audio_transcripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audio_transcripts ENABLE ROW LEVEL SECURITY;

--
-- Name: audio_transcripts audio_transcripts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audio_transcripts_policy ON public.audio_transcripts USING ((user_id = auth.uid()));


--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log audit_log_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_log_access ON public.audit_log USING ((user_id = auth.uid()));


--
-- Name: auth_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_rate_limits auth_rate_limits_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_rate_limits_policy ON public.auth_rate_limits USING ((auth.role() = 'service_role'::text));


--
-- Name: auth_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_sessions auth_sessions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY auth_sessions_policy ON public.auth_sessions USING ((user_id = auth.uid()));


--
-- Name: billing_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

--
-- Name: billing_events billing_events_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY billing_events_policy ON public.billing_events USING ((user_id = auth.uid()));


--
-- Name: characters character_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY character_access ON public.characters USING ((EXISTS ( SELECT 1
   FROM (public.stories s
     JOIN public.libraries l ON ((s.library_id = l.id)))
  WHERE ((s.id = characters.story_id) AND ((l.owner = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_permissions lp
          WHERE ((lp.library_id = l.id) AND (lp.user_id = auth.uid())))))))));


--
-- Name: character_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.character_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: character_feedback character_feedback_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY character_feedback_insert ON public.character_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: character_feedback character_feedback_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY character_feedback_select ON public.character_feedback FOR SELECT USING (true);


--
-- Name: character_feedback character_feedback_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY character_feedback_update ON public.character_feedback FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: character_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.character_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: character_shares character_shares_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY character_shares_policy ON public.character_shares USING (((shared_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.libraries l
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE (((l.id = character_shares.source_library_id) OR (l.id = character_shares.target_library_id)) AND ((l.owner = auth.uid()) OR (lp.user_id = auth.uid())))))));


--
-- Name: characters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;

--
-- Name: characters characters_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY characters_policy ON public.characters USING ((EXISTS ( SELECT 1
   FROM (public.libraries l
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE ((l.id = lp.library_id) AND ((l.owner = auth.uid()) OR (lp.user_id = auth.uid()))))));


--
-- Name: choice_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.choice_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: choice_patterns choice_patterns_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY choice_patterns_policy ON public.choice_patterns USING ((user_id = auth.uid()));


--
-- Name: circuit_breaker_state; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_enrollments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classroom_enrollments ENABLE ROW LEVEL SECURITY;

--
-- Name: classroom_enrollments classroom_enrollments_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classroom_enrollments_access ON public.classroom_enrollments USING (((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = classroom_enrollments.student_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.classrooms c
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((c.id = classroom_enrollments.classroom_id) AND (t.user_id = auth.uid()))))));


--
-- Name: classrooms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;

--
-- Name: classrooms classrooms_teacher_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY classrooms_teacher_access ON public.classrooms USING ((EXISTS ( SELECT 1
   FROM public.teachers
  WHERE ((teachers.id = classrooms.teacher_id) AND (teachers.user_id = auth.uid())))));


--
-- Name: communication_adaptations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communication_adaptations ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_adaptations communication_adaptations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communication_adaptations_policy ON public.communication_adaptations USING ((auth.uid() = user_id));


--
-- Name: communication_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communication_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: communication_profiles communication_profiles_user_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY communication_profiles_user_only ON public.communication_profiles USING ((auth.uid() = user_id));


--
-- Name: consumption_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consumption_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: content_safety_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_safety_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: content_safety_logs content_safety_logs_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY content_safety_logs_access ON public.content_safety_logs USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text)))))));


--
-- Name: conversation_checkpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_checkpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_checkpoints conversation_checkpoints_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversation_checkpoints_policy ON public.conversation_checkpoints USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.library_permissions lp
     JOIN public.libraries l ON ((l.id = lp.library_id)))
  WHERE ((l.owner = lp.user_id) AND (lp.user_id = auth.uid()))))));


--
-- Name: conversation_interruptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_interruptions ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_interruptions conversation_interruptions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversation_interruptions_policy ON public.conversation_interruptions USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.library_permissions lp
     JOIN public.libraries l ON ((l.id = lp.library_id)))
  WHERE ((l.owner = lp.user_id) AND (lp.user_id = auth.uid()))))));


--
-- Name: conversation_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_sessions conversation_sessions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversation_sessions_policy ON public.conversation_sessions USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.library_permissions lp
     JOIN public.libraries l ON ((l.id = lp.library_id)))
  WHERE ((l.owner = lp.user_id) AND (lp.user_id = auth.uid()))))));


--
-- Name: conversation_states conversation_state_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversation_state_access ON public.conversation_states USING ((user_id = auth.uid()));


--
-- Name: conversation_states; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_states ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations conversations_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversations_insert_policy ON public.conversations FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


--
-- Name: conversations conversations_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversations_select_policy ON public.conversations FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: conversations conversations_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY conversations_update_policy ON public.conversations FOR UPDATE USING (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


--
-- Name: story_credits_ledger credits_own_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY credits_own_records ON public.story_credits_ledger FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: story_credits_ledger credits_system_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY credits_system_insert ON public.story_credits_ledger FOR INSERT WITH CHECK (true);


--
-- Name: crisis_indicators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_indicators ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_indicators crisis_indicators_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_indicators_policy ON public.crisis_indicators USING ((user_id = auth.uid()));


--
-- Name: crisis_intervention_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_intervention_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_intervention_logs crisis_logs_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_logs_access ON public.crisis_intervention_logs USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text) OR (users.role = 'crisis_counselor'::text)))))));


--
-- Name: crisis_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_responses crisis_responses_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_responses_policy ON public.crisis_responses USING ((user_id = auth.uid()));


--
-- Name: cultural_character_traits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultural_character_traits ENABLE ROW LEVEL SECURITY;

--
-- Name: cultural_character_traits cultural_character_traits_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultural_character_traits_policy ON public.cultural_character_traits FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: cultural_contexts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultural_contexts ENABLE ROW LEVEL SECURITY;

--
-- Name: cultural_contexts cultural_contexts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultural_contexts_policy ON public.cultural_contexts USING ((user_id = auth.uid()));


--
-- Name: cultural_sensitivity_filters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cultural_sensitivity_filters ENABLE ROW LEVEL SECURITY;

--
-- Name: cultural_sensitivity_filters cultural_sensitivity_filters_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cultural_sensitivity_filters_policy ON public.cultural_sensitivity_filters FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: curriculum_frameworks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.curriculum_frameworks ENABLE ROW LEVEL SECURITY;

--
-- Name: curriculum_frameworks curriculum_frameworks_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY curriculum_frameworks_read ON public.curriculum_frameworks FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: data_retention_policies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

--
-- Name: data_retention_policies data_retention_policies_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY data_retention_policies_read ON public.data_retention_policies FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: deletion_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deletion_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: deletion_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: device_connection_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_connection_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: device_connection_logs device_connection_logs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY device_connection_logs_policy ON public.device_connection_logs USING ((EXISTS ( SELECT 1
   FROM public.smart_home_devices shd
  WHERE ((shd.id = device_connection_logs.device_id) AND (shd.user_id = auth.uid())))));


--
-- Name: device_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: device_tokens device_tokens_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY device_tokens_policy ON public.device_tokens USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.smart_home_devices shd
  WHERE ((shd.id = device_tokens.device_id) AND (shd.user_id = auth.uid()))))));


--
-- Name: distress_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.distress_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: distress_patterns distress_patterns_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY distress_patterns_access ON public.distress_patterns USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text)))))));


--
-- Name: early_intervention_signals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.early_intervention_signals ENABLE ROW LEVEL SECURITY;

--
-- Name: early_intervention_signals early_intervention_signals_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY early_intervention_signals_policy ON public.early_intervention_signals USING ((user_id = auth.uid()));


--
-- Name: educational_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.educational_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: educational_outcomes educational_outcomes_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY educational_outcomes_access ON public.educational_outcomes USING (((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = educational_outcomes.student_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (((public.students s
     JOIN public.classroom_enrollments ce ON ((s.id = ce.student_id)))
     JOIN public.classrooms c ON ((ce.classroom_id = c.id)))
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((s.id = educational_outcomes.student_id) AND (t.user_id = auth.uid()))))));


--
-- Name: email_delivery_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;

--
-- Name: email_engagement_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_engagement_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: email_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: emotions emotion_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emotion_access ON public.emotions USING ((user_id = auth.uid()));


--
-- Name: emotion_engagement_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotion_engagement_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: emotion_engagement_metrics emotion_engagement_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emotion_engagement_metrics_policy ON public.emotion_engagement_metrics USING ((user_id = auth.uid()));


--
-- Name: emotional_correlations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotional_correlations ENABLE ROW LEVEL SECURITY;

--
-- Name: emotional_correlations emotional_correlations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emotional_correlations_policy ON public.emotional_correlations USING ((user_id = auth.uid()));


--
-- Name: emotional_journeys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotional_journeys ENABLE ROW LEVEL SECURITY;

--
-- Name: emotional_journeys emotional_journeys_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emotional_journeys_policy ON public.emotional_journeys USING ((user_id = auth.uid()));


--
-- Name: emotional_trends; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotional_trends ENABLE ROW LEVEL SECURITY;

--
-- Name: emotional_trends emotional_trends_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY emotional_trends_policy ON public.emotional_trends USING ((user_id = auth.uid()));


--
-- Name: emotions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emotions ENABLE ROW LEVEL SECURITY;

--
-- Name: engagement_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.engagement_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: engagement_checks engagement_checks_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY engagement_checks_policy ON public.engagement_checks USING ((auth.uid() = user_id));


--
-- Name: engagement_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: engagement_metrics engagement_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY engagement_metrics_policy ON public.engagement_metrics USING ((auth.uid() = user_id));


--
-- Name: event_correlations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_correlations ENABLE ROW LEVEL SECURITY;

--
-- Name: event_correlations event_correlations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_correlations_policy ON public.event_correlations USING ((EXISTS ( SELECT 1
   FROM public.event_store es
  WHERE ((es.correlation_id = event_correlations.correlation_id) AND ((es.user_id = auth.uid()) OR (es.user_id IS NULL))))));


--
-- Name: event_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: event_metrics event_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_metrics_policy ON public.event_metrics USING (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: event_replays; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_replays ENABLE ROW LEVEL SECURITY;

--
-- Name: event_replays event_replays_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_replays_policy ON public.event_replays USING ((auth.role() = 'service_role'::text));


--
-- Name: event_store; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_store ENABLE ROW LEVEL SECURITY;

--
-- Name: event_store event_store_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_store_policy ON public.event_store USING (((user_id = auth.uid()) OR (user_id IS NULL)));


--
-- Name: event_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: event_subscriptions event_subscriptions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY event_subscriptions_policy ON public.event_subscriptions USING ((auth.role() = 'service_role'::text));


--
-- Name: family_structure_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.family_structure_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: family_structure_templates family_structure_templates_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY family_structure_templates_policy ON public.family_structure_templates FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: gift_card_redemptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_card_redemptions ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_cards gift_cards_own_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gift_cards_own_records ON public.gift_cards FOR SELECT USING (((auth.uid() = purchased_by) OR (auth.uid() = redeemed_by)));


--
-- Name: gift_cards gift_cards_system_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gift_cards_system_modify ON public.gift_cards USING (true) WITH CHECK (true);


--
-- Name: group_storytelling_sessions group_sessions_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY group_sessions_access ON public.group_storytelling_sessions USING (((EXISTS ( SELECT 1
   FROM (public.classrooms c
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((c.id = group_storytelling_sessions.classroom_id) AND (t.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.session_participants sp
     JOIN public.students s ON ((sp.student_id = s.id)))
  WHERE ((sp.session_id = group_storytelling_sessions.id) AND (s.user_id = auth.uid()))))));


--
-- Name: group_storytelling_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.group_storytelling_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: healing_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.healing_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: hibernated_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hibernated_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: user_hue_settings hue_settings_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY hue_settings_policy ON public.user_hue_settings USING ((user_id = auth.uid()));


--
-- Name: human_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.human_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_knowledge; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incident_knowledge ENABLE ROW LEVEL SECURITY;

--
-- Name: incident_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.incident_records ENABLE ROW LEVEL SECURITY;

--
-- Name: intervention_triggers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intervention_triggers ENABLE ROW LEVEL SECURITY;

--
-- Name: intervention_triggers intervention_triggers_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY intervention_triggers_policy ON public.intervention_triggers USING ((user_id = auth.uid()));


--
-- Name: invite_discounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invite_discounts ENABLE ROW LEVEL SECURITY;

--
-- Name: invite_discounts invite_discounts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY invite_discounts_policy ON public.invite_discounts USING (((created_by = auth.uid()) OR (used_by = auth.uid())));


--
-- Name: iot_consent_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.iot_consent_records ENABLE ROW LEVEL SECURITY;

--
-- Name: iot_consent_records iot_consent_records_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iot_consent_records_policy ON public.iot_consent_records USING ((user_id = auth.uid()));


--
-- Name: ip_detection_audit ip_audit_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_audit_staff_select ON public.ip_detection_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.email IN ( SELECT users_1.email
           FROM public.users users_1
          WHERE (users_1.email ~~ '%@storytailor.com'::text)))))));


--
-- Name: ip_detection_audit ip_audit_system_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_audit_system_insert ON public.ip_detection_audit FOR INSERT WITH CHECK (true);


--
-- Name: ip_detection_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_detection_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_disputes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_disputes ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_disputes ip_disputes_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_disputes_staff_select ON public.ip_disputes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.email IN ( SELECT users_1.email
           FROM public.users users_1
          WHERE (users_1.email ~~ '%@storytailor.com'::text)))))));


--
-- Name: ip_disputes ip_disputes_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_disputes_staff_update ON public.ip_disputes FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.email IN ( SELECT users_1.email
           FROM public.users users_1
          WHERE (users_1.email ~~ '%@storytailor.com'::text)))))));


--
-- Name: ip_disputes ip_disputes_user_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_disputes_user_insert ON public.ip_disputes FOR INSERT WITH CHECK (((auth.uid() = reported_by) OR (reported_by IS NULL)));


--
-- Name: ip_disputes ip_disputes_user_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ip_disputes_user_select ON public.ip_disputes FOR SELECT USING ((auth.uid() = reported_by));


--
-- Name: knowledge_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_analytics knowledge_analytics_admin_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_analytics_admin_policy ON public.knowledge_analytics USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: knowledge_content; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_content ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_content knowledge_content_admin_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_content_admin_policy ON public.knowledge_content USING (((auth.jwt() ->> 'role'::text) = 'admin'::text));


--
-- Name: knowledge_content knowledge_content_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_content_read_policy ON public.knowledge_content FOR SELECT USING ((is_active = true));


--
-- Name: knowledge_support_escalations knowledge_escalations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_escalations_policy ON public.knowledge_support_escalations USING (((auth.uid() = user_id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'support'::text)));


--
-- Name: knowledge_queries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_queries ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_queries knowledge_queries_user_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY knowledge_queries_user_policy ON public.knowledge_queries USING (((auth.uid() = user_id) OR ((auth.jwt() ->> 'role'::text) = 'admin'::text) OR ((auth.jwt() ->> 'role'::text) = 'support'::text)));


--
-- Name: knowledge_support_escalations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_support_escalations ENABLE ROW LEVEL SECURITY;

--
-- Name: language_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.language_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: language_profiles language_profiles_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY language_profiles_policy ON public.language_profiles FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: language_simplifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.language_simplifications ENABLE ROW LEVEL SECURITY;

--
-- Name: language_simplifications language_simplifications_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY language_simplifications_policy ON public.language_simplifications USING ((auth.uid() = user_id));


--
-- Name: learning_objectives; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;

--
-- Name: learning_objectives learning_objectives_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY learning_objectives_read ON public.learning_objectives FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: libraries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.libraries ENABLE ROW LEVEL SECURITY;

--
-- Name: libraries libraries_service_role_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY libraries_service_role_policy ON public.libraries TO service_role USING (true) WITH CHECK (true);


--
-- Name: libraries library_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_access ON public.libraries USING (((owner = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.library_permissions
  WHERE ((library_permissions.library_id = library_permissions.id) AND (library_permissions.user_id = auth.uid()))))));


--
-- Name: library_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: library_insights library_insights_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_insights_policy ON public.library_insights USING ((EXISTS ( SELECT 1
   FROM (public.libraries l
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE ((l.id = lp.library_id) AND ((l.owner = auth.uid()) OR (lp.user_id = auth.uid()))))));


--
-- Name: library_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.library_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: library_permissions library_permissions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_permissions_policy ON public.library_permissions USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.libraries l
  WHERE ((l.id = library_permissions.library_id) AND (l.owner = auth.uid()))))));


--
-- Name: library_permissions library_permissions_service_role_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY library_permissions_service_role_policy ON public.library_permissions TO service_role USING (true) WITH CHECK (true);


--
-- Name: localization_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.localization_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: localization_cache localization_cache_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY localization_cache_policy ON public.localization_cache FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: pending_transfer_magic_links magic_links_system_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY magic_links_system_access ON public.pending_transfer_magic_links USING (true) WITH CHECK (true);


--
-- Name: mandatory_reporting_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mandatory_reporting_records ENABLE ROW LEVEL SECURITY;

--
-- Name: mandatory_reporting_records mandatory_reports_staff_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mandatory_reports_staff_only ON public.mandatory_reporting_records USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text) OR (users.role = 'compliance_officer'::text))))));


--
-- Name: media_assets media_asset_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY media_asset_access ON public.media_assets USING ((EXISTS ( SELECT 1
   FROM (public.stories s
     JOIN public.libraries l ON ((s.library_id = l.id)))
  WHERE ((s.id = media_assets.story_id) AND ((l.owner = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_permissions lp
          WHERE ((lp.library_id = l.id) AND (lp.user_id = auth.uid())))))))));


--
-- Name: media_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: multimodal_inputs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.multimodal_inputs ENABLE ROW LEVEL SECURITY;

--
-- Name: multimodal_inputs multimodal_inputs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY multimodal_inputs_policy ON public.multimodal_inputs USING ((auth.uid() = user_id));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_delete_policy ON public.notifications FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: notifications notifications_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_policy ON public.notifications FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


--
-- Name: notifications notifications_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_policy ON public.notifications FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: notifications notifications_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_policy ON public.notifications FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: oauth_access_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_authorization_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_consent_records; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_consent_records ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_events ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_id_token_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_id_token_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_jwks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_jwks ENABLE ROW LEVEL SECURITY;

--
-- Name: oauth_refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.oauth_refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_accounts organization_accounts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_accounts_policy ON public.organization_accounts USING (((owner_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.id) AND (om.user_id = auth.uid()))))));


--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members organization_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_members_delete ON public.organization_members FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));


--
-- Name: organization_members organization_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_members_insert ON public.organization_members FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));


--
-- Name: organization_members organization_members_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_members_select ON public.organization_members FOR SELECT TO authenticated USING ((public.is_org_member(organization_id) OR public.is_org_admin(organization_id)));


--
-- Name: organization_members organization_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_members_update ON public.organization_members FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id)) WITH CHECK (public.is_org_admin(organization_id));


--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_delete ON public.organizations FOR DELETE TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: organizations organizations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_insert ON public.organizations FOR INSERT TO authenticated WITH CHECK ((owner_id = auth.uid()));


--
-- Name: organizations organizations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_select ON public.organizations FOR SELECT TO authenticated USING (((owner_id = auth.uid()) OR public.is_org_member(id)));


--
-- Name: organizations organizations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_update ON public.organizations FOR UPDATE TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: parent_teacher_communications parent_communications_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parent_communications_access ON public.parent_teacher_communications USING (((EXISTS ( SELECT 1
   FROM public.teachers t
  WHERE ((t.id = parent_teacher_communications.teacher_id) AND (t.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = parent_teacher_communications.student_id) AND ((s.user_id = auth.uid()) OR (s.parent_email = auth.email())))))));


--
-- Name: parent_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: parent_notifications parent_notifications_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parent_notifications_access ON public.parent_notifications USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text)))))));


--
-- Name: parent_teacher_communications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parent_teacher_communications ENABLE ROW LEVEL SECURITY;

--
-- Name: parental_consents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;

--
-- Name: parental_consents parental_consents_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY parental_consents_policy ON public.parental_consents USING ((user_id = auth.uid()));


--
-- Name: participant_contributions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.participant_contributions ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_transfer_magic_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_transfer_magic_links ENABLE ROW LEVEL SECURITY;

--
-- Name: pipeline_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pipeline_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_embedding_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_embedding_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_embedding_configs platform_embedding_configs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_embedding_configs_policy ON public.platform_embedding_configs USING ((auth.role() = 'service_role'::text));


--
-- Name: platform_integration_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_integration_events ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_integration_events platform_integration_events_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY platform_integration_events_policy ON public.platform_integration_events USING (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));


--
-- Name: push_device_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: push_device_tokens push_tokens_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY push_tokens_policy ON public.push_device_tokens USING ((user_id = auth.uid()));


--
-- Name: recommendation_outcomes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

--
-- Name: gift_card_redemptions redemptions_own_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redemptions_own_records ON public.gift_card_redemptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: gift_card_redemptions redemptions_system_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY redemptions_system_insert ON public.gift_card_redemptions FOR INSERT WITH CHECK (true);


--
-- Name: referral_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_tracking referral_tracking_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY referral_tracking_policy ON public.referral_tracking USING (((referrer_id = auth.uid()) OR (referee_id = auth.uid())));


--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens refresh_tokens_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY refresh_tokens_policy ON public.refresh_tokens USING ((user_id = auth.uid()));


--
-- Name: refresh_tokens refresh_tokens_service_role_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY refresh_tokens_service_role_policy ON public.refresh_tokens FOR INSERT WITH CHECK (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: religious_sensitivity_guidelines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.religious_sensitivity_guidelines ENABLE ROW LEVEL SECURITY;

--
-- Name: religious_sensitivity_guidelines religious_sensitivity_guidelines_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY religious_sensitivity_guidelines_policy ON public.religious_sensitivity_guidelines FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: research_agent_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_agent_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: research_briefs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_briefs ENABLE ROW LEVEL SECURITY;

--
-- Name: research_briefs research_briefs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_briefs_policy ON public.research_briefs USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: research_cache research_cache_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_cache_policy ON public.research_cache USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_agent_challenges research_challenges_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_challenges_policy ON public.research_agent_challenges USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_cost_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_cost_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: research_cost_tracking research_cost_tracking_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_cost_tracking_policy ON public.research_cost_tracking USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_insights; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_insights ENABLE ROW LEVEL SECURITY;

--
-- Name: research_insights research_insights_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_insights_policy ON public.research_insights USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_pre_launch_memos research_memos_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_memos_policy ON public.research_pre_launch_memos USING (((auth.role() = 'service_role'::text) OR (tenant_id IN ( SELECT research_tenants.tenant_id
   FROM public.research_tenants
  WHERE (research_tenants.is_active = true)))));


--
-- Name: research_pre_launch_memos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_pre_launch_memos ENABLE ROW LEVEL SECURITY;

--
-- Name: research_tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: research_tenants research_tenants_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_tenants_policy ON public.research_tenants USING ((auth.role() = 'service_role'::text));


--
-- Name: research_usage_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.research_usage_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: research_usage_metrics research_usage_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY research_usage_metrics_policy ON public.research_usage_metrics USING ((auth.role() = 'service_role'::text));


--
-- Name: response_adaptations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.response_adaptations ENABLE ROW LEVEL SECURITY;

--
-- Name: response_adaptations response_adaptations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY response_adaptations_policy ON public.response_adaptations USING ((EXISTS ( SELECT 1
   FROM public.accessibility_profiles
  WHERE ((accessibility_profiles.id = response_adaptations.target_profile) AND (accessibility_profiles.user_id = auth.uid())))));


--
-- Name: response_latency_data; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.response_latency_data ENABLE ROW LEVEL SECURITY;

--
-- Name: response_latency_data response_latency_data_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY response_latency_data_policy ON public.response_latency_data USING ((user_id = auth.uid()));


--
-- Name: reward_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_assessments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

--
-- Name: risk_assessments risk_assessments_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY risk_assessments_policy ON public.risk_assessments USING ((user_id = auth.uid()));


--
-- Name: safety_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: safety_incidents safety_incidents_user_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY safety_incidents_user_access ON public.safety_incidents USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'admin'::text) OR (users.role = 'safety_officer'::text)))))));


--
-- Name: safety_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.safety_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: safety_plans safety_plans_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY safety_plans_policy ON public.safety_plans USING ((user_id = auth.uid()));


--
-- Name: schools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

--
-- Name: self_healing_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.self_healing_config ENABLE ROW LEVEL SECURITY;

--
-- Name: session_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: session_participants session_participants_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_participants_access ON public.session_participants USING (((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = session_participants.student_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM ((public.group_storytelling_sessions gss
     JOIN public.classrooms c ON ((gss.classroom_id = c.id)))
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((gss.id = session_participants.session_id) AND (t.user_id = auth.uid()))))));


--
-- Name: smart_home_devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.smart_home_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: smart_home_devices smart_home_devices_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY smart_home_devices_policy ON public.smart_home_devices USING ((user_id = auth.uid()));


--
-- Name: sonos_devices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sonos_devices ENABLE ROW LEVEL SECURITY;

--
-- Name: sonos_devices sonos_devices_service_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_devices_service_access ON public.sonos_devices TO service_role USING (true);


--
-- Name: sonos_devices sonos_devices_user_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_devices_user_isolation ON public.sonos_devices USING ((auth.uid() = user_id));


--
-- Name: sonos_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sonos_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: sonos_groups sonos_groups_service_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_groups_service_access ON public.sonos_groups TO service_role USING (true);


--
-- Name: sonos_groups sonos_groups_user_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_groups_user_isolation ON public.sonos_groups USING ((auth.uid() = user_id));


--
-- Name: sonos_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sonos_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: sonos_tokens sonos_tokens_service_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_tokens_service_access ON public.sonos_tokens TO service_role USING (true);


--
-- Name: sonos_tokens sonos_tokens_user_isolation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sonos_tokens_user_isolation ON public.sonos_tokens USING ((auth.uid() = user_id));


--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: stories stories_service_role_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_service_role_policy ON public.stories TO service_role USING (true) WITH CHECK (true);


--
-- Name: stories story_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_access ON public.stories USING ((EXISTS ( SELECT 1
   FROM public.libraries l
  WHERE ((l.id = stories.library_id) AND ((l.owner = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.library_permissions lp
          WHERE ((lp.library_id = l.id) AND (lp.user_id = auth.uid())))))))));


--
-- Name: story_choices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_choices ENABLE ROW LEVEL SECURITY;

--
-- Name: story_choices story_choices_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_choices_policy ON public.story_choices USING ((user_id = auth.uid()));


--
-- Name: story_credits_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_credits_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: story_effectiveness; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_effectiveness ENABLE ROW LEVEL SECURITY;

--
-- Name: story_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: story_feedback story_feedback_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_feedback_insert ON public.story_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: story_feedback story_feedback_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_feedback_select ON public.story_feedback FOR SELECT USING (true);


--
-- Name: story_feedback story_feedback_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_feedback_update ON public.story_feedback FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: story_interactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;

--
-- Name: story_interactions story_interactions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_interactions_policy ON public.story_interactions USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM ((public.stories s
     JOIN public.libraries l ON ((s.library_id = l.id)))
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE ((s.id = story_interactions.story_id) AND ((l.owner = auth.uid()) OR (lp.user_id = auth.uid())))))));


--
-- Name: story_lighting_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_lighting_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: story_lighting_profiles story_lighting_profiles_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_lighting_profiles_read ON public.story_lighting_profiles FOR SELECT USING (true);


--
-- Name: story_packs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_packs ENABLE ROW LEVEL SECURITY;

--
-- Name: story_packs story_packs_own_records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_packs_own_records ON public.story_packs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: story_packs story_packs_system_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_packs_system_modify ON public.story_packs USING (true) WITH CHECK (true);


--
-- Name: story_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: story_recommendations story_recommendations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_recommendations_policy ON public.story_recommendations USING ((user_id = auth.uid()));


--
-- Name: story_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: story_templates story_templates_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_templates_read ON public.story_templates FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: story_transfer_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.story_transfer_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: story_transfer_requests story_transfer_requests_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY story_transfer_requests_policy ON public.story_transfer_requests USING (((requested_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM (public.libraries l
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE (((l.id = story_transfer_requests.from_library_id) OR (l.id = story_transfer_requests.to_library_id)) AND ((l.owner = auth.uid()) OR (lp.user_id = auth.uid())))))));


--
-- Name: storytelling_traditions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.storytelling_traditions ENABLE ROW LEVEL SECURITY;

--
-- Name: storytelling_traditions storytelling_traditions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY storytelling_traditions_policy ON public.storytelling_traditions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: student_progress; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

--
-- Name: student_progress student_progress_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY student_progress_access ON public.student_progress USING (((EXISTS ( SELECT 1
   FROM public.students s
  WHERE ((s.id = student_progress.student_id) AND (s.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (((public.students s
     JOIN public.classroom_enrollments ce ON ((s.id = ce.student_id)))
     JOIN public.classrooms c ON ((ce.classroom_id = c.id)))
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((s.id = student_progress.student_id) AND (t.user_id = auth.uid()))))));


--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: students students_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY students_access ON public.students USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM ((public.classroom_enrollments ce
     JOIN public.classrooms c ON ((ce.classroom_id = c.id)))
     JOIN public.teachers t ON ((c.teacher_id = t.id)))
  WHERE ((ce.student_id = students.id) AND (t.user_id = auth.uid()))))));


--
-- Name: sub_library_avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sub_library_avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: sub_library_avatars sub_library_avatars_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sub_library_avatars_policy ON public.sub_library_avatars USING ((EXISTS ( SELECT 1
   FROM (public.libraries l
     LEFT JOIN public.library_permissions lp ON ((l.id = lp.library_id)))
  WHERE ((l.id = lp.library_id) AND ((l.owner = auth.uid()) OR ((lp.user_id = auth.uid()) AND (lp.role = ANY (ARRAY['Owner'::text, 'Admin'::text]))))))));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_user_owns_row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_user_owns_row ON public.subscriptions USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: system_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: system_alerts system_alerts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_alerts_policy ON public.system_alerts USING ((auth.role() = 'service_role'::text));


--
-- Name: system_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: system_metrics system_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY system_metrics_policy ON public.system_metrics USING ((auth.role() = 'service_role'::text));


--
-- Name: teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

--
-- Name: teachers teachers_own_data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY teachers_own_data ON public.teachers USING ((auth.uid() = user_id));


--
-- Name: therapeutic_pathways; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.therapeutic_pathways ENABLE ROW LEVEL SECURITY;

--
-- Name: therapeutic_pathways therapeutic_pathways_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY therapeutic_pathways_policy ON public.therapeutic_pathways USING ((user_id = auth.uid()));


--
-- Name: universal_platform_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.universal_platform_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: universal_platform_configs universal_platform_configs_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY universal_platform_configs_policy ON public.universal_platform_configs USING ((auth.role() = 'service_role'::text));


--
-- Name: user_context_separations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_context_separations ENABLE ROW LEVEL SECURITY;

--
-- Name: user_context_separations user_context_separations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_context_separations_policy ON public.user_context_separations USING (((primary_user_id = auth.uid()) OR (auth.uid() = ANY (all_user_ids)) OR (EXISTS ( SELECT 1
   FROM (public.library_permissions lp
     JOIN public.libraries l ON ((l.id = lp.library_id)))
  WHERE ((l.owner = user_context_separations.primary_user_id) AND (lp.user_id = auth.uid()))))));


--
-- Name: user_hue_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_hue_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences user_preferences_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_preferences_policy ON public.user_preferences USING ((user_id = auth.uid()));


--
-- Name: user_tiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_tiers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_policy ON public.users USING ((auth.uid() = id));


--
-- Name: vocabulary_adaptations vocabulary_adaptations_read_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vocabulary_adaptations_read_policy ON public.vocabulary_adaptations FOR SELECT USING (true);


--
-- Name: vocabulary_adaptations vocabulary_adaptations_write_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vocabulary_adaptations_write_policy ON public.vocabulary_adaptations FOR INSERT WITH CHECK (false);


--
-- Name: vocabulary_usage_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vocabulary_usage_log ENABLE ROW LEVEL SECURITY;

--
-- Name: vocabulary_usage_log vocabulary_usage_log_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY vocabulary_usage_log_policy ON public.vocabulary_usage_log USING ((auth.uid() = user_id));


--
-- Name: voice_analysis_results; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_analysis_results ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_analysis_results voice_analysis_results_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_analysis_results_policy ON public.voice_analysis_results USING ((user_id = auth.uid()));


--
-- Name: voice_clones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_clones ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_clones voice_clones_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_clones_policy ON public.voice_clones USING ((user_id = auth.uid()));


--
-- Name: voice_codes voice_code_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_code_access ON public.voice_codes USING ((email IN ( SELECT users.email
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: voice_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_cost_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_cost_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_cost_tracking voice_cost_tracking_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_cost_tracking_policy ON public.voice_cost_tracking USING (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


--
-- Name: voice_pace_adjustments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_pace_adjustments ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_pace_adjustments voice_pace_adjustments_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_pace_adjustments_policy ON public.voice_pace_adjustments USING ((auth.uid() = user_id));


--
-- Name: voice_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_preferences voice_preferences_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_preferences_policy ON public.voice_preferences USING ((user_id = auth.uid()));


--
-- Name: voice_synthesis_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_synthesis_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_synthesis_metrics voice_synthesis_metrics_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY voice_synthesis_metrics_policy ON public.voice_synthesis_metrics USING (((user_id = auth.uid()) OR (auth.role() = 'service_role'::text)));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries webhook_deliveries_user_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_deliveries_user_policy ON public.webhook_deliveries USING ((EXISTS ( SELECT 1
   FROM public.webhooks w
  WHERE ((w.id = webhook_deliveries.webhook_id) AND ((w.user_id = auth.uid()) OR (auth.role() = 'service_role'::text))))));


--
-- Name: webhook_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_registrations webhook_registrations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_registrations_policy ON public.webhook_registrations USING ((auth.role() = 'service_role'::text));


--
-- Name: webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: webhooks webhooks_user_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhooks_user_policy ON public.webhooks USING (((auth.uid() = user_id) OR (auth.role() = 'service_role'::text)));


--
-- Name: webvtt_files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webvtt_files ENABLE ROW LEVEL SECURITY;

--
-- Name: webvtt_generation_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webvtt_generation_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: webvtt_word_timestamps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webvtt_word_timestamps ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


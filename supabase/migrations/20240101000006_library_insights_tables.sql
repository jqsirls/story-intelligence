-- Library insights and sub-library enhancements
-- This migration adds tables for library insights and sub-library features

-- Library insights table for pattern analysis
CREATE TABLE library_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries NOT NULL UNIQUE,
  total_stories INTEGER DEFAULT 0,
  total_characters INTEGER DEFAULT 0,
  most_active_user UUID REFERENCES users,
  story_completion_rate NUMERIC CHECK (story_completion_rate BETWEEN 0 AND 100) DEFAULT 0,
  average_story_rating NUMERIC CHECK (average_story_rating BETWEEN 0 AND 5),
  popular_story_types TEXT[] DEFAULT '{}',
  emotional_patterns JSONB DEFAULT '[]',
  usage_statistics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sub-library avatars for child profiles (no photos, only avatar selections)
CREATE TABLE sub_library_avatars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_id UUID REFERENCES libraries NOT NULL UNIQUE,
  avatar_type TEXT CHECK (avatar_type IN ('animal', 'character', 'symbol', 'color')) NOT NULL,
  avatar_data JSONB NOT NULL, -- Contains avatar configuration (animal type, colors, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story transfer requests for library-to-library transfers
CREATE TABLE story_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories NOT NULL,
  from_library_id UUID REFERENCES libraries NOT NULL,
  to_library_id UUID REFERENCES libraries NOT NULL,
  requested_by UUID REFERENCES users NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')) DEFAULT 'pending',
  transfer_message TEXT,
  response_message TEXT,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Character sharing across libraries
CREATE TABLE character_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters NOT NULL,
  source_library_id UUID REFERENCES libraries NOT NULL,
  target_library_id UUID REFERENCES libraries NOT NULL,
  share_type TEXT CHECK (share_type IN ('copy', 'reference')) NOT NULL,
  shared_by UUID REFERENCES users NOT NULL,
  new_character_id UUID REFERENCES characters, -- For 'copy' type shares
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emotional check-ins scoped to sub-libraries
ALTER TABLE emotions ADD COLUMN IF NOT EXISTS sub_library_id UUID REFERENCES libraries;

-- Add indexes for performance
CREATE INDEX idx_library_insights_library_id ON library_insights(library_id);
CREATE INDEX idx_library_insights_updated_at ON library_insights(updated_at);
CREATE INDEX idx_sub_library_avatars_library_id ON sub_library_avatars(library_id);
CREATE INDEX idx_story_transfer_requests_story_id ON story_transfer_requests(story_id);
CREATE INDEX idx_story_transfer_requests_from_library ON story_transfer_requests(from_library_id);
CREATE INDEX idx_story_transfer_requests_to_library ON story_transfer_requests(to_library_id);
CREATE INDEX idx_story_transfer_requests_status ON story_transfer_requests(status);
CREATE INDEX idx_story_transfer_requests_expires_at ON story_transfer_requests(expires_at);
CREATE INDEX idx_character_shares_character_id ON character_shares(character_id);
CREATE INDEX idx_character_shares_source_library ON character_shares(source_library_id);
CREATE INDEX idx_character_shares_target_library ON character_shares(target_library_id);
CREATE INDEX idx_emotions_sub_library_id ON emotions(sub_library_id) WHERE sub_library_id IS NOT NULL;

-- Enable RLS on new tables
ALTER TABLE library_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_library_avatars ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Library insights - users can only see insights for libraries they have access to
CREATE POLICY library_insights_policy ON library_insights
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

-- Sub-library avatars - users can only manage avatars for libraries they have admin access to
CREATE POLICY sub_library_avatars_policy ON sub_library_avatars
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM libraries l
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE l.id = library_id AND (
        l.owner = auth.uid() OR 
        (lp.user_id = auth.uid() AND lp.role IN ('Owner', 'Admin'))
      )
    )
  );

-- Story transfer requests - users can see requests for libraries they have access to
CREATE POLICY story_transfer_requests_policy ON story_transfer_requests
  FOR ALL USING (
    requested_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM libraries l
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE (l.id = from_library_id OR l.id = to_library_id) AND (
        l.owner = auth.uid() OR 
        lp.user_id = auth.uid()
      )
    )
  );

-- Character shares - users can see shares for libraries they have access to
CREATE POLICY character_shares_policy ON character_shares
  FOR ALL USING (
    shared_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM libraries l
      LEFT JOIN library_permissions lp ON l.id = lp.library_id
      WHERE (l.id = source_library_id OR l.id = target_library_id) AND (
        l.owner = auth.uid() OR 
        lp.user_id = auth.uid()
      )
    )
  );

-- Function to create sub-library with avatar
CREATE OR REPLACE FUNCTION create_sub_library_with_avatar(
  p_parent_library_id UUID,
  p_name TEXT,
  p_avatar_type TEXT,
  p_avatar_data JSONB
)
RETURNS UUID AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle story transfer requests
CREATE OR REPLACE FUNCTION create_story_transfer_request(
  p_story_id UUID,
  p_to_library_id UUID,
  p_transfer_message TEXT DEFAULT NULL
)
RETURNS UUID AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept/reject story transfer
CREATE OR REPLACE FUNCTION respond_to_story_transfer(
  p_transfer_id UUID,
  p_response TEXT, -- 'accepted' or 'rejected'
  p_response_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to share character across libraries
CREATE OR REPLACE FUNCTION share_character(
  p_character_id UUID,
  p_target_library_id UUID,
  p_share_type TEXT -- 'copy' or 'reference'
)
RETURNS UUID AS $
DECLARE
  character_record RECORD;
  source_library_id UUID;
  new_character_id UUID;
  share_id UUID;
BEGIN
  -- Get character and source library
  SELECT c.*, s.library_id INTO character_record, source_library_id
  FROM characters c
  JOIN stories s ON c.story_id = s.id
  WHERE c.id = p_character_id;
  
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get hierarchical library access (parent can see all sub-library stories)
CREATE OR REPLACE FUNCTION get_hierarchical_library_stories(p_library_id UUID)
RETURNS TABLE(
  story_id UUID,
  library_id UUID,
  library_name TEXT,
  title TEXT,
  content JSONB,
  status TEXT,
  age_rating INTEGER,
  created_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ
) AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get emotional patterns scoped to sub-library
CREATE OR REPLACE FUNCTION get_sub_library_emotional_patterns(
  p_sub_library_id UUID,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
  mood TEXT,
  frequency BIGINT,
  avg_confidence NUMERIC,
  trend TEXT
) AS $
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
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for expired transfer requests
CREATE OR REPLACE FUNCTION cleanup_expired_transfer_requests()
RETURNS INTEGER AS $
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE story_transfer_requests
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_sub_library_with_avatar(UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_story_transfer_request(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_to_story_transfer(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION share_character(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_hierarchical_library_stories(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sub_library_emotional_patterns(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_transfer_requests() TO service_role;

-- Update data retention policies
INSERT INTO data_retention_policies (table_name, retention_period, deletion_strategy) VALUES
('story_transfer_requests', INTERVAL '90 days', 'hard_delete'),
('character_shares', INTERVAL '365 days', 'soft_delete'),
('library_insights', INTERVAL '2 years', 'anonymize');
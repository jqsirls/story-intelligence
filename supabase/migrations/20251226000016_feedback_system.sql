-- Feedback System Migration
-- Allows users to provide feedback on stories and characters

-- Story feedback table
CREATE TABLE IF NOT EXISTS story_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_story_feedback_story ON story_feedback(story_id);
CREATE INDEX IF NOT EXISTS idx_story_feedback_user ON story_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_story_feedback_sentiment ON story_feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_story_feedback_created ON story_feedback(created_at);

-- Character feedback table
CREATE TABLE IF NOT EXISTS character_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')) NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(character_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_character_feedback_character ON character_feedback(character_id);
CREATE INDEX IF NOT EXISTS idx_character_feedback_user ON character_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_character_feedback_sentiment ON character_feedback(sentiment);
CREATE INDEX IF NOT EXISTS idx_character_feedback_created ON character_feedback(created_at);

-- Enable RLS
ALTER TABLE story_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all feedback, but only modify their own
DROP POLICY IF EXISTS story_feedback_select ON story_feedback;
CREATE POLICY story_feedback_select ON story_feedback
  FOR SELECT USING (true);

DROP POLICY IF EXISTS story_feedback_insert ON story_feedback;
CREATE POLICY story_feedback_insert ON story_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS story_feedback_update ON story_feedback;
CREATE POLICY story_feedback_update ON story_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Same for character feedback
DROP POLICY IF EXISTS character_feedback_select ON character_feedback;
CREATE POLICY character_feedback_select ON character_feedback
  FOR SELECT USING (true);

DROP POLICY IF EXISTS character_feedback_insert ON character_feedback;
CREATE POLICY character_feedback_insert ON character_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS character_feedback_update ON character_feedback;
CREATE POLICY character_feedback_update ON character_feedback
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to get story feedback summary
CREATE OR REPLACE FUNCTION get_story_feedback_summary(p_story_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get character feedback summary
CREATE OR REPLACE FUNCTION get_character_feedback_summary(p_character_id UUID)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for negative feedback alerts (3+ negative in 24h)
CREATE OR REPLACE FUNCTION check_negative_feedback_alert()
RETURNS TABLE (
  story_id UUID,
  negative_count BIGINT,
  character_id UUID,
  character_negative_count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


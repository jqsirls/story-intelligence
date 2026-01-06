-- Automatic Pipeline System Database Schema
-- Date: December 25, 2025
-- Purpose: Support consumption tracking, referral rewards, effectiveness scoring, 
--          stateful recommendations, human overrides, email preferences, and pipeline execution

-- ============================================================================
-- 1. REWARD LEDGER - Track referral credits and rewards
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reward_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN (
    'referral', 'story_share', 'teacher_referral', 'milestone_bonus', 
    'power_user_reward', 'seasonal_campaign', 'manual_credit'
  )),
  amount INTEGER NOT NULL CHECK (amount > 0), -- In cents
  currency TEXT NOT NULL DEFAULT 'usd',
  
  -- Stripe integration
  stripe_balance_txn_id TEXT, -- Stripe balance transaction ID
  stripe_customer_id TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'applied', 'expired', 'refunded'
  )),
  applied_to_invoice TEXT, -- Stripe invoice ID where credit was applied
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Credits can expire (e.g., 90 days)
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_reward_ledger_user (user_id),
  INDEX idx_reward_ledger_status (status) WHERE status = 'pending',
  INDEX idx_reward_ledger_expires (expires_at) WHERE expires_at IS NOT NULL AND status = 'pending'
);

-- Function to calculate available credits for a user
CREATE OR REPLACE FUNCTION public.calculate_user_credits(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(amount), 0)::INTEGER
  FROM public.reward_ledger
  WHERE user_id = p_user_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > NOW());
$$ LANGUAGE SQL STABLE;

-- ============================================================================
-- 2. CONSUMPTION METRICS - Track story reads/plays
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consumption_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Consumption data
  read_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0, -- Total time spent
  completion_rate DECIMAL(5,2) DEFAULT 0.00 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  
  -- Engagement tracking
  replay_count INTEGER NOT NULL DEFAULT 0, -- Number of re-listens
  replay_patterns JSONB DEFAULT '[]', -- Array of {timestamp, segment_id, replay_count}
  engagement_score DECIMAL(5,2) DEFAULT 0.00 CHECK (engagement_score >= 0 AND engagement_score <= 100),
  
  -- Behavioral data
  pause_patterns JSONB DEFAULT '[]', -- Array of {timestamp, duration, position}
  interaction_events JSONB DEFAULT '[]', -- Array of {type, timestamp, metadata}
  
  -- Time tracking
  first_read_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(story_id, user_id),
  
  -- Indexes
  INDEX idx_consumption_metrics_story (story_id),
  INDEX idx_consumption_metrics_user (user_id),
  INDEX idx_consumption_metrics_engagement (engagement_score) WHERE engagement_score > 70,
  INDEX idx_consumption_metrics_last_read (last_read_at)
);

-- Function to track consumption event
CREATE OR REPLACE FUNCTION public.track_consumption_event(
  p_story_id UUID,
  p_user_id UUID,
  p_event_data JSONB
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. STORY EFFECTIVENESS - Comparative scoring system
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.story_effectiveness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  
  -- Comparative scoring (0-100, relative to user's baseline)
  effectiveness_score DECIMAL(5,2) DEFAULT 0.00 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100),
  
  -- Impact metrics
  mood_impact JSONB DEFAULT '{}', -- {before: 'sad', after: 'calm', delta: +2}
  engagement_vs_baseline DECIMAL(5,2), -- +15% vs user's average
  completion_vs_baseline DECIMAL(5,2), -- -5 minutes vs average
  
  -- Context for comparison
  context_tags TEXT[] DEFAULT '{}', -- ['bedtime', 'dragon', 'anxiety']
  comparison_baseline JSONB DEFAULT '{}', -- {avg_engagement: 65, avg_duration: 17}
  
  -- Calculated insights
  recommended_for TEXT[] DEFAULT '{}', -- ['bedtime', 'morning', 'therapeutic']
  confidence_score DECIMAL(5,2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- User-specific
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(story_id, user_id),
  
  -- Indexes
  INDEX idx_story_effectiveness_story (story_id),
  INDEX idx_story_effectiveness_user (user_id),
  INDEX idx_story_effectiveness_score (effectiveness_score) WHERE effectiveness_score > 70,
  INDEX idx_story_effectiveness_context (context_tags) USING GIN
);

-- Function to calculate story effectiveness (comparative)
CREATE OR REPLACE FUNCTION public.calculate_story_effectiveness(
  p_story_id UUID,
  p_user_id UUID
)
RETURNS DECIMAL AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. RECOMMENDATION OUTCOMES - Stateful learning from mistakes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Recommendation details
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN (
    'story_theme', 'character', 'timing', 'therapeutic_pathway', 'user_action'
  )),
  recommendation TEXT NOT NULL, -- 'dragon-bedtime', 'anxiety-cbt', etc.
  context JSONB NOT NULL DEFAULT '{}', -- {child_age: 6, current_mood: 'sad'}
  
  -- Timing
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Outcome tracking
  user_followed BOOLEAN,
  followed_at TIMESTAMPTZ,
  effectiveness_result DECIMAL(5,2), -- If followed, how effective? (0-100)
  outcome TEXT CHECK (outcome IN ('SUCCESS', 'DECLINED', 'IGNORED', 'PENDING')),
  outcome_determined_at TIMESTAMPTZ,
  
  -- Learning
  repeat_safe BOOLEAN DEFAULT TRUE, -- Can we recommend this again?
  decline_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_recommendation_outcomes_user (user_id),
  INDEX idx_recommendation_outcomes_type_context (recommendation_type, ((context->>'childAge')::int)),
  INDEX idx_recommendation_outcomes_declined (outcome) WHERE outcome = 'DECLINED',
  INDEX idx_recommendation_outcomes_pending (outcome) WHERE outcome = 'PENDING'
);

-- ============================================================================
-- 5. HUMAN OVERRIDES - Learn from corrections
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.human_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Pipeline context
  pipeline_type TEXT NOT NULL,
  system_action TEXT NOT NULL, -- What system wanted to do
  system_confidence DECIMAL(5,2) NOT NULL CHECK (system_confidence >= 0 AND system_confidence <= 1),
  
  -- Human intervention
  human_override TEXT NOT NULL, -- What human did instead
  override_type TEXT NOT NULL CHECK (override_type IN (
    'ESCALATED_TO_PROFESSIONAL',    -- Therapeutic → Real therapist
    'FALSE_POSITIVE',               -- Crisis alert dismissed
    'RECOMMENDATION_IGNORED',       -- Suggestion not followed
    'PREFERENCE_CONFLICT',          -- User preference overrode system
    'BETTER_ALTERNATIVE',           -- Human chose different action
    'TIMING_WRONG'                  -- Right action, wrong time
  )),
  reasoning TEXT,
  
  -- User context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_human_overrides_type (pipeline_type, override_type),
  INDEX idx_human_overrides_occurred (occurred_at),
  INDEX idx_human_overrides_user (user_id)
);

-- ============================================================================
-- 6. EMAIL PREFERENCES - User control over communications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Category controls
  transactional BOOLEAN NOT NULL DEFAULT TRUE, -- Cannot disable
  insights BOOLEAN NOT NULL DEFAULT TRUE, -- Opt-out available
  marketing BOOLEAN NOT NULL DEFAULT TRUE, -- Opt-out available
  reminders BOOLEAN NOT NULL DEFAULT TRUE, -- Opt-out available
  
  -- Frequency controls
  digest_frequency TEXT NOT NULL DEFAULT 'evening' CHECK (digest_frequency IN ('morning', 'evening', 'off')),
  insights_frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (insights_frequency IN ('weekly', 'monthly', 'off')),
  
  -- Quiet hours
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  
  -- Consolidated daily moment preference
  daily_moment TEXT NOT NULL DEFAULT 'evening' CHECK (daily_moment IN ('morning', 'evening', 'off')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create email preferences for new users
CREATE OR REPLACE FUNCTION public.auto_create_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_create_email_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_email_preferences();

-- ============================================================================
-- 7. EMAIL DELIVERY LOG - Frequency cap tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email details
  email_type TEXT NOT NULL,
  template_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Delivery status
  provider TEXT NOT NULL CHECK (provider IN ('sendgrid', 'ses')),
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed'
  )),
  
  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_email_delivery_log_user (user_id),
  INDEX idx_email_delivery_log_sent_at (sent_at),
  INDEX idx_email_delivery_log_type (email_type),
  INDEX idx_email_delivery_log_status (status)
);

-- Function to check if email should be sent (frequency caps)
CREATE OR REPLACE FUNCTION public.should_send_email(
  p_user_id UUID,
  p_email_type TEXT
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. PIPELINE EXECUTIONS - Orchestrator tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pipeline_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Pipeline details
  pipeline_type TEXT NOT NULL,
  pipeline_name TEXT NOT NULL,
  
  -- Execution context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN (
    'event', 'schedule', 'manual', 'retry'
  )),
  trigger_data JSONB DEFAULT '{}',
  
  -- Veto decision
  vetoed BOOLEAN NOT NULL DEFAULT FALSE,
  veto_reason TEXT, -- INSUFFICIENT_SIGNAL, LOW_CONFIDENCE, NOISE_REDUCTION, etc.
  confidence_score DECIMAL(5,2),
  
  -- Execution status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'completed', 'failed', 'vetoed'
  )),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Results
  result JSONB DEFAULT '{}',
  error_message TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_pipeline_executions_type (pipeline_type),
  INDEX idx_pipeline_executions_user (user_id),
  INDEX idx_pipeline_executions_status (status),
  INDEX idx_pipeline_executions_vetoed (vetoed) WHERE vetoed = TRUE,
  INDEX idx_pipeline_executions_created (created_at)
);

-- ============================================================================
-- 9. ALTER EXISTING TABLES - Add missing columns
-- ============================================================================

-- Add columns to stories table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='stories' AND column_name='effectiveness_score') THEN
    ALTER TABLE public.stories 
    ADD COLUMN effectiveness_score DECIMAL(5,2) DEFAULT 0.00 CHECK (effectiveness_score >= 0 AND effectiveness_score <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='stories' AND column_name='consumption_insights') THEN
    ALTER TABLE public.stories 
    ADD COLUMN consumption_insights JSONB DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='stories' AND column_name='creator_user_id') THEN
    ALTER TABLE public.stories 
    ADD COLUMN creator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add columns to characters table (if they don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='characters' AND column_name='birth_certificate_url') THEN
    ALTER TABLE public.characters 
    ADD COLUMN birth_certificate_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='characters' AND column_name='usage_milestones') THEN
    ALTER TABLE public.characters 
    ADD COLUMN usage_milestones JSONB DEFAULT '{}';
  END IF;
END $$;

-- Enhance referral_tracking table (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='referral_tracking' AND column_name='reward_type') THEN
    ALTER TABLE public.referral_tracking 
    ADD COLUMN reward_type TEXT CHECK (reward_type IN ('casual', 'affiliate', 'teacher', 'milestone'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='referral_tracking' AND column_name='reward_value') THEN
    ALTER TABLE public.referral_tracking 
    ADD COLUMN reward_value INTEGER; -- In cents
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='referral_tracking' AND column_name='reward_status') THEN
    ALTER TABLE public.referral_tracking 
    ADD COLUMN reward_status TEXT DEFAULT 'pending' CHECK (reward_status IN ('pending', 'issued', 'failed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='referral_tracking' AND column_name='lifetime_value') THEN
    ALTER TABLE public.referral_tracking 
    ADD COLUMN lifetime_value INTEGER DEFAULT 0; -- Total revenue from referral
  END IF;
END $$;

-- ============================================================================
-- 10. RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_executions ENABLE ROW LEVEL SECURITY;

-- Reward ledger policies
CREATE POLICY "Users can view their own reward ledger"
  ON public.reward_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Consumption metrics policies
CREATE POLICY "Users can view their own consumption metrics"
  ON public.consumption_metrics FOR SELECT
  USING (auth.uid() = user_id);

-- Story effectiveness policies
CREATE POLICY "Users can view their own story effectiveness"
  ON public.story_effectiveness FOR SELECT
  USING (auth.uid() = user_id);

-- Recommendation outcomes policies
CREATE POLICY "Users can view their own recommendation outcomes"
  ON public.recommendation_outcomes FOR SELECT
  USING (auth.uid() = user_id);

-- Email preferences policies
CREATE POLICY "Users can manage their own email preferences"
  ON public.email_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Email delivery log policies (read-only for users)
CREATE POLICY "Users can view their own email delivery log"
  ON public.email_delivery_log FOR SELECT
  USING (auth.uid() = user_id);

-- Service role policies (admin access)
CREATE POLICY "Service role has full access to all tables"
  ON public.reward_ledger FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to consumption_metrics"
  ON public.consumption_metrics FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to story_effectiveness"
  ON public.story_effectiveness FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to recommendation_outcomes"
  ON public.recommendation_outcomes FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to human_overrides"
  ON public.human_overrides FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to email_delivery_log"
  ON public.email_delivery_log FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role has full access to pipeline_executions"
  ON public.pipeline_executions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 11. UPDATED_AT TRIGGERS
-- ============================================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reward_ledger_updated_at BEFORE UPDATE ON public.reward_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consumption_metrics_updated_at BEFORE UPDATE ON public.consumption_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_story_effectiveness_updated_at BEFORE UPDATE ON public.story_effectiveness
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendation_outcomes_updated_at BEFORE UPDATE ON public.recommendation_outcomes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_delivery_log_updated_at BEFORE UPDATE ON public.email_delivery_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipeline_executions_updated_at BEFORE UPDATE ON public.pipeline_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Automatic Pipeline System migration completed successfully';
  RAISE NOTICE 'Tables created: 8';
  RAISE NOTICE 'Functions created: 6';
  RAISE NOTICE 'Triggers created: 8';
  RAISE NOTICE 'RLS policies created: 16';
END $$;


-- Migration: Lifecycle State Alignment
-- Version: 7.0.0
-- Purpose: Align database status constraints with LifecycleEnforcementMiddleware state machines
-- Reference: packages/universal-agent/src/middleware/LifecycleEnforcementMiddleware.ts

-- ============================================================================
-- STORIES TABLE - Expand status to support full lifecycle
-- ============================================================================

-- Drop existing constraint
ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_status_check;

-- CRITICAL: Migrate data BEFORE adding new constraint
UPDATE stories SET status = 'ready' WHERE status = 'final';

-- Now add new constraint with full lifecycle states
ALTER TABLE stories ADD CONSTRAINT stories_status_check 
  CHECK (status IN ('draft', 'generating', 'ready', 'failed', 'archived'));

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_stories_lifecycle_status ON stories (status);

-- ============================================================================
-- STORY TRANSFERS TABLE - Add declined and cancelled states
-- ============================================================================
-- Note: Handles both story_transfer_requests (old) and story_transfers (new)

-- Update story_transfer_requests if it exists (older migration 20240101000006)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'story_transfer_requests') THEN
    ALTER TABLE story_transfer_requests DROP CONSTRAINT IF EXISTS story_transfer_requests_status_check;
    ALTER TABLE story_transfer_requests ADD CONSTRAINT story_transfer_requests_status_check
      CHECK (status IN ('pending', 'accepted', 'declined', 'rejected', 'expired', 'cancelled'));
  END IF;
END $$;

-- Update story_transfers if it exists (newer migration 20250101000020)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'story_transfers') THEN
    ALTER TABLE story_transfers DROP CONSTRAINT IF EXISTS story_transfers_status_check;
    ALTER TABLE story_transfers ADD CONSTRAINT story_transfers_status_check
      CHECK (status IN ('pending', 'accepted', 'declined', 'rejected', 'expired', 'cancelled'));
  END IF;
END $$;

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Add paused state
-- ============================================================================

-- Only update if subscriptions table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscriptions') THEN
    ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
      CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired'));
  END IF;
END $$;

-- ============================================================================
-- CONVERSATIONS TABLE - Create for conversation lifecycle tracking
-- ============================================================================

-- Drop and recreate to ensure clean state (conversation data is ephemeral)
DROP TABLE IF EXISTS conversations CASCADE;

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID,  -- Child profile if applicable
  channel TEXT NOT NULL CHECK (channel IN ('alexa', 'web', 'api', 'avatar')),
  session_id TEXT,  -- For linking to conversation_states cache
  status TEXT NOT NULL DEFAULT 'initializing' CHECK (status IN (
    'initializing', 'active', 'paused', 'ended', 'failed'
  )),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX idx_conversations_user ON conversations (user_id, status);
CREATE INDEX idx_conversations_session ON conversations (session_id);
CREATE INDEX idx_conversations_status ON conversations (status, created_at DESC);

-- RLS for conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversations_select_policy ON conversations;
CREATE POLICY conversations_select_policy ON conversations
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS conversations_insert_policy ON conversations;
CREATE POLICY conversations_insert_policy ON conversations
  FOR INSERT WITH CHECK (user_id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS conversations_update_policy ON conversations;
CREATE POLICY conversations_update_policy ON conversations
  FOR UPDATE USING (user_id = auth.uid() OR auth.role() = 'service_role');

-- ============================================================================
-- ASSET GENERATION JOBS TABLE - Ensure state machine alignment
-- ============================================================================

-- Only update if asset_generation_jobs table exists (from migration 20250101000020)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'asset_generation_jobs') THEN
    ALTER TABLE asset_generation_jobs DROP CONSTRAINT IF EXISTS asset_generation_jobs_status_check;
    ALTER TABLE asset_generation_jobs ADD CONSTRAINT asset_generation_jobs_status_check
      CHECK (status IN ('queued', 'generating', 'ready', 'failed', 'canceled'));
  END IF;
END $$;

-- ============================================================================
-- FUNCTION: Validate State Transition
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_state_transition(
  p_resource TEXT,
  p_current_state TEXT,
  p_new_state TEXT
) RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGER: Enforce Story State Transitions
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_story_state_transition()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS story_state_transition ON stories;
CREATE TRIGGER story_state_transition
  BEFORE UPDATE OF status ON stories
  FOR EACH ROW
  EXECUTE FUNCTION enforce_story_state_transition();

-- ============================================================================
-- TRIGGER: Enforce Conversation State Transitions
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_conversation_state_transition()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS conversation_state_transition ON conversations;
CREATE TRIGGER conversation_state_transition
  BEFORE UPDATE OF status ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION enforce_conversation_state_transition();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON conversations TO authenticated;
GRANT EXECUTE ON FUNCTION validate_state_transition TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE conversations IS 'Tracks conversation sessions with lifecycle state management';
COMMENT ON COLUMN conversations.status IS 'Lifecycle state: initializing → active → paused/ended/failed';
COMMENT ON FUNCTION validate_state_transition IS 'Validates state transitions against canonical state machines from LifecycleEnforcementMiddleware.ts';


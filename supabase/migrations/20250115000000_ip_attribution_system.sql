-- IP Attribution System Migration
-- Adds metadata field to stories table and creates IP dispute and audit tables

-- Add metadata JSONB field to stories table if it doesn't exist
ALTER TABLE stories ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create IP disputes table
CREATE TABLE IF NOT EXISTS ip_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  dispute_type TEXT NOT NULL CHECK (dispute_type IN ('missed_detection', 'false_positive', 'rights_holder_claim', 'user_question')),
  character_name TEXT NOT NULL,
  franchise TEXT,
  owner TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewing', 'resolved', 'escalated')) DEFAULT 'pending',
  resolution TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  legal_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create IP detection audit table
CREATE TABLE IF NOT EXISTS ip_detection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE,
  detection_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detection_method TEXT, -- 'automatic', 'manual', 'user_report', 'rights_holder'
  detected_characters JSONB, -- Array of detected IP
  confidence_scores JSONB,
  attribution_added BOOLEAN NOT NULL DEFAULT FALSE,
  attribution_displayed_at TIMESTAMPTZ,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ip_disputes_story_id ON ip_disputes(story_id);
CREATE INDEX IF NOT EXISTS idx_ip_disputes_status ON ip_disputes(status);
CREATE INDEX IF NOT EXISTS idx_ip_disputes_created_at ON ip_disputes(created_at);
CREATE INDEX IF NOT EXISTS idx_ip_disputes_reported_by ON ip_disputes(reported_by);
CREATE INDEX IF NOT EXISTS idx_ip_disputes_legal_escalated ON ip_disputes(legal_escalated);

CREATE INDEX IF NOT EXISTS idx_ip_audit_story_id ON ip_detection_audit(story_id);
CREATE INDEX IF NOT EXISTS idx_ip_audit_timestamp ON ip_detection_audit(detection_timestamp);
CREATE INDEX IF NOT EXISTS idx_ip_audit_user_id ON ip_detection_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_audit_method ON ip_detection_audit(detection_method);

-- Enable Row Level Security
ALTER TABLE ip_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ip_detection_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ip_disputes
-- Users can view their own disputes
CREATE POLICY ip_disputes_user_select ON ip_disputes
  FOR SELECT
  USING (auth.uid() = reported_by);

-- Staff can view all disputes
CREATE POLICY ip_disputes_staff_select ON ip_disputes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        SELECT email FROM users WHERE email LIKE '%@storytailor.com'
      )
    )
  );

-- Users can create disputes
CREATE POLICY ip_disputes_user_insert ON ip_disputes
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by OR reported_by IS NULL);

-- Staff can update disputes
CREATE POLICY ip_disputes_staff_update ON ip_disputes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        SELECT email FROM users WHERE email LIKE '%@storytailor.com'
      )
    )
  );

-- RLS Policies for ip_detection_audit
-- Staff can view all audit records
CREATE POLICY ip_audit_staff_select ON ip_detection_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        SELECT email FROM users WHERE email LIKE '%@storytailor.com'
      )
    )
  );

-- System can insert audit records (via service role)
CREATE POLICY ip_audit_system_insert ON ip_detection_audit
  FOR INSERT
  WITH CHECK (true);

-- Add comment to metadata column
COMMENT ON COLUMN stories.metadata IS 'JSONB field for story metadata including IP attributions';

-- Add comments to tables
COMMENT ON TABLE ip_disputes IS 'Tracks IP attribution disputes and user reports';
COMMENT ON TABLE ip_detection_audit IS 'Audit trail for IP detection attempts and attribution display';

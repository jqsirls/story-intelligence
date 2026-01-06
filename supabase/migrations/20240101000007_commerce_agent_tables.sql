-- Commerce Agent Tables for Subscription Management
-- This migration creates tables for subscription management, organization accounts,
-- invite discounts, and referral tracking

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired', 'trialing')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization accounts table
CREATE TABLE IF NOT EXISTS organization_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  subscription_id TEXT NOT NULL,
  seat_count INTEGER NOT NULL DEFAULT 1,
  used_seats INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_seat_usage CHECK (used_seats <= seat_count)
);

-- Organization members table (for seat management)
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organization_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Invite discounts table
CREATE TABLE IF NOT EXISTS invite_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('user_invite', 'story_transfer')),
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  valid_until TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral tracking table
CREATE TABLE IF NOT EXISTS referral_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  discount_code TEXT REFERENCES invite_discounts(code) ON DELETE SET NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0, -- In cents
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(referrer_id, referee_id)
);

-- Billing events table for audit trail
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  event_data JSONB,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_organization_accounts_owner ON organization_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_discounts_code ON invite_discounts(code);
CREATE INDEX IF NOT EXISTS idx_invite_discounts_used_by ON invite_discounts(used_by);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referrer ON referral_tracking(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_tracking_referee ON referral_tracking(referee_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription ON billing_events(subscription_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can only see their own subscriptions
CREATE POLICY subscriptions_policy ON subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Organization accounts: Owners and members can see organization details
CREATE POLICY organization_accounts_policy ON organization_accounts
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = id AND om.user_id = auth.uid()
    )
  );

-- Organization members: Members can see other members in their organization
CREATE POLICY organization_members_policy ON organization_members
  FOR ALL USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM organization_accounts oa
      WHERE oa.id = organization_id AND oa.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_id AND om.user_id = auth.uid()
    )
  );

-- Invite discounts: Users can see discounts they created or used
CREATE POLICY invite_discounts_policy ON invite_discounts
  FOR ALL USING (
    created_by = auth.uid() OR 
    used_by = auth.uid()
  );

-- Referral tracking: Users can see their own referrals (as referrer or referee)
CREATE POLICY referral_tracking_policy ON referral_tracking
  FOR ALL USING (
    referrer_id = auth.uid() OR 
    referee_id = auth.uid()
  );

-- Billing events: Users can only see their own billing events
CREATE POLICY billing_events_policy ON billing_events
  FOR ALL USING (user_id = auth.uid());

-- Functions for subscription management

-- Function to update subscription status and permissions
CREATE OR REPLACE FUNCTION update_subscription_status(
  p_stripe_subscription_id TEXT,
  p_status TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ
)
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manage organization seats
CREATE OR REPLACE FUNCTION manage_organization_seats(
  p_organization_id UUID,
  p_action TEXT, -- 'add' or 'remove'
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invite discount code
CREATE OR REPLACE FUNCTION generate_invite_discount(
  p_created_by UUID,
  p_type TEXT,
  p_discount_percentage INTEGER,
  p_valid_days INTEGER DEFAULT 30
)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to relevant tables
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_accounts_updated_at
  BEFORE UPDATE ON organization_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
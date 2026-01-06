-- Gift Cards Migration
-- Allows users to purchase and redeem gift cards for subscription extensions

CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  type TEXT CHECK (type IN ('1_month', '3_month', '6_month', '12_month')) NOT NULL,
  value_months INTEGER NOT NULL CHECK (value_months > 0),
  purchased_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('active', 'redeemed', 'expired')) DEFAULT 'active',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- NULL = never expires
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_gift_cards_purchased_by ON gift_cards(purchased_by);
CREATE INDEX IF NOT EXISTS idx_gift_cards_redeemed_by ON gift_cards(redeemed_by);

-- Gift card redemptions (for tracking stacking)
CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gift_card_id UUID REFERENCES gift_cards(id) ON DELETE CASCADE NOT NULL,
  months_added INTEGER NOT NULL CHECK (months_added > 0),
  subscription_extended_to TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON gift_card_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_gift_card ON gift_card_redemptions(gift_card_id);

-- Enable RLS
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view gift cards they purchased or redeemed
DROP POLICY IF EXISTS gift_cards_own_records ON gift_cards;
CREATE POLICY gift_cards_own_records ON gift_cards
  FOR SELECT USING (auth.uid() = purchased_by OR auth.uid() = redeemed_by);

-- RLS Policy: System can insert/update (via service role)
DROP POLICY IF EXISTS gift_cards_system_modify ON gift_cards;
CREATE POLICY gift_cards_system_modify ON gift_cards
  FOR ALL USING (true) WITH CHECK (true);

-- RLS Policy: Users can view their own redemptions
DROP POLICY IF EXISTS redemptions_own_records ON gift_card_redemptions;
CREATE POLICY redemptions_own_records ON gift_card_redemptions
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: System can insert (via service role)
DROP POLICY IF EXISTS redemptions_system_insert ON gift_card_redemptions;
CREATE POLICY redemptions_system_insert ON gift_card_redemptions
  FOR INSERT WITH CHECK (true);

-- Function to generate unique gift card code
CREATE OR REPLACE FUNCTION generate_gift_card_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Function to redeem gift card with stacking
CREATE OR REPLACE FUNCTION redeem_gift_card(
  p_code TEXT,
  p_user_id UUID
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


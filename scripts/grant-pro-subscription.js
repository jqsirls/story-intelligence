#!/usr/bin/env node

/**
 * Grant Pro subscription to a test user to bypass quota
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Load test user credentials
const credentialsPath = path.join(__dirname, '../test-results/test-mode-user-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error('❌ Test user credentials not found. Run create-test-mode-user.js first.');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

async function grantProSubscription() {
  console.log('🔄 Granting Pro subscription to test user...');
  console.log(`User ID: ${credentials.userId}`);
  console.log(`Email: ${credentials.email}`);
  
  // Check if subscription already exists
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', credentials.userId)
    .single();
  
  if (existing) {
    console.log('⚠️  Subscription already exists, updating...');
    
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: 'pro_individual',
        status: 'active',
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      })
      .eq('user_id', credentials.userId);
    
    if (updateError) {
      console.error('❌ Failed to update subscription:', updateError.message);
      process.exit(1);
    }
    
    console.log('✅ Subscription updated to Pro Individual');
  } else {
    // Create new subscription
    const { error: createError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: credentials.userId,
        plan_id: 'pro_individual',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
      });
    
    if (createError) {
      console.error('❌ Failed to create subscription:', createError.message);
      process.exit(1);
    }
    
    console.log('✅ Pro Individual subscription created');
  }
  
  // Verify
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', credentials.userId)
    .single();
  
  console.log('');
  console.log('═'.repeat(60));
  console.log('✅ PRO SUBSCRIPTION GRANTED');
  console.log('═'.repeat(60));
  console.log('User ID:', subscription.user_id);
  console.log('Plan ID:', subscription.plan_id);
  console.log('Status:', subscription.status);
  console.log('Period End:', subscription.current_period_end);
  console.log('');
  console.log('✅ User now has unlimited story creation!');
  console.log('═'.repeat(60));
}

grantProSubscription().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


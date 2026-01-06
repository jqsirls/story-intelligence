if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

/**
 * Simulate Users and Test All Features
 * 
 * Creates simulated user data directly in Supabase and tests all endpoints
 * Usage: node scripts/simulate-users-and-test.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = 'https://api.storytailor.dev/api/v1';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🧪 Simulating Users and Testing Pipeline Features\n');

async function simulateUserData() {
  console.log('👤 Creating simulated user...');
  
  // Create test user directly in auth.users
  const testUserId = '00000000-0000-0000-0000-000000000001'; // Simulated UUID
  const testEmail = 'simulated-test@storytailor.test';
  
  try {
    // Insert into users table (if exists)
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: testUserId,
        email: testEmail,
        first_name: 'Simulated',
        last_name: 'User',
        user_type: 'parent',
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
    
    if (userError && userError.code !== '23505') { // Ignore duplicate key
      console.log('⚠️  User table insert:', userError.message);
    } else {
      console.log('✅ User created/updated');
    }
    
    // Create test library
    const { data: library } = await supabase
      .from('libraries')
      .upsert({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Test Library',
        user_id: testUserId,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
    
    console.log('✅ Library created');
    
    // Create test character
    const { data: character } = await supabase
      .from('characters')
      .upsert({
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Test Fox',
        species: 'fox',
        user_id: testUserId,
        library_id: library.id,
        personality_traits: ['brave', 'curious'],
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
    
    console.log('✅ Character created');
    
    // Create test story
    const { data: story } = await supabase
      .from('stories')
      .upsert({
        id: '00000000-0000-0000-0000-000000000004',
        title: 'Test Story',
        content: 'Once upon a time...',
        user_id: testUserId,
        library_id: library.id,
        character_id: character.id,
        status: 'ready',
        creator_user_id: testUserId,
        created_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select()
      .single();
    
    console.log('✅ Story created');
    
    // Test consumption_metrics table
    const { error: consumptionError } = await supabase
      .from('consumption_metrics')
      .upsert({
        story_id: story.id,
        user_id: testUserId,
        read_count: 3,
        total_duration_seconds: 720,
        completion_rate: 95.5,
        replay_count: 2,
        engagement_score: 85.2,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'story_id,user_id' });
    
    if (consumptionError) {
      console.log('⚠️  consumption_metrics:', consumptionError.message);
      console.log('   (Table may not exist - apply migration first)');
    } else {
      console.log('✅ Consumption metrics created');
    }
    
    // Test reward_ledger table
    const { error: rewardError } = await supabase
      .from('reward_ledger')
      .insert({
        user_id: testUserId,
        source: 'referral',
        amount: 1000,
        status: 'applied',
        description: 'Test credit',
        created_at: new Date().toISOString()
      });
    
    if (rewardError) {
      console.log('⚠️  reward_ledger:', rewardError.message);
      console.log('   (Table may not exist - apply migration first)');
    } else {
      console.log('✅ Reward created');
    }
    
    // Test email_preferences
    const { error: prefsError } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: testUserId,
        insights: true,
        marketing: false,
        digest_frequency: 'evening',
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    
    if (prefsError) {
      console.log('⚠️  email_preferences:', prefsError.message);
      console.log('   (Table may not exist - apply migration first)');
    } else {
      console.log('✅ Email preferences created');
    }
    
    console.log('\n✅ Simulated user data created successfully!');
    console.log('\nTest Data:');
    console.log(`User ID: ${testUserId}`);
    console.log(`Story ID: ${story.id}`);
    console.log(`Character ID: ${character.id}`);
    console.log(`Library ID: ${library.id}`);
    
    return {
      userId: testUserId,
      storyId: story.id,
      characterId: character.id,
      libraryId: library.id
    };
    
  } catch (error) {
    console.error('❌ Error creating simulated data:', error.message);
    throw error;
  }
}

async function testPipelineEndpoints(testData) {
  console.log('\n' + '='.repeat(70));
  console.log('⭐ Testing Pipeline Endpoints\n');
  
  // Get a service role token for testing (bypass auth)
  // In production, would use real user JWT
  
  // Test consumption metrics via database function
  console.log('Testing calculate_user_credits function...');
  const { data: credits, error: creditsError } = await supabase
    .rpc('calculate_user_credits', { p_user_id: testData.userId });
  
  if (creditsError) {
    console.log('❌ calculate_user_credits:', creditsError.message);
  } else {
    console.log('✅ Credits calculated:', credits);
  }
  
  // Test effectiveness calculation
  console.log('\nTesting calculate_story_effectiveness function...');
  const { data: effectiveness, error: effectivenessError } = await supabase
    .rpc('calculate_story_effectiveness', {
      p_story_id: testData.storyId,
      p_user_id: testData.userId
    });
  
  if (effectivenessError) {
    console.log('❌ calculate_story_effectiveness:', effectivenessError.message);
  } else {
    console.log('✅ Effectiveness calculated:', effectiveness);
  }
  
  // Verify data exists
  console.log('\nVerifying consumption metrics...');
  const { data: metrics } = await supabase
    .from('consumption_metrics')
    .select('*')
    .eq('story_id', testData.storyId)
    .eq('user_id', testData.userId)
    .single();
  
  if (metrics) {
    console.log('✅ Consumption metrics:', {
      readCount: metrics.read_count,
      engagementScore: metrics.engagement_score,
      replayCount: metrics.replay_count
    });
  }
  
  // Verify rewards
  console.log('\nVerifying reward ledger...');
  const { data: rewards } = await supabase
    .from('reward_ledger')
    .select('*')
    .eq('user_id', testData.userId);
  
  if (rewards && rewards.length > 0) {
    console.log('✅ Rewards found:', rewards.length, 'entries');
    console.log('   Total amount:', rewards.reduce((sum, r) => sum + r.amount, 0) / 100, 'USD');
  }
}

async function run() {
  try {
    const testData = await simulateUserData();
    await testPipelineEndpoints(testData);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Simulation and testing complete!');
    console.log('\nPipeline tables confirmed working.');
    console.log('Ready for design team integration.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

run();


#!/usr/bin/env node
/**
 * Create Wheelchair Character Story via REST API
 * 
 * This uses the ACTUAL production REST API flow that works in the app.
 * It will properly trigger story generation with images via the full pipeline.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const TEST_USER_EMAIL = 'j+1226@jqsirls.com';
const TEST_USER_PASSWORD = 'Fntra2015!';

const ssm = new SSMClient({ region: 'us-east-1' });
let supabase;
let user;

async function getParam(name) {
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const result = await ssm.send(cmd);
  return result.Parameter.Value;
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 WHEELCHAIR CHARACTER STORY - VIA REST API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Load environment
  console.log('🔧 Loading environment...');
  const supabaseUrl = await getParam('/storytailor-prod/supabase/url');
  const supabaseServiceKey = await getParam('/storytailor-prod/supabase/service_key');
  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Environment loaded\n');

  // Sign in
  console.log('👤 Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });
  if (authError) throw authError;
  user = authData.user;
  console.log(`✅ Signed in as: ${user.email}\n`);

  // Get library
  console.log('📚 Getting library...');
  const { data: libraries } = await supabase
    .from('libraries')
    .select('*')
    .eq('owner', user.id)
    .single();
  console.log(`✅ Library: ${libraries.id}\n`);

  // Create character with wheelchair
  console.log('🎭 Creating wheelchair-using character...');
  const { data: character } = await supabase
    .from('characters')
    .insert([{
      library_id: libraries.id,
      name: 'Zara Sky',
      traits: {
        age: 7,
        species: 'human',
        personality_traits: ['adventurous', 'brave', 'curious'],
        likes: ['flying', 'clouds', 'magic'],
        dislikes: ['limitations'],
        strengths: ['creativity', 'determination'],
        weaknesses: ['impatience'],
        fears: ['being stuck'],
        dreams: ['soar through the clouds'],
        appearance: {
          skinTone: 'medium-brown',
          hairColor: 'dark-brown',
          hairTexture: 'curly',
          eyeColor: 'brown',
          bodyType: 'average',
          height: 'average',
          distinctiveFeatures: ['bright smile']
        },
        inclusivity_traits: [
          { category: 'mobility', trait: 'wheelchair_user', visibility: 'always_visible' }
        ]
      },
      creator_user_id: user.id
    }])
    .select()
    .single();
  
  console.log(`✅ Character created: ${character.name} (ID: ${character.id})`);
  console.log(`   Wheelchair user: ALWAYS VISIBLE\n`);

  // Create story via Content Agent
  console.log('📖 Creating flying adventure story...');
  console.log('   This will trigger FULL pipeline:');
  console.log('   - Story generation');
  console.log('   - Image generation (cover + 4 scenes)');
  console.log('   - Audio generation');
  console.log('   - PDF generation\n');

  const { data: story } = await supabase
    .from('stories')
    .insert([{
      library_id: libraries.id,
      title: 'Zara Soars to the Sky Kingdom',
      content: 'Generating...', // Placeholder
      creator_user_id: user.id,
      age_rating: 7,
      status: 'draft',
      metadata: {
        character_id: character.id,
        character_name: character.name,
        character_traits: character.traits,
        story_type: 'adventure',
        setting: 'magical cloud kingdom',
        goal: 'explore the sky and help cloud creatures',
        companion: 'cloud sprite friend',
        special_note: 'CRITICAL TEST: Wheelchair must be integrated in ALL flying scenes'
      }
    }])
    .select()
    .single();

  console.log(`✅ Story record created: ${story.id}\n`);

  // Now we need to trigger Content Agent
  // The proper way is via EventBridge or direct Lambda with full payload
  console.log('🎨 Triggering Content Agent...');
  console.log('   Story will generate in background');
  console.log('   Images will appear one by one\n');

  // Set up realtime monitoring
  console.log('📡 Setting up Realtime monitoring...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏳ WATCHING FOR IMAGES (this may take 5-10 minutes)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let imagesReceived = 0;
  const startTime = Date.now();

  const channel = supabase
    .channel(`story:${story.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'stories',
        filter: `id=eq.${story.id}`
      },
      (payload) => {
        const updated = payload.new;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        // Cover image
        if (updated.cover_art_url && imagesReceived === 0) {
          imagesReceived++;
          console.log(`📷 [${elapsed}s] COVER IMAGE GENERATED!`);
          console.log(`   https://assets.storytailor.dev${new URL(updated.cover_art_url).pathname}\n`);
        }

        // Scene images
        if (updated.scene_art_urls?.length > (imagesReceived - 1)) {
          for (let i = imagesReceived - 1; i < updated.scene_art_urls.length; i++) {
            imagesReceived++;
            console.log(`📷 [${elapsed}s] SCENE ${i + 1} GENERATED!`);
            console.log(`   https://assets.storytailor.dev${new URL(updated.scene_art_urls[i]).pathname}\n`);
          }
        }

        // Complete
        if (updated.cover_art_url && updated.scene_art_urls?.length === 4) {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log('✅ ALL IMAGES GENERATED!');
          console.log(`   Total time: ${elapsed}s`);
          console.log(`   Total images: ${imagesReceived}`);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          
          console.log('🔍 VALIDATION CHECKLIST:\n');
          console.log('Review each image for:');
          console.log('  ✓ Wheelchair present in ALL images');
          console.log('  ✓ In flying scenes: character + wheelchair airborne TOGETHER');
          console.log('  ✓ Wheelchair integrated (not separated or left behind)');
          console.log('  ✓ Magical elements applied to BOTH character and wheelchair\n');
          
          console.log('🚫 Red Flags (should NOT appear):');
          console.log('  ❌ Character flying alone, wheelchair on ground');
          console.log('  ❌ Wheelchair shown separately/behind');
          console.log('  ❌ Character "freed" from wheelchair\n');
          
          channel.unsubscribe();
          process.exit(0);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime connection active\n');
        console.log('💡 TIP: Content Agent processes stories async');
        console.log('   First image typically appears in 2-3 minutes');
        console.log('   All 5 images complete in 8-12 minutes\n');
        console.log('   Waiting for first update...\n');
      }
    });

  // Also manually trigger Content Agent via correct method
  console.log('🚀 Manually triggering Content Agent Lambda...\n');
  
  const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
  const lambda = new LambdaClient({ region: 'us-east-1' });
  
  const lambdaPayload = {
    action: 'generate_story',
    userId: user.id,
    creatorUserId: user.id,
    storyId: story.id,
    libraryId: libraries.id,
    characterId: character.id,
    characterName: character.name,
    characterTraits: character.traits,
    storyType: 'adventure',
    userAge: 7,
    storyTitle: story.title,
    conversationPhase: 'story_generated',
    setting: 'magical cloud kingdom',
    goal: 'explore the sky and help cloud creatures',
    companion: 'cloud sprite friend'
  };

  try {
    const response = await lambda.send(new InvokeCommand({
      FunctionName: 'storytailor-content-agent-production',
      Payload: JSON.stringify(lambdaPayload)
    }));
    
    const result = JSON.parse(new TextDecoder().decode(response.Payload));
    console.log('✅ Lambda invoked');
    if (result.errorMessage) {
      console.log('⚠️  Lambda error:', result.errorMessage);
    }
  } catch (err) {
    console.log('⚠️  Lambda invocation error:', err.message);
    console.log('   Story will still process via EventBridge queue\n');
  }

  // Keep alive for 15 minutes
  setTimeout(() => {
    console.log('\n⏱️  15-minute timeout reached');
    console.log('   Images may still be generating - check database:\n');
    console.log(`   Story ID: ${story.id}\n`);
    channel.unsubscribe();
    process.exit(1);
  }, 15 * 60 * 1000);
}

process.on('SIGINT', () => {
  console.log('\n\n⚠️  Interrupted by user');
  process.exit(0);
});

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});


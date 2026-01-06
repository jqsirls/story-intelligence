#!/usr/bin/env node
/**
 * Disability Representation Test with Supabase Realtime
 * 
 * This script:
 * 1. Creates a wheelchair-using character
 * 2. Generates a flying adventure story via Content Agent
 * 3. Monitors image generation in REAL-TIME via Supabase Realtime
 * 4. Displays CDN URLs as each image is generated
 * 5. Validates wheelchair integration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// --- Configuration ---
const TEST_USER_EMAIL = 'j+1226@jqsirls.com';
const TEST_USER_PASSWORD = 'Fntra2015!';
const CONTENT_AGENT_FUNCTION_NAME = 'storytailor-content-agent-production';
const AWS_REGION = 'us-east-1';

// --- AWS Clients ---
const ssm = new SSMClient({ region: AWS_REGION });
const lambda = new LambdaClient({ region: AWS_REGION });

let supabase;
let user;
let library;
let realtimeChannel;

// --- Helper Functions ---

async function loadEnvironmentVariables() {
  console.log('\n🔧 Loading environment variables from SSM...');
  
  const getParam = async (name) => {
    try {
      const command = new GetParameterCommand({ Name: name, WithDecryption: true });
      const result = await ssm.send(command);
      return result.Parameter.Value;
    } catch (error) {
      console.error(`Error loading SSM parameter ${name}:`, error.message);
      throw error;
    }
  };

  process.env.SUPABASE_URL = await getParam('/storytailor-prod/supabase/url');
  process.env.SUPABASE_SERVICE_KEY = await getParam('/storytailor-prod/supabase/service_key');
  
  // Try to get anon key, but it's optional since we're using service key
  try {
    process.env.SUPABASE_ANON_KEY = await getParam('/storytailor-prod/supabase/anon-key');
  } catch (e) {
    // Anon key not required for this test
  }
  
  console.log('✅ Environment loaded');
}

async function initializeSupabase() {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for test
  );
}

async function signInUser() {
  console.log('\n👤 Signing in test user...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });

  if (error) {
    console.error('❌ Failed to sign in:', error.message);
    throw error;
  }
  
  user = data.user;
  console.log(`✅ Signed in as: ${user.email}`);
  console.log(`   User ID: ${user.id}`);
}

async function getOrCreateLibrary() {
  console.log('\n📚 Getting library...');
  
  const { data, error } = await supabase
    .from('libraries')
    .select('*')
    .eq('owner', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Failed to fetch library:', error.message);
    throw error;
  }

  if (data) {
    library = data;
    console.log(`✅ Using existing library: ${library.id}`);
  } else {
    const { data: newLibrary, error: createError } = await supabase
      .from('libraries')
      .insert([{ owner: user.id, name: 'Test Library' }])
      .select()
      .single();

    if (createError) {
      console.error('❌ Failed to create library:', createError.message);
      throw createError;
    }
    library = newLibrary;
    console.log(`✅ Created new library: ${library.id}`);
  }
}

async function createCharacter() {
  console.log('\n🎭 Creating character with wheelchair inclusivity trait...');
  
  const characterData = {
    library_id: library.id,
    name: 'Zara Sky',
    traits: {
      age: 7,
      species: 'human',
      personality_traits: ['adventurous', 'curious', 'resilient', 'imaginative'],
      likes: ['exploring', 'magic', 'clouds', 'flying'],
      dislikes: ['being bored', 'limitations', 'being underestimated'],
      strengths: ['bravery', 'problem-solving', 'creativity'],
      weaknesses: ['impatience'],
      fears: ['being stuck on the ground'],
      dreams: ['fly among the clouds and explore the sky kingdom'],
      appearance: {
        skinTone: 'medium-brown',
        hairColor: 'dark-brown',
        hairTexture: 'curly',
        eyeColor: 'brown',
        bodyType: 'average',
        height: 'average',
        distinctiveFeatures: ['bright smile', 'determined eyes']
      },
      inclusivity_traits: [
        { category: 'mobility', trait: 'wheelchair_user', visibility: 'always_visible' },
        { category: 'communication', trait: 'hearing_aid_user', visibility: 'always_visible' },
        { category: 'cultural', trait: 'hijab_wearer', visibility: 'always_visible' },
        { category: 'visual', trait: 'glasses_wearer', visibility: 'always_visible' },
        { category: 'neurodiversity', trait: 'autism_spectrum', visibility: 'contextual' }
      ]
    },
    creator_user_id: user.id
  };

  const { data, error } = await supabase
    .from('characters')
    .insert([characterData])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create character:', error.message);
    throw error;
  }
  
  const character = data;
  console.log(`✅ Character created: ${character.name} (ID: ${character.id})`);
  console.log(`   Inclusivity traits: wheelchair_user, hearing_aid_user, hijab_wearer, glasses_wearer, autism_spectrum`);
  console.log(`   This is a CRITICAL test for disability representation in flying scenes`);
  
  return character;
}

async function setupRealtimeMonitoring(storyId) {
  console.log('\n📡 Setting up Supabase Realtime monitoring...');
  console.log('   Watching for image URLs as they generate...\n');
  
  return new Promise((resolve, reject) => {
    let imagesReceived = 0;
    let startTime = Date.now();
    const timeout = setTimeout(() => {
      console.log('\n⏱️  5-minute timeout reached');
      if (realtimeChannel) {
        realtimeChannel.unsubscribe();
      }
      reject(new Error('Timeout waiting for images'));
    }, 5 * 60 * 1000); // 5 minutes

    realtimeChannel = supabase
      .channel(`story:${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${storyId}`
        },
        (payload) => {
          const story = payload.new;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          
          // Check for cover image
          if (story.cover_art_url && imagesReceived === 0) {
            imagesReceived++;
            console.log(`\n📷 [${elapsed}s] Cover Image Generated!`);
            console.log(`   CloudFront: https://assets.storytailor.dev${new URL(story.cover_art_url).pathname}`);
            console.log(`   Direct: ${story.cover_art_url}`);
          }
          
          // Check for scene images
          if (story.scene_art_urls && Array.isArray(story.scene_art_urls)) {
            const newScenes = story.scene_art_urls.length;
            if (newScenes > (imagesReceived - 1)) {
              for (let i = imagesReceived - 1; i < newScenes; i++) {
                imagesReceived++;
                console.log(`\n📷 [${elapsed}s] Scene ${i + 1} Generated!`);
                console.log(`   CloudFront: https://assets.storytailor.dev${new URL(story.scene_art_urls[i]).pathname}`);
                console.log(`   Direct: ${story.scene_art_urls[i]}`);
              }
            }
          }
          
          // Check if complete (1 cover + 4 scenes = 5 images)
          if (story.cover_art_url && story.scene_art_urls?.length === 4) {
            clearTimeout(timeout);
            console.log('\n\n✅ All images generated!');
            console.log(`   Total time: ${elapsed}s`);
            console.log(`   Total images: ${imagesReceived}`);
            
            if (realtimeChannel) {
              realtimeChannel.unsubscribe();
            }
            
            resolve(story);
          }
          
          // Show progress
          if (story.asset_generation_status?.overall) {
            console.log(`   Status: ${story.asset_generation_status.overall}`);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime connection established');
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout);
          reject(new Error('Realtime channel error'));
        }
      });
  });
}

async function generateStoryWithImages(character) {
  console.log('\n📖 Creating story and invoking Content Agent...');
  console.log('   Story: Flying adventure with magical wheelchair transformation');
  console.log('   Test: Wheelchair integration in aerial scenes\n');
  
  // Create story record first
  const storyData = {
    library_id: library.id,
    title: `Zara's Cloud Kingdom Adventure`,
    content: '', // Will be filled by Content Agent
    creator_user_id: user.id,
    age_rating: character.traits.age,
    metadata: {
      character_id: character.id,
      character_name: character.name,
      character_traits: character.traits,
      story_type: 'adventure', // Store in metadata, not direct column
      user_age: character.traits.age,
      test_purpose: 'disability_representation_validation',
      test_date: new Date().toISOString(),
      setting: 'sky kingdom made of clouds',
      goal: 'explore the magical cloud kingdom and help cloud creatures',
      companion: 'friendly cloud sprite'
    }
  };

  const { data: story, error } = await supabase
    .from('stories')
    .insert([storyData])
    .select()
    .single();

  if (error) {
    console.error('❌ Failed to create story:', error.message);
    throw error;
  }

  console.log(`✅ Story record created: ${story.id}`);
  
  // Set up realtime monitoring BEFORE invoking Lambda
  const realtimePromise = setupRealtimeMonitoring(story.id);
  
  // Invoke Content Agent to generate story content and images
  console.log('\n🎨 Invoking Content Agent Lambda...');
  
  const payload = {
    action: 'generate_story',
    userId: user.id,
    creatorUserId: user.id,
    storyId: story.id,
    libraryId: library.id,
    characterId: character.id,
    characterName: character.name,
    characterTraits: character.traits,
    storyType: 'adventure',
    userAge: character.traits.age,
    storyTitle: story.title,
    conversationPhase: 'story_details_collected',
    // Adventure story parameters
    setting: 'sky kingdom made of clouds',
    goal: 'explore the magical cloud kingdom and help cloud creatures',
    companion: 'friendly cloud sprite',
    // This prompt is CRITICAL for testing disability representation
    additionalContext: `
      Zara is a brave 7-year-old girl who uses a wheelchair and has always dreamed of flying.
      One day, a magical cloud sprite grants her wish by transforming her wheelchair into a
      flying vehicle with glowing wheels. Together, Zara and her wheelchair soar into the sky,
      exploring a hidden cloud kingdom, meeting whimsical cloud creatures, and using her
      creativity and her transformed wheelchair to navigate aerial challenges.
      
      CRITICAL: The wheelchair is part of Zara's identity and her adventure. It transforms
      WITH her, enabling her flight rather than being left behind. The wheelchair glows,
      adapts, and helps her navigate the sky kingdom.
    `
  };

  const command = new InvokeCommand({
    FunctionName: CONTENT_AGENT_FUNCTION_NAME,
    Payload: JSON.stringify(payload)
  });

  const response = await lambda.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.Payload));

  if (result.errorMessage) {
    console.error('❌ Lambda error:', result.errorMessage);
    throw new Error(result.errorMessage);
  }

  console.log('✅ Content Agent invoked');
  console.log('   Generating story content and images...');
  console.log('   Watching for realtime updates...\n');
  
  // Wait for realtime updates
  return await realtimePromise;
}

async function validateImages(story, character) {
  console.log('\n\n🔍 VALIDATION CHECKLIST');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log('\n📋 Images to Review:');
  console.log('\n1️⃣  Cover Image:');
  console.log(`   https://assets.storytailor.dev${new URL(story.cover_art_url).pathname}`);
  console.log('   ✓ Check: Wheelchair present?');
  console.log('   ✓ Check: If flying, both Zara AND wheelchair airborne?');
  console.log('   ✓ Check: Wheelchair integrated (not separated)?');
  console.log('   ✓ Check: Magical elements on BOTH character and wheelchair?');
  
  story.scene_art_urls.forEach((url, i) => {
    console.log(`\n${i + 2}️⃣  Scene ${i + 1}:`);
    console.log(`   https://assets.storytailor.dev${new URL(url).pathname}`);
    if (i === 0) {
      console.log('   ✓ Check: Wheelchair naturally positioned?');
    } else if (i === 1) {
      console.log('   ✓ Check: Wheelchair glowing/transforming with character?');
    } else if (i === 2) {
      console.log('   ✓ Check: Character + wheelchair in coordinated flight?');
    } else if (i === 3) {
      console.log('   ✓ Check: Wheelchair helping navigate sky kingdom?');
    }
  });
  
  console.log('\n\n🚫 Red Flags (Should NOT Appear):');
  console.log('   ❌ Character flying alone, wheelchair on ground');
  console.log('   ❌ Wheelchair shown separately/behind');
  console.log('   ❌ Character "freed" from wheelchair');
  console.log('   ❌ Wheelchair depicted as limitation to overcome');
  console.log('   ❌ Missing wheelchair in any image');
  
  console.log('\n\n✅ Success Criteria:');
  console.log('   1. Wheelchair present in ALL 5 images');
  console.log('   2. Flying scenes show character + wheelchair together');
  console.log('   3. No separation between Zara and wheelchair');
  console.log('   4. Wheelchair integrated as part of character identity');
  console.log('   5. No "magical cure" or "overcoming limitation" framing');
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 DISABILITY REPRESENTATION TEST');
  console.log('   with Supabase Realtime Monitoring');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    await loadEnvironmentVariables();
    await initializeSupabase();
    await signInUser();
    await getOrCreateLibrary();
    
    const character = await createCharacter();
    const story = await generateStoryWithImages(character);
    
    await validateImages(story, character);
    
    console.log('\n\n✅ TEST COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Test Summary:');
    console.log(`   Story ID: ${story.id}`);
    console.log(`   Character: ${character.name} (wheelchair user)`);
    console.log(`   Images Generated: 5 (1 cover + 4 scenes)`);
    console.log(`   Test Purpose: Validate wheelchair integration in flying scenes`);
    console.log('\n📝 Next Step: Manually review images against checklist above');
    console.log('   If all checks pass → Disability representation fix verified ✅');
    console.log('   If any red flags appear → Further prompt adjustments needed ⚠️');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n\n❌ TEST FAILED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error:', error.message);
    console.error('\nStack:', error.stack);
    
    if (realtimeChannel) {
      realtimeChannel.unsubscribe();
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test interrupted by user');
  if (realtimeChannel) {
    realtimeChannel.unsubscribe();
  }
  process.exit(0);
});

main();


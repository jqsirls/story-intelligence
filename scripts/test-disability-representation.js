#!/usr/bin/env node
/**
 * scripts/test-disability-representation.js
 * 
 * Tests disability representation in generated images
 * Verifies that mobility aids are always integrated with characters
 * 
 * VALIDATION CRITERIA:
 * - Character with wheelchair: wheelchair present in ALL images
 * - Flying/magical scenes: character AND wheelchair both airborne
 * - Action scenes: wheelchair integrated in movement
 * - Never shows character separated from mobility aid
 * 
 * See: DISABILITY_REPRESENTATION_FIX_COMPLETE.md
 */

const { createClient } = require('@supabase/supabase-js');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const ssm = new SSMClient({ region: 'us-east-1' });
const lambda = new LambdaClient({ region: 'us-east-1' });

let supabase;

async function getParam(name) {
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const result = await ssm.send(cmd);
  return result.Parameter.Value;
}

async function init() {
  console.log('\n🚀 Initializing Disability Representation Test...\n');
  
  const url = await getParam('/storytailor-prod/supabase/url');
  const key = await getParam('/storytailor-prod/supabase/service_key');
  supabase = createClient(url, key);
  
  console.log('✅ Environment loaded\n');
}

async function createTestCharacter(userId, libraryId) {
  console.log('📝 Creating character with wheelchair inclusivity trait...');
  
  const characterData = {
    library_id: libraryId,
    name: 'Zara Sky',
    traits: {
      age: 7,
      species: 'human',
      personality_traits: ['adventurous', 'imaginative', 'brave'],
      likes: ['flying', 'clouds', 'exploration'],
      dislikes: ['staying still'],
      strengths: ['creativity', 'determination'],
      fears: ['giving up'],
      dreams: ['touch the clouds'],
      backstory: 'Zara loves to imagine flying adventures',
      appearance: {
        skinTone: 'tan',
        hairColor: 'dark-brown',
        hairTexture: 'wavy',
        eyeColor: 'brown',
        bodyType: 'athletic',
        height: 'average',
        distinctiveFeatures: []
      },
      inclusivity_traits: [
        { 
          category: 'mobility', 
          trait: 'wheelchair_user', 
          visibility: 'always_visible',
          description: 'Uses a lightweight manual wheelchair'
        }
      ]
    },
    creator_user_id: userId,
    is_primary: true
  };
  
  const { data: character, error } = await supabase
    .from('characters')
    .insert(characterData)
    .select()
    .single();
  
  if (error) throw error;
  
  console.log(`✅ Character created: ${character.name} (ID: ${character.id})`);
  console.log(`   Inclusivity traits: wheelchair_user (always_visible)\n`);
  
  return character;
}

async function createFlyingStory(userId, libraryId, character) {
  console.log('📖 Creating flying adventure story...');
  
  const storyData = {
    library_id: libraryId,
    title: 'Zara\'s Cloud Adventure',
    content: `Zara gazed up at the fluffy clouds floating by. "I wish I could fly up there," she said. Suddenly, her wheelchair began to glow with magical light. The wheels sparkled and lifted off the ground! Zara soared through the air, her wheelchair glowing beneath her as they flew together toward the clouds. She swooped and glided, the wind rushing through her hair, her wheelchair keeping pace with every turn. Up among the clouds, Zara discovered a hidden sky kingdom. She explored the floating islands, her glowing wheelchair helping her navigate the aerial paths. "This is amazing!" she shouted with joy.`,
    status: 'draft',
    age_rating: 7,
    creator_user_id: userId,
    metadata: {
      story_type: 'adventure',
      user_age: 7,
      character_id: character.id
    }
  };
  
  const { data: story, error } = await supabase
    .from('stories')
    .insert(storyData)
    .select()
    .single();
  
  if (error) throw error;
  
  console.log(`✅ Story created: ${story.title} (ID: ${story.id})`);
  console.log(`   Story includes: Flying scenes, magical transformation, aerial exploration\n`);
  
  return story;
}

async function generateStoryImages(story, character) {
  console.log('🎨 Generating story images with Content Agent...');
  console.log('   This will take 2-3 minutes...\n');
  
  const payload = {
    action: 'generate_story_art',
    storyId: story.id,
    storyContent: story.content,
    character: {
      id: character.id,
      name: character.name,
      traits: character.traits
    }
  };
  
  const command = new InvokeCommand({
    FunctionName: 'storytailor-content-agent-production',
    Payload: JSON.stringify(payload)
  });
  
  console.log('⏳ Invoking Content Agent Lambda (timeout: 5 minutes)...');
  
  const response = await lambda.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (result.errorMessage) {
    throw new Error(`Lambda error: ${result.errorMessage}`);
  }
  
  console.log('\n✅ Image generation complete\n');
  return result;
}

async function waitForImageGeneration(storyId) {
  console.log('⏳ Waiting for async image generation...');
  
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes
  
  while (attempts < maxAttempts) {
    const { data: story } = await supabase
      .from('stories')
      .select('asset_generation_status, cover_art_url, scene_art_urls')
      .eq('id', storyId)
      .single();
    
    if (story.asset_generation_status === 'ready') {
      console.log('✅ All images generated!\n');
      return story;
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    process.stdout.write('.');
  }
  
  throw new Error('Timeout waiting for image generation');
}

function validateImages(story) {
  console.log('🔍 VALIDATING DISABILITY REPRESENTATION\n');
  console.log('=' .repeat(70));
  
  const images = [
    { type: 'Cover', url: story.cover_art_url },
    ...story.scene_art_urls.map((url, i) => ({ type: `Scene ${i + 1}`, url }))
  ];
  
  console.log('\n📷 Generated Images:\n');
  
  images.forEach((img, i) => {
    console.log(`${i + 1}. ${img.type}`);
    console.log(`   URL: ${img.url}`);
    console.log(`   CDN: https://assets.storytailor.dev${new URL(img.url).pathname}\n`);
  });
  
  console.log('=' .repeat(70));
  console.log('\n✅ MANUAL VALIDATION REQUIRED:\n');
  console.log('Please verify each image shows:');
  console.log('  1. ✓ Zara WITH her wheelchair in ALL images');
  console.log('  2. ✓ Flying scenes: Zara AND wheelchair both airborne');
  console.log('  3. ✓ Wheelchair glowing/magical in fantasy scenes');
  console.log('  4. ✓ NO separation between Zara and wheelchair');
  console.log('  5. ✓ Wheelchair integrated as part of the character\n');
  
  console.log('❌ RED FLAGS (should NOT appear):');
  console.log('  • Zara flying alone (wheelchair on ground)');
  console.log('  • Wheelchair shown as obstacle or limitation');
  console.log('  • "Freedom" depicted as separation from aid');
  console.log('  • Wheelchair absent or minimized\n');
  
  console.log('=' .repeat(70));
  
  return images;
}

async function main() {
  try {
    await init();
    
    // Use existing test user
    const userId = 'c72e39bb-a563-4989-a649-5c2f89527b61';
    
    // Get or create library
    let { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('owner', userId)
      .single();
    
    if (!library) {
      const { data: newLibrary } = await supabase
        .from('libraries')
        .insert({ owner: userId, name: 'Disability Rep Test Library' })
        .select()
        .single();
      library = newLibrary;
    }
    
    console.log(`✅ Using library: ${library.id}\n`);
    
    // Create character and story
    const character = await createTestCharacter(userId, library.id);
    const story = await createFlyingStory(userId, library.id, character);
    
    // Generate images
    await generateStoryImages(story, character);
    
    // Wait for completion
    const updatedStory = await waitForImageGeneration(story.id);
    
    // Validate
    const images = validateImages(updatedStory);
    
    console.log('\n📊 TEST COMPLETE');
    console.log(`   Character ID: ${character.id}`);
    console.log(`   Story ID: ${story.id}`);
    console.log(`   Images Generated: ${images.length}`);
    console.log(`   Validation: Manual review required\n`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();


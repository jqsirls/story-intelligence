#!/usr/bin/env node

/**
 * Generate Story Images (Cover + 4 Scene Images)
 * 
 * This script invokes the Content Agent to generate all images for a story.
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

const AWS_REGION = 'us-east-1';
const CONTENT_AGENT_LAMBDA = 'storytailor-content-agent-production';

// Story ID from the test
const STORY_ID = process.argv[2] || 'ba0a6c0e-8c69-452c-89f9-3be83188e917';
const CHARACTER_ID = process.argv[3] || '0b9401b1-9bbc-4ff9-8564-39c55e1faba6';

const lambda = new LambdaClient({ region: AWS_REGION });
const ssm = new SSMClient({ region: AWS_REGION });

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function loadEnvFromSSM() {
  log('Loading environment variables from AWS SSM...');
  
  const params = [
    '/storytailor-production/supabase/url',
    '/storytailor-production/supabase/service-key'
  ];
  
  for (const paramName of params) {
    try {
      const command = new GetParameterCommand({
        Name: paramName,
        WithDecryption: true
      });
      const response = await ssm.send(command);
      const value = response.Parameter.Value;
      
      if (paramName.includes('url')) {
        process.env.SUPABASE_URL = value;
      } else if (paramName.includes('service-key')) {
        process.env.SUPABASE_SERVICE_ROLE_KEY = value;
      }
    } catch (err) {
      log(`⚠️  Could not load ${paramName}: ${err.message}`);
    }
  }
  
  log('✅ Environment variables loaded');
}

async function getStoryAndCharacter() {
  log(`📖 Fetching story: ${STORY_ID}`);
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('*')
    .eq('id', STORY_ID)
    .single();
  
  if (storyError || !story) {
    throw new Error(`Story not found: ${storyError?.message || 'Unknown error'}`);
  }
  
  log(`✅ Story found: ${story.title || 'Untitled'}`);
  
  const { data: character, error: charError } = await supabase
    .from('characters')
    .select('*')
    .eq('id', CHARACTER_ID)
    .single();
  
  if (charError || !character) {
    throw new Error(`Character not found: ${charError?.message || 'Unknown error'}`);
  }
  
  log(`✅ Character found: ${character.name}`);
  
  return { story, character };
}

async function generateStoryImages(story, character) {
  log('🎨 Generating story images (cover + 4 scenes)...');
  log(`   Story: ${story.title || 'Untitled'}`);
  log(`   Character: ${character.name}`);
  
  const payload = {
    action: 'generate_story_images',
    storyId: story.id,
    story: {
      title: story.title || 'Untitled Story',
      keyBeats: story.metadata?.keyBeats || [
        { description: 'Opening scene', visualDescription: 'The beginning' },
        { description: 'Challenge arises', visualDescription: 'The middle' },
        { description: 'Resolution', visualDescription: 'The climax' },
        { description: 'Happy ending', visualDescription: 'The conclusion' }
      ]
    },
    characterId: character.id,
    characterName: character.name,
    characterTraits: character.traits,
    libraryId: story.library_id
  };
  
  log('   Payload prepared:');
  log(`   - Story ID: ${payload.storyId}`);
  log(`   - Title: ${payload.story.title}`);
  log(`   - Key beats: ${payload.story.keyBeats.length}`);
  log(`   - Character: ${payload.characterName}`);
  
  const command = new InvokeCommand({
    FunctionName: CONTENT_AGENT_LAMBDA,
    Payload: JSON.stringify(payload)
  });
  
  log('🚀 Invoking Content Agent Lambda...');
  const startTime = Date.now();
  const response = await lambda.send(command);
  const duration = Date.now() - startTime;
  
  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (response.FunctionError) {
    log(`❌ Lambda error: ${responsePayload.errorMessage || 'Unknown error'}`);
    console.error(JSON.stringify(responsePayload, null, 2));
    throw new Error(responsePayload.errorMessage || 'Lambda invocation failed');
  }
  
  log(`✅ Content Agent responded (${duration}ms)`);
  
  // Parse response
  let body = responsePayload;
  if (responsePayload.body && typeof responsePayload.body === 'string') {
    body = JSON.parse(responsePayload.body);
  }
  
  if (body.success && body.images) {
    log('');
    log('============================================================');
    log('📊 GENERATED IMAGES');
    log('============================================================');
    log(`Cover Image: ${body.images.coverImageUrl || 'Generating...'}`);
    log(`Beat Images: ${body.images.beatImages?.length || 0}`);
    
    if (body.images.beatImages) {
      body.images.beatImages.forEach((img, i) => {
        log(`  Beat ${i + 1}: ${img.imageUrl || 'Generating...'}`);
      });
    }
    log('============================================================');
  } else {
    log('⚠️  Images are being generated asynchronously');
    log('   Check story asset_generation_status in database');
  }
  
  return body;
}

async function main() {
  log('');
  log('============================================================');
  log('🎨 STORY IMAGE GENERATION');
  log('============================================================');
  log(`Story ID: ${STORY_ID}`);
  log(`Character ID: ${CHARACTER_ID}`);
  log('');
  
  try {
    await loadEnvFromSSM();
    const { story, character } = await getStoryAndCharacter();
    const result = await generateStoryImages(story, character);
    
    log('');
    log('✅ Story image generation complete!');
    log('');
    
    if (result.images) {
      log('Images will be available at:');
      if (result.images.coverImageUrl) {
        log(`  Cover: ${result.images.coverImageUrl}`);
      }
      if (result.images.beatImages) {
        result.images.beatImages.forEach((img, i) => {
          log(`  Scene ${i + 1}: ${img.imageUrl}`);
        });
      }
    }
    
  } catch (error) {
    log('');
    log('❌ Failed to generate story images');
    log(`   Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();


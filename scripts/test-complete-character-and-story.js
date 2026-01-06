#!/usr/bin/env node

/**
 * Complete Character + Story Generation Test
 * 
 * This script demonstrates the FULL workflow:
 * 1. Create character with inclusivity traits
 * 2. Generate character images (headshot + bodyshot)
 * 3. Generate story with character
 * 4. Verify story includes inclusivity traits
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const {createClient} = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const AWS_REGION = 'us-east-1';
const CONTENT_AGENT_LAMBDA = 'storytailor-content-agent-production';
const TEST_USER_ID = '0073efb7-38ec-45ce-9f71-faccdc7bddc5';
const TEST_LIBRARY_ID = 'f03c25d5-7eb3-4a90-a71e-17e9a194b5e9';

const lambda = new LambdaClient({ region: AWS_REGION });
const ssm = new SSMClient({ region: AWS_REGION });

// Results directory
const RUN_ID = `run-${Date.now()}`;
const RESULTS_DIR = path.join(__dirname, '../test-results/complete-test', RUN_ID);
fs.mkdirSync(RESULTS_DIR, { recursive: true });

// Logging
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function saveResult(filename, data) {
  fs.writeFileSync(path.join(RESULTS_DIR, filename), JSON.stringify(data, null, 2));
  log(`✅ Saved: ${filename}`);
}

/**
 * Load environment variables from AWS SSM
 */
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

/**
 * Create character with COMPREHENSIVE inclusivity traits
 */
async function createInclusiveCharacter(supabase) {
  log('🦊 Creating character with inclusivity traits...');
  
  const characterData = {
    library_id: TEST_LIBRARY_ID,
    creator_user_id: TEST_USER_ID,
    name: 'Zara',
    traits: {
      species: 'human',
      age: 7,
      gender: 'girl',
      personality: ['curious', 'kind', 'problem-solver'],
      ethnicity: ['South Asian'],
      inclusivityTraits: [
        {
          id: 'wheelchair_manual',
          type: 'wheelchair_manual',
          category: 'mobility',
          name: 'Manual wheelchair user',
          description: 'Uses manual wheelchair for mobility'
        },
        {
          id: 'glasses_prescription',
          type: 'glasses_prescription',
          category: 'vision',
          name: 'Prescription glasses',
          description: 'Wears prescription glasses'
        },
        {
          id: 'hearing_aid_bilateral',
          type: 'hearing_aid_bilateral',
          category: 'hearing',
          name: 'Bilateral hearing aids',
          description: 'Wears hearing aids in both ears'
        },
        {
          id: 'autism_spectrum',
          type: 'autism_spectrum',
          category: 'neurodivergent',
          name: 'Autism spectrum',
          description: 'Autistic with sensory sensitivities'
        },
        {
          id: 'hijab',
          type: 'hijab',
          category: 'cultural',
          name: 'Hijab',
          description: 'Wears hijab as religious/cultural practice'
        }
      ],
      appearance: {
        hair_color: 'dark brown',
        hair_style: 'covered by hijab',
        eye_color: 'brown',
        skin_tone: 'warm brown',
        clothing: 'colorful hijab, comfortable clothes for wheelchair use',
        distinguishing_features: 'bright smile, expressive eyes behind glasses'
      }
    }
  };
  
  const { data, error } = await supabase
    .from('characters')
    .insert([characterData])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create character: ${error.message}`);
  }
  
  log(`✅ Character created: ${data.name} (ID: ${data.id})`);
  log(`   ↳ Species: ${data.traits.species}`);
  log(`   ↳ Inclusivity traits: ${data.traits.inclusivityTraits?.length || 0}`);
  saveResult('1-character-created.json', data);
  
  return data;
}

/**
 * Generate character images (headshot + bodyshot)
 */
async function generateCharacterImages(character) {
  log('🎨 Generating character images...');
  log(`   Character: ${character.name}`);
  log(`   Inclusivity traits: ${character.traits.inclusivityTraits?.length || 0}`);
  
  const payload = {
    action: 'generate_character_art',
    characterId: character.id,
    characterName: character.name,
    userId: TEST_USER_ID,
    characterTraits: character.traits,
    ethnicity: character.traits.ethnicity,
    inclusivityTraits: character.traits.inclusivityTraits
  };
  
  const command = new InvokeCommand({
    FunctionName: CONTENT_AGENT_LAMBDA,
    Payload: JSON.stringify(payload)
  });
  
  const startTime = Date.now();
  const response = await lambda.send(command);
  const duration = Date.now() - startTime;
  
  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (response.FunctionError) {
    log(`❌ Lambda error: ${responsePayload.errorMessage || 'Unknown error'}`);
    saveResult('2-character-images-error.json', responsePayload);
    throw new Error(responsePayload.errorMessage || 'Lambda invocation failed');
  }
  
  log(`✅ Character images generated (${duration}ms)`);
  
  // Parse response body if it's a Function URL response
  let body = responsePayload;
  if (responsePayload.body && typeof responsePayload.body === 'string') {
    body = JSON.parse(responsePayload.body);
  }
  
  if (body.data) {
    log(`   ↳ Headshot: ${body.data.headshot?.url ? 'Generated ✅' : 'Pending'}`);
    log(`   ↳ Bodyshot: ${body.data.bodyshot?.url ? 'Generated ✅' : 'Pending'}`);
  }
  
  saveResult('2-character-images-response.json', body);
  
  return body;
}

/**
 * Generate story with character
 */
async function generateStory(supabase, character) {
  log('📖 Creating story record...');
  
  const storyInputs = {
    title: 'Test Adventure Story with Inclusivity',
    readingAge: 7,
    characterIds: [character.id],
    adventure: {
      tone: 'exciting and empowering',
      setting: 'futuristic space station',
      challenge: 'solving a mysterious robot malfunction'
    }
  };
  
  const { data: story, error } = await supabase
    .from('stories')
    .insert([{
      library_id: TEST_LIBRARY_ID,
      creator_user_id: TEST_USER_ID,
      title: storyInputs.title,
      content: '',  // Placeholder
      status: 'draft',
      age_rating: storyInputs.readingAge,
      metadata: storyInputs
    }])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create story: ${error.message}`);
  }
  
  log(`✅ Story record created (ID: ${story.id})`);
  saveResult('3-story-record.json', story);
  
  // Invoke Content Agent to generate story
  log('🚀 Invoking Content Agent for story generation...');
  
  const payload = {
    action: 'generate_story',
    storyId: story.id,
    userId: TEST_USER_ID,
    sessionId: `test-${Date.now()}`,
    character: character,
    characterId: character.id,
    characterName: character.name,
    characterTraits: character.traits,
    storyType: 'Adventure',
    userAge: storyInputs.readingAge,
    conversationPhase: 'story_planning',
    adventure: storyInputs.adventure,
    correlationId: `test-${Date.now()}`
  };
  
  const command = new InvokeCommand({
    FunctionName: CONTENT_AGENT_LAMBDA,
    Payload: JSON.stringify(payload)
  });
  
  const startTime = Date.now();
  const response = await lambda.send(command);
  const duration = Date.now() - startTime;
  
  const responsePayload = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (response.FunctionError) {
    log(`❌ Lambda error: ${responsePayload.errorMessage || 'Unknown error'}`);
    saveResult('4-story-generation-error.json', responsePayload);
    throw new Error(responsePayload.errorMessage || 'Lambda invocation failed');
  }
  
  log(`✅ Story generated (${duration}ms)`);
  saveResult('4-story-generation-response.json', responsePayload);
  
  return { story, response: responsePayload };
}

/**
 * Verify story includes inclusivity traits
 */
function verifyInclusivityInStory(storyContent, character) {
  log('🔍 Verifying inclusivity traits in story...');
  
  const traits = character.traits.inclusivityTraits || [];
  const results = {
    characterName: storyContent.includes(character.name) ? '✅' : '❌',
    traits: {}
  };
  
  // Check each trait
  const traitKeywords = {
    wheelchair: ['wheelchair', 'rolled', 'wheels'],
    hijab: ['hijab'],
    glasses: ['glasses'],
    hearing_aids: ['hearing aid'],
    autism: ['pattern', 'fidget', 'feeling']
  };
  
  for (const [key, keywords] of Object.entries(traitKeywords)) {
    const found = keywords.some(kw => storyContent.toLowerCase().includes(kw.toLowerCase()));
    results.traits[key] = found ? '✅' : '❌';
  }
  
  log('');
  log('============================================================');
  log('📊 INCLUSIVITY VERIFICATION');
  log('============================================================');
  log(`Character Name (${character.name}): ${results.characterName}`);
  log(`Wheelchair: ${results.traits.wheelchair}`);
  log(`Hijab: ${results.traits.hijab}`);
  log(`Glasses: ${results.traits.glasses}`);
  log(`Hearing Aids: ${results.traits.hearing_aids}`);
  log(`Autism: ${results.traits.autism}`);
  log('============================================================');
  
  saveResult('5-inclusivity-verification.json', results);
  
  return results;
}

/**
 * Validate pose variation (V2 parity check)
 * Polls database for generated images and validates distinct poses
 */
async function validatePoseVariation(storyId, supabase) {
  log('');
  log('🎨 Validating pose variation (V2 parity)...');
  log('   Waiting for images to generate (this may take 2-5 minutes)...');
  
  const maxAttempts = 60; // 5 minutes max
  const pollInterval = 5000; // 5 seconds
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: story } = await supabase
      .from('stories')
      .select('cover_image_url, scene_images, asset_generation_status')
      .eq('id', storyId)
      .single();
    
    const imageCount = (story.cover_image_url ? 1 : 0) + (story.scene_images?.length || 0);
    
    if (imageCount >= 5) {
      log(`✅ All images generated (${imageCount}/5)`);
      log('');
      log('============================================================');
      log('📊 POSE VARIATION VALIDATION');
      log('============================================================');
      log(`Cover: ${story.cover_image_url}`);
      story.scene_images?.forEach((url, i) => {
        log(`Scene ${i+1}: ${url}`);
      });
      log('');
      log('ℹ️  Manual verification required:');
      log('   1. Open each image URL');
      log('   2. Verify distinct poses (different arm positions, camera angles)');
      log('   3. Verify consistent artistic style (no anime look)');
      log('   4. Verify inclusivity traits visible in all images');
      log('============================================================');
      
      return {
        imageCount,
        coverUrl: story.cover_image_url,
        sceneUrls: story.scene_images,
        status: 'ready'
      };
    }
    
    if (attempt % 6 === 0) { // Log every 30 seconds
      log(`   Polling... ${imageCount}/5 images ready (attempt ${attempt + 1}/${maxAttempts})`);
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  log('⚠️  Images not yet ready after 5 minutes (still generating asynchronously)');
  log('   Run validation later: node scripts/test-v2-parity-validation.js ' + storyId);
  
  return { imageCount: 0, status: 'pending' };
}

/**
 * Main test execution
 */
async function main() {
  log('');
  log('============================================================');
  log('🚀 COMPLETE CHARACTER + STORY GENERATION TEST');
  log('============================================================');
  log(`Results will be saved to: ${RESULTS_DIR}`);
  log('');
  
  try {
    // Load environment
    await loadEnvFromSSM();
    
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Step 1: Create character
    const character = await createInclusiveCharacter(supabase);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Generate character images
    try {
      const characterImages = await generateCharacterImages(character);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      log(`⚠️  Character image generation failed: ${err.message}`);
      log('   Continuing with story generation...');
    }
    
    // Step 3: Generate story
    const { story, response } = await generateStory(supabase, character);
    
    // Parse story content
    let storyContent = '';
    if (response.body && typeof response.body === 'string') {
      const body = JSON.parse(response.body);
      storyContent = body.data?.story?.content || '';
    } else if (response.data?.story?.content) {
      storyContent = response.data.story.content;
    }
    
    // Step 4: Verify inclusivity
    const verification = verifyInclusivityInStory(storyContent, character);
    
    // Step 5: Validate pose variation (V2 parity)
    const poseValidation = await validatePoseVariation(story.id, supabase);
    
    // Final summary
    log('');
    log('============================================================');
    log('📊 FINAL TEST SUMMARY');
    log('============================================================');
    log(`Character: ${character.name}`);
    log(`Inclusivity Traits: ${character.traits.inclusivityTraits?.length || 0}`);
    log(`Story Generated: ${story.title}`);
    log(`Story Content Length: ${storyContent.length} chars`);
    log(`Images Generated: ${poseValidation.imageCount}/5 (${poseValidation.status})`);
    log(`All Results: ${RESULTS_DIR}`);
    log('============================================================');
    log('');
    log('✅ Test complete');
    
  } catch (error) {
    log('');
    log('❌ Test failed');
    log(`   Error: ${error.message}`);
    log(`   Stack: ${error.stack}`);
    process.exit(1);
  }
}

main();


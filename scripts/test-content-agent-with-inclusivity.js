#!/usr/bin/env node
/**
 * Test Content Agent Lambda Directly with Full Inclusivity Traits
 * 
 * This script:
 * 1. Creates a character with comprehensive inclusivity traits
 * 2. Directly invokes Content Agent Lambda to generate story content
 * 3. Validates V3 prompt system and inclusivity image generation
 * 4. Saves all results for review
 */

const { createClient } = require('@supabase/supabase-js');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const CONTENT_AGENT_LAMBDA = 'storytailor-content-agent-production';

// Test user (Pro subscription)
const TEST_USER_EMAIL = 'test-mode-1767020783018@storytailor.test';
const TEST_USER_ID = '0073efb7-38ec-45ce-9f71-faccdc7bddc5';
const TEST_LIBRARY_ID = 'f03c25d5-7eb3-4a90-a71e-17e9a194b5e9';

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const lambda = new LambdaClient({ region: AWS_REGION });

const timestamp = Date.now();
const resultsDir = path.join(process.cwd(), 'test-results', 'content-agent-inclusivity', `run-${timestamp}`);

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function saveResult(filename, data) {
  fs.mkdirSync(resultsDir, { recursive: true });
  const filepath = path.join(resultsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`✅ Saved: ${filename}`);
}

/**
 * Create a character with COMPREHENSIVE inclusivity traits
 * Testing the full 39-trait inclusivity system
 */
async function createInclusiveCharacter() {
  log('🦊 Creating character with inclusivity traits...');
  
  const characterData = {
    library_id: TEST_LIBRARY_ID,
    name: 'Zara',
    traits: {
      name: 'Zara',
      age: 7,
      species: 'human',
      race: ['South Asian'],
      ethnicity: ['Indian'],
      gender: 'female',
      pronouns: 'she/her',
      
      // ✨ INCLUSIVITY TRAITS - Testing the 39-trait system
      inclusivityTraits: [
        {
          id: 'wheelchair_manual',
          category: 'mobility',
          name: 'Manual Wheelchair User',
          description: 'Uses a manual wheelchair for mobility'
        },
        {
          id: 'glasses_prescription',
          category: 'vision',
          name: 'Prescription Glasses',
          description: 'Wears glasses for vision correction'
        },
        {
          id: 'hearing_aid_bilateral',
          category: 'hearing',
          name: 'Bilateral Hearing Aids',
          description: 'Uses hearing aids in both ears'
        },
        {
          id: 'autism_spectrum',
          category: 'neurodivergent',
          name: 'Autism Spectrum',
          description: 'Autistic individual with unique strengths'
        },
        {
          id: 'hijab',
          category: 'cultural',
          name: 'Hijab',
          description: 'Wears hijab as part of religious/cultural identity'
        }
      ],
      
      appearance: {
        skin_tone: 'brown',
        eye_color: 'dark brown',
        hair_color: 'black',
        hair_style: 'long, covered with hijab',
        clothing: 'comfortable modest clothing with colorful hijab',
        distinguishing_features: 'bright smile, expressive eyes, decorated wheelchair'
      },
      
      personality: ['intelligent', 'determined', 'compassionate', 'creative'],
      interests: ['coding', 'robotics', 'astronomy', 'helping others', 'drawing'],
      strengths: [
        'problem-solving',
        'pattern recognition',
        'attention to detail',
        'empathy',
        'resilience'
      ],
      challenges: [
        'sensory sensitivities (loud noises)',
        'navigating inaccessible spaces',
        'sometimes needs extra time to process'
      ],
      
      // Communication preferences
      communication: {
        preferred_method: 'verbal with ASL support',
        needs: 'clear lighting for lip reading, patience with processing time'
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
  saveResult('character-inclusive.json', data);
  
  return data;
}

/**
 * Create a story record for the Content Agent to process
 */
async function createStoryRecord(characterId, storyType) {
  log(`📖 Creating ${storyType} story record...`);
  
  const storyInputs = {
    title: `Test ${storyType} Story with Inclusivity`,
    readingAge: 7,
    characterIds: [characterId],
  };
  
  // Add story-specific inputs
  if (storyType === 'Adventure') {
    storyInputs.adventure = {
      setting: 'futuristic space station',
      challenge: 'solving a mysterious robot malfunction',
      tone: 'exciting and empowering'
    };
  } else if (storyType === 'Birthday') {
    storyInputs.birthday = {
      ageTurning: 7,
      to: 'Zara',
      from: 'Family and Friends',
      birthdayMessage: 'Happy 7th Birthday! You inspire us every day with your brilliant mind and kind heart!',
      personality: 'intelligent and determined'
    };
  }
  
  const { data, error } = await supabase
    .from('stories')
    .insert([{
      library_id: TEST_LIBRARY_ID,
      creator_user_id: TEST_USER_ID,
      title: storyInputs.title,
      age_rating: storyInputs.readingAge,
      metadata: storyInputs,
      content: {},  // Required field
      status: 'draft',
      asset_generation_status: { overall: 'pending', assets: {} }
    }])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create story: ${error.message}`);
  }
  
  log(`✅ Story record created (ID: ${data.id})`);
  saveResult(`story-${storyType.toLowerCase()}-record.json`, data);
  
  return data;
}

/**
 * Directly invoke Content Agent Lambda to generate story content
 */
async function invokeContentAgent(storyId, storyInputs, characterData) {
  log('🚀 Invoking Content Agent Lambda directly...');
  log(`   Story ID: ${storyId}`);
  log(`   Character: ${characterData.name} (${characterData.traits.inclusivityTraits?.length || 0} inclusivity traits)`);
  
  const payload = {
    action: 'generate_story',
    storyId: storyId,
    userId: TEST_USER_ID,
    sessionId: `test-${Date.now()}`,
    character: characterData,  // Single character object, not array
    characterId: characterData.id,
    characterName: characterData.name,
    characterTraits: characterData.traits,
    storyType: storyInputs.adventure ? 'Adventure' : 'Birthday',
    userAge: storyInputs.readingAge,
    conversationPhase: 'story_planning',
    correlationId: `test-${Date.now()}`
  };
  
  const command = new InvokeCommand({
    FunctionName: CONTENT_AGENT_LAMBDA,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload)
  });
  
  const startTime = Date.now();
  
  try {
    const response = await lambda.send(command);
    const duration = Date.now() - startTime;
    
    const responsePayload = JSON.parse(Buffer.from(response.Payload).toString());
    
    log(`✅ Content Agent invoked successfully (${duration}ms)`);
    
    // Check for errors
    if (response.FunctionError) {
      log(`❌ Lambda error: ${response.FunctionError}`);
      saveResult('content-agent-error.json', {
        error: response.FunctionError,
        payload: responsePayload,
        duration
      });
      return { success: false, error: response.FunctionError, duration };
    }
    
    // Parse response
    const result = {
      success: true,
      duration,
      storyId,
      response: responsePayload
    };
    
    // Check if story content was generated
    if (responsePayload.story) {
      log(`   ↳ Story title: ${responsePayload.story.title || 'N/A'}`);
      log(`   ↳ Story content length: ${JSON.stringify(responsePayload.story.content || {}).length} chars`);
      log(`   ↳ Beats: ${responsePayload.story.content?.beats?.length || 0}`);
    }
    
    // Check if character images were generated
    if (responsePayload.characterImages) {
      log(`   ↳ Character images: ${responsePayload.characterImages.length || 0}`);
      responsePayload.characterImages.forEach((img, i) => {
        log(`      ${i + 1}. ${img.variant || 'main'}: ${img.url ? 'Generated ✅' : 'Pending'}`);
      });
    }
    
    saveResult('content-agent-response.json', result);
    
    return result;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`❌ Content Agent invocation failed: ${error.message}`);
    
    const result = {
      success: false,
      duration,
      error: error.message,
      stack: error.stack
    };
    
    saveResult('content-agent-error.json', result);
    
    return result;
  }
}

/**
 * Fetch the updated story from database
 */
async function fetchUpdatedStory(storyId) {
  log(`📥 Fetching updated story from database...`);
  
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();
  
  if (error) {
    log(`⚠️  Failed to fetch story: ${error.message}`);
    return null;
  }
  
  log(`✅ Story fetched`);
  log(`   ↳ Status: ${data.status}`);
  log(`   ↳ Asset status: ${data.asset_generation_status?.overall || 'unknown'}`);
  log(`   ↳ Content beats: ${data.content?.beats?.length || 0}`);
  log(`   ↳ Cover art: ${data.cover_art_url ? 'Generated ✅' : 'Pending'}`);
  log(`   ↳ Audio: ${data.audio_url ? 'Generated ✅' : 'Pending'}`);
  log(`   ↳ PDF: ${data.pdf_url ? 'Generated ✅' : 'Pending'}`);
  
  saveResult('story-updated.json', data);
  
  return data;
}

/**
 * Main test execution
 */
async function main() {
  log('🚀 Starting Content Agent + Inclusivity Test');
  log(`Results will be saved to: ${resultsDir}`);
  log('');
  
  try {
    // Step 1: Create character with inclusivity traits
    const character = await createInclusiveCharacter();
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Create story record
    const storyType = 'Adventure';
    const story = await createStoryRecord(character.id, storyType);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Invoke Content Agent directly
    const storyInputs = story.metadata;
    const result = await invokeContentAgent(story.id, storyInputs, character);
    
    if (!result.success) {
      log('');
      log('❌ Content Agent invocation failed');
      log('See content-agent-error.json for details');
      process.exit(1);
    }
    
    // Wait for processing
    log('');
    log('⏳ Waiting 5 seconds for async processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 4: Fetch updated story
    const updatedStory = await fetchUpdatedStory(story.id);
    
    // Summary
    log('');
    log('============================================================');
    log('📊 TEST SUMMARY');
    log('============================================================');
    log(`Character: ${character.name} (${character.traits.inclusivityTraits?.length || 0} inclusivity traits)`);
    log(`Story: ${story.title}`);
    log(`Status: ${updatedStory?.status || 'unknown'}`);
    log(`Content Generated: ${updatedStory?.content?.beats?.length > 0 ? 'YES ✅' : 'NO ❌'}`);
    log(`Assets Generated: ${updatedStory?.asset_generation_status?.overall || 'unknown'}`);
    log(`Duration: ${result.duration}ms`);
    log('============================================================');
    log('');
    log(`✅ Test complete. Results saved to: ${resultsDir}`);
    
  } catch (error) {
    log('');
    log(`❌ Test failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run
main();


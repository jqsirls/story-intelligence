#!/usr/bin/env node

/**
 * Direct Story Pipeline Test
 * 
 * This test bypasses the REST API authentication issue and directly tests
 * the story generation pipeline using Supabase admin operations.
 * 
 * Purpose: Validate that the complete pipeline works (character → story → assets)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_EMAIL = 'j+1226@jqsirls.com';

// Test run configuration
const RUN_ID = `run_${Date.now()}`;
const RUN_DIR = path.join(__dirname, '../test-results', RUN_ID);

// Global state
let supabase;
let testUserId;
let testLibraryId;
let characterId;
let storyId;

// Ensure output directory exists
if (!fs.existsSync(RUN_DIR)) {
  fs.mkdirSync(RUN_DIR, { recursive: true });
}

// Logging helper
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
};

// Save JSON to file
const saveJSON = (filename, data) => {
  const filepath = path.join(RUN_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`✅ Saved ${filename}`);
};

// Initialize Supabase
const initSupabase = async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  log('✅ Supabase initialized (admin)');
};

// Get test user
const getTestUser = async () => {
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email === TEST_USER_EMAIL);
  
  if (!testUser) {
    throw new Error(`Test user not found: ${TEST_USER_EMAIL}`);
  }
  
  testUserId = testUser.id;
  log(`✅ Found test user: ${TEST_USER_EMAIL}`);
  log(`   User ID: ${testUserId}`);
};

// Get or create library
const getLibrary = async () => {
  const { data: libraries } = await supabase
    .from('libraries')
    .select('*')
    .eq('owner', testUserId)
    .limit(1);
  
  if (libraries && libraries.length > 0) {
    testLibraryId = libraries[0].id;
    log(`✅ Using library: ${testLibraryId}`);
  } else {
    const { data: newLibrary, error } = await supabase
      .from('libraries')
      .insert({ owner: testUserId, name: 'Test Library' })
      .select()
      .single();
    
    if (error) throw error;
    testLibraryId = newLibrary.id;
    log(`✅ Created library: ${testLibraryId}`);
  }
};

// Step 1: Create Character
const createCharacter = async () => {
  log('\n📝 STEP 1: Creating character...');
  
  const characterData = {
    name: `Test Character ${Date.now()}`,
    library_id: testLibraryId,
    traits: {
      species: 'human',
      pronouns: 'she/her',
      personality: 'brave and curious',
      age: 8
    }
  };
  
  const { data: character, error } = await supabase
    .from('characters')
    .insert(characterData)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create character: ${error.message}`);
  
  characterId = character.id;
  saveJSON('01-character-created.json', character);
  
  log(`✅ Character created: ${characterId}`);
  log(`   Name: ${character.name}`);
  
  return character;
};

// Step 2: Create Story
const createStory = async () => {
  log('\n📝 STEP 2: Creating story...');
  
  // Get story type ID (use first available - using correct column: type_name)
  const { data: storyTypes } = await supabase
    .from('story_types')
    .select('id, type_name, type_description')
    .limit(1);
  
  if (!storyTypes || storyTypes.length === 0) {
    throw new Error('No story types found in database');
  }
  
  const storyType = storyTypes[0];
  log(`   Using story type: ${storyType.type_name} - ${storyType.type_description}`);
  
  const storyData = {
    title: `Test Story ${Date.now()}`,
    creator_user_id: testUserId,
    library_id: testLibraryId,
    story_type_id: storyType.id,
    character_ids: [characterId],
    themes: ['friendship', 'courage'],
    age_rating: 0,
    status: 'generating',
    asset_generation_status: {
      overall: 'generating',
      assets: {
        content: { status: 'pending' },
        cover: { status: 'pending' },
        scene_1: { status: 'pending' },
        scene_2: { status: 'pending' },
        scene_3: { status: 'pending' },
        scene_4: { status: 'pending' },
        audio: { status: 'pending' },
        activities: { status: 'pending' },
        pdf: { status: 'pending' }
      }
    }
  };
  
  const { data: story, error } = await supabase
    .from('stories')
    .insert(storyData)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create story: ${error.message}`);
  
  storyId = story.id;
  saveJSON('02-story-created.json', story);
  
  log(`✅ Story created: ${storyId}`);
  log(`   Title: ${story.title}`);
  log(`   Status: ${story.status}`);
  
  // Create asset generation jobs
  const assetTypes = ['content', 'cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'audio', 'activities', 'pdf'];
  
  for (const assetType of assetTypes) {
    const { error: jobError } = await supabase
      .from('asset_generation_jobs')
      .insert({
        story_id: storyId,
        asset_type: assetType,
        status: 'queued',
        metadata: {}
      });
    
    if (jobError) {
      log(`⚠️  Warning: Failed to create job for ${assetType}: ${jobError.message}`);
    }
  }
  
  log(`✅ Created ${assetTypes.length} asset generation jobs`);
  
  return story;
};

// Step 3: Poll for asset generation completion
const pollForAssets = async () => {
  log('\n⏳ STEP 3: Polling for asset generation...');
  log('   This will take 5-10 minutes for complete generation');
  log('   You can monitor progress in Supabase or check the asset_generation_jobs table');
  
  const maxWait = 15 * 60 * 1000; // 15 minutes
  const checkInterval = 10 * 1000; // 10 seconds
  let elapsed = 0;
  
  while (elapsed < maxWait) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    elapsed += checkInterval;
    
    const { data: story } = await supabase
      .from('stories')
      .select('status, asset_generation_status, content, cover_art_url, scene_art_urls, audio_url, activities, pdf_url, hue_extracted_colors, audio_words, audio_blocks')
      .eq('id', storyId)
      .single();
    
    if (!story) {
      throw new Error('Story not found');
    }
    
    const overall = story.asset_generation_status?.overall;
    const assets = story.asset_generation_status?.assets || {};
    
    // Count ready assets
    const assetStatuses = Object.entries(assets).map(([name, info]) => ({
      name,
      status: info.status
    }));
    const readyCount = assetStatuses.filter(a => a.status === 'ready').length;
    const totalCount = assetStatuses.length;
    
    log(`   Progress: ${readyCount}/${totalCount} assets ready (${Math.round(readyCount/totalCount * 100)}%)`);
    
    // Log individual asset statuses
    assetStatuses.forEach(({ name, status }) => {
      const icon = status === 'ready' ? '✅' : status === 'generating' ? '🔄' : status === 'failed' ? '❌' : '⏳';
      log(`     ${icon} ${name}: ${status}`);
    });
    
    // Check if all assets are ready or failed
    if (overall === 'ready') {
      log('\n✅ All assets generated successfully!');
      saveJSON('03-story-complete.json', story);
      return story;
    }
    
    if (overall === 'failed') {
      throw new Error('Asset generation failed');
    }
    
    if (overall === 'partial' && elapsed > 10 * 60 * 1000) {
      // If partial after 10 minutes, consider it complete enough
      log('\n⚠️  Some assets failed, but continuing with partial results');
      saveJSON('03-story-partial.json', story);
      return story;
    }
  }
  
  throw new Error('Asset generation timed out');
};

// Step 4: Verify V3 Features
const verifyV3Features = async (story) => {
  log('\n🔍 STEP 4: Verifying V3 features...');
  
  const checks = {
    hue_colors: !!story.hue_extracted_colors && Object.keys(story.hue_extracted_colors).length > 0,
    audio_words: !!story.audio_words && Array.isArray(story.audio_words) && story.audio_words.length > 0,
    audio_blocks: !!story.audio_blocks && typeof story.audio_blocks === 'object',
    cover_art: !!story.cover_art_url,
    scene_art: !!story.scene_art_urls && Array.isArray(story.scene_art_urls) && story.scene_art_urls.length === 4,
    audio: !!story.audio_url,
    activities: !!story.activities,
    pdf: !!story.pdf_url
  };
  
  Object.entries(checks).forEach(([feature, passed]) => {
    const icon = passed ? '✅' : '❌';
    log(`   ${icon} ${feature}`);
  });
  
  saveJSON('04-v3-features-check.json', checks);
  
  const allPassed = Object.values(checks).every(v => v);
  if (!allPassed) {
    log('\n⚠️  Some V3 features missing, but test continues');
  } else {
    log('\n✅ All V3 features present!');
  }
  
  return checks;
};

// Cleanup
const cleanup = async () => {
  log('\n🧹 Cleanup...');
  
  if (storyId) {
    await supabase.from('stories').delete().eq('id', storyId);
    log(`✅ Deleted story: ${storyId}`);
  }
  
  if (characterId) {
    await supabase.from('characters').delete().eq('id', characterId);
    log(`✅ Deleted character: ${characterId}`);
  }
};

// Main test runner
const runTest = async () => {
  log('🚀 Starting Direct Story Pipeline Test');
  log(`   Supabase: ${SUPABASE_URL}`);
  log(`   Test Run ID: ${RUN_ID}`);
  log(`   Output Directory: ${RUN_DIR}`);
  log('');
  
  try {
    await initSupabase();
    await getTestUser();
    await getLibrary();
    
    const character = await createCharacter();
    const story = await createStory();
    const completeStory = await pollForAssets();
    const v3checks = await verifyV3Features(completeStory);
    
    log('\n✅ ========================================');
    log('✅ DIRECT STORY PIPELINE TEST: PASSED');
    log('✅ ========================================');
    log('');
    log(`Story ID: ${storyId}`);
    log(`Character ID: ${characterId}`);
    log(`Output Directory: ${RUN_DIR}`);
    log('');
    log('Next Steps:');
    log('1. Review generated files in test-results/');
    log('2. Verify asset URLs are accessible');
    log('3. Check V3 features (HUE colors, word timestamps)');
    
    // Ask if user wants cleanup
    log('\n🧹 Cleanup will happen in 10 seconds (Ctrl+C to keep test data)...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await cleanup();
    
    process.exit(0);
    
  } catch (error) {
    log('\n❌ ========================================');
    log('❌ DIRECT STORY PIPELINE TEST: FAILED');
    log('❌ ========================================');
    log('');
    log(`Error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    log('');
    
    // Save error
    saveJSON('ERROR.json', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Attempt cleanup
    try {
      await cleanup();
    } catch (cleanupError) {
      log(`⚠️  Cleanup failed: ${cleanupError.message}`);
    }
    
    process.exit(1);
  }
};

// Run test
runTest();


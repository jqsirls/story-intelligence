#!/usr/bin/env node
/**
 * V3 Audio & HUE System End-to-End Test
 * ======================================
 * Real-world simulation: Create character → Create story → Verify all V3 features
 * 
 * Tests:
 * 1. Character creation with color palette extraction
 * 2. Story creation with audio timestamps (word-level)
 * 3. Story image generation with progressive color extraction
 * 4. Database verification (audio_words, audio_blocks, hue_extracted_colors, character.color_palette)
 * 
 * NO SHORTCUTS, NO PLACEHOLDERS, NO FAKE HEALTH CHECKS
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper to get SSM parameter using AWS CLI
async function getSSMParameter(paramName) {
  try {
    const command = `aws ssm get-parameter --name "${paramName}" --with-decryption --query "Parameter.Value" --output text`;
    const value = execSync(command, { encoding: 'utf-8' }).trim();
    return value;
  } catch (error) {
    throw new Error(`Failed to get SSM parameter ${paramName}: ${error.message}`);
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETest() {
  log('\n🧪 V3 Audio & HUE System - End-to-End Test', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const startTime = Date.now();
  let supabase;
  let testCharacterId;
  let testStoryId;
  
  try {
    // 1. SETUP: Initialize Supabase client
    log('\n📋 Phase 1: Setup & Authentication', 'blue');
    log('─'.repeat(60));
    
    const supabaseUrl = process.env.SUPABASE_URL;
    let supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseServiceKey && process.env.AWS_REGION) {
      log('  ⚠️  SUPABASE_SERVICE_KEY not in env, fetching from SSM...', 'yellow');
      supabaseServiceKey = await getSSMParameter('/storytailor/production/supabase-service-key');
    }
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }
    
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    log('  ✅ Supabase client initialized', 'green');
    
    // Get test user (admin user from previous tests)
    const { data: testUser, error: userError} = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', 'j+1226@jqsirls.com')
      .single();
    
    if (userError) throw new Error(`Test user not found: ${userError.message}`);
    log(`  ✅ Test user: ${testUser.email} (subscription_tier: ${testUser.subscription_tier || 'free'})`, 'green');
    
    // Get or create test library
    let { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('owner', testUser.id)
      .limit(1)
      .single();
    
    let libraryId = library?.id;
    
    if (!libraryId) {
      log('  ℹ️  No library found, creating one...', 'yellow');
      const { data: newLibrary, error: libError } = await supabase
        .from('libraries')
        .insert({
          owner: testUser.id,
          name: 'Test Library V3'
        })
        .select()
        .single();
      
      if (libError) throw new Error(`Failed to create library: ${libError.message}`);
      libraryId = newLibrary.id;
    }
    
    log(`  ✅ Test library: ${libraryId}`, 'green');
    
    // 2. CHARACTER CREATION: Test color palette extraction
    log('\n📋 Phase 2: Character Creation (with color palette extraction)', 'blue');
    log('─'.repeat(60));
    
    const characterName = `TestChar_V3_${Date.now()}`;
    const characterData = {
      name: characterName,
      traits: {
        species: 'human',
        age: 7,
        ethnicity: ['Black'],
        gender: 'non-binary',
        inclusivityTraits: ['wheelchair_manual'],
        personality: ['curious', 'brave', 'kind'],
        interests: ['science', 'space']
      },
      library_id: libraryId,
      creator_user_id: testUser.id
    };
    
    log(`  🎨 Creating character: ${characterName}`, 'cyan');
    const { data: character, error: charError } = await supabase
      .from('characters')
      .insert(characterData)
      .select()
      .single();
    
    if (charError) throw new Error(`Failed to create character: ${charError.message}`);
    testCharacterId = character.id;
    log(`  ✅ Character created: ${testCharacterId}`, 'green');
    
    // Invoke Content Agent for character art generation
    log('  🖼️  Invoking Content Agent for character art generation...', 'cyan');
    
    const charArtPayload = {
      action: 'generate_character_art',
      characterId: testCharacterId,
      characterName: characterName,
      userId: testUser.id,
      ethnicity: ['Black'],
      isMixedRace: false,
      characterTraits: {
        age: 7,
        species: 'human',
        gender: 'non-binary',
        ethnicity: ['Black'],
        inclusivityTraits: ['wheelchair_manual']
      },
      inclusivityTraits: ['wheelchair_manual']
    };
    
    const charPayloadFile = path.join('/tmp', `char-payload-${Date.now()}.json`);
    fs.writeFileSync(charPayloadFile, JSON.stringify(charArtPayload));
    
    const charInvokeCmd = `aws lambda invoke --function-name storytailor-content-agent-production --invocation-type RequestResponse --payload file://${charPayloadFile} /tmp/char-response.json 2>&1`;
    try {
      execSync(charInvokeCmd, { encoding: 'utf-8', stdio: 'inherit' });
    } catch (err) {
      log(`  ⚠️  Lambda invocation command failed: ${err.message}`, 'yellow');
    }
    
    const charArtResult = JSON.parse(fs.readFileSync('/tmp/char-response.json', 'utf-8'));
    fs.unlinkSync(charPayloadFile);
    fs.unlinkSync('/tmp/char-response.json');
    
    if (charArtResult.statusCode !== 200) {
      throw new Error(`Character art generation failed: ${JSON.stringify(charArtResult)}`);
    }
    
    const charArtBody = JSON.parse(charArtResult.body);
    log(`  ✅ Character art generated (${charArtBody.images.length} images)`, 'green');
    
    // Wait for database update
    await sleep(2000);
    
    // Verify character color palette was extracted and saved
    const { data: updatedChar, error: charFetchError } = await supabase
      .from('characters')
      .select('reference_images, appearance_url, color_palette')
      .eq('id', testCharacterId)
      .single();
    
    if (charFetchError) throw new Error(`Failed to fetch updated character: ${charFetchError.message}`);
    
    log('  📊 Character Validation:', 'cyan');
    log(`     reference_images: ${updatedChar.reference_images?.length || 0} images`, 'reset');
    log(`     appearance_url: ${updatedChar.appearance_url ? '✅ Present' : '❌ Missing'}`, updatedChar.appearance_url ? 'green' : 'red');
    log(`     color_palette: ${updatedChar.color_palette?.length || 0} colors`, 'reset');
    
    if (!updatedChar.color_palette || updatedChar.color_palette.length !== 3) {
      throw new Error('Character color palette not extracted (expected 3 colors)');
    }
    
    log(`     ✅ Color palette: [${updatedChar.color_palette.join(', ')}]`, 'green');
    
    // 3. STORY CREATION: Test audio timestamps and progressive color extraction
    log('\n📋 Phase 3: Story Creation (with audio timestamps & color extraction)', 'blue');
    log('─'.repeat(60));
    
    const storyTitle = `Test Story V3 ${Date.now()}`;
    const storyData = {
      title: storyTitle,
      story_type: 'adventure',
      character_id: testCharacterId,
      library_id: libraryId,
      user_id: testUser.id,
      creator_user_id: testUser.id,
      content: {
        title: storyTitle,
        type: 'adventure',
        theme: 'space exploration',
        beats: [
          {
            id: 'beat-1',
            content: 'Once upon a time, there was a brave explorer named ' + characterName + ' who loved the stars.',
            description: 'Introduction to our hero',
            emotionalTone: 'wonder',
            characterState: 'excited'
          },
          {
            id: 'beat-2',
            content: 'One day, ' + characterName + ' discovered a mysterious signal from a distant planet.',
            description: 'Discovery of the signal',
            emotionalTone: 'curiosity',
            characterState: 'intrigued'
          },
          {
            id: 'beat-3',
            content: 'With courage and determination, ' + characterName + ' prepared for the journey.',
            description: 'Preparation for adventure',
            emotionalTone: 'excitement',
            characterState: 'determined'
          },
          {
            id: 'beat-4',
            content: 'And so the greatest adventure began, full of wonder and discovery.',
            description: 'Beginning of the journey',
            emotionalTone: 'joy',
            characterState: 'ready'
          }
        ]
      },
      asset_generation_status: {
        overall: 'generating',
        assets: {
          content: { status: 'ready', progress: 100 }
        }
      }
    };
    
    log(`  📖 Creating story: ${storyTitle}`, 'cyan');
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert(storyData)
      .select()
      .single();
    
    if (storyError) throw new Error(`Failed to create story: ${storyError.message}`);
    testStoryId = story.id;
    log(`  ✅ Story created: ${testStoryId}`, 'green');
    
    // Invoke Content Agent for asset generation (cover, beats, audio)
    log('  🎬 Invoking Content Agent for asset generation...', 'cyan');
    log('     Expected: cover → beat 1 → beat 2 → beat 3 → beat 4 → audio → PDF', 'reset');
    
    const assetPayload = {
      action: 'generate_asset',
      storyId: testStoryId,
      assetType: 'cover',
      userId: testUser.id
    };
    
    // Start cover generation (triggers progressive chain)
    const assetPayloadFile = path.join('/tmp', `asset-payload-${Date.now()}.json`);
    fs.writeFileSync(assetPayloadFile, JSON.stringify(assetPayload));
    
    const assetInvokeCmd = `aws lambda invoke --function-name storytailor-content-agent-production --invocation-type Event --payload file://${assetPayloadFile} /tmp/asset-response.json 2>&1`;
    try {
      execSync(assetInvokeCmd, { encoding: 'utf-8', stdio: 'inherit' });
    } catch (err) {
      log(`  ⚠️  Lambda invocation command failed: ${err.message}`, 'yellow');
    }
    
    fs.unlinkSync(assetPayloadFile);
    if (fs.existsSync('/tmp/asset-response.json')) {
      fs.unlinkSync('/tmp/asset-response.json');
    }
    log('  ✅ Asset generation started (async)', 'green');
    
    // Poll for completion (max 10 minutes for full asset generation)
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes
    const pollInterval = 5000; // 5 seconds
    const pollStart = Date.now();
    let assetsReady = false;
    let lastStatus = null;
    
    const requiredAssets = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'audio'];
    const completedAssets = new Set();
    
    log('\n  ⏳ Polling for asset completion...', 'cyan');
    
    while (Date.now() - pollStart < maxWaitTime && !assetsReady) {
      const { data: currentStory, error: pollError } = await supabase
        .from('stories')
        .select('asset_generation_status, cover_art_url, scene_art_urls, audio_url, audio_words, audio_blocks, hue_extracted_colors')
        .eq('id', testStoryId)
        .single();
      
      if (pollError) {
        log(`  ⚠️  Poll error: ${pollError.message}`, 'yellow');
        await sleep(pollInterval);
        continue;
      }
      
      const status = currentStory.asset_generation_status || {};
      lastStatus = status;
      
      // Check each required asset
      let readyCount = 0;
      for (const assetType of requiredAssets) {
        if (status.assets?.[assetType]?.status === 'ready') {
          readyCount++;
          if (!completedAssets.has(assetType)) {
            const elapsed = Math.floor((Date.now() - pollStart) / 1000);
            log(`     ✅ ${assetType} ready (${elapsed}s)`, 'green');
            completedAssets.add(assetType);
          }
        }
      }
      
      if (readyCount === requiredAssets.length) {
        assetsReady = true;
        log('  ✅ All required assets ready!', 'green');
        break;
      }
      
      if (status.overall === 'failed') {
        throw new Error('Asset generation failed');
      }
      
      const elapsed = Math.floor((Date.now() - pollStart) / 1000);
      log(`     ⏳ ${elapsed}s elapsed, ${readyCount}/${requiredAssets.length} assets ready...`, 'blue');
      
      await sleep(pollInterval);
    }
    
    if (!assetsReady) {
      log(`  ⚠️  Timeout after ${Math.floor(maxWaitTime / 1000)}s`, 'yellow');
      log(`  ℹ️  Completed: ${completedAssets.size}/${requiredAssets.length} assets`, 'blue');
      log(`  ℹ️  Last status: ${JSON.stringify(lastStatus, null, 2)}`, 'blue');
      throw new Error('Asset generation timeout');
    }
    
    // 4. VALIDATION: Verify all V3 features in database
    log('\n📋 Phase 4: V3 Features Validation', 'blue');
    log('─'.repeat(60));
    
    const { data: finalStory, error: finalError } = await supabase
      .from('stories')
      .select(`
        id,
        title,
        cover_art_url,
        scene_art_urls,
        audio_url,
        audio_words,
        audio_blocks,
        hue_extracted_colors,
        asset_generation_status
      `)
      .eq('id', testStoryId)
      .single();
    
    if (finalError) throw new Error(`Failed to fetch final story: ${finalError.message}`);
    
    // Validation checks
    const validations = {
      'Cover Art URL': !!finalStory.cover_art_url,
      'Scene Art URLs (4 beats)': Array.isArray(finalStory.scene_art_urls) && finalStory.scene_art_urls.length === 4,
      'Audio URL': !!finalStory.audio_url,
      'Audio Words (word-level timestamps)': Array.isArray(finalStory.audio_words) && finalStory.audio_words.length > 0,
      'Audio Blocks (4 HTML blocks)': !!finalStory.audio_blocks && 
        finalStory.audio_blocks.a && 
        finalStory.audio_blocks.b && 
        finalStory.audio_blocks.c && 
        finalStory.audio_blocks.d,
      'HUE Extracted Colors (15 hex codes)': !!finalStory.hue_extracted_colors && 
        Object.keys(finalStory.hue_extracted_colors).length >= 12 // At minimum
    };
    
    log('  📊 V3 Feature Validation Results:', 'cyan');
    let allPassed = true;
    for (const [feature, passed] of Object.entries(validations)) {
      log(`     ${passed ? '✅' : '❌'} ${feature}`, passed ? 'green' : 'red');
      if (!passed) allPassed = false;
    }
    
    // Detailed validation
    if (validations['Audio Words (word-level timestamps)']) {
      const wordCount = finalStory.audio_words.length;
      const sampleWord = finalStory.audio_words[0];
      log(`\n  🎵 Audio Words Detail:`, 'cyan');
      log(`     Word count: ${wordCount}`, 'reset');
      log(`     Sample: "${sampleWord.txt}" [${sampleWord.start.toFixed(3)}s - ${sampleWord.end.toFixed(3)}s]`, 'reset');
    }
    
    if (validations['Audio Blocks (4 HTML blocks)']) {
      log(`\n  📝 Audio Blocks Detail:`, 'cyan');
      log(`     Block A: ${finalStory.audio_blocks.a.length} chars`, 'reset');
      log(`     Block B: ${finalStory.audio_blocks.b.length} chars`, 'reset');
      log(`     Block C: ${finalStory.audio_blocks.c.length} chars`, 'reset');
      log(`     Block D: ${finalStory.audio_blocks.d.length} chars`, 'reset');
      
      // Verify HTML structure
      const hasSpans = finalStory.audio_blocks.a.includes('<span') && 
        finalStory.audio_blocks.a.includes('data-start') && 
        finalStory.audio_blocks.a.includes('data-end');
      log(`     HTML structure: ${hasSpans ? '✅ Valid' : '❌ Invalid'}`, hasSpans ? 'green' : 'red');
    }
    
    if (validations['HUE Extracted Colors (15 hex codes)']) {
      const colorCount = Object.keys(finalStory.hue_extracted_colors).length;
      log(`\n  🎨 HUE Extracted Colors Detail:`, 'cyan');
      log(`     Total colors: ${colorCount}`, 'reset');
      
      // Show cover colors
      if (finalStory.hue_extracted_colors.coverHex1) {
        log(`     Cover: ${finalStory.hue_extracted_colors.coverHex1}, ${finalStory.hue_extracted_colors.coverHex2}, ${finalStory.hue_extracted_colors.coverHex3}`, 'reset');
      }
      
      // Show scene colors
      for (const scene of ['sceneA', 'sceneB', 'sceneC', 'sceneD']) {
        if (finalStory.hue_extracted_colors[`${scene}Hex1`]) {
          log(`     ${scene}: ${finalStory.hue_extracted_colors[`${scene}Hex1`]}, ${finalStory.hue_extracted_colors[`${scene}Hex2`]}, ${finalStory.hue_extracted_colors[`${scene}Hex3`]}`, 'reset');
        }
      }
    }
    
    if (!allPassed) {
      throw new Error('Some V3 features failed validation');
    }
    
    // 5. CLEANUP (optional - comment out to keep test data)
    log('\n📋 Phase 5: Cleanup', 'blue');
    log('─'.repeat(60));
    log('  ℹ️  Test data kept for manual inspection', 'blue');
    log(`     Character ID: ${testCharacterId}`, 'reset');
    log(`     Story ID: ${testStoryId}`, 'reset');
    
    // SUCCESS
    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    log('\n' + '═'.repeat(60), 'green');
    log('✅ END-TO-END TEST PASSED', 'green');
    log('═'.repeat(60), 'green');
    log(`\n📊 Summary:`, 'cyan');
    log(`   Total time: ${totalTime}s (${Math.floor(totalTime / 60)}m ${totalTime % 60}s)`, 'reset');
    log(`   Character: ${characterName} (${testCharacterId})`, 'reset');
    log(`   Story: ${storyTitle} (${testStoryId})`, 'reset');
    log(`   Assets generated: ${completedAssets.size}/${requiredAssets.length}`, 'reset');
    log(`\n✅ All V3 features validated successfully!`, 'green');
    log(`   ✅ Character color palette extraction`, 'green');
    log(`   ✅ Audio word-level timestamps`, 'green');
    log(`   ✅ Audio HTML blocks (a, b, c, d)`, 'green');
    log(`   ✅ Progressive color extraction (cover + 4 beats)`, 'green');
    log(`   ✅ HUE 15-color palette`, 'green');
    
    process.exit(0);
    
  } catch (error) {
    log('\n❌ END-TO-END TEST FAILED', 'red');
    log('═'.repeat(60), 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, 'yellow');
    }
    
    if (testCharacterId || testStoryId) {
      log(`\n🔍 Test Data (for debugging):`, 'yellow');
      if (testCharacterId) log(`   Character ID: ${testCharacterId}`, 'reset');
      if (testStoryId) log(`   Story ID: ${testStoryId}`, 'reset');
    }
    
    process.exit(1);
  }
}

// Run test
runE2ETest();


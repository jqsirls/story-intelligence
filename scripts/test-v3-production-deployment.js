#!/usr/bin/env node
/**
 * V3 Production Deployment Test
 * =============================
 * Simulates real user creating character + story
 * Verifies all V3 features in production Lambda
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logJson(obj, title = '') {
  if (title) log(`\n${title}:`, 'cyan');
  console.log(JSON.stringify(obj, null, 2));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  log('\n🧪 V3 PRODUCTION DEPLOYMENT TEST', 'cyan');
  log('═'.repeat(80), 'cyan');
  log(`Started: ${new Date().toISOString()}`, 'blue');
  
  const startTime = Date.now();
  let testCharacterId, testStoryId, testLibraryId;
  
  try {
    // ===================================================================
    // SETUP: Initialize Supabase
    // ===================================================================
    log('\n📋 Phase 1: Setup', 'blue');
    log('─'.repeat(80));
    
    const supabaseUrl = 'https://lendybmmnlqelrhkhdyc.supabase.co';
    const supabaseServiceKey = execSync(
      'aws ssm get-parameter --name /storytailor-production/supabase/service-key --with-decryption --query "Parameter.Value" --output text',
      { encoding: 'utf-8' }
    ).trim();
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    log('  ✅ Supabase client initialized', 'green');
    
    // Get test user
    const { data: testUser } = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', 'j+1226@jqsirls.com')
      .single();
    
    log(`  ✅ Test user: ${testUser.email} (tier: ${testUser.subscription_tier})`, 'green');
    
    // Get/create library
    let { data: library } = await supabase
      .from('libraries')
      .select('id')
      .eq('owner', testUser.id)
      .limit(1)
      .single();
    
    if (!library) {
      const { data: newLib } = await supabase
        .from('libraries')
        .insert({ owner: testUser.id, name: 'Test Library V3' })
        .select()
        .single();
      library = newLib;
    }
    
    testLibraryId = library.id;
    log(`  ✅ Test library: ${testLibraryId}`, 'green');
    
    // ===================================================================
    // TEST 1: Create Character → Verify Color Palette Extraction
    // ===================================================================
    log('\n📋 Phase 2: Character Creation (Color Palette Extraction)', 'blue');
    log('─'.repeat(80));
    
    const characterName = `V3_Test_Char_${Date.now()}`;
    const characterData = {
      name: characterName,
      traits: {
        species: 'human',
        age: 7,
        ethnicity: ['Black'],
        gender: 'non-binary',
        inclusivityTraits: ['wheelchair_manual'],
        personality: ['curious', 'brave'],
        interests: ['science', 'space']
      },
      library_id: testLibraryId,
      creator_user_id: testUser.id
    };
    
    log(`  🎨 Creating character: ${characterName}`, 'cyan');
    const { data: character, error: charError } = await supabase
      .from('characters')
      .insert(characterData)
      .select()
      .single();
    
    if (charError) throw new Error(`Character creation failed: ${charError.message}`);
    testCharacterId = character.id;
    log(`  ✅ Character created: ${testCharacterId}`, 'green');
    
    // Invoke Lambda for character art generation (via base64-encoded CLI)
    log('\n  🖼️  Invoking Lambda for character art...', 'cyan');
    const charPayload = {
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
    
    log('  ⏳ Generating character images (this takes ~60 seconds)...', 'yellow');
    const charInvokeStart = Date.now();
    
    try {
      const charPayloadB64 = Buffer.from(JSON.stringify(charPayload)).toString('base64');
      execSync(
        `aws lambda invoke --function-name storytailor-content-agent-production --invocation-type RequestResponse --payload "${charPayloadB64}" /tmp/char-response.json`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      
      const charResponse = JSON.parse(fs.readFileSync('/tmp/char-response.json', 'utf-8'));
      const charInvokeTime = Math.round((Date.now() - charInvokeStart) / 1000);
      
      log(`  ✅ Lambda invocation complete (${charInvokeTime}s)`, 'green');
      
      if (charResponse.statusCode === 200) {
        const charBody = JSON.parse(charResponse.body);
        log(`  ✅ Character art generated: ${charBody.images?.length || 0} images`, 'green');
        logJson(charBody, '  📄 Character Art Response');
      } else {
        log(`  ⚠️  Lambda returned non-200 status: ${charResponse.statusCode}`, 'yellow');
        logJson(charResponse, '  📄 Lambda Response');
      }
    } catch (error) {
      log(`  ⚠️  Lambda invocation error: ${error.message}`, 'yellow');
    }
    
    // Wait for database update
    await sleep(3000);
    
    // Verify character color palette
    log('\n  🔍 Verifying character color palette...', 'cyan');
    const { data: updatedChar } = await supabase
      .from('characters')
      .select('id, name, reference_images, appearance_url, color_palette')
      .eq('id', testCharacterId)
      .single();
    
    log('\n  📊 Character V3 Fields:', 'cyan');
    log(`     ID: ${updatedChar.id}`, 'reset');
    log(`     Name: ${updatedChar.name}`, 'reset');
    log(`     Reference Images: ${updatedChar.reference_images?.length || 0} images`, updatedChar.reference_images?.length > 0 ? 'green' : 'yellow');
    log(`     Appearance URL: ${updatedChar.appearance_url ? '✅ Present' : '❌ Missing'}`, updatedChar.appearance_url ? 'green' : 'red');
    log(`     Color Palette: ${updatedChar.color_palette?.length || 0} colors`, updatedChar.color_palette?.length === 3 ? 'green' : 'red');
    
    if (updatedChar.color_palette && updatedChar.color_palette.length > 0) {
      log(`     Colors: ${updatedChar.color_palette.join(', ')}`, 'magenta');
      logJson(updatedChar, '  📄 Full Character Response');
    } else {
      log('     ⚠️  Color palette not extracted yet (may still be processing)', 'yellow');
    }
    
    // ===================================================================
    // TEST 2: Create Story → Verify Audio Timestamps + HUE Colors
    // ===================================================================
    log('\n📋 Phase 3: Story Creation (Audio Timestamps + HUE Colors)', 'blue');
    log('─'.repeat(80));
    
    // Get a story_type_id first
    const { data: storyTypes } = await supabase
      .from('story_types')
      .select('id')
      .eq('name', 'adventure')
      .limit(1)
      .single();
    
    const storyTypeId = storyTypes?.id || 1; // Fallback to ID 1 if not found
    
    const storyTitle = `V3 Test Story ${Date.now()}`;
    const storyData = {
      title: storyTitle,
      story_type_id: storyTypeId,
      library_id: testLibraryId,
      creator_user_id: testUser.id,
      content: {
        title: storyTitle,
        type: 'adventure',
        theme: 'space exploration',
        characterId: testCharacterId, // Store character reference in content
        beats: [
          {
            id: 'beat-1',
            content: `Once upon a time, there was a brave explorer named ${characterName} who loved the stars.`,
            description: 'Introduction',
            emotionalTone: 'wonder',
            characterState: 'excited'
          },
          {
            id: 'beat-2',
            content: `${characterName} discovered a mysterious signal from a distant planet.`,
            description: 'Discovery',
            emotionalTone: 'curiosity',
            characterState: 'intrigued'
          },
          {
            id: 'beat-3',
            content: `With courage and determination, ${characterName} prepared for the journey.`,
            description: 'Preparation',
            emotionalTone: 'excitement',
            characterState: 'determined'
          },
          {
            id: 'beat-4',
            content: 'And so the greatest adventure began, full of wonder and discovery.',
            description: 'Beginning',
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
    
    if (storyError) throw new Error(`Story creation failed: ${storyError.message}`);
    testStoryId = story.id;
    log(`  ✅ Story created: ${testStoryId}`, 'green');
    
    // Trigger asset generation (cover art → beats → audio)
    log('\n  🎬 Triggering asset generation pipeline...', 'cyan');
    const assetPayload = {
      action: 'generate_asset',
      storyId: testStoryId,
      assetType: 'cover',
      userId: testUser.id
    };
    
    log('  ⏳ Asset generation started (this takes ~5-10 minutes)...', 'yellow');
    log('     Expected: cover → beat1 → beat2 → beat3 → beat4 → audio → PDF', 'reset');
    
    try {
      const assetPayloadB64 = Buffer.from(JSON.stringify(assetPayload)).toString('base64');
      execSync(
        `aws lambda invoke --function-name storytailor-content-agent-production --invocation-type Event --payload "${assetPayloadB64}" /tmp/asset-response.json`,
        { encoding: 'utf-8', stdio: 'pipe' }
      );
      log('  ✅ Asset generation triggered (async)', 'green');
    } catch (error) {
      log(`  ⚠️  Asset trigger error: ${error.message}`, 'yellow');
    }
    
    // Poll for completion
    log('\n  ⏳ Polling for asset completion...', 'cyan');
    const maxPollTime = 10 * 60 * 1000; // 10 minutes
    const pollInterval = 10000; // 10 seconds
    const pollStart = Date.now();
    
    const requiredAssets = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'audio'];
    let lastStatus = null;
    let assetsReady = false;
    
    while (Date.now() - pollStart < maxPollTime && !assetsReady) {
      const { data: currentStory } = await supabase
        .from('stories')
        .select('asset_generation_status, cover_art_url, scene_art_urls, audio_url, audio_words, audio_blocks, hue_extracted_colors, spatial_audio_tracks')
        .eq('id', testStoryId)
        .single();
      
      const status = currentStory.asset_generation_status || {};
      lastStatus = status;
      
      // Count ready assets
      let readyCount = 0;
      const assetStatuses = [];
      for (const assetType of requiredAssets) {
        const assetStatus = status.assets?.[assetType]?.status || 'pending';
        assetStatuses.push(`${assetType}:${assetStatus}`);
        if (assetStatus === 'ready') readyCount++;
      }
      
      const elapsed = Math.floor((Date.now() - pollStart) / 1000);
      log(`     [${elapsed}s] ${readyCount}/${requiredAssets.length} ready - ${assetStatuses.join(', ')}`, 'blue');
      
      // Check if all ready
      if (readyCount === requiredAssets.length) {
        assetsReady = true;
        log('  ✅ All assets ready!', 'green');
        break;
      }
      
      if (status.overall === 'failed') {
        log('  ❌ Asset generation failed', 'red');
        break;
      }
      
      await sleep(pollInterval);
    }
    
    if (!assetsReady) {
      log(`  ⚠️  Timeout after ${Math.floor(maxPollTime / 1000)}s`, 'yellow');
      log('  ℹ️  Assets may still be generating. Check database directly.', 'blue');
    }
    
    // ===================================================================
    // VERIFICATION: Check all V3 fields
    // ===================================================================
    log('\n📋 Phase 4: V3 Features Verification', 'blue');
    log('─'.repeat(80));
    
    const { data: finalStory } = await supabase
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
        spatial_audio_tracks,
        asset_generation_status
      `)
      .eq('id', testStoryId)
      .single();
    
    log('\n  📊 V3 Features Status:', 'cyan');
    
    // Core Assets
    log('\n  🎨 Core Assets:', 'cyan');
    log(`     Cover Art: ${finalStory.cover_art_url ? '✅ Generated' : '❌ Missing'}`, finalStory.cover_art_url ? 'green' : 'red');
    log(`     Scene Arts: ${finalStory.scene_art_urls?.length || 0}/4 generated`, finalStory.scene_art_urls?.length === 4 ? 'green' : 'yellow');
    log(`     Audio URL: ${finalStory.audio_url ? '✅ Generated' : '❌ Missing'}`, finalStory.audio_url ? 'green' : 'red');
    
    // V3 Feature: Audio Timestamps
    log('\n  🎵 Audio Timestamps (V3):', 'cyan');
    const hasAudioWords = Array.isArray(finalStory.audio_words) && finalStory.audio_words.length > 0;
    log(`     audio_words: ${hasAudioWords ? '✅ Present' : '❌ Missing'}`, hasAudioWords ? 'green' : 'red');
    if (hasAudioWords) {
      log(`     Word count: ${finalStory.audio_words.length}`, 'green');
      log(`     Sample word: "${finalStory.audio_words[0].txt}" [${finalStory.audio_words[0].start}s - ${finalStory.audio_words[0].end}s]`, 'magenta');
    }
    
    // V3 Feature: HTML Blocks
    log('\n  📝 HTML Blocks (V3):', 'cyan');
    const hasAudioBlocks = finalStory.audio_blocks && 
      finalStory.audio_blocks.a && 
      finalStory.audio_blocks.b && 
      finalStory.audio_blocks.c && 
      finalStory.audio_blocks.d;
    log(`     audio_blocks: ${hasAudioBlocks ? '✅ Present' : '❌ Missing'}`, hasAudioBlocks ? 'green' : 'red');
    if (hasAudioBlocks) {
      log(`     Block A: ${finalStory.audio_blocks.a.length} chars`, 'green');
      log(`     Block B: ${finalStory.audio_blocks.b.length} chars`, 'green');
      log(`     Block C: ${finalStory.audio_blocks.c.length} chars`, 'green');
      log(`     Block D: ${finalStory.audio_blocks.d.length} chars`, 'green');
      
      // Check for <span> elements
      const hasSpans = finalStory.audio_blocks.a.includes('<span') && 
        finalStory.audio_blocks.a.includes('data-start') && 
        finalStory.audio_blocks.a.includes('data-end');
      log(`     HTML structure: ${hasSpans ? '✅ Valid spans' : '❌ Invalid'}`, hasSpans ? 'green' : 'red');
    }
    
    // V3 Feature: HUE Colors
    log('\n  🎨 HUE Color Extraction (V3):', 'cyan');
    const hasHueColors = finalStory.hue_extracted_colors && 
      Object.keys(finalStory.hue_extracted_colors).length >= 12;
    log(`     hue_extracted_colors: ${hasHueColors ? '✅ Present' : '❌ Missing'}`, hasHueColors ? 'green' : 'red');
    if (hasHueColors) {
      const colorCount = Object.keys(finalStory.hue_extracted_colors).length;
      log(`     Total colors: ${colorCount}/15`, colorCount === 15 ? 'green' : 'yellow');
      
      // Show cover colors
      if (finalStory.hue_extracted_colors.coverHex1) {
        log(`     Cover: ${finalStory.hue_extracted_colors.coverHex1}, ${finalStory.hue_extracted_colors.coverHex2}, ${finalStory.hue_extracted_colors.coverHex3}`, 'magenta');
      }
      
      // Show scene colors
      for (const scene of ['sceneA', 'sceneB', 'sceneC', 'sceneD']) {
        if (finalStory.hue_extracted_colors[`${scene}Hex1`]) {
          log(`     ${scene}: ${finalStory.hue_extracted_colors[`${scene}Hex1`]}, ${finalStory.hue_extracted_colors[`${scene}Hex2`]}, ${finalStory.hue_extracted_colors[`${scene}Hex3`]}`, 'magenta');
        }
      }
    }
    
    // V3 Feature: SFX Tracks (Pro only)
    log('\n  🔊 SFX Tracks (V3 - Pro):', 'cyan');
    const hasSFX = finalStory.spatial_audio_tracks && 
      finalStory.spatial_audio_tracks.ambientBedUrl;
    log(`     spatial_audio_tracks: ${hasSFX ? '✅ Present' : '⚠️  Not generated (may not be Pro user)'}`, hasSFX ? 'green' : 'yellow');
    if (hasSFX) {
      log(`     Ambient bed: ${finalStory.spatial_audio_tracks.ambientBedUrl}`, 'green');
      log(`     Left spatial: ${finalStory.spatial_audio_tracks.leftSpatialUrl}`, 'green');
      log(`     Right spatial: ${finalStory.spatial_audio_tracks.rightSpatialUrl}`, 'green');
      log(`     Mixed narration: ${finalStory.spatial_audio_tracks.mixedNarrationUrl}`, 'green');
    }
    
    // ===================================================================
    // FULL RESPONSE OUTPUT
    // ===================================================================
    log('\n📋 Phase 5: Full Response Data', 'blue');
    log('─'.repeat(80));
    
    logJson(finalStory, '  📄 Complete Story Response (V3)');
    
    // ===================================================================
    // SUMMARY
    // ===================================================================
    const totalTime = Math.round((Date.now() - startTime) / 1000);
    log('\n' + '═'.repeat(80), 'green');
    log('✅ V3 PRODUCTION TEST COMPLETE', 'green');
    log('═'.repeat(80), 'green');
    
    log('\n📊 Test Summary:', 'cyan');
    log(`   Total time: ${totalTime}s (${Math.floor(totalTime / 60)}m ${totalTime % 60}s)`, 'reset');
    log(`   Character ID: ${testCharacterId}`, 'reset');
    log(`   Story ID: ${testStoryId}`, 'reset');
    
    log('\n✅ V3 Features Verification:', 'cyan');
    log(`   Character color palette: ${updatedChar.color_palette?.length === 3 ? '✅ PASS' : '❌ FAIL'}`, updatedChar.color_palette?.length === 3 ? 'green' : 'red');
    log(`   Audio word timestamps: ${hasAudioWords ? '✅ PASS' : '❌ FAIL'}`, hasAudioWords ? 'green' : 'red');
    log(`   Audio HTML blocks: ${hasAudioBlocks ? '✅ PASS' : '❌ FAIL'}`, hasAudioBlocks ? 'green' : 'red');
    log(`   HUE color extraction: ${hasHueColors ? '✅ PASS' : '❌ FAIL'}`, hasHueColors ? 'green' : 'red');
    log(`   SFX tracks (Pro): ${hasSFX ? '✅ PASS' : '⚠️  SKIP (not Pro)'}`, hasSFX ? 'green' : 'yellow');
    
    const passCount = [
      updatedChar.color_palette?.length === 3,
      hasAudioWords,
      hasAudioBlocks,
      hasHueColors
    ].filter(Boolean).length;
    
    log(`\n📊 Pass Rate: ${passCount}/4 core V3 features`, passCount === 4 ? 'green' : 'yellow');
    
    if (passCount === 4) {
      log('\n🎉 ALL V3 FEATURES WORKING IN PRODUCTION!', 'green');
    } else {
      log('\n⚠️  Some V3 features may still be processing or failed', 'yellow');
      log('   Check CloudWatch logs for details', 'blue');
    }
    
    log('\n✅ Test data preserved for manual inspection', 'green');
    log(`   Character: ${testCharacterId}`, 'reset');
    log(`   Story: ${testStoryId}`, 'reset');
    
    process.exit(passCount === 4 ? 0 : 1);
    
  } catch (error) {
    log('\n❌ TEST FAILED', 'red');
    log('═'.repeat(80), 'red');
    log(`Error: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:\n${error.stack}`, 'yellow');
    }
    
    if (testCharacterId || testStoryId) {
      log('\n🔍 Test Data (for debugging):', 'yellow');
      if (testCharacterId) log(`   Character ID: ${testCharacterId}`, 'reset');
      if (testStoryId) log(`   Story ID: ${testStoryId}`, 'reset');
    }
    
    process.exit(1);
  }
}

// Run test
runTest();


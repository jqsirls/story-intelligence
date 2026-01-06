#!/usr/bin/env node
/**
 * Quick Story V3 Test - Create story and verify V3 features
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

async function testStory() {
  console.log('\n🧪 V3 STORY TEST - Quick Verification\n');
  
  // Setup
  const supabaseUrl = 'https://lendybmmnlqelrhkhdyc.supabase.co';
  const supabaseServiceKey = execSync(
    'aws ssm get-parameter --name /storytailor-production/supabase/service-key --with-decryption --query "Parameter.Value" --output text',
    { encoding: 'utf-8' }
  ).trim();
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Get test data
  const { data: testUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'j+1226@jqsirls.com')
    .single();
  
  const { data: library } = await supabase
    .from('libraries')
    .select('id')
    .eq('owner', testUser.id)
    .limit(1)
    .single();
  
  const characterId = '5672a925-19d0-4f23-9229-e415d1c094cf'; // From previous test
  
  console.log('📋 Test Data:');
  console.log(`  User: ${testUser.id}`);
  console.log(`  Library: ${library.id}`);
  console.log(`  Character: ${characterId}\n`);
  
  // Get a valid story_type_id
  const { data: storyType } = await supabase
    .from('story_types')
    .select('id')
    .limit(1)
    .single();
  
  // Create story
  const storyTitle = `V3 Story Test ${Date.now()}`;
  const { data: story, error: storyError} = await supabase
    .from('stories')
    .insert({
      title: storyTitle,
      story_type_id: storyType.id, // Use valid UUID
      library_id: library.id,
      creator_user_id: testUser.id,
      age_rating: 0, // Required field (0 = all ages)
      content: {
        title: storyTitle,
        type: 'adventure',
        characterId: characterId,
        beats: [
          { id: 'b1', content: 'Once upon a time in a magical forest...' },
          { id: 'b2', content: 'A brave hero discovered a hidden treasure...' },
          { id: 'b3', content: 'But danger lurked in the shadows...' },
          { id: 'b4', content: 'In the end, courage won the day!' }
        ]
      },
      asset_generation_status: {
        overall: 'pending',
        assets: { content: { status: 'ready', progress: 100 } }
      }
    })
    .select()
    .single();
  
  if (storyError) throw new Error(`Story creation failed: ${storyError.message}`);
  if (!story) throw new Error('Story creation returned null');
  
  console.log(`✅ Story created: ${story.id}`);
  console.log(`   Title: ${story.title}\n`);
  
  // Trigger asset generation via Lambda (async - Event invocation)
  console.log('🎬 Triggering asset generation...');
  const payload = {
    action: 'generate_asset',
    storyId: story.id,
    assetType: 'cover',
    userId: testUser.id
  };
  
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  execSync(
    `aws lambda invoke --function-name storytailor-content-agent-production --invocation-type Event --payload "${payloadB64}" /tmp/asset-invoke.json`,
    { stdio: 'ignore' }
  );
  console.log('✅ Asset generation triggered (async)\n');
  
  // Poll for completion
  console.log('⏳ Polling for assets (checking every 10s, max 10 minutes)...\n');
  const maxWait = 10 * 60 * 1000; // 10 minutes
  const pollInterval = 10000; // 10 seconds
  const startTime = Date.now();
  
  const requiredAssets = ['cover', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'audio'];
  
  while (Date.now() - startTime < maxWait) {
    const { data: currentStory } = await supabase
      .from('stories')
      .select('asset_generation_status, audio_words, audio_blocks, hue_extracted_colors')
      .eq('id', story.id)
      .single();
    
    const status = currentStory.asset_generation_status || {};
    let readyCount = 0;
    const statuses = [];
    
    for (const asset of requiredAssets) {
      const assetStatus = status.assets?.[asset]?.status || 'pending';
      if (assetStatus === 'ready') readyCount++;
      statuses.push(`${asset}:${assetStatus}`);
    }
    
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    console.log(`  [${elapsed}s] ${readyCount}/${requiredAssets.length} ready - ${statuses.join(', ')}`);
    
    if (readyCount === requiredAssets.length) {
      console.log('\n✅ All assets ready!\n');
      break;
    }
    
    if (status.overall === 'failed') {
      console.log('\n❌ Asset generation failed\n');
      break;
    }
    
    await new Promise(r => setTimeout(r, pollInterval));
  }
  
  // Final verification
  console.log('📊 V3 Features Verification:\n');
  const { data: finalStory } = await supabase
    .from('stories')
    .select('audio_words, audio_blocks, hue_extracted_colors, spatial_audio_tracks')
    .eq('id', story.id)
    .single();
  
  const hasAudioWords = Array.isArray(finalStory.audio_words) && finalStory.audio_words.length > 0;
  const hasAudioBlocks = finalStory.audio_blocks && finalStory.audio_blocks.a;
  const hasHueColors = finalStory.hue_extracted_colors && Object.keys(finalStory.hue_extracted_colors).length >= 12;
  const hasSFX = finalStory.spatial_audio_tracks && finalStory.spatial_audio_tracks.ambientBedUrl;
  
  console.log(`  Audio Words: ${hasAudioWords ? '✅' : '❌'} (${finalStory.audio_words?.length || 0} words)`);
  console.log(`  Audio Blocks: ${hasAudioBlocks ? '✅' : '❌'} (a,b,c,d)`);
  console.log(`  HUE Colors: ${hasHueColors ? '✅' : '❌'} (${Object.keys(finalStory.hue_extracted_colors || {}).length}/15)`);
  console.log(`  SFX Tracks: ${hasSFX ? '✅' : '⚠️ '} (Pro only)\n`);
  
  if (hasHueColors) {
    console.log('🎨 Extracted HUE Colors:');
    const colors = finalStory.hue_extracted_colors;
    if (colors.coverHex1) console.log(`  Cover: ${colors.coverHex1}, ${colors.coverHex2}, ${colors.coverHex3}`);
    ['A', 'B', 'C', 'D'].forEach(scene => {
      const key = `scene${scene}`;
      if (colors[`${key}Hex1`]) {
        console.log(`  Scene ${scene}: ${colors[`${key}Hex1`]}, ${colors[`${key}Hex2`]}, ${colors[`${key}Hex3`]}`);
      }
    });
    console.log();
  }
  
  if (hasAudioWords) {
    console.log(`📝 Sample Audio Words:`,finalStory.audio_words.slice(0, 5).map(w => `"${w.txt}"`).join(', '), '...\n');
  }
  
  const passCount = [hasAudioWords, hasAudioBlocks, hasHueColors].filter(Boolean).length;
  console.log(`\n🎯 V3 Features: ${passCount}/3 core features working`);
  console.log(`📄 Story ID: ${story.id}\n`);
  
  process.exit(passCount === 3 ? 0 : 1);
}

testStory().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});


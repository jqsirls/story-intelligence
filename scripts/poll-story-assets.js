#!/usr/bin/env node
/**
 * Poll existing stories for asset generation completion
 * 
 * Monitors the 3 stories created earlier:
 * - Adventure: 125d96be-4d36-499b-9b1f-5111b34f06a0
 * - Birthday: 7b0b78ae-7637-4896-8018-1065362ad7f8
 * - Child-Loss: 0ec76073-310e-496e-98b5-06ad1f32b4d3
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const STORY_IDS = {
  'Adventure': '125d96be-4d36-499b-9b1f-5111b34f06a0',
  'Birthday': '7b0b78ae-7637-4896-8018-1065362ad7f8',
  'Child-Loss': '0ec76073-310e-496e-98b5-06ad1f32b4d3'
};

const MAX_POLLS = 60; // 60 polls × 10 seconds = 10 minutes
const POLL_INTERVAL = 10000; // 10 seconds

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const timestamp = Date.now();
const resultsDir = path.join(process.cwd(), 'test-results', 'async-story-polling', `run-${timestamp}`);

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function saveResult(filename, data) {
  fs.mkdirSync(resultsDir, { recursive: true });
  const filepath = path.join(resultsDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
}

async function fetchStory(storyId) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();
  
  if (error) {
    return { error: error.message };
  }
  
  return data;
}

function getAssetStatus(story) {
  return {
    overall: story.asset_generation_status?.overall || 'unknown',
    cover: story.cover_art_url ? 'ready' : 'pending',
    audio: story.audio_url ? 'ready' : 'pending',
    pdf: story.pdf_url ? 'ready' : 'pending',
    qr: story.qr_code_url ? 'ready' : 'pending',
    beats: story.content?.beats?.length || 0
  };
}

function isComplete(status) {
  return status.overall === 'ready' || status.overall === 'completed';
}

async function pollStory(storyType, storyId, pollCount) {
  const story = await fetchStory(storyId);
  
  if (story.error) {
    log(`   ❌ Error fetching ${storyType}: ${story.error}`);
    return { error: story.error };
  }
  
  const status = getAssetStatus(story);
  const complete = isComplete(status);
  
  const icon = complete ? '✅' : '⏳';
  log(`   ${icon} ${storyType}: ${status.overall} | Cover: ${status.cover} | Audio: ${status.audio} | PDF: ${status.pdf} | Beats: ${status.beats}`);
  
  return { story, status, complete };
}

async function main() {
  log('🔄 Starting Story Asset Polling');
  log(`Monitoring ${Object.keys(STORY_IDS).length} stories`);
  log(`Max duration: ${(MAX_POLLS * POLL_INTERVAL) / 1000 / 60} minutes`);
  log(`Poll interval: ${POLL_INTERVAL / 1000} seconds`);
  log(`Results will be saved to: ${resultsDir}`);
  log('');
  
  const results = {};
  let pollCount = 0;
  
  while (pollCount < MAX_POLLS) {
    pollCount++;
    log(`📊 Poll ${pollCount}/${MAX_POLLS} (${new Date().toLocaleTimeString()})`);
    
    let allComplete = true;
    
    for (const [storyType, storyId] of Object.entries(STORY_IDS)) {
      const result = await pollStory(storyType, storyId, pollCount);
      
      if (!result.error && !result.complete) {
        allComplete = false;
      }
      
      results[storyType] = result;
    }
    
    log('');
    
    // Save current state
    saveResult(`poll-${pollCount}.json`, {
      pollCount,
      timestamp: new Date().toISOString(),
      results
    });
    
    // Check if all complete
    if (allComplete) {
      log('');
      log('🎉 ALL STORIES COMPLETE!');
      log('');
      
      // Save final results
      for (const [storyType, result] of Object.entries(results)) {
        if (result.story) {
          saveResult(`${storyType.toLowerCase()}-complete.json`, result.story);
        }
      }
      
      // Summary
      log('============================================================');
      log('📊 FINAL SUMMARY');
      log('============================================================');
      
      for (const [storyType, result] of Object.entries(results)) {
        if (result.story) {
          const status = getAssetStatus(result.story);
          log(`${storyType}:`);
          log(`  Overall: ${status.overall}`);
          log(`  Cover Art: ${status.cover}`);
          log(`  Audio: ${status.audio}`);
          log(`  PDF: ${status.pdf}`);
          log(`  QR Code: ${status.qr}`);
          log(`  Beats: ${status.beats}`);
          log('');
        }
      }
      
      log('============================================================');
      log(`✅ Test complete after ${pollCount} polls (${(pollCount * POLL_INTERVAL) / 1000 / 60} minutes)`);
      log(`Results saved to: ${resultsDir}`);
      
      process.exit(0);
    }
    
    // Wait before next poll
    if (pollCount < MAX_POLLS) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
  
  // Timeout
  log('');
  log('⏰ Timeout reached after 10 minutes');
  log('Assets still generating. Check later or investigate pipeline.');
  log('');
  
  // Save final state
  for (const [storyType, result] of Object.entries(results)) {
    if (result.story) {
      saveResult(`${storyType.toLowerCase()}-timeout.json`, result.story);
    }
  }
  
  process.exit(1);
}

// Run
main();


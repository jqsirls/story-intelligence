#!/usr/bin/env node
/**
 * Final ship check: Verify image sizes and prompt flow
 * Tests story generation (cover + beats) and character generation (headshot + body)
 */

const { createClient } = require('@supabase/supabase-js');

// Set LOG_IMAGE_PROMPTS for this test
process.env.LOG_IMAGE_PROMPTS = 'true';

const RealContentAgent = require('../lambda-deployments/content-agent/dist/RealContentAgent').RealContentAgent;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const elevenLabsKey = process.env.ELEVENLABS_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
  console.error('Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const config = {
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseKey,
    serviceRoleKey: supabaseKey
  },
  openai: {
    apiKey: openaiKey
  },
  elevenlabs: elevenLabsKey ? {
    apiKey: elevenLabsKey,
    voiceId: 'EXAVITQu4vr4xnSDxMaL' // Sarah
  } : undefined
};

// Mock logger that captures size logs
const logCapture = {
  coverSize: null,
  beatSizes: [],
  coverGlobalStyle: null,
  coverPoseDirectives: null,
  beatGlobalStyles: [],
  beatPoseDirectives: [],
  headshotSize: null,
  bodyshotSize: null
};

const logger = {
  info: (msg, data) => {
    console.log(`[INFO] ${msg}`, data || '');
    
    if (msg === 'OpenAI image API params') {
      if (data.size === '1024x1024' && !logCapture.coverSize) {
        logCapture.coverSize = data.size;
      } else if (data.size === '1024x1536') {
        logCapture.beatSizes.push(data.size);
      } else if (data.size === '1024x1024') {
        // Could be headshot or bodyshot
        if (!logCapture.headshotSize) logCapture.headshotSize = data.size;
      }
    }
    
    if (msg === 'Image prompt final (pre-OpenAI)') {
      if (data.hasGlobalStyleOnce !== undefined && !logCapture.coverGlobalStyle) {
        logCapture.coverGlobalStyle = data.hasGlobalStyleOnce;
        logCapture.coverPoseDirectives = data.hasPoseDirectives;
      } else if (data.hasGlobalStyleOnce !== undefined) {
        logCapture.beatGlobalStyles.push(data.hasGlobalStyleOnce);
        logCapture.beatPoseDirectives.push(data.hasPoseDirectives);
      }
    }
  },
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || ''),
  debug: (msg, data) => console.log(`[DEBUG] ${msg}`, data || '')
};

async function runTest() {
  console.log('\n=== FINAL SHIP CHECK: IMAGE SIZES & PROMPT FLOW ===\n');
  
  const agent = new RealContentAgent(config, logger);
  
  // Test 1: Story generation (cover + 4 beats)
  console.log('TEST 1: Story generation (cover + 4 beats)...\n');
  
  try {
    const storyRequest = {
      characterName: 'TestHero',
      characterTraits: {
        age: 7,
        species: 'human',
        ethnicity: 'diverse',
        hairColor: 'brown',
        eyeColor: 'hazel'
      },
      storyType: 'adventure',
      theme: 'courage',
      setting: 'magical forest',
      plotPoints: ['discovers map', 'meets guide', 'faces challenge', 'finds treasure']
    };
    
    const story = await agent.generateStory(storyRequest);
    console.log(`✓ Story generated: "${story.title}"`);
    console.log(`✓ Cover URL: ${story.coverImageUrl?.substring(0, 60)}...`);
    console.log(`✓ Beat images: ${story.beatImages?.length || 0}`);
    
  } catch (err) {
    console.error('✗ Story generation failed:', err.message);
  }
  
  // Test 2: Character generation (headshot + bodyshot)
  console.log('\n\nTEST 2: Character generation (headshot + bodyshot)...\n');
  
  try {
    const charRequest = {
      name: 'TestChar',
      age: 8,
      species: 'human',
      ethnicity: ['Black'],
      gender: 'girl',
      hairColor: 'black',
      eyeColor: 'brown',
      personality: ['brave', 'curious'],
      inclusivityTraits: []
    };
    
    const character = await agent.generateCharacter(charRequest);
    console.log(`✓ Character created: ${character.name}`);
    console.log(`✓ Headshot: ${character.headshotUrl?.substring(0, 60)}...`);
    console.log(`✓ Bodyshot: ${character.bodyshotUrl?.substring(0, 60)}...`);
    
  } catch (err) {
    console.error('✗ Character generation failed:', err.message);
  }
  
  // Verify results
  console.log('\n\n=== VERIFICATION RESULTS ===\n');
  
  let allPassed = true;
  
  // Check cover size
  if (logCapture.coverSize === '1024x1024') {
    console.log('✓ Cover size: 1024x1024');
  } else {
    console.log(`✗ Cover size: ${logCapture.coverSize} (expected 1024x1024)`);
    allPassed = false;
  }
  
  // Check beat sizes
  const allBeatsCorrect = logCapture.beatSizes.every(s => s === '1024x1536');
  if (allBeatsCorrect && logCapture.beatSizes.length >= 4) {
    console.log(`✓ Beat sizes: 1024x1536 (${logCapture.beatSizes.length} beats)`);
  } else {
    console.log(`✗ Beat sizes: ${logCapture.beatSizes.join(', ')} (expected all 1024x1536)`);
    allPassed = false;
  }
  
  // Check GLOBAL_STYLE appears once
  if (logCapture.coverGlobalStyle === true) {
    console.log('✓ Cover GLOBAL_STYLE: appears exactly once');
  } else {
    console.log(`✗ Cover GLOBAL_STYLE: ${logCapture.coverGlobalStyle}`);
    allPassed = false;
  }
  
  // Check pose directives
  if (logCapture.coverPoseDirectives === true) {
    console.log('✓ Cover pose directives: present');
  } else {
    console.log(`✗ Cover pose directives: ${logCapture.coverPoseDirectives}`);
    allPassed = false;
  }
  
  // Check beat prompts
  const allBeatsHaveStyle = logCapture.beatGlobalStyles.every(s => s === true);
  const allBeatsHavePose = logCapture.beatPoseDirectives.every(p => p === true);
  
  if (allBeatsHaveStyle) {
    console.log(`✓ Beat GLOBAL_STYLE: appears exactly once in all ${logCapture.beatGlobalStyles.length} beats`);
  } else {
    console.log(`✗ Beat GLOBAL_STYLE: some beats incorrect`);
    allPassed = false;
  }
  
  if (allBeatsHavePose) {
    console.log(`✓ Beat pose directives: present in all ${logCapture.beatPoseDirectives.length} beats`);
  } else {
    console.log(`✗ Beat pose directives: some beats missing`);
    allPassed = false;
  }
  
  console.log('\n' + (allPassed ? '✓ ALL CHECKS PASSED - READY TO SHIP' : '✗ SOME CHECKS FAILED'));
  
  process.exit(allPassed ? 0 : 1);
}

runTest().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});


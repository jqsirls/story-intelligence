#!/usr/bin/env node

/**
 * Test All 15 Story Types End-to-End
 * 
 * CRITICAL: Validates that the new V3 prompt system works for ALL story types
 * 
 * This script:
 * 1. Creates a character with the new inclusivity system
 * 2. Creates a story for EACH of the 15 story types
 * 3. Verifies story generation completes
 * 4. Captures story content and metadata
 * 5. Saves results to test-results/all-15-types/
 * 
 * Usage:
 *   SUPABASE_URL="..." SUPABASE_ANON_KEY="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-all-15-story-types.js
 * 
 * Expected Runtime: 15-20 minutes (1-2 minutes per story type)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE_URL = process.env.API_BASE_URL || 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws';
const TEST_EMAIL = `test-15-types-${Date.now()}@storytailor.com`;
const TEST_PASSWORD = 'Test123456!';
const RESULTS_DIR = path.join(__dirname, '..', 'test-results', 'all-15-types', `run-${Date.now()}`);

// 15 story types to test
const STORY_TYPES = [
  'Adventure',
  'Bedtime',
  'Birthday',
  'Educational',
  'Financial Literacy',
  'Language Learning',
  'Medical Bravery',
  'Mental Health',
  'Milestones',
  'Music',
  'Tech Readiness',
  'New Chapter Sequel',
  'Child-Loss',
  'Inner-Child',
  'New Birth'
];

// Story type specific parameters (using nested objects as API expects)
const STORY_PARAMETERS = {
  'Adventure': {
    adventure: {
      setting: 'enchanted forest',
      goal: 'find the magical crystal'
    }
  },
  'Bedtime': {
    bedtime: {
      soothingElement: 'gentle rain sounds',
      routine: 'reading under the stars'
    }
  },
  'Birthday': {
    birthday: {
      ageTurning: 6,
      recipientName: 'Emma',
      fromNames: 'Mom and Dad',
      personality: 'adventurous',
      inclusivity: 'celebrates diversity'
    }
  },
  'Educational': {
    educational: {
      subject: 'space exploration',
      goal: 'understand how rockets work'
    }
  },
  'Financial Literacy': {
    financialLiteracy: {
      goal: 'save for a special toy',
      concept: 'saving and patience'
    }
  },
  'Language Learning': {
    languageLearning: {
      targetLanguage: 'Spanish',
      vocabulary: 'family, animals, colors'
    }
  },
  'Medical Bravery': {
    medicalBravery: {
      challenge: 'getting a vaccine',
      copingStrategy: 'deep breathing'
    }
  },
  'Mental Health': {
    mentalHealth: {
      emotionExplored: 'nervousness about first day of school',
      copingMechanism: 'positive self-talk'
    }
  },
  'Milestones': {
    milestones: {
      event: 'first day of kindergarten',
      significance: 'becoming a big kid'
    }
  },
  'Music': {
    music: {
      theme: 'rhythm and beats',
      instrument: 'drums'
    }
  },
  'Tech Readiness': {
    techReadiness: {
      theme: 'coding basics',
      skill: 'problem-solving with sequences'
    }
  },
  'New Chapter Sequel': {
    sequel: {
      originalStoryId: 'to-be-created',
      continueAdventure: true
    }
  },
  'Child-Loss': {
    childLoss: {
      type: 'Miscarriage',
      focusArea: 'Honoring and Remembering',
      readerRelationship: 'Parent',
      readerAge: 35,
      triggersToAvoid: 'graphic medical details'
    }
  },
  'Inner-Child': {
    innerChild: {
      focusArea: 'Rediscovering Wonder',
      relationshipContext: 'Solo Journey',
      adultName: 'Alex',
      adultAge: 32
    }
  },
  'New Birth': {
    newBirth: {
      mode: 'therapeutic',
      lifeSituation: 'Adoption',
      emotionalFocus: 'Building Attachment',
      readerRelationship: 'Parent'
    }
  }
};

// Initialize Supabase clients
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Utility functions
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

function saveResult(filename, data) {
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const filepath = path.join(RESULTS_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`✅ Saved: ${filename}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test functions
async function setupTestUser() {
  log('🔐 Setting up test user (using service role to bypass rate limits)...');
  
  // Create user directly via service role (bypasses rate limits)
  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: 'Test User - 15 Story Types',
      reading_age: 6
    }
  });
  
  if (userError) {
    throw new Error(`Create user failed: ${userError.message}`);
  }
  
  log('✅ Auth user created', { userId: userData.user.id });
  
  // Create corresponding public.users record (required for foreign keys)
  const { error: publicUserError } = await serviceClient
    .from('users')
    .insert({
      id: userData.user.id,
      email: TEST_EMAIL,
      email_confirmed: true,
      is_minor: false
    });
  
  if (publicUserError) {
    throw new Error(`Create public user failed: ${publicUserError.message}`);
  }
  
  log('✅ Public user record created');
  
  // Sign in to get a valid session
  const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  
  if (sessionError) {
    throw new Error(`Sign in failed: ${sessionError.message}`);
  }
  
  log('✅ Test user signed in', { accessToken: sessionData.session.access_token.substring(0, 20) + '...' });
  
  return {
    userId: userData.user.id,
    accessToken: sessionData.session.access_token
  };
}

async function grantTestCredits(userId) {
  log('💳 Granting test credits (bypass quota for testing)...');
  
  // Grant 20 base credits via story_credits_ledger
  const { error } = await serviceClient
    .from('story_credits_ledger')
    .insert({
      user_id: userId,
      credit_type: 'base',
      amount: 20.0,
      notes: 'Test credits for 15-story-type validation'
    });
  
  if (error) {
    log(`⚠️ Could not grant test credits: ${error.message}`);
    log('   Continuing anyway - quota errors may occur');
  } else {
    log('✅ Test credits granted (20 stories available)');
  }
}

async function createLibrary(userId) {
  log('📚 Creating library...');
  
  const { data, error } = await serviceClient
    .from('libraries')
    .insert({
      owner: userId,
      name: 'Test Library - 15 Types'
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Create library failed: ${error.message}`);
  }
  
  log('✅ Library created', { libraryId: data.id });
  return data.id;
}

async function createCharacter(libraryId) {
  log('🎭 Creating character with inclusivity system...');
  
  const characterData = {
    library_id: libraryId,
    name: 'Luna',
    traits: {
      name: 'Luna',
      age: 6,
      species: 'fox',
      gender: 'female',
      personality: ['curious', 'brave', 'kind'],
      interests: ['exploring', 'music', 'helping others'],
      appearance: {
        eye_color: 'amber',
        hair_color: 'auburn',
        clothing: 'comfortable adventure gear'
      },
      strengths: ['problem-solving', 'empathy', 'creativity'],
      challenges: ['sometimes too curious', 'learning patience']
    }
  };
  
  const { data, error } = await serviceClient
    .from('characters')
    .insert(characterData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Create character failed: ${error.message}`);
  }
  
  log('✅ Character created', { characterId: data.id, name: data.name });
  saveResult('character.json', data);
  return data.id;
}

async function createStory(storyType, libraryId, characterId, accessToken) {
  log(`\n📖 Creating ${storyType} story...`);
  
  const basePayload = {
    libraryId,
    characterIds: [characterId],
    storyType,
    readingAge: 6,
    title: `Test ${storyType} Story`,
    theme: `Testing ${storyType} with V3 prompts`,
    ...(STORY_PARAMETERS[storyType] || {})
  };
  
  log('Request payload:', basePayload);
  
  // Create story via REST API (direct Lambda invocation)
  const response = await fetch(`${API_BASE_URL}/api/v1/stories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(basePayload)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create story failed: ${response.status} ${errorText}`);
  }
  
  const storyData = await response.json();
  log('✅ Story created', { storyId: storyData.id, status: storyData.status });
  
  return storyData;
}

async function waitForStoryCompletion(storyId, maxWaitMinutes = 5) {
  log(`⏳ Waiting for story ${storyId} to complete (max ${maxWaitMinutes} minutes)...`);
  
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;
  
  while (Date.now() - startTime < maxWaitMs) {
    const { data, error } = await serviceClient
      .from('stories')
      .select('id, status, title, story_text, beats')
      .eq('id', storyId)
      .single();
    
    if (error) {
      log(`⚠️ Error checking story status: ${error.message}`);
      await sleep(5000);
      continue;
    }
    
    log(`Status: ${data.status}`);
    
    if (data.status === 'ready') {
      log('✅ Story generation complete!');
      return data;
    }
    
    if (data.status === 'failed') {
      throw new Error('Story generation failed');
    }
    
    await sleep(10000); // Check every 10 seconds
  }
  
  throw new Error(`Story generation timed out after ${maxWaitMinutes} minutes`);
}

async function verifyStoryQuality(storyData, storyType) {
  log(`\n🔍 Verifying ${storyType} story quality...`);
  
  const checks = {
    hasTitle: !!storyData.title,
    hasStoryText: !!storyData.story_text && storyData.story_text.length > 100,
    hasBeats: !!storyData.beats && storyData.beats.length >= 4,
    storyTextLength: storyData.story_text?.length || 0,
    beatCount: storyData.beats?.length || 0
  };
  
  // Check for story type specific elements
  if (storyType === 'Child-Loss' && storyData.story_text) {
    checks.hasTherapeuticElements = storyData.story_text.includes('honor') || 
                                     storyData.story_text.includes('remember') ||
                                     storyData.story_text.includes('cherish');
  }
  
  if (storyType === 'Birthday' && storyData.story_text) {
    checks.hasBirthdayElements = storyData.story_text.includes('birthday') ||
                                   storyData.story_text.includes('celebrate');
  }
  
  log('Quality checks:', checks);
  
  const passed = checks.hasTitle && checks.hasStoryText && checks.hasBeats;
  log(passed ? '✅ Quality verification PASSED' : '❌ Quality verification FAILED');
  
  return { passed, checks };
}

// Main execution
async function main() {
  const startTime = Date.now();
  const results = {
    testDate: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    totalStoryTypes: STORY_TYPES.length,
    results: [],
    summary: {
      passed: 0,
      failed: 0,
      errors: 0
    }
  };
  
  try {
    log('🚀 Starting All 15 Story Types Test');
    log(`Results will be saved to: ${RESULTS_DIR}`);
    
    // Setup
    const { userId, accessToken } = await setupTestUser();
    await grantTestCredits(userId);
    const libraryId = await createLibrary(userId);
    const characterId = await createCharacter(libraryId);
    
    // Test each story type
    for (const storyType of STORY_TYPES) {
      const typeStartTime = Date.now();
      const typeResult = {
        storyType,
        status: 'pending',
        startTime: new Date().toISOString()
      };
      
      try {
        // Create story
        const storyData = await createStory(storyType, libraryId, characterId, accessToken);
        typeResult.storyId = storyData.id;
        
        // Wait for completion
        const completedStory = await waitForStoryCompletion(storyData.id);
        
        // Verify quality
        const { passed, checks } = await verifyStoryQuality(completedStory, storyType);
        
        typeResult.status = passed ? 'passed' : 'failed';
        typeResult.checks = checks;
        typeResult.storyData = completedStory;
        typeResult.duration = Math.round((Date.now() - typeStartTime) / 1000);
        
        if (passed) {
          results.summary.passed++;
        } else {
          results.summary.failed++;
        }
        
        // Save individual result
        saveResult(`${storyType.replace(/\s+/g, '-').toLowerCase()}.json`, typeResult);
        
      } catch (error) {
        log(`❌ ${storyType} test failed:`, error.message);
        typeResult.status = 'error';
        typeResult.error = error.message;
        typeResult.duration = Math.round((Date.now() - typeStartTime) / 1000);
        results.summary.errors++;
        
        // Save error result
        saveResult(`${storyType.replace(/\s+/g, '-').toLowerCase()}-error.json`, typeResult);
      }
      
      results.results.push(typeResult);
      
      // Brief pause between tests
      await sleep(2000);
    }
    
    // Final summary
    const totalDuration = Math.round((Date.now() - startTime) / 1000);
    results.totalDuration = totalDuration;
    results.averageDuration = Math.round(totalDuration / STORY_TYPES.length);
    
    log('\n📊 TEST COMPLETE');
    log('='.repeat(60));
    log(`Total Story Types: ${results.totalStoryTypes}`);
    log(`Passed: ${results.summary.passed}`);
    log(`Failed: ${results.summary.failed}`);
    log(`Errors: ${results.summary.errors}`);
    log(`Total Duration: ${totalDuration}s (${Math.round(totalDuration / 60)}m)`);
    log(`Average per Type: ${results.averageDuration}s`);
    log('='.repeat(60));
    
    // Save summary
    saveResult('summary.json', results);
    
    // Create markdown report
    createMarkdownReport(results);
    
    process.exit(results.summary.errors > 0 ? 1 : 0);
    
  } catch (error) {
    log('❌ FATAL ERROR:', error.message);
    console.error(error);
    results.fatalError = error.message;
    saveResult('fatal-error.json', results);
    process.exit(1);
  }
}

function createMarkdownReport(results) {
  const report = `# All 15 Story Types - Test Results

**Test Date**: ${results.testDate}  
**Total Duration**: ${results.totalDuration}s (${Math.round(results.totalDuration / 60)}m)  
**Average per Type**: ${results.averageDuration}s

---

## Summary

| Metric | Count |
|--------|-------|
| Total Story Types | ${results.totalStoryTypes} |
| ✅ Passed | ${results.summary.passed} |
| ❌ Failed | ${results.summary.failed} |
| ⚠️ Errors | ${results.summary.errors} |

---

## Individual Results

${results.results.map(r => `### ${r.storyType}

**Status**: ${r.status === 'passed' ? '✅ PASSED' : r.status === 'failed' ? '❌ FAILED' : '⚠️ ERROR'}  
**Duration**: ${r.duration}s  
${r.storyId ? `**Story ID**: ${r.storyId}` : ''}  
${r.error ? `**Error**: ${r.error}` : ''}

${r.checks ? `**Quality Checks**:
- Title: ${r.checks.hasTitle ? '✅' : '❌'}
- Story Text: ${r.checks.hasStoryText ? '✅' : '❌'} (${r.checks.storyTextLength} chars)
- Beats: ${r.checks.hasBeats ? '✅' : '❌'} (${r.checks.beatCount} beats)
${r.checks.hasTherapeuticElements !== undefined ? `- Therapeutic Elements: ${r.checks.hasTherapeuticElements ? '✅' : '❌'}` : ''}
${r.checks.hasBirthdayElements !== undefined ? `- Birthday Elements: ${r.checks.hasBirthdayElements ? '✅' : '❌'}` : ''}
` : ''}

---
`).join('\n')}

## Conclusion

${results.summary.passed === results.totalStoryTypes ? 
  '✅ **ALL TESTS PASSED** - V3 prompt system working correctly for all 15 story types!' :
  `⚠️ **SOME TESTS FAILED** - ${results.summary.passed}/${results.totalStoryTypes} passed. Review individual results above.`}

---

*Generated: ${new Date().toISOString()}*  
*Results saved to: ${RESULTS_DIR}*
`;
  
  const reportPath = path.join(RESULTS_DIR, 'TEST_REPORT.md');
  fs.writeFileSync(reportPath, report);
  log(`\n✅ Markdown report created: TEST_REPORT.md`);
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});


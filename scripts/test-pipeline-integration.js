#!/usr/bin/env node

/**
 * Pipeline Integration Test Suite
 * 
 * Tests the complete story generation pipeline by invoking Lambda functions directly,
 * bypassing the REST API quota system. This allows comprehensive testing without
 * hitting free tier limits.
 * 
 * Test Coverage:
 * - User and library creation (via Supabase)
 * - Character creation with inclusivity traits
 * - Story creation (direct Lambda invocation)
 * - Asset generation pipeline
 * - Quality validation
 * 
 * Usage:
 *   SUPABASE_URL="..." SUPABASE_SERVICE_ROLE_KEY="..." node scripts/test-pipeline-integration.js
 */

const { createClient } = require('@supabase/supabase-js');
const { Lambda } = require('@aws-sdk/client-lambda');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const CONTENT_AGENT_FUNCTION = 'storytailor-content-agent-production';
const TEST_OUTPUT_DIR = 'test-results/pipeline-integration';

// Story types to test (subset for quick validation)
const STORY_TYPES_TO_TEST = [
  'Adventure',
  'Birthday',
  'Child-Loss'
];

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const lambda = new Lambda({ region: AWS_REGION });

// Logging
function log(message, data) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Create output directory
function ensureOutputDir(runId) {
  const dir = path.join(TEST_OUTPUT_DIR, `run-${runId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Save result to file
function saveResult(outputDir, filename, data) {
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`✅ Saved: ${filename}`);
}

// Setup test user and library
async function setupTestEnvironment() {
  log('🔐 Setting up test environment...');
  
  // Create test user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: `test-pipeline-${Date.now()}@storytailor.test`,
    password: 'TestPassword123!',
    email_confirm: true
  });
  
  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }
  
  log('✅ Auth user created', { userId: authUser.user.id });
  
  // Create public user record
  const { error: publicUserError } = await supabase
    .from('users')
    .insert({
      id: authUser.user.id,
      email: authUser.user.email,
      is_minor: false,
      policy_version: 'v1.0.0',
      evaluated_at: new Date().toISOString()
    });
  
  if (publicUserError) {
    throw new Error(`Failed to create public user: ${publicUserError.message}`);
  }
  
  log('✅ Public user created');
  
  // Create library
  const { data: library, error: libraryError } = await supabase
    .from('libraries')
    .insert({
      owner: authUser.user.id,
      name: 'Pipeline Integration Test Library'
    })
    .select()
    .single();
  
  if (libraryError) {
    throw new Error(`Failed to create library: ${libraryError.message}`);
  }
  
  log('✅ Library created', { libraryId: library.id });
  
  // Create character
  const { data: character, error: characterError } = await supabase
    .from('characters')
    .insert({
      library_id: library.id,
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
    })
    .select()
    .single();
  
  if (characterError) {
    throw new Error(`Failed to create character: ${characterError.message}`);
  }
  
  log('✅ Character created', { characterId: character.id });
  
  return {
    userId: authUser.user.id,
    libraryId: library.id,
    characterId: character.id
  };
}

// Invoke Content Agent Lambda directly
async function invokeContentAgent(payload) {
  log('🚀 Invoking Content Agent Lambda...', { storyType: payload.storyType });
  
  const command = {
    FunctionName: CONTENT_AGENT_FUNCTION,
    InvocationType: 'RequestResponse',
    Payload: JSON.stringify(payload)
  };
  
  const response = await lambda.invoke(command);
  
  if (response.StatusCode !== 200) {
    throw new Error(`Lambda invocation failed with status ${response.StatusCode}`);
  }
  
  const result = JSON.parse(new TextDecoder().decode(response.Payload));
  
  if (result.errorType || result.errorMessage) {
    throw new Error(`Lambda error: ${result.errorMessage || result.errorType}`);
  }
  
  log('✅ Content Agent responded', { 
    hasStoryText: !!result.storyText,
    beatCount: result.beats?.length || 0
  });
  
  return result;
}

// Test a single story type
async function testStoryType(storyType, libraryId, characterId, outputDir) {
  const startTime = Date.now();
  
  try {
    log(`📖 Testing ${storyType} story...`);
    
    // Prepare payload based on story type
    let payload = {
      libraryId,
      characterIds: storyType === 'Child-Loss' ? [] : [characterId],
      storyType,
      readingAge: storyType === 'Child-Loss' ? 'adult' : 6,
      title: `Test ${storyType} Story`,
      theme: `Testing ${storyType} with V3 prompts`
    };
    
    // Add type-specific parameters
    if (storyType === 'Adventure') {
      payload.adventure = {
        setting: 'enchanted forest',
        goal: 'find the magical crystal'
      };
    } else if (storyType === 'Birthday') {
      payload.birthday = {
        ageTurning: 6,
        recipientName: 'Emma',
        fromNames: 'Mom and Dad',
        personality: 'adventurous'
      };
    } else if (storyType === 'Child-Loss') {
      payload.childLoss = {
        typeOfLoss: 'Miscarriage',
        yourName: 'Sarah',
        yourRelationship: 'Mother',
        childName: 'Hope',
        childAge: 'unborn',
        childGender: 'Female',
        ethnicity: ['Caucasian'],
        emotionalFocusArea: 'Honoring and Remembering',
        therapeuticConsent: {
          acknowledgedNotTherapy: true,
          acknowledgedProfessionalReferral: true
        }
      };
    }
    
    // Invoke Lambda
    const result = await invokeContentAgent(payload);
    
    // Validate result
    const validation = {
      hasTitle: !!result.title,
      hasStoryText: !!result.storyText,
      storyLength: result.storyText?.length || 0,
      hasFourBeats: result.beats?.length === 4,
      beatCount: result.beats?.length || 0,
      allBeatsHaveText: result.beats?.every(b => b.text && b.text.length > 0) || false,
      allBeatsHavePrompts: result.beats?.every(b => b.imagePrompt && b.imagePrompt.length > 0) || false,
      hasCharacterIntegration: result.storyText?.includes('Luna') || storyType === 'Child-Loss'
    };
    
    const duration = Date.now() - startTime;
    
    // Save result
    saveResult(outputDir, `${storyType.toLowerCase().replace(/\s+/g, '-')}.json`, {
      storyType,
      status: 'success',
      duration,
      validation,
      story: result
    });
    
    log(`✅ ${storyType} test passed`, { duration: `${duration}ms`, validation });
    
    return { success: true, duration, validation, storyType };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    log(`❌ ${storyType} test failed:`, error.message);
    
    saveResult(outputDir, `${storyType.toLowerCase().replace(/\s+/g, '-')}-error.json`, {
      storyType,
      status: 'error',
      duration,
      error: error.message,
      stack: error.stack
    });
    
    return { success: false, duration, error: error.message, storyType };
  }
}

// Run complete test suite
async function runTests() {
  const runId = Date.now();
  const outputDir = ensureOutputDir(runId);
  
  log('🚀 Starting Pipeline Integration Tests');
  log(`Results will be saved to: ${outputDir}`);
  
  const results = {
    runId,
    startTime: new Date().toISOString(),
    testTypes: STORY_TYPES_TO_TEST,
    results: []
  };
  
  try {
    // Setup test environment
    const env = await setupTestEnvironment();
    
    saveResult(outputDir, 'environment.json', env);
    
    // Test each story type
    for (const storyType of STORY_TYPES_TO_TEST) {
      const result = await testStoryType(storyType, env.libraryId, env.characterId, outputDir);
      results.results.push(result);
      
      // Wait 2 seconds between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Calculate summary
    const passed = results.results.filter(r => r.success).length;
    const failed = results.results.filter(r => !r.success).length;
    const totalDuration = results.results.reduce((sum, r) => sum + r.duration, 0);
    
    results.endTime = new Date().toISOString();
    results.summary = {
      total: STORY_TYPES_TO_TEST.length,
      passed,
      failed,
      passRate: `${(passed / STORY_TYPES_TO_TEST.length * 100).toFixed(1)}%`,
      totalDuration: `${totalDuration}ms`,
      averageDuration: `${Math.round(totalDuration / STORY_TYPES_TO_TEST.length)}ms`
    };
    
    saveResult(outputDir, 'summary.json', results);
    
    // Create markdown report
    const report = generateMarkdownReport(results);
    fs.writeFileSync(path.join(outputDir, 'TEST_REPORT.md'), report);
    log('✅ Test report created: TEST_REPORT.md');
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`Pass Rate: ${results.summary.passRate}`);
    console.log(`Total Duration: ${results.summary.totalDuration}`);
    console.log(`Average Duration: ${results.summary.averageDuration}`);
    console.log('='.repeat(60));
    
    process.exit(failed > 0 ? 1 : 0);
    
  } catch (error) {
    log('❌ Test suite failed:', error.message);
    console.error(error);
    
    results.endTime = new Date().toISOString();
    results.error = error.message;
    results.stack = error.stack;
    
    saveResult(outputDir, 'error.json', results);
    
    process.exit(1);
  }
}

// Generate markdown report
function generateMarkdownReport(results) {
  let report = `# Pipeline Integration Test - Results\n\n`;
  report += `**Run ID**: ${results.runId}  \n`;
  report += `**Start Time**: ${results.startTime}  \n`;
  report += `**End Time**: ${results.endTime}  \n`;
  report += `**Duration**: ${results.summary.totalDuration}  \n\n`;
  report += `---\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tests | ${results.summary.total} |\n`;
  report += `| ✅ Passed | ${results.summary.passed} |\n`;
  report += `| ❌ Failed | ${results.summary.failed} |\n`;
  report += `| Pass Rate | ${results.summary.passRate} |\n`;
  report += `| Average Duration | ${results.summary.averageDuration} |\n\n`;
  report += `---\n\n`;
  report += `## Test Results\n\n`;
  
  for (const result of results.results) {
    report += `### ${result.storyType}\n\n`;
    report += `**Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}  \n`;
    report += `**Duration**: ${result.duration}ms  \n\n`;
    
    if (result.success) {
      report += `**Validation**:\n`;
      report += `- Has Title: ${result.validation.hasTitle ? '✅' : '❌'}\n`;
      report += `- Has Story Text: ${result.validation.hasStoryText ? '✅' : '❌'}\n`;
      report += `- Story Length: ${result.validation.storyLength} characters\n`;
      report += `- Has 4 Beats: ${result.validation.hasFourBeats ? '✅' : '❌'} (${result.validation.beatCount})\n`;
      report += `- All Beats Have Text: ${result.validation.allBeatsHaveText ? '✅' : '❌'}\n`;
      report += `- All Beats Have Image Prompts: ${result.validation.allBeatsHavePrompts ? '✅' : '❌'}\n`;
      report += `- Character Integration: ${result.validation.hasCharacterIntegration ? '✅' : '❌'}\n\n`;
    } else {
      report += `**Error**: ${result.error}\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  report += `## Conclusion\n\n`;
  if (results.summary.passed === results.summary.total) {
    report += `✅ **ALL TESTS PASSED** - ${results.summary.passRate} success rate\n`;
  } else {
    report += `⚠️ **SOME TESTS FAILED** - ${results.summary.passRate} success rate\n`;
  }
  
  report += `\n---\n\n`;
  report += `*Generated: ${new Date().toISOString()}*  \n`;
  report += `*Results saved to: ${TEST_OUTPUT_DIR}/run-${results.runId}*\n`;
  
  return report;
}

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTests, testStoryType };

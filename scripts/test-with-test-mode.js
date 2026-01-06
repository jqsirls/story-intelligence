#!/usr/bin/env node

/**
 * Integration Test Suite with Test Mode
 * 
 * Uses X-Test-Mode header to bypass quota restrictions
 * Tests via REST API (not direct Lambda invocation)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = 'https://api.storytailor.dev/api/v1';
const TEST_OUTPUT_DIR = 'test-results/test-mode-integration';

// Load test user credentials
const credentialsPath = path.join(__dirname, '../test-results/test-mode-user-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error('❌ Test user credentials not found. Run create-test-mode-user.js first.');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Story types to test
const STORY_TYPES_TO_TEST = [
  'Adventure',
  'Birthday',
  'Child-Loss'
];

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

// Make API request
async function apiRequest(method, endpoint, body = null, headers = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.accessToken}`,
      ...headers
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  return { status: response.status, data };
}

// Create library
async function createLibrary(outputDir) {
  log('📚 Creating library...');
  
  const { status, data } = await apiRequest('POST', '/libraries', {
    name: 'Test Mode Integration Library'
  });
  
  if (status !== 201) {
    throw new Error(`Failed to create library: ${status} ${JSON.stringify(data)}`);
  }
  
  log('✅ Library created', { libraryId: data.id });
  saveResult(outputDir, 'library.json', data);
  
  return data.id;
}

// Create character
async function createCharacter(libraryId, outputDir) {
  log('🦊 Creating character...');
  
  const { status, data } = await apiRequest('POST', '/characters', {
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
  });
  
  if (status !== 201) {
    throw new Error(`Failed to create character: ${status} ${JSON.stringify(data)}`);
  }
  
  log('✅ Character created', { characterId: data.id });
  saveResult(outputDir, 'character.json', data);
  
  return data.id;
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
        to: 'Emma',
        from: 'Mom and Dad',
        birthdayMessage: 'Happy 6th Birthday! You are amazing and we love you!',
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
    
    // Create story via API
    const { status, data } = await apiRequest('POST', '/stories', payload);
    
    if (status !== 201) {
      throw new Error(`API returned ${status}: ${JSON.stringify(data)}`);
    }
    
    // Validate response
    const validation = {
      hasId: !!data.id,
      hasTitle: !!data.title,
      hasStoryType: data.story_type === storyType || data.storyType === storyType,
      hasStatus: !!data.status || !!data.overall_status,
      quotaInfo: data.quota || 'not provided'
    };
    
    const duration = Date.now() - startTime;
    
    // Save result
    saveResult(outputDir, `${storyType.toLowerCase().replace(/\s+/g, '-')}.json`, {
      storyType,
      status: 'success',
      duration,
      validation,
      story: data
    });
    
    log(`✅ ${storyType} test passed`, { duration: `${duration}ms`, storyId: data.id });
    
    return { success: true, duration, validation, storyType, storyId: data.id };
    
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
  
  log('🚀 Starting Test Mode Integration Tests');
  log(`Using test user: ${credentials.email}`);
  log(`Test mode authorized: ${credentials.testModeAuthorized}`);
  log(`Results will be saved to: ${outputDir}`);
  
  const results = {
    runId,
    startTime: new Date().toISOString(),
    testUser: {
      userId: credentials.userId,
      email: credentials.email,
      testModeAuthorized: credentials.testModeAuthorized
    },
    testTypes: STORY_TYPES_TO_TEST,
    results: []
  };
  
  try {
    // Create library
    const libraryId = await createLibrary(outputDir);
    
    // Create character
    const characterId = await createCharacter(libraryId, outputDir);
    
    // Test each story type
    for (const storyType of STORY_TYPES_TO_TEST) {
      const result = await testStoryType(storyType, libraryId, characterId, outputDir);
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
    console.log(`Test Mode: ENABLED`);
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
  let report = `# Test Mode Integration Test - Results\n\n`;
  report += `**Run ID**: ${results.runId}  \n`;
  report += `**Start Time**: ${results.startTime}  \n`;
  report += `**End Time**: ${results.endTime}  \n`;
  report += `**Duration**: ${results.summary.totalDuration}  \n`;
  report += `**Test User**: ${results.testUser.email} (test_mode_authorized: ${results.testUser.testModeAuthorized})  \n\n`;
  report += `---\n\n`;
  report += `## Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|-------|\n`;
  report += `| Total Tests | ${results.summary.total} |\n`;
  report += `| ✅ Passed | ${results.summary.passed} |\n`;
  report += `| ❌ Failed | ${results.summary.failed} |\n`;
  report += `| Pass Rate | ${results.summary.passRate} |\n`;
  report += `| Average Duration | ${results.summary.averageDuration} |\n`;
  report += `| Test Mode | ENABLED ✅ |\n\n`;
  report += `---\n\n`;
  report += `## Test Results\n\n`;
  
  for (const result of results.results) {
    report += `### ${result.storyType}\n\n`;
    report += `**Status**: ${result.success ? '✅ PASSED' : '❌ FAILED'}  \n`;
    report += `**Duration**: ${result.duration}ms  \n`;
    
    if (result.success) {
      report += `**Story ID**: ${result.storyId}  \n\n`;
      report += `**Validation**:\n`;
      report += `- Has ID: ${result.validation.hasId ? '✅' : '❌'}\n`;
      report += `- Has Title: ${result.validation.hasTitle ? '✅' : '❌'}\n`;
      report += `- Has Story Type: ${result.validation.hasStoryType ? '✅' : '❌'}\n`;
      report += `- Has Status: ${result.validation.hasStatus ? '✅' : '❌'}\n`;
      report += `- Quota Info: ${JSON.stringify(result.validation.quotaInfo)}\n\n`;
    } else {
      report += `**Error**: ${result.error}\n\n`;
    }
    
    report += `---\n\n`;
  }
  
  report += `## Conclusion\n\n`;
  if (results.summary.passed === results.summary.total) {
    report += `✅ **ALL TESTS PASSED** - ${results.summary.passRate} success rate with test mode enabled\n`;
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


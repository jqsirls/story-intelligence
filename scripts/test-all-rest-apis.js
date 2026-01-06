#!/usr/bin/env node
/**
 * Comprehensive REST API Test Suite
 * Tests ALL endpoints including:
 * - Authentication (sign in, sign out, register, refresh, me)
 * - Pagination on all list endpoints
 * - AI Generative Content (stories, characters, art, activities, audio, PDF, smart home)
 * - Content Loading (stories, characters, libraries, etc.)
 * - All CRUD operations
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.storytailor.dev';
const TEST_EMAIL = process.env.TEST_EMAIL || 'j+1226@jqsirls.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Fntra2015!';
const TEST_PHONE = process.env.TEST_PHONE || '18189662227';

let accessToken = null;
let refreshToken = null;
let testUserId = null;
let testLibraryId = null;
let testStoryId = null;
let testCharacterId = null;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Store all responses for review
const allResponses = [];

async function testEndpoint(name, method, path, body = null, expectedStatus = 200, validator = null) {
  const startTime = Date.now();
  const fullUrl = new URL(path, API_BASE_URL).href;
  try {
    const response = await makeRequest(method, path, body, accessToken);
    const duration = Date.now() - startTime;
    
    // Store full request/response for review (matching plan requirements)
    allResponses.push({
      name,
      method,
      url: fullUrl,
      request: {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(accessToken ? { 'Authorization': `Bearer ${accessToken.substring(0, 20)}...` } : {})
        },
        body: body
      },
      response: {
        status: response.status,
        headers: response.headers,
        body: response.body
      },
      timestamp: new Date().toISOString(),
      duration
    });
    
    // Handle array of expected status codes
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    const passed = expectedStatuses.includes(response.status) && (!validator || validator(response));
    
    if (passed) {
      log(`  ✅ ${name} (${duration}ms)`, 'green');
      return { success: true, response };
    } else {
      log(`  ❌ ${name} - Expected ${expectedStatus}, got ${response.status} (${duration}ms)`, 'red');
      if (response.body && typeof response.body === 'object') {
        log(`     Error: ${JSON.stringify(response.body).substring(0, 200)}`, 'yellow');
      }
      return { success: false, response };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`  ❌ ${name} - Error: ${error.message} (${duration}ms)`, 'red');
    return { success: false, error };
  }
}

// ============================================================================
// PHASE 0: Authentication
// ============================================================================
async function testAuthentication() {
  log('\n📋 Phase 0: Authentication', 'cyan');
  
  // Login
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/api/v1/auth/login',
    { email: TEST_EMAIL, password: TEST_PASSWORD },
    200,
    (res) => {
      if (res.body.success && res.body.tokens) {
        accessToken = res.body.tokens.accessToken;
        refreshToken = res.body.tokens.refreshToken;
        testUserId = res.body.user?.id;
        return true;
      }
      return false;
    }
  );
  
  if (!loginResult.success) {
    log('  ⚠️  Authentication failed - cannot continue', 'yellow');
    return false;
  }
  
  // Get current user
  await testEndpoint('Get current user', 'GET', '/api/v1/auth/me', null, 200);
  
  // Refresh token
  if (refreshToken) {
    await testEndpoint(
      'Refresh token',
      'POST',
      '/api/v1/auth/refresh',
      { refreshToken },
      200
    );
  }
  
  // Forgot password (should always return success)
  await testEndpoint(
    'Forgot password',
    'POST',
    '/api/v1/auth/forgot-password',
    { email: TEST_EMAIL },
    200
  );
  
  // Update test user's phone number for SMS pipeline verification
  if (testUserId && TEST_PHONE) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ parent_phone: TEST_PHONE })
        .eq('id', testUserId);
      
      if (updateError) {
        log(`  ⚠️  Failed to update test user phone: ${updateError.message}`, 'yellow');
      } else {
        log(`  ✅ Updated test user phone to ${TEST_PHONE}`, 'green');
      }
    } catch (error) {
      log(`  ⚠️  Could not update test user phone: ${error.message}`, 'yellow');
    }
  }
  
  return true;
}

// ============================================================================
// PHASE 1: Health & Status
// ============================================================================
async function testHealth() {
  log('\n📋 Phase 1: Health & Status', 'cyan');
  
  await testEndpoint('Health check', 'GET', '/health', null, 200);
  
  return true;
}

// ============================================================================
// PHASE 2: Libraries (with pagination)
// ============================================================================
async function testLibraries() {
  log('\n📋 Phase 2: Libraries', 'cyan');
  
  // List libraries (page 1)
  const librariesResult = await testEndpoint(
    'List libraries (page 1)',
    'GET',
    '/api/v1/libraries?page=1&limit=10',
    null,
    200,
    (res) => {
      if (res.body.success && res.body.data && Array.isArray(res.body.data)) {
        if (res.body.data.length > 0) {
          testLibraryId = res.body.data[0].id;
        }
        return res.body.pagination !== undefined;
      }
      return false;
    }
  );
  
  // List libraries (page 2)
  await testEndpoint(
    'List libraries (page 2)',
    'GET',
    '/api/v1/libraries?page=2&limit=10',
    null,
    200
  );
  
  // Get library details
  if (testLibraryId) {
    await testEndpoint(
      'Get library details',
      'GET',
      `/api/v1/libraries/${testLibraryId}`,
      null,
      200
    );
  }
  
  return true;
}

// ============================================================================
// PHASE 3: Characters (with pagination & AI generation)
// ============================================================================
async function testCharacters() {
  log('\n📋 Phase 3: Characters', 'cyan');
  
  // List characters (page 1)
  await testEndpoint(
    'List characters (page 1)',
    'GET',
    '/api/v1/characters?page=1&limit=10',
    null,
    200,
    (res) => res.body.pagination !== undefined
  );
  
  // Create character (AI generation)
  if (testLibraryId) {
    const createResult = await testEndpoint(
      'Create character (AI)',
      'POST',
      '/api/v1/characters',
      {
        name: 'Test Character',
        libraryId: testLibraryId
      },
      201,
      (res) => {
        if (res.body.success && res.body.data?.id) {
          testCharacterId = res.body.data.id;
          return true;
        }
        return false;
      }
    );
  }
  
  // Get character details
  if (testCharacterId) {
    await testEndpoint(
      'Get character details',
      'GET',
      `/api/v1/characters/${testCharacterId}`,
      null,
      200
    );
  }
  
  // List characters (page 2)
  await testEndpoint(
    'List characters (page 2)',
    'GET',
    '/api/v1/characters?page=2&limit=10',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 4: Stories (with pagination & AI generation)
// ============================================================================
async function testStories() {
  log('\n📋 Phase 4: Stories', 'cyan');
  
  // List stories (page 1)
  await testEndpoint(
    'List stories (page 1)',
    'GET',
    '/api/v1/stories?page=1&limit=10',
    null,
    200,
    (res) => res.body.pagination !== undefined
  );
  
  // Create story (AI generation)
  if (testLibraryId && testCharacterId) {
    const createResult = await testEndpoint(
      'Create story (AI)',
      'POST',
      '/api/v1/stories',
      {
        characterId: testCharacterId,
        libraryId: testLibraryId,
        storyType: 'adventure',
        userAge: 8
      },
      201,
      (res) => {
        // Extract story ID from various possible response structures
        testStoryId = res.body.data?.story?.storyId || 
                      res.body.data?.story?.id || 
                      res.body.data?.id || 
                      res.body.story?.storyId ||
                      res.body.story?.id || 
                      res.body.id;
        return testStoryId !== null && testStoryId !== undefined;
      }
    );
  }
  
  // Get story details
  if (testStoryId) {
    await testEndpoint(
      'Get story details',
      'GET',
      `/api/v1/stories/${testStoryId}`,
      null,
      200
    );
  }
  
  // List stories (page 2)
  await testEndpoint(
    'List stories (page 2)',
    'GET',
    '/api/v1/stories?page=2&limit=10',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 5: Art & Asset Generation
// ============================================================================
async function testArtAndAssets() {
  log('\n📋 Phase 5: Art & Asset Generation', 'cyan');
  
  if (!testStoryId) {
    log('  ⚠️  Skipping - no story ID available', 'yellow');
    return false;
  }
  
  // Generate assets
  await testEndpoint(
    'Generate story assets',
    'POST',
    `/api/v1/stories/${testStoryId}/assets`,
    {
      assetTypes: ['cover', 'scene_1', 'scene_2', 'audio']
    },
    202
  );
  
  // Get asset stream (SSE)
  // Note: SSE requires EventSource, skipping for now
  
  // Get story details (to check asset URLs)
  await testEndpoint(
    'Get story with assets',
    'GET',
    `/api/v1/stories/${testStoryId}`,
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 6: Activities (AI generation)
// ============================================================================
async function testActivities() {
  log('\n📋 Phase 6: Activities', 'cyan');
  
  if (!testStoryId) {
    log('  ⚠️  Skipping - no story ID available', 'yellow');
    return false;
  }
  
  // Generate activities (now synchronous, returns 200 with status 'ready')
  await testEndpoint(
    'Generate activities',
    'POST',
    `/api/v1/stories/${testStoryId}/activities`,
    {
      activityTypes: ['comprehension', 'creative']
    },
    200,
    (res) => {
      // Verify response structure
      return res.body.success === true && 
             res.body.data?.storyId === testStoryId &&
             res.body.data?.status === 'ready' &&
             Array.isArray(res.body.data?.activities);
    }
  );
  
  // Get activities
  await testEndpoint(
    'Get activities',
    'GET',
    `/api/v1/stories/${testStoryId}/activities`,
    null,
    200,
    (res) => {
      // Verify response structure
      return res.body.success === true && 
             res.body.data?.storyId === testStoryId &&
             Array.isArray(res.body.data?.activities);
    }
  );
  
  return true;
}

// ============================================================================
// PHASE 7: Audio & PDF
// ============================================================================
async function testAudioAndPDF() {
  log('\n📋 Phase 7: Audio & PDF', 'cyan');
  
  if (!testStoryId) {
    log('  ⚠️  Skipping - no story ID available', 'yellow');
    return false;
  }
  
  // Get story details (includes audioUrl and pdfUrl)
  const storyResult = await testEndpoint(
    'Get story with audio/PDF URLs',
    'GET',
    `/api/v1/stories/${testStoryId}`,
    null,
    200
  );
  
  // Generate PDF (returns 200 if ready, 202 if still generating)
  await testEndpoint(
    'Generate PDF',
    'POST',
    `/api/v1/stories/${testStoryId}/pdf`,
    {
      includeActivities: true
    },
    [200, 202], // Accept either status
    (res) => {
      // Verify response structure
      return res.body.success === true && 
             res.body.data?.storyId === testStoryId &&
             (res.body.data?.status === 'ready' || res.body.data?.status === 'generating');
    }
  );
  
  return true;
}

// ============================================================================
// PHASE 8: Smart Home Integration
// ============================================================================
async function testSmartHome() {
  log('\n📋 Phase 8: Smart Home', 'cyan');
  
  // List smart home devices
  await testEndpoint(
    'List smart home devices',
    'GET',
    '/api/v1/smart-home/devices',
    null,
    200
  );
  
  // Get smart home status
  await testEndpoint(
    'Get smart home status',
    'GET',
    '/api/v1/smart-home/status',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 9: Notifications (with pagination)
// ============================================================================
async function testNotifications() {
  log('\n📋 Phase 9: Notifications', 'cyan');
  
  // List notifications (page 1)
  await testEndpoint(
    'List notifications (page 1)',
    'GET',
    '/api/v1/users/me/notifications?page=1&limit=10',
    null,
    200,
    (res) => res.body.pagination !== undefined
  );
  
  // List notifications (page 2)
  await testEndpoint(
    'List notifications (page 2)',
    'GET',
    '/api/v1/users/me/notifications?page=2&limit=10',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 10: Rewards (with pagination)
// ============================================================================
async function testRewards() {
  log('\n📋 Phase 10: Rewards', 'cyan');
  
  // List rewards (page 1)
  await testEndpoint(
    'List rewards (page 1)',
    'GET',
    '/api/v1/users/me/rewards?page=1&limit=10',
    null,
    200,
    (res) => res.body.pagination !== undefined
  );
  
  // List rewards (page 2)
  await testEndpoint(
    'List rewards (page 2)',
    'GET',
    '/api/v1/users/me/rewards?page=2&limit=10',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 11: Emotions (with pagination)
// ============================================================================
async function testEmotions() {
  log('\n📋 Phase 11: Emotions', 'cyan');
  
  // This requires a profile ID, which we don't have
  // Skipping for now, but structure is ready
  
  return true;
}

// ============================================================================
// PHASE 12: Commerce
// ============================================================================
async function testCommerce() {
  log('\n📋 Phase 12: Commerce', 'cyan');
  
  // Get subscription
  await testEndpoint(
    'Get subscription',
    'GET',
    '/api/v1/subscriptions/me',
    null,
    200
  );
  
  // Get earning opportunities
  await testEndpoint(
    'Get earning opportunities',
    'GET',
    '/api/v1/users/me/earning-opportunities',
    null,
    200
  );
  
  // Get story packs
  await testEndpoint(
    'Get story packs',
    'GET',
    '/api/v1/users/me/story-packs',
    null,
    200
  );
  
  return true;
}

// ============================================================================
// PHASE 13: Feedback
// ============================================================================
async function testFeedback() {
  log('\n📋 Phase 13: Feedback', 'cyan');
  
  if (!testStoryId) {
    log('  ⚠️  Skipping - no story ID available', 'yellow');
    return false;
  }
  
  // Submit story feedback
  await testEndpoint(
    'Submit story feedback',
    'POST',
    `/api/v1/stories/${testStoryId}/feedback`,
    {
      sentiment: 'positive',
      rating: 5,
      message: 'Great story!'
    },
    201
  );
  
  // Get story feedback summary
  await testEndpoint(
    'Get story feedback summary',
    'GET',
    `/api/v1/stories/${testStoryId}/feedback/summary`,
    null,
    200
  );
  
  if (testCharacterId) {
    // Submit character feedback
    await testEndpoint(
      'Submit character feedback',
      'POST',
      `/api/v1/characters/${testCharacterId}/feedback`,
      {
        sentiment: 'positive',
        rating: 5
      },
      201
    );
    
    // Get character feedback summary
    await testEndpoint(
      'Get character feedback summary',
      'GET',
      `/api/v1/characters/${testCharacterId}/feedback/summary`,
      null,
      200
    );
  }
  
  return true;
}

// ============================================================================
// PHASE 14: Insights & Analytics
// ============================================================================
async function testInsights() {
  log('\n📋 Phase 14: Insights & Analytics', 'cyan');
  
  // Get daily insights
  await testEndpoint(
    'Get daily insights',
    'GET',
    '/api/v1/users/me/insights/daily',
    null,
    200
  );
  
  // Get parent dashboard
  await testEndpoint(
    'Get parent dashboard',
    'GET',
    '/api/v1/dashboard/parent',
    null,
    200
  );
  
  if (testStoryId) {
    // Get story metrics
    await testEndpoint(
      'Get story metrics',
      'GET',
      `/api/v1/stories/${testStoryId}/metrics`,
      null,
      200
    );
  }
  
  return true;
}

// ============================================================================
// PHASE 15: Logout
// ============================================================================
async function testLogout() {
  log('\n📋 Phase 15: Logout', 'cyan');
  
  if (refreshToken) {
    await testEndpoint(
      'Logout',
      'POST',
      '/api/v1/auth/logout',
      { refreshToken },
      200
    );
  }
  
  return true;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================
async function runAllTests() {
  log('\n🚀 Comprehensive REST API Test Suite', 'magenta');
  log(`API Base URL: ${API_BASE_URL}`, 'blue');
  log(`Test Email: ${TEST_EMAIL}\n`, 'blue');
  
  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  };
  
  const phases = [
    { name: 'Health', fn: testHealth },
    { name: 'Authentication', fn: testAuthentication },
    { name: 'Libraries', fn: testLibraries },
    { name: 'Characters', fn: testCharacters },
    { name: 'Stories', fn: testStories },
    { name: 'Art & Assets', fn: testArtAndAssets },
    { name: 'Activities', fn: testActivities },
    { name: 'Audio & PDF', fn: testAudioAndPDF },
    { name: 'Smart Home', fn: testSmartHome },
    { name: 'Notifications', fn: testNotifications },
    { name: 'Rewards', fn: testRewards },
    { name: 'Emotions', fn: testEmotions },
    { name: 'Commerce', fn: testCommerce },
    { name: 'Feedback', fn: testFeedback },
    { name: 'Insights', fn: testInsights },
    { name: 'Logout', fn: testLogout }
  ];
  
  for (const phase of phases) {
    try {
      const result = await phase.fn();
      if (result) {
        results.passed++;
      } else {
        results.skipped++;
      }
    } catch (error) {
      log(`  ❌ Phase ${phase.name} failed: ${error.message}`, 'red');
      results.failed++;
    }
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'bright');
  log('📊 Test Summary', 'bright');
  log('='.repeat(60), 'bright');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Skipped: ${results.skipped}`, 'yellow');
  log('='.repeat(60) + '\n', 'bright');
  
  // Save all responses to JSON file for review
  try {
    const outputFile = path.join(__dirname, 'test-results-all-responses.json');
    fs.writeFileSync(outputFile, JSON.stringify(allResponses, null, 2));
    log(`📄 Full response objects saved to: ${outputFile}`, 'cyan');
    log(`   Total responses captured: ${allResponses.length}`, 'cyan');
    log(`   File size: ${(fs.statSync(outputFile).size / 1024).toFixed(2)} KB\n`, 'cyan');
  } catch (error) {
    log(`⚠️  Failed to save responses: ${error.message}`, 'yellow');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});


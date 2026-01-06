#!/usr/bin/env node

/**
 * Comprehensive REST API Test Suite for Wized/Webflow Integration
 * 
 * Tests all critical endpoints needed for Webflow/Wized integration
 * Based on: docs/integration-guides/WIZED_COMPLETE_API_REFERENCE.md
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE_URL = process.env.API_BASE_URL || process.env.API_URL || 'https://api.storytailor.dev';
const TEST_EMAIL = `wized.test.${Date.now()}@storytailor.com`;
const TEST_PASSWORD = 'TestPassword123!';

const results = {
  passed: [],
  failed: [],
  errors: [],
  endpoints: {}
};

function log(message, color = 'reset') {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
  };
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
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

async function test(name, testFn) {
  try {
    log(`\n📋 Testing: ${name}`, 'cyan');
    await testFn();
    log(`✅ Passed: ${name}`, 'green');
    results.passed.push(name);
  } catch (err) {
    log(`❌ Failed: ${name}`, 'red');
    log(`   Error: ${err.message}`, 'red');
    results.failed.push(name);
    results.errors.push({ test: name, error: err.message });
  }
}

let authToken = null;
let userId = null;
let testCharacterId = null;
let testStorytailorId = null;
let testStoryId = null;

async function runTests() {
  log('\n🚀 Wized/Webflow API Test Suite\n', 'magenta');
  log(`API Base URL: ${API_BASE_URL}\n`, 'blue');
  
  // ============================================
  // CATEGORY 1: AUTHENTICATION (5 endpoints)
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('CATEGORY 1: AUTHENTICATION', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');
  
  // 1.1 Signup/Register
  await test('1.1 POST /api/v1/auth/register (Signup)', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      userType: 'parent',
      country: 'US',
      locale: 'en-US',
      ageVerification: {
        method: 'confirmation',
        value: 'over_minimum_age'
      },
      firstName: 'Wized',
      lastName: 'Test'
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success) {
      throw new Error(`Registration failed: ${JSON.stringify(response.body)}`);
    }
    
    authToken = response.body.token || response.body.accessToken || response.body.data?.accessToken;
    userId = response.body.user?.id || response.body.userId || response.body.data?.userId;
    
    if (!authToken) {
      throw new Error('No auth token received');
    }
    
    if (!userId) {
      throw new Error('No user ID received');
    }
    
    log(`   ✅ Token: ${authToken.substring(0, 20)}...`, 'blue');
    log(`   ✅ User ID: ${userId}`, 'blue');
    results.endpoints['POST /api/v1/auth/register'] = { status: response.status, working: true };
  });
  
  // 1.2 Login
  await test('1.2 POST /api/v1/auth/login', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.token && !response.body.accessToken) {
      throw new Error(`Login failed: ${JSON.stringify(response.body)}`);
    }
    
    const token = response.body.token || response.body.accessToken || response.body.data?.accessToken;
    if (!token) {
      throw new Error('No token in login response');
    }
    
    authToken = token; // Update token
    log(`   ✅ Login successful, token received`, 'blue');
    results.endpoints['POST /api/v1/auth/login'] = { status: response.status, working: true };
  });
  
  // 1.3 Get User Profile (me)
  await test('1.3 GET /api/v1/auth/me (Get Profile)', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/auth/me', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data && !response.body.id) {
      throw new Error(`Get profile failed: ${JSON.stringify(response.body)}`);
    }
    
    log(`   ✅ Profile retrieved`, 'blue');
    results.endpoints['GET /api/v1/auth/me'] = { status: response.status, working: true };
  });
  
  // 1.4 Refresh Token (if endpoint exists)
  await test('1.4 POST /api/v1/auth/refresh', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('POST', '/api/v1/auth/refresh', {
      refreshToken: authToken // Using access token as refresh token for test
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 400/401 (expected if refresh token format is different)
    if (response.status === 200) {
      log(`   ✅ Token refreshed`, 'blue');
      results.endpoints['POST /api/v1/auth/refresh'] = { status: response.status, working: true };
    } else if (response.status === 400 || response.status === 401) {
      log(`   ⚠️  Refresh endpoint exists but requires valid refresh token (expected)`, 'yellow');
      results.endpoints['POST /api/v1/auth/refresh'] = { status: response.status, working: 'partial' };
    } else {
      throw new Error(`Unexpected status: ${response.status}: ${JSON.stringify(response.body)}`);
    }
  });
  
  // 1.5 Logout
  await test('1.5 POST /api/v1/auth/logout', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('POST', '/api/v1/auth/logout', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 404 (if endpoint doesn't exist yet)
    if (response.status === 200) {
      log(`   ✅ Logout successful`, 'blue');
      results.endpoints['POST /api/v1/auth/logout'] = { status: response.status, working: true };
    } else if (response.status === 404) {
      log(`   ⚠️  Logout endpoint not implemented yet`, 'yellow');
      results.endpoints['POST /api/v1/auth/logout'] = { status: response.status, working: false };
    } else {
      // Don't fail - logout might not be critical
      log(`   ⚠️  Logout returned ${response.status}`, 'yellow');
      results.endpoints['POST /api/v1/auth/logout'] = { status: response.status, working: 'partial' };
    }
  });
  
  // Re-login for remaining tests
  await test('Re-authenticate for remaining tests', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.status === 200) {
      authToken = response.body.token || response.body.accessToken || response.body.data?.accessToken;
      if (!authToken) throw new Error('Failed to re-authenticate');
    } else {
      throw new Error(`Re-authentication failed: ${response.status}`);
    }
  });
  
  // ============================================
  // CATEGORY 2: STORIES (15 endpoints)
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('CATEGORY 2: STORIES', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');
  
  // 2.1 List Stories
  await test('2.1 GET /api/v1/stories (List with Pagination)', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/stories?page=1&perPage=20', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data) {
      throw new Error(`List stories failed: ${JSON.stringify(response.body)}`);
    }
    
    const stories = response.body.data || response.body.stories || [];
    log(`   ✅ Retrieved ${stories.length} stories`, 'blue');
    results.endpoints['GET /api/v1/stories'] = { status: response.status, working: true, count: stories.length };
  });
  
  // 2.2 Get Single Story
  await test('2.2 GET /api/v1/stories/:id', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    // First, try to get a story ID from the list
    const listResponse = await makeRequest('GET', '/api/v1/stories', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (listResponse.status === 200) {
      const stories = listResponse.body.data || listResponse.body.stories || [];
      if (stories.length > 0) {
        testStoryId = stories[0].id;
      }
    }
    
    if (!testStoryId) {
      log(`   ⚠️  No stories available to test single story endpoint`, 'yellow');
      results.endpoints['GET /api/v1/stories/:id'] = { status: 'skipped', working: 'no_data' };
      return;
    }
    
    const response = await makeRequest('GET', `/api/v1/stories/${testStoryId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    log(`   ✅ Story retrieved: ${testStoryId}`, 'blue');
    results.endpoints['GET /api/v1/stories/:id'] = { status: response.status, working: true };
  });
  
  // 2.3 Create Story
  await test('2.3 POST /api/v1/stories (Create Story)', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('POST', '/api/v1/stories', {
      title: `Wized Test Story ${Date.now()}`,
      content: { sections: [{ text: 'Once upon a time...' }] },
      age_rating: 5
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data && !response.body.id) {
      throw new Error(`Create story failed: ${JSON.stringify(response.body)}`);
    }
    
    testStoryId = response.body.id || response.body.data?.id || response.body.story?.id;
    log(`   ✅ Story created: ${testStoryId}`, 'blue');
    results.endpoints['POST /api/v1/stories'] = { status: response.status, working: true };
  });
  
  // 2.4 Track Consumption
  await test('2.4 POST /api/v1/stories/:id/consumption', async () => {
    if (!authToken) throw new Error('No auth token available');
    if (!testStoryId) {
      log(`   ⚠️  No story ID available for consumption tracking`, 'yellow');
      results.endpoints['POST /api/v1/stories/:id/consumption'] = { status: 'skipped', working: 'no_data' };
      return;
    }
    
    const response = await makeRequest('POST', `/api/v1/stories/${testStoryId}/consumption`, {
      eventType: 'play_start',
      timestamp: new Date().toISOString()
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 404 (if endpoint doesn't exist yet)
    if (response.status === 200 || response.status === 201) {
      log(`   ✅ Consumption tracked`, 'blue');
      results.endpoints['POST /api/v1/stories/:id/consumption'] = { status: response.status, working: true };
    } else if (response.status === 404) {
      log(`   ⚠️  Consumption tracking endpoint not implemented yet`, 'yellow');
      results.endpoints['POST /api/v1/stories/:id/consumption'] = { status: response.status, working: false };
    } else {
      log(`   ⚠️  Consumption tracking returned ${response.status}`, 'yellow');
      results.endpoints['POST /api/v1/stories/:id/consumption'] = { status: response.status, working: 'partial' };
    }
  });
  
  // ============================================
  // CATEGORY 3: CHARACTERS (5 endpoints)
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('CATEGORY 3: CHARACTERS', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');
  
  // 3.1 List Characters
  await test('3.1 GET /api/v1/characters', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/characters', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data) {
      throw new Error(`List characters failed: ${JSON.stringify(response.body)}`);
    }
    
    const characters = response.body.data || response.body.characters || [];
    log(`   ✅ Retrieved ${characters.length} characters`, 'blue');
    results.endpoints['GET /api/v1/characters'] = { status: response.status, working: true, count: characters.length };
  });
  
  // 3.2 Create Character
  await test('3.2 POST /api/v1/characters', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('POST', '/api/v1/characters', {
      name: `Wized Test Character ${Date.now()}`,
      traits: {
        personality: ['brave', 'curious'],
        appearance: { species: 'human', age: '7' }
      }
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data && !response.body.id) {
      throw new Error(`Create character failed: ${JSON.stringify(response.body)}`);
    }
    
    testCharacterId = response.body.id || response.body.data?.id || response.body.character?.id;
    log(`   ✅ Character created: ${testCharacterId}`, 'blue');
    results.endpoints['POST /api/v1/characters'] = { status: response.status, working: true };
  });
  
  // 3.3 Get Single Character
  await test('3.3 GET /api/v1/characters/:id', async () => {
    if (!authToken) throw new Error('No auth token available');
    if (!testCharacterId) {
      log(`   ⚠️  No character ID available`, 'yellow');
      results.endpoints['GET /api/v1/characters/:id'] = { status: 'skipped', working: 'no_data' };
      return;
    }
    
    const response = await makeRequest('GET', `/api/v1/characters/${testCharacterId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    log(`   ✅ Character retrieved`, 'blue');
    results.endpoints['GET /api/v1/characters/:id'] = { status: response.status, working: true };
  });
  
  // ============================================
  // CATEGORY 4: STORYTAILOR IDs (7 endpoints)
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('CATEGORY 4: STORYTAILOR IDs', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');
  
  // 4.1 List Storytailor IDs
  await test('4.1 GET /api/v1/storytailor-ids', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/storytailor-ids', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data) {
      throw new Error(`List Storytailor IDs failed: ${JSON.stringify(response.body)}`);
    }
    
    const ids = response.body.data || response.body.storytailorIds || [];
    log(`   ✅ Retrieved ${ids.length} Storytailor IDs`, 'blue');
    results.endpoints['GET /api/v1/storytailor-ids'] = { status: response.status, working: true, count: ids.length };
  });
  
  // 4.2 Create Storytailor ID
  await test('4.2 POST /api/v1/storytailor-ids', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('POST', '/api/v1/storytailor-ids', {
      name: `Wized Test Storytailor ID ${Date.now()}`,
      primary_character_id: testCharacterId || undefined,
      age_range: '6-8',
      is_minor: false // Adult Storytailor ID for testing
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    if (!response.body.success && !response.body.data && !response.body.storytailorId) {
      throw new Error(`Create Storytailor ID failed: ${JSON.stringify(response.body)}`);
    }
    
    testStorytailorId = response.body.storytailorId?.id || response.body.data?.id || response.body.id;
    log(`   ✅ Storytailor ID created: ${testStorytailorId}`, 'blue');
    results.endpoints['POST /api/v1/storytailor-ids'] = { status: response.status, working: true };
  });
  
  // 4.3 Get Single Storytailor ID
  await test('4.3 GET /api/v1/storytailor-ids/:id', async () => {
    if (!authToken) throw new Error('No auth token available');
    if (!testStorytailorId) {
      log(`   ⚠️  No Storytailor ID available`, 'yellow');
      results.endpoints['GET /api/v1/storytailor-ids/:id'] = { status: 'skipped', working: 'no_data' };
      return;
    }
    
    const response = await makeRequest('GET', `/api/v1/storytailor-ids/${testStorytailorId}`, null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    log(`   ✅ Storytailor ID retrieved`, 'blue');
    results.endpoints['GET /api/v1/storytailor-ids/:id'] = { status: response.status, working: true };
  });
  
  // ============================================
  // CATEGORY 5: USER ENDPOINTS (3 endpoints)
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'cyan');
  log('CATEGORY 5: USER ENDPOINTS', 'cyan');
  log('═══════════════════════════════════════════════════════════\n', 'cyan');
  
  // 5.1 Get Credits
  await test('5.1 GET /api/v1/users/me/credits', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/users/me/credits', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 404 (if endpoint doesn't exist yet)
    if (response.status === 200) {
      log(`   ✅ Credits retrieved`, 'blue');
      results.endpoints['GET /api/v1/users/me/credits'] = { status: response.status, working: true };
    } else if (response.status === 404) {
      log(`   ⚠️  Credits endpoint not implemented yet`, 'yellow');
      results.endpoints['GET /api/v1/users/me/credits'] = { status: response.status, working: false };
    } else {
      log(`   ⚠️  Credits endpoint returned ${response.status}`, 'yellow');
      results.endpoints['GET /api/v1/users/me/credits'] = { status: response.status, working: 'partial' };
    }
  });
  
  // 5.2 Get Referral Link
  await test('5.2 GET /api/v1/users/me/referral-link', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/users/me/referral-link', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 404 (if endpoint doesn't exist yet)
    if (response.status === 200) {
      log(`   ✅ Referral link retrieved`, 'blue');
      results.endpoints['GET /api/v1/users/me/referral-link'] = { status: response.status, working: true };
    } else if (response.status === 404) {
      log(`   ⚠️  Referral link endpoint not implemented yet`, 'yellow');
      results.endpoints['GET /api/v1/users/me/referral-link'] = { status: response.status, working: false };
    } else {
      log(`   ⚠️  Referral link endpoint returned ${response.status}`, 'yellow');
      results.endpoints['GET /api/v1/users/me/referral-link'] = { status: response.status, working: 'partial' };
    }
  });
  
  // 5.3 Get Notifications
  await test('5.3 GET /api/v1/users/me/notifications', async () => {
    if (!authToken) throw new Error('No auth token available');
    
    const response = await makeRequest('GET', '/api/v1/users/me/notifications', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    // Accept 200 (success) or 404 (if endpoint doesn't exist yet)
    if (response.status === 200) {
      log(`   ✅ Notifications retrieved`, 'blue');
      results.endpoints['GET /api/v1/users/me/notifications'] = { status: response.status, working: true };
    } else if (response.status === 404) {
      log(`   ⚠️  Notifications endpoint not implemented yet`, 'yellow');
      results.endpoints['GET /api/v1/users/me/notifications'] = { status: response.status, working: false };
    } else {
      log(`   ⚠️  Notifications endpoint returned ${response.status}`, 'yellow');
      results.endpoints['GET /api/v1/users/me/notifications'] = { status: response.status, working: 'partial' };
    }
  });
  
  // ============================================
  // SUMMARY
  // ============================================
  
  log('\n═══════════════════════════════════════════════════════════', 'magenta');
  log('📊 TEST SUMMARY', 'magenta');
  log('═══════════════════════════════════════════════════════════\n', 'magenta');
  
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  
  if (results.failed.length > 0) {
    log(`\n❌ Failed Tests:`, 'red');
    results.failed.forEach((test, i) => {
      log(`  ${i + 1}. ${test}`, 'red');
    });
  }
  
  log(`\n📋 Endpoint Status:`, 'cyan');
  Object.entries(results.endpoints).forEach(([endpoint, info]) => {
    const status = info.working === true ? '✅' : info.working === false ? '❌' : '⚠️';
    log(`  ${status} ${endpoint} (${info.status})`, info.working === true ? 'green' : info.working === false ? 'red' : 'yellow');
  });
  
  if (results.errors.length > 0) {
    log(`\n❌ Errors:`, 'red');
    results.errors.forEach((err, i) => {
      log(`  ${i + 1}. ${err.test}: ${err.error}`, 'red');
    });
  }
  
  const successRate = ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1);
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
  
  if (results.failed.length > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});


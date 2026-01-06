#!/usr/bin/env node

/**
 * Test REST APIs with existing user credentials
 * Usage: API_BASE_URL=https://api.storytailor.dev TEST_EMAIL=user@example.com TEST_PASSWORD=password node scripts/test-with-existing-user.js
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.storytailor.dev';
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('❌ Error: TEST_EMAIL and TEST_PASSWORD environment variables required');
  console.error('Usage: TEST_EMAIL=user@example.com TEST_PASSWORD=password node scripts/test-with-existing-user.js');
  process.exit(1);
}

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

async function runTests() {
  log('\n🚀 Wized/Webflow API Test Suite (With Existing User)\n', 'magenta');
  log(`API Base URL: ${API_BASE_URL}`, 'blue');
  log(`Test Email: ${TEST_EMAIL}\n`, 'blue');
  
  // Login first
  await test('Login with existing user', async () => {
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.body)}`);
    }
    
    authToken = response.body.tokens?.accessToken || response.body.token || response.body.accessToken || response.body.data?.accessToken;
    userId = response.body.user?.id || response.body.userId || response.body.data?.userId;
    
    if (!authToken) {
      throw new Error('No auth token received');
    }
    
    log(`   ✅ Token: ${authToken.substring(0, 20)}...`, 'blue');
    log(`   ✅ User ID: ${userId}`, 'blue');
  });
  
  if (!authToken) {
    log('\n❌ Cannot proceed without authentication token', 'red');
    process.exit(1);
  }
  
  // Test all critical endpoints
  const endpoints = [
    // Authentication
    { name: 'GET /api/v1/auth/me', method: 'GET', path: '/api/v1/auth/me', requiresAuth: true },
    
    // Stories
    { name: 'GET /api/v1/stories', method: 'GET', path: '/api/v1/stories', requiresAuth: true },
    { name: 'GET /api/v1/stories (with pagination)', method: 'GET', path: '/api/v1/stories?page=1&perPage=20', requiresAuth: true },
    
    // Characters
    { name: 'GET /api/v1/characters', method: 'GET', path: '/api/v1/characters', requiresAuth: true },
    
    // Storytailor IDs
    { name: 'GET /api/v1/storytailor-ids', method: 'GET', path: '/api/v1/storytailor-ids', requiresAuth: true },
    
    // Libraries (alternative to storytailor-ids)
    { name: 'GET /api/v1/libraries', method: 'GET', path: '/api/v1/libraries', requiresAuth: true },
    
    // Health
    { name: 'GET /health', method: 'GET', path: '/health', requiresAuth: false },
  ];
  
  for (const endpoint of endpoints) {
    await test(endpoint.name, async () => {
      const headers = endpoint.requiresAuth && authToken
        ? { 'Authorization': `Bearer ${authToken}` }
        : {};
      
      const response = await makeRequest(endpoint.method, endpoint.path, null, headers);
      
      if (response.status >= 200 && response.status < 300) {
        log(`   ✅ Status: ${response.status}`, 'blue');
        results.endpoints[endpoint.name] = { status: response.status, working: true };
      } else if (response.status === 404) {
        log(`   ⚠️  Endpoint not found (404)`, 'yellow');
        results.endpoints[endpoint.name] = { status: response.status, working: false };
      } else {
        throw new Error(`Status ${response.status}: ${JSON.stringify(response.body)}`);
      }
    });
  }
  
  // Test story creation if we have libraries
  await test('POST /api/v1/stories (Create Story)', async () => {
    if (!authToken) throw new Error('No auth token');
    
    // Get libraries first
    const libsResponse = await makeRequest('GET', '/api/v1/libraries', null, {
      'Authorization': `Bearer ${authToken}`
    });
    
    let libraryId = null;
    if (libsResponse.status === 200) {
      const libraries = libsResponse.body.data || libsResponse.body.libraries || [];
      if (libraries.length > 0) {
        libraryId = libraries[0].id;
      }
    }
    
    const response = await makeRequest('POST', '/api/v1/stories', {
      title: `API Test Story ${Date.now()}`,
      content: { sections: [{ text: 'Test story content' }] },
      age_rating: 5,
      library_id: libraryId
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status === 201 || response.status === 200) {
      log(`   ✅ Story created`, 'blue');
      results.endpoints['POST /api/v1/stories'] = { status: response.status, working: true };
    } else {
      throw new Error(`Status ${response.status}: ${JSON.stringify(response.body)}`);
    }
  });
  
  // Test character creation
  await test('POST /api/v1/characters (Create Character)', async () => {
    if (!authToken) throw new Error('No auth token');
    
    const response = await makeRequest('POST', '/api/v1/characters', {
      name: `API Test Character ${Date.now()}`,
      traits: {
        personality: ['brave'],
        appearance: { species: 'human' }
      }
    }, {
      'Authorization': `Bearer ${authToken}`
    });
    
    if (response.status === 201 || response.status === 200) {
      log(`   ✅ Character created`, 'blue');
      results.endpoints['POST /api/v1/characters'] = { status: response.status, working: true };
    } else {
      throw new Error(`Status ${response.status}: ${JSON.stringify(response.body)}`);
    }
  });
  
  // Summary
  log('\n═══════════════════════════════════════════════════════════', 'magenta');
  log('📊 TEST SUMMARY', 'magenta');
  log('═══════════════════════════════════════════════════════════\n', 'magenta');
  
  log(`✅ Passed: ${results.passed.length}`, 'green');
  log(`❌ Failed: ${results.failed.length}`, 'red');
  
  log(`\n📋 Endpoint Status:`, 'cyan');
  Object.entries(results.endpoints).forEach(([endpoint, info]) => {
    const status = info.working === true ? '✅' : '❌';
    log(`  ${status} ${endpoint} (${info.status})`, info.working === true ? 'green' : 'red');
  });
  
  const successRate = results.passed.length > 0
    ? ((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)
    : 0;
  log(`\n📈 Success Rate: ${successRate}%`, successRate >= 80 ? 'green' : successRate >= 50 ? 'yellow' : 'red');
}

runTests().catch((err) => {
  log(`\n❌ Fatal error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});


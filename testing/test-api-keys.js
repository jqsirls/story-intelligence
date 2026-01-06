#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.staging' });

const https = require('https');
const http = require('http');

console.log('🧪 Testing API Keys...\n');

// Test results
let totalTests = 0;
let passedTests = 0;

// Helper function to make HTTP requests
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;
    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

// Test OpenAI API
async function testOpenAI() {
  console.log('🔍 Testing OpenAI API...');
  totalTests++;
  
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('placeholder')) {
    console.log('❌ OpenAI: API key not configured properly');
    return;
  }

  try {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/models',
      method: 'GET',
      protocol: 'https:',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ OpenAI API: WORKING');
      passedTests++;
    } else {
      console.log(`❌ OpenAI API: FAILED (${response.statusCode})`);
      console.log('Response:', response.data.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ OpenAI API: ERROR -', error.message);
  }
}

// Test ElevenLabs API
async function testElevenLabs() {
  console.log('🔍 Testing ElevenLabs API...');
  totalTests++;
  
  if (!process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY.includes('placeholder')) {
    console.log('❌ ElevenLabs: API key not configured properly');
    return;
  }

  try {
    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: '/v1/user',
      method: 'GET',
      protocol: 'https:',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ ElevenLabs API: WORKING');
      passedTests++;
    } else {
      console.log(`❌ ElevenLabs API: FAILED (${response.statusCode})`);
      console.log('Response:', response.data.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ ElevenLabs API: ERROR -', error.message);
  }
}

// Test Stability AI API
async function testStabilityAI() {
  console.log('🔍 Testing Stability AI API...');
  totalTests++;
  
  if (!process.env.STABILITY_API_KEY || process.env.STABILITY_API_KEY.includes('placeholder')) {
    console.log('❌ Stability AI: API key not configured properly');
    return;
  }

  try {
    const options = {
      hostname: 'api.stability.ai',
      port: 443,
      path: '/v1/user/account',
      method: 'GET',
      protocol: 'https:',
      headers: {
        'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Stability AI API: WORKING');
      passedTests++;
    } else {
      console.log(`❌ Stability AI API: FAILED (${response.statusCode})`);
      console.log('Response:', response.data.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Stability AI API: ERROR -', error.message);
  }
}

// Test Supabase
async function testSupabase() {
  console.log('🔍 Testing Supabase...');
  totalTests++;
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('❌ Supabase: URL or key not configured');
    return;
  }

  try {
    const url = new URL(process.env.SUPABASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      protocol: 'https:',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200 || response.statusCode === 404) {
      console.log('✅ Supabase: WORKING');
      passedTests++;
    } else {
      console.log(`❌ Supabase: FAILED (${response.statusCode})`);
      console.log('Response:', response.data.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Supabase: ERROR -', error.message);
  }
}

// Test Stripe API
async function testStripe() {
  console.log('🔍 Testing Stripe API...');
  totalTests++;
  
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
    console.log('❌ Stripe: API key not configured properly');
    return;
  }

  try {
    const auth = Buffer.from(process.env.STRIPE_SECRET_KEY + ':').toString('base64');
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: '/v1/account',
      method: 'GET',
      protocol: 'https:',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    };

    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Stripe API: WORKING');
      passedTests++;
    } else {
      console.log(`❌ Stripe API: FAILED (${response.statusCode})`);
      console.log('Response:', response.data.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Stripe API: ERROR -', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('Environment variables loaded:');
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? process.env.ELEVENLABS_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`STABILITY_API_KEY: ${process.env.STABILITY_API_KEY ? process.env.STABILITY_API_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log(`SUPABASE_URL: ${process.env.SUPABASE_URL || 'NOT SET'}`);
  console.log(`STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? process.env.STRIPE_SECRET_KEY.substring(0, 15) + '...' : 'NOT SET'}`);
  console.log('\n');

  await testOpenAI();
  console.log('');
  
  await testElevenLabs();
  console.log('');
  
  await testStabilityAI();
  console.log('');
  
  await testSupabase();
  console.log('');
  
  await testStripe();
  console.log('');

  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('');

  if (passedTests === totalTests) {
    console.log('🎉 ALL API KEYS ARE WORKING!');
    console.log('✅ System is ready for full operation');
    console.log('✅ All agents should work properly');
  } else {
    console.log('⚠️  Some API keys are not working');
    console.log('❌ Some agents may have limited functionality');
  }
}

// Run the tests
runTests().catch(console.error);
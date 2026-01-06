#!/usr/bin/env node
/**
 * External Services Verification Script
 * Tests connectivity to all external services used by Storytailor Agent
 */

const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');
const { execSync } = require('child_process');

// Get configuration from SSM Parameter Store
function getSSMParameter(name) {
  try {
    return execSync(`aws ssm get-parameter --name "${name}" --region us-east-1 --with-decryption --query 'Parameter.Value' --output text`, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return process.env[name.split('/').pop().toUpperCase().replace(/-/g, '_')] || '';
  }
}

const SUPABASE_URL = getSSMParameter('/storytailor-production/supabase-url') || 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_SERVICE_KEY = getSSMParameter('/storytailor-production/supabase-service-key') || getSSMParameter('/storytailor-production/supabase-service-role-key') || '';
const REDIS_URL = getSSMParameter('/storytailor-production/redis-url') || '';
const OPENAI_API_KEY = getSSMParameter('/storytailor-production/openai-api-key') || '';
const ELEVENLABS_API_KEY = getSSMParameter('/storytailor-production/elevenlabs-api-key') || '';
const STRIPE_SECRET_KEY = getSSMParameter('/storytailor-production/stripe-secret-key') || '';
const SENDGRID_API_KEY = getSSMParameter('/storytailor-production/sendgrid-api-key') || '';

const results = {
  supabase: { status: 'pending', error: null },
  redis: { status: 'pending', error: null },
  openai: { status: 'pending', error: null },
  elevenlabs: { status: 'pending', error: null },
  stripe: { status: 'pending', error: null },
  sendgrid: { status: 'pending', error: null }
};

async function testSupabase() {
  try {
    console.log('Testing Supabase connection...');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Test connection by querying users table
    const { data, error } = await supabase.from('users').select('id').limit(1);
    
    if (error) {
      throw new Error(error.message);
    }
    
    results.supabase = { status: 'success', error: null };
    console.log('✅ Supabase: Connected successfully');
  } catch (error) {
    results.supabase = { status: 'failed', error: error.message };
    console.log('❌ Supabase:', error.message);
  }
}

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    if (!REDIS_URL) {
      throw new Error('REDIS_URL not configured');
    }
    
    const redis = createRedisClient({ url: REDIS_URL });
    await redis.connect();
    
    // Test with a simple ping
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      throw new Error('Redis ping failed');
    }
    
    await redis.disconnect();
    results.redis = { status: 'success', error: null };
    console.log('✅ Redis: Connected successfully');
  } catch (error) {
    results.redis = { status: 'failed', error: error.message };
    console.log('❌ Redis:', error.message);
  }
}

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API...');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    
    // Decrypt KMS-encrypted key if needed (it's base64 encoded)
    let apiKey = OPENAI_API_KEY;
    if (apiKey.length > 100) {
      // Likely KMS encrypted, try to use as-is first
      try {
        // Simple API test - list models
        const https = require('https');
        const response = await new Promise((resolve, reject) => {
          const req = https.request('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data }));
          });
          req.on('error', reject);
          req.end();
        });
        
        if (response.status !== 200) {
          throw new Error(`OpenAI API returned ${response.status}`);
        }
      } catch (error) {
        // If direct call fails, the key might need decryption
        throw new Error(`OpenAI API test failed: ${error.message}`);
      }
    } else {
      // Simple API test - list models using node-fetch if available
      const https = require('https');
      const response = await new Promise((resolve, reject) => {
        const req = https.request('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, data }));
        });
        req.on('error', reject);
        req.end();
      });
      
      if (response.status !== 200) {
        throw new Error(`OpenAI API returned ${response.status}`);
      }
    }
    
    results.openai = { status: 'success', error: null };
    console.log('✅ OpenAI: API key valid');
  } catch (error) {
    results.openai = { status: 'failed', error: error.message };
    console.log('❌ OpenAI:', error.message);
  }
}

async function testElevenLabs() {
  try {
    console.log('Testing ElevenLabs API...');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }
    
    // Test API key by getting user info
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      const req = https.request('https://api.elevenlabs.io/v1/user', {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    
    if (response.status !== 200) {
      throw new Error(`ElevenLabs API returned ${response.status}`);
    }
    
    results.elevenlabs = { status: 'success', error: null };
    console.log('✅ ElevenLabs: API key valid');
  } catch (error) {
    results.elevenlabs = { status: 'failed', error: error.message };
    console.log('❌ ElevenLabs:', error.message);
  }
}

async function testStripe() {
  try {
    console.log('Testing Stripe API...');
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    
    // Test API key by getting account info
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      const req = https.request('https://api.stripe.com/v1/account', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    
    if (response.status !== 200) {
      throw new Error(`Stripe API returned ${response.status}`);
    }
    
    results.stripe = { status: 'success', error: null };
    console.log('✅ Stripe: API key valid');
  } catch (error) {
    results.stripe = { status: 'failed', error: error.message };
    console.log('❌ Stripe:', error.message);
  }
}

async function testSendGrid() {
  try {
    console.log('Testing SendGrid API...');
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY not configured');
    }
    
    // Test API key by getting user profile
    const https = require('https');
    const response = await new Promise((resolve, reject) => {
      const req = https.request('https://api.sendgrid.com/v3/user/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      req.on('error', reject);
      req.end();
    });
    
    if (response.status !== 200) {
      throw new Error(`SendGrid API returned ${response.status}`);
    }
    
    results.sendgrid = { status: 'success', error: null };
    console.log('✅ SendGrid: API key valid');
  } catch (error) {
    results.sendgrid = { status: 'failed', error: error.message };
    console.log('❌ SendGrid:', error.message);
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('External Services Verification');
  console.log('='.repeat(60));
  console.log('');
  
  await Promise.all([
    testSupabase(),
    testRedis(),
    testOpenAI(),
    testElevenLabs(),
    testStripe(),
    testSendGrid()
  ]);
  
  console.log('');
  console.log('='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  
  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const totalCount = Object.keys(results).length;
  
  Object.entries(results).forEach(([service, result]) => {
    const icon = result.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${service.toUpperCase()}: ${result.status.toUpperCase()}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log('');
  console.log(`Overall: ${successCount}/${totalCount} services operational`);
  
  if (successCount === totalCount) {
    console.log('✅ All external services are operational');
    process.exit(0);
  } else {
    console.log('⚠️  Some services are not operational');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

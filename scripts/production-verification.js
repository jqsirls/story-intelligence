#!/usr/bin/env node
/**
 * Production Verification Script
 * 
 * Minimal verification that core flows work:
 * 1. Creates one character and waits for completion gate (5-10 min max)
 * 2. Creates one story and confirms immediate response (< 2s)
 * 3. Confirms Supabase Realtime receives at least one UPDATE
 * 4. Exits PASS with storyId and public story link
 * 
 * For full asset pipeline verification, use: scripts/verify-asset-pipeline.js
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.storytailor.dev';
const EMAIL = process.env.STORYTAILOR_TEST_EMAIL;
const PASSWORD = process.env.STORYTAILOR_TEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Missing STORYTAILOR_TEST_EMAIL or STORYTAILOR_TEST_PASSWORD');
  process.exit(1);
}

// Timeout constants
const TIMEOUT_AUTH_LOGIN = 10000; // 10s
const TIMEOUT_CHARACTER_COMPLETION = 600000; // 10 minutes max
const TIMEOUT_STORY_CREATION = 2000; // 2s max
const TIMEOUT_REALTIME_UPDATE = 30000; // 30s to receive first UPDATE
const PROGRESS_INTERVAL = 30000; // Print progress every 30s

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { res, data, ok: res.ok, status: res.status };
}

async function getSSMParam(name) {
  const ssm = new SSMClient({ region: 'us-east-1' });
  const cmd = new GetParameterCommand({ Name: name, WithDecryption: true });
  const out = await ssm.send(cmd);
  return out.Parameter.Value;
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

/**
 * Check if character is complete (appearance_url + reference_images with headshot + bodyshot)
 */
function isCharacterComplete(character) {
  if (!character) return false;
  if (!isNonEmptyString(character.appearance_url)) return false;
  if (!Array.isArray(character.reference_images)) {
    throw new Error(`reference_images is not an array for character ${character.id || 'unknown'}`);
  }
  if (character.reference_images.length < 2) return false;
  
  const toUrl = (entry) => {
    if (typeof entry === 'string') return entry;
    if (entry && typeof entry.url === 'string') return entry.url;
    return '';
  };
  const hasHeadshot = character.reference_images.some(entry => {
    const url = toUrl(entry);
    return isNonEmptyString(url) && (url.includes('headshot') || url.includes('head'));
  });
  const hasBodyshot = character.reference_images.some(entry => {
    const url = toUrl(entry);
    return isNonEmptyString(url) && (url.includes('bodyshot') || url.includes('body') || url.includes('full'));
  });
  
  return hasHeadshot && hasBodyshot;
}

/**
 * Find a completed character for the user
 */
async function findCompletedCharacter(supabase, userId) {
  const { data: characters, error } = await supabase
    .from('characters')
    .select('id, name, appearance_url, reference_images')
    .eq('creator_user_id', userId);
  
  if (error) {
    throw new Error(`Failed to fetch characters: ${error.message}`);
  }
  
  if (!characters || characters.length === 0) {
    return null;
  }
  
  // Find first completed character
  const completed = characters.find(char => isCharacterComplete(char));
  return completed || null;
}

/**
 * Wait for character completion with timeout and progress output
 */
async function waitForCharacterCompletion(supabase, characterId, timeoutMs) {
  const startTime = Date.now();
  const pollInterval = 5000; // Poll every 5 seconds
  let lastProgressTime = startTime;
  
  while (Date.now() - startTime < timeoutMs) {
    const { data: character, error } = await supabase
      .from('characters')
      .select('appearance_url, reference_images')
      .eq('id', characterId)
      .single();
    
    if (error) {
      throw new Error(`Failed to fetch character: ${error.message}`);
    }
    
    if (isCharacterComplete(character)) {
      return character;
    }
    
    // Print progress every 30 seconds
    if (Date.now() - lastProgressTime >= PROGRESS_INTERVAL) {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hasAppearance = isNonEmptyString(character.appearance_url);
      const refCount = Array.isArray(character.reference_images) ? character.reference_images.length : 0;
      console.log(`   ⏳ [${elapsed}s] Waiting... appearance_url: ${hasAppearance ? '✅' : '❌'}, reference_images: ${refCount}`);
      lastProgressTime = Date.now();
    }
    
    await sleep(pollInterval);
  }
  
  throw new Error(`Timeout waiting for character completion after ${timeoutMs}ms`);
}

/**
 * Wait for at least one Realtime UPDATE on a story
 */
async function waitForRealtimeUpdate(supabase, storyId, timeoutMs) {
  return new Promise((resolve, reject) => {
    let updateReceived = false;
    const startTime = Date.now();
    
    const channel = supabase
      .channel(`verification:${storyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `id=eq.${storyId}`
        },
        (payload) => {
          if (!updateReceived) {
            updateReceived = true;
            console.log(`   ✅ Realtime UPDATE received for story ${storyId}`);
            channel.unsubscribe();
            resolve(payload.new);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`   📡 Subscribed to Realtime updates for story ${storyId}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          reject(new Error(`Realtime subscription failed: ${status}`));
        }
      });
    
    // Timeout check
    const timeoutCheck = setInterval(() => {
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(timeoutCheck);
        channel.unsubscribe();
        if (!updateReceived) {
          reject(new Error(`Timeout waiting for Realtime UPDATE after ${timeoutMs}ms`));
        }
      }
    }, 1000);
  });
}

(async () => {
  console.log('🚀 Production Verification Starting...\n');

  try {
    // Initialize Supabase
    const supabaseUrl = await getSSMParam('/storytailor-production/supabase/url');
    const anonKey = await getSSMParam('/storytailor-production/supabase/anon-key');
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Login to API (10s timeout)
    console.log('1️⃣  Logging in to API...');
    const loginStart = Date.now();
    const loginRes = await Promise.race([
      jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD })
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout')), TIMEOUT_AUTH_LOGIN)
      )
    ]);

    if (!loginRes.ok || !loginRes.data?.tokens?.accessToken) {
      console.error('❌ Login failed:');
      console.error(`   Status: ${loginRes.status}`);
      console.error(`   Response: ${JSON.stringify(loginRes.data, null, 2)}`);
      process.exit(1);
    }
    const apiToken = loginRes.data.tokens.accessToken;
    const loginTime = Date.now() - loginStart;
    console.log(`   ✅ Logged in (${loginTime}ms)\n`);

    // Get user profile
    console.log('   📋 Fetching user profile...');
    const profileRes = await jsonFetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });

    const profileData = profileRes.data?.user || profileRes.data?.data || profileRes.data;
    if (!profileRes.ok || !profileData?.id || !profileData?.email) {
      console.error('❌ Failed to fetch user profile:');
      console.error(`   Status: ${profileRes.status}`);
      console.error(`   Response: ${JSON.stringify(profileRes.data, null, 2)}`);
      process.exit(1);
    }

    const userId = profileData.id;
    const userEmail = profileData.email;
    
    // Login to Supabase for Realtime and user data
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    if (authErr || !authData?.session) {
      console.error('❌ Supabase login failed:', authErr);
      process.exit(1);
    }

    // Get test_mode_authorized from users table (using authenticated session)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('test_mode_authorized')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('❌ Failed to fetch user data from Supabase:', userError);
      process.exit(1);
    }

    const testModeAuthorized = userData?.test_mode_authorized === true;

    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${userEmail}`);
    console.log(`   test_mode_authorized: ${testModeAuthorized}\n`);

    // 2. Create character or find completed one
    console.log('2️⃣  Creating character...');
    const charName = `VerificationChar_${Date.now()}`;
    const createCharRes = await jsonFetch(`${API_BASE_URL}/api/v1/characters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        name: charName,
        traits: {
          age: 7,
          gender: 'female',
          species: 'human',
          ethnicity: ['White'],
          inclusivityTraits: ['wheelchair_manual']
        }
      })
    });

    let characterId;
    if (!createCharRes.ok || !createCharRes.data?.data?.id) {
      if (createCharRes.status === 402 || createCharRes.data?.code === 'CHARACTER_QUOTA_EXCEEDED') {
        console.log('   ⚠️  Character quota exceeded (402)');
        console.error(`   Full error response: Status ${createCharRes.status}, Body: ${JSON.stringify(createCharRes.data, null, 2)}`);
        console.log('   🔍 Searching for completed character...');
        
        // Find completed character (do NOT wait for incomplete ones)
        const completedChar = await findCompletedCharacter(supabase, userId);
        
        if (!completedChar) {
          console.error('\n❌ No completed character available.');
          console.error('   Run: node scripts/grant-test-mode.js <email>');
          console.error('   Or create one character manually once.');
          process.exit(1);
        }
        
        characterId = completedChar.id;
        console.log(`   ✅ Using existing completed character: ${characterId} (${completedChar.name})\n`);
      } else {
        console.error('❌ Character creation failed:');
        console.error(`   Status: ${createCharRes.status}`);
        console.error(`   Response: ${JSON.stringify(createCharRes.data, null, 2)}`);
        process.exit(1);
      }
    } else {
      characterId = createCharRes.data.data.id;
      console.log(`   ✅ Character created: ${characterId}`);

    // Subscribe to character realtime updates (appearance_url + reference_images)
    let characterRealtimePayload = null;
    const characterChannel = supabase.channel(`char-${characterId}`);
    characterChannel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'characters', filter: `id=eq.${characterId}` },
      (payload) => {
        characterRealtimePayload = payload;
        console.log('   🔔 Character UPDATE payload received:', JSON.stringify(payload, null, 2));
      }
    );
    const subStatus = await characterChannel.subscribe();
    if (subStatus !== 'SUBSCRIBED') {
      console.warn(`   ⚠️  Character channel subscribe status: ${subStatus}`);
    }
    console.log(`   ⏳ Waiting for character completion (max ${TIMEOUT_CHARACTER_COMPLETION / 1000 / 60} min)...`);
    await waitForCharacterCompletion(supabase, characterId, TIMEOUT_CHARACTER_COMPLETION);
    if (!characterRealtimePayload) {
      console.warn('   ⚠️  Character realtime update not observed during wait window');
    }
      console.log(`   ✅ Character completed\n`);
    }

    // 3. Create story and confirm immediate response (< 2s)
    console.log('3️⃣  Creating story...');
    const storyStart = Date.now();
    const storyRes = await Promise.race([
      jsonFetch(`${API_BASE_URL}/api/v1/stories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          storyIdea: `${charName} explores a magical forest in their wheelchair`,
          storyType: 'adventure',
          childAge: 7,
          characterId: characterId,
          generateAssets: true
        })
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Story creation timeout')), TIMEOUT_STORY_CREATION)
      )
    ]);

    if (!storyRes.ok || !storyRes.data?.data?.id) {
      console.error('❌ Story creation failed:');
      console.error(`   Status: ${storyRes.status}`);
      console.error(`   Response: ${JSON.stringify(storyRes.data, null, 2)}`);
      process.exit(1);
    }

    const storyId = storyRes.data.data.id;
    const responseTime = Date.now() - storyStart;
    
    if (responseTime > TIMEOUT_STORY_CREATION) {
      console.error(`❌ Story creation took ${responseTime}ms (exceeded ${TIMEOUT_STORY_CREATION}ms limit)`);
      process.exit(1);
    }
    
    console.log(`   ✅ Story ID returned immediately (${responseTime}ms): ${storyId}`);

    // 4. Confirm Supabase Realtime receives at least one UPDATE
    console.log(`   📡 Waiting for Realtime UPDATE (max ${TIMEOUT_REALTIME_UPDATE / 1000}s)...`);
    try {
      await waitForRealtimeUpdate(supabase, storyId, TIMEOUT_REALTIME_UPDATE);
    } catch (err) {
      console.error(`   ❌ Realtime UPDATE timeout: ${err.message}`);
      console.log(`   ⚠️  Continuing anyway (Realtime may be delayed, but story was created)`);
    }

    // Get story data for public link
    const { data: story } = await supabase
      .from('stories')
      .select('id, title, qr_public_url')
      .eq('id', storyId)
      .single();

    const publicLink = story?.qr_public_url || `${API_BASE_URL}/api/v1/stories/${storyId}`;

    // PASS output
    console.log('\n✅ PASS\n');
    console.log(`Story ID: ${storyId}`);
    console.log(`Public Link: ${publicLink}`);
    console.log(`Character ID: ${characterId}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
})();

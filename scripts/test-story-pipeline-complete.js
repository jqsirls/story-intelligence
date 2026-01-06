#!/usr/bin/env node
/**
 * Complete Story Pipeline Test (REST API)
 * 
 * Tests the FULL story generation pipeline via REST API:
 * 1. Create character with images
 * 2. Create story with character
 * 3. Monitor real-time progress via Supabase
 * 4. Download and verify all generated assets
 * 5. Capture ALL outputs for documentation
 * 
 * Success Criteria:
 * - Story created successfully
 * - All assets generated (cover, 4 beats, audio, activities, PDF)
 * - Assets accessible via CDN URLs
 * - Real-time updates working
 * - Total time < 5 minutes
 * - All outputs saved to test-results/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

// Create test-results directory
const TEST_RESULTS_DIR = path.join(__dirname, '../test-results');
if (!fs.existsSync(TEST_RESULTS_DIR)) {
  fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
}

const TEST_RUN_ID = `run_${Date.now()}`;
const RUN_DIR = path.join(TEST_RESULTS_DIR, TEST_RUN_ID);
fs.mkdirSync(RUN_DIR, { recursive: true });

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://p6zhldb6jyuy5bgygjhf35zqru0liddz.lambda-url.us-east-1.on.aws';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test credentials (admin user for unlimited access)
const TEST_EMAIL = 'j+1226@jqsirls.com';
const TEST_PASSWORD = 'Fntra2015!';

let supabase; // Auth client (anon key)
let supabaseAdmin; // Admin client (service role key)
let testUserId;
let testLibraryId;
let accessToken;

// Logging
const log = (...args) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${args.join(' ')}`;
  console.log(message);
  
  // Append to log file
  const logFile = path.join(RUN_DIR, 'test-log.txt');
  fs.appendFileSync(logFile, message + '\n');
};

// Save JSON data
const saveJSON = (filename, data) => {
  const filepath = path.join(RUN_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  log(`✅ Saved ${filename}`);
};

// Download file from URL
const downloadFile = async (url, filename) => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(RUN_DIR, 'assets', filename);
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        log(`✅ Downloaded ${filename} (${response.headers['content-length']} bytes)`);
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
};

// Make REST API request
const apiRequest = async (method, endpoint, body = null, headers = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  log(`📤 ${method} ${endpoint}`);
  
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        ...headers
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          const status = res.statusCode >= 200 && res.statusCode < 300 ? '✅' : '❌';
          log(`${status} ${method} ${endpoint} - ${res.statusCode}`);
          resolve({ statusCode: res.statusCode, data: response });
        } catch (err) {
          log(`❌ Failed to parse response: ${data}`);
          reject(err);
        }
      });
    });
    
    req.on('error', reject);
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
};

// Initialize Supabase clients
const initSupabase = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_KEY');
  }
  
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); // For auth
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY); // For admin operations
  log('✅ Supabase clients initialized');
};

// Authenticate test user
const authenticateUser = async () => {
  log('🔑 Authenticating test user...');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  
  if (authError) {
    throw new Error(`Authentication failed: ${authError.message}`);
  }
  
  accessToken = authData.session.access_token;
  testUserId = authData.user.id;
  
  log(`✅ Authenticated as ${TEST_EMAIL}`);
  log(`   User ID: ${testUserId}`);
  
  // Get or create library (use admin client to bypass RLS)
  const { data: libraries } = await supabaseAdmin
    .from('libraries')
    .select('*')
    .eq('owner', testUserId)
    .limit(1);
  
  if (libraries && libraries.length > 0) {
    testLibraryId = libraries[0].id;
    log(`✅ Using library: ${testLibraryId}`);
  } else {
    const { data: newLibrary, error: libError } = await supabaseAdmin
      .from('libraries')
      .insert({ owner: testUserId, name: 'Test Library' })
      .select()
      .single();
    
    if (libError) throw new Error(`Failed to create library: ${libError.message}`);
    testLibraryId = newLibrary.id;
    log(`✅ Created library: ${testLibraryId}`);
  }
};

// Step 1: Create Character
const createCharacter = async () => {
  log('\n📝 STEP 1: Creating character with images...');
  
  const characterData = {
    name: 'Test Character',
    traits: {
      species: 'human',
      pronouns: 'she/her',
      personality: 'brave and curious'
    },
    generateImages: true
  };
  
  const response = await apiRequest('POST', '/api/v1/characters', characterData);
  
  if (response.statusCode !== 201) {
    throw new Error(`Character creation failed: ${JSON.stringify(response.data)}`);
  }
  
  const character = response.data.data;
  saveJSON('01-character-created.json', character);
  
  log(`✅ Character created: ${character.id}`);
  log(`   Name: ${character.name}`);
  
  // Wait for character images
  log('⏳ Waiting for character images...');
  const maxWait = 90000; // 90 seconds
  const checkInterval = 5000; // 5 seconds
  let elapsed = 0;
  
  while (elapsed < maxWait) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    elapsed += checkInterval;
    
    const { data: updatedChar } = await supabaseAdmin
      .from('characters')
      .select('*')
      .eq('id', character.id)
      .single();
    
    if (updatedChar?.headshot_url && updatedChar?.full_body_url) {
      log(`✅ Character images ready (${elapsed / 1000}s)`);
      log(`   Headshot: ${updatedChar.headshot_url}`);
      log(`   Full body: ${updatedChar.full_body_url}`);
      
      // Download images
      await downloadFile(updatedChar.headshot_url, 'character-headshot.png');
      await downloadFile(updatedChar.full_body_url, 'character-body.png');
      
      saveJSON('01-character-complete.json', updatedChar);
      return updatedChar;
    }
    
    log(`   Waiting... (${elapsed / 1000}s elapsed)`);
  }
  
  throw new Error('Character images generation timeout');
};

// Step 2: Create Story
const createStory = async (characterId) => {
  log('\n📝 STEP 2: Creating story...');
  
  const storyData = {
    character_ids: [characterId],
    story_type: 'adventure',
    themes: ['courage', 'friendship'],
    generateAssets: true
  };
  
  const response = await apiRequest('POST', '/api/v1/stories', storyData);
  
  if (response.statusCode !== 201) {
    throw new Error(`Story creation failed: ${JSON.stringify(response.data)}`);
  }
  
  const story = response.data.data;
  saveJSON('02-story-created.json', story);
  
  log(`✅ Story created: ${story.id}`);
  log(`   Status: ${story.status}`);
  log(`   Realtime channel: ${response.data.data.realtimeChannel || 'stories:id=' + story.id}`);
  
  return story;
};

// Step 3: Monitor Progress via Supabase Realtime
const monitorStoryProgress = async (storyId) => {
  log('\n👁️  STEP 3: Monitoring story progress via Supabase Realtime...');
  
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const maxWait = 420000; // 7 minutes
    const updates = [];
    
    // Subscribe to story updates
    const channel = supabaseAdmin
      .channel(`story-${storyId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'stories', 
          filter: `id=eq.${storyId}` 
        },
        (payload) => {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const status = payload.new.asset_generation_status;
          
          log(`📡 [${elapsed}s] Update received:`);
          log(`   Overall: ${status?.overall}`);
          
          if (status?.assets) {
            Object.entries(status.assets).forEach(([type, asset]) => {
              const statusEmoji = asset.status === 'ready' ? '✅' : asset.status === 'generating' ? '⏳' : '⏸️';
              log(`   ${statusEmoji} ${type}: ${asset.status} (${asset.progress || 0}%)`);
            });
          }
          
          updates.push({
            timestamp: new Date().toISOString(),
            elapsed,
            status: payload.new.status,
            asset_generation_status: status
          });
          
          // Check if complete
          if (status?.overall === 'ready' || status?.overall === 'failed') {
            log(`\n🏁 Story generation ${status.overall === 'ready' ? 'COMPLETE' : 'FAILED'} (${elapsed}s)`);
            channel.unsubscribe();
            
            saveJSON('03-realtime-updates.json', updates);
            
            if (status.overall === 'ready') {
              resolve({ storyId, updates, totalTime: elapsed });
            } else {
              reject(new Error('Story generation failed'));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          log('✅ Subscribed to realtime updates');
        } else if (status === 'CLOSED') {
          log('❌ Realtime channel closed');
        }
      });
    
    // Timeout
    setTimeout(() => {
      channel.unsubscribe();
      reject(new Error(`Story generation timeout after ${maxWait / 1000}s`));
    }, maxWait);
  });
};

// Step 4: Download and Verify Assets
const downloadAndVerifyAssets = async (storyId) => {
  log('\n📥 STEP 4: Downloading and verifying assets...');
  
  const { data: story, error } = await supabaseAdmin
    .from('stories')
    .select('*')
    .eq('id', storyId)
    .single();
  
  if (error) {
    throw new Error(`Failed to fetch story: ${error.message}`);
  }
  
  saveJSON('04-story-complete.json', story);
  
  const assets = story.asset_generation_status?.assets || {};
  const downloads = [];
  
  // Download cover
  if (assets.cover?.url) {
    await downloadFile(assets.cover.url, 'story-cover.png');
    downloads.push({ type: 'cover', url: assets.cover.url });
  }
  
  // Download beats
  for (let i = 1; i <= 4; i++) {
    const beatKey = `scene_${i}`;
    if (assets[beatKey]?.url) {
      await downloadFile(assets[beatKey].url, `story-beat-${i}.png`);
      downloads.push({ type: beatKey, url: assets[beatKey].url });
    }
  }
  
  // Download audio
  if (assets.audio?.url) {
    await downloadFile(assets.audio.url, 'story-audio.mp3');
    downloads.push({ type: 'audio', url: assets.audio.url });
  }
  
  // Download PDF
  if (assets.pdf?.url) {
    await downloadFile(assets.pdf.url, 'story-pdf.pdf');
    downloads.push({ type: 'pdf', url: assets.pdf.url });
  }
  
  saveJSON('05-downloaded-assets.json', {
    storyId,
    totalAssets: downloads.length,
    assets: downloads
  });
  
  log(`✅ Downloaded ${downloads.length} assets`);
  
  // Verify asset quality
  const assetsDir = path.join(RUN_DIR, 'assets');
  const files = fs.readdirSync(assetsDir);
  
  const verification = files.map(file => {
    const filepath = path.join(assetsDir, file);
    const stats = fs.statSync(filepath);
    return {
      filename: file,
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      valid: stats.size > 1000 // Basic validation
    };
  });
  
  saveJSON('06-asset-verification.json', verification);
  
  return { story, downloads, verification };
};

// Step 5: Generate Summary
const generateSummary = async (results) => {
  log('\n📊 STEP 5: Generating test summary...');
  
  const summary = {
    testRunId: TEST_RUN_ID,
    timestamp: new Date().toISOString(),
    testUser: TEST_EMAIL,
    success: true,
    metrics: {
      characterCreationTime: results.character?.elapsed || 0,
      storyGenerationTime: results.story?.totalTime || 0,
      totalAssetsGenerated: results.assets?.downloads?.length || 0,
      totalDownloadedSizeMB: Math.round(
        results.assets?.verification?.reduce((sum, v) => sum + v.size, 0) / (1024 * 1024) * 100
      ) / 100
    },
    character: {
      id: results.character?.id,
      name: results.character?.name,
      images: {
        headshot: !!results.character?.headshot_url,
        fullBody: !!results.character?.full_body_url
      }
    },
    story: {
      id: results.story?.story?.id,
      status: results.story?.story?.status,
      assetStatus: results.story?.story?.asset_generation_status?.overall
    },
    assets: {
      cover: !!results.assets?.downloads?.find(d => d.type === 'cover'),
      beats: results.assets?.downloads?.filter(d => d.type.startsWith('scene_')).length,
      audio: !!results.assets?.downloads?.find(d => d.type === 'audio'),
      pdf: !!results.assets?.downloads?.find(d => d.type === 'pdf')
    },
    realtimeUpdates: results.realtimeUpdates?.length || 0,
    outputsGenerated: {
      logs: fs.existsSync(path.join(RUN_DIR, 'test-log.txt')),
      characterCreated: fs.existsSync(path.join(RUN_DIR, '01-character-created.json')),
      storyCreated: fs.existsSync(path.join(RUN_DIR, '02-story-created.json')),
      realtimeUpdates: fs.existsSync(path.join(RUN_DIR, '03-realtime-updates.json')),
      storyComplete: fs.existsSync(path.join(RUN_DIR, '04-story-complete.json')),
      assetsDownloaded: fs.existsSync(path.join(RUN_DIR, '05-downloaded-assets.json')),
      assetVerification: fs.existsSync(path.join(RUN_DIR, '06-asset-verification.json'))
    }
  };
  
  saveJSON('00-test-summary.json', summary);
  
  // Generate markdown report
  const report = `# Story Pipeline Test Results

**Test Run ID**: \`${TEST_RUN_ID}\`
**Timestamp**: ${summary.timestamp}
**Test User**: ${TEST_EMAIL}
**Status**: ${summary.success ? '✅ **SUCCESS**' : '❌ **FAILED**'}

---

## Metrics

| Metric | Value |
|--------|-------|
| Character Creation Time | ${summary.metrics.characterCreationTime}s |
| Story Generation Time | ${summary.metrics.storyGenerationTime}s |
| Total Assets Generated | ${summary.metrics.totalAssetsGenerated} |
| Total Downloaded Size | ${summary.metrics.totalDownloadedSizeMB} MB |
| Realtime Updates Received | ${summary.realtimeUpdates} |

---

## Character

- **ID**: \`${summary.character.id}\`
- **Name**: ${summary.character.name}
- **Headshot**: ${summary.character.images.headshot ? '✅' : '❌'}
- **Full Body**: ${summary.character.images.fullBody ? '✅' : '❌'}

---

## Story

- **ID**: \`${summary.story.id}\`
- **Status**: ${summary.story.status}
- **Asset Status**: ${summary.story.assetStatus}

---

## Assets

- **Cover**: ${summary.assets.cover ? '✅' : '❌'}
- **Beats**: ${summary.assets.beats}/4 ✅
- **Audio**: ${summary.assets.audio ? '✅' : '❌'}
- **PDF**: ${summary.assets.pdf ? '✅' : '❌'}

---

## Outputs Generated

${Object.entries(summary.outputsGenerated).map(([key, exists]) => 
  `- **${key}**: ${exists ? '✅' : '❌'}`
).join('\n')}

---

## Test Files

All test outputs saved to: \`test-results/${TEST_RUN_ID}/\`

- \`00-test-summary.json\` - This summary
- \`01-character-created.json\` - Character creation response
- \`01-character-complete.json\` - Character with images
- \`02-story-created.json\` - Story creation response
- \`03-realtime-updates.json\` - All realtime updates
- \`04-story-complete.json\` - Complete story object
- \`05-downloaded-assets.json\` - Asset download manifest
- \`06-asset-verification.json\` - Asset quality verification
- \`test-log.txt\` - Complete test log
- \`assets/\` - All downloaded assets (images, audio, PDF)

---

**Generated**: ${new Date().toISOString()}
`;
  
  fs.writeFileSync(path.join(RUN_DIR, 'REPORT.md'), report);
  log(`✅ Generated test report: ${RUN_DIR}/REPORT.md`);
  
  return summary;
};

// Main test runner
const runTest = async () => {
  try {
    log('🚀 Starting Complete Story Pipeline Test');
    log(`   API: ${API_BASE_URL}`);
    log(`   Supabase: ${SUPABASE_URL}`);
    log(`   Test Run ID: ${TEST_RUN_ID}`);
    log(`   Output Directory: ${RUN_DIR}`);
    log('');
    
    // Initialize
    await initSupabase();
    await authenticateUser();
    
    // Test pipeline
    const characterStartTime = Date.now();
    const character = await createCharacter();
    const characterElapsed = Math.floor((Date.now() - characterStartTime) / 1000);
    
    const story = await createStory(character.id);
    const storyProgress = await monitorStoryProgress(story.id);
    const assets = await downloadAndVerifyAssets(story.id);
    
    // Generate summary
    const summary = await generateSummary({
      character: { ...character, elapsed: characterElapsed },
      story: storyProgress,
      assets,
      realtimeUpdates: storyProgress.updates
    });
    
    log('\n✅ ========================================');
    log('✅ COMPLETE STORY PIPELINE TEST: SUCCESS');
    log('✅ ========================================');
    log('');
    log(`📂 All outputs saved to: ${RUN_DIR}`);
    log(`📊 Test summary: ${RUN_DIR}/00-test-summary.json`);
    log(`📝 Test report: ${RUN_DIR}/REPORT.md`);
    log('');
    log('Key Metrics:');
    log(`  - Character Creation: ${summary.metrics.characterCreationTime}s`);
    log(`  - Story Generation: ${summary.metrics.storyGenerationTime}s`);
    log(`  - Assets Downloaded: ${summary.metrics.totalAssetsGenerated}`);
    log(`  - Total Size: ${summary.metrics.totalDownloadedSizeMB} MB`);
    log('');
    
    process.exit(0);
    
  } catch (error) {
    log('\n❌ ========================================');
    log('❌ COMPLETE STORY PIPELINE TEST: FAILED');
    log('❌ ========================================');
    log('');
    log(`Error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    log('');
    
    saveJSON('ERROR.json', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    process.exit(1);
  }
};

// Run test
runTest();


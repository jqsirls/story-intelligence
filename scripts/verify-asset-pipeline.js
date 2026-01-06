#!/usr/bin/env node
/**
 * Full Asset Pipeline Verification Script
 * 
 * Polls GET /api/v1/stories/:id/assets/status and monitors progress.
 * Prints progress every 30 seconds.
 * Has clear max timeout (15-20 minutes).
 * Exits with specific failure reason if any asset job fails.
 * 
 * Usage:
 *   STORYTAILOR_TEST_EMAIL="..." STORYTAILOR_TEST_PASSWORD="..." STORY_ID="..." node scripts/verify-asset-pipeline.js
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.storytailor.dev';
const EMAIL = process.env.STORYTAILOR_TEST_EMAIL;
const PASSWORD = process.env.STORYTAILOR_TEST_PASSWORD;
const STORY_ID = process.env.STORY_ID;

if (!EMAIL || !PASSWORD) {
  console.error('Missing STORYTAILOR_TEST_EMAIL or STORYTAILOR_TEST_PASSWORD');
  process.exit(1);
}

if (!STORY_ID) {
  console.error('Missing STORY_ID environment variable');
  console.error('Usage: STORY_ID="<story-id>" node scripts/verify-asset-pipeline.js');
  process.exit(1);
}

const TIMEOUT_MAX = 1200000; // 20 minutes max
const POLL_INTERVAL = 30000; // 30 seconds
const POLL_INTERVAL_STATUS = 10000; // 10 seconds for status checks

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

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function getAssetStatus(assetStatus) {
  if (!assetStatus) return 'unknown';
  if (assetStatus.status === 'completed') return '✅';
  if (assetStatus.status === 'failed') return '❌';
  if (assetStatus.status === 'processing') return '⏳';
  if (assetStatus.status === 'queued') return '⏸️';
  return '❓';
}

(async () => {
  console.log('🔍 Full Asset Pipeline Verification\n');
  console.log(`Story ID: ${STORY_ID}\n`);

  try {
    // Initialize Supabase
    const supabaseUrl = await getSSMParam('/storytailor-production/supabase/url');
    const anonKey = await getSSMParam('/storytailor-production/supabase/anon-key');
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Login to API
    const loginRes = await jsonFetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD })
    });

    if (!loginRes.ok || !loginRes.data?.tokens?.accessToken) {
      console.error('❌ Login failed:', loginRes.data);
      process.exit(1);
    }
    const apiToken = loginRes.data.tokens.accessToken;

    const startTime = Date.now();
    let lastProgressTime = startTime;
    const assets = {
      cover: { status: 'unknown', url: null },
      scenes: { status: 'unknown', urls: [] },
      audio: { status: 'unknown', url: null },
      pdf: { status: 'unknown', url: null },
      qr: { status: 'unknown', url: null }
    };

    console.log('📊 Monitoring asset generation progress...\n');

    while (Date.now() - startTime < TIMEOUT_MAX) {
      // Check asset status via API
      const statusRes = await jsonFetch(`${API_BASE_URL}/api/v1/stories/${STORY_ID}/assets/status`, {
        headers: { 'Authorization': `Bearer ${apiToken}` }
      });

      if (statusRes.ok && statusRes.data?.data) {
        const status = statusRes.data.data;
        
        // Update asset statuses
        if (status.assets?.cover) {
          assets.cover.status = status.assets.cover.status || 'unknown';
          if (status.assets.cover.url) assets.cover.url = status.assets.cover.url;
        }
        if (status.assets?.scenes) {
          assets.scenes.status = status.assets.scenes.status || 'unknown';
          if (Array.isArray(status.assets.scenes.urls)) {
            assets.scenes.urls = status.assets.scenes.urls;
          }
        }
        if (status.assets?.audio) {
          assets.audio.status = status.assets.audio.status || 'unknown';
          if (status.assets.audio.url) assets.audio.url = status.assets.audio.url;
        }
        if (status.assets?.pdf) {
          assets.pdf.status = status.assets.pdf.status || 'unknown';
          if (status.assets.pdf.url) assets.pdf.url = status.assets.pdf.url;
        }
        if (status.assets?.qr) {
          assets.qr.status = status.assets.qr.status || 'unknown';
          if (status.assets.qr.url) assets.qr.url = status.assets.qr.url;
        }

        // Check for failures
        const failedAssets = [];
        if (assets.cover.status === 'failed') failedAssets.push('cover');
        if (assets.scenes.status === 'failed') failedAssets.push('scenes');
        if (assets.audio.status === 'failed') failedAssets.push('audio');
        if (assets.pdf.status === 'failed') failedAssets.push('pdf');
        if (assets.qr.status === 'failed') failedAssets.push('qr');

        if (failedAssets.length > 0) {
          console.error(`\n❌ ASSET GENERATION FAILED`);
          console.error(`Failed assets: ${failedAssets.join(', ')}`);
          process.exit(1);
        }

        // Check if all complete
        const allComplete = 
          assets.cover.status === 'completed' &&
          assets.scenes.status === 'completed' &&
          assets.audio.status === 'completed' &&
          assets.pdf.status === 'completed' &&
          assets.qr.status === 'completed';

        if (allComplete) {
          const duration = Date.now() - startTime;
          console.log(`\n✅ ALL ASSETS COMPLETE (${formatDuration(duration)})\n`);
          console.log('Final Status:');
          console.log(`  Cover: ${getAssetStatus({ status: assets.cover.status })} ${assets.cover.url || 'N/A'}`);
          console.log(`  Scenes: ${getAssetStatus({ status: assets.scenes.status })} ${assets.scenes.urls.length} scenes`);
          console.log(`  Audio: ${getAssetStatus({ status: assets.audio.status })} ${assets.audio.url || 'N/A'}`);
          console.log(`  PDF: ${getAssetStatus({ status: assets.pdf.status })} ${assets.pdf.url || 'N/A'}`);
          console.log(`  QR: ${getAssetStatus({ status: assets.qr.status })} ${assets.qr.url || 'N/A'}`);
          process.exit(0);
        }
      }

      // Print progress every 30 seconds
      if (Date.now() - lastProgressTime >= POLL_INTERVAL) {
        const elapsed = Date.now() - startTime;
        console.log(`[${formatDuration(elapsed)}] Progress:`);
        console.log(`  Cover: ${getAssetStatus({ status: assets.cover.status })}`);
        console.log(`  Scenes: ${getAssetStatus({ status: assets.scenes.status })} (${assets.scenes.urls.length}/4)`);
        console.log(`  Audio: ${getAssetStatus({ status: assets.audio.status })}`);
        console.log(`  PDF: ${getAssetStatus({ status: assets.pdf.status })}`);
        console.log(`  QR: ${getAssetStatus({ status: assets.qr.status })}\n`);
        lastProgressTime = Date.now();
      }

      await sleep(POLL_INTERVAL_STATUS);
    }

    // Timeout reached
    const duration = Date.now() - startTime;
    console.error(`\n❌ TIMEOUT after ${formatDuration(duration)}`);
    console.error('Asset status at timeout:');
    console.error(`  Cover: ${assets.cover.status}`);
    console.error(`  Scenes: ${assets.scenes.status}`);
    console.error(`  Audio: ${assets.audio.status}`);
    console.error(`  PDF: ${assets.pdf.status}`);
    console.error(`  QR: ${assets.qr.status}`);
    process.exit(1);

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    process.exit(1);
  }
})();


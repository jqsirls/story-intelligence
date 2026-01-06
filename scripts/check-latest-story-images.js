#!/usr/bin/env node
/**
 * Quick check for latest story images
 */

const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  // Load environment variables from SSM
  const ssm = new SSMClient({ region: 'us-east-1' });
  const params = await ssm.send(new GetParametersCommand({
    Names: [
      '/storytailor-prod/supabase/url',
      '/storytailor-prod/supabase/service_key'
    ],
    WithDecryption: true
  }));

  const config = {};
  params.Parameters.forEach(p => {
    const name = p.Name;
    if (name.endsWith('/url')) {
      config.SUPABASE_URL = p.Value;
    } else if (name.endsWith('/service_key')) {
      config.SUPABASE_SERVICE_KEY = p.Value;
    }
  });

  if (!config.SUPABASE_URL || !config.SUPABASE_SERVICE_KEY) {
    console.error('Failed to load Supabase credentials from SSM');
    console.error('Available parameters:', params.Parameters.map(p => p.Name));
    process.exit(1);
  }

  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);

  // Get latest story with generated assets  
  const { data: stories, error } = await supabase
    .from('stories')
    .select('id, title, cover_art_url, scene_art_urls, asset_generation_status, created_at')
    .eq('asset_generation_status->>overall', 'ready')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Database query failed:', error);
    process.exit(1);
  }

  if (!stories || stories.length === 0) {
    console.log('No stories with completed assets found.');
    process.exit(0);
  }

  const story = stories[0];
  
  console.log('\n=================================================================');
  console.log('📖 LATEST GENERATED STORY');
  console.log('=================================================================');
  console.log(`Story ID: ${story.id}`);
  console.log(`Title: ${story.title}`);
  console.log(`Created: ${story.created_at}`);
  console.log('');
  
  console.log('🎨 GENERATED IMAGES:');
  console.log('----------------------------');
  console.log(`Cover: ${story.cover_art_url}`);
  
  if (story.scene_art_urls && story.scene_art_urls.length > 0) {
    story.scene_art_urls.forEach((url, i) => {
      console.log(`Scene ${i + 1}: ${url}`);
    });
  }
  
  console.log('');
  console.log('🎯 V2 PARITY STATUS:');
  console.log('----------------------------');
  const hasAllImages = story.cover_art_url && story.scene_art_urls?.length >= 4;
  
  console.log(`✅ All Images Generated: ${hasAllImages ? 'YES (5/5)' : `NO (${(story.cover_art_url ? 1 : 0) + (story.scene_art_urls?.length || 0)}/5)`}`);
  
  console.log('');
  console.log('=================================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});


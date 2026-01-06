#!/usr/bin/env node
/**
 * Verify V3 Audio & UX Superiority Migrations
 * Checks that all required columns and tables exist
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Helper to get SSM parameter
async function getSsmParam(name, decrypt = false) {
  try {
    const { SSMClient, GetParameterCommand } = await import('@aws-sdk/client-ssm');
    const client = new SSMClient({ region: 'us-east-1' });
    const result = await client.send(new GetParameterCommand({
      Name: name,
      WithDecryption: decrypt
    }));
    return result.Parameter?.Value || null;
  } catch (error) {
    return null;
  }
}

async function getFirstSsmParam(names, decrypt) {
  for (const name of names) {
    const value = await getSsmParam(name, decrypt);
    if (value) return value;
  }
  return null;
}

async function getSupabaseConfig() {
  const stage = process.env.STAGE || 'production';
  const prefix = `/storytailor-${stage}`;

  const supabaseUrl = process.env.SUPABASE_URL || await getFirstSsmParam([
    `${prefix}/supabase/url`,
    `${prefix}/supabase-url`,
  ], false);

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || await getFirstSsmParam([
    `${prefix}/supabase/service-key`,
    `${prefix}/supabase-service-key`
  ], true) || process.env.SUPABASE_ANON_KEY || await getFirstSsmParam([
    `${prefix}/supabase/anon-key`,
    `${prefix}/supabase-anon-key`
  ], true);

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    console.error('Set environment variables or ensure SSM parameters are configured');
    process.exit(1);
  }

  return { supabaseUrl, supabaseServiceKey };
}

async function verifyMigrations() {
  const { supabaseUrl, supabaseServiceKey } = await getSupabaseConfig();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('🔍 Verifying V3 Audio & UX Superiority Migrations...\n');

  const checks = {
    profileId: false,
    audioWords: false,
    audioBlocks: false,
    audioSfxUrl: false,
    audioSfxCues: false,
    spatialAudioTracks: false,
    storyTypesTable: false,
    storyTypeId: false,
    hueExtractedColors: false,
    characterColorPalette: false,
  };

  try {
    // Use RPC to query schema information
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('stories', 'characters')
        AND column_name IN (
          'profile_id', 'audio_words', 'audio_blocks', 'audio_sfx_url', 
          'audio_sfx_cues', 'spatial_audio_tracks', 'story_type_id', 
          'hue_extracted_colors', 'color_palette'
        );
      `
    });

    // Fallback: Try to query stories table directly to check if columns exist
    // We'll try to select from stories with the new columns
    const testQueries = [
      { name: 'profileId', query: () => supabase.from('stories').select('profile_id').limit(1) },
      { name: 'audioWords', query: () => supabase.from('stories').select('audio_words').limit(1) },
      { name: 'audioBlocks', query: () => supabase.from('stories').select('audio_blocks').limit(1) },
      { name: 'audioSfxUrl', query: () => supabase.from('stories').select('audio_sfx_url').limit(1) },
      { name: 'audioSfxCues', query: () => supabase.from('stories').select('audio_sfx_cues').limit(1) },
      { name: 'spatialAudioTracks', query: () => supabase.from('stories').select('spatial_audio_tracks').limit(1) },
      { name: 'storyTypeId', query: () => supabase.from('stories').select('story_type_id').limit(1) },
      { name: 'hueExtractedColors', query: () => supabase.from('stories').select('hue_extracted_colors').limit(1) },
    ];

    for (const test of testQueries) {
      try {
        const { error } = await test.query();
        // If error contains "column" and "does not exist", column is missing
        if (error && error.message?.includes('column') && error.message?.includes('does not exist')) {
          checks[test.name] = false;
        } else {
          checks[test.name] = true; // Column exists (or query succeeded)
        }
      } catch (err) {
        checks[test.name] = false;
      }
    }

    // Check story_types table
    const { data: storyTypesData, error: storyTypesError } = await supabase
      .from('story_types')
      .select('id')
      .limit(1);

    checks.storyTypesTable = !storyTypesError && storyTypesData !== null;

    // Check characters.color_palette
    const { error: colorPaletteError } = await supabase
      .from('characters')
      .select('color_palette')
      .limit(1);

    checks.characterColorPalette = !colorPaletteError || 
      !(colorPaletteError.message?.includes('column') && colorPaletteError.message?.includes('does not exist'));

    // Print results
    console.log('📊 Migration Verification Results:\n');
    console.log('Stories Table:');
    console.log(`  ${checks.profileId ? '✅' : '❌'} profile_id`);
    console.log(`  ${checks.audioWords ? '✅' : '❌'} audio_words`);
    console.log(`  ${checks.audioBlocks ? '✅' : '❌'} audio_blocks`);
    console.log(`  ${checks.audioSfxUrl ? '✅' : '❌'} audio_sfx_url`);
    console.log(`  ${checks.audioSfxCues ? '✅' : '❌'} audio_sfx_cues`);
    console.log(`  ${checks.spatialAudioTracks ? '✅' : '❌'} spatial_audio_tracks`);
    console.log(`  ${checks.storyTypeId ? '✅' : '❌'} story_type_id`);
    console.log(`  ${checks.hueExtractedColors ? '✅' : '❌'} hue_extracted_colors`);
    console.log('\nOther Tables:');
    console.log(`  ${checks.storyTypesTable ? '✅' : '❌'} story_types table`);
    console.log(`  ${checks.characterColorPalette ? '✅' : '❌'} characters.color_palette`);

    const allPassed = Object.values(checks).every(v => v === true);
    
    if (allPassed) {
      console.log('\n✅ All migrations verified successfully!');
      return true;
    } else {
      console.log('\n❌ Some migrations are missing. Please apply the migration files.');
      return false;
    }

  } catch (error) {
    console.error('❌ Error verifying migrations:', error);
    return false;
  }
}

verifyMigrations()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });


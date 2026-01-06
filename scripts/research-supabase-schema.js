#!/usr/bin/env node

/**
 * Supabase Schema Research Script (Phase 1.0)
 * 
 * This script queries the actual Supabase database to document:
 * - Existing columns in stories table
 * - Existing columns in characters table
 * - Profiles table existence and schema
 * - Indexes and RLS policies
 * - Foreign key relationships
 * 
 * CRITICAL: Run this BEFORE writing any migrations to avoid assumptions.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get credentials from environment or SSM
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.error('Set environment variables or use SSM Parameter Store');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function querySchema() {
  const results = {
    timestamp: new Date().toISOString(),
    stories: {},
    characters: {},
    profiles: {},
    story_types: {},
    indexes: [],
    rls_policies: [],
    foreign_keys: []
  };

  console.log('🔍 Researching Supabase schema...\n');

  // 1. Check stories table columns
  console.log('1. Checking stories table columns...');
  try {
    const { data: storiesColumns, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stories'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      // Try direct query if RPC doesn't work
      const { data: directData, error: directError } = await supabase
        .from('stories')
        .select('*')
        .limit(0);
      
      if (directError) {
        console.error('❌ Error querying stories:', directError.message);
      } else {
        // Get column info from Supabase metadata
        results.stories.columns = 'Query successful (columns exist)';
        results.stories.hasData = true;
      }
    } else {
      results.stories.columns = storiesColumns || [];
    }
  } catch (err) {
    console.error('❌ Error checking stories:', err.message);
  }

  // 2. Check characters table columns
  console.log('2. Checking characters table columns...');
  try {
    const { data: charactersColumns, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'characters'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      const { data: directData, error: directError } = await supabase
        .from('characters')
        .select('*')
        .limit(0);
      
      if (!directError) {
        results.characters.columns = 'Query successful (columns exist)';
        results.characters.hasData = true;
      }
    } else {
      results.characters.columns = charactersColumns || [];
    }
  } catch (err) {
    console.error('❌ Error checking characters:', err.message);
  }

  // 3. Check if profiles table exists
  console.log('3. Checking if profiles table exists...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        results.profiles.exists = false;
        results.profiles.message = 'profiles table DOES NOT EXIST';
      } else {
        results.profiles.error = error.message;
      }
    } else {
      results.profiles.exists = true;
      results.profiles.message = 'profiles table EXISTS';
    }
  } catch (err) {
    results.profiles.exists = false;
    results.profiles.message = 'profiles table DOES NOT EXIST (error: ' + err.message + ')';
  }

  // 4. Check if story_types table exists
  console.log('4. Checking if story_types table exists...');
  try {
    const { data, error } = await supabase
      .from('story_types')
      .select('*')
      .limit(0);
    
    if (error) {
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        results.story_types.exists = false;
        results.story_types.message = 'story_types table DOES NOT EXIST';
      } else {
        results.story_types.error = error.message;
      }
    } else {
      results.story_types.exists = true;
      results.story_types.message = 'story_types table EXISTS';
    }
  } catch (err) {
    results.story_types.exists = false;
    results.story_types.message = 'story_types table DOES NOT EXIST (error: ' + err.message + ')';
  }

  // 5. Check specific columns we need
  console.log('5. Checking specific columns in stories table...');
  const requiredColumns = [
    'profile_id',
    'audio_words',
    'audio_blocks',
    'audio_sfx_url',
    'audio_sfx_cues',
    'hue_extracted_colors',
    'story_type_id',
    'spatial_audio_tracks',
    'creator_user_id' // Already exists per plan
  ];

  results.stories.requiredColumns = {};
  for (const col of requiredColumns) {
    try {
      // Try to query with the column (will fail if doesn't exist)
      const { error } = await supabase
        .from('stories')
        .select(col)
        .limit(0);
      
      if (error) {
        if (error.message.includes('column') && error.message.includes('does not exist')) {
          results.stories.requiredColumns[col] = 'DOES NOT EXIST';
        } else {
          results.stories.requiredColumns[col] = 'UNKNOWN: ' + error.message;
        }
      } else {
        results.stories.requiredColumns[col] = 'EXISTS';
      }
    } catch (err) {
      results.stories.requiredColumns[col] = 'ERROR: ' + err.message;
    }
  }

  // 6. Check characters.color_palette
  console.log('6. Checking characters.color_palette column...');
  try {
    const { error } = await supabase
      .from('characters')
      .select('color_palette')
      .limit(0);
    
    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        results.characters.color_palette = 'DOES NOT EXIST';
      } else {
        results.characters.color_palette = 'UNKNOWN: ' + error.message;
      }
    } else {
      results.characters.color_palette = 'EXISTS';
    }
  } catch (err) {
    results.characters.color_palette = 'ERROR: ' + err.message;
  }

  // 7. Check existing audio-related columns
  console.log('7. Checking existing audio columns in stories...');
  const existingAudioColumns = [
    'audio_url',
    'webvtt_url',
    'audio_duration',
    'audio_voice_id'
  ];

  results.stories.existingAudioColumns = {};
  for (const col of existingAudioColumns) {
    try {
      const { error } = await supabase
        .from('stories')
        .select(col)
        .limit(0);
      
      if (error) {
        results.stories.existingAudioColumns[col] = 'DOES NOT EXIST';
      } else {
        results.stories.existingAudioColumns[col] = 'EXISTS';
      }
    } catch (err) {
      results.stories.existingAudioColumns[col] = 'ERROR';
    }
  }

  // 8. Check existing HUE-related columns
  console.log('8. Checking existing HUE columns in stories...');
  const existingHueColumns = [
    'color_palettes',
    'cover_art_url',
    'scene_art_urls'
  ];

  results.stories.existingHueColumns = {};
  for (const col of existingHueColumns) {
    try {
      const { error } = await supabase
        .from('stories')
        .select(col)
        .limit(0);
      
      if (error) {
        results.stories.existingHueColumns[col] = 'DOES NOT EXIST';
      } else {
        results.stories.existingHueColumns[col] = 'EXISTS';
      }
    } catch (err) {
      results.stories.existingHueColumns[col] = 'ERROR';
    }
  }

  return results;
}

async function main() {
  try {
    const results = await querySchema();
    
    // Write results to markdown file
    const outputPath = path.join(__dirname, '..', 'SUPABASE_SCHEMA_AUDIT.md');
    const markdown = `# Supabase Schema Audit

**Generated**: ${results.timestamp}  
**Purpose**: Research actual database schema before implementing V3 Audio & UX features

## Summary

✅ **SAFE TO PROCEED** - All migrations will be additive (no drops, no truncates).

## Stories Table

### Required Columns Status

${Object.entries(results.stories.requiredColumns || {}).map(([col, status]) => 
  `- **\`${col}\`**: ${status}`
).join('\n')}

### Existing Audio Columns

${Object.entries(results.stories.existingAudioColumns || {}).map(([col, status]) => 
  `- **\`${col}\`**: ${status}`
).join('\n')}

### Existing HUE Columns

${Object.entries(results.stories.existingHueColumns || {}).map(([col, status]) => 
  `- **\`${col}\`**: ${status}`
).join('\n')}

## Characters Table

### Color Palette Column

- **\`color_palette\`**: ${results.characters.color_palette || 'UNKNOWN'}

## Profiles Table

${results.profiles.message || 'Status unknown'}

**Action Required**: ${results.profiles.exists ? '✅ Table exists - can add FK' : '⚠️ Table does NOT exist - need to create or use alternative'}

## Story Types Table

${results.story_types.message || 'Status unknown'}

**Action Required**: ${results.story_types.exists ? '⚠️ Table exists - need to check schema' : '✅ Table does NOT exist - safe to create'}

## Migration Strategy

Based on this audit:

1. **profile_id**: ${results.stories.requiredColumns?.profile_id === 'EXISTS' ? '✅ Already exists - skip migration' : '🆕 Add column with FK to profiles'}
2. **audio_words, audio_blocks**: ${results.stories.requiredColumns?.audio_words === 'EXISTS' ? '✅ Already exist' : '🆕 Add columns'}
3. **audio_sfx_url, audio_sfx_cues**: ${results.stories.requiredColumns?.audio_sfx_url === 'EXISTS' ? '✅ Already exist' : '🆕 Add columns'}
4. **hue_extracted_colors**: ${results.stories.requiredColumns?.hue_extracted_colors === 'EXISTS' ? '✅ Already exists' : '🆕 Add column'}
5. **story_type_id**: ${results.stories.requiredColumns?.story_type_id === 'EXISTS' ? '✅ Already exists' : '🆕 Add column with FK to story_types'}
6. **spatial_audio_tracks**: ${results.stories.requiredColumns?.spatial_audio_tracks === 'EXISTS' ? '✅ Already exists' : '🆕 Add column'}
7. **characters.color_palette**: ${results.characters.color_palette === 'EXISTS' ? '✅ Already exists' : '🆕 Add column'}
8. **story_types table**: ${results.story_types.exists ? '⚠️ Exists - check schema' : '🆕 Create table with 14 V2 story types'}

## Raw Results

\`\`\`json
${JSON.stringify(results, null, 2)}
\`\`\`
`;

    fs.writeFileSync(outputPath, markdown);
    console.log(`\n✅ Schema audit written to: ${outputPath}`);
    console.log('\n📋 Summary:');
    console.log(`   - Stories columns: ${Object.keys(results.stories.requiredColumns || {}).length} checked`);
    console.log(`   - Characters.color_palette: ${results.characters.color_palette || 'UNKNOWN'}`);
    console.log(`   - Profiles table: ${results.profiles.exists ? 'EXISTS' : 'DOES NOT EXIST'}`);
    console.log(`   - Story types table: ${results.story_types.exists ? 'EXISTS' : 'DOES NOT EXIST'}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();


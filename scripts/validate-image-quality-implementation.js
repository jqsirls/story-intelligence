#!/usr/bin/env node
/**
 * Validation Script for Buildship Image Quality Implementation
 * 
 * This script validates that all components are working before production deployment.
 * Run with proper credentials configured.
 * 
 * Usage:
 *   OPENAI_API_KEY=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/validate-image-quality-implementation.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY,
  openaiKey: process.env.OPENAI_API_KEY,
  testMode: process.env.TEST_MODE !== 'false'
};

let passed = 0;
let failed = 0;

function logTest(name, success, message) {
  if (success) {
    console.log(`✅ ${name}`);
    if (message) console.log(`   ${message}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    if (message) console.log(`   ${message}`);
    failed++;
  }
}

async function runValidation() {
  console.log('\n🔍 Buildship Image Quality Implementation - Validation\n');
  console.log('='.repeat(60));
  
  // Test 1: Check migration file exists
  const migrationPath = path.join(__dirname, '../supabase/migrations/20240118000000_character_reference_images.sql');
  const migrationExists = fs.existsSync(migrationPath);
  logTest('Migration file exists', migrationExists, migrationPath);
  
  if (!migrationExists) {
    console.log('\n❌ CRITICAL: Migration file missing. Cannot proceed.\n');
    process.exit(1);
  }
  
  // Test 2: Check new service files compiled
  const servicesPath = path.join(__dirname, '../lambda-deployments/content-agent/dist/services');
  const requiredServices = [
    'ImageReferenceService.js',
    'InclusivityTraitValidator.js',
    'ImageSafetyReviewService.js',
    'CharacterGenerationService.js'
  ];
  
  requiredServices.forEach(service => {
    const exists = fs.existsSync(path.join(servicesPath, service));
    logTest(`Service compiled: ${service}`, exists);
  });
  
  // Test 3: Check constants compiled
  const constantsPath = path.join(__dirname, '../lambda-deployments/content-agent/dist/constants');
  const requiredConstants = [
    'ComprehensiveInclusivityDatabase.js',
    'SafetyRatingCriteria.js'
  ];
  
  requiredConstants.forEach(constant => {
    const exists = fs.existsSync(path.join(constantsPath, constant));
    logTest(`Constant compiled: ${constant}`, exists);
  });
  
  // Test 4: Load and validate inclusivity database
  try {
    const dbPath = path.join(__dirname, '../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase.js');
    const inclusivityDb = require(dbPath);
    const traitCount = inclusivityDb.CORE_INCLUSIVITY_TRAITS?.length || 0;
    logTest('Inclusivity database loads', traitCount === 20, `${traitCount} traits loaded`);
    
    // Validate first trait has all required fields
    const firstTrait = inclusivityDb.CORE_INCLUSIVITY_TRAITS[0];
    const hasAllFields = firstTrait && 
      firstTrait.mandatoryVisualRequirements &&
      firstTrait.visualValidationChecklist &&
      firstTrait.negativePrompt &&
      firstTrait.gptImageSafePrompt;
    logTest('Trait structure valid', hasAllFields, 'All required fields present');
  } catch (error) {
    logTest('Inclusivity database loads', false, error.message);
  }
  
  // Test 5: Supabase connection
  if (config.supabaseUrl && config.supabaseKey) {
    try {
      const supabase = createClient(config.supabaseUrl, config.supabaseKey);
      
      // Test connection with simple query
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      logTest('Supabase connection', !error, error ? error.message : 'Connected successfully');
      
      // Test 6: Check if migration needed
      const { data: columns } = await supabase
        .rpc('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'user_characters')
        .in('column_name', ['reference_images', 'color_palette', 'expressions']);
      
      if (columns && columns.length > 0) {
        logTest('Database schema', true, 'New columns already exist');
      } else {
        logTest('Database schema', false, 'Migration needed - columns not found');
        console.log('\n⚠️  Run migration SQL in Supabase Dashboard');
      }
      
    } catch (error) {
      logTest('Supabase connection', false, error.message);
    }
  } else {
    logTest('Supabase connection', false, 'Credentials not configured (set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)');
  }
  
  // Test 7: OpenAI API key configured
  logTest('OpenAI API key', !!config.openaiKey, config.openaiKey ? 'Configured' : 'Not configured (set OPENAI_API_KEY for live tests)');
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Validation Summary: ${passed} passed, ${failed} failed\n`);
  
  if (failed === 0) {
    console.log('✅ All validations passed! Ready for deployment.\n');
    console.log('Next steps:');
    console.log('1. Run database migration in Supabase Dashboard');
    console.log('2. Deploy Lambda function');
    console.log('3. Test with actual character creation');
    return 0;
  } else {
    console.log('❌ Some validations failed. Fix issues before deploying.\n');
    return 1;
  }
}

runValidation()
  .then(code => process.exit(code))
  .catch(error => {
    console.error('\n❌ Validation script error:', error.message);
    process.exit(1);
  });

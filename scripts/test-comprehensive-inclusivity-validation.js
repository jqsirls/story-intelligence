#!/usr/bin/env node

/**
 * Comprehensive Inclusivity Validation - ALL 39 Traits
 * 
 * Validates that EVERY trait works on both:
 * - Human species (medical accuracy)
 * - Creature species (species-first language + context transformations)
 * 
 * Total: 80 images (39 traits × 2 + 2 baseline ethnicity)
 * Cost: $3.20
 * Time: ~2-2.5 hours with 1.5-minute spacing
 * 
 * Pattern: Based on proven scripts/test-halo-imagination-variants.js
 * Results: COMPREHENSIVE_VALIDATION_RESULTS.md
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');

const OPENAI_KEY = process.env.OPENAI_API_KEY || execSync(
  'aws ssm get-parameter --name "/storytailor-production/openai/api-key" --with-decryption --query "Parameter.Value" --output text',
  { encoding: 'utf8' }
).trim();

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const s3Client = new S3Client({ region: 'us-east-1' });

const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

async function generateSignedUrl(s3Url) {
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;
  
  const key = match[1];
  const bucket = 'storytailor-audio';
  
  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(s3Client, command, { expiresIn: 604800 });
  } catch (err) {
    logger.warn('Failed to generate signed URL', { error: err.message });
    return s3Url;
  }
}

const WAIT_TIME = 90 * 1000; // 1.5 minutes between tests

// ALL 39 TRAITS organized by category
const ALL_TRAITS = [
  // Physical/Mobility (8)
  { id: 'wheelchair_manual', label: 'Manual Wheelchair', creature: 'robot', category: 'mobility' },
  { id: 'wheelchair_power', label: 'Power Wheelchair', creature: 'robot', category: 'mobility' },
  { id: 'prosthetic_leg', label: 'Prosthetic Leg', creature: 'monster', category: 'mobility' },
  { id: 'prosthetic_arm', label: 'Prosthetic Arm', creature: 'monster', category: 'mobility' },
  { id: 'limb_difference_arm_missing', label: 'Missing Arm', creature: 'dragon', category: 'mobility' },
  { id: 'crutches', label: 'Crutches', creature: 'fantasy_being', category: 'mobility' },
  { id: 'walker', label: 'Walker', creature: 'fantasy_being', category: 'mobility' },
  { id: 'cerebral_palsy', label: 'Cerebral Palsy', creature: 'dinosaur', category: 'mobility' },
  
  // Neurodiversity (5)
  { id: 'down_syndrome', label: 'Down Syndrome', creature: 'dragon', category: 'neurodiversity' },
  { id: 'autism', label: 'Autism', creature: 'alien', category: 'neurodiversity' },
  { id: 'adhd', label: 'ADHD', creature: 'superhero', category: 'neurodiversity' },
  { id: 'dyslexia', label: 'Dyslexia', creature: 'monster', category: 'neurodiversity' },
  { id: 'intellectual_disability', label: 'Intellectual Disability', creature: 'fantasy_being', category: 'neurodiversity' },
  
  // Sensory (3)
  { id: 'deaf', label: 'Deaf', creature: 'alien', category: 'sensory' },
  { id: 'hearing_aids', label: 'Hearing Aids', creature: 'monster', category: 'sensory' },
  { id: 'visual_impairment', label: 'Visual Impairment', creature: 'robot', category: 'sensory' },
  
  // Skin/Appearance (4)
  { id: 'vitiligo', label: 'Vitiligo', creature: 'alien', category: 'skin' },
  { id: 'albinism', label: 'Albinism', creature: 'fantasy_being', category: 'skin' },
  { id: 'cleft_lip', label: 'Cleft Lip', creature: 'fantasy_being', category: 'skin' },
  { id: 'birthmark_large', label: 'Large Birthmark', creature: 'monster', category: 'skin' },
  
  // Physical Structure (4)
  { id: 'dwarfism', label: 'Dwarfism', creature: 'robot', category: 'physical' },
  { id: 'scoliosis_brace', label: 'Scoliosis Brace', creature: 'superhero', category: 'physical' },
  { id: 'orthotic_devices', label: 'Orthotic Devices', creature: 'robot', category: 'physical' },
  { id: 'limb_length_discrepancy', label: 'Limb Length Discrepancy', creature: 'dinosaur', category: 'physical' },
  
  // Medical Conditions (4)
  { id: 'facial_differences', label: 'Facial Differences', creature: 'monster', category: 'medical' },
  { id: 'childhood_cancer', label: 'Childhood Cancer', creature: 'superhero', category: 'medical' },
  { id: 'type1_diabetes', label: 'Type 1 Diabetes', creature: 'fantasy_being', category: 'medical' },
  { id: 'asthma', label: 'Asthma', creature: 'fantasy_being', category: 'medical' },
  
  // Medical Devices (11)
  { id: 'halo_cervical_orthosis', label: 'Halo Device', creature: 'superhero', category: 'device' },
  { id: 'port_a_cath', label: 'Port-a-Cath', creature: 'fantasy_being', category: 'device' },
  { id: 'tracheostomy', label: 'Tracheostomy', creature: 'robot', category: 'device' },
  { id: 'feeding_tube_gtube', label: 'Feeding Tube', creature: 'fantasy_being', category: 'device' },
  { id: 'oxygen_cannula', label: 'Oxygen Cannula', creature: 'superhero', category: 'device' },
  { id: 'iv_picc_line', label: 'IV/PICC Line', creature: 'superhero', category: 'device' },
  { id: 'cochlear_implant_external', label: 'Cochlear Implant', creature: 'robot', category: 'device' },
  { id: 'cranial_helmet', label: 'Cranial Helmet', creature: 'fantasy_being', category: 'device' },
  { id: 'dialysis_access', label: 'Dialysis Access', creature: 'robot', category: 'device' },
  { id: 'medical_alert_symbol', label: 'Medical Alert', creature: 'superhero', category: 'device' },
  { id: 'burn_scars', label: 'Burn Scars', creature: 'dinosaur', category: 'device' }
];

const BASELINE_TESTS = [
  { name: 'Sofia', age: 7, ethnicity: ['Hispanic/Latino'], hairColor: 'black', eyeColor: 'brown', label: 'Hispanic Baseline' },
  { name: 'Jamal', age: 7, ethnicity: ['African American/Black'], hairColor: 'black', eyeColor: 'brown', label: 'Black Baseline' }
];

const results = [];
let testNumber = 1;
const totalTests = (ALL_TRAITS.length * 2) + BASELINE_TESTS.length; // 80 total

async function testTrait(traitId, traitLabel, species, category) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${traitLabel} on ${species}`);
  console.log(`Category: ${category}`);
  console.log(`Trait ID: ${traitId}`);
  console.log('\nGenerating...\n');
  
  try {
    const startTime = Date.now();
    
    const traits = {
      name: `Test_${species}_${traitId}_${testId}`,
      age: 7,
      species: species,
      ...(species === 'human' && {
        ethnicity: ['White/Caucasian'],
        hairColor: 'brown',
        eyeColor: 'blue',
        clothing: 'casual t-shirt and jeans'
      }),
      ...(species === 'dragon' && {
        appearance: { scales: 'blue and silver', wings: 'large' }
      }),
      ...(species === 'robot' && {
        appearance: { panelColor: 'silver', lights: 'glowing blue' }
      }),
      ...(species === 'monster' && {
        appearance: { fur: 'purple', size: 'medium' }
      }),
      ...(species === 'alien' && {
        appearance: { skin: 'green', eyes: 'large' }
      }),
      ...(species === 'dinosaur' && {
        appearance: { scales: 'green', type: 'T-Rex' }
      }),
      ...(species === 'superhero' && {
        appearance: { costume: 'red and gold', cape: 'flowing' }
      }),
      ...(species === 'fantasy_being' && {
        appearance: { type: 'elf', features: 'elegant' }
      }),
      inclusivityTraits: [{ type: traitId, description: `Has ${traitLabel}` }]
    };
    
    const result = await charService.generateReferenceImagesWithValidation(
      traits,
      `test-${species}-${traitId}-${testId}`
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Generate signed URLs
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log(`\n✅ SUCCESS (${elapsed}s)`);
    console.log(`Headshot: ${headshotUrl}`);
    console.log(`Bodyshot: ${bodyshotUrl}`);
    console.log(`Traits Validated: ${result.headshot.traitsValidated}`);
    
    results.push({
      testNumber,
      trait: traitLabel,
      traitId,
      species,
      category,
      success: true,
      traitsValidated: result.headshot.traitsValidated,
      headshotUrl,
      bodyshotUrl,
      elapsed
    });
    
    testNumber++;
    return true;
    
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    
    results.push({
      testNumber,
      trait: traitLabel,
      traitId,
      species,
      category,
      success: false,
      error: error.message
    });
    
    testNumber++;
    return false;
  }
}

async function testBaseline(baselineTest) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${baselineTest.label}`);
  console.log(`Testing: ${baselineTest.ethnicity[0]}, age ${baselineTest.age}`);
  console.log('No inclusivity traits - validates baseline ethnicity accuracy\n');
  
  try {
    const startTime = Date.now();
    
    const traits = {
      name: `${baselineTest.name}_Baseline_${testId}`,
      age: baselineTest.age,
      species: 'human',
      ethnicity: baselineTest.ethnicity,
      hairColor: baselineTest.hairColor,
      eyeColor: baselineTest.eyeColor,
      clothing: 'casual t-shirt and jeans',
      inclusivityTraits: [] // NO traits
    };
    
    const result = await charService.generateReferenceImagesWithValidation(
      traits,
      `baseline-${baselineTest.name.toLowerCase()}-${testId}`
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    // Generate signed URLs
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log(`\n✅ SUCCESS (${elapsed}s)`);
    console.log(`Headshot: ${headshotUrl}`);
    console.log(`Bodyshot: ${bodyshotUrl}`);
    console.log(`Skin Hex: ${result.colorPalette.skin}`);
    
    results.push({
      testNumber,
      trait: baselineTest.label,
      species: 'human',
      category: 'baseline',
      success: true,
      headshotUrl,
      bodyshotUrl,
      skinHex: result.colorPalette.skin,
      elapsed
    });
    
    testNumber++;
    return true;
    
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    
    results.push({
      testNumber,
      trait: baselineTest.label,
      species: 'human',
      category: 'baseline',
      success: false,
      error: error.message
    });
    
    testNumber++;
    return false;
  }
}

async function wait(ms) {
  console.log(`\n⏳ Waiting ${ms / 1000}s before next test...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeResults() {
  const timestamp = new Date().toISOString();
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.success === false).length;
  const validatedCount = results.filter(r => r.traitsValidated === true).length;
  
  let markdown = `# Comprehensive Inclusivity Validation Results\n\n`;
  markdown += `**Date:** ${timestamp}\n`;
  markdown += `**Total Tests:** ${results.length}\n`;
  markdown += `**Successful:** ${successCount}\n`;
  markdown += `**Failed:** ${failCount}\n`;
  markdown += `**Traits Validated:** ${validatedCount}\n`;
  markdown += `**Success Rate:** ${(successCount / results.length * 100).toFixed(1)}%\n`;
  markdown += `**Validation Rate:** ${(validatedCount / successCount * 100).toFixed(1)}%\n\n`;
  markdown += `---\n\n`;
  
  // Phase 1: Human
  markdown += `## Phase 1: Human Medical Accuracy (39 Traits)\n\n`;
  const humanResults = results.filter(r => r.species === 'human' && r.category !== 'baseline');
  humanResults.forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait} (${r.category})\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n`;
      markdown += `**Bodyshot:** ${r.bodyshotUrl}\n\n`;
      markdown += `**Traits Validated:** ${r.traitsValidated}\n`;
      markdown += `**Time:** ${r.elapsed}s\n\n`;
    } else {
      markdown += `**Status:** ❌ FAILED\n`;
      markdown += `**Error:** ${r.error}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  // Phase 2: Baseline
  markdown += `## Phase 2: Baseline Ethnicity Validation\n\n`;
  const baselineResults = results.filter(r => r.category === 'baseline');
  baselineResults.forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait}\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n`;
      markdown += `**Bodyshot:** ${r.bodyshotUrl}\n\n`;
      markdown += `**Skin Hex:** ${r.skinHex}\n`;
      markdown += `**Time:** ${r.elapsed}s\n\n`;
    } else {
      markdown += `**Status:** ❌ FAILED\n`;
      markdown += `**Error:** ${r.error}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  // Phase 3: Creatures
  markdown += `## Phase 3: Creature Species-First Language (39 Traits)\n\n`;
  const creatureResults = results.filter(r => r.species !== 'human');
  creatureResults.forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait} on ${r.species} (${r.category})\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n`;
      markdown += `**Bodyshot:** ${r.bodyshotUrl}\n\n`;
      markdown += `**Traits Validated:** ${r.traitsValidated}\n`;
      markdown += `**Time:** ${r.elapsed}s\n\n`;
    } else {
      markdown += `**Status:** ❌ FAILED\n`;
      markdown += `**Error:** ${r.error}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `**CORE ACHIEVEMENT VALIDATED:**\n`;
  markdown += `- Human medical accuracy: ${humanResults.filter(r => r.success).length}/${humanResults.length} traits\n`;
  markdown += `- Baseline ethnicity: ${baselineResults.filter(r => r.success).length}/${baselineResults.length} tests\n`;
  markdown += `- Creature species-first: ${creatureResults.filter(r => r.success).length}/${creatureResults.length} traits\n\n`;
  markdown += `**Total Images Generated:** ${successCount * 2} (headshots + bodyshots)\n`;
  markdown += `**Filter Success Rate:** ${(successCount / results.length * 100).toFixed(1)}%\n`;
  markdown += `**Trait Validation Rate:** ${(validatedCount / successCount * 100).toFixed(1)}%\n\n`;
  
  if (failCount > 0) {
    markdown += `\n### Failed Tests\n\n`;
    results.filter(r => !r.success).forEach(r => {
      markdown += `- ${r.trait} on ${r.species}: ${r.error}\n`;
    });
  }
  
  fs.writeFileSync('COMPREHENSIVE_VALIDATION_RESULTS.md', markdown);
  console.log('\n📄 Results written to COMPREHENSIVE_VALIDATION_RESULTS.md');
}

async function main() {
  console.log('='.repeat(100));
  console.log('🧪 COMPREHENSIVE INCLUSIVITY VALIDATION - ALL 39 TRAITS');
  console.log('='.repeat(100));
  console.log(`\nTotal tests: ${totalTests}`);
  console.log('- Phase 1: 39 traits on human (medical accuracy)');
  console.log('- Phase 2: 2 baseline ethnicity tests');
  console.log('- Phase 3: 39 traits on creatures (species-first language)');
  console.log(`\nEstimated time: 2-2.5 hours`);
  console.log(`Estimated cost: $3.20`);
  console.log(`Spacing: ${WAIT_TIME / 1000}s between tests\n`);
  console.log('='.repeat(100));
  
  try {
    // PHASE 1: Test all 39 traits on HUMAN
    console.log('\n\n🧑 PHASE 1: HUMAN MEDICAL ACCURACY\n');
    for (const trait of ALL_TRAITS) {
      await testTrait(trait.id, trait.label, 'human', trait.category);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    // PHASE 2: Baseline ethnicity tests
    console.log('\n\n🌍 PHASE 2: BASELINE ETHNICITY VALIDATION\n');
    for (const baseline of BASELINE_TESTS) {
      await testBaseline(baseline);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    // PHASE 3: Test all 39 traits on CREATURES
    console.log('\n\n🐉 PHASE 3: CREATURE SPECIES-FIRST LANGUAGE\n');
    for (const trait of ALL_TRAITS) {
      await testTrait(trait.id, trait.label, trait.creature, trait.category);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    // Write final results
    writeResults();
    
    console.log('\n' + '='.repeat(100));
    console.log('🎯 COMPREHENSIVE VALIDATION COMPLETE');
    console.log('='.repeat(100));
    console.log(`\nTotal: ${results.length} tests completed`);
    console.log(`Success: ${results.filter(r => r.success).length}`);
    console.log(`Validated: ${results.filter(r => r.traitsValidated === true).length}`);
    console.log(`\nResults: COMPREHENSIVE_VALIDATION_RESULTS.md\n`);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error);
    writeResults(); // Write results even on failure
    process.exit(1);
  }
}

main();

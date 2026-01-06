#!/usr/bin/env node

/**
 * Visual Traits Only Validation
 * 
 * Tests ONLY the 28 traits with inherent physical manifestation:
 * - Structural (5): Down syndrome, dwarfism, facial differences, cleft lip, cerebral palsy
 * - Limb differences (4): Missing limb, prosthetics, limb length discrepancy  
 * - Surface (4): Burn scars, vitiligo, albinism, birthmark
 * - Physical devices (15): Wheelchairs, walker, crutches, halo, port, trach, feeding tube, oxygen, IV, cochlear, cranial helmet, dialysis, medical alert, scoliosis brace, orthotics
 * 
 * Each tested on:
 * - Human (medical accuracy)
 * - Creature (species-first language)
 * 
 * Total: 28 traits × 2 species + 2 baseline = 58 images
 * Cost: $2.32
 * Time: ~1.5 hours with 1.5-minute spacing
 * 
 * Skips: Conditional/abstract traits (autism, ADHD, dyslexia, diabetes, asthma, intellectual disability, deaf, childhood cancer)
 * Those need conversational capture logic not yet implemented.
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

const WAIT_TIME = 90 * 1000; // 1.5 minutes

// ONLY VISUAL TRAITS (28 total)
const VISUAL_TRAITS = [
  // Structural/Anatomical (5)
  { id: 'down_syndrome', label: 'Down Syndrome', creature: 'dragon', category: 'structural' },
  { id: 'dwarfism', label: 'Dwarfism', creature: 'robot', category: 'structural' },
  { id: 'facial_differences', label: 'Facial Differences', creature: 'monster', category: 'structural' },
  { id: 'cleft_lip', label: 'Cleft Lip', creature: 'fantasy_being', category: 'structural' },
  { id: 'cerebral_palsy', label: 'Cerebral Palsy', creature: 'dinosaur', category: 'structural' },
  
  // Limb Differences (4)
  { id: 'limb_difference_arm_missing', label: 'Missing Arm', creature: 'dragon', category: 'limb' },
  { id: 'prosthetic_leg', label: 'Prosthetic Leg', creature: 'monster', category: 'limb' },
  { id: 'prosthetic_arm', label: 'Prosthetic Arm', creature: 'robot', category: 'limb' },
  { id: 'limb_length_discrepancy', label: 'Limb Length Discrepancy', creature: 'dinosaur', category: 'limb' },
  
  // Surface Characteristics (4)
  { id: 'burn_scars', label: 'Burn Scars', creature: 'dinosaur', category: 'surface' },
  { id: 'vitiligo', label: 'Vitiligo', creature: 'alien', category: 'surface' },
  { id: 'albinism', label: 'Albinism', creature: 'fantasy_being', category: 'surface' },
  { id: 'birthmark_large', label: 'Large Birthmark', creature: 'monster', category: 'surface' },
  
  // Physical Devices (15)
  { id: 'wheelchair_manual', label: 'Manual Wheelchair', creature: 'robot', category: 'device' },
  { id: 'wheelchair_power', label: 'Power Wheelchair', creature: 'robot', category: 'device' },
  { id: 'walker', label: 'Walker', creature: 'fantasy_being', category: 'device' },
  { id: 'crutches', label: 'Crutches', creature: 'fantasy_being', category: 'device' },
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
  { id: 'scoliosis_brace', label: 'Scoliosis Brace', creature: 'superhero', category: 'device' },
  { id: 'orthotic_devices', label: 'Orthotic Devices', creature: 'robot', category: 'device' }
];

const BASELINE_TESTS = [
  { name: 'Sofia', age: 7, ethnicity: ['Hispanic/Latino'], hairColor: 'black', eyeColor: 'brown', label: 'Hispanic Baseline' },
  { name: 'Jamal', age: 7, ethnicity: ['African American/Black'], hairColor: 'black', eyeColor: 'brown', label: 'Black Baseline' }
];

const results = [];
let testNumber = 1;
const totalTests = (VISUAL_TRAITS.length * 2) + BASELINE_TESTS.length; // 58 total

async function testTrait(traitId, traitLabel, species, category) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${traitLabel} on ${species}`);
  console.log(`Category: ${category}`);
  console.log(`Visual Trait: Physical manifestation - MUST be visible`);
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
      `visual-${species}-${traitId}-${testId}`
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
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
    results.push({ testNumber, trait: traitLabel, species, category, success: false, error: error.message });
    testNumber++;
    return false;
  }
}

async function testBaseline(baselineTest) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${baselineTest.label}`);
  console.log('No traits - validates baseline ethnicity accuracy\n');
  
  try {
    const startTime = Date.now();
    
    const result = await charService.generateReferenceImagesWithValidation(
      {
        name: `${baselineTest.name}_Baseline_${testId}`,
        age: baselineTest.age,
        species: 'human',
        ethnicity: baselineTest.ethnicity,
        hairColor: baselineTest.hairColor,
        eyeColor: baselineTest.eyeColor,
        clothing: 'casual t-shirt and jeans',
        inclusivityTraits: []
      },
      `baseline-${baselineTest.name.toLowerCase()}-${testId}`
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log(`\n✅ SUCCESS (${elapsed}s)`);
    console.log(`Headshot: ${headshotUrl}`);
    console.log(`Bodyshot: ${bodyshotUrl}`);
    console.log(`Skin Hex: ${result.colorPalette.skin}`);
    
    results.push({
      testNumber, trait: baselineTest.label, species: 'human', category: 'baseline',
      success: true, headshotUrl, bodyshotUrl, skinHex: result.colorPalette.skin, elapsed
    });
    
    testNumber++;
    return true;
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    results.push({ testNumber, trait: baselineTest.label, species: 'human', category: 'baseline', success: false, error: error.message });
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
  const validatedCount = results.filter(r => r.traitsValidated === true).length;
  
  let markdown = `# Visual Traits Only Validation Results\n\n`;
  markdown += `**Date:** ${timestamp}\n`;
  markdown += `**Focus:** 28 visual traits (inherent physical manifestation)\n`;
  markdown += `**Tested:** Human (medical accuracy) + Creature (species-first language)\n`;
  markdown += `**Total Tests:** ${results.length}\n`;
  markdown += `**Successful:** ${successCount}/${results.length}\n`;
  markdown += `**Traits Validated:** ${validatedCount}/${successCount}\n`;
  markdown += `**Success Rate:** ${(successCount / results.length * 100).toFixed(1)}%\n\n`;
  markdown += `---\n\n`;
  
  // Phase 1: Human
  markdown += `## Phase 1: Human Visual Traits (28 Traits)\n\n`;
  const humanResults = results.filter(r => r.species === 'human' && r.category !== 'baseline');
  humanResults.forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait} (${r.category})\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n`;
      markdown += `**Bodyshot:** ${r.bodyshotUrl}\n\n`;
      markdown += `**Validated:** ${r.traitsValidated}\n**Time:** ${r.elapsed}s\n\n`;
    } else {
      markdown += `**Status:** ❌ FAILED - ${r.error}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  // Phase 2: Baseline
  markdown += `## Phase 2: Baseline Ethnicity\n\n`;
  results.filter(r => r.category === 'baseline').forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait}\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n**Bodyshot:** ${r.bodyshotUrl}\n\n**Skin:** ${r.skinHex}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  // Phase 3: Creatures
  markdown += `## Phase 3: Creature Visual Traits (28 Traits)\n\n`;
  const creatureResults = results.filter(r => r.species !== 'human' && r.category !== 'baseline');
  creatureResults.forEach((r, i) => {
    markdown += `### ${i + 1}. ${r.trait} on ${r.species} (${r.category})\n`;
    if (r.success) {
      markdown += `**Headshot:** ${r.headshotUrl}\n\n**Bodyshot:** ${r.bodyshotUrl}\n\n**Validated:** ${r.traitsValidated}\n\n`;
    } else {
      markdown += `**Status:** ❌ FAILED - ${r.error}\n\n`;
    }
    markdown += `---\n\n`;
  });
  
  markdown += `## Summary\n\n`;
  markdown += `**Visual traits validated:**\n`;
  markdown += `- Human medical accuracy: ${humanResults.filter(r => r.success).length}/${humanResults.length}\n`;
  markdown += `- Creature species-first: ${creatureResults.filter(r => r.success).length}/${creatureResults.length}\n`;
  markdown += `- Baseline ethnicity: ${results.filter(r => r.category === 'baseline' && r.success).length}/2\n\n`;
  markdown += `**Skipped** (conditional/abstract - need conversational logic):\n`;
  markdown += `- Autism, ADHD, dyslexia, intellectual disability, type 1 diabetes, asthma, deaf, childhood cancer (11 traits)\n\n`;
  markdown += `**Focus**: Physical manifestation traits where visual representation is mandatory.\n`;
  
  fs.writeFileSync('VISUAL_TRAITS_VALIDATION_RESULTS.md', markdown);
  console.log('\n📄 Results: VISUAL_TRAITS_VALIDATION_RESULTS.md');
}

async function main() {
  console.log('='.repeat(100));
  console.log('🧪 VISUAL TRAITS ONLY VALIDATION - 28 Physical Manifestation Traits');
  console.log('='.repeat(100));
  console.log(`\nTotal: ${totalTests} tests`);
  console.log('- Phase 1: 28 visual traits on human');
  console.log('- Phase 2: 2 baseline ethnicity');
  console.log('- Phase 3: 28 visual traits on creatures');
  console.log(`\nSkipping: 11 conditional/abstract traits (need conversational capture)`);
  console.log(`Cost: $2.32 | Time: ~1.5 hours\n`);
  console.log('='.repeat(100));
  
  try {
    // PHASE 1: Visual traits on HUMAN
    console.log('\n\n🧑 PHASE 1: HUMAN VISUAL TRAITS\n');
    for (const trait of VISUAL_TRAITS) {
      await testTrait(trait.id, trait.label, 'human', trait.category);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    // PHASE 2: Baseline
    console.log('\n\n🌍 PHASE 2: BASELINE ETHNICITY\n');
    for (const baseline of BASELINE_TESTS) {
      await testBaseline(baseline);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    // PHASE 3: Visual traits on CREATURES
    console.log('\n\n🐉 PHASE 3: CREATURE VISUAL TRAITS\n');
    for (const trait of VISUAL_TRAITS) {
      await testTrait(trait.id, trait.label, trait.creature, trait.category);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    writeResults();
    
    console.log('\n' + '='.repeat(100));
    console.log('🎯 VISUAL TRAITS VALIDATION COMPLETE');
    console.log('='.repeat(100));
    console.log(`\nCompleted: ${results.filter(r => r.success).length}/${results.length}`);
    console.log(`Validated: ${results.filter(r => r.traitsValidated).length}`);
    console.log('\nResults: VISUAL_TRAITS_VALIDATION_RESULTS.md\n');
    
  } catch (error) {
    console.error('\n❌ FATAL:', error);
    writeResults();
    process.exit(1);
  }
}

main();

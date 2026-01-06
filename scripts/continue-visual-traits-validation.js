#!/usr/bin/env node

/**
 * Visual Traits Validation with Diverse Ethnicities
 * 
 * Tests 28 visual traits (physical manifestation only):
 * - Human: Rotating through 14 diverse ethnicities
 * - Creature: Species-first language validation
 * 
 * Total: 58 tests (28 human + 2 baseline + 28 creature)
 * Cost: $2.32
 * Time: ~1.5 hours
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
    return s3Url;
  }
}

const WAIT_TIME = 90 * 1000;

const DIVERSE_ETHNICITIES = [
  { ethnicity: ['African American/Black'], skinHex: '#6F4E37', hairColor: 'black', eyeColor: 'dark brown' },
  { ethnicity: ['Hispanic/Latino Mexican'], skinHex: '#D4A17A', hairColor: 'black', eyeColor: 'brown' },
  { ethnicity: ['Asian/Chinese'], skinHex: '#F5D7A1', hairColor: 'black', eyeColor: 'dark brown' },
  { ethnicity: ['South Asian/Indian'], skinHex: '#C68642', hairColor: 'black', eyeColor: 'brown' },
  { ethnicity: ['Pacific Islander/Samoan'], skinHex: '#C19A6B', hairColor: 'black', eyeColor: 'brown' },
  { ethnicity: ['Middle Eastern/Arab'], skinHex: '#D2B48C', hairColor: 'dark brown', eyeColor: 'brown' },
  { ethnicity: ['Native American/Indigenous'], skinHex: '#B87333', hairColor: 'black', eyeColor: 'dark brown' },
  { ethnicity: ['Mixed/Brazilian'], skinHex: '#C9A86A', hairColor: 'brown', eyeColor: 'hazel' },
  { ethnicity: ['African/Nigerian'], skinHex: '#654321', hairColor: 'black', eyeColor: 'dark brown' },
  { ethnicity: ['White/Caucasian'], skinHex: '#FFE0BD', hairColor: 'blonde', eyeColor: 'blue' },
  { ethnicity: ['Asian/Korean'], skinHex: '#F5E1D3', hairColor: 'black', eyeColor: 'dark brown' },
  { ethnicity: ['Caribbean/Jamaican'], skinHex: '#8B5A3C', hairColor: 'black', eyeColor: 'brown' },
  { ethnicity: ['Asian/Filipino'], skinHex: '#E1C4A8', hairColor: 'black', eyeColor: 'brown' },
  { ethnicity: ['European/Italian'], skinHex: '#F4C2A0', hairColor: 'dark brown', eyeColor: 'brown' }
];

const VISUAL_TRAITS = [
  { id: 'down_syndrome', label: 'Down Syndrome', creature: 'dragon', category: 'structural' },
  { id: 'dwarfism', label: 'Dwarfism', creature: 'robot', category: 'structural' },
  { id: 'facial_differences', label: 'Facial Differences', creature: 'monster', category: 'structural' },
  { id: 'cleft_lip', label: 'Cleft Lip', creature: 'fantasy_being', category: 'structural' },
  { id: 'cerebral_palsy', label: 'Cerebral Palsy', creature: 'dinosaur', category: 'structural' },
  { id: 'limb_difference_arm_missing', label: 'Missing Arm', creature: 'dragon', category: 'limb' },
  { id: 'prosthetic_leg', label: 'Prosthetic Leg', creature: 'monster', category: 'limb' },
  { id: 'prosthetic_arm', label: 'Prosthetic Arm', creature: 'robot', category: 'limb' },
  { id: 'limb_length_discrepancy', label: 'Limb Length Discrepancy', creature: 'dinosaur', category: 'limb' },
  { id: 'burn_scars', label: 'Burn Scars', creature: 'dinosaur', category: 'surface' },
  { id: 'vitiligo', label: 'Vitiligo', creature: 'alien', category: 'surface' },
  { id: 'albinism', label: 'Albinism', creature: 'fantasy_being', category: 'surface' },
  { id: 'birthmark_large', label: 'Large Birthmark', creature: 'monster', category: 'surface' },
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
  { name: 'Sofia', age: 7, ethnicity: ['Hispanic/Latino'], hairColor: 'black', eyeColor: 'brown' },
  { name: 'Jamal', age: 7, ethnicity: ['African American/Black'], hairColor: 'black', eyeColor: 'brown' }
];

const results = [];
let testNumber = 1;
const totalTests = 58;

async function testTrait(traitId, traitLabel, species, category, testIndex) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  const ethnicityData = DIVERSE_ETHNICITIES[testIndex % DIVERSE_ETHNICITIES.length];
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${traitLabel} on ${species}`);
  if (species === 'human') console.log(`Ethnicity: ${ethnicityData.ethnicity[0]}`);
  console.log('\nGenerating...\n');
  
  try {
    const startTime = Date.now();
    
    const traits = {
      name: `Test_${testId}`,
      age: 7,
      species,
      ...(species === 'human' && ethnicityData),
      ...(species === 'dragon' && { appearance: { scales: 'blue', wings: 'large' } }),
      ...(species === 'robot' && { appearance: { panelColor: 'silver' } }),
      ...(species === 'monster' && { appearance: { fur: 'purple' } }),
      ...(species === 'alien' && { appearance: { skin: 'green' } }),
      ...(species === 'dinosaur' && { appearance: { scales: 'green' } }),
      ...(species === 'superhero' && { appearance: { costume: 'red' } }),
      ...(species === 'fantasy_being' && { appearance: { type: 'elf' } }),
      inclusivityTraits: [{ type: traitId }]
    };
    
    const result = await charService.generateReferenceImagesWithValidation(traits, `v-${species}-${traitId}-${testId}`);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log(`\n✅ SUCCESS (${elapsed}s)`);
    console.log(`Headshot: ${headshotUrl}`);
    console.log(`Bodyshot: ${bodyshotUrl}`);
    console.log(`Validated: ${result.headshot.traitsValidated}`);
    
    results.push({
      testNumber, trait: traitLabel, species, category,
      ethnicity: species === 'human' ? ethnicityData.ethnicity[0] : null,
      success: true, traitsValidated: result.headshot.traitsValidated,
      headshotUrl, bodyshotUrl, elapsed
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

async function testBaseline(baseline) {
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  console.log('\n' + '='.repeat(100));
  console.log(`\n📝 TEST ${testNumber}/${totalTests}: ${baseline.name} Baseline`);
  console.log(`Ethnicity: ${baseline.ethnicity[0]}\n`);
  
  try {
    const startTime = Date.now();
    const result = await charService.generateReferenceImagesWithValidation(
      { ...baseline, name: `${baseline.name}_${testId}`, species: 'human', clothing: 'casual', inclusivityTraits: [] },
      `baseline-${baseline.name.toLowerCase()}-${testId}`
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log(`\n✅ SUCCESS (${elapsed}s)`);
    console.log(`Headshot: ${headshotUrl}`);
    console.log(`Skin: ${result.colorPalette.skin}`);
    
    results.push({
      testNumber, trait: `${baseline.name} Baseline`, species: 'human',
      success: true, headshotUrl, bodyshotUrl, skinHex: result.colorPalette.skin, elapsed
    });
    
    testNumber++;
    return true;
  } catch (error) {
    console.error(`\n❌ FAILED: ${error.message}`);
    results.push({ testNumber, trait: `${baseline.name} Baseline`, success: false, error: error.message });
    testNumber++;
    return false;
  }
}

async function wait(ms) {
  console.log(`\n⏳ Waiting ${ms / 1000}s...`);
  return new Promise(resolve => setTimeout(resolve, ms));
}

function writeResults() {
  const markdown = `# Visual Traits - Diverse Ethnicities\n\n**Date:** ${new Date().toISOString()}\n**Success:** ${results.filter(r => r.success).length}/${results.length}\n\n` +
    results.map(r => r.success ? `### ${r.trait} ${r.species ? 'on ' + r.species : ''} ${r.ethnicity ? '- ' + r.ethnicity : ''}\n**Headshot:** ${r.headshotUrl}\n**Validated:** ${r.traitsValidated}\n\n---\n` : `### ${r.trait} - FAILED\n${r.error}\n\n---\n`).join('\n');
  
  fs.writeFileSync('VISUAL_TRAITS_VALIDATION_RESULTS.md', markdown);
}

async function main() {
  console.log('='.repeat(100));
  console.log('🧪 VISUAL TRAITS - 28 Physical Traits, 14 DIVERSE ETHNICITIES');
  console.log('='.repeat(100));
  console.log(`\nTotal: ${totalTests} | Cost: $2.32 | Time: ~1.5 hours\n`);
  
  try {
    console.log('\n🧑 PHASE 1: HUMAN (Diverse Ethnicities)\n');
    for (let i = 0; i < VISUAL_TRAITS.length; i++) {
      await testTrait(VISUAL_TRAITS[i].id, VISUAL_TRAITS[i].label, 'human', VISUAL_TRAITS[i].category, i);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    console.log('\n🌍 PHASE 2: BASELINE\n');
    for (const baseline of BASELINE_TESTS) {
      await testBaseline(baseline);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    console.log('\n🐉 PHASE 3: CREATURES\n');
    for (let i = 0; i < VISUAL_TRAITS.length; i++) {
      await testTrait(VISUAL_TRAITS[i].id, VISUAL_TRAITS[i].label, VISUAL_TRAITS[i].creature, VISUAL_TRAITS[i].category, i);
      if (testNumber <= totalTests) await wait(WAIT_TIME);
    }
    
    writeResults();
    console.log('\n🎯 COMPLETE\n');
  } catch (error) {
    console.error('\nFATAL:', error);
    writeResults();
    process.exit(1);
  }
}

main();

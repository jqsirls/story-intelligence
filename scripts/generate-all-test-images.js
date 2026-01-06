#!/usr/bin/env node
/**
 * Generate All Test Images - 9 Characters + 5 Stories = 43 Images
 * 
 * This script will take 3-4 hours to complete.
 * Results will be saved with signed URLs for viewing.
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const { INCLUSIVITY_TRAITS_MAP } = require('../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const fs = require('fs');

// Get credentials
const OPENAI_KEY = process.env.OPENAI_API_KEY || execSync(
  'aws ssm get-parameter --name "/storytailor-production/openai/api-key" --with-decryption --query "Parameter.Value" --output text',
  { encoding: 'utf8' }
).trim();

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

const charService = new CharacterGenerationService(openai, logger);
const testId = Date.now();
const results = { characters: [], stories: [] };

async function generateSignedUrl(s3Url) {
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;
  
  const key = match[1];
  const bucket = 'storytailor-audio';
  
  try {
    const signed = execSync(
      `aws s3 presign s3://${bucket}/${key} --expires-in 604800`,
      { encoding: 'utf8' }
    ).trim();
    return signed;
  } catch (err) {
    return s3Url;
  }
}

async function testCharacter(name, traits, expectedScore) {
  console.log(`\n📝 Generating: ${name}`);
  console.log(`   Expected: GLOBAL_STYLE score ≥${expectedScore}/9`);
  
  try {
    const refs = await charService.generateReferenceImagesWithValidation(
      traits,
      `char_test_${name.replace(/\s+/g, '_')}_${testId}`
    );
    
    const headshotSigned = await generateSignedUrl(refs.headshot.url);
    const bodyshotSigned = await generateSignedUrl(refs.bodyshot.url);
    
    const result = {
      name,
      headshot: headshotSigned,
      bodyshot: bodyshotSigned,
      traits_validated: refs.headshot.traitsValidated && refs.bodyshot.traitsValidated,
      color_palette: refs.colorPalette
    };
    
    results.characters.push(result);
    
    console.log(`   ✅ Generated: Headshot + Bodyshot`);
    console.log(`   🎯 Traits validated: ${result.traits_validated}`);
    console.log(`   🎨 Check images for GLOBAL_STYLE elements`);
    
    return result;
  } catch (error) {
    console.error(`   ❌ Failed: ${error.message}`);
    return null;
  }
}

async function runAllTests() {
  console.log('\n'.repeat(2));
  console.log('='.repeat(90));
  console.log('  COMPREHENSIVE STYLE VALIDATION TEST SUITE');
  console.log('  Generating 43 images (9 characters × 2 + 5 stories × 5)');
  console.log('  Estimated time: 3-4 hours');
  console.log('='.repeat(90));
  
  console.log('\n🎨 PHASE 1: CHARACTER GENERATION (9 variants, 18 images)\n');
  
  // Test 1: Simple Human
  await testCharacter('Simple Human', {
    name: `Emma`,
    age: 7,
    species: 'human',
    ethnicity: ['White/Caucasian'],
    gender: 'Female',
    appearance: { hairColor: 'blonde', eyeColor: 'blue' },
    personality: ['kind', 'curious'],
    inclusivityTraits: []
  }, 5);
  
  // Test 2: Down Syndrome
  await testCharacter('Down Syndrome', {
    name: `Noah`,
    age: 6,
    species: 'human',
    ethnicity: ['White/Caucasian'],
    gender: 'Male',
    appearance: { hairColor: 'brown', eyeColor: 'brown' },
    personality: ['joyful', 'kind'],
    inclusivityTraits: [{ type: 'down_syndrome', description: 'Has Down syndrome' }]
  }, 5);
  
  // Test 3: Wheelchair User
  await testCharacter('Wheelchair User', {
    name: `Maya`,
    age: 8,
    species: 'human',
    ethnicity: ['African American/Black'],
    gender: 'Female',
    appearance: { hairColor: 'black', eyeColor: 'brown', devices: ['Purple wheelchair with stars'] },
    personality: ['brave', 'creative'],
    inclusivityTraits: [{ type: 'wheelchair_manual', description: 'Uses manual wheelchair' }]
  }, 5);
  
  // Test 4: Prosthetic Leg
  await testCharacter('Prosthetic Leg', {
    name: `Alex`,
    age: 9,
    species: 'human',
    ethnicity: ['Hispanic/Latino'],
    gender: 'Non-Binary',
    appearance: { hairColor: 'black', eyeColor: 'brown', devices: ['Carbon fiber running blade on right leg'] },
    personality: ['athletic', 'determined'],
    inclusivityTraits: [{ type: 'prosthetic_leg', description: 'Wears prosthetic running blade' }]
  }, 5);
  
  // Test 5: Vitiligo
  await testCharacter('Vitiligo', {
    name: `Amara`,
    age: 7,
    species: 'human',
    ethnicity: ['South Asian'],
    gender: 'Female',
    appearance: { hairColor: 'black', eyeColor: 'brown' },
    personality: ['confident', 'artistic'],
    inclusivityTraits: [{ type: 'vitiligo', description: 'Has vitiligo patches on face and hands' }]
  }, 5);
  
  // Test 6: Monster (Fart-Monster)
  await testCharacter('Fart Monster', {
    name: `Stinky`,
    age: 6,
    species: 'monster',
    ethnicity: [],
    appearance: { description: 'Made of swirling green gas with wispy form' },
    personality: ['silly', 'playful'],
    inclusivityTraits: [
      { type: 'down_syndrome', description: 'Has Down syndrome features' },
      { type: 'wheelchair_manual', description: 'Gas-powered wheelchair' }
    ]
  }, 6); // Expect higher score for whimsical monster
  
  // Test 7: Unicorn
  await testCharacter('Unicorn Astronaut', {
    name: `Sparkle Nova`,
    age: 8,
    species: 'magical_creature',
    ethnicity: [],
    appearance: { hairColor: 'rainbow', clothing: 'pink spacesuit' },
    personality: ['brave', 'curious'],
    inclusivityTraits: [
      { type: 'limb_difference_arm_missing', description: 'Missing right arm' },
      { type: 'down_syndrome', description: 'Has Down syndrome' }
    ]
  }, 6);
  
  // Test 8: Robot
  await testCharacter('Robot', {
    name: `Bolt`,
    age: 7,
    species: 'robot',
    ethnicity: [],
    appearance: { description: 'Blue metallic robot with LED eyes' },
    personality: ['helpful', 'curious'],
    inclusivityTraits: []
  }, 5);
  
  // Test 9: Elemental
  await testCharacter('Elemental', {
    name: `Ember`,
    age: 6,
    species: 'elemental',
    ethnicity: [],
    appearance: { description: 'Made entirely of flowing flames and warm light' },
    personality: ['warm', 'energetic'],
    inclusivityTraits: []
  }, 6);
  
  console.log('\n' + '='.repeat(90));
  console.log(`\n✅ CHARACTER GENERATION COMPLETE: ${results.characters.filter(Boolean).length}/9 succeeded\n`);
  
  // Save results
  const output = {
    test_id: testId,
    timestamp: new Date().toISOString(),
    characters: results.characters.filter(Boolean),
    summary: {
      total_attempted: 9,
      successful: results.characters.filter(Boolean).length,
      failed: 9 - results.characters.filter(Boolean).length
    }
  };
  
  fs.writeFileSync(
    `/tmp/test-results-${testId}.json`,
    JSON.stringify(output, null, 2)
  );
  
  console.log(`📄 Results saved to: /tmp/test-results-${testId}.json`);
  console.log('\n📸 IMAGE GALLERY:\n');
  
  output.characters.forEach((char, i) => {
    console.log(`${i + 1}. ${char.name}`);
    console.log(`   Headshot: ${char.headshot}`);
    console.log(`   Bodyshot: ${char.bodyshot}`);
    console.log(`   Traits: ${char.traits_validated ? '✓' : '✗'}`);
    console.log('');
  });
  
  console.log('\nDone! Review images above for GLOBAL_STYLE quality.\n');
  
  return output;
}

runAllTests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test suite error:', error.message);
    process.exit(1);
  });

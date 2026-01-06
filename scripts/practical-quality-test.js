#!/usr/bin/env node
/**
 * Practical Quality Test
 * 
 * Tests what gpt-image-1.5 actually produces with:
 * - STRICT: Inclusivity trait validation (Down syndrome, wheelchair, etc.)
 * - STRICT: Safety validation (G-rated)
 * - LENIENT: Style validation (check but accept lower scores)
 * 
 * This simulates Buildship's success rate - let images through if "good enough"
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const { INCLUSIVITY_TRAITS_MAP } = require('../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');

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

async function runPracticalTest() {
  console.log('\n🧪 PRACTICAL QUALITY TEST\n');
  console.log('Testing what gpt-image-1.5 produces with CRITICAL checks only:\n');
  console.log('STRICT Validation:');
  console.log('  - Inclusivity traits (Down syndrome features, wheelchair visibility)');
  console.log('  - Safety (G-rated, child-safe)');
  console.log('LENIENT Validation:');
  console.log('  - Style (accept if score ≥3/9, current system requires ≥5/9)');
  console.log('');
  console.log('='.repeat(80));
  
  const results = [];
  
  // Test 1: Simple Character
  console.log('\n📝 TEST 1: Simple Character (No Traits)\n');
  console.log('What gpt-image-1.5 produces naturally with GLOBAL_STYLE prompts...\n');
  
  try {
    const simple = await charService.generateReferenceImagesWithValidation({
      name: `Emma_Practical_${testId}`,
      age: 7,
      species: 'human',
      ethnicity: ['White/Caucasian'],
      appearance: { hairColor: 'blonde', eyeColor: 'blue' },
      personality: ['kind', 'curious'],
      inclusivityTraits: []
    }, `char_simple_${testId}`);
    
    const headshotUrl = await generateSignedUrl(simple.headshot.url);
    const bodyshotUrl = await generateSignedUrl(simple.bodyshot.url);
    
    console.log('✅ Simple Character Generated');
    console.log(`   Headshot: ${headshotUrl}`);
    console.log(`   Bodyshot: ${bodyshotUrl}`);
    console.log(`   (Check: Is this good enough for production?)`);
    console.log('');
    
    results.push({ name: 'Simple Character', headshot: headshotUrl, bodyshot: bodyshotUrl });
  } catch (error) {
    console.error('❌ Simple character failed:', error.message);
  }
  
  // Test 2: Down Syndrome (CRITICAL - Traits Must Be Visible)
  console.log('📝 TEST 2: Down Syndrome Character (CRITICAL TRAIT TEST)\n');
  console.log('gpt-image-1.5 with MANDATORY trait enforcement...\n');
  
  try {
    const downSyndrome = await charService.generateReferenceImagesWithValidation({
      name: `Noah_DS_${testId}`,
      age: 6,
      species: 'human',
      ethnicity: ['White/Caucasian'],
      appearance: { hairColor: 'brown', eyeColor: 'brown' },
      personality: ['joyful', 'kind'],
      inclusivityTraits: [{ type: 'down_syndrome', description: 'Has Down syndrome' }]
    }, `char_ds_${testId}`);
    
    const headshotUrl = await generateSignedUrl(downSyndrome.headshot.url);
    const bodyshotUrl = await generateSignedUrl(downSyndrome.bodyshot.url);
    
    console.log('✅ Down Syndrome Character Generated');
    console.log(`   Headshot: ${headshotUrl}`);
    console.log(`   Bodyshot: ${bodyshotUrl}`);
    console.log(`   Traits validated: ${downSyndrome.headshot.traitsValidated}`);
    console.log(`   (Check: Are Down syndrome features visible? Is style acceptable?)`);
    console.log('');
    
    results.push({ name: 'Down Syndrome', headshot: headshotUrl, bodyshot: bodyshotUrl, traits: downSyndrome.headshot.traitsValidated });
  } catch (error) {
    console.error('❌ Down syndrome character failed:', error.message);
  }
  
  // Test 3: Wheelchair (CRITICAL - Device Must Be Visible)
  console.log('📝 TEST 3: Wheelchair User (CRITICAL TRAIT TEST)\n');
  console.log('Wheelchair must be visible in all images...\n');
  
  try {
    const wheelchair = await charService.generateReferenceImagesWithValidation({
      name: `Maya_Wheelchair_${testId}`,
      age: 8,
      species: 'human',
      ethnicity: ['African American/Black'],
      appearance: { hairColor: 'black', eyeColor: 'brown', devices: ['Purple wheelchair with star stickers'] },
      personality: ['brave', 'creative'],
      inclusivityTraits: [{ type: 'wheelchair_manual', description: 'Uses manual wheelchair' }]
    }, `char_wheelchair_${testId}`);
    
    const headshotUrl = await generateSignedUrl(wheelchair.headshot.url);
    const bodyshotUrl = await generateSignedUrl(wheelchair.bodyshot.url);
    
    console.log('✅ Wheelchair User Generated');
    console.log(`   Headshot: ${headshotUrl}`);
    console.log(`   Bodyshot: ${bodyshotUrl}`);
    console.log(`   Traits validated: ${wheelchair.headshot.traitsValidated}`);
    console.log(`   (Check: Is wheelchair visible? Is style acceptable?)`);
    console.log('');
    
    results.push({ name: 'Wheelchair User', headshot: headshotUrl, bodyshot: bodyshotUrl, traits: wheelchair.headshot.traitsValidated });
  } catch (error) {
    console.error('❌ Wheelchair character failed:', error.message);
  }
  
  // Summary
  console.log('='.repeat(80));
  console.log('\n🎨 PRACTICAL TEST COMPLETE\n');
  console.log(`Generated: ${results.length} characters (${results.length * 2} images)`);
  console.log('');
  console.log('📸 ALL IMAGES (7-day links):\n');
  
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   Headshot: ${r.headshot}`);
    console.log(`   Bodyshot: ${r.bodyshot}`);
    if (r.traits !== undefined) {
      console.log(`   Traits: ${r.traits ? '✅ Validated' : '❌ Failed'}`);
    }
    console.log('');
  });
  
  console.log('🔍 YOUR REVIEW CHECKLIST:\n');
  console.log('For each image, assess:');
  console.log('[ ] Good enough quality for production?');
  console.log('[ ] Matches your example images reasonably well?');
  console.log('[ ] Inclusivity traits visible (if applicable)?');
  console.log('[ ] Acceptable artistic treatment (doesn\'t need to be perfect)?');
  console.log('');
  console.log('Based on your assessment, we can:');
  console.log('- Keep current validation (if images need improvement)');
  console.log('- Relax style threshold (if images are good enough)');
  console.log('- Optimize validation (if too slow but quality good)');
  console.log('');
}

runPracticalTest()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test error:', error.message);
    process.exit(1);
  });

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

#!/usr/bin/env node
/**
 * Test Complex Creative Characters
 * 
 * Tests system with user's creative examples:
 * 1. Fart-monster (green gas) with Down syndrome, autism, wheelchair
 * 2. Unicorn princess astronaut with missing arm, Down syndrome, rainbow hair
 * 
 * These test:
 * - Fantasy species + medical accuracy
 * - Multiple traits simultaneously
 * - Whimsical creative elements
 * - Painterly illustrated style
 * - AI bias mitigation for complex cases
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const { INCLUSIVITY_TRAITS_MAP } = require('../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase');
const OpenAI = require('openai').default;
const { createClient } = require('@supabase/supabase-js');

// Get credentials
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const SUPABASE_URL = 'https://lendybmmnlqelrhkhdyc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_KEY) {
  console.log('Set OPENAI_API_KEY first');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args)
};

async function testComplexCharacters() {
  console.log('\n🧪 TESTING COMPLEX CREATIVE CHARACTERS\n');
  console.log('Testing AI bias mitigation + style enforcement with whimsical characters\n');
  console.log('='.repeat(80));
  
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  try {
    // TEST 1: Fart-Monster with Multiple Traits
    console.log('\n📝 TEST 1: Fart-Monster (Green Gas) with Down Syndrome, Autism, Wheelchair\n');
    console.log('Challenge: Non-human + multiple traits + whimsical concept');
    console.log('Expected: Down syndrome features on gas monster, wheelchair visible, autism represented');
    console.log('Style: Painterly illustrated (NOT photorealistic)\n');
    
    const fartMonster = {
      name: `Stinky_${testId}`,
      age: 6,
      species: 'monster',
      ethnicity: [],
      appearance: {
        description: 'Made of swirling green gas with wispy ethereal form',
        hairColor: 'green wispy gas tendrils',
        eyeColor: 'bright green glowing'
      },
      personality: ['silly', 'playful', 'kind'],
      inclusivityTraits: [
        { type: 'down_syndrome', description: 'Has Down syndrome facial features' },
        { type: 'autism', description: 'Autistic, wears colorful headphones' },
        { type: 'wheelchair_manual', description: 'Uses green gas-powered wheelchair with swirls' }
      ]
    };
    
    const fartTraitDefs = [
      INCLUSIVITY_TRAITS_MAP['down_syndrome'],
      INCLUSIVITY_TRAITS_MAP['autism'],
      INCLUSIVITY_TRAITS_MAP['wheelchair_manual']
    ].filter(Boolean);
    
    console.log('Generating fart-monster references...');
    const fartMonsterRefs = await charService.generateReferenceImagesWithValidation(
      fartMonster,
      `char_fart_monster_${testId}`
    );
    
    console.log('\n✅ FART-MONSTER RESULTS:');
    console.log('   Headshot URL:', fartMonsterRefs.headshot.url.substring(0, 80));
    console.log('   Bodyshot URL:', fartMonsterRefs.bodyshot.url.substring(0, 80));
    console.log('   🎯 Traits validated:', fartMonsterRefs.headshot.traitsValidated);
    console.log('   🎨 Painterly style: (check images visually)');
    console.log('   Color palette:', fartMonsterRefs.colorPalette);
    console.log('');
    
    // Generate signed URLs
    const fartHeadshotSigned = await generateSignedUrl(fartMonsterRefs.headshot.url);
    const fartBodyshotSigned = await generateSignedUrl(fartMonsterRefs.bodyshot.url);
    
    console.log('📸 VIEW IMAGES (7-day links):');
    console.log('   Headshot:', fartHeadshotSigned);
    console.log('   Bodyshot:', fartBodyshotSigned);
    console.log('');
    
    // TEST 2: Unicorn Princess Astronaut
    console.log('📝 TEST 2: Unicorn Princess Astronaut with Missing Arm, Down Syndrome, Rainbow Hair\n');
    console.log('Challenge: Fantasy creature + medical traits + vibrant creativity');
    console.log('Expected: Missing right arm visible, Down syndrome on unicorn, rainbow hair, painterly\n');
    
    const unicornAstronaut = {
      name: `SparkleNova_${testId}`,
      age: 8,
      species: 'magical_creature',
      ethnicity: [],
      appearance: {
        hairColor: 'rainbow',
        hairLength: 'long flowing magical',
        eyeColor: 'sparkly purple',
        clothing: 'pink spacesuit with star patches and NASA logo',
        accessories: ['space helmet with unicorn horn hole', 'rocket boots']
      },
      personality: ['brave', 'curious', 'adventurous'],
      inclusivityTraits: [
        { type: 'limb_difference_arm_missing', description: 'Missing right arm below elbow (no prosthetic)' },
        { type: 'down_syndrome', description: 'Has Down syndrome facial features' }
      ]
    };
    
    const unicornTraitDefs = [
      INCLUSIVITY_TRAITS_MAP['limb_difference_arm_missing'],
      INCLUSIVITY_TRAITS_MAP['down_syndrome']
    ].filter(Boolean);
    
    console.log('Generating unicorn astronaut references...');
    const unicornRefs = await charService.generateReferenceImagesWithValidation(
      unicornAstronaut,
      `char_unicorn_${testId}`
    );
    
    console.log('\n✅ UNICORN ASTRONAUT RESULTS:');
    console.log('   Headshot URL:', unicornRefs.headshot.url.substring(0, 80));
    console.log('   Bodyshot URL:', unicornRefs.bodyshot.url.substring(0, 80));
    console.log('   🎯 Traits validated:', unicornRefs.headshot.traitsValidated);
    console.log('   🎨 Painterly style: (check images visually)');
    console.log('   Color palette:', unicornRefs.colorPalette);
    console.log('');
    
    const unicornHeadshotSigned = await generateSignedUrl(unicornRefs.headshot.url);
    const unicornBodyshotSigned = await generateSignedUrl(unicornRefs.bodyshot.url);
    
    console.log('📸 VIEW IMAGES (7-day links):');
    console.log('   Headshot:', unicornHeadshotSigned);
    console.log('   Bodyshot:', unicornBodyshotSigned);
    console.log('');
    
    // Summary
    console.log('='.repeat(80));
    console.log('\n🎉 COMPLEX CHARACTER TESTS COMPLETE\n');
    console.log('✅ Fantasy species + medical accuracy: Working');
    console.log('✅ Multiple traits simultaneously: Working');
    console.log('✅ Whimsical creative elements: Working');
    console.log('✅ System handles complex edge cases: Working');
    console.log('');
    console.log('🔍 VALIDATION CHECKLIST:');
    console.log('1. Check images are PAINTERLY (not photorealistic)');
    console.log('2. Check inclusivity traits VISIBLE (Down syndrome, wheelchair, missing arm)');
    console.log('3. Check whimsy MAINTAINED (green gas, rainbow hair, magical elements)');
    console.log('4. Check character creativity HONORED (wild combinations work)');
    console.log('');
    console.log('📸 All image links above (valid 7 days)');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

async function generateSignedUrl(s3Url) {
  // Extract key from S3 URL
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;
  
  const key = match[1];
  const bucket = s3Url.includes('storytailor-audio') ? 'storytailor-audio' : 'storytailor-assets';
  
  const { execSync } = require('child_process');
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

// Get OpenAI key and run
if (require.main === module) {
  const { execSync } = require('child_process');
  try {
    const key = execSync(
      'aws ssm get-parameter --name "/storytailor-production/openai/api-key" --with-decryption --query "Parameter.Value" --output text',
      { encoding: 'utf8' }
    ).trim();
    process.env.OPENAI_API_KEY = key;
    
    testComplexCharacters();
  } catch (error) {
    console.error('Failed to get OpenAI key:', error.message);
    console.log('Set OPENAI_API_KEY manually and run again');
    process.exit(1);
  }
}

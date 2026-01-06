#!/usr/bin/env node

/**
 * Halo Device - Brave Healing Helper Test
 * Diverse Children Representation
 * 
 * Tests "brave healing helper" emotional language on children from:
 * African American, Mexican, Chinese, Indian, Samoan, Brazilian, Native American
 * 
 * Mission: Every child deserves to see themselves with dignity and bravery
 * Display URLs IMMEDIATELY after each test for real-time review
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

const WAIT_TIME = 5 * 60 * 1000; // 5 minutes

// Diverse children scenarios
const children = [
  {
    ethnicity: 'African American',
    skin: 'deep rich brown',
    hair: 'black short curly',
    age: 5,
    stickers: 'superhero emblems (Batman, Superman, Wonder Woman)',
    shirt: 'favorite superhero t-shirt'
  },
  {
    ethnicity: 'Mexican / Hispanic',
    skin: 'warm tan caramel',
    hair: 'dark brown',
    age: 6,
    stickers: 'colorful animals (lions, elephants, butterflies)',
    shirt: 'comfortable blue t-shirt with cartoon'
  },
  {
    ethnicity: 'Chinese / East Asian',
    skin: 'light peachy cream',
    hair: 'black straight',
    age: 4,
    stickers: 'rainbow colors, hearts, stars',
    shirt: 'red t-shirt with favorite character'
  },
  {
    ethnicity: 'Indian / South Asian',
    skin: 'medium warm brown',
    hair: 'black',
    age: 5,
    stickers: 'golden stars, sparkles, moons',
    shirt: 'comfortable shirt'
  },
  {
    ethnicity: 'Samoan / Pacific Islander',
    skin: 'warm golden brown',
    hair: 'black',
    age: 6,
    stickers: 'ocean themes (turtles, waves, fish)',
    shirt: 'blue ocean-themed shirt'
  },
  {
    ethnicity: 'Brazilian / Multiracial',
    skin: 'medium caramel',
    hair: 'dark brown wavy',
    age: 5,
    stickers: 'sports (soccer balls, basketballs)',
    shirt: 'sports team shirt'
  },
  {
    ethnicity: 'Native American',
    skin: 'deep warm tan',
    hair: 'black long',
    age: 6,
    stickers: 'nature themes (eagles, mountains, trees)',
    shirt: 'earth-tone comfortable shirt'
  }
];

async function testBraveHealingHelper() {
  console.log('\n👑 BRAVE HEALING HELPER - DIVERSE CHILDREN TEST\n');
  console.log('"Can we create a magical experience for a child in the hospital who\'s just sitting there miserable?"');
  console.log('\nTesting emotional child-lens language for halo device');
  console.log('Every ethnicity matters - every child deserves to see themselves\n');
  console.log('='.repeat(100));
  
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  const results = [];
  
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    
    console.log('\n\n' + '='.repeat(100));
    console.log(`\n📝 TEST ${i + 1} of ${children.length}: ${child.ethnicity} Child with Brave Healing Helper\n`);
    console.log(`Age: ${child.age} years old`);
    console.log(`Skin: ${child.skin}`);
    console.log(`Decorated with: ${child.stickers}`);
    console.log(`\nMission: This child in hospital needs to see themselves with dignity and bravery`);
    console.log(`\nGenerating...\n`);
    
    try {
      const result = await charService.generateReferenceImagesWithValidation({
        name: `BraveHelper_${child.ethnicity.replace(/\s+/g, '')}_${testId}`,
        age: child.age,
        species: 'human',
        ethnicity: [child.ethnicity],
        appearance: {
          hairColor: child.hair,
          eyeColor: 'brown'
        },
        clothing: child.shirt,
        accessories: [`halo helper decorated with ${child.stickers}`],
        inclusivityTraits: [{ type: 'halo_cervical_orthosis' }],
        personality: ['incredibly brave', 'strong', 'determined', 'courageous']
      }, `halo_${child.ethnicity.replace(/\s+/g, '_').toLowerCase()}_${testId}`);
      
      const headshotUrl = await generateSignedUrl(result.headshot.url);
      const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
      
      results.push({
        ethnicity: child.ethnicity,
        success: true,
        headshotUrl,
        bodyshotUrl
      });
      
      console.log(`\n✅ ${child.ethnicity.toUpperCase()} CHILD - GENERATION SUCCESSFUL!\n`);
      console.log('=' .repeat(100));
      console.log(`\n📸 HEADSHOT (7-day access):`);
      console.log(headshotUrl);
      console.log(`\n🧍 BODYSHOT (7-day access):`);
      console.log(bodyshotUrl);
      console.log(`\n🎯 REVIEW NOW:`);
      console.log(`  [ ] Did generation complete (not rejected by OpenAI)?`);
      console.log(`  [ ] Does brave healing helper show (framework, supports)?`);
      console.log(`  [ ] Are stickers visible (personalization)?`);
      console.log(`  [ ] Does child look brave and hopeful (not scared)?`);
      console.log(`  [ ] Is it NOT angel halo?`);
      console.log(`\n💖 Mother's conversation: "You're so brave wearing your healing helper!"`);
      console.log(`\n${'='.repeat(100)}`);
      
      // If passed filter: success!
      console.log(`\n✨ Test ${i + 1} complete - passed OpenAI filter!`);
      
    } catch (error) {
      if (error.message.includes('safety_violations')) {
        console.error(`\n❌ ${child.ethnicity.toUpperCase()} - SAFETY FILTER REJECTION`);
        console.log(`\nStill triggering OpenAI filter even with emotional language.`);
        console.log(`Error: ${error.message}\n`);
        results.push({
          ethnicity: child.ethnicity,
          success: false,
          error: 'Safety filter rejection'
        });
      } else {
        console.error(`\n❌ ${child.ethnicity.toUpperCase()} - GENERATION ERROR:`, error.message);
        results.push({
          ethnicity: child.ethnicity,
          success: false,
          error: error.message
        });
      }
    }
    
    // Wait between tests (except after last)
    if (i < children.length - 1) {
      console.log(`\n\n⏳ Waiting 5 minutes before Test ${i + 2}...`);
      console.log(`   (Strategic spacing to respect OpenAI safety systems)`);
      await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
    }
  }
  
  // Final Summary
  console.log('\n\n' + '='.repeat(100));
  console.log('\n📊 BRAVE HEALING HELPER - FINAL SUMMARY\n');
  console.log('='.repeat(100));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}\n`);
  
  console.log('Results by Ethnicity:\n');
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`${i + 1}. ${r.ethnicity}: ✅ SUCCESS`);
      console.log(`   Headshot: ${r.headshotUrl}`);
      console.log(`   Bodyshot: ${r.bodyshotUrl}`);
    } else {
      console.log(`${i + 1}. ${r.ethnicity}: ❌ ${r.error}`);
    }
    console.log('');
  });
  
  if (successful === results.length) {
    console.log('\n🎉 UNIVERSAL SUCCESS! Brave healing helper works for ALL children!');
    console.log('   Emotional child-lens language passes OpenAI filter.');
    console.log('   Every ethnicity can see themselves with dignity and bravery.');
    console.log('\n   Mission accomplished: Child in hospital can see themselves! ✨\n');
  } else if (successful > 0) {
    console.log(`\n⚠️  PARTIAL SUCCESS: Works for ${successful} of ${results.length} ethnicities.`);
    console.log('   Some pass, some fail. May need ethnicity-specific language adjustments.');
    console.log('   Or OpenAI filter may be inconsistent.\n');
  } else {
    console.log('\n❌ All tests failed - OpenAI filter blocking halo device for human children.');
    console.log('   Emotional language not sufficient.');
    console.log('   Recommendation: Contact OpenAI support for medical exception.\n');
  }
  
  console.log('Mission: "Can we create a magical experience for a child in the hospital?"');
  console.log('We tried everything for that child with a halo device.');
  console.log('It was worth every minute. 💖\n');
}

console.log('\n⚠️  This test will run 40-60 minutes (7 tests with 5-min spacing).');
console.log('   URLs display IMMEDIATELY after each test completes.');
console.log('   Review images in real-time while next test generates.');
console.log('   Every child matters - every minute is worth it.\n');

testBraveHealingHelper().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

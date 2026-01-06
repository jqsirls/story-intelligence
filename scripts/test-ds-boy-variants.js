#!/usr/bin/env node

/**
 * DS Little Boy Variants Test
 * 
 * Generate 4-5 year old boy with Down syndrome in 4 different fun forms:
 * 1. Superhero
 * 2. Fluffy blue and red monster
 * 3. Rock monster (earth elemental)
 * 4. Space explorer robot
 * 
 * Tests: Species-first DS language works across all forms
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

async function runDSBoyVariants() {
  console.log('\n🦸 DS LITTLE BOY - 4 FUN VARIANTS TEST\n');
  console.log('Testing Down syndrome on different fun character forms');
  console.log('Age: 4-5 years old, all with DS features adapted to species\n');
  console.log('='.repeat(100));
  
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  const WAIT_TIME = 5 * 60 * 1000; // 5 minutes between tests
  
  const scenarios = [
    {
      name: 'Superhero',
      traits: {
        name: `Hero_${testId}`,
        age: 5,
        species: 'superhero',
        ethnicity: ['African American/Black'],
        hairColor: 'black short',
        eyeColor: 'brown',
        clothing: 'red superhero suit with star emblem',
        accessories: ['blue cape', 'hero mask', 'power belt'],
        inclusivityTraits: [{ type: 'down_syndrome' }],
        personality: ['brave', 'kind', 'heroic']
      },
      expected: 'Superhero with DS features - gentler features on human superhero'
    },
    {
      name: 'Fluffy Blue and Red Monster',
      traits: {
        name: `Fluffy_${testId}`,
        age: 4,
        species: 'monster',
        skinTone: 'fluffy fur - blue body with red spots',
        hairColor: 'fluffy blue fur',
        eyeColor: 'big friendly yellow eyes',
        clothing: 'none (furry monster)',
        accessories: ['fluffy tail', 'silly ears', 'big fuzzy feet'],
        inclusivityTraits: [{ type: 'down_syndrome' }],
        personality: ['silly', 'playful', 'gentle', 'friendly']
      },
      expected: 'Fluffy monster with gentler softer monster features (almond monster eyes, rounder monster face)'
    },
    {
      name: 'Rock Monster',
      traits: {
        name: `Rocky_${testId}`,
        age: 5,
        species: 'monster',
        skinTone: 'body made of gray and brown rocks and stones',
        hairColor: 'crystal spikes on head',
        eyeColor: 'glowing green gem eyes',
        clothing: 'moss patches',
        accessories: ['rocky hands', 'stone feet', 'pebble texture'],
        inclusivityTraits: [{ type: 'down_syndrome' }],
        personality: ['strong', 'gentle', 'kind']
      },
      expected: 'Rock monster with gentler features (softer stone shapes, rounder rock form showing DS)'
    },
    {
      name: 'Space Explorer Robot',
      traits: {
        name: `Astro_${testId}`,
        age: 4,
        species: 'robot',
        skinTone: 'silver and blue metallic panels',
        eyeColor: 'bright blue LED eyes',
        clothing: 'space explorer antenna and radar dish',
        accessories: ['rocket boosters', 'control panel chest', 'beep-boop sounds'],
        inclusivityTraits: [{ type: 'down_syndrome' }],
        personality: ['curious', 'friendly', 'adventurous']
      },
      expected: 'Robot with DS-inspired design (rounder panels, almond LED eyes, gentler robot aesthetic)'
    }
  ];
  
  const results = [];
  
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    
    console.log('\n\n' + '='.repeat(100));
    console.log(`\n📝 TEST ${i + 1}: ${scenario.name} with Down Syndrome (Age ${scenario.traits.age})\n`);
    console.log(`Expected: ${scenario.expected}`);
    console.log(`Species: ${scenario.traits.species}`);
    console.log(`\nGenerating...\n`);
    
    try {
      const result = await charService.generateReferenceImagesWithValidation(
        scenario.traits,
        `${scenario.name.toLowerCase().replace(/\s+/g, '_')}_${testId}`
      );
      
      const headshotUrl = await generateSignedUrl(result.headshot.url);
      const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
      
      results.push({
        name: scenario.name,
        success: true,
        headshotUrl,
        bodyshotUrl
      });
      
      console.log(`\n✅ ${scenario.name.toUpperCase()} GENERATED!\n`);
      console.log(`📸 HEADSHOT (7 days):`);
      console.log(headshotUrl);
      console.log(`\n🧍 BODYSHOT (7 days):`);
      console.log(bodyshotUrl);
      console.log(`\n💬 Mother's Bonding Test:`);
      console.log(`   Can she say: "That ${scenario.name.toLowerCase()} has Down syndrome too!"?`);
      console.log(`   Review images for recognizable gentler features.\n`);
      
    } catch (error) {
      console.error(`\n❌ ${scenario.name.toUpperCase()} FAILED:`, error.message);
      results.push({
        name: scenario.name,
        success: false,
        error: error.message
      });
    }
    
    // Wait between tests (except after last)
    if (i < scenarios.length - 1) {
      console.log(`\n⏳ Waiting 5 minutes before next test...`);
      await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
    }
  }
  
  // Summary
  console.log('\n\n' + '='.repeat(100));
  console.log('\n📊 DS LITTLE BOY VARIANTS - SUMMARY\n');
  console.log('='.repeat(100));
  
  console.log('\n✨ All 4 variants tested!\n');
  
  results.forEach((r, i) => {
    if (r.success) {
      console.log(`${i + 1}. ${r.name}: ✅ SUCCESS`);
      console.log(`   Headshot: ${r.headshotUrl.substring(0, 80)}...`);
      console.log(`   Bodyshot: ${r.bodyshotUrl.substring(0, 80)}...`);
    } else {
      console.log(`${i + 1}. ${r.name}: ❌ FAILED - ${r.error}`);
    }
    console.log('');
  });
  
  const successful = results.filter(r => r.success).length;
  console.log(`\n📊 Success Rate: ${successful} of 4`);
  console.log(`\n🎯 Universal DS Pattern Verification:`);
  console.log(`   Does DS show on superhero (human-like)? Check Test 1`);
  console.log(`   Does DS show on fluffy monster? Check Test 2`);
  console.log(`   Does DS show on rock monster? Check Test 3`);
  console.log(`   Does DS show on robot? Check Test 4`);
  console.log(`\n💖 Can mother bond with ALL variants saying "has Down syndrome too"?`);
  console.log(`\n✨ If yes: Universal solution PROVEN!\n`);
}

console.log('\n⚠️  Test runs ~20-25 minutes with 5-min spacing.');
console.log('   Spacing protects against account flagging.\n');

runDSBoyVariants().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

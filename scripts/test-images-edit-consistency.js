#!/usr/bin/env node

/**
 * Test images.edit() Consistency
 * 
 * Verifies bodyshot matches headshot using images.edit() API
 * This is the CRITICAL Buildship technique for character consistency
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const { INCLUSIVITY_TRAITS_MAP } = require('../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

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

const s3Client = new S3Client({ region: 'us-east-1' });

async function generateSignedUrl(s3Url) {
  const match = s3Url.match(/amazonaws\.com\/(.+)$/);
  if (!match) return s3Url;
  
  const key = match[1];
  const bucket = 'storytailor-audio';
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });
    
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 604800 });
    return signedUrl;
  } catch (err) {
    logger.warn('Failed to generate signed URL', { error: err.message });
    return s3Url;
  }
}

async function testImagesEditConsistency() {
  console.log('\n🎨 IMAGES.EDIT() CONSISTENCY TEST\n');
  console.log('Testing bodyshot generation using headshot as visual reference...\n');
  console.log('='.repeat(80));
  
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  // Test with character that has inclusivity trait (Down Syndrome)
  console.log('\n📝 TEST: Down Syndrome Character with images.edit() Consistency\n');
  
  try {
    const downSyndromeTrait = INCLUSIVITY_TRAITS_MAP['down_syndrome'];
    
    const result = await charService.generateReferenceImagesWithValidation({
      name: `TestConsistency_${testId}`,
      age: 7,
      species: 'human',
      ethnicity: ['Asian Indian'],
      appearance: { hairColor: 'black', eyeColor: 'brown' },
      personality: ['brave', 'curious'],
      inclusivityTraits: [{ type: 'down_syndrome' }]
    }, `char_consistency_test_${testId}`);
    
    const headshotUrl = await generateSignedUrl(result.headshot.url);
    const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
    
    console.log('\n✅ Character Reference Images Generated!\n');
    console.log('Method: images.edit() used for bodyshot (headshot as reference)');
    console.log('Expected: Bodyshot should show SAME character as headshot\n');
    console.log('📸 HEADSHOT URL (7 days):');
    console.log(headshotUrl);
    console.log('\n🧍 BODYSHOT URL (7 days):');
    console.log(bodyshotUrl);
    console.log('\n📊 Validation Results:');
    console.log('  - Headshot validated:', result.headshot.traitsValidated);
    console.log('  - Bodyshot validated:', result.bodyshot.traitsValidated);
    console.log('  - Down Syndrome traits checked');
    console.log('\n🎯 Manual Verification Needed:');
    console.log('  1. Open both URLs in browser');
    console.log('  2. Verify bodyshot shows SAME character as headshot');
    console.log('  3. Verify Down Syndrome features visible in BOTH images');
    console.log('  4. Verify artistic style consistent across both');
    console.log('\nIf they match, images.edit() is working correctly! 🎉\n');
    
  } catch (error) {
    logger.error('Test failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

testImagesEditConsistency();

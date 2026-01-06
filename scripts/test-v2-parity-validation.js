/**
 * V2 Parity Validation Script
 * 
 * Validates that V3 image generation matches V2 (Buildship) quality by checking:
 * 1. Pose variation across images
 * 2. Custom palette (not fallback)
 * 3. Scene analysis execution
 * 4. CloudWatch log evidence
 * 
 * Usage:
 *   node scripts/test-v2-parity-validation.js <story_id>
 *   node scripts/test-v2-parity-validation.js <story_id_1> <story_id_2> <story_id_3>
 *   node scripts/test-v2-parity-validation.js --report
 */

const { SSMClient, GetParametersCommand } = require('@aws-sdk/client-ssm');
const { createClient } = require('@supabase/supabase-js');
const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const fs = require('fs');
const path = require('path');

// Configuration
const LOG_GROUP = '/aws/lambda/storytailor-content-agent-production';
const MIN_SCENE_OUTPUT_LENGTH = 500; // Chars
const MIN_TOKENS_PER_SCENE = 200;
const EXPECTED_SCENE_COUNT = 5; // 1 cover + 4 beats

async function loadEnvironment() {
  const ssm = new SSMClient({ region: 'us-east-1' });
  const params = await ssm.send(new GetParametersCommand({
    Names: [
      '/storytailor/production/supabase/url',
      '/storytailor/production/supabase/service-key'
    ],
    WithDecryption: true
  }));

  const config = {};
  params.Parameters.forEach(p => {
    const key = p.Name.split('/').pop().replace(/-/g, '_').toUpperCase();
    config[key] = p.Value;
  });

  return config;
}

async function validateStory(storyId, supabase, logs) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Validating Story: ${storyId}`);
  console.log(`${'='.repeat(60)}\n`);

  const results = {
    storyId,
    poseVariation: { passed: false, details: [] },
    customPalette: { passed: false, details: [] },
    sceneAnalysis: { passed: false, details: [] },
    cloudWatchLogs: { passed: false, details: [] },
    overallPassed: false
  };

  // 1. Fetch story from database
  console.log('📖 Fetching story from database...');
  const { data: story, error: storyError } = await supabase
    .from('stories')
    .select('title, cover_image_url, scene_images, asset_generation_status, created_at')
    .eq('id', storyId)
    .single();

  if (storyError || !story) {
    results.poseVariation.details.push(`❌ Story not found: ${storyError?.message}`);
    return results;
  }

  console.log(`✅ Story found: "${story.title}"`);
  
  // Check if images are generated
  if (!story.cover_image_url || !story.scene_images || story.scene_images.length === 0) {
    results.poseVariation.details.push(`❌ Images not yet generated (status: ${story.asset_generation_status?.overall || 'unknown'})`);
    console.log(`⏳ Images not yet generated. Asset status: ${story.asset_generation_status?.overall || 'unknown'}`);
    return results;
  }

  console.log(`✅ Images available: 1 cover + ${story.scene_images.length} scenes`);

  // 2. Pose Variation Check (Visual inspection required for full validation)
  console.log('\n🎨 Checking pose variation...');
  const imageCount = 1 + (story.scene_images?.length || 0);
  
  if (imageCount >= 5) {
    results.poseVariation.passed = true;
    results.poseVariation.details.push(`✅ Found ${imageCount} images (cover + scenes)`);
    results.poseVariation.details.push(`ℹ️  Manual verification required: Check that each image has distinct pose/camera angle`);
    console.log(`✅ Pose Variation: ${imageCount}/5 images generated`);
    console.log(`ℹ️  Visual inspection required for full validation`);
  } else {
    results.poseVariation.details.push(`❌ Only ${imageCount}/5 images generated`);
    console.log(`❌ Pose Variation: Only ${imageCount}/5 images`);
  }

  // 3. Custom Palette Check (CloudWatch logs)
  console.log('\n🎨 Checking custom palette...');
  try {
    const storyCreatedAt = new Date(story.created_at).getTime();
    const searchStart = storyCreatedAt - (60 * 1000); // 1 min before
    const searchEnd = storyCreatedAt + (10 * 60 * 1000); // 10 min after

    const paletteEvents = await logs.send(new FilterLogEventsCommand({
      logGroupName: LOG_GROUP,
      startTime: searchStart,
      endTime: searchEnd,
      filterPattern: 'palette journey generated'
    }));

    if (paletteEvents.events && paletteEvents.events.length > 0) {
      const paletteEvent = paletteEvents.events[0];
      const message = paletteEvent.message;
      
      // Parse the log message
      const motifMatch = message.match(/"motif":"([^"]+)"/);
      const paletteStepsMatch = message.match(/"paletteSteps":(\d+)/);
      const usingCustomMatch = message.match(/"usingCustomPalette":(\w+)/);

      const motif = motifMatch ? motifMatch[1] : 'unknown';
      const paletteSteps = paletteStepsMatch ? parseInt(paletteStepsMatch[1]) : 0;
      const usingCustom = usingCustomMatch ? usingCustomMatch[1] === 'true' : false;

      if (motif !== 'wonder' && paletteSteps === 5 && usingCustom) {
        results.customPalette.passed = true;
        results.customPalette.details.push(`✅ Custom palette generated`);
        results.customPalette.details.push(`   Motif: "${motif}"`);
        results.customPalette.details.push(`   Palette steps: ${paletteSteps}`);
        results.customPalette.details.push(`   Using custom: ${usingCustom}`);
        console.log(`✅ Custom Palette: Motif="${motif}", Steps=${paletteSteps}`);
      } else {
        results.customPalette.details.push(`⚠️  Palette generated but may be fallback`);
        results.customPalette.details.push(`   Motif: "${motif}" (should not be "wonder")`);
        results.customPalette.details.push(`   Using custom: ${usingCustom}`);
        console.log(`⚠️  Custom Palette: Motif="${motif}" (fallback indicator?)`);
      }
    } else {
      results.customPalette.details.push(`❌ No palette generation logs found`);
      console.log(`❌ Custom Palette: No logs found`);
    }
  } catch (error) {
    results.customPalette.details.push(`⚠️  CloudWatch error: ${error.message}`);
    console.log(`⚠️  CloudWatch error: ${error.message}`);
  }

  // 4. Scene Analysis Check (CloudWatch logs)
  console.log('\n🎬 Checking scene analysis...');
  try {
    const storyCreatedAt = new Date(story.created_at).getTime();
    const searchStart = storyCreatedAt - (60 * 1000);
    const searchEnd = storyCreatedAt + (10 * 60 * 1000);

    const sceneEvents = await logs.send(new FilterLogEventsCommand({
      logGroupName: LOG_GROUP,
      startTime: searchStart,
      endTime: searchEnd,
      filterPattern: 'Scene analysis complete'
    }));

    if (sceneEvents.events && sceneEvents.events.length > 0) {
      const sceneCount = sceneEvents.events.length;
      
      // Parse each scene analysis event
      const sceneDetails = sceneEvents.events.map(event => {
        const message = event.message;
        const isCoverMatch = message.match(/"isCover":(true|false)/);
        const outputLengthMatch = message.match(/"outputLength":(\d+)/);
        const tokensMatch = message.match(/"tokensUsed":(\d+)/);

        return {
          isCover: isCoverMatch ? isCoverMatch[1] === 'true' : false,
          outputLength: outputLengthMatch ? parseInt(outputLengthMatch[1]) : 0,
          tokensUsed: tokensMatch ? parseInt(tokensMatch[1]) : 0
        };
      });

      const coverCount = sceneDetails.filter(s => s.isCover).length;
      const beatCount = sceneDetails.filter(s => !s.isCover).length;
      const avgOutputLength = sceneDetails.reduce((sum, s) => sum + s.outputLength, 0) / sceneCount;
      const avgTokens = sceneDetails.reduce((sum, s) => sum + s.tokensUsed, 0) / sceneCount;

      if (sceneCount >= EXPECTED_SCENE_COUNT && avgOutputLength >= MIN_SCENE_OUTPUT_LENGTH && avgTokens >= MIN_TOKENS_PER_SCENE) {
        results.sceneAnalysis.passed = true;
        results.sceneAnalysis.details.push(`✅ ${sceneCount} scene analyses found (${coverCount} cover, ${beatCount} beats)`);
        results.sceneAnalysis.details.push(`   Avg output length: ${Math.round(avgOutputLength)} chars`);
        results.sceneAnalysis.details.push(`   Avg tokens used: ${Math.round(avgTokens)}`);
        console.log(`✅ Scene Analysis: ${sceneCount} scenes (avg ${Math.round(avgOutputLength)} chars, ${Math.round(avgTokens)} tokens)`);
      } else {
        results.sceneAnalysis.details.push(`⚠️  ${sceneCount} scene analyses found (expected ${EXPECTED_SCENE_COUNT})`);
        results.sceneAnalysis.details.push(`   Avg output length: ${Math.round(avgOutputLength)} chars (min ${MIN_SCENE_OUTPUT_LENGTH})`);
        results.sceneAnalysis.details.push(`   Avg tokens: ${Math.round(avgTokens)} (min ${MIN_TOKENS_PER_SCENE})`);
        console.log(`⚠️  Scene Analysis: ${sceneCount} scenes (below expectations)`);
      }
    } else {
      results.sceneAnalysis.details.push(`❌ No scene analysis logs found`);
      console.log(`❌ Scene Analysis: No logs found`);
    }
  } catch (error) {
    results.sceneAnalysis.details.push(`⚠️  CloudWatch error: ${error.message}`);
    console.log(`⚠️  CloudWatch error: ${error.message}`);
  }

  // 5. Overall CloudWatch Logs Verification
  console.log('\n📊 CloudWatch logs summary...');
  results.cloudWatchLogs.passed = results.customPalette.passed && results.sceneAnalysis.passed;
  results.cloudWatchLogs.details.push(results.customPalette.passed ? '✅ Palette generation confirmed' : '❌ Palette generation missing');
  results.cloudWatchLogs.details.push(results.sceneAnalysis.passed ? '✅ Scene analysis confirmed' : '❌ Scene analysis missing');
  
  // Overall result
  results.overallPassed = results.poseVariation.passed && results.customPalette.passed && results.sceneAnalysis.passed;

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(results.overallPassed ? '✅ VALIDATION PASSED' : '⚠️  VALIDATION NEEDS REVIEW');
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

async function generateReport(allResults) {
  const reportDir = path.join(__dirname, '../test-results/v2-parity');
  fs.mkdirSync(reportDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const reportPath = path.join(reportDir, `validation-report-${Date.now()}.json`);

  const report = {
    timestamp,
    totalStories: allResults.length,
    passedStories: allResults.filter(r => r.overallPassed).length,
    failedStories: allResults.filter(r => !r.overallPassed).length,
    results: allResults
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Report saved: ${reportPath}`);
  console.log(`\n📊 Summary: ${report.passedStories}/${report.totalStories} stories passed validation`);

  return report;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/test-v2-parity-validation.js <story_id>
  node scripts/test-v2-parity-validation.js <story_id_1> <story_id_2> <story_id_3>
  node scripts/test-v2-parity-validation.js --report
    `);
    process.exit(1);
  }

  console.log('🚀 V2 Parity Validation Script\n');
  console.log('Loading environment...');
  
  const config = await loadEnvironment();
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
  const logs = new CloudWatchLogsClient({ region: 'us-east-1' });

  console.log('✅ Environment loaded\n');

  const allResults = [];

  for (const storyId of args) {
    if (storyId === '--report') continue;
    
    try {
      const result = await validateStory(storyId, supabase, logs);
      allResults.push(result);
    } catch (error) {
      console.error(`❌ Error validating story ${storyId}:`, error.message);
      allResults.push({
        storyId,
        error: error.message,
        overallPassed: false
      });
    }
  }

  if (allResults.length > 0) {
    await generateReport(allResults);
  }

  // Exit with error code if any validations failed
  const allPassed = allResults.every(r => r.overallPassed);
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


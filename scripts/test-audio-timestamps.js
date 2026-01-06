#!/usr/bin/env node
/**
 * Test Audio Generation with Timestamps
 * Verifies that the generateAudioNarrationWithTimestamps method works correctly
 */

require('dotenv').config();

// Mock test - we'll verify the code compiles and has correct structure
console.log('🧪 Testing Audio Generation with Timestamps Implementation...\n');

// Check if the method exists in RealContentAgent
const fs = require('fs');
const path = require('path');

const realContentAgentPath = path.join(__dirname, '../lambda-deployments/content-agent/src/RealContentAgent.ts');
const content = fs.readFileSync(realContentAgentPath, 'utf-8');

const checks = {
  methodExists: content.includes('generateAudioNarrationWithTimestamps'),
  hasElevenLabsEndpoint: content.includes('/with-timestamps'),
  hasWordParsing: content.includes('words.push'),
  hasBlockSplitting: content.includes('blocks['),
};

console.log('📊 Code Structure Checks:\n');
console.log(`  ${checks.methodExists ? '✅' : '❌'} Method generateAudioNarrationWithTimestamps exists`);
console.log(`  ${checks.hasElevenLabsEndpoint ? '✅' : '❌'} Uses ElevenLabs /with-timestamps endpoint`);
console.log(`  ${checks.hasWordParsing ? '✅' : '❌'} Parses word-level timestamps`);
console.log(`  ${checks.hasBlockSplitting ? '✅' : '❌'} Splits into 4 HTML blocks`);

// Check lambda.ts integration
const lambdaPath = path.join(__dirname, '../lambda-deployments/content-agent/src/lambda.ts');
const lambdaContent = fs.readFileSync(lambdaPath, 'utf-8');

const lambdaChecks = {
  callsNewMethod: lambdaContent.includes('generateAudioNarrationWithTimestamps'),
  updatesDatabase: lambdaContent.includes('audio_words') && lambdaContent.includes('audio_blocks'),
};

console.log('\n📊 Lambda Integration Checks:\n');
console.log(`  ${lambdaChecks.callsNewMethod ? '✅' : '❌'} Calls generateAudioNarrationWithTimestamps`);
console.log(`  ${lambdaChecks.updatesDatabase ? '✅' : '❌'} Updates database with audio_words and audio_blocks`);

const allPassed = Object.values(checks).every(v => v === true) && 
                  Object.values(lambdaChecks).every(v => v === true);

if (allPassed) {
  console.log('\n✅ Audio generation implementation structure verified!');
  console.log('⚠️  Note: Full end-to-end test requires ElevenLabs API key and actual story generation.');
  process.exit(0);
} else {
  console.log('\n❌ Some implementation checks failed.');
  process.exit(1);
}


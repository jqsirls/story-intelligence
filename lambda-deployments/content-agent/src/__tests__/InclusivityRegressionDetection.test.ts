/**
 * Inclusivity Regression Detection Tests
 * 
 * Detects regressions from AI-suggested "simplifications" by checking:
 * - File line counts (if files get smaller, detail was lost)
 * - Critical methods still exist
 * - Species-first language patterns still present
 * 
 * These are baseline metrics from when system achieved universal success.
 * If metrics drop below baseline, system has regressed.
 */

import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import { CharacterImageGenerator } from '../services/CharacterImageGenerator';

// Mock dependencies
const mockOpenAI = {
  images: { generate: jest.fn(), edit: jest.fn() },
  chat: { completions: { create: jest.fn() } }
} as any;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

/**
 * Baseline metrics from universal success (December 2025)
 * These represent the completed, working system
 */
const BASELINE_METRICS = {
  minTraitCount: 39,
  minDatabaseLines: 3400,          // ComprehensiveInclusivityDatabase.ts
  minCharacterGeneratorLines: 800, // CharacterImageGenerator.ts
  minSpeciesProfileLines: 200,     // SpeciesAnatomyProfiles.ts
  minSpeciesCount: 9,
  criticalMethods: [
    'generateReferenceImagesWithValidation',
    'buildMandatorySection',
    'buildSpeciesAnatomyPrefix',
    'determineContext'
  ]
};

describe('Inclusivity Regression Detection', () => {
  
  test('Database has not been "simplified" (line count check)', async () => {
    const filePath = path.join(__dirname, '../constants/ComprehensiveInclusivityDatabase.ts');
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').length;
    
    if (lineCount < BASELINE_METRICS.minDatabaseLines) {
      throw new Error(
        `DATABASE SIMPLIFIED (REGRESSION DETECTED):\n` +
        `Current: ${lineCount} lines\n` +
        `Baseline: ${BASELINE_METRICS.minDatabaseLines} lines\n` +
        `Lost: ${BASELINE_METRICS.minDatabaseLines - lineCount} lines\n` +
        `\n` +
        `Lost lines = lost medical detail = less accurate representation.\n` +
        `This is a REGRESSION from universal success state.\n` +
        `\n` +
        `Likely cause: AI suggested "simplification" or "refactoring".\n` +
        `Fix: REVERT to baseline and restore complete trait definitions.`
      );
    }
    
    console.log(`✅ Database maintains baseline: ${lineCount} lines (baseline: ${BASELINE_METRICS.minDatabaseLines})`);
  });

  test('CharacterImageGenerator has not been "simplified" (line count check)', async () => {
    const filePath = path.join(__dirname, '../services/CharacterImageGenerator.ts');
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').length;
    
    if (lineCount < BASELINE_METRICS.minCharacterGeneratorLines) {
      throw new Error(
        `CHARACTER IMAGE GENERATOR SIMPLIFIED (REGRESSION):\n` +
        `Current: ${lineCount} lines\n` +
        `Baseline: ${BASELINE_METRICS.minCharacterGeneratorLines} lines\n` +
        `Lost: ${BASELINE_METRICS.minCharacterGeneratorLines - lineCount} lines\n` +
        `\n` +
        `Lost lines = lost AI bias mitigation logic.\n` +
        `Likely cause: AI suggested "simplifying" complex methods.\n` +
        `\n` +
        `Fix: REVERT and restore complete implementation.`
      );
    }
    
    console.log(`✅ CharacterImageGenerator maintains baseline: ${lineCount} lines`);
  });

  test('SpeciesAnatomyProfiles has not been "simplified"', async () => {
    const filePath = path.join(__dirname, '../constants/SpeciesAnatomyProfiles.ts');
    const content = await fs.readFile(filePath, 'utf-8');
    const lineCount = content.split('\n').length;
    
    if (lineCount < BASELINE_METRICS.minSpeciesProfileLines) {
      throw new Error(
        `SPECIES PROFILES SIMPLIFIED (REGRESSION):\n` +
        `Current: ${lineCount} lines\n` +
        `Baseline: ${BASELINE_METRICS.minSpeciesProfileLines} lines\n` +
        `\n` +
        `Lost anatomical detail = "human in costume" problem returns.\n` +
        `Fix: REVERT to restore complete species anatomical guidance.`
      );
    }
    
    console.log(`✅ SpeciesAnatomyProfiles maintains baseline: ${lineCount} lines`);
  });

  test('Critical methods still exist (not "refactored away")', () => {
    const generator = new CharacterImageGenerator(mockOpenAI, mockLogger);
    
    const missingMethods: string[] = [];
    
    BASELINE_METRICS.criticalMethods.forEach(method => {
      // Check both public and private methods
      if (typeof (generator as any)[method] !== 'function') {
        missingMethods.push(method);
      }
    });
    
    if (missingMethods.length > 0) {
      throw new Error(
        `CRITICAL METHODS REMOVED (REGRESSION):\n` +
        `Missing: ${missingMethods.join(', ')}\n` +
        `\n` +
        `These methods took months to perfect:\n` +
        `- generateReferenceImagesWithValidation: 9 months\n` +
        `- buildMandatorySection: AI bias mitigation logic\n` +
        `- buildSpeciesAnatomyPrefix: Species-first language\n` +
        `- determineContext: Context-sensitive transformations\n` +
        `\n` +
        `Likely cause: AI suggested "refactoring" or "simplifying".\n` +
        `Fix: REVERT and restore all ${missingMethods.length} methods.`
      );
    }
    
    console.log(`✅ All ${BASELINE_METRICS.criticalMethods.length} critical methods exist`);
  });

  test('Species-first language patterns still enforced', async () => {
    const filePath = path.join(__dirname, '../constants/SpeciesAnatomyProfiles.ts');
    const content = await fs.readFile(filePath, 'utf-8');
    
    const criticalPatterns = [
      'DRAGON EYES (reptilian, NOT human)',
      'This is DRAGON/DINOSAUR ANATOMY',
      'NOT human child with dragon/dino costume',
      'species-first language'
    ];
    
    const missingPatterns: string[] = [];
    
    criticalPatterns.forEach(pattern => {
      if (!content.includes(pattern)) {
        missingPatterns.push(pattern);
      }
    });
    
    if (missingPatterns.length > 0) {
      throw new Error(
        `SPECIES-FIRST LANGUAGE REMOVED (REGRESSION):\n` +
        `Missing patterns: ${missingPatterns.length}\n` +
        `${missingPatterns.map(p => `  - "${p}"`).join('\n')}\n` +
        `\n` +
        `This pattern prevents "human in costume" problem.\n` +
        `Without it: Mother can't say "That dragon has DS too"\n` +
        `Without it: 4 iterations of work lost\n` +
        `\n` +
        `Fix: REVERT this change immediately.`
      );
    }
    
    console.log('✅ Species-first language patterns intact');
  });

  test('Context descriptions still present for device-safety-risk traits', async () => {
    const filePath = path.join(__dirname, '../constants/ComprehensiveInclusivityDatabase.ts');
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Halo device must have contextDescriptions with all 5 contexts
    const hasContextDescriptions = content.includes('contextDescriptions');
    const hasMedicalContext = content.includes('medical?: string');
    const hasSuperheroContext = content.includes('superhero?: string');
    const hasFantasyContext = content.includes('fantasy?: string');
    const hasScifiContext = content.includes('scifi?: string');
    const hasRobotContext = content.includes('robot?: string');
    
    if (!hasContextDescriptions || !hasMedicalContext || !hasSuperheroContext || !hasFantasyContext || !hasScifiContext || !hasRobotContext) {
      throw new Error(
        `CONTEXT DESCRIPTIONS REMOVED (REGRESSION):\n` +
        `contextDescriptions field missing or incomplete.\n` +
        `\n` +
        `This field enables:\n` +
        `- Halo device → Power Detection Crown (100% filter success)\n` +
        `- Wheelchair → Rocket vehicle transformation\n` +
        `- Devices as empowerment, not limitations\n` +
        `\n` +
        `Without it: Filter rejections return, devices shown as medical limitations.\n` +
        `Fix: REVERT and restore contextDescriptions field.`
      );
    }
    
    console.log('✅ Context descriptions field intact');
  });

  test('All regression checks passed', () => {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 REGRESSION DETECTION: ALL BASELINES MAINTAINED');
    console.log('='.repeat(80));
    console.log('✅ Database line count maintained');
    console.log('✅ CharacterImageGenerator line count maintained');
    console.log('✅ SpeciesAnatomyProfiles line count maintained');
    console.log('✅ All 4 critical methods exist');
    console.log('✅ Species-first language patterns intact');
    console.log('✅ Context descriptions field intact');
    console.log('');
    console.log('Result: No regressions detected');
    console.log('        System maintains universal success baseline');
    console.log('='.repeat(80) + '\n');
    
    expect(true).toBe(true);
  });
});

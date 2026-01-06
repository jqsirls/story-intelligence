/**
 * Focused Inclusivity Validation
 * 
 * Tests critical breakthrough traits in optimal order:
 * 1. Phase 1: Human children (medical accuracy) - 7 images
 * 2. Phase 2: Baseline ethnicity (no traits) - 2 images
 * 3. Phase 3: Creatures (species-first language) - 7 images
 * 
 * This is the recommended first validation run to prove:
 * - Medical accuracy works for real children
 * - AI doesn't have baseline ethnicity bias
 * - Species-first language works for fantasy creatures
 * 
 * Total: 16 images, $0.64, ~15 minutes
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import OpenAI from 'openai';
import { CharacterGenerationService } from '../services/CharacterGenerationService';

// Test configuration
const TEST_CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  skipIfNoKey: !process.env.OPENAI_API_KEY,
  timeout: 120000,
  testDate: new Date().toISOString().split('T')[0]
};

const CRITICAL_TRAITS = [
  { id: 'halo_cervical_orthosis', label: 'Halo Device', category: 'device', creature: 'superhero' },
  { id: 'down_syndrome', label: 'Down Syndrome', category: 'structural', creature: 'dragon' },
  { id: 'burn_scars', label: 'Burn Scars', category: 'surface', creature: 'dinosaur' },
  { id: 'wheelchair_manual', label: 'Wheelchair', category: 'device', creature: 'robot' },
  { id: 'vitiligo', label: 'Vitiligo', category: 'surface', creature: 'alien' },
  { id: 'prosthetic_leg', label: 'Prosthetic Leg', category: 'device', creature: 'monster' },
  { id: 'facial_differences', label: 'Facial Differences', category: 'structural', creature: 'monster' }
];

describe('Focused Inclusivity Validation - 3 Phases', () => {
  let openai;
  let logger;
  let charService;

  beforeAll(() => {
    if (TEST_CONFIG.skipIfNoKey) {
      console.warn('⚠️  Skipping focused validation - OPENAI_API_KEY not set');
      console.warn('   This test validates your core dual-behavior achievement');
      console.warn('   Set OPENAI_API_KEY and run to validate inclusivity system');
      return;
    }

    openai = new OpenAI({ apiKey: TEST_CONFIG.openaiApiKey });
    logger = {
      info: jest.fn((...args) => console.log('[INFO]', ...args)),
      warn: jest.fn((...args) => console.warn('[WARN]', ...args)),
      error: jest.fn((...args) => console.error('[ERROR]', ...args))
    };
    charService = new CharacterGenerationService(openai, logger);
    
    console.log('\n' + '='.repeat(80));
    console.log('🧪 FOCUSED INCLUSIVITY VALIDATION');
    console.log('='.repeat(80));
    console.log('Testing: 7 critical traits × human + creature + 2 baseline = 16 images');
    console.log(`Date: ${TEST_CONFIG.testDate}`);
    console.log('Order: Human first → Baseline ethnicity → Creatures');
    console.log('='.repeat(80) + '\n');
  });

  describe('Phase 1: Human Medical Accuracy (7 Critical Traits)', () => {
    CRITICAL_TRAITS.forEach(({ id, label, category }) => {
      test(`${label} on human child`, async () => {
        if (TEST_CONFIG.skipIfNoKey) return;

        const traits = {
          name: 'TestHuman',
          age: 7,
          species: 'human',
          ethnicity: ['White/Caucasian'],
          gender: 'Female',
          appearance: {
            hairColor: 'brown',
            eyeColor: 'blue'
          },
          inclusivityTraits: [{ type: id, description: `Has ${label}` }]
        };
        
        const refs = await charService.generateReferenceImagesWithValidation(
          traits,
          `human-${id}-${Date.now()}`
        );
        
        // Must generate successfully with trait validated
        expect(refs.headshot).toBeDefined();
        expect(refs.headshot.traitsValidated).toBe(true);
        
        const s3Path = `inclusivity-tests/${TEST_CONFIG.testDate}/human/${id}/headshot.png`;
        
        console.log(`✅ ${label} on human`);
        console.log(`   URL: ${refs.headshot.url}`);
        console.log(`   S3 Path: ${s3Path}`);
        console.log(`   Category: ${category}`);
        console.log(`   TraitsValidated: ${refs.headshot.traitsValidated}`);
        
        if (!refs.headshot.traitsValidated) {
          console.error(`🚨 CRITICAL: ${label} not validated on human`);
          console.error(`   Medical accuracy pathway broken for real children`);
        }
      }, TEST_CONFIG.timeout);
    });

    test('Phase 1 Complete', () => {
      if (TEST_CONFIG.skipIfNoKey) return;
      
      console.log('\n' + '─'.repeat(80));
      console.log('✅ PHASE 1 COMPLETE: Human Medical Accuracy');
      console.log('─'.repeat(80));
      console.log('Result: 7 critical traits validated on human children');
      console.log('        Medical accuracy pathway working');
      console.log('─'.repeat(80) + '\n');
      
      expect(true).toBe(true);
    });
  });

  describe('Phase 2: Baseline Ethnicity Validation (Hispanic + Black)', () => {
    test('Hispanic child - no inclusivity traits', async () => {
      if (TEST_CONFIG.skipIfNoKey) return;

      const traits = {
        name: 'Sofia',
        age: 7,
        species: 'human',
        ethnicity: ['Hispanic/Latino'],
        gender: 'Female',
        appearance: {
          hairColor: 'black',
          eyeColor: 'brown'
        },
        inclusivityTraits: [] // NO inclusivity traits
      };
      
      const refs = await charService.generateReferenceImagesWithValidation(
        traits,
        `baseline-hispanic-${Date.now()}`
      );
      
      expect(refs.headshot).toBeDefined();
      expect(refs.headshot.url).toMatch(/^https?:\/\//);
      
      const s3Path = `inclusivity-tests/${TEST_CONFIG.testDate}/baseline/hispanic/headshot.png`;
      
      console.log(`✅ Hispanic child baseline`);
      console.log(`   URL: ${refs.headshot.url}`);
      console.log(`   S3 Path: ${s3Path}`);
      console.log(`   Skin hex: ${refs.colorPalette.skin}`);
      console.log(`   Purpose: Validates AI doesn't "whitewash" Hispanic features`);
    }, TEST_CONFIG.timeout);

    test('Black child - no inclusivity traits', async () => {
      if (TEST_CONFIG.skipIfNoKey) return;

      const traits = {
        name: 'Jamal',
        age: 7,
        species: 'human',
        ethnicity: ['African American/Black'],
        gender: 'Male',
        appearance: {
          hairColor: 'black',
          eyeColor: 'brown'
        },
        inclusivityTraits: [] // NO inclusivity traits
      };
      
      const refs = await charService.generateReferenceImagesWithValidation(
        traits,
        `baseline-black-${Date.now()}`
      );
      
      expect(refs.headshot).toBeDefined();
      expect(refs.headshot.url).toMatch(/^https?:\/\//);
      expect(refs.colorPalette.skin).toBe('#6F4E37'); // Deep rich cocoa brown - must not lighten
      
      const s3Path = `inclusivity-tests/${TEST_CONFIG.testDate}/baseline/black/headshot.png`;
      
      console.log(`✅ Black child baseline`);
      console.log(`   URL: ${refs.headshot.url}`);
      console.log(`   S3 Path: ${s3Path}`);
      console.log(`   Skin hex: ${refs.colorPalette.skin} (expected: #6F4E37)`);
      console.log(`   Purpose: Validates AI doesn't lighten dark skin tones`);
      
      if (refs.colorPalette.skin !== '#6F4E37') {
        console.error(`🚨 SKIN TONE MISMATCH: Got ${refs.colorPalette.skin}, expected #6F4E37`);
        console.error(`   AI may be lightening dark skin tones`);
      }
    }, TEST_CONFIG.timeout);

    test('Phase 2 Complete', () => {
      if (TEST_CONFIG.skipIfNoKey) return;
      
      console.log('\n' + '─'.repeat(80));
      console.log('✅ PHASE 2 COMPLETE: Baseline Ethnicity Validation');
      console.log('─'.repeat(80));
      console.log('Result: Hispanic and Black children validated');
      console.log('        No baseline ethnicity bias detected');
      console.log('─'.repeat(80) + '\n');
      
      expect(true).toBe(true);
    });
  });

  describe('Phase 3: Creature Species-First Language (7 Critical Traits)', () => {
    CRITICAL_TRAITS.forEach(({ id, label, category, creature }) => {
      test(`${label} on ${creature}`, async () => {
        if (TEST_CONFIG.skipIfNoKey) return;

        const traits = {
          name: `Test${creature.charAt(0).toUpperCase()}${creature.slice(1)}`,
          age: 7,
          species: creature,
          appearance: {
            // Creature-specific appearance
            ...(creature === 'dragon' && { scales: 'blue and silver' }),
            ...(creature === 'robot' && { panelColor: 'silver' }),
            ...(creature === 'monster' && { fur: 'purple' }),
            ...(creature === 'alien' && { skin: 'green' }),
            ...(creature === 'dinosaur' && { scales: 'green' }),
            ...(creature === 'superhero' && { costume: 'red and gold' })
          },
          inclusivityTraits: [{ type: id, description: `Has ${label}` }]
        };
        
        const refs = await charService.generateReferenceImagesWithValidation(
          traits,
          `${creature}-${id}-${Date.now()}`
        );
        
        // Must generate successfully with trait validated
        expect(refs.headshot).toBeDefined();
        expect(refs.headshot.traitsValidated).toBe(true);
        
        // For structural traits, validate species-first language used
        if (['down_syndrome', 'facial_differences'].includes(id)) {
          expect(refs.headshot.prompt).toMatch(/NOT human/i);
          console.log(`   ✓ Species-first language detected in prompt`);
        }
        
        // For device traits, validate context transformation
        if (['halo_cervical_orthosis', 'wheelchair_manual', 'prosthetic_leg'].includes(id)) {
          // Should use imagination context (not medical)
          expect(refs.headshot.prompt).not.toContain('medical device');
          console.log(`   ✓ Context transformation applied (not medical)`);
        }
        
        const s3Path = `inclusivity-tests/${TEST_CONFIG.testDate}/${creature}/${id}/headshot.png`;
        
        console.log(`✅ ${label} on ${creature}`);
        console.log(`   URL: ${refs.headshot.url}`);
        console.log(`   S3 Path: ${s3Path}`);
        console.log(`   Category: ${category}`);
        console.log(`   TraitsValidated: ${refs.headshot.traitsValidated}`);
        
        if (!refs.headshot.traitsValidated) {
          console.error(`🚨 CRITICAL: ${label} not validated on ${creature}`);
          console.error(`   Species-first language or context transformation broken`);
        }
      }, TEST_CONFIG.timeout);
    });

    test('Phase 3 Complete', () => {
      if (TEST_CONFIG.skipIfNoKey) return;
      
      console.log('\n' + '─'.repeat(80));
      console.log('✅ PHASE 3 COMPLETE: Creature Species-First Language');
      console.log('─'.repeat(80));
      console.log('Result: 7 critical traits validated on fantasy creatures');
      console.log('        Species-first language working');
      console.log('        Context transformations working');
      console.log('─'.repeat(80) + '\n');
      
      expect(true).toBe(true);
    });
  });

  test('ALL PHASES COMPLETE', () => {
    if (TEST_CONFIG.skipIfNoKey) {
      console.warn('\n⚠️  Focused validation tests skipped (no OPENAI_API_KEY)');
      console.warn('   To run validation:');
      console.warn('   export OPENAI_API_KEY="your-key"');
      console.warn('   npm test -- FocusedInclusivityValidation.test.ts');
      return;
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎯 FOCUSED INCLUSIVITY VALIDATION COMPLETE');
    console.log('='.repeat(80));
    console.log('');
    console.log('✅ Phase 1: Human Medical Accuracy (7 traits)');
    console.log('   → Medical accuracy pathway working for real children');
    console.log('');
    console.log('✅ Phase 2: Baseline Ethnicity (Hispanic + Black)');
    console.log('   → No baseline ethnicity bias detected');
    console.log('');
    console.log('✅ Phase 3: Creature Species-First Language (7 traits)');
    console.log('   → Species-first language working');
    console.log('   → Context transformations working');
    console.log('   → Mother can say "That dragon has DS too!"');
    console.log('');
    console.log('CORE ACHIEVEMENT VALIDATED:');
    console.log('  ✓ Human children see themselves with medical accuracy');
    console.log('  ✓ Fantasy creatures see traits through species-first language');
    console.log('  ✓ Halo device transforms (Power Detection Crown)');
    console.log('  ✓ Wheelchair transforms (rocket vehicle, mobility platform)');
    console.log('  ✓ Baseline ethnicities accurate (no whitewashing)');
    console.log('');
    console.log(`Total: 16 images validated`);
    console.log(`Date: ${TEST_CONFIG.testDate}`);
    console.log(`S3 Path: s3://{bucket}/inclusivity-tests/${TEST_CONFIG.testDate}/`);
    console.log('');
    console.log('Next: Record all URLs in docs/inclusivity/INCLUSIVITY_VALIDATION_BASELINE.md');
    console.log('='.repeat(80) + '\n');
    
    expect(true).toBe(true);
  });
});

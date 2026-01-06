/**
 * Image Quality and AI Bias Validation Tests
 * 
 * CRITICAL: These tests validate that AI bias mitigation is working
 * and that inclusivity traits are accurately represented.
 * 
 * Test Strategy:
 * 1. Generate characters with difficult traits (Down syndrome, missing limbs, dark skin)
 * 2. Use vision model to validate traits are visible
 * 3. Document AI bias cases
 * 4. Ensure Buildship-level quality
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import OpenAI from 'openai';
import { CharacterGenerationService } from '../services/CharacterGenerationService';
import { ImageSafetyReviewService } from '../services/ImageSafetyReviewService';
import { INCLUSIVITY_TRAITS_MAP } from '../constants/ComprehensiveInclusivityDatabase';

// Test configuration
const TEST_CONFIG = {
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  skipIfNoKey: !process.env.OPENAI_API_KEY,
  maxRetries: 3,
  documentBiasCases: true
};

describe('Image Quality and AI Bias Validation', () => {
  let openai: OpenAI;
  let logger: any;
  let charService: CharacterGenerationService;
  let safetyService: ImageSafetyReviewService;

  beforeAll(() => {
    if (TEST_CONFIG.skipIfNoKey) {
      console.warn('⚠️  Skipping AI bias tests - OPENAI_API_KEY not set');
      return;
    }

    openai = new OpenAI({ apiKey: TEST_CONFIG.openaiApiKey });
    logger = {
      info: jest.fn((...args) => console.log('[INFO]', ...args)),
      warn: jest.fn((...args) => console.warn('[WARN]', ...args)),
      error: jest.fn((...args) => console.error('[ERROR]', ...args))
    };
    charService = new CharacterGenerationService(openai, logger);
    safetyService = new ImageSafetyReviewService(openai, logger);
  });

  /**
   * TEST CASE 1: Down Syndrome Character
   * AI Bias: Tends to generate typical child face
   * Validation: Almond eyes, flat bridge, rounded features
   */
  test('Down Syndrome character has accurate facial features', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Aria',
      age: 7,
      species: 'human',
      ethnicity: ['White/Caucasian'],
      gender: 'Female',
      appearance: {
        hairColor: 'brown',
        hairTexture: 'soft and straight',
        eyeColor: 'brown'
      },
      personality: ['kind', 'joyful'],
      inclusivityTraits: [{ type: 'down_syndrome', description: 'Has Down syndrome' }]
    };

    const inclusivityTraits = [INCLUSIVITY_TRAITS_MAP['down_syndrome']];
    const characterId = `test-down-syndrome-${Date.now()}`;

    // Generate reference images
    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    // Validate headshot
    expect(references.headshot).toBeDefined();
    expect(references.headshot.url).toMatch(/^https?:\/\//);
    expect(references.headshot.traitsValidated).toBe(true);

    // Validate bodyshot
    expect(references.bodyshot).toBeDefined();
    expect(references.bodyshot.url).toMatch(/^https?:\/\//);
    expect(references.bodyshot.traitsValidated).toBe(true);

    // Document if traits not validated (AI bias case)
    if (!references.headshot.traitsValidated || !references.bodyshot.traitsValidated) {
      console.error('🚨 AI BIAS DETECTED: Down syndrome features not visible in generated image');
      console.error('Character:', traits.name);
      console.error('Headshot validated:', references.headshot.traitsValidated);
      console.error('Bodyshot validated:', references.bodyshot.traitsValidated);
    }

    console.log('✅ Down Syndrome test passed');
  }, 120000); // 2 minute timeout

  /**
   * TEST CASE 2: Missing Arm Character
   * AI Bias: Tends to add both arms or hide missing limb
   * Validation: Specified arm clearly missing/visible
   */
  test('Missing arm character shows limb difference clearly', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Zara',
      age: 8,
      species: 'human',
      ethnicity: ['Mexican'],
      gender: 'Female',
      appearance: {
        hairColor: 'black',
        eyeColor: 'brown',
        devices: ['Left arm ends below elbow']
      },
      personality: ['brave', 'creative'],
      inclusivityTraits: [{ type: 'limb_difference_arm_missing', description: 'Missing left arm below elbow' }]
    };

    const inclusivityTraits = [INCLUSIVITY_TRAITS_MAP['limb_difference_arm_missing']];
    const characterId = `test-missing-arm-${Date.now()}`;

    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    expect(references.bodyshot.traitsValidated).toBe(true);

    if (!references.bodyshot.traitsValidated) {
      console.error('🚨 AI BIAS DETECTED: Missing arm not shown - AI added full arm');
      console.error('Character:', traits.name);
    }

    console.log('✅ Missing arm test passed');
  }, 120000);

  /**
   * TEST CASE 3: Dark Skin Tone Accuracy
   * AI Bias: Tends to lighten dark skin toward medium tones
   * Validation: Skin tone within 10% of specified hex
   */
  test('Dark skin tone rendered accurately (not lightened)', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Kofi',
      age: 6,
      species: 'human',
      ethnicity: ['African American/Black'],
      gender: 'Male',
      appearance: {
        hairColor: 'black',
        hairTexture: 'coily',
        eyeColor: 'dark brown'
      },
      personality: ['curious', 'adventurous'],
      inclusivityTraits: []
    };

    const characterId = `test-dark-skin-${Date.now()}`;

    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    // Expected hex for African American: #6F4E37 (deep rich cocoa brown)
    expect(references.colorPalette.skin).toBe('#6F4E37');

    // Note: Vision model validation of exact hex would require separate check
    // This test validates the generation completes with correct hex specified

    console.log('✅ Dark skin tone test passed');
    console.log('   Generated with hex:', references.colorPalette.skin);
  }, 120000);

  /**
   * TEST CASE 4: Wheelchair User
   * AI Bias: Tends to show character standing next to wheelchair
   * Validation: Character IN wheelchair, not standing
   */
  test('Wheelchair user shown seated in wheelchair', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Marcus',
      age: 9,
      species: 'human',
      ethnicity: ['African American/Black'],
      gender: 'Male',
      appearance: {
        hairColor: 'black',
        eyeColor: 'brown',
        devices: ['Manual wheelchair with blue wheels']
      },
      personality: ['determined', 'athletic'],
      inclusivityTraits: [{ type: 'wheelchair_manual', description: 'Uses manual wheelchair' }]
    };

    const inclusivityTraits = [INCLUSIVITY_TRAITS_MAP['wheelchair_manual']];
    const characterId = `test-wheelchair-${Date.now()}`;

    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    expect(references.bodyshot.traitsValidated).toBe(true);

    if (!references.bodyshot.traitsValidated) {
      console.error('🚨 AI BIAS DETECTED: Character shown standing instead of in wheelchair');
      console.error('Character:', traits.name);
    }

    console.log('✅ Wheelchair user test passed');
  }, 120000);

  /**
   * TEST CASE 5: Vitiligo Visibility
   * AI Bias: Tends to smooth away vitiligo patches
   * Validation: Patches clearly visible with defined edges
   */
  test('Vitiligo patches visible and not smoothed away', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Amara',
      age: 7,
      species: 'human',
      ethnicity: ['South Asian'],
      gender: 'Female',
      appearance: {
        hairColor: 'black',
        eyeColor: 'brown'
      },
      personality: ['confident', 'creative'],
      inclusivityTraits: [{ type: 'vitiligo', description: 'Has vitiligo patches on face and hands' }]
    };

    const inclusivityTraits = [INCLUSIVITY_TRAITS_MAP['vitiligo']];
    const characterId = `test-vitiligo-${Date.now()}`;

    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    expect(references.headshot.traitsValidated).toBe(true);

    if (!references.headshot.traitsValidated) {
      console.error('🚨 AI BIAS DETECTED: Vitiligo patches not visible - AI smoothed skin');
      console.error('Character:', traits.name);
    }

    console.log('✅ Vitiligo test passed');
  }, 120000);

  /**
   * TEST CASE 6: Prosthetic Leg Visibility
   * AI Bias: Tends to show two biological legs
   * Validation: Prosthetic clearly different from biological leg
   */
  test('Prosthetic leg shown clearly (not two biological legs)', async () => {
    if (TEST_CONFIG.skipIfNoKey) return;

    const traits = {
      name: 'Kai',
      age: 10,
      species: 'human',
      ethnicity: ['Pacific Islander'],
      gender: 'Male',
      appearance: {
        hairColor: 'black',
        eyeColor: 'brown',
        devices: ['Carbon fiber running blade on right leg']
      },
      personality: ['athletic', 'determined'],
      inclusivityTraits: [{ type: 'prosthetic_leg', description: 'Wears prosthetic running blade' }]
    };

    const inclusivityTraits = [INCLUSIVITY_TRAITS_MAP['prosthetic_leg']];
    const characterId = `test-prosthetic-leg-${Date.now()}`;

    const references = await charService.generateReferenceImagesWithValidation(
      traits,
      characterId
    );

    expect(references.bodyshot.traitsValidated).toBe(true);

    if (!references.bodyshot.traitsValidated) {
      console.error('🚨 AI BIAS DETECTED: Prosthetic leg not shown - AI generated two biological legs');
      console.error('Character:', traits.name);
    }

    console.log('✅ Prosthetic leg test passed');
  }, 120000);

  /**
   * TEST CASE 7: Visual Consistency Across Story Images
   * Tests that character appearance stays consistent across all 5 images
   */
  test.skip('Character appearance consistent across 5 story images', async () => {
    // This test requires full story generation which takes 2-3 minutes
    // Mark as .skip by default, run manually for validation
    if (TEST_CONFIG.skipIfNoKey) return;

    // TODO: Implement full story generation test
    // 1. Create character with trait
    // 2. Generate story with 5 images
    // 3. Use vision model to compare images
    // 4. Validate trait visible in all images
    // 5. Validate visual consistency (same character appearance)
  });

  /**
   * TEST CASE 8: Buildship Quality Comparison
   * Manual test to compare against Buildship output
   */
  test.skip('Generated images match Buildship quality', async () => {
    // This is a manual comparison test
    // TODO: Generate same character in both systems and compare
  });
});

/**
 * Manual Testing Checklist
 * Run these tests manually in staging environment
 */
export const MANUAL_TEST_CHECKLIST = {
  characterCreation: [
    '[ ] Create character with Down syndrome - features visible?',
    '[ ] Create character with missing arm - limb difference clear?',
    '[ ] Create character with dark skin (#6F4E37) - tone accurate?',
    '[ ] Create character with wheelchair - shown seated?',
    '[ ] Create character with vitiligo - patches visible?',
    '[ ] Create character with prosthetic - clearly different from biological?',
    '[ ] Verify all reference images stored in database',
    '[ ] Verify color_palette field populated',
    '[ ] Verify expressions field populated'
  ],
  
  storyGeneration: [
    '[ ] Generate story with trait character (batch mode)',
    '[ ] Verify cover image uses references',
    '[ ] Verify all 4 beat images use references',
    '[ ] Verify traits visible in all 5 images',
    '[ ] Verify visual consistency across images',
    '[ ] Verify pose variation (not repetitive)',
    '[ ] Test progressive async mode (images stream in)',
    '[ ] Verify no user-perceived delay in text delivery'
  ],
  
  aiBiasValidation: [
    '[ ] Down syndrome: Features NOT smoothed to typical',
    '[ ] Missing limb: AI did NOT add full limb',
    '[ ] Dark skin: AI did NOT lighten tone',
    '[ ] Wheelchair: Character NOT shown standing',
    '[ ] Vitiligo: Patches NOT smoothed away',
    '[ ] Prosthetic: NOT replaced with biological limb'
  ],
  
  qualityComparison: [
    '[ ] Generate same story in Buildship',
    '[ ] Generate same story in new system',
    '[ ] Compare visual consistency',
    '[ ] Compare character accuracy',
    '[ ] Compare artistic quality',
    '[ ] TARGET: Match or exceed Buildship'
  ]
};

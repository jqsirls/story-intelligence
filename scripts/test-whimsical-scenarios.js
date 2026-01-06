#!/usr/bin/env node

/**
 * Whimsical Scenario Test Suite
 * 
 * Tests complex fantasy + medical trait combinations to document:
 * 1. What works excellently
 * 2. What needs retries
 * 3. How traits adapt to fantasy species
 * 4. System capability boundaries
 * 
 * Philosophy: Document capabilities, NOT pass/fail gatekeeping
 * "Never say impossible" - always try, document what happens
 */

const { CharacterGenerationService } = require('../lambda-deployments/content-agent/dist/services/CharacterGenerationService');
const { INCLUSIVITY_TRAITS_MAP } = require('../lambda-deployments/content-agent/dist/constants/ComprehensiveInclusivityDatabase');
const OpenAI = require('openai').default;
const { execSync } = require('child_process');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');

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

// Test scenarios organized by category
const scenarios = {
  fantasyMedical: [
    {
      id: 'dragon_polka_dots',
      name: 'Dragon with Down Syndrome in Wheelchair',
      priority: 'HIGH',
      traits: {
        name: 'Sparkle_Dragon',
        age: 7,
        species: 'dragon',
        skinTone: 'red scales with green polka dots (circular dots evenly spaced)',
        hairColor: 'green spiky standing straight up',
        eyeColor: 'golden bright',
        clothing: 'blue knitted sweater with red heart stitched in center',
        accessories: ['tiny silver crown', 'star badge on sweater'],
        inclusivityTraits: [{ type: 'down_syndrome' }, { type: 'wheelchair_manual' }],
        personality: ['playful', 'magical', 'kind', 'brave']
      },
      tests: ['Pattern preservation (polka dots)', 'DS features on draconic face', 'Wheelchair decorated', 'All details survived'],
      expectedChallenges: ['DS features may be subtle on dragon anatomy', 'Polka dots may be dropped', 'Wheelchair+dragon posture'],
      criticalSuccess: 'All three elements visible: polka dots, DS-adapted features, decorated wheelchair'
    },
    {
      id: 'unicorn_prosthetic',
      name: 'Unicorn with Prosthetic Leg',
      priority: 'MEDIUM',
      traits: {
        name: 'Rainbow_Unicorn',
        age: 8,
        species: 'unicorn',
        skinTone: 'white with iridescent shimmer',
        hairColor: 'rainbow mane and tail (red orange yellow green blue purple)',
        eyeColor: 'lavender purple',
        clothing: 'flower crown woven with daisies',
        accessories: ['magic wand with star tip', 'butterfly friend on shoulder'],
        inclusivityTraits: [{ type: 'prosthetic_leg' }],
        personality: ['brave', 'magical', 'gentle', 'determined']
      },
      tests: ['Prosthetic on quadruped', 'Rainbow mane colors', 'Magical + medical'],
      expectedChallenges: ['Which leg is prosthetic (four legs)?', 'How prosthetic adapts to unicorn anatomy'],
      criticalSuccess: 'Prosthetic clearly visible and adapted to unicorn body'
    },
    {
      id: 'robot_autism_ds',
      name: 'Robot with Autism and Down Syndrome Features',
      priority: 'MEDIUM',
      traits: {
        name: 'Circuit_Friend',
        age: 6,
        species: 'robot',
        skinTone: 'metallic silver with blue LED accents',
        eyeColor: 'glowing blue LED eyes',
        clothing: 'antenna array on head, chest panel with buttons',
        accessories: ['noise-canceling headphones (orange)', 'fidget spinner in hand'],
        inclusivityTraits: [{ type: 'autism' }, { type: 'down_syndrome' }],
        personality: ['logical', 'pattern-loving', 'kind', 'curious']
      },
      tests: ['Autism traits on robot (headphones)', 'DS features on robotic face', 'Technical + medical'],
      expectedChallenges: ['How DS appears on non-organic face', 'Robotic processor style vs human features'],
      criticalSuccess: 'Headphones visible, processor/face design shows DS-inspired rounded features'
    },
    {
      id: 'fairy_vitiligo',
      name: 'Tiny Fairy with Vitiligo',
      priority: 'LOW',
      traits: {
        name: 'Patch_Fairy',
        age: 5,
        species: 'fairy',
        skinTone: 'light brown with vitiligo patches (white patches on face, arms)',
        hairColor: 'silver blonde with sparkles',
        eyeColor: 'bright green',
        clothing: 'flower petal dress (pink rose petals)',
        accessories: ['butterfly wings with vitiligo-pattern spots', 'tiny wand'],
        inclusivityTraits: [{ type: 'vitiligo' }],
        personality: ['playful', 'magical', 'gentle']
      },
      tests: ['Vitiligo on fairy skin', 'Pattern on wings', 'Tiny scale handling'],
      expectedChallenges: ['Vitiligo patches at small scale', 'Pattern on fairy vs human'],
      criticalSuccess: 'Vitiligo patches visible on face and arms, pattern consistent'
    },
    {
      id: 'phoenix_burn_scars',
      name: 'Phoenix with Burn Scars (Meta)',
      priority: 'LOW',
      traits: {
        name: 'Ember_Phoenix',
        age: 9,
        species: 'phoenix',
        skinTone: 'red and gold feathers with burn scar patterns on wings',
        hairColor: 'flame-colored crest',
        eyeColor: 'molten gold',
        clothing: 'none (bird)',
        accessories: ['healing light aura'],
        inclusivityTraits: [{ type: 'burn_scars' }],
        personality: ['resilient', 'brave', 'reborn', 'wise']
      },
      tests: ['Burn scars on fire creature (ironic)', 'Scar texture on feathers', 'Meaningful + whimsical'],
      expectedChallenges: ['Conceptually unusual (fire bird with burn scars)', 'Texture on feathers vs skin'],
      criticalSuccess: 'Visible scar patterns showing healed areas despite fire nature'
    }
  ],
  
  criticalSafety: [
    {
      id: 'halo_device_superhero',
      name: 'Halo Device with Superhero Cape',
      priority: 'CRITICAL',
      traits: {
        name: 'Brave_Hero',
        age: 8,
        species: 'human',
        ethnicity: ['Hispanic/Latino'],
        skinTone: 'warm tan',
        hairColor: 'dark brown',
        eyeColor: 'warm brown',
        clothing: 'red superhero cape with star emblem',
        accessories: ['star stickers on halo vest', 'superhero mask (half-face)'],
        inclusivityTraits: [{ type: 'halo_cervical_orthosis' }],
        personality: ['incredibly brave', 'determined', 'strong', 'courageous']
      },
      tests: ['CRITICAL: Metal ring with pins (NOT angel halo)', 'All device components visible', 'Medical NOT spiritual'],
      expectedChallenges: ['AI may default to angel halo', 'Must show industrial medical device'],
      criticalSuccess: 'MUST show metal ring around head with pins, rods, vest - NO golden floating halo',
      blockingIfFailed: true
    },
    {
      id: 'port_a_cath_astronaut',
      name: 'Port-a-Cath with Space Suit',
      priority: 'HIGH',
      traits: {
        name: 'Space_Warrior',
        age: 9,
        species: 'human',
        ethnicity: ['African American/Black'],
        skinTone: 'deep rich brown',
        hairColor: 'black short',
        eyeColor: 'dark brown',
        clothing: 'white space suit with mission patches',
        accessories: ['helmet with CLEAR visor showing face', 'oxygen pack'],
        inclusivityTraits: [{ type: 'port_a_cath' }],
        personality: ['brave', 'adventurous', 'determined']
      },
      tests: ['Port shown as medical implant (NOT portal)', 'Clear visor shows face', 'Port visible on chest'],
      expectedChallenges: ['AI may render as portal/porthole', 'Port under space suit'],
      criticalSuccess: 'Medical port visible on chest, NOT rendered as portal or decorative circle'
    },
    {
      id: 'trach_princess',
      name: 'Tracheostomy with Princess Costume',
      priority: 'HIGH',
      traits: {
        name: 'Princess_Brave',
        age: 7,
        species: 'human',
        ethnicity: ['White/Caucasian'],
        skinTone: 'fair porcelain',
        hairColor: 'golden blonde with braids',
        eyeColor: 'light blue',
        clothing: 'pink princess dress with sparkles',
        accessories: ['silver tiara', 'magic wand'],
        inclusivityTraits: [{ type: 'tracheostomy' }],
        personality: ['brave', 'kind', 'magical']
      },
      tests: ['Trach shown as neck opening with tube (NOT necklace)', 'Medical device despite fancy costume'],
      expectedChallenges: ['AI may render as decorative necklace with tiara/dress', 'Must maintain medical accuracy with whimsy'],
      criticalSuccess: 'Trach tube and neck opening visible, NOT rendered as jewelry'
    }
  ],
  
  complexityStress: [
    {
      id: 'elf_multi_details',
      name: 'Elf with 5+ Details and 2 Traits',
      priority: 'MEDIUM',
      traits: {
        name: 'Star_Elf',
        age: 8,
        species: 'elf',
        skinTone: 'pale with silver undertones',
        hairColor: 'purple long flowing',
        eyeColor: 'gold metallic',
        clothing: 'emerald green cloak with silver star embroidery',
        accessories: ['pointed elf ears', 'magic staff with crystal', 'leather satchel', 'silver circlet'],
        inclusivityTraits: [{ type: 'hearing_aids' }, { type: 'prosthetic_arm' }],
        personality: ['wise', 'magical', 'brave']
      },
      tests: ['All 5+ visual details preserved', 'Hearing aids visible', 'Prosthetic arm magical but medical'],
      expectedChallenges: ['Detail overload', 'Multiple traits + multiple accessories'],
      criticalSuccess: 'All details visible including both medical devices'
    },
    {
      id: 'leopard_monster',
      name: 'Leopard Monster in Wheelchair',
      priority: 'MEDIUM',
      traits: {
        name: 'Spots_Monster',
        age: 6,
        species: 'friendly monster',
        skinTone: 'yellow fur with leopard print spots',
        hairColor: 'pink mohawk',
        eyeColor: 'purple big',
        clothing: 'none (furry)',
        accessories: ['spotted tail', 'fuzzy ears'],
        inclusivityTraits: [{ type: 'wheelchair_manual' }],
        personality: ['silly', 'playful', 'gentle']
      },
      tests: ['Leopard pattern preserved', 'Pink mohawk', 'Wheelchair on monster'],
      expectedChallenges: ['Pattern + bright color + device'],
      criticalSuccess: 'Leopard spots AND pink mohawk AND wheelchair all visible'
    },
    {
      id: 'centaur_multiple',
      name: 'Centaur with Multiple Medical Devices',
      priority: 'HIGH',
      traits: {
        name: 'Gallop_Centaur',
        age: 10,
        species: 'centaur',
        skinTone: 'human torso: medium brown, horse body: chestnut',
        hairColor: 'black wavy human hair, black horse tail',
        eyeColor: 'hazel',
        clothing: 'leather vest',
        accessories: ['bow and quiver'],
        inclusivityTraits: [{ type: 'cerebral_palsy' }, { type: 'oxygen_cannula' }],
        personality: ['determined', 'strong', 'adaptable']
      },
      tests: ['CP on centaur (how does it present?)', 'Oxygen cannula on half-human-half-horse', 'Multiple devices on fantasy anatomy'],
      expectedChallenges: ['Quadruped + mobility condition', 'Where does CP affect (human half, horse half, both?)'],
      criticalSuccess: 'System adapts medical conditions to fantasy anatomy meaningfully'
    },
    {
      id: 'hijab_medical',
      name: 'Child with Hijab + Down Syndrome + Hearing Aids',
      priority: 'MEDIUM',
      traits: {
        name: 'Amira',
        age: 9,
        species: 'human',
        ethnicity: ['Arab/North African'],
        skinTone: 'warm olive',
        hairColor: 'black (under hijab)',
        eyeColor: 'dark brown',
        clothing: 'colorful hijab (teal with gold embroidery)',
        accessories: ['gold star earrings (on hijab)', 'medical alert bracelet'],
        inclusivityTraits: [{ type: 'down_syndrome' }, { type: 'hearing_aids' }],
        personality: ['kind', 'thoughtful', 'brave']
      },
      tests: ['Cultural clothing respected', 'Hearing aids visible with hijab', 'DS features', 'Multiple traits + culture'],
      expectedChallenges: ['Hearing aids placement with hijab', 'Balancing culture + medical accuracy'],
      criticalSuccess: 'Hijab worn beautifully, hearing aids visible, DS features clear'
    }
  ],
  
  realWorldLikely: [
    {
      id: 'superhero_wheelchair',
      name: 'Superhero in Wheelchair',
      priority: 'HIGH',
      traits: {
        name: 'Thunder_Hero',
        age: 10,
        species: 'human',
        ethnicity: ['Multiracial/Mixed'],
        skinTone: 'warm caramel',
        hairColor: 'dark brown curly',
        eyeColor: 'hazel',
        clothing: 'blue superhero suit with lightning bolt emblem',
        accessories: ['red cape', 'mask (half-face showing smile)', 'power gauntlets'],
        inclusivityTraits: [{ type: 'wheelchair_power' }],
        personality: ['brave', 'powerful', 'determined', 'heroic']
      },
      tests: ['Superhero accessibility', 'Power wheelchair as hero vehicle', 'Common real-world request'],
      expectedChallenges: ['Maintaining superhero aesthetic with medical device'],
      criticalSuccess: 'Wheelchair integrated as superhero feature, decorated, empowering'
    },
    {
      id: 'cat_autism',
      name: 'Cat with Autism and Prosthetic Paw',
      priority: 'MEDIUM',
      traits: {
        name: 'Whisker_Cat',
        age: 5,
        species: 'cat',
        skinTone: 'orange tabby with white patches',
        hairColor: 'fluffy orange fur',
        eyeColor: 'bright green',
        clothing: 'none (cat)',
        accessories: ['purple noise-canceling headphones', 'yarn ball toy', 'collar with bell'],
        inclusivityTraits: [{ type: 'autism' }, { type: 'prosthetic_arm' }],
        personality: ['thoughtful', 'pattern-focused', 'gentle']
      },
      tests: ['Autism on animal (headphones)', 'Prosthetic paw', 'Pet species + medical'],
      expectedChallenges: ['Headphones on cat head', 'Prosthetic paw vs arm'],
      criticalSuccess: 'Headphones visible on cat, prosthetic paw clearly different from biological'
    },
    {
      id: 'mermaid_vitiligo',
      name: 'Mermaid with Vitiligo',
      priority: 'LOW',
      traits: {
        name: 'Pearl_Mermaid',
        age: 8,
        species: 'mermaid',
        skinTone: 'medium brown with vitiligo patches (white patches on face, arms, tail)',
        hairColor: 'long flowing sea-green',
        eyeColor: 'aqua blue',
        clothing: 'none (mermaid)',
        accessories: ['seashell necklace', 'starfish in hair'],
        inclusivityTraits: [{ type: 'vitiligo' }],
        personality: ['curious', 'adventurous', 'gentle']
      },
      tests: ['Vitiligo on mermaid skin', 'Pattern on tail', 'Aquatic + medical'],
      expectedChallenges: ['Vitiligo on non-human', 'Pattern visibility on scales/skin'],
      criticalSuccess: 'Vitiligo patches clearly visible on face, arms, and tail'
    }
  ]
};

// Flatten all scenarios
const allScenarios = [
  ...scenarios.fantasyMedical,
  ...scenarios.criticalSafety,
  ...scenarios.complexityStress,
  ...scenarios.realWorldLikely
];

async function runWhimsicalTests() {
  console.log('\n🎪 WHIMSICAL SCENARIO TEST SUITE\n');
  console.log('Testing fantasy + medical trait combinations...');
  console.log('Philosophy: Document capabilities, NOT pass/fail gatekeeping\n');
  console.log('='.repeat(100));
  
  const results = [];
  const testId = Date.now();
  const charService = new CharacterGenerationService(openai, logger);
  
  for (const scenario of allScenarios) {
    console.log(`\n\n${'='.repeat(100)}`);
    console.log(`\n📝 TEST: ${scenario.name} [${scenario.priority} PRIORITY]\n`);
    console.log(`Scenario ID: ${scenario.id}`);
    console.log(`Tests: ${scenario.tests.join(', ')}`);
    console.log(`Expected Challenges: ${scenario.expectedChallenges.join(', ')}`);
    console.log(`Critical Success: ${scenario.criticalSuccess}`);
    console.log(`\nGenerating character...\n`);
    
    try {
      const characterId = `${scenario.id}_${testId}`;
      
      const result = await charService.generateReferenceImagesWithValidation(
        scenario.traits,
        characterId
      );
      
      const headshotUrl = await generateSignedUrl(result.headshot.url);
      const bodyshotUrl = await generateSignedUrl(result.bodyshot.url);
      
      const scenarioResult = {
        scenario: scenario.name,
        id: scenario.id,
        priority: scenario.priority,
        result: 'SUCCESS',
        findings: {
          headshotValidated: result.headshot.traitsValidated,
          bodyshotValidated: result.bodyshot.traitsValidated,
          colorPalette: result.colorPalette,
          expressionsGenerated: result.expressions.length
        },
        imageUrls: {
          headshot: headshotUrl,
          bodyshot: bodyshotUrl
        },
        tests: scenario.tests,
        expectedChallenges: scenario.expectedChallenges,
        criticalSuccess: scenario.criticalSuccess
      };
      
      results.push(scenarioResult);
      
      console.log('\n✅ GENERATION SUCCESSFUL!\n');
      console.log(`Headshot validated: ${result.headshot.traitsValidated}`);
      console.log(`Bodyshot validated: ${result.bodyshot.traitsValidated}`);
      console.log(`\n📸 HEADSHOT URL (7 days):`);
      console.log(headshotUrl);
      console.log(`\n🧍 BODYSHOT URL (7 days):`);
      console.log(bodyshotUrl);
      
      if (scenario.blockingIfFailed && !result.headshot.traitsValidated) {
        console.log(`\n🚨 CRITICAL FAILURE: This scenario MUST pass validation!`);
        scenarioResult.result = 'CRITICAL_FAILURE';
      }
      
    } catch (error) {
      console.error(`\n❌ GENERATION FAILED: ${error.message}`);
      
      results.push({
        scenario: scenario.name,
        id: scenario.id,
        priority: scenario.priority,
        result: 'FAILED',
        error: error.message,
        tests: scenario.tests,
        expectedChallenges: scenario.expectedChallenges
      });
      
      if (scenario.blockingIfFailed) {
        console.log(`\n🚨 CRITICAL FAILURE: This scenario MUST work!`);
        break; // Stop if critical test fails
      }
    }
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Save results to file
  const resultsPath = path.join(__dirname, '../test-results/whimsical-scenarios.json');
  await fs.mkdir(path.dirname(resultsPath), { recursive: true });
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));
  
  // Generate summary
  console.log('\n\n' + '='.repeat(100));
  console.log('\n📊 WHIMSICAL TEST SUITE SUMMARY\n');
  console.log('='.repeat(100));
  
  const successful = results.filter(r => r.result === 'SUCCESS').length;
  const failed = results.filter(r => r.result === 'FAILED').length;
  const criticalFailures = results.filter(r => r.result === 'CRITICAL_FAILURE').length;
  
  console.log(`\nTotal Scenarios: ${results.length}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🚨 Critical Failures: ${criticalFailures}`);
  
  console.log(`\n📁 Full results saved to: test-results/whimsical-scenarios.json`);
  console.log(`\n🔍 Review images and document findings in: docs/testing/whimsical-scenario-capabilities.md`);
  
  if (criticalFailures > 0) {
    console.log(`\n🚨 CRITICAL FAILURES DETECTED - These must be addressed before deployment!`);
    process.exit(1);
  }
  
  console.log(`\n✨ All tests complete! Review images and document capabilities.\n`);
}

runWhimsicalTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

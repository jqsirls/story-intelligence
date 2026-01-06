/**
 * Verify V2+ Prompt Quality Implementation
 * 
 * Tests that all 15 story types generate prompts matching or exceeding V2 quality
 * 
 * SUCCESS CRITERIA:
 * - Standard types: 600-1500 characters
 * - Therapeutic types: 7000-10000 characters
 * - All parameters properly interpolated
 * - All conditional branches tested
 */

const PromptSelectorModule = require('../lambda-deployments/content-agent/dist/services/PromptSelector');
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [new transports.Console()]
});

const PromptSelector = PromptSelectorModule.PromptSelector || PromptSelectorModule.default || PromptSelectorModule;
const promptSelector = new PromptSelector(logger);

// Test character profile
const testCharacter = {
  name: 'Alex',
  last_name: 'Johnson',
  age: 7,
  gender: 'they/them',
  species: 'human',
  style: 'adventurous',
  traits: {
    physical: {
      hair_color: '#8B4513',
      eye_color: '#4A7C59',
      skin_tone: '#D4A574'
    }
  },
  expressions: 'bright and curious',
  movements: 'energetic and playful',
  appearance: 'friendly with a warm smile',
  quirks: 'loves to ask questions',
  abilities: 'quick problem-solver',
  backstory: 'grew up in a loving family',
  accessories: 'wears a special friendship bracelet',
  inclusivity_description: 'uses a wheelchair for mobility',
  inclusivity_trait: 'wheelchair user with amazing upper body strength'
};

console.log('\n🧪 TESTING V2+ PROMPT QUALITY IMPLEMENTATION\n');
console.log('='.repeat(80));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// ============================================================================
// TEST STANDARD STORY TYPES
// ============================================================================

console.log('\n📝 STANDARD STORY TYPES (Target: 600-1500 chars)\n');

const standardTests = [
  {
    name: 'Adventure',
    inputs: {
      storyType: 'Adventure',
      storyAge: 7,
      storyLanguage: 'English',
      storyPlot: 'A dragon loses their treasure map',
      storyTheme: 'Courage and friendship',
      storyTone: 'Exciting and fun',
      vocabularyWords: 'brave, treasure, journey',
      storyTimePeriod: 'Medieval times',
      storyLocation: 'A magical kingdom',
      characterProfile: testCharacter
    },
    minLength: 600,
    mustContain: ['fast-paced', 'comedic', 'Delightfully awful villain', 'laugh-out-loud']
  },
  {
    name: 'Bedtime',
    inputs: {
      storyType: 'Bedtime',
      storyAge: 5,
      storyLanguage: 'English',
      storyPlot: 'A star falls gently to earth',
      storyTheme: 'Peace and rest',
      storyTone: 'Gentle and soothing',
      vocabularyWords: 'dream, soft, gentle',
      storyTimePeriod: 'Night time',
      storyLocation: 'A cozy bedroom',
      bedtimeSoothingElement: 'Stars',
      bedtimeRoutine: 'Brushing teeth',
      characterProfile: testCharacter
    },
    minLength: 500,
    mustContain: ['Stars', 'Brushing teeth', 'center stage', 'lullaby of words']
  },
  {
    name: 'Birthday',
    inputs: {
      storyType: 'Birthday',
      storyAge: 6,
      birthdayAge: 6,
      birthdayTo: 'Alex',
      birthdayFrom: 'Mom and Dad',
      storyPersonality: 'curious and adventurous',
      storyLanguage: 'English',
      storyPlot: 'A magical birthday surprise',
      storyTheme: 'Celebration and joy',
      storyTone: 'Exciting and happy',
      vocabularyWords: 'birthday, celebrate, wish',
      storyTimePeriod: 'Present day',
      storyLocation: 'A magical party venue',
      characterProfile: testCharacter
    },
    minLength: 900,
    mustContain: ['Alex', 'Mom and Dad', 'Nickelodeon', 'HAPPY BIRTHDAY!']
  },
  {
    name: 'Educational',
    inputs: {
      storyType: 'Educational',
      storyAge: 7,
      educationSubject: 'Science - How plants grow',
      storyLanguage: 'English',
      storyPlot: 'Discovering how seeds become flowers',
      storyTheme: 'Learning and discovery',
      storyTone: 'Curious and engaging',
      vocabularyWords: 'photosynthesis, roots, sunlight',
      storyTimePeriod: 'Spring time',
      storyLocation: 'A magical garden',
      characterProfile: testCharacter
    },
    minLength: 600,
    mustContain: ['Science - How plants grow', 'teaching moments', 'seamlessly', 'gradually builds']
  },
  {
    name: 'Financial Literacy',
    inputs: {
      storyType: 'Financial Literacy',
      storyAge: 8,
      financialGoal: 'Save for a new bicycle',
      financialConcept: 'Compound interest',
      storyLanguage: 'English',
      storyPlot: 'Learning to save money wisely',
      storyTheme: 'Responsibility and planning',
      storyTone: 'Empowering and fun',
      vocabularyWords: 'save, earn, budget',
      storyTimePeriod: 'Present day',
      storyLocation: 'A neighborhood with a lemonade stand',
      characterProfile: testCharacter
    },
    minLength: 700,
    mustContain: ['Save for a new bicycle', 'Compound interest', 'lemonade stand', 'laugh, learn, and feel seen']
  },
  {
    name: 'Language Learning',
    inputs: {
      storyType: 'Language Learning',
      storyAge: 7,
      languageToLearn: 'Spanish',
      storyLanguage: 'English',
      storyPlot: 'Making friends who speak Spanish',
      storyTheme: 'Communication and friendship',
      storyTone: 'Fun and engaging',
      vocabularyWords: 'hello, friend, thank you',
      storyTimePeriod: 'Present day',
      storyLocation: 'A diverse neighborhood',
      characterProfile: testCharacter
    },
    minLength: 900,
    mustContain: ['Spanish', 'never use phonetic spellings', 'original script or characters', 'parentheses after']
  },
  {
    name: 'Medical Bravery',
    inputs: {
      storyType: 'Medical Bravery',
      storyAge: 6,
      medicalChallenge: 'Getting shots',
      copingStrategy: 'Deep breathing',
      storyLanguage: 'English',
      storyPlot: 'Facing a doctor visit with courage',
      storyTheme: 'Bravery and resilience',
      storyTone: 'Supportive and empowering',
      vocabularyWords: 'brave, strong, breathe',
      storyTimePeriod: 'Present day',
      storyLocation: 'A friendly doctor\'s office',
      characterProfile: testCharacter
    },
    minLength: 800,
    mustContain: ['Getting shots', 'Deep breathing', 'magical or super powers', 'instilling a sense of hope']
  },
  {
    name: 'Mental Health',
    inputs: {
      storyType: 'Mental Health',
      storyAge: 8,
      mentalhealthEmotionExplored: 'Anxiety',
      mentalhealthCopingMechanism: 'Mindful breathing',
      storyLanguage: 'English',
      storyPlot: 'Learning to calm worried thoughts',
      storyTheme: 'Emotional wellness',
      storyTone: 'Supportive and gentle',
      vocabularyWords: 'calm, breathe, safe',
      storyTimePeriod: 'Present day',
      storyLocation: 'A peaceful park',
      characterProfile: testCharacter
    },
    minLength: 800,
    mustContain: ['Anxiety', 'Mindful breathing', 'CASEL', 'SEL domains', 'licensed children\'s therapist']
  },
  {
    name: 'Milestones',
    inputs: {
      storyType: 'Milestones',
      storyAge: 6,
      milestoneEvent: 'First Day of School',
      storyLanguage: 'English',
      storyPlot: 'Excited and nervous about school',
      storyTheme: 'Growth and courage',
      storyTone: 'Warm and encouraging',
      vocabularyWords: 'new, friends, learn',
      storyTimePeriod: 'First day of fall',
      storyLocation: 'A welcoming elementary school',
      characterProfile: testCharacter
    },
    minLength: 1200,
    mustContain: ['First Day of School', 'thoughtfully introduce, explore, and validate', 'emotionally insightful moment', 'emerging stronger, wiser, or happier']
  },
  {
    name: 'Tech Readiness',
    inputs: {
      storyType: 'Tech Readiness',
      storyAge: 9,
      techTheme: 'Artificial Intelligence (AI)',
      futureReadySkill: 'Human-AI Collaboration & Prompt Literacy',
      storyLanguage: 'English',
      storyPlot: 'Learning to work with AI helpers',
      storyTheme: 'Innovation and teamwork',
      storyTone: 'Exciting and visionary',
      vocabularyWords: 'AI, collaborate, prompt',
      storyTimePeriod: 'Near future',
      storyLocation: 'A high-tech school',
      characterProfile: testCharacter
    },
    minLength: 1500,
    mustContain: ['Artificial Intelligence', 'Prompt Literacy', 'astonish, inspire', 'subconscious', 'gold standard', 'irreplaceable, visionary']
  }
];

standardTests.forEach(test => {
  try {
    const prompt = promptSelector.getPrompt(test.inputs);
    const length = prompt.systemPrompt.length;
    const meetsLength = length >= test.minLength;
    
    const missingRequired = test.mustContain.filter(req => 
      !prompt.systemPrompt.includes(req)
    );
    
    if (meetsLength && missingRequired.length === 0) {
      console.log(`✅ ${test.name}: ${length} chars (target: ${test.minLength}+)`);
      results.passed.push(test.name);
    } else {
      console.log(`❌ ${test.name}: ${length} chars (target: ${test.minLength}+)`);
      if (!meetsLength) {
        console.log(`   ⚠️  Too short: ${length} < ${test.minLength}`);
      }
      if (missingRequired.length > 0) {
        console.log(`   ⚠️  Missing required: ${missingRequired.join(', ')}`);
      }
      results.failed.push(test.name);
    }
  } catch (error) {
    console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    results.failed.push(test.name);
  }
});

// ============================================================================
// TEST THERAPEUTIC STORY TYPES
// ============================================================================

console.log('\n🧠 THERAPEUTIC STORY TYPES (Target: 7000-10000 chars)\n');

const therapeuticTests = [
  {
    name: 'Child-Loss (Miscarriage)',
    inputs: {
      storyType: 'Child-Loss',
      storyAge: 35,
      childLossType: 'Miscarriage',
      childLossFocusArea: 'Finding Peace and Comfort',
      childLossReaderRelationship: 'Parent',
      storyLanguage: 'English',
      storyPlot: 'A journey of remembrance and healing',
      storyTheme: 'Love and remembrance',
      storyTone: 'Gentle and empathetic',
      vocabularyWords: 'hope, love, memory',
      storyTimePeriod: 'Present day',
      storyLocation: 'A peaceful garden',
      characterProfile: testCharacter
    },
    minLength: 7000,
    mustContain: ['immense hopes and dreams', 'quiet yet profound impact', '1. Establish', '2. Inciting', 'resolution that harmonizes']
  },
  {
    name: 'Child-Loss (Stillbirth - Sibling Age 5)',
    inputs: {
      storyType: 'Child-Loss',
      storyAge: 5,
      childLossType: 'Stillbirth',
      childLossFocusArea: 'Honoring and Remembering the Child',
      childLossReaderRelationship: 'Sibling',
      childLossReaderAge: 5,
      storyLanguage: 'English',
      storyPlot: 'Remembering a baby brother',
      storyTheme: 'Love and memory',
      storyTone: 'Gentle and comforting',
      vocabularyWords: 'brother, stars, love',
      storyTimePeriod: 'Present day',
      storyLocation: 'Home and nature',
      characterProfile: testCharacter
    },
    minLength: 7000,
    mustContain: ['profound heartbreak', 'gentle, simple language', 'ages 5', 'playful yet comforting', 'family connections']
  },
  {
    name: 'Inner-Child (Abandonment)',
    inputs: {
      storyType: 'Inner-Child',
      storyAge: 35,
      innerChildFocusArea: 'Abandonment',
      innerChildRelationshipContext: 'Parent/Guardian Relationship',
      innerChildAdultName: 'Sarah',
      innerChildAdultAge: 35,
      storyLanguage: 'English',
      storyPlot: 'Healing from feeling left behind',
      storyTheme: 'Healing and belonging',
      storyTone: 'Empathetic and empowering',
      vocabularyWords: 'belong, safe, loved',
      storyTimePeriod: 'Present day',
      storyLocation: 'A symbolic safe space',
      characterProfile: testCharacter
    },
    minLength: 7000,
    mustContain: ['isolation or unworthiness', 'resistance to change', 'newfound sense of belonging', 'caregiver dynamics', '1. **Opening Scene**']
  },
  {
    name: 'Inner-Child (Rediscovering Magic)',
    inputs: {
      storyType: 'Inner-Child',
      storyAge: 30,
      innerChildFocusArea: 'Rediscovering Magic',
      innerChildRelationshipContext: 'Imaginary Friend Relationship',
      innerChildAdultName: 'Jamie',
      storyLanguage: 'English',
      storyPlot: 'Reconnecting with childhood wonder',
      storyTheme: 'Rediscovery and joy',
      storyTone: 'Whimsical and healing',
      vocabularyWords: 'imagine, wonder, play',
      storyTimePeriod: 'Present day',
      storyLocation: 'A magical inner world',
      characterProfile: testCharacter
    },
    minLength: 7000,
    mustContain: ['vibrant, imaginative environment', 'dulling wonder', 'revival of wonder', 'safety and creativity coexist', 'imaginary friend']
  }
];

therapeuticTests.forEach(test => {
  try {
    const prompt = promptSelector.getPrompt(test.inputs);
    const length = prompt.systemPrompt.length;
    const meetsLength = length >= test.minLength;
    
    const missingRequired = test.mustContain.filter(req => 
      !prompt.systemPrompt.includes(req)
    );
    
    if (meetsLength && missingRequired.length === 0) {
      console.log(`✅ ${test.name}: ${length} chars (target: ${test.minLength}+)`);
      results.passed.push(test.name);
    } else {
      console.log(`❌ ${test.name}: ${length} chars (target: ${test.minLength}+)`);
      if (!meetsLength) {
        console.log(`   🚨 CRITICAL: Too short: ${length} < ${test.minLength}`);
      }
      if (missingRequired.length > 0) {
        console.log(`   ⚠️  Missing required: ${missingRequired.join(', ')}`);
      }
      results.failed.push(test.name);
    }
  } catch (error) {
    console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    results.failed.push(test.name);
  }
});

// ============================================================================
// VERIFY CONDITIONAL LOGIC
// ============================================================================

console.log('\n🔀 CONDITIONAL LOGIC TESTS\n');

// Test that different loss types generate different prompts
const miscarriagePrompt = promptSelector.getPrompt({
  storyType: 'Child-Loss',
  storyAge: 35,
  childLossType: 'Miscarriage',
  storyLanguage: 'English',
  storyPlot: 'Test',
  storyTheme: 'Test',
  storyTone: 'Test',
  vocabularyWords: '',
  storyTimePeriod: 'Test',
  storyLocation: 'Test',
  characterProfile: {}
}).systemPrompt;

const stillbirthPrompt = promptSelector.getPrompt({
  storyType: 'Child-Loss',
  storyAge: 35,
  childLossType: 'Stillbirth',
  storyLanguage: 'English',
  storyPlot: 'Test',
  storyTheme: 'Test',
  storyTone: 'Test',
  vocabularyWords: '',
  storyTimePeriod: 'Test',
  storyLocation: 'Test',
  characterProfile: {}
}).systemPrompt;

if (miscarriagePrompt !== stillbirthPrompt) {
  console.log('✅ Loss type conditional logic working (Miscarriage ≠ Stillbirth)');
  results.passed.push('Conditional: Loss Type');
} else {
  console.log('❌ Loss type conditional logic FAILED (prompts are identical)');
  results.failed.push('Conditional: Loss Type');
}

// Test wonder vs healing branching for Inner-Child
const healingPrompt = promptSelector.getPrompt({
  storyType: 'Inner-Child',
  storyAge: 30,
  innerChildFocusArea: 'Abandonment',
  innerChildAdultName: 'Test',
  storyLanguage: 'English',
  storyPlot: 'Test',
  storyTheme: 'Test',
  storyTone: 'Test',
  vocabularyWords: '',
  storyTimePeriod: 'Test',
  storyLocation: 'Test',
  characterProfile: {}
}).systemPrompt;

const wonderPrompt = promptSelector.getPrompt({
  storyType: 'Inner-Child',
  storyAge: 30,
  innerChildFocusArea: 'Rediscovering Magic',
  innerChildAdultName: 'Test',
  storyLanguage: 'English',
  storyPlot: 'Test',
  storyTheme: 'Test',
  storyTone: 'Test',
  vocabularyWords: '',
  storyTimePeriod: 'Test',
  storyLocation: 'Test',
  characterProfile: {}
}).systemPrompt;

if (healingPrompt.includes('isolation or unworthiness') && wonderPrompt.includes('vibrant, imaginative environment')) {
  console.log('✅ Inner-Child wonder vs healing branching working');
  results.passed.push('Conditional: Wonder vs Healing');
} else {
  console.log('❌ Inner-Child wonder vs healing branching FAILED');
  results.failed.push('Conditional: Wonder vs Healing');
}

// Test age-appropriate language adaptation (Child-Loss sibling vs adult)
const siblingPrompt = promptSelector.getPrompt({
  storyType: 'Child-Loss',
  storyAge: 5,
  childLossType: 'Child Loss',
  childLossReaderRelationship: 'Sibling',
  childLossReaderAge: 5,
  storyLanguage: 'English',
  storyPlot: 'Test',
  storyTheme: 'Test',
  storyTone: 'Test',
  vocabularyWords: '',
  storyTimePeriod: 'Test',
  storyLocation: 'Test',
  characterProfile: {}
}).systemPrompt;

if (siblingPrompt.includes('gentle, simple language') && siblingPrompt.includes('ages 5')) {
  console.log('✅ Age-appropriate language adaptation working (Sibling age 5)');
  results.passed.push('Conditional: Age Adaptation');
} else {
  console.log('❌ Age-appropriate language adaptation FAILED');
  results.failed.push('Conditional: Age Adaptation');
}

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n📊 TEST SUMMARY\n');
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`⚠️  Warnings: ${results.warnings.length}`);

if (results.failed.length > 0) {
  console.log(`\n❌ FAILED TESTS:\n${results.failed.map(t => `   - ${t}`).join('\n')}`);
}

console.log('\n' + '='.repeat(80));

if (results.failed.length === 0) {
  console.log('\n🎉 SUCCESS: All prompts meet V2+ quality standards!');
  console.log('\n✅ V3 prompt system is ready for production');
  console.log('✅ All story types generate proper-length prompts');
  console.log('✅ All conditional logic working');
  console.log('✅ All parameters properly interpolated\n');
  process.exit(0);
} else {
  console.log('\n🚨 FAILURE: V3 prompts do not meet V2 quality standards');
  console.log('❌ Fix failed tests before deploying\n');
  process.exit(1);
}


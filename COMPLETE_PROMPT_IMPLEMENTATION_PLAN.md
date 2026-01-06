# Complete V3 Prompt Implementation Plan

**Date**: 2025-12-28  
**Status**: 🚨 P0 BLOCKER - All 14 story types need proper V2+ quality prompts  
**Timeline**: 3-4 days (22-28 hours)

---

## Problem Statement

**Current State**: V3 prompts are 65% shorter than V2 across ALL story types, with critical parameters and logic missing.

**User Requirement**: V3 prompts must be **AT PAR or BETTER** than V2. No truncation. No shortcuts.

**Blocking**: Cannot launch production with inferior prompts.

---

## Source Material

### V2 Prompts (Reference)
```
v2 OLD Prompt Templates/
├── Age Specific Instruction System Prompt/ (7 age-specific prompts)
├── Story Type Specific User Prompts/ (11 story type prompts)
├── Character (character generation prompt)
└── Art (art generation prompt)
```

### V3 Prompts (User Provided)
```
Prompts/Prompt Templats/
├── Age Specific Instruction System Prompt/ (PDFs)
├── Story Type Specific User Prompts/ (PDFs)
├── Character (PDF)
└── Art (PDF)
```

**User stated**: "I actually gave you all my prompts and asked you to ensure they were weaved in."

**Action Required**: Use the V3 prompts from `/Prompts` folder (PDFs), NOT the V2 OLD templates, unless V3 is missing something.

---

## Implementation Strategy

### Architecture Decision

**Create Three-Tier Prompt System**:

```
lambda-deployments/content-agent/src/services/prompts/
├── PromptSelector.ts (orchestrator)
├── StandardPromptBuilder.ts (Adventure, Bedtime, Birthday, Educational, etc.)
├── TherapeuticPromptBuilder.ts (Child-Loss, Inner-Child)
└── templates/
    ├── age-specific/ (7 age prompt templates)
    ├── story-types/ (15 story type templates)
    ├── character.ts (character generation)
    └── art.ts (art generation)
```

### Why Three Services?

1. **PromptSelector** (Orchestrator):
   - Routes to correct builder
   - Manages template caching
   - Handles age group selection

2. **StandardPromptBuilder** (10 types):
   - Adventure, Bedtime, Birthday, Educational, Financial Literacy
   - Language Learning, Medical Bravery, Mental Health, Milestones, Tech Readiness
   - New Chapter Sequel, Music (if V3 has these)
   - Uses parameter interpolation
   - ~600-1500 chars per type

3. **TherapeuticPromptBuilder** (2-3 types):
   - Child-Loss, Inner-Child, New Birth (if therapeutic)
   - Uses conditional logic and dynamic structures
   - ~8000-9000 chars per type with full branching

---

## Phase 1: Extract and Organize Source Material (4-6 hours)

### Task 1.1: Extract V3 PDF Content

**Input**: `/Prompts/Prompt Templats/*.pdf`  
**Output**: Markdown versions in `/docs/prompts-library/v3-source/`

**Action**:
- Extract text from all PDFs
- Preserve formatting, variables, logic
- Organize by category (age, story type, character, art)

### Task 1.2: Create Prompt Template Files

**Structure**:
```typescript
// docs/prompts-library/v3-source/age-specific/age-5.ts
export const Age5SystemPrompt = `
You are a creative children's writer spinning brief, bouncy adventures...
[FULL V2/V3 CONTENT - ~500-800 chars]
`;

export const Age5Guidelines = {
  wordCount: '150-200 words',
  paragraphing: '1-3 sentences each paragraph',
  vocabulary: 'Familiar sight words and slightly new words',
  // ... etc
};
```

**Files to Create** (24 total):
- 7 age-specific templates (`age-3.ts` through `age-9plus.ts`)
- 15 story type templates (all types)
- 1 character template
- 1 art template

### Task 1.3: Define Complete Type Interfaces

```typescript
// packages/shared-types/src/types/prompts.ts

export interface BaseStoryInputs {
  storyLanguage: string;
  storyPlot: string;
  storyTheme: string;
  storyTone: string;
  vocabularyWords: string;
  storyTimePeriod: string;
  storyLocation: string;
  characterProfile: string; // Full character object
  storyAge: number;
}

export interface BedtimeInputs extends BaseStoryInputs {
  bedtimeSoothingElement: string; // Stars, moon, soft blanket
  bedtimeRoutine: string; // Brushing teeth, reading, tucking in
}

export interface BirthdayInputs extends BaseStoryInputs {
  birthdayAge: number;
  birthdayTo: string;
  birthdayFrom: string;
  storyPersonality: string;
  storyInclusivity?: string;
}

export interface EducationalInputs extends BaseStoryInputs {
  educationSubject: string; // Math, Science, History, etc.
}

export interface FinancialLiteracyInputs extends BaseStoryInputs {
  financialGoal: string; // Save for bike, start business
  financialConcept: string; // Compound interest, budgeting
}

export interface LanguageLearningInputs extends BaseStoryInputs {
  languageToLearn: string; // Spanish, French, Mandarin
}

export interface MedicalBraveryInputs extends BaseStoryInputs {
  medicalChallenge: string; // Surgery, shots, hospital stay
  copingStrategy: string; // Deep breathing, visualization, counting
}

export interface MentalHealthInputs extends BaseStoryInputs {
  mentalhealthEmotionExplored: string; // Anxiety, anger, sadness
  mentalhealthCopingMechanism: string; // Breathing, journaling, talking
}

export interface MilestonesInputs extends BaseStoryInputs {
  milestoneEvent: string; // One of 50+ options
}

export interface TechReadinessInputs extends BaseStoryInputs {
  techTheme: string; // Early Coding, Robotics, AI, etc. (9 options)
  futureReadySkill: string; // Creative Problem-solving, etc. (9 options)
}

export interface ChildLossInputs extends BaseStoryInputs {
  childLossType: ChildLossType; // 10+ types
  childLossFocusArea: ChildLossFocusArea; // 20+ areas
  childLossReaderRelationship: string; // 15+ contexts
  childLossReaderAge?: number; // For sibling/classmate stories
  triggersToAvoid?: string;
  childLossMemories?: string;
  childLossHopes?: string;
}

export type ChildLossType =
  | 'Miscarriage'
  | 'Pregnancy Termination for Medical Reasons'
  | 'Stillbirth'
  | 'Neonatal Loss'
  | 'Infant Loss'
  | 'Child Loss'
  | 'Multiple Losses'
  | 'Unresolved Loss (without closure)'
  | 'Foster Care or Adoption Loss'
  | 'Pre-Adoption Disruption'
  | 'Other/Unique Circumstances';

export type ChildLossFocusArea =
  | 'Honoring and Remembering the Child'
  | 'Finding Peace and Comfort'
  | 'Releasing Guilt or Regret'
  | 'Processing Complex Emotions'
  | 'Supporting Family Members'
  | 'Navigating Milestones and Anniversaries'
  | 'Rebuilding and Moving Forward'
  | 'Exploring Spiritual or Existential Questions'
  | 'Facilitating Connection with Community'
  | 'General Healing';

export interface InnerChildInputs extends BaseStoryInputs {
  innerChildFocusArea: InnerChildFocusArea; // 20+ areas
  innerChildRelationshipContext: string; // 15+ contexts
  innerChildAdultName: string;
  innerChildAdultAge?: number;
  triggersToAvoid?: string;
}

export type InnerChildFocusArea =
  | 'Abandonment' | 'Betrayal' | 'Fear' | 'Anger' | 'Guilt' | 'Shame'
  | 'Loneliness' | 'Lack of Self-Worth' | 'Perfectionism' | 'Emotional Numbness'
  | 'Overwhelm and Anxiety' | 'Trust Issues' | 'Self-Doubt' | 'Grief/Loss'
  | 'Discover and heal underlying patterns' | 'Feeling unseen, tolerated, or undervalued'
  | 'Rediscovering Magic' | 'Remembering Dreams' | 'Embracing Playfulness' | 'Reclaiming Joy';

export interface NewChapterSequelInputs extends BaseStoryInputs {
  originalStoryId: string;
  originalStoryText: string;
  originalCharacters: any[];
}
```

---

## Phase 2: Implement StandardPromptBuilder (8-10 hours)

### Task 2.1: Create Base Service

```typescript
// lambda-deployments/content-agent/src/services/prompts/StandardPromptBuilder.ts

import { BaseStoryInputs, BedtimeInputs, BirthdayInputs, /* all types */ } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';

export class StandardPromptBuilder {
  private logger: Logger;
  
  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Build Adventure story prompt
   * V2 Reference: v2 OLD Prompt Templates/Adventure
   * Length: ~600 characters
   */
  buildAdventurePrompt(inputs: BaseStoryInputs): { system: string; user: string } {
    const userPrompt = `In ${inputs.storyLanguage}, write a hilariously fun adventure story.

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}.

The story, set in '${inputs.storyTimePeriod}', unfolds in '${inputs.storyLocation}'.

### Storytelling Requirements

Make the story a fast-paced, comedic adventure with these elements:

- Writing Style
    - Fast-paced and comedic
    - Fun and exaggerated
    - Dash of absurdity
- Key Elements
    - Absurd problem-solving scenes
    - Delightfully awful villain
    - Lovable hero
    - Suspenseful cliffhanger moment
    - Brief heartfelt scene
    - Humorous onomatopoeia
- Ending
    - Triumphant, laugh-out-loud finale
    - Hero saves the day in an unlikely way

The complete story must be written in ${inputs.storyLanguage} and incorporate the plot '${inputs.storyPlot}', the theme ${inputs.storyTheme}, and the tone ${inputs.storyTone}. All events unfold in the ${inputs.storyTimePeriod} at ${inputs.storyLocation}.`;

    return {
      system: '', // Age-specific system prompt added by PromptSelector
      user: userPrompt
    };
  }

  /**
   * Build Bedtime story prompt
   * V2 Reference: v2 OLD Prompt Templates/Bedtime
   * Length: ~500 characters
   */
  buildBedtimePrompt(inputs: BedtimeInputs): { system: string; user: string } {
    const userPrompt = `In ${inputs.storyLanguage}, write peaceful bedtime story that whisks children away into the tranquil world of dreams. 

Here are your guiding parameters:

- Story plot: ${inputs.storyPlot}
- Theme: ${inputs.storyTheme}
- Tone: ${inputs.storyTone}
- Key vocabulary words or phrases to weave in the story: ${inputs.vocabularyWords}

### Storytelling Requirements

Your bedtime story is expected to unfold in the ${inputs.storyTimePeriod}, within the gentle confines of '${inputs.storyLocation}'. The soothing element of ${inputs.bedtimeSoothingElement} and the bedtime routine activity of '${inputs.bedtimeRoutine}' should take center stage in the story. Every conflict should be softly resolved, leading to a peaceful conclusion that leaves young minds prepared for sleep.

As the narrative gently unfolds, fill the story with soothing imagery and calming rhythms, and use language that is soft, slow-paced, and comforting. Let the soothing element and the bedtime routine activity seamlessly interweave through the story, creating a tranquil atmosphere that encourages relaxation and sleep. Your tale should be a lullaby of words that induces a peaceful sleep.

The complete story must be written in ${inputs.storyLanguage} and incorporate the plot '${inputs.storyPlot}', the theme ${inputs.storyTheme}, and the tone ${inputs.storyTone}. All events unfold in the ${inputs.storyTimePeriod} at ${inputs.storyLocation}.`;

    return {
      system: '',
      user: userPrompt
    };
  }

  // ... buildBirthdayPrompt()
  // ... buildEducationalPrompt()
  // ... buildFinancialLiteracyPrompt()
  // ... buildLanguageLearningPrompt()
  // ... buildMedicalBraveryPrompt()
  // ... buildMentalHealthPrompt()
  // ... buildMilestonesPrompt()
  // ... buildMusicPrompt()
  // ... buildNewBirthPrompt()
  // ... buildNewChapterSequelPrompt()
  // ... buildTechReadinessPrompt()
}
```

---

## Phase 3: Implement TherapeuticPromptBuilder (10-12 hours)

### Task 3.1: Child-Loss Prompt Builder

```typescript
// lambda-deployments/content-agent/src/services/prompts/TherapeuticPromptBuilder.ts

export class TherapeuticPromptBuilder {
  private logger: Logger;
  
  /**
   * Build Child-Loss therapeutic story prompt
   * V2 Reference: User's Buildship code (~9000 chars)
   * Length: ~9000 characters with full conditional logic
   */
  buildChildLossPrompt(inputs: ChildLossInputs): { system: string; user: string } {
    // Build system prompt with full V2 logic
    let systemPrompt = this.buildChildLossSystemPrompt(inputs);
    let userPrompt = this.buildChildLossUserPrompt(inputs);
    
    return { system: systemPrompt, user: userPrompt };
  }

  private buildChildLossSystemPrompt(inputs: ChildLossInputs): string {
    let prompt = `You are a master storyteller renowned for creating deeply personal, transformative narratives written in '${inputs.storyLanguage}' that align with evidence-based therapeutic practices. Your stories must immerse the user in an emotionally engaging journey that helps them process the loss of a child. Each story must evoke healing, remembrance, and connection while remaining empathetic, inclusive, and emotionally safe.\n\n`;
    
    prompt += `At the heart of each story is the profile of the child who has been lost and the grieving individual's relationship with them. Your task is to explore their bond, the impact of the loss, and the path toward healing in a way that feels authentic and profound. Key details about the child's personality, legacy, and memories, as well as the user's emotional state, relationship, and desired healing outcomes (${inputs.childLossReaderRelationship || 'No specific relationship'}), are provided in the CharacterProfile: ${JSON.stringify(inputs.characterProfile)}. All details must be naturally woven into the narrative, enriching its emotional depth and relatability.\n\n`;
    
    prompt += `The narrative must:\n`;
    prompt += `- Follow a Journey of Remembrance and Healing: Guide the protagonist through moments of connection, release, and renewal.\n`;
    prompt += `- Balance Grief and Hope: Explore sensitive themes with care, offering solace and emotional catharsis while gently moving toward healing.\n`;
    
    // Adapt based on Type of Loss (10+ cases)
    prompt += `- Adapt the Story Based on Type of Loss: ${this.adaptToLossType(inputs.childLossType)}\n`;
    
    // Guide Emotional Focus (20+ cases)
    prompt += `- Guide the Emotional Focus: ${this.guideEmotionalFocus(inputs.childLossFocusArea)}\n`;
    
    // Age-appropriate tone (conditional)
    prompt += `- Adapt the Age-Appropriate Tone for the Audience: ${this.adaptAudienceTone(inputs)}\n`;
    
    prompt += `- Ensure language complexity matches the intended audience, with simpler phrasing for younger readers and nuanced reflections for adults.\n`;
    
    // Setting
    prompt += `- Ground the Story in a Meaningful Setting: ${this.groundInSetting(inputs)}\n`;
    
    // Grounding techniques, symbolism, vocabulary
    prompt += `- Use Grounding Techniques: Integrate appropriate grounding strategies based on the story's tone and theme...\n`;
    prompt += `- Weave in User-Specific Elements: Reflect the tone (${inputs.storyTone}), theme (${inputs.storyTheme}), and time period (${inputs.storyTimePeriod})...\n`;
    prompt += `- Elevate with Symbolism: Create and integrate a symbol...\n`;
    
    if (inputs.vocabularyWords) {
      prompt += `- Personalize Dialogue or Details: Seamlessly integrate user-specific phrases or words ("${inputs.vocabularyWords}")...\n`;
    }
    
    // Conclusion (conditional per focus + type)
    prompt += `- Conclude with Empowerment: ${this.buildConclusionGuidance(inputs)}\n\n`;
    
    // Formatting
    prompt += this.getFormattingInstructions();
    
    return prompt;
  }

  private adaptToLossType(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return "Acknowledge the immense hopes and dreams the family held for the child, delicately balancing grief with the enduring love they carry. Illuminate the quiet yet profound impact of their presence, using soft, nurturing imagery to reflect this unspoken connection.";
      
      case 'Pregnancy Termination for Medical Reasons':
        return "Honor the deeply compassionate and protective reasoning behind the decision, whether for the mother's health or to prevent suffering for the child. Validate the sorrow and complexity of the choice, while celebrating the enduring love and care that continue to define the family's bond.";
      
      case 'Stillbirth':
        return "Recognize the profound heartbreak of meeting a beloved child whose life was too brief. Address the emotional weight of love intertwined with loss, weaving in gentle themes of beginnings and continuity, such as stars, budding leaves, or the warmth of a tender breeze.";
      
      // ... ALL 10+ cases with full text from V2
      
      default:
        return "Gently explore universal themes of loss, focusing on directly acknowledging emotions while integrating comforting symbols like light, nature, or music to provide solace and connection. Ensure the narrative remains inclusive, empathetic, and emotionally safe for all readers.";
    }
  }

  private guideEmotionalFocus(focusArea?: ChildLossFocusArea): string {
    if (!focusArea) {
      return "Blend universal themes of love, remembrance, comfort, and resilience to create a balanced narrative.";
    }
    
    switch (focusArea) {
      case 'Honoring and Remembering the Child':
        return "Celebrate the child's legacy through rituals, storytelling, or symbolic acts of remembrance.";
      
      case 'Finding Peace and Comfort':
        return "Provide a soothing journey that reassures and calms the grieving individual.";
      
      // ... ALL 20+ cases
      
      default:
        return "Craft a resolution that honors the story's emotional focus, ensuring a blend of hope, healing, and enduring connection.";
    }
  }

  private adaptAudienceTone(inputs: ChildLossInputs): string {
    if (inputs.childLossReaderRelationship === 'Sibling' || inputs.childLossReaderRelationship === 'Classmate') {
      if (inputs.childLossReaderAge) {
        if (inputs.childLossReaderAge >= 3 && inputs.childLossReaderAge <= 6) {
          return `Use gentle, simple language with playful yet comforting imagery for children ages ${inputs.childLossReaderAge}. Include moments of reassurance and shared family connections.`;
        } else if (inputs.childLossReaderAge >= 7 && inputs.childLossReaderAge <= 9) {
          return `Balance emotional depth with accessible metaphors, exploring emotions carefully for children ages ${inputs.childLossReaderAge}. Highlight ways the sibling was special to the child.`;
        } else {
          return `Provide sensitive, nuanced narratives that help older siblings process their emotions for children ages ${inputs.childLossReaderAge}. Offer reflective moments that validate feelings of confusion, guilt, or sadness.`;
        }
      }
    }
    return "Focus on reflective and healing narratives that provide emotional clarity and depth for adults.";
  }

  private buildNarrativeStructure(lossType: ChildLossType): string {
    switch (lossType) {
      case 'Miscarriage':
        return `1. Establish a world filled with hopes and dreams that flourished quietly before birth.
2. Inciting Incident: The realization that these hopes cannot become tangible.
3. Rising Challenges: The protagonist grapples with longing for what never came to be, facing silent ache and unrealized moments.
4. Climax: In a moment of deep reflection, they confront the emptiness of unmet dreams, acknowledging the depth of love that existed nonetheless.
5. Resolution & Renewal: They emerge understanding that love endures even without physical presence, carrying a tender legacy forward.`;
      
      // ... ALL 10+ cases with unique 9-step structures
    }
  }

  private buildConclusionGuidance(inputs: ChildLossInputs): string {
    const focusConclusion = this.getConclusionByFocus(inputs.childLossFocusArea);
    const typeConclusion = this.getConclusionByType(inputs.childLossType);
    return focusConclusion + " " + typeConclusion;
  }

  // ... all other conditional methods
}
```

### Task 3.2: Inner-Child Prompt Builder

Similar structure with:
- 20+ focus area variations
- Wonder vs healing branching
- Protector journey adaptations
- Relational theme variations
- Adult self empowerment
- 9-step narrative structures

### Task 3.3: User Prompt Builders

Full user prompts with:
- Story inputs section
- Narrative structure (conditional)
- Story requirements
- Formatting instructions

---

## Phase 4: Integration (2-3 hours)

### Task 4.1: Update PromptSelector

```typescript
// lambda-deployments/content-agent/src/services/PromptSelector.ts

import { StandardPromptBuilder } from './prompts/StandardPromptBuilder';
import { TherapeuticPromptBuilder } from './prompts/TherapeuticPromptBuilder';

export class PromptSelector {
  private standardBuilder: StandardPromptBuilder;
  private therapeuticBuilder: TherapeuticPromptBuilder;
  
  getPrompt(inputs: StoryInputs): PromptTemplate {
    const storyType = inputs.storyType;
    const ageGroup = this.getAgeGroup(inputs.storyAge);
    
    // Get age-specific system prompt
    const baseSystemPrompt = this.getBaseSystemPrompt(ageGroup);
    
    // Route to appropriate builder
    let prompts: { system: string; user: string };
    
    if (storyType === 'Child-Loss') {
      prompts = this.therapeuticBuilder.buildChildLossPrompt(inputs as ChildLossInputs);
    } else if (storyType === 'Inner-Child') {
      prompts = this.therapeuticBuilder.buildInnerChildPrompt(inputs as InnerChildInputs);
    } else {
      prompts = this.standardBuilder.buildPrompt(storyType, inputs);
    }
    
    return {
      storyType,
      ageGroup,
      systemPrompt: `${baseSystemPrompt}\n\n${prompts.system}`,
      userPrompt: prompts.user,
      constraints: this.getAgeAppropriateConstraints(inputs.storyAge),
      examples: this.getExamples(storyType, ageGroup)
    };
  }
}
```

### Task 4.2: Update RealContentAgent

```typescript
// lambda-deployments/content-agent/src/RealContentAgent.ts

// Ensure all story creation calls pass full inputs with parameters:
const promptInputs: ChildLossInputs = {
  storyLanguage: language,
  storyPlot: plot,
  storyTheme: theme,
  storyTone: tone,
  vocabularyWords: vocab,
  storyTimePeriod: timePeriod,
  storyLocation: location,
  characterProfile: JSON.stringify(character),
  storyAge: age,
  // Child-Loss specific
  childLossType: metadata.childLossType,
  childLossFocusArea: metadata.childLossFocusArea,
  childLossReaderRelationship: metadata.childLossReaderRelationship,
  childLossReaderAge: metadata.childLossReaderAge,
  triggersToAvoid: metadata.triggersToAvoid,
  childLossMemories: metadata.childLossMemories,
  childLossHopes: metadata.childLossHopes
};

const prompt = this.promptSelector.getPrompt(promptInputs);
```

---

## Phase 5: Testing (6-8 hours)

### Task 5.1: Unit Tests for Each Type

```typescript
// lambda-deployments/content-agent/src/__tests__/prompts/StandardPromptBuilder.test.ts

describe('StandardPromptBuilder', () => {
  describe('Adventure prompts', () => {
    it('should include all required elements', () => {
      const inputs: BaseStoryInputs = { /* ... */ };
      const prompts = builder.buildAdventurePrompt(inputs);
      
      expect(prompts.user).toContain('fast-paced, comedic adventure');
      expect(prompts.user).toContain('Delightfully awful villain');
      expect(prompts.user).toContain('Absurd problem-solving');
      expect(prompts.user).toContain('laugh-out-loud finale');
      expect(prompts.user).toContain(inputs.storyPlot);
      expect(prompts.user).toContain(inputs.vocabularyWords);
      expect(prompts.user.length).toBeGreaterThan(500);
    });
  });

  describe('Bedtime prompts', () => {
    it('should include soothing element and routine', () => {
      const inputs: BedtimeInputs = {
        // ... base inputs
        bedtimeSoothingElement: 'Stars',
        bedtimeRoutine: 'Brushing teeth'
      };
      const prompts = builder.buildBedtimePrompt(inputs);
      
      expect(prompts.user).toContain('Stars');
      expect(prompts.user).toContain('Brushing teeth');
      expect(prompts.user).toContain('take center stage');
      expect(prompts.user).toContain('lullaby of words');
      expect(prompts.user.length).toBeGreaterThan(400);
    });
  });

  // ... tests for ALL 10 standard types
});
```

### Task 5.2: Therapeutic Prompt Tests

```typescript
describe('TherapeuticPromptBuilder', () => {
  describe('Child-Loss prompts', () => {
    it('should adapt to Miscarriage loss type', () => {
      const inputs: ChildLossInputs = {
        // ... base inputs
        childLossType: 'Miscarriage'
      };
      const prompts = builder.buildChildLossPrompt(inputs);
      
      expect(prompts.system).toContain('immense hopes and dreams');
      expect(prompts.system).toContain('quiet yet profound impact');
      expect(prompts.system.length).toBeGreaterThan(8000);
    });

    it('should adapt to Honoring emotional focus', () => {
      const inputs: ChildLossInputs = {
        // ... base inputs
        childLossFocusArea: 'Honoring and Remembering the Child'
      };
      const prompts = builder.buildChildLossPrompt(inputs);
      
      expect(prompts.system).toContain('legacy through rituals');
      expect(prompts.system).toContain('symbolic acts of remembrance');
    });

    it('should adapt language for sibling age 3-6', () => {
      const inputs: ChildLossInputs = {
        // ... base inputs
        childLossReaderRelationship: 'Sibling',
        childLossReaderAge: 5
      };
      const prompts = builder.buildChildLossPrompt(inputs);
      
      expect(prompts.system).toContain('gentle, simple language');
      expect(prompts.system).toContain('playful yet comforting imagery');
      expect(prompts.system).toContain('ages 5');
    });

    // Test ALL 10 loss types
    // Test ALL 20 focus areas
    // Test ALL 15 relationship contexts
    // Test age adaptations (3-6, 7-9, 10+, adult)
  });

  describe('Inner-Child prompts', () => {
    it('should branch to healing path for Abandonment', () => {
      const inputs: InnerChildInputs = {
        // ... base inputs
        innerChildFocusArea: 'Abandonment'
      };
      const prompts = builder.buildInnerChildPrompt(inputs);
      
      expect(prompts.system).toContain('protector's actions');
      expect(prompts.system).toContain('perpetuated feelings of isolation');
      expect(prompts.system.length).toBeGreaterThan(7000);
    });

    it('should branch to wonder path for Rediscovering Magic', () => {
      const inputs: InnerChildInputs = {
        // ... base inputs
        innerChildFocusArea: 'Rediscovering Magic'
      };
      const prompts = builder.buildInnerChildPrompt(inputs);
      
      expect(prompts.system).toContain('vibrant, imaginative environment');
      expect(prompts.system).toContain('child's inner joy and creativity');
      expect(prompts.system).not.toContain('fearful relationships');
    });

    // Test ALL 20 focus areas
    // Test ALL 15 relationship contexts
    // Test wonder vs healing branching
    // Test whimsical vs serious logic
  });
});
```

### Task 5.3: Integration Tests

```typescript
// lambda-deployments/content-agent/src/__tests__/integration/prompt-generation.test.ts

describe('Complete Prompt Generation', () => {
  it('should generate complete Adventure story with all elements', async () => {
    const story = await contentAgent.generateStory({
      storyType: 'Adventure',
      age: 5,
      plot: 'A dragon loses their treasure',
      theme: 'Courage',
      tone: 'Exciting',
      language: 'English',
      // ... all params
    });
    
    expect(story.content.text).toContain('absurd'); // Or comedic elements
    expect(story.content.beats.length).toBe(4);
    // Verify story matches adventure style
  });

  it('should generate therapeutic Child-Loss story', async () => {
    const story = await contentAgent.generateStory({
      storyType: 'Child-Loss',
      childLossType: 'Stillbirth',
      childLossFocusArea: 'Finding Peace and Comfort',
      // ... all therapeutic params
    });
    
    expect(story.content.text).toContain('profound heartbreak');
    expect(story.content.text).toContain('brief life');
    // Verify therapeutic elements present
  });

  // Test ALL 15 story types end-to-end
});
```

---

## Phase 6: Documentation (2-3 hours)

### Task 6.1: Update AGENTS.md

Add warning about prompt quality:

```markdown
## Prompt Quality Requirements

**NON-NEGOTIABLE**: V3 prompts must be AT PAR or BETTER than V2.

### Standard Story Types (10 types)
- Length: 600-1500 characters
- All user input parameters captured
- V2 writing style preserved (fast-paced comedic, etc.)

### Therapeutic Story Types (2-3 types)
- Length: 8000-9000 characters
- Full conditional logic (10-20+ branches)
- Dynamic narrative structures
- Safety measures implemented

**DO NOT**:
- ❌ Truncate prompts to "simplify"
- ❌ Remove user input parameters
- ❌ Genericize story type requirements
- ❌ Strip conditional logic from therapeutic types

**Why**: Prompt quality directly impacts story quality. Truncated prompts = inferior stories.
```

### Task 6.2: Create Prompt Architecture Documentation

```
docs/prompts-library/
├── PROMPT_ARCHITECTURE.md (this architecture)
├── v3-source/
│   ├── age-specific/ (7 files)
│   ├── story-types/ (15 files)
│   ├── character.ts
│   └── art.ts
└── TESTING_GUIDE.md (how to test prompts)
```

---

## Success Criteria (Zero Tolerance)

### For EACH of 15 Story Types:

✅ **Prompt length** matches or exceeds V2
✅ **All user parameters** captured and interpolated
✅ **Writing style** matches V2 (fast-paced comedic where applicable)
✅ **Character archetypes** specified (villain, mentor, hero)
✅ **Specific requirements** per type preserved
✅ **Formatting instructions** included

### For Therapeutic Types (Child-Loss, Inner-Child):

✅ **System prompt**: 5000-6000 chars
✅ **User prompt**: 3000-4000 chars
✅ **Total**: 8000-10000 chars
✅ **All conditional branches** implemented and tested
✅ **Dynamic narrative structures** per context
✅ **Safety measures** (triggers, age adaptations)
✅ **Professional therapeutic principles**

### Testing:

✅ **Unit tests** for all prompt builders (50+ tests)
✅ **Integration tests** for all story types (15+ tests)
✅ **Prompt length validation** (no truncation)
✅ **Parameter usage validation** (all params used)
✅ **Conditional branch coverage** (100% of therapeutic logic)

### Documentation:

✅ **Architecture documented** with diagrams
✅ **All templates extracted** and organized
✅ **Testing guide** created
✅ **AGENTS.md updated** with quality warnings

---

## Timeline

| Phase | Tasks | Hours | Dependencies |
|-------|-------|-------|--------------|
| Phase 1 | Extract & organize | 4-6 | None |
| Phase 2 | StandardPromptBuilder | 8-10 | Phase 1 |
| Phase 3 | TherapeuticPromptBuilder | 10-12 | Phase 1 |
| Phase 4 | Integration | 2-3 | Phases 2-3 |
| Phase 5 | Testing | 6-8 | Phase 4 |
| Phase 6 | Documentation | 2-3 | Phase 5 |
| **Total** | **All phases** | **32-42** | **Serial** |

**Realistic Timeline**: 4-5 days of focused work

---

## Immediate Next Steps

1. ✅ **Document the problem** (DONE - this file)
2. ⏭️ **Update plan** to include prompt work
3. ⏭️ **Extract V3 PDF content** to markdown
4. ⏭️ **Start StandardPromptBuilder** implementation
5. ⏭️ **Start TherapeuticPromptBuilder** implementation

---

**Status**: 🚨 **CRITICAL BLOCKER - 32-42 hours of work required**  
**This is NOT optional - V3 cannot be worse than V2**  
**No shortcuts. No placeholders. Full V2+ quality required.**


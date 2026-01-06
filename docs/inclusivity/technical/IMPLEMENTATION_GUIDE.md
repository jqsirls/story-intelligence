# Implementation Guide - Inclusivity System

## Overview

This guide provides step-by-step instructions for maintaining and extending Storytailor's inclusivity system. It includes code examples, common patterns, and troubleshooting procedures.

## Architecture

### Core Components

1. **ComprehensiveInclusivityDatabase.ts** (3,442 lines)
   - All 39 trait definitions
   - Context-sensitive descriptions
   - Critical safety negatives

2. **SpeciesAnatomyProfiles.ts**
   - 9 species profiles
   - Trait adaptation principles
   - Example adaptations

3. **CharacterImageGenerator.ts**
   - Prompt building logic
   - Species-first language
   - Context selection

4. **CharacterGenerationService.ts**
   - Image generation orchestration
   - Validation workflow
   - Reference image handling

## Adding a New Trait

### Step 1: Define the Trait Structure

Add to `ComprehensiveInclusivityDatabase.ts`:

```typescript
{
  id: 'new_trait_id',
  label: 'Trait Display Name',
  category: 'mobility' | 'neurodiversity' | 'sensory' | 'medical' | 'skin' | 'physical' | 'family' | 'emotional' | 'cultural',
  
  // Visual description (brief)
  visualDescription: 'Brief description of visual appearance',
  
  // Medical accuracy (detailed)
  medicallyAccurateDescription: `Detailed medical/physical specifications.
  
VISUAL INDICATORS:
- Feature 1
- Feature 2
- Feature 3

PORTRAYAL:
- How to represent respectfully
- What to emphasize`,
  
  // GPT-safe prompt (for image generation)
  gptImageSafePrompt: `Character has [trait]. [Detailed description of how it appears visually].
  
In this portrait:
- Visual element 1
- Visual element 2
- Expression and posture

[Empowerment framing - what this trait represents positively].`,
  
  // Mandatory visual requirements
  mandatoryVisualRequirements: [
    'MUST show [specific requirement]',
    'MUST include [element]',
    'Character MUST [appearance requirement]'
  ],
  
  // Validation checklist
  visualValidationChecklist: [
    'Is [element] visible?',
    'Is [requirement] met?',
    'Is portrayal respectful?'
  ],
  
  // Negative prompt (what NOT to do)
  negativePrompt: `STRICT PROHIBITIONS:
- DO NOT [prohibition 1]
- DO NOT [prohibition 2]
- DO NOT [prohibition 3]`,
  
  // Critical safety negatives (if misinterpretation risk)
  criticalSafetyNegatives?: [
    'NOT [dangerous misinterpretation 1]',
    'NOT [dangerous misinterpretation 2]'
  ],
  
  // Misinterpretation risk level
  misinterpretationRisk?: 'critical' | 'high' | 'medium' | 'low',
  
  // Alternative meanings (what AI might confuse)
  alternativeMeanings?: ['confusion 1', 'confusion 2'],
  
  // Context-sensitive descriptions (for device-safety-risk traits)
  contextDescriptions?: {
    medical?: `Medical/realistic description`,
    superhero?: `Superhero transformation description`,
    fantasy?: `Fantasy transformation description`,
    scifi?: `Sci-fi transformation description`,
    robot?: `Robot integration description`
  },
  
  // Personality nuances
  personalityNuances: [
    'Nuance 1',
    'Nuance 2'
  ],
  
  // Strengths from trait
  strengthsFromTrait: [
    'Strength 1',
    'Strength 2'
  ],
  
  // Conversational hints
  conversationalHints: [
    'hint 1',
    'hint 2'
  ],
  
  // Story integration tips
  storyIntegrationTips: [
    'Tip 1',
    'Tip 2'
  ],
  
  // Celebratory language
  celebratoryLanguage: 'Positive framing of trait',
  
  // Dignity-first framing
  dignityFirstFraming: 'Person-first language, empowerment focus',
  
  // Stereotypes to avoid
  avoidStereotypes: [
    'Stereotype 1',
    'Stereotype 2'
  ],
  
  // Cultural considerations
  culturalConsiderations?: 'Cultural sensitivity notes',
  
  // Age appropriateness
  ageAppropriatenessNotes?: `Ages 3-5: [language]
Ages 6-8: [language]
Ages 9-10: [language]`
}
```

### Step 2: Add Species Adaptations

Add to `SpeciesAnatomyProfiles.ts` in each species profile's `exampleAdaptations`:

```typescript
// In SPECIES_PROFILES object, for each species:
exampleAdaptations: {
  // ... existing adaptations
  newTrait: `Species-specific adaptation description. How trait appears on this species anatomy.`,
}
```

### Step 3: Test Thoroughly

1. **Quick Validation** (3-5 images)
   - Test on ages 6-7
   - Verify trait visibility
   - Check filter rejection rate

2. **Confirmation** (3x repeatability)
   - Same variant, same age
   - Must pass 3/3

3. **Universal Validation** (ages 4-8, diverse ethnicities)
   - Must pass 8/8 for universal success

### Step 4: Update Documentation

- Add to `TRAIT_DATABASE.md`
- Update `AI_IDE_REFERENCE.md` if pattern changes

## Modifying Existing Trait

### Common Modifications

#### 1. Filter Rejection Issue

**Problem:** OpenAI safety filter rejects images

**Solution:** Apply wheelchair pattern (zero-medical language)

**Example - Halo Device Fix:**

```typescript
// BEFORE (triggers filter):
medicallyAccurateDescription: `Medical halo device with pins screwed into skull...`

// AFTER (passes filter):
contextDescriptions: {
  medical: `POWER DETECTION CROWN with glowing sensors and force field projectors. Crown IS superhero danger-scanner. Energy bars connect crown to chest power core. Crown SCANS for threats and PROJECTS protective shields. Decorated with hero emblems and power symbols. NOT angel halo - this IS SUPERHERO EQUIPMENT.`
}
```

#### 2. Trait Not Visible

**Problem:** Vision model validation fails (trait not detected)

**Solution:** Strengthen mandatory requirements

**Example:**

```typescript
// BEFORE:
mandatoryVisualRequirements: [
  'MUST show wheelchair'
]

// AFTER:
mandatoryVisualRequirements: [
  'MUST show character seated in wheelchair',
  'Wheelchair MUST be visible (wheels, frame, footrests)',
  'Wheelchair MUST be decorated/personalized',
  'Character MUST look confident and capable'
]
```

#### 3. Wrong Species Adaptation

**Problem:** Dragon looks like "human in costume"

**Solution:** Use species-first language

**Example - Down Syndrome on Dragon:**

```typescript
// BEFORE:
gptImageSafePrompt: `Almond-shaped eyes with upward slant...`

// AFTER:
gptImageSafePrompt: `DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE and gentle upward tilt. Softer rounded DRAGON SNOUT (not angular dragon snout). Rounder DRAGON FACE with gentler features. This is DRAGON anatomy showing Down syndrome characteristics - recognizable as "has DS too!" on dragon form.`
```

## Code Examples

### Building a Prompt with Traits

```typescript
// In CharacterImageGenerator.ts

private buildHeadshotPrompt(
  traits: CharacterTraits,
  inclusivityTraits: InclusivityTrait[],
  hexColors: HexColors
): string {
  // 1. Species anatomy prefix (FIRST - prevents "human in costume")
  const speciesPrefix = this.buildSpeciesAnatomyPrefix(
    traits.species, 
    traits, 
    inclusivityTraits
  );
  
  // 2. Artistic execution
  const artisticExecution = ARTISTIC_EXECUTION;
  
  // 3. Global style
  const globalStyle = GLOBAL_STYLE;
  
  // 4. Character details
  const characterDetails = `
CHARACTER IDENTITY:
- Name: ${traits.name}
- Age: ${this.getAgeSafeLanguage(traits.age)}
- Species: ${traits.species}
- Ethnicity: ${traits.ethnicity?.join(' and ') || 'diverse heritage'}
- Skin tone: Hex ${hexColors.skin}
- Hair: Hex ${hexColors.hair}
- Eyes: Hex ${hexColors.eyes}
  `;
  
  // 5. Mandatory section (with context selection)
  const mandatorySection = this.buildMandatorySection(
    inclusivityTraits, 
    false,  // isFullBody
    traits  // for context determination
  );
  
  // 6. Negative prompt section
  const negativeSection = this.buildNegativePromptSection(inclusivityTraits);
  
  // 7. Final reminder (style enforcement)
  const finalReminder = `
FINAL REMINDER - FIRM STYLE ENFORCEMENT:
This artistic style applies EQUALLY to ALL species.
Species anatomy varies, ARTISTIC STYLE does not.
  `;
  
  // Combine in correct order
  return `
${speciesPrefix}

${artisticExecution}

${globalStyle}

${characterDetails}

${mandatorySection}

${negativeSection}

${finalReminder}
  `.trim();
}
```

### Context Selection Logic

```typescript
// In CharacterImageGenerator.ts

private determineContext(traits: CharacterTraits): 'medical' | 'superhero' | 'fantasy' | 'scifi' | 'robot' {
  // Device-safety-risk traits: Prefer imagination for human children
  if (traits.species === 'human' && traits.context === 'superhero') {
    return 'superhero';
  }
  
  // Species-based context
  if (traits.species === 'dragon' || traits.species === 'fantasy_being') {
    return 'fantasy';
  }
  
  if (traits.species === 'robot') {
    return 'robot';
  }
  
  if (traits.species === 'alien') {
    return 'scifi';
  }
  
  // Default: medical (for human, realistic contexts)
  return 'medical';
}
```

### Species-First Language Generation

```typescript
// In CharacterImageGenerator.ts

private buildSpeciesAnatomyPrefix(
  species: string,
  traits: CharacterTraits,
  inclusivityTraits: InclusivityTrait[]
): string {
  // Human gets no prefix (traits apply directly)
  if (!needsAnatomyPrefix(species)) {
    return '';
  }
  
  const profile = getSpeciesProfile(species);
  const sections: string[] = [];
  
  // Critical anatomy emphasis
  sections.push('=== SPECIES ANATOMY - CRITICAL ===');
  sections.push(profile.criticalAnatomyEmphasis);
  sections.push(`ANATOMY BASE: ${profile.anatomyBase}`);
  sections.push(`ANTHROPOMORPHISM: ${profile.anthropomorphismLevel}`);
  
  // Trait adaptation guidance
  if (inclusivityTraits.length > 0) {
    sections.push('TRAIT ADAPTATION FOR THIS SPECIES:');
    sections.push(profile.traitAdaptationPrinciple);
    sections.push('DEVICE TRANSFORMATION:');
    sections.push(profile.deviceAdaptationPrinciple);
    
    // Add specific examples
    if (profile.exampleAdaptations) {
      inclusivityTraits.forEach(trait => {
        const example = this.getExampleForTrait(trait, profile);
        if (example) {
          sections.push(`${trait.label}: ${example}`);
        }
      });
    }
  }
  
  sections.push('=== END SPECIES ANATOMY ===');
  
  return sections.join('\n');
}
```

### Using Reference Images for Consistency

```typescript
// In CharacterGenerationService.ts

async generateReferenceImagesWithValidation(
  traits: CharacterTraits,
  inclusivityTraits: InclusivityTrait[],
  hexColors: HexColors
): Promise<ReferenceImageResult> {
  // 1. Generate headshot first
  const headshotResult = await this.imageGenerator.generateHeadshot(
    traits,
    inclusivityTraits,
    hexColors
  );
  
  // 2. Download headshot buffer (keep in memory)
  const headshotBuffer = await this.downloadImageBuffer(headshotResult.url);
  
  // 3. Convert to OpenAI File object
  const headshotFile = await this.imageReferenceService.convertBufferToFile(
    headshotBuffer,
    'headshot.png'
  );
  
  // 4. Generate bodyshot using headshot as reference
  const bodyshotResult = await this.imageGenerator.generateBodyshotWithReference(
    headshotFile,  // Reference image
    traits,
    inclusivityTraits,
    hexColors
  );
  
  // 5. Validate both images
  const validation = await this.validateImages(
    headshotResult.url,
    bodyshotResult.url,
    inclusivityTraits
  );
  
  return {
    headshotUrl: headshotResult.url,
    bodyshotUrl: bodyshotResult.url,
    validation
  };
}
```

## Validation System

### Vision Model Validation

```typescript
// In ImageSafetyReviewService.ts

async validateInclusivityTraits(
  imageUrl: string,
  expectedTraits: InclusivityTrait[]
): Promise<TraitValidationResult> {
  const visionPrompt = `
Analyze this image for inclusivity traits.

Expected traits:
${expectedTraits.map(t => `- ${t.label}: ${t.visualDescription}`).join('\n')}

For each trait, determine:
1. Is the trait visible in the image?
2. Is it represented accurately?
3. Is it portrayed respectfully?

Respond with JSON:
{
  "traits_validated": [
    {
      "trait_id": "wheelchair_manual",
      "visible": true,
      "accurate": true,
      "respectful": true
    }
  ],
  "overall_valid": true
}
  `;
  
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4-vision-preview',
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: visionPrompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }
    ],
    temperature: 0.1
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

### Retry Logic with Prompt Adjustment

```typescript
// In CharacterGenerationService.ts

async generateWithRetry(
  traits: CharacterTraits,
  inclusivityTraits: InclusivityTrait[],
  hexColors: HexColors,
  maxRetries: number = 3
): Promise<ImageGenerationResult> {
  let attempt = 0;
  let lastError: Error | null = null;
  
  while (attempt < maxRetries) {
    try {
      // Generate image
      const result = await this.imageGenerator.generateHeadshot(
        traits,
        inclusivityTraits,
        hexColors
      );
      
      // Validate
      const validation = await this.validateImages(
        result.url,
        null,
        inclusivityTraits
      );
      
      if (validation.passesAll) {
        return { success: true, url: result.url, validation };
      }
      
      // Validation failed - adjust prompt
      if (attempt < maxRetries - 1) {
        inclusivityTraits = this.adjustTraitsForRetry(
          inclusivityTraits,
          validation.issues
        );
      }
      
    } catch (error) {
      lastError = error;
      
      // If filter rejection, apply wheelchair pattern
      if (error.message.includes('safety_violations')) {
        inclusivityTraits = this.applyWheelchairPattern(inclusivityTraits);
      }
    }
    
    attempt++;
    
    // Wait between retries
    await this.wait(2000 * attempt); // Exponential backoff
  }
  
  // Final attempt - accept with warnings
  const result = await this.imageGenerator.generateHeadshot(
    traits,
    inclusivityTraits,
    hexColors
  );
  
  return {
    success: true,
    url: result.url,
    validation: { passesAll: false, warnings: ['Some traits may not be fully visible'] }
  };
}
```

## Common Pitfalls and Solutions

### Pitfall 1: "Human in Costume" Problem

**Symptom:** Dragon/robot/monster looks like human child with features

**Root Cause:** Missing species-first language

**Solution:**
```typescript
// Add species anatomy prefix FIRST in prompt
const speciesPrefix = buildSpeciesAnatomyPrefix(species, traits, inclusivityTraits);

// Use species-first language for traits
gptImageSafePrompt: `DRAGON EYES (reptilian, NOT human) with ALMOND SHAPE`
```

### Pitfall 2: Filter Rejection

**Symptom:** OpenAI safety filter rejects images

**Root Cause:** Medical language triggers filters

**Solution:**
```typescript
// Apply wheelchair pattern (zero-medical language)
contextDescriptions: {
  medical: `POWER DETECTION CROWN with glowing sensors. Crown IS superhero equipment.`
}
```

### Pitfall 3: Trait Not Visible

**Symptom:** Vision model validation fails

**Root Cause:** Mandatory requirements too weak

**Solution:**
```typescript
// Strengthen mandatory requirements
mandatoryVisualRequirements: [
  'MUST show [specific element]',
  'MUST include [detailed description]',
  'MUST be [visible requirement]'
]
```

### Pitfall 4: Style Changes

**Symptom:** Artistic style becomes photorealistic

**Root Cause:** Missing ARTISTIC_EXECUTION constant

**Solution:**
```typescript
// Always include artistic constants
const prompt = `
${ARTISTIC_EXECUTION}
${GLOBAL_STYLE}
// ... rest of prompt
`;
```

## Testing Procedures

### Unit Testing

```typescript
// Test prompt building
describe('CharacterImageGenerator', () => {
  it('should include species anatomy prefix for non-human species', () => {
    const prompt = generator.buildHeadshotPrompt(
      { species: 'dragon', ...traits },
      [],
      hexColors
    );
    
    expect(prompt).toContain('=== SPECIES ANATOMY - CRITICAL ===');
    expect(prompt).toContain('DRAGON anatomy');
  });
  
  it('should use context-sensitive descriptions for halo device', () => {
    const prompt = generator.buildHeadshotPrompt(
      { species: 'human', context: 'superhero', ...traits },
      [haloTrait],
      hexColors
    );
    
    expect(prompt).toContain('POWER DETECTION CROWN');
    expect(prompt).not.toContain('medical halo');
  });
});
```

### Integration Testing

```typescript
// Test full generation workflow
describe('CharacterGenerationService', () => {
  it('should generate consistent headshot and bodyshot', async () => {
    const result = await service.generateReferenceImagesWithValidation(
      traits,
      inclusivityTraits,
      hexColors
    );
    
    // Validate consistency
    const headshotValidation = await validateImage(result.headshotUrl);
    const bodyshotValidation = await validateImage(result.bodyshotUrl);
    
    expect(headshotValidation.skinTone).toEqual(bodyshotValidation.skinTone);
    expect(headshotValidation.hairColor).toEqual(bodyshotValidation.hairColor);
  });
});
```

### Manual Testing Checklist

- [ ] Trait visible in generated image
- [ ] Trait portrayed respectfully
- [ ] Style consistent (not photorealistic)
- [ ] Species anatomy correct (not "human in costume")
- [ ] Filter passes (no safety violations)
- [ ] Vision model validation passes
- [ ] Headshot/bodyshot consistency maintained

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Tested in staging
- [ ] Filter rejection rate acceptable (<5%)
- [ ] Validation success rate acceptable (>95%)

### Deployment Steps

1. **Build:**
   ```bash
   cd lambda-deployments/content-agent
   npm run build
   ```

2. **Test locally:**
   ```bash
   npm run test
   ```

3. **Deploy to staging:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh staging
   ```

4. **Validate in staging:**
   - Generate 10 test images
   - Check filter rejection rate
   - Verify trait visibility

5. **Deploy to production:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

### Rollback Procedure

If production breaks:

1. **Identify issue:**
   ```bash
   # Check logs
   aws logs tail /aws/lambda/storytailor-content-agent-production
   ```

2. **Revert code:**
   ```bash
   git checkout <last-working-commit> -- lambda-deployments/content-agent/src/
   ```

3. **Redeploy:**
   ```bash
   ./scripts/deploy-universal-agent-proper.sh production
   ```

## Performance Optimization

### Caching Strategies

- Cache species profiles (rarely change)
- Cache trait definitions (rarely change)
- Cache validation results (for identical inputs)

### Rate Limiting

- 2-3 seconds between image generations
- 10-15 seconds between batches
- Exponential backoff on rate limit errors

### Monitoring

- Track filter rejection rate (target: <5%)
- Track validation success rate (target: >95%)
- Track generation time (target: <40 seconds)
- Track retry rate (target: <20%)

## Troubleshooting

### Issue: High Filter Rejection Rate

**Diagnosis:**
- Check which traits trigger rejections
- Review prompt language (medical terms?)
- Check context selection (using imagination?)

**Solution:**
- Apply wheelchair pattern to problematic traits
- Use context-sensitive descriptions
- Add critical safety negatives

### Issue: Low Validation Success Rate

**Diagnosis:**
- Check mandatory requirements (too weak?)
- Review vision model validation criteria
- Check trait visibility in generated images

**Solution:**
- Strengthen mandatory requirements
- Add explicit visibility statements
- Improve trait descriptions

### Issue: Style Inconsistency

**Diagnosis:**
- Check if ARTISTIC_EXECUTION included
- Review GLOBAL_STYLE constant
- Check prompt order

**Solution:**
- Ensure artistic constants always included
- Verify prompt building order
- Add final reminder section

---

**Last Updated:** December 2025  
**Status:** Production-ready implementation guide

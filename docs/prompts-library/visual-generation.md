Status: Draft  
Audience: Internal  
Last-Updated: 2025-12-13  
Owner: Documentation Team  
Verified-Against-Code: Yes  
Doc-ID: AUTO  
Notes: Phase 2.6 - Visual generation prompts extracted from code with file paths and line numbers

# Visual Generation Prompts

## Overview

This document contains all prompts used for visual content generation in Storytailor, including art generation, character art, cover art, body illustrations, and the global art style constants.

## Global Art Style

**Location:** `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:13-22`

**Purpose:** Global artistic standards for all visual content

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:13-22
export const GLOBAL_STYLE = `
GLOBAL STYLE (fixed)
— Medium & surface: ultra-high-res digital hand-painting; soft-airbrush blends layered with subtle painterly brush strokes; fine canvas tooth only where needed for warmth.
— Edge handling: paint-defined silhouettes (no ink); crisp edges on focal elements, feathered fall-off on background forms.
— Lighting & colour: vibrant, optimistic palette; warm key-light versus cool teal/purple shadows; molten rim highlights; volumetric haze with drifting dust motes for depth.
— Dimensional shading: subtle subsurface bounce; glossy specular accents on eyes, enamel, or metal; avoid heavy impasto or cel-shading.
— Composition: cinematic lens choice, layered foreground / mid / background planes with atmospheric falloff.
— Colour discipline: thread protagonist HEX colours through costume, props **and** environment—never solid swatches.
— STRICT: no text, captions, UI, or watermarks.
`.trim();
```

**Usage:** This style is applied to all character headshots, story cover images, story beat illustrations, and Sora video animations.

**Code References:**
- `lambda-deployments/content-agent/src/services/AnimationService.ts:412-413` - Used in Sora video generation
- `packages/content-agent/src/services/ArtGenerationService.ts` - Applied to all image generation

## Fallback Palette Journey

**Location:** `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:28-34`

**Purpose:** Fallback color palette for stories that don't generate custom palette

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:28-34
export const FALLBACK_PALETTE = [
  "Bright sunrise warmth with candy-pastel accents.",
  "Slightly cooler teal highs hinting at rising tension.",
  "Balanced midday vibrancy, full saturation.",
  "Golden-hour oranges sliding toward magenta dusk.",
  "Deep twilight jewel tones with soft bioluminescent highlights."
];
```

## Camera Angles

**Location:** `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:39-45`

**Purpose:** Camera angle directives for cinematic quality

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:39-45
export const CAMERA_ANGLES = [
  "Establishing wide shot, slight low angle (heroic introduction)",
  "Medium close-up, eye-level (intimate connection)",
  "Dynamic angle following action, layered depth planes",
  "Dramatic reveal angle, atmospheric perspective",
  "Triumphant pullback, celebrating resolution"
];
```

## Depth Directives

**Location:** `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:50-56`

**Purpose:** Depth directives for professional composition

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:50-56
export const DEPTH_DIRECTIVES = [
  "Foreground sharp with protagonist in focus, background soft bokeh with atmospheric falloff",
  "Layered depth: foreground elements frame the action, mid-ground holds characters, background suggests world",
  "Compressed depth with shallow focus, protagonist crisp, environment dreamlike",
  "Deep focus showing full environment, maintaining protagonist prominence through lighting",
  "Balanced depth across three planes, each contributing to emotional narrative"
];
```

## Lighting Moods

**Location:** `lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:61-67`

**Purpose:** Lighting moods for emotional beats

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/constants/GlobalArtStyle.ts:61-67
export const LIGHTING_MOODS = [
  "Warm, inviting key light suggesting safety and discovery, soft shadows",
  "Dappled, dynamic lighting suggesting movement and adventure, play of light and shadow",
  "Focused, dramatic lighting building tension, deeper contrasts",
  "Brilliant, revelatory lighting at peak moment, golden warmth",
  "Soft, triumphant lighting suggesting resolution and peace, gentle glow"
];
```

## Protagonist DNA Extraction

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:84-136`

**Purpose:** Extract visual character description for consistent image generation (≤60 words)

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:84-136
extractProtagonistDNA(character: Character): ProtagonistDNA {
  const traits = character.traits;
  const appearance = traits.appearance;
  
  // Build core visual description
  const visualElements: string[] = [];
  visualElements.push(traits.species);
  if (traits.age) visualElements.push(`${traits.age} years old`);
  if (traits.gender) visualElements.push(traits.gender);
  
  // Physical appearance
  if (appearance.eyeColor) visualElements.push(`${appearance.eyeColor} eyes`);
  if (appearance.hairColor && appearance.hairTexture) {
    visualElements.push(`${appearance.hairTexture} ${appearance.hairColor} hair`);
  }
  
  // Create concise visual description (≤60 words)
  const visualDescription = this.truncateToWordLimit(
    visualElements.join(', '),
    60
  );
  
  return {
    visualDescription,
    coreTraits: traits.personality || [],
    species: traits.species,
    appearance: visualDescription,
    inclusivityElements: traits.inclusivityTraits || []
  };
}
```

## Story Motif Generation

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:138-200`

**Purpose:** Generate visual theme and motif for story-wide consistency

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:138-200
generateStoryMotif(story: Story): StoryMotif {
  const content = story.content;
  
  // Extract primary theme from story type and content
  const themeMap: Record<string, string> = {
    'Adventure': 'exploration and discovery',
    'Bedtime': 'comfort and peaceful dreams',
    'Birthday': 'celebration and joy',
    'Educational': 'learning and growth',
    // ... more themes
  };
  
  return {
    primaryTheme: themeMap[story.storyType] || 'adventure and wonder',
    visualElements: [...],
    symbolism: [...],
    atmosphere: 'warm and inviting'
  };
}
```

## Character Art Prompts

### Character Headshot Prompt

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:463-471`

**Purpose:** Build character headshot prompt

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:463-471
private buildCharacterPrompt(protagonistDNA: ProtagonistDNA, type: 'headshot' | 'bodyshot'): string {
  const basePrompt = `Children's book illustration of ${protagonistDNA.visualDescription}`;
  const stylePrompt = ', warm and friendly art style, soft colors, child-appropriate';
  
  if (type === 'headshot') {
    return `${basePrompt}, portrait view, smiling expression${stylePrompt}`;
  } else {
    return `${basePrompt}, full body view, standing pose${stylePrompt}`;
  }
}
```

**Usage:**
- `packages/content-agent/src/services/ArtGenerationService.ts:294` - Character headshot generation
- `packages/content-agent/src/services/ArtGenerationService.ts:295` - Character bodyshot generation

### Character Art Prompt (Conversation Manager)

**Location:** `packages/content-agent/src/services/CharacterConversationManager.ts:437-458`

**Purpose:** Generate art prompt for character visualization during conversation

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/CharacterConversationManager.ts:437-458
private async generateArtPrompt(traits: any): Promise<string> {
  const elements = [];
  
  // Basic description
  elements.push(`${traits.age || 'young'} ${traits.species || 'human'}`);
  
  // Appearance
  if (traits.appearance?.eyeColor) elements.push(`${traits.appearance.eyeColor} eyes`);
  if (traits.appearance?.hairColor) elements.push(`${traits.appearance.hairColor} hair`);
  if (traits.appearance?.clothing) elements.push(`wearing ${traits.appearance.clothing}`);
  
  // Personality reflected in pose/expression
  if (traits.personality?.includes('brave')) elements.push('confident pose');
  if (traits.personality?.includes('kind')) elements.push('warm smile');
  if (traits.personality?.includes('shy')) elements.push('gentle expression');
  
  // Style
  elements.push('children\'s book illustration style');
  elements.push('friendly and approachable');
  elements.push('colorful and vibrant');
  
  return elements.join(', ');
}
```

### Character Art Prompt (Generation Service)

**Location:** `packages/content-agent/src/services/CharacterGenerationService.ts:629-651`

**Purpose:** Generate art prompt for character visualization

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/CharacterGenerationService.ts:629-651
private async generateArtPrompt(traits: Partial<CharacterTraits>): Promise<string> {
  const elements = [];
  
  // Basic description
  elements.push(`${traits.age || 'young'} ${traits.species || 'human'}`);
  
  // Appearance
  if (traits.appearance?.eyeColor) elements.push(`${traits.appearance.eyeColor} eyes`);
  if (traits.appearance?.hairColor) elements.push(`${traits.appearance.hairColor} hair`);
  if (traits.appearance?.clothing) elements.push(`wearing ${traits.appearance.clothing}`);
  
  // Personality reflected in pose/expression
  if (traits.personality?.includes('brave')) elements.push('confident pose');
  if (traits.personality?.includes('kind')) elements.push('warm smile');
  if (traits.personality?.includes('shy')) elements.push('gentle expression');
  
  // Style
  elements.push('children\'s book illustration style');
  elements.push('friendly and approachable');
  elements.push('colorful and vibrant');
  
  return elements.join(', ');
}
```

## Cover Art Prompts

### Cover Art Prompt

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:474-485`

**Purpose:** Build cover art prompt with protagonist DNA, motif, and palette

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:474-485
private buildCoverArtPrompt(
  moment: CoverArtMoment, 
  protagonistDNA: ProtagonistDNA, 
  motif: StoryMotif, 
  palette: PaletteJourney
): string {
  const climaxPalette = palette.step4.colors.join(', ');
  return `Children's book cover illustration: ${moment.description}. 
          Features ${protagonistDNA.visualDescription}. 
          ${motif.atmosphere} atmosphere with ${motif.primaryTheme} theme. 
          Color palette: ${climaxPalette}. 
          Dynamic composition, engaging for children, professional book cover quality.`;
}
```

**Usage:**
- `packages/content-agent/src/services/ArtGenerationService.ts:298` - Cover art generation

## Body Illustration Prompts

### Body Illustration Prompt

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:488-499`

**Purpose:** Build illustration prompt for story beat with camera angle and depth

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:488-499
private buildIllustrationPrompt(
  beat: StoryBeat, 
  protagonistDNA: ProtagonistDNA, 
  cameraAngle: string, 
  depthDirective: string
): string {
  return `Children's book illustration: ${beat.content}. 
          Character: ${protagonistDNA.visualDescription}. 
          Camera: ${cameraAngle}. 
          Depth: ${depthDirective}. 
          Emotional tone: ${beat.emotionalTone}. 
          Warm, child-friendly art style.`;
}
```

**Usage:**
- `packages/content-agent/src/services/ArtGenerationService.ts:279` - Body illustration generation
- `packages/content-agent/src/services/ArtGenerationService.ts:255-281` - Generate body illustrations with cinematic directives

## Image Generation

### DALL-E Image Generation

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:502-513`

**Purpose:** Generate image using DALL-E 3 with prompt truncation

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:502-513
private async generateImage(prompt: string): Promise<string> {
  const response = await this.openai.images.generate({
    model: "dall-e-3",
    prompt: this.truncateToWordLimit(prompt, 400), // DALL-E 3 prompt limit
    size: this.config.imageSize,
    quality: this.config.quality,
    style: this.config.style,
    n: 1
  });
  
  return response.data[0].url || '';
}
```

**Note:** Prompts are truncated to 400 words to meet DALL-E 3 limits.

## Video Generation (Sora)

### Sora Animation Prompt

**Location:** `lambda-deployments/content-agent/src/services/AnimationService.ts:87-295`

**Purpose:** Generate animated video from story images using Sora-2

**Code Reference:**
```typescript
// Code location: lambda-deployments/content-agent/src/services/AnimationService.ts:87-295
async generateAnimatedCover(request: AnimationRequest): Promise<AnimationResponse> {
  // Build prompt with GLOBAL_STYLE
  const { GLOBAL_STYLE, FALLBACK_PALETTE } = await import('../constants/GlobalArtStyle');
  
  const prompt = `${GLOBAL_STYLE}
  
  ANIMATED MICRO EPISODE - THERAPEUTIC STORYTELLING
  
  Context: Educational bibliotherapy content for young audiences ages 3-10.
  Purpose: Transform collaborative story session into animated episode while maintaining therapeutic storytelling quality.
  
  CHARACTER & VISUAL CONSISTENCY:
  Protagonist: ${request.characterTraits.name}
  Appearance: ${request.characterTraits.visualDescription || 'As shown in images'}
  CRITICAL: Character must look EXACTLY as depicted in these ${request.images.length} images throughout animation.
  `;
}
```

**Full Prompt Structure:**
- Global style applied
- Character consistency requirements
- Story context
- Therapeutic storytelling quality
- Age-appropriate content

**Code References:**
- `lambda-deployments/content-agent/src/services/AnimationService.ts:210-264` - Sora API call
- `lambda-deployments/content-agent/src/services/AnimationService.ts:412-413` - GLOBAL_STYLE usage

## Image Analysis (GPT-Vision)

### Reference Image Analysis

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:340-378`

**Purpose:** Analyze reference image for visual consistency

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:340-378
async analyzeReferenceImage(imageUrl: string, context: string): Promise<{
  visualElements: string[];
  colorPalette: string[];
  style: string;
  consistency: number;
  recommendations: string[];
}> {
  const response = await this.openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this image for visual consistency in a children's story context: ${context}. 
                   Identify visual elements, color palette, artistic style, and provide consistency score (0-100) 
                   and recommendations for maintaining visual coherence.`
          },
          {
            type: "image_url",
            image_url: { url: imageUrl }
          }
        ]
      }
    ],
    max_tokens: 500
  });
}
```

## Palette Journey Generation

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:168-222`

**Purpose:** Generate color palette journey through story emotional arc

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:168-222
generatePaletteJourney(story: Story, motif: StoryMotif): PaletteJourney {
  const basePalette = motif.visualElements.filter(el => 
    ['warm', 'cool', 'bright', 'soft', 'vibrant'].some(word => el.toLowerCase().includes(word))
  );
  
  return {
    step1: {
      colors: [...basePalette, 'soft pastels'],
      mood: 'ordinary world',
      description: 'Establishing the ordinary world with familiar, comforting colors'
    },
    step2: {
      colors: [...basePalette, 'hint of adventure gold'],
      mood: 'call to adventure',
      description: 'Adding excitement while maintaining comfort'
    },
    step3: {
      colors: ['deeper tones', 'richer saturation', 'dramatic shadows'],
      mood: 'challenges',
      description: 'Intensifying colors to reflect growing challenges'
    },
    step4: {
      colors: ['bright highlights', 'triumphant gold', 'victory white'],
      mood: 'climax',
      description: 'Peak intensity with bright, powerful colors'
    },
    step5: {
      colors: [...basePalette, 'warm golden glow'],
      mood: 'resolution',
      description: 'Return to comfort with added warmth from growth'
    }
  };
}
```

## Cover Art Moment Selection

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:228-250`

**Purpose:** Find the most visually kinetic, plot-shifting moment for cover art

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:228-250
findCoverArtMoment(story: Story): CoverArtMoment {
  const beats = story.content.beats;
  const scoredMoments: CoverArtMoment[] = [];
  
  beats.forEach(beat => {
    const visualKineticScore = this.scoreVisualKinetic(beat);
    const plotShiftingScore = this.scorePlotShifting(beat, story.content);
    const combinedScore = (visualKineticScore * 0.6) + (plotShiftingScore * 0.4);
    
    scoredMoments.push({
      beatId: beat.id,
      description: beat.content,
      visualKineticScore,
      plotShiftingScore,
      combinedScore
    });
  });
  
  // Return the highest scoring moment
  return scoredMoments.reduce((best, current) => 
    current.combinedScore > best.combinedScore ? current : best
  );
}
```

## Body Illustrations Generation

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:255-281`

**Purpose:** Generate 4 body illustrations with cinematic camera and depth directives

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:255-281
generateBodyIllustrations(story: Story, protagonistDNA: ProtagonistDNA): BodyIllustration[] {
  const beats = story.content.beats;
  const keyBeats = this.selectKeyBeats(beats, 4);
  
  const cameraAngles = [
    'wide establishing shot',
    'medium close-up',
    'dramatic low angle',
    'intimate close-up'
  ];
  
  const depthDirectives = [
    'shallow depth of field with blurred background',
    'deep focus with detailed environment',
    'dramatic foreground/background separation',
    'intimate depth with soft bokeh'
  ];
  
  return keyBeats.map((beat, index) => ({
    sequence: index + 1,
    beatId: beat.id,
    description: beat.content,
    cameraAngle: cameraAngles[index],
    depthDirective: depthDirectives[index],
    prompt: this.buildIllustrationPrompt(beat, protagonistDNA, cameraAngles[index], depthDirectives[index])
  }));
}
```

## Complete Art Generation Flow

**Location:** `packages/content-agent/src/services/ArtGenerationService.ts:286-335`

**Purpose:** Generate all art assets for a story

**Code Reference:**
```typescript
// Code location: packages/content-agent/src/services/ArtGenerationService.ts:286-335
async generateStoryArt(story: Story, character: Character): Promise<GeneratedArt> {
  const protagonistDNA = this.extractProtagonistDNA(character);
  const motif = this.generateStoryMotif(story);
  const paletteJourney = this.generatePaletteJourney(story, motif);
  const coverMoment = this.findCoverArtMoment(story);
  const bodyIllustrations = this.generateBodyIllustrations(story, protagonistDNA);
  
  // Generate character art
  const characterHeadshotPrompt = this.buildCharacterPrompt(protagonistDNA, 'headshot');
  const characterBodyshotPrompt = this.buildCharacterPrompt(protagonistDNA, 'bodyshot');
  
  // Generate cover art prompt
  const coverArtPrompt = this.buildCoverArtPrompt(coverMoment, protagonistDNA, motif, paletteJourney);
  
  // Generate all images in parallel
  const [
    characterHeadshot,
    characterBodyshot,
    coverArt,
    ...bodyIllustrationImages
  ] = await Promise.all([
    this.generateImage(characterHeadshotPrompt),
    this.generateImage(characterBodyshotPrompt),
    this.generateImage(coverArtPrompt),
    ...bodyIllustrations.map(ill => this.generateImage(ill.prompt))
  ]);
  
  return {
    coverArt: {
      url: coverArt,
      prompt: coverArtPrompt,
      moment: coverMoment
    },
    bodyIllustrations: bodyIllustrations.map((ill, index) => ({
      url: bodyIllustrationImages[index],
      prompt: ill.prompt,
      illustration: ill
    })),
    characterArt: {
      headshot: {
        url: characterHeadshot,
        prompt: characterHeadshotPrompt
      },
      bodyshot: {
        url: characterBodyshot,
        prompt: characterBodyshotPrompt
      }
    }
  };
}
```

## Related Prompts

- **Content Generation:** See [Content Generation Prompts](./content-generation.md)
- **Story Creation:** See [Content Generation Prompts](./content-generation.md#story-creation)

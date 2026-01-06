import { Character, CharacterTraits, Story, StoryContent, StoryBeat } from '@alexa-multi-agent/shared-types';
import OpenAI from 'openai';

export interface ArtGenerationConfig {
  openaiApiKey: string;
  maxPromptLength: number;
  imageSize: '1024x1024' | '1792x1024' | '1024x1792';
  quality: 'standard' | 'hd';
  style: 'vivid' | 'natural';
}

export interface ProtagonistDNA {
  visualDescription: string; // ≤60 words
  coreTraits: string[];
  species: string;
  appearance: string;
  inclusivityElements: string[];
}

export interface StoryMotif {
  primaryTheme: string;
  visualElements: string[];
  symbolism: string[];
  atmosphere: string;
}

export interface PaletteJourney {
  step1: { colors: string[]; mood: string; description: string };
  step2: { colors: string[]; mood: string; description: string };
  step3: { colors: string[]; mood: string; description: string };
  step4: { colors: string[]; mood: string; description: string };
  step5: { colors: string[]; mood: string; description: string };
}

export interface CoverArtMoment {
  beatId: string;
  description: string;
  visualKineticScore: number;
  plotShiftingScore: number;
  combinedScore: number;
}

export interface BodyIllustration {
  sequence: number;
  beatId: string;
  description: string;
  cameraAngle: string;
  depthDirective: string;
  prompt: string;
}

export interface GeneratedArt {
  coverArt: {
    url: string;
    prompt: string;
    moment: CoverArtMoment;
  };
  bodyIllustrations: {
    url: string;
    prompt: string;
    illustration: BodyIllustration;
  }[];
  characterArt: {
    headshot: { url: string; prompt: string };
    bodyshot: { url: string; prompt: string };
  };
}

export class ArtGenerationService {
  private openai: OpenAI;
  private config: ArtGenerationConfig;

  constructor(config: ArtGenerationConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  /**
   * Extract protagonist DNA from character traits (≤60 words)
   */
  extractProtagonistDNA(character: Character): ProtagonistDNA {
    const traits = character.traits;
    const appearance = traits.appearance;
    
    // Build core visual description
    const visualElements: string[] = [];
    
    // Species and basic form
    visualElements.push(traits.species);
    if (traits.age) visualElements.push(`${traits.age} years old`);
    if (traits.gender) visualElements.push(traits.gender);
    
    // Physical appearance
    if (appearance.eyeColor) visualElements.push(`${appearance.eyeColor} eyes`);
    if (appearance.hairColor && appearance.hairTexture) {
      visualElements.push(`${appearance.hairTexture} ${appearance.hairColor} hair`);
    } else if (appearance.hairColor) {
      visualElements.push(`${appearance.hairColor} hair`);
    }
    
    // Clothing and accessories
    if (appearance.clothing) visualElements.push(appearance.clothing);
    if (appearance.accessories?.length) {
      visualElements.push(`wearing ${appearance.accessories.join(', ')}`);
    }
    
    // Inclusivity elements
    const inclusivityElements: string[] = [];
    if (traits.inclusivityTraits?.length) {
      traits.inclusivityTraits.forEach(trait => {
        inclusivityElements.push(trait.description);
      });
    }
    
    // Devices and assistive technology
    if (appearance.devices?.length) {
      inclusivityElements.push(...appearance.devices);
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
      inclusivityElements
    };
  }

  /**
   * Generate story-wide motif and visual themes
   */
  generateStoryMotif(story: Story): StoryMotif {
    const content = story.content;
    
    // Extract primary theme from story type and content
    const themeMap: Record<string, string> = {
      'Adventure': 'exploration and discovery',
      'Bedtime': 'comfort and peaceful dreams',
      'Birthday': 'celebration and joy',
      'Educational': 'learning and growth',
      'Financial Literacy': 'responsibility and smart choices',
      'Language Learning': 'communication and cultural connection',
      'Medical Bravery': 'courage and healing',
      'Mental Health': 'emotional wellness and self-care',
      'Milestones': 'achievement and progress',
      'New Chapter Sequel': 'continuation and new beginnings',
      'Tech Readiness': 'innovation and digital literacy'
    };
    
    const primaryTheme = themeMap[content.type] || 'personal growth';
    
    // Generate visual elements based on setting and theme
    const visualElements = [
      content.setting,
      `${content.mood} atmosphere`,
      `${primaryTheme} symbolism`
    ];
    
    // Add hero's journey visual elements
    const journeyElements = content.heroJourneyStructure
      .filter(beat => beat.completed)
      .map(beat => this.getJourneyVisualElement(beat.stage));
    
    return {
      primaryTheme,
      visualElements: [...visualElements, ...journeyElements],
      symbolism: this.generateSymbolism(content.type, primaryTheme),
      atmosphere: content.mood
    };
  }

  /**
   * Create 5-step palette journey for visual consistency
   */
  generatePaletteJourney(story: Story, motif: StoryMotif): PaletteJourney {
    const moodPalettes = {
      'excited': ['vibrant orange', 'electric blue', 'sunny yellow'],
      'calm': ['soft blue', 'gentle green', 'warm beige'],
      'mysterious': ['deep purple', 'midnight blue', 'silver'],
      'gentle': ['pastel pink', 'light lavender', 'cream'],
      'adventurous': ['forest green', 'earth brown', 'sky blue'],
      'peaceful': ['sage green', 'soft white', 'pale gold']
    };
    
    const basePalette = moodPalettes[story.content.mood] || moodPalettes['gentle'];
    
    return {
      step1: {
        colors: basePalette,
        mood: 'introduction',
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

  /**
   * Find the most visually kinetic, plot-shifting moment for cover art
   */
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

  /**
   * Generate 4 body illustrations with cinematic camera and depth directives
   */
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

  /**
   * Generate all art assets for a story
   */
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
    
    // Generate all images
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

  /**
   * Analyze reference image for consistency using GPT-Vision
   */
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
    
    const analysis = response.choices[0].message.content || '';
    
    // Parse the analysis (simplified - in production, use structured output)
    return {
      visualElements: this.extractListFromText(analysis, 'visual elements'),
      colorPalette: this.extractListFromText(analysis, 'colors'),
      style: this.extractStyleFromText(analysis),
      consistency: this.extractConsistencyScore(analysis),
      recommendations: this.extractListFromText(analysis, 'recommendations')
    };
  }

  // Private helper methods

  private truncateToWordLimit(text: string, wordLimit: number): string {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  }

  private getJourneyVisualElement(stage: string): string {
    const stageVisuals: Record<string, string> = {
      'ordinary_world': 'familiar environment',
      'call_to_adventure': 'mysterious invitation',
      'crossing_threshold': 'doorway or portal',
      'tests_allies_enemies': 'challenges and companions',
      'ordeal': 'dramatic confrontation',
      'reward': 'treasure or achievement',
      'return_elixir': 'transformed hero'
    };
    return stageVisuals[stage] || 'story element';
  }

  private generateSymbolism(storyType: string, theme: string): string[] {
    const symbolMap: Record<string, string[]> = {
      'Adventure': ['compass', 'mountain peak', 'treasure chest'],
      'Bedtime': ['moon', 'stars', 'cozy blanket'],
      'Birthday': ['candles', 'balloons', 'gift box'],
      'Educational': ['book', 'lightbulb', 'growing plant'],
      'Medical Bravery': ['heart', 'healing hands', 'rainbow after storm']
    };
    return symbolMap[storyType] || ['growth', 'journey', 'discovery'];
  }

  private scoreVisualKinetic(beat: StoryBeat): number {
    const kineticWords = ['run', 'jump', 'fly', 'chase', 'dance', 'fight', 'climb', 'swim', 'race'];
    const content = beat.content.toLowerCase();
    let score = 0;
    
    kineticWords.forEach(word => {
      if (content.includes(word)) score += 10;
    });
    
    // Bonus for action-oriented emotional tone
    if (['excited', 'adventurous', 'dramatic'].includes(beat.emotionalTone)) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }

  private scorePlotShifting(beat: StoryBeat, content: StoryContent): number {
    // Higher score for beats that represent major story turns
    const plotWords = ['discover', 'realize', 'transform', 'decide', 'confront', 'overcome'];
    const beatContent = beat.content.toLowerCase();
    let score = 0;
    
    plotWords.forEach(word => {
      if (beatContent.includes(word)) score += 15;
    });
    
    // Check if this beat has choices (indicates plot branching)
    if (beat.choices && beat.choices.length > 0) {
      score += 25;
    }
    
    return Math.min(score, 100);
  }

  private selectKeyBeats(beats: StoryBeat[], count: number): StoryBeat[] {
    if (beats.length <= count) return beats;
    
    // Select beats evenly distributed through the story
    const interval = Math.floor(beats.length / count);
    const selected: StoryBeat[] = [];
    
    for (let i = 0; i < count; i++) {
      const index = Math.min(i * interval, beats.length - 1);
      selected.push(beats[index]);
    }
    
    return selected;
  }

  private buildCharacterPrompt(protagonistDNA: ProtagonistDNA, type: 'headshot' | 'bodyshot'): string {
    const basePrompt = `Children's book illustration of ${protagonistDNA.visualDescription}`;
    const stylePrompt = ', warm and friendly art style, soft colors, child-appropriate';
    
    if (type === 'headshot') {
      return `${basePrompt}, portrait view, smiling expression${stylePrompt}`;
    } else {
      return `${basePrompt}, full body view, standing pose${stylePrompt}`;
    }
  }

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

  private async generateImage(prompt: string): Promise<string> {
    const response = await this.openai.images.generate({
      model: "dall-e-3",
      prompt: this.truncateToWordLimit(prompt, 400), // DALL-E 3 prompt limit
      size: this.config.imageSize,
      quality: this.config.quality,
      style: this.config.style,
      n: 1
    });
    
    return response.data?.[0]?.url || '';
  }

  // Simplified text parsing helpers (in production, use structured output)
  private extractListFromText(text: string, category: string): string[] {
    // Simplified extraction - in production, use more sophisticated parsing
    return text.split('\n')
      .filter(line => line.toLowerCase().includes(category))
      .map(line => line.trim())
      .slice(0, 5);
  }

  private extractStyleFromText(text: string): string {
    // Simplified extraction
    const styleMatch = text.match(/style[:\s]+([^.\n]+)/i);
    return styleMatch ? styleMatch[1].trim() : 'children\'s book illustration';
  }

  private extractConsistencyScore(text: string): number {
    // Simplified extraction
    const scoreMatch = text.match(/(\d+)(?:%|\s*out\s*of\s*100)/i);
    return scoreMatch ? parseInt(scoreMatch[1]) : 75;
  }
}
/**
 * Character Image Generator
 * 
 * Generates headshot and bodyshot reference images with:
 * - GLOBAL_STYLE artistic consistency
 * - MANDATORY language to combat AI bias
 * - Hex color precision
 * - Inclusivity trait enforcement
 * 
 * This service ensures character images match Buildship quality while
 * maintaining authentic inclusivity representation.
 */

import OpenAI from 'openai';
import { DEFAULT_IMAGE_MODEL } from '@alexa-multi-agent/shared-types';
import { GLOBAL_STYLE, ARTISTIC_EXECUTION } from '../constants/GlobalArtStyle';
import { InclusivityTrait } from '../constants/ComprehensiveInclusivityDatabase';
import { getSpeciesProfile, needsAnatomyPrefix } from '../constants/SpeciesAnatomyProfiles';

export interface CharacterTraits {
  name: string;
  age: number;
  species: string;
  ethnicity?: string[];
  gender?: string;
  hairColor?: string;
  hairTexture?: string;
  hairLength?: string;
  eyeColor?: string;
  skinTone?: string;
  clothing?: string;
  clothingColors?: string[];
  accessories?: string[];
  personality?: string[];
  inclusivityTraits?: any[];
}

export interface HexColors {
  skin: string;
  hair: string;
  eyes: string;
}

export class CharacterImageGenerator {
  private openai: OpenAI;
  private logger: any;

  constructor(openai: OpenAI, logger: any) {
    this.openai = openai;
    this.logger = logger;
  }

  /**
   * Generate headshot with AI bias mitigation
   */
  async generateHeadshot(
    traits: CharacterTraits,
    inclusivityTraits: InclusivityTrait[],
    hexColors: HexColors
  ): Promise<{ url: string; prompt: string }> {
    const prompt = this.buildHeadshotPrompt(traits, inclusivityTraits, hexColors);
    
    this.logger.info('Generating headshot with AI bias mitigation', {
      characterName: traits.name,
      inclusivityTraitCount: inclusivityTraits.length,
      promptLength: prompt.length,
      hexColors
    });
    
    const headshotSize = '1024x1024';
    if (headshotSize !== '1024x1024') {
      throw new Error('Headshot size must be 1024x1024');
    }
    
    const response = await this.openai.images.generate({
      model: DEFAULT_IMAGE_MODEL,
      prompt,
      size: headshotSize,
      quality: 'high'
    });
    
    // Handle both URL and b64_json responses
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error('No image data returned from OpenAI');
    }
    
    let url: string;
    if (imageData.url) {
      url = imageData.url;
    } else if (imageData.b64_json) {
      // gpt-image-1.5 may return base64 - we'll need to upload to S3
      // For now, log and use a placeholder (will be uploaded by caller)
      url = `data:image/png;base64,${imageData.b64_json}`;
      this.logger.info('Image returned as base64, caller will upload to S3');
    } else {
      throw new Error('No URL or b64_json in image response');
    }

    this.logger.info('Headshot generated successfully', {
      characterName: traits.name,
      format: imageData.url ? 'URL' : 'base64',
      urlPreview: url.substring(0, 60)
    });
    
    return { url, prompt };
  }

  /**
   * Generate bodyshot with AI bias mitigation
   */
  async generateBodyshot(
    traits: CharacterTraits,
    inclusivityTraits: InclusivityTrait[],
    hexColors: HexColors
  ): Promise<{ url: string; prompt: string }> {
    const prompt = this.buildBodyshotPrompt(traits, inclusivityTraits, hexColors);
    
    this.logger.info('Generating bodyshot with AI bias mitigation', {
      characterName: traits.name,
      inclusivityTraitCount: inclusivityTraits.length,
      promptLength: prompt.length
    });
    
    const bodyshotSize = '1024x1536';
    if (bodyshotSize !== '1024x1536') {
      throw new Error('Bodyshot size must be 1024x1536');
    }
    
    const response = await this.openai.images.generate({
      model: DEFAULT_IMAGE_MODEL,
      prompt,
      size: bodyshotSize,
      quality: 'high'
    });
    
    // Handle both URL and b64_json responses  
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error('No image data returned from OpenAI');
    }
    
    let url: string;
    if (imageData.url) {
      url = imageData.url;
    } else if (imageData.b64_json) {
      url = `data:image/png;base64,${imageData.b64_json}`;
      this.logger.info('Bodyshot returned as base64, caller will upload to S3');
    } else {
      throw new Error('No URL or b64_json in bodyshot response');
    }

    this.logger.info('Bodyshot generated successfully', {
      characterName: traits.name,
      format: imageData.url ? 'URL' : 'base64',
      urlPreview: url.substring(0, 60)
    });
    
    return { url, prompt };
  }

  /**
   * Generate bodyshot using headshot as visual reference via images.edit()
   * CRITICAL for character consistency - ensures bodyshot matches headshot
   * Matches Buildship's approach for same-character guarantee
   */
  async generateBodyshotWithReference(
    traits: CharacterTraits,
    inclusivityTraits: InclusivityTrait[],
    hexColors: HexColors,
    headshotReference: File
  ): Promise<{ url: string; prompt: string }> {
    const prompt = this.buildBodyshotPrompt(traits, inclusivityTraits, hexColors);
    
    this.logger.info('Generating bodyshot using headshot as reference (images.edit)', {
      characterName: traits.name,
      method: 'images.edit',
      visualConsistency: true
    });
    
    const bodyshotEditSize = '1024x1536';
    if (bodyshotEditSize !== '1024x1536') {
      throw new Error('Bodyshot size must be 1024x1536');
    }
    
    // Use images.edit() - AI sees headshot and matches it
    const response = await this.openai.images.edit({
      model: DEFAULT_IMAGE_MODEL,
      image: headshotReference,
      prompt: `Full body view from head to toe of this EXACT character shown in reference image.
Same person, same appearance, same traits. ${prompt}`,
      size: bodyshotEditSize
    });
    
    // Handle URL or base64 response
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error('No image data from bodyshot generation');
    }
    
    let url: string;
    if (imageData.url) {
      url = imageData.url;
    } else if (imageData.b64_json) {
      url = `data:image/png;base64,${imageData.b64_json}`;
      this.logger.info('Bodyshot with reference returned as base64, caller will upload to S3');
    } else {
      throw new Error('No image data from bodyshot generation');
    }
    
    this.logger.info('Bodyshot generated successfully using headshot reference', {
      characterName: traits.name,
      format: imageData.url ? 'URL' : 'base64',
      visualConsistency: 'SAME character as headshot'
    });
    
    return { url, prompt };
  }

  /**
   * Build species anatomy prefix to prevent "human in costume" problem
   * This goes FIRST in prompt before artistic direction
   */
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
    
    // Critical anatomy emphasis (prevent costume interpretation)
    sections.push('=== SPECIES ANATOMY - CRITICAL ===');
    sections.push('');
    sections.push(profile.criticalAnatomyEmphasis);
    sections.push('');
    sections.push(`ANATOMY BASE: ${profile.anatomyBase}`);
    sections.push('');
    sections.push(`ANTHROPOMORPHISM: ${profile.anthropomorphismLevel}`);
    sections.push('');
    
    // If inclusivity traits present, add adaptation guidance
    if (inclusivityTraits.length > 0) {
      sections.push('TRAIT ADAPTATION FOR THIS SPECIES:');
      sections.push(profile.traitAdaptationPrinciple);
      sections.push('');
      sections.push('DEVICE TRANSFORMATION:');
      sections.push(profile.deviceAdaptationPrinciple);
      sections.push('');
      
      // Add specific examples for traits present
      if (profile.exampleAdaptations) {
        const traitExamples: string[] = [];
        
        // Check which traits are present and add relevant examples
        inclusivityTraits.forEach(trait => {
          if (trait.id === 'down_syndrome' && profile.exampleAdaptations?.downSyndrome) {
            traitExamples.push(`Down Syndrome: ${profile.exampleAdaptations.downSyndrome}`);
          }
          if (trait.id.includes('wheelchair') && profile.exampleAdaptations?.wheelchair) {
            traitExamples.push(`Wheelchair: ${profile.exampleAdaptations.wheelchair}`);
          }
          if (trait.id.includes('prosthetic') && profile.exampleAdaptations?.prosthetic) {
            traitExamples.push(`Prosthetic: ${profile.exampleAdaptations.prosthetic}`);
          }
          if (trait.id === 'vitiligo' && profile.exampleAdaptations?.vitiligo) {
            traitExamples.push(`Vitiligo: ${profile.exampleAdaptations.vitiligo}`);
          }
          if (trait.id === 'albinism' && profile.exampleAdaptations?.albinism) {
            traitExamples.push(`Albinism: ${profile.exampleAdaptations.albinism}`);
          }
          if (trait.id === 'burn_scars' && profile.exampleAdaptations?.burnScars) {
            traitExamples.push(`Burn Scars: ${profile.exampleAdaptations.burnScars}`);
          }
          if (trait.id === 'autism' && profile.exampleAdaptations?.autism) {
            traitExamples.push(`Autism: ${profile.exampleAdaptations.autism}`);
          }
          if (trait.id === 'hearing_aids' && profile.exampleAdaptations?.hearingAids) {
            traitExamples.push(`Hearing Aids: ${profile.exampleAdaptations.hearingAids}`);
          }
          if (trait.id === 'halo_cervical_orthosis' && profile.exampleAdaptations?.haloDevice) {
            traitExamples.push(`Halo Device: ${profile.exampleAdaptations.haloDevice}`);
          }
        });
        
        if (traitExamples.length > 0) {
          sections.push('ADAPTATION EXAMPLES FOR THIS CHARACTER:');
          traitExamples.forEach(example => sections.push(`- ${example}`));
          sections.push('');
        }
      }
    }
    
    sections.push('=== END SPECIES ANATOMY ===');
    sections.push('');
    
    return sections.join('\n');
  }

  /**
   * Build headshot prompt with MANDATORY trait enforcement
   * Includes species anatomy prefix and ethnicity-aware concealment handling
   */
  private buildHeadshotPrompt(
    traits: CharacterTraits,
    inclusivityTraits: InclusivityTrait[],
    hexColors: HexColors
  ): string {
    const ageSafe = this.getAgeSafeLanguage(traits.age);
    
    // Ethnicity handling with concealment awareness
    const ethnicityText = traits.ethnicity?.length 
      ? traits.ethnicity.join(' and ') 
      : 'diverse heritage';
    
    // Check for face concealment (helmet, mask, visor)
    const hasConcealment = this.checkForConcealment(traits);
    
    // For concealed faces, ensure ethnicity still visible on body
    const ethnicityNote = hasConcealment 
      ? `\n\nIMPORTANT: Even with concealed face, character's ${ethnicityText} ethnicity is visible through body parts (hands, neck, arms) with skin tone hex ${hexColors.skin}.`
      : '';
    
    // Build MANDATORY section for inclusivity traits (with traits for context detection)
    const mandatorySection = this.buildMandatorySection(inclusivityTraits, false, traits);
    
    // Build negative prompt section
    const negativeSection = this.buildNegativePromptSection(inclusivityTraits);
    
    // CRITICAL: Species anatomy prefix FIRST (prevents "human in costume")
    const speciesPrefix = this.buildSpeciesAnatomyPrefix(traits.species, traits, inclusivityTraits);
    
    // Prompt order: Species, Artistic direction, Global style, Details
    const prompt = `
${speciesPrefix}

${ARTISTIC_EXECUTION}

${GLOBAL_STYLE}

CHARACTER REFERENCE - HEADSHOT PORTRAIT

CHARACTER IDENTITY (Protagonist DNA):
- Name: ${traits.name}
- Age: ${ageSafe}
- Species: ${traits.species}
- Ethnicity: ${ethnicityText}
- Gender: ${traits.gender || 'not specified'}${ethnicityNote}

PRECISE VISUAL DETAILS (EXACT HEX CODES MANDATORY):
- Skin tone: Hex ${hexColors.skin} (${this.describeHex(hexColors.skin)})
  CRITICAL: Use EXACT hex ${hexColors.skin}, NOT lighter, NOT "softened"
  Painterly subsurface scattering for natural warmth, illustrated texture
  
- Hair: Hex ${hexColors.hair}, ${traits.hairTexture || 'natural texture'}
  Painterly strand detail showing brush work, natural volume
  Length: ${traits.hairLength || 'natural length'}
  Texture: ${traits.hairTexture || 'natural'}
  
- Eyes: Hex ${hexColors.eyes}, ${this.getEyeShape(traits)}
  Bright expressive with illustrated sparkle, painterly highlights

CLOTHING & STYLE:
- Style: ${traits.clothing || 'Age-appropriate comfortable clothing'}
- Colors: ${traits.clothingColors?.join(', ') || 'Complement natural tones'}
- Accessories: ${traits.accessories?.join(', ') || 'Minimal, character-appropriate'}

${mandatorySection}

${negativeSection}

EXPRESSION & COMPOSITION:
- Framing: Headshot (shoulders up), front-facing
- Expression: ${this.getPrimaryExpression(traits)}
- Gaze: Direct eye contact, warm and inviting
- Background: Soft gradient with atmospheric painterly quality

ARTISTIC EXECUTION:
${ARTISTIC_EXECUTION}

FINAL REMINDER - FIRM STYLE ENFORCEMENT:
High-quality digital hand-painting with cinematic lighting and atmospheric depth.
Premium children's book illustration with painterly quality.
This artistic style applies EQUALLY to ALL species - human, dragon, robot, monster, alien, elemental, ALL.
Species anatomy varies, ARTISTIC STYLE does not.

PURPOSE: Character reference sheet for maintaining visual consistency across all story illustrations.

OUTPUT: Professional character headshot celebrating authentic diversity with beautiful illustrated quality across any species.
    `.trim();

    return prompt;
  }

  /**
   * Build bodyshot prompt with MANDATORY trait enforcement
   * Includes species anatomy prefix for consistency
   */
  private buildBodyshotPrompt(
    traits: CharacterTraits,
    inclusivityTraits: InclusivityTrait[],
    hexColors: HexColors
  ): string {
    const ageSafe = this.getAgeSafeLanguage(traits.age);
    const ethnicityText = traits.ethnicity?.length 
      ? traits.ethnicity.join(' and ') 
      : 'diverse heritage';
    
    // Build MANDATORY section (same traits, full body visibility, with traits for context)
    const mandatorySection = this.buildMandatorySection(inclusivityTraits, true, traits);
    
    // Build negative prompt section
    const negativeSection = this.buildNegativePromptSection(inclusivityTraits);
    
    // CRITICAL: Species anatomy prefix FIRST (consistency with headshot)
    const speciesPrefix = this.buildSpeciesAnatomyPrefix(traits.species, traits, inclusivityTraits);
    
    const prompt = `
${speciesPrefix}

${ARTISTIC_EXECUTION}

${GLOBAL_STYLE}

CHARACTER REFERENCE - FULL BODY STANDING POSE

CHARACTER IDENTITY:
- Name: ${traits.name}
- Age: ${ageSafe}
- Species: ${traits.species}
- Ethnicity: ${ethnicityText}
- Gender: ${traits.gender || 'not specified'}

PRECISE VISUAL DETAILS (MUST MATCH HEADSHOT EXACTLY):
- Skin tone: Hex ${hexColors.skin} (${this.describeHex(hexColors.skin)})
  CRITICAL: EXACT same hex as headshot ${hexColors.skin}
  Full body coverage, consistent tone, natural warmth
  
- Hair: Hex ${hexColors.hair}, ${traits.hairTexture || 'natural texture'}
  SAME exact style, color, texture as headshot
  Length: ${traits.hairLength || 'natural length'}
  
- Eyes: Hex ${hexColors.eyes}, ${this.getEyeShape(traits)}
  SAME exact color and expression style as headshot

CLOTHING & FULL OUTFIT:
- Complete outfit: ${traits.clothing || 'Age-appropriate comfortable clothing'}
- Colors: ${traits.clothingColors?.join(', ') || 'Complement skin/hair tones'}
- Accessories: ${traits.accessories?.join(', ') || 'Minimal'}
- Fit: Appropriate for age and activity level

${mandatorySection}

${negativeSection}

POSE & COMPOSITION (REFERENCE SHEET):
- Standing position: Neutral front view (NOT action pose)
- Arms: Relaxed at sides or gentle natural gesture
- Legs: Standing upright, balanced stance
- Posture: Natural for age, confident but approachable
- Background: Neutral gradient (warm, soft colors)
- Framing: Full body visible, head to feet, centered

PURPOSE:
This is a CHARACTER REFERENCE SHEET for maintaining visual consistency.
It must show COMPLETE appearance for use in dynamic story illustrations.
All assistive devices, inclusivity features MUST be visible.

ARTISTIC EXECUTION:
${ARTISTIC_EXECUTION}

${GLOBAL_STYLE}

FINAL REMINDER - FIRM STYLE ENFORCEMENT:
This artistic style applies EQUALLY to ALL species - human, dragon, robot, monster, alien, ALL.
Species anatomy varies, ARTISTIC STYLE does not. Same painterly quality across all species.

CRITICAL REQUIREMENTS:
- EXACT match to headshot: Face, hair, skin, eyes IDENTICAL
- Exact hex colors: Skin ${hexColors.skin}, Hair ${hexColors.hair}, Eyes ${hexColors.eyes}
- Full body inclusivity traits visible (wheelchair, prosthetics, etc.)
- Species anatomy correct (if dragon, show DRAGON body not human in costume)
- Neutral standing/seated pose appropriate for species (reference sheet, NOT action)
- Professional character sheet quality

OUTPUT: Professional full-body character reference matching headshot exactly, with proper species anatomy.
    `.trim();

    return prompt;
  }

  /**
   * Build MANDATORY section to combat AI bias
   * CRITICAL SAFETY: Adds criticalSafetyNegatives FIRST for high-risk devices
   * CONTEXT-SENSITIVE: Uses appropriate description per context (halo device, etc.)
   */
  private buildMandatorySection(
    inclusivityTraits: InclusivityTrait[],
    isFullBody: boolean = false,
    traits?: CharacterTraits
  ): string {
    if (inclusivityTraits.length === 0) {
      return 'MANDATORY: Character appearance as specified above with exact hex colors.';
    }

    const sections: string[] = [];
    
    // CRITICAL SAFETY: Add critical safety negatives FIRST (before anything else)
    const criticalSafetyTraits = inclusivityTraits.filter(t => t.criticalSafetyNegatives);
    if (criticalSafetyTraits.length > 0) {
      sections.push('\n=== CRITICAL SAFETY - READ FIRST ===');
      sections.push('');
      criticalSafetyTraits.forEach(trait => {
        sections.push(`${trait.label.toUpperCase()} - MISINTERPRETATION PREVENTION:`);
        trait.criticalSafetyNegatives!.forEach(negative => {
          sections.push(`!!! ${negative}`);
        });
        sections.push('');
      });
      sections.push('=== END CRITICAL SAFETY ===');
      sections.push('');
    }
    
    // Then add standard mandatory section
    sections.push('MANDATORY - CRITICAL - REJECT IMAGE IF NOT FOLLOWED:');
    sections.push('');
    
    inclusivityTraits.forEach(trait => {
      sections.push(`${trait.label.toUpperCase()}:`);
      
      // CONTEXT-SENSITIVE: Use appropriate description for context (halo device pattern)
      if (trait.contextDescriptions && traits) {
        const context = this.determineContext(traits);
        const contextDescription = trait.contextDescriptions[context];
        if (contextDescription) {
          sections.push(contextDescription);
        } else {
          sections.push(trait.gptImageSafePrompt);
        }
      } else {
        sections.push(trait.gptImageSafePrompt);
      }
      
      sections.push('');
      
      // Add each MANDATORY requirement
      trait.mandatoryVisualRequirements.forEach(req => {
        sections.push(`  !!! ${req}`);
      });
      
      sections.push(''); // Blank line between traits
    });

    if (isFullBody) {
      sections.push('FULL BODY NOTE: ALL assistive devices and inclusivity features MUST be visible in complete body view.');
    }
    
    return sections.join('\n');
  }

  /**
   * Build negative prompt section (what AI must NOT do)
   */
  private buildNegativePromptSection(inclusivityTraits: InclusivityTrait[]): string {
    if (inclusivityTraits.length === 0) {
      return `
STRICT PROHIBITIONS:
— No text, captions, UI elements, or watermarks
— No stereotyping or exaggeration of features
— No generic stock art aesthetic
      `.trim();
    }

    const sections: string[] = [
      '\nSTRICT PROHIBITIONS - DO NOT GENERATE:'
    ];
    
    // Add general prohibitions
    sections.push('— No text, captions, UI elements, or watermarks');
    sections.push('— No stereotyping or exaggeration of ethnic features');
    sections.push('— No generic stock art aesthetic');
    sections.push('');
    
    // Add trait-specific prohibitions
    inclusivityTraits.forEach(trait => {
      if (trait.negativePrompt) {
        sections.push(trait.negativePrompt);
        sections.push('');
      }
    });
    
    return sections.join('\n');
  }

  /**
   * Get age-safe language (avoids "X-year-old" which AI may flag)
   */
  private getAgeSafeLanguage(age: number): string {
    if (age <= 3) return 'Very young character with toddler proportions, emerging features';
    if (age <= 5) return 'Young character with preschool-age proportions, youthful features';
    if (age <= 7) return 'Young character with early elementary proportions, school-age features';
    if (age <= 9) return 'Young character with mid-elementary proportions, developing features';
    return 'Pre-adolescent character with upper elementary proportions, maturing features';
  }

  /**
   * Get culturally-appropriate eye shape description
   */
  private getEyeShape(traits: CharacterTraits): string {
    if (traits.ethnicity?.some(e => ['Chinese', 'Japanese', 'Korean'].includes(e))) {
      return 'almond-shaped, culturally authentic features';
    }
    return 'bright and expressive';
  }

  /**
   * Get primary expression based on personality
   */
  private getPrimaryExpression(traits: CharacterTraits): string {
    const personality = traits.personality || [];
    
    if (personality.includes('brave')) return 'Confident, determined, ready for adventure';
    if (personality.includes('kind')) return 'Warm, gentle smile, compassionate';
    if (personality.includes('curious')) return 'Bright-eyed, wondering, engaged';
    if (personality.includes('creative')) return 'Thoughtful, imaginative, inspired';
    
    return 'Joyful, welcoming, warm genuine smile';
  }

  /**
   * Check if character has face concealment (helmet, mask, visor)
   * Used for ethnicity-aware handling
   */
  private checkForConcealment(traits: CharacterTraits): boolean {
    const clothing = traits.clothing?.toLowerCase() || '';
    const accessories = (traits.accessories || []).map(a => a.toLowerCase()).join(' ');
    
    const concealmentKeywords = [
      'helmet',
      'mask',
      'visor',
      'hood',
      'face cover',
      'concealed',
      'hidden face',
      'reflective visor'
    ];
    
    return concealmentKeywords.some(keyword => 
      clothing.includes(keyword) || accessories.includes(keyword)
    );
  }

  /**
   * Detect specific animal type from traits (cat, dog, dragon, etc.)
   * Note: Dragons/unicorns are Fantasy Beings, not animals
   */
  private getSpecificAnimalType(traits: CharacterTraits): string {
    const name = traits.name?.toLowerCase() || '';
    const description = JSON.stringify(traits).toLowerCase();
    
    // Real-world animals (not fantasy creatures)
    const animalTypes = [
      { keywords: ['cat', 'feline', 'kitten'], type: 'cat' },
      { keywords: ['dog', 'canine', 'puppy'], type: 'dog' },
      { keywords: ['rabbit', 'bunny'], type: 'rabbit' },
      { keywords: ['bear'], type: 'bear' },
      { keywords: ['bird', 'owl', 'eagle', 'parrot'], type: 'bird' },
      { keywords: ['fox'], type: 'fox' },
      { keywords: ['wolf'], type: 'wolf' },
      { keywords: ['lion', 'tiger', 'leopard', 'cheetah'], type: 'big cat' },
      { keywords: ['mouse', 'rat', 'hamster'], type: 'rodent' }
    ];
    
    for (const animal of animalTypes) {
      if (animal.keywords.some(kw => name.includes(kw) || description.includes(kw))) {
        return animal.type;
      }
    }
    
    return 'animal'; // Generic fallback
  }

  /**
   * Detect specific fantasy being type (dragon, elf, fairy, unicorn, etc.)
   */
  private getSpecificFantasyType(traits: CharacterTraits): string {
    const name = traits.name?.toLowerCase() || '';
    const description = JSON.stringify(traits).toLowerCase();
    
    // Fantasy creatures
    const fantasyTypes = [
      { keywords: ['dragon', 'drake', 'wyvern', 'scales', 'wings', 'breathe fire'], type: 'dragon' },
      { keywords: ['unicorn', 'horn', 'magical horse'], type: 'unicorn' },
      { keywords: ['fairy', 'pixie', 'sprite', 'tiny', 'wings'], type: 'fairy' },
      { keywords: ['elf', 'elven', 'pointed ears'], type: 'elf' },
      { keywords: ['cyclops', 'one eye', 'single eye'], type: 'cyclops' },
      { keywords: ['griffin', 'gryphon'], type: 'griffin' },
      { keywords: ['centaur', 'half horse'], type: 'centaur' },
      { keywords: ['phoenix', 'fire bird', 'rebirth'], type: 'phoenix' },
      { keywords: ['mermaid', 'merman', 'tail', 'fins', 'underwater'], type: 'mermaid' }
    ];
    
    for (const fantasy of fantasyTypes) {
      if (fantasy.keywords.some(kw => name.includes(kw) || description.includes(kw))) {
        return fantasy.type;
      }
    }
    
    return 'fantasy being'; // Generic fallback
  }

  /**
   * Detect specific elemental type (fire, water, earth, air, etc.)
   */
  private getSpecificElementalType(traits: CharacterTraits): string {
    const name = traits.name?.toLowerCase() || '';
    const description = JSON.stringify(traits).toLowerCase();
    const skinTone = traits.skinTone?.toLowerCase() || '';
    
    // Elemental types
    const elementalTypes = [
      { keywords: ['fire', 'flame', 'blaze', 'ember'], type: 'fire' },
      { keywords: ['water', 'aqua', 'ocean', 'liquid'], type: 'water' },
      { keywords: ['earth', 'stone', 'rock', 'plant', 'nature'], type: 'earth' },
      { keywords: ['air', 'wind', 'cloud', 'breeze'], type: 'air' },
      { keywords: ['ice', 'frost', 'frozen', 'crystal'], type: 'ice' },
      { keywords: ['lightning', 'electric', 'thunder', 'spark'], type: 'lightning' }
    ];
    
    for (const elemental of elementalTypes) {
      if (elemental.keywords.some(kw => name.includes(kw) || description.includes(kw) || skinTone.includes(kw))) {
        return elemental.type;
      }
    }
    
    return 'elemental'; // Generic fallback
  }

  /**
   * Determine context for context-sensitive traits (halo device, etc.)
   * Matches wheelchair success pattern: different description per context
   */
  private determineContext(traits: CharacterTraits): 'medical' | 'superhero' | 'fantasy' | 'scifi' | 'robot' {
    const species = traits.species?.toLowerCase() || '';
    const clothing = traits.clothing?.toLowerCase() || '';
    const accessories = (traits.accessories || []).map(a => a.toLowerCase()).join(' ');
    
    // Superhero context
    if (species === 'superhero' || clothing.includes('cape') || clothing.includes('super')) {
      return 'superhero';
    }
    
    // Robot context
    if (species === 'robot') {
      return 'robot';
    }
    
    // Fantasy context (dragons, monsters, fantasy beings)
    if (species === 'fantasy_being' || species === 'monster' || species === 'dinosaur') {
      return 'fantasy';
    }
    
    // Sci-fi context (aliens, space themes)
    if (species === 'alien' || clothing.includes('space') || clothing.includes('astronaut') || accessories.includes('space')) {
      return 'scifi';
    }
    
    // Elemental context (treated as fantasy/magical)
    if (species === 'elemental') {
      return 'fantasy';
    }
    
    // Default to medical (human or unspecified)
    return 'medical';
  }

  /**
   * Describe hex color in rich natural language
   */
  private describeHex(hex: string): string {
    const descriptions: Record<string, string> = {
      // Skin tones
      '#6F4E37': 'deep rich cocoa brown',
      '#8D5524': 'warm mahogany',
      '#5C4033': 'rich chocolate brown',
      '#D2A679': 'warm caramel with golden undertones',
      '#F1C27D': 'golden honey tan',
      '#E1B899': 'soft peachy beige',
      '#F7DAD9': 'fair rose porcelain',
      '#F3D8C5': 'light peachy cream',
      '#E6BE8A': 'golden tan',
      '#FFE0BD': 'fair porcelain',
      '#D4A373': 'warm tan',
      '#C68642': 'rich amber',
      '#D9A66C': 'warm honey',
      '#E8B887': 'light golden tan',
      '#C17A4F': 'deep tan',
      
      // Hair colors (unique codes)
      '#1C1C1C': 'jet black with blue undertones',
      '#4B3621': 'deep chestnut brown',
      '#F4E4C1': 'golden blonde',
      '#D4C3A7': 'sandy blonde',
      '#B94E48': 'auburn red',
      '#A0522D': 'deep auburn',
      '#F5F5F5': 'silvery white',
      '#C0C0C0': 'silver gray',
      '#9B59B6': 'vibrant purple',
      '#FFB6C1': 'soft pink',
      
      // Eye colors (unique codes)
      '#3E2723': 'deep dark brown',
      '#8B7355': 'warm light brown',
      '#87CEEB': 'light sky blue',
      '#1E3A5F': 'deep navy blue',
      '#8E7618': 'warm hazel gold',
      '#708090': 'soft slate gray',
      '#FFBF00': 'bright amber',
      '#8A2BE2': 'vivid violet'
    };
    
    return descriptions[hex] || 'natural tone';
  }
}

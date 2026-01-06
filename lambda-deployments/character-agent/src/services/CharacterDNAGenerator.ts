/**
 * Character DNA Generator
 * Creates visual consistency signatures for use across all story images
 */

import { CharacterTraits } from './ConversationalCharacterCreator';
import { AgeSafePromptGenerator } from './AgeSafePromptGenerator';

export interface CharacterDNA {
  characterId: string;
  dnaSignature: string;
  visualConsistencyPrompt: string;
  safetyFilteredPrompt: string;
  hexColors: {
    skin: string;
    hair: string;
    eyes: string;
  };
  inclusivityVisuals: string[];
  appearanceSummary: string;
  personalityQuirks: string;
}

export class CharacterDNAGenerator {
  
  /**
   * Generate complete DNA signature from character traits
   */
  generate(traits: CharacterTraits): CharacterDNA {
    const dnaSignature = this.createSignature(traits);
    const hexColors = this.extractHexColors(traits);
    const inclusivityVisuals = this.buildInclusivityVisuals(traits);
    const consistencyPrompt = this.buildConsistencyPrompt(traits, hexColors, inclusivityVisuals);
    const safetyPrompt = this.buildSafetyFilteredPrompt(traits, hexColors, inclusivityVisuals);
    const appearanceSummary = this.buildAppearanceSummary(traits, hexColors);
    const personalityQuirks = this.buildPersonalityQuirks(traits);
    
    return {
      characterId: `char_${Date.now()}`,
      dnaSignature,
      visualConsistencyPrompt: consistencyPrompt,
      safetyFilteredPrompt: safetyPrompt,
      hexColors,
      inclusivityVisuals,
      appearanceSummary,
      personalityQuirks
    };
  }
  
  /**
   * Create unique DNA signature for versioning
   */
  private createSignature(traits: CharacterTraits): string {
    const key = `${traits.name}_${traits.species}_${traits.age}_${traits.ethnicity.join('_')}_v1`;
    return key.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }
  
  /**
   * Extract or generate hex colors
   */
  private extractHexColors(traits: CharacterTraits): { skin: string; hair: string; eyes: string } {
    return {
      skin: traits.skinHex || this.inferSkinHex(traits.ethnicity),
      hair: traits.hairHex || this.inferHairHex(traits.ethnicity, traits.hairColor),
      eyes: traits.eyeHex || this.inferEyeHex(traits.eyeColor)
    };
  }
  
  /**
   * Build inclusivity visual descriptions (celebrated, not clinical)
   */
  private buildInclusivityVisuals(traits: CharacterTraits): string[] {
    const visuals: string[] = [];
    
    traits.inclusivityTraits.forEach(trait => {
      const visual = this.getInclusivityVisual(trait, traits);
      if (visual) visuals.push(visual);
    });
    
    return visuals;
  }
  
  /**
   * Build master consistency prompt (internal use, full details)
   */
  private buildConsistencyPrompt(
    traits: CharacterTraits,
    hexColors: any,
    inclusivityVisuals: string[]
  ): string {
    const ageSafe = AgeSafePromptGenerator.getAgeSafeDescriptor(traits.age, traits.gender);
    const ethnicity = traits.ethnicity.join(' and ');
    
    return `${ageSafe} with ${ethnicity} heritage. 
Skin tone Hex ${hexColors.skin} (${this.describeColor(hexColors.skin)}). 
Hair Hex ${hexColors.hair} (${traits.hairTexture || 'natural texture'}, ${traits.hairColor || 'rich color'}). 
Eyes Hex ${hexColors.eyes} (${traits.eyeColor || 'bright expressive'}). 
${traits.species !== 'human' ? `Species: ${traits.species}.` : ''}
${inclusivityVisuals.length ? inclusivityVisuals.join('. ') + '.' : ''}
${traits.appearanceDescription || ''}
Personality: ${traits.personality.join(', ')}.
CRITICAL: Maintain exact hex colors and inclusivity features in all images.`;
  }
  
  /**
   * Build safety-filtered prompt for gpt-image-1
   */
  private buildSafetyFilteredPrompt(
    traits: CharacterTraits,
    hexColors: any,
    inclusivityVisuals: string[]
  ): string {
    const prompt = this.buildConsistencyPrompt(traits, hexColors, inclusivityVisuals);
    return AgeSafePromptGenerator.sanitizePrompt(prompt);
  }
  
  /**
   * Build concise appearance summary (for quick reference)
   */
  private buildAppearanceSummary(traits: CharacterTraits, hexColors: any): string {
    const parts: string[] = [];
    
    if (traits.ethnicity.length) {
      parts.push(traits.ethnicity.join('-') + ' heritage');
    }
    
    parts.push(`${this.describeColor(hexColors.skin)} skin`);
    parts.push(`${traits.hairTexture || ''} ${traits.hairColor || ''} hair`.trim());
    parts.push(`${traits.eyeColor || ''} eyes`.trim());
    
    if (traits.species !== 'human') {
      parts.push(traits.species);
    }
    
    // Add key inclusivity features
    traits.inclusivityTraits.slice(0, 2).forEach(trait => {
      parts.push(this.getInclusivityShort(trait));
    });
    
    return parts.filter(Boolean).join(', ');
  }
  
  /**
   * Build personality and quirks summary
   */
  private buildPersonalityQuirks(traits: CharacterTraits): string {
    const parts: string[] = [];
    parts.push(...traits.personality.slice(0, 3));
    parts.push(...traits.quirks.slice(0, 2));
    return parts.join(', ');
  }
  
  /**
   * Infer skin hex from ethnicity
   */
  private inferSkinHex(ethnicities: string[]): string {
    // Map ethnicities to appropriate skin tone hex codes
    const ethnicityToHex: Record<string, string> = {
      'African': '#8D5524',
      'African American/Black': '#6F4E37',
      'Asian Indian': '#E1B899',
      'Chinese': '#F1C27D',
      'Japanese': '#F7DAD9',
      'Korean': '#F3D8C5',
      'Mexican': '#D2A679',
      'Filipino': '#E6BE8A',
      'White/Caucasian': '#FFE0BD',
      'Hispanic/Latino': '#D4A373',
      'Middle Eastern': '#C68642',
      'South Asian': '#D9A66C',
      'Southeast Asian': '#E8B887',
      // ... more mappings
    };
    
    // Use first ethnicity or blend
    return ethnicityToHex[ethnicities[0]] || '#E8B887';
  }
  
  /**
   * Infer hair hex
   */
  private inferHairHex(ethnicities: string[], hairColor?: string): string {
    if (hairColor?.toLowerCase().includes('black')) return '#1C1C1C';
    if (hairColor?.toLowerCase().includes('brown')) return '#4B3621';
    if (hairColor?.toLowerCase().includes('blonde')) return '#F4E4C1';
    if (hairColor?.toLowerCase().includes('red')) return '#B94E48';
    if (hairColor?.toLowerCase().includes('white')) return '#F5F5F5';
    if (hairColor?.toLowerCase().includes('purple')) return '#9B59B6';
    
    // Default based on ethnicity
    const darkHair = ['African', 'Asian', 'Hispanic', 'Middle Eastern'];
    return darkHair.some(e => ethnicities.includes(e)) ? '#1C1C1C' : '#4B3621';
  }
  
  /**
   * Infer eye hex
   */
  private inferEyeHex(eyeColor?: string): string {
    const colorMap: Record<string, string> = {
      'brown': '#5C4033',
      'blue': '#4A90E2',
      'green': '#50C878',
      'hazel': '#8E7618',
      'gray': '#708090',
      'amber': '#FFBF00'
    };
    
    return colorMap[eyeColor?.toLowerCase() || ''] || '#5C4033';
  }
  
  /**
   * Describe hex color in natural language
   */
  private describeColor(hex: string): string {
    // Map hex to descriptive names
    const descriptions: Record<string, string> = {
      '#D2A679': 'warm caramel',
      '#8D5524': 'rich mahogany',
      '#F1C27D': 'golden tan',
      '#4B3621': 'deep brown',
      '#1C1C1C': 'jet black',
      // ... more
    };
    
    return descriptions[hex] || 'natural tone';
  }
  
  /**
   * Get full inclusivity visual description
   */
  private getInclusivityVisual(trait: string, character: CharacterTraits): string {
    const visuals: Record<string, string> = {
      wheelchair_user: `Uses custom ${character.age < 7 ? 'small' : 'standard'} wheelchair, decorated with stickers and ${this.getPersonalizedDecoration(character)}, shown as empowering mobility device`,
      vitiligo: `Beautiful vitiligo creating light patches in unique patterns on visible skin, celebrated as distinctive beautiful feature`,
      prosthetic_leg: `${character.age < 7 ? 'Small' : 'Athletic'} prosthetic leg, ${this.getColor(character)} colored, shown with pride as part of their identity`,
      down_syndrome: `Almond-shaped eyes with gentle upward slant, flatter nasal bridge, soft rounded facial features, portrayed with warmth intelligence and joy`,
      autism: `May wear ${this.getColor(character)} noise-canceling headphones, or be shown with deep focus on special interest`,
      // ... 200+ more
    };
    
    return visuals[trait] || `Unique trait: ${trait} represented respectfully`;
  }
  
  /**
   * Get short inclusivity descriptor
   */
  private getInclusivityShort(trait: string): string {
    const short: Record<string, string> = {
      wheelchair_user: 'uses wheelchair',
      vitiligo: 'vitiligo patterns',
      prosthetic_leg: 'prosthetic leg',
      autism: 'autistic',
      adhd: 'ADHD',
      // ... more
    };
    
    return short[trait] || trait;
  }
  
  /**
   * Get personalized decoration based on personality
   */
  private getPersonalizedDecoration(character: CharacterTraits): string {
    if (character.personality.includes('brave')) return 'superhero stickers';
    if (character.personality.includes('kind')) return 'rainbow and heart stickers';
    if (character.personality.includes('curious')) return 'star and planet stickers';
    return 'colorful stickers';
  }
  
  /**
   * Get preferred color from character
   */
  private getColor(character: CharacterTraits): string {
    // Infer from appearance or default
    if (character.appearanceDescription?.toLowerCase().includes('purple')) return 'purple';
    if (character.appearanceDescription?.toLowerCase().includes('blue')) return 'blue';
    if (character.appearanceDescription?.toLowerCase().includes('pink')) return 'pink';
    if (character.appearanceDescription?.toLowerCase().includes('red')) return 'red';
    return 'colorful';
  }
}


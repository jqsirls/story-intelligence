/**
 * Sophisticated Headshot Generator
 * Uses your detailed prompt template for high-quality, inclusive character portraits
 */

import OpenAI from 'openai';
import { CharacterDNA } from './CharacterDNAGenerator';
import { CharacterTraits } from './ConversationalCharacterCreator';

export class HeadshotGenerator {
  private openai: OpenAI;
  
  constructor(openaiKey: string) {
    this.openai = new OpenAI({ apiKey: openaiKey });
  }
  
  /**
   * Generate headshot using sophisticated prompt
   */
  async generateHeadshot(traits: CharacterTraits, dna: CharacterDNA): Promise<{
    headshotUrl: string;
    prompt: string;
  }> {
    const prompt = this.buildSophisticatedPrompt(traits, dna);
    
    // Validate safety
    const { safe, issues } = this.validatePromptSafety(prompt);
    if (!safe) {
      console.warn('Prompt safety issues:', issues);
      // Auto-fix
      const sanitized = this.sanitizePrompt(prompt);
      return this.generateWithPrompt(sanitized);
    }
    
    return this.generateWithPrompt(prompt);
  }
  
  /**
   * Build YOUR sophisticated headshot prompt
   */
  private buildSophisticatedPrompt(traits: CharacterTraits, dna: CharacterDNA): string {
    const ageSafe = this.getAgeSafeLanguage(traits.age);
    const ethnicVisual = this.getEthnicVisualFeatures(traits.ethnicity);
    const inclusivityVisual = dna.inclusivityVisuals.join('. ');
    
    return `
**Portrait composition: Headshot framing (shoulders up), close-up emphasizing character expression and features.**

CHARACTER IDENTITY:
- Visual age indicators: ${ageSafe}
- Heritage: ${ethnicVisual}
- Gender presentation: ${this.getGenderPresentation(traits.gender)}
- Species: ${traits.species}${traits.species !== 'human' ? ' with distinguishing features' : ''}

PRECISE VISUAL DETAILS:
- Skin tone: Hex ${dna.hexColors.skin} (${this.describeHexColor(dna.hexColors.skin)})
  Subsurface scattering for natural warmth, subtle skin texture
- Hair: Hex ${dna.hexColors.hair} (${traits.hairTexture || 'natural texture'}, ${this.getHairLength(traits)})
  Fine strand detail, natural volume and flow, ${this.getHairShine(traits)}
- Eyes: Hex ${dna.hexColors.eyes} (${this.getEyeShape(traits)})
  Bright expressive, subtle specular highlights, emotional depth

INCLUSIVITY REPRESENTATION (Celebrated Naturally):
${inclusivityVisual}
${this.getInclusivityDetailedVisual(traits)}

EXPRESSION & PERSONALITY:
- Primary emotion: ${this.getExpression(traits)}
- Demeanor: ${traits.personality.slice(0, 2).join(' and ')}
- Gaze: Direct eye contact with viewer, warm and inviting
- Signature expression: ${this.getSignatureExpression(traits)}

ARTISTIC EXECUTION:
— Medium: High-resolution digital hand-painting
— Technique: Soft airbrush blends layered with subtle painterly brush strokes
— Surface: Fine canvas tooth for warmth, visible grain at 300 ppi
— Edge handling: Clean painted edges, crisp silhouette control
— Dimensional shading: Subsurface bounce, glossy specular on eyes, no heavy impasto

LIGHTING & COLOR:
— Primary: Warm key light versus cool teal/purple shadows
— Accents: Luminous golden rim highlights
— Atmosphere: Atmospheric depth haze with floating light motes
— Color integration: Weave HEX codes (${dna.hexColors.skin}, ${dna.hexColors.hair}, ${dna.hexColors.eyes}) into skin/hair/eyes seamlessly

COMPOSITION:
— Framing: Headshot (shoulders up)
— Focus: Sharp on eyes, gentle bokeh on edges
— Depth: Subtle atmospheric perspective
— Energy: Dynamic yet approachable, filled with movement and emotion

STYLE REFERENCE:
High-end children's book illustration meets cinematic character portrait.
Balance whimsy with believability.
Engaging and relatable for ages 3-10.
Professional therapeutic storytelling aesthetic.

CRITICAL REQUIREMENTS:
- Exact hex colors MUST be visible: Skin ${dna.hexColors.skin}, Hair ${dna.hexColors.hair}, Eyes ${dna.hexColors.eyes}
- Inclusivity traits portrayed with dignity and celebration
- Age-appropriate proportions for ${traits.age} years
- ${traits.species !== 'human' ? traits.species + ' features clearly visible' : 'Human features accurate to ethnicity'}
- Clean professional execution appropriate for therapeutic use

STRICT PROHIBITIONS:
— No text, captions, UI elements, or watermarks
— No stereotyping or exaggeration of ethnic features
— No medical/clinical framing of disabilities
— No generic stock art aesthetic
— No inconsistency in specified features

OUTPUT: Professional character headshot portrait celebrating diversity and inclusion.
`.trim();
  }
  
  /**
   * Generate image with constructed prompt
   */
  private async generateWithPrompt(prompt: string): Promise<{
    headshotUrl: string;
    prompt: string;
  }> {
    const response = await this.openai.images.generate({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      quality: 'hd',
      n: 1
    });
    
    return {
      headshotUrl: response.data?.[0]?.url || '',
      prompt
    };
  }
  
  // Helper methods
  
  private getAgeSafeLanguage(age: number): string {
    if (age <= 3) return 'Very young character with toddler proportions, emerging features';
    if (age <= 5) return 'Young character with preschool-age proportions, youthful features';
    if (age <= 7) return 'Young character with early elementary proportions, school-age features';
    if (age <= 9) return 'Young character with mid-elementary proportions, developing features';
    return 'Pre-adolescent character with upper elementary proportions, maturing features';
  }
  
  private getEthnicVisualFeatures(ethnicities: string[]): string {
    if (ethnicities.length === 0) return 'diverse heritage';
    if (ethnicities.length === 1) return `${ethnicities[0]} heritage with authentic cultural features`;
    return `Multiracial (${ethnicities.join(' and ')}) with blended features representing all heritages equally`;
  }
  
  private getGenderPresentation(gender?: string): string {
    if (!gender || gender === 'Prefer not to specify') return 'Gender-neutral presentation';
    if (gender === 'Non-Binary') return 'Androgynous, non-binary presentation';
    if (gender === 'Gender Fluid') return 'Gender-diverse, fluid presentation';
    if (gender === 'Male') return 'Male-presenting features';
    if (gender === 'Female') return 'Female-presenting features';
    return 'Unique gender expression';
  }
  
  private getExpression(traits: CharacterTraits): string {
    if (traits.personality.includes('brave')) return 'Confident, determined';
    if (traits.personality.includes('kind')) return 'Warm, gentle smile';
    if (traits.personality.includes('curious')) return 'Bright-eyed, wondering';
    return 'Joyful, welcoming';
  }
  
  private getSignatureExpression(traits: CharacterTraits): string {
    if (traits.quirks.length) return traits.quirks[0];
    return 'Warm encouraging smile that lights up the frame';
  }
  
  private getHairLength(traits: CharacterTraits): string {
    if (traits.appearanceDescription?.toLowerCase().includes('long')) return 'flowing long';
    if (traits.appearanceDescription?.toLowerCase().includes('short')) return 'short cropped';
    if (traits.appearanceDescription?.toLowerCase().includes('shoulder')) return 'shoulder-length';
    return 'natural length';
  }
  
  private getHairShine(traits: CharacterTraits): string {
    return traits.hairTexture?.includes('coily') || traits.hairTexture?.includes('curly')
      ? 'natural texture with subtle sheen'
      : 'soft natural highlights';
  }
  
  private getEyeShape(traits: CharacterTraits): string {
    // Cultural considerations for eye shape
    if (traits.ethnicity.some(e => ['Chinese', 'Japanese', 'Korean'].includes(e))) {
      return 'almond-shaped, culturally authentic';
    }
    return 'bright and expressive';
  }
  
  private getInclusivityDetailedVisual(traits: CharacterTraits): string {
    const details: string[] = [];
    
    traits.inclusivityTraits.forEach(trait => {
      if (trait === 'wheelchair_user') {
        details.push('Wheelchair headrest and frame visible in lower portion, decorated and personalized');
      }
      if (trait === 'vitiligo') {
        details.push('Vitiligo patches clearly visible on neck, face, or arms within frame, creating beautiful unique patterns');
      }
      if (trait === 'down_syndrome') {
        details.push('Down syndrome facial features portrayed with medical accuracy AND dignity - almond eyes, flatter bridge, rounded features');
      }
      if (trait === 'hearing_aids' || trait === 'cochlear_implant') {
        details.push('Hearing device visible behind ear, shown as cool tech accessory part of their style');
      }
      if (trait === 'prosthetic_arm') {
        details.push('Prosthetic arm/hand visible in frame, celebrated as part of their identity');
      }
    });
    
    return details.join('\n');
  }
  
  private describeHexColor(hex: string): string {
    // Rich color descriptions
    const map: Record<string, string> = {
      '#D2A679': 'warm caramel with golden undertones',
      '#8D5524': 'rich deep mahogany',
      '#6F4E37': 'deep cocoa brown',
      '#F1C27D': 'golden honey tan',
      '#4B3621': 'deep chestnut brown',
      '#1C1C1C': 'jet black with blue undertones',
      '#50C878': 'vibrant emerald green',
      '#4A90E2': 'bright sky blue',
      '#5C4033': 'warm chocolate brown'
    };
    
    return map[hex] || 'natural tone';
  }
  
  private validatePromptSafety(prompt: string): { safe: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for blocked terms
    if (prompt.match(/\d+-year-old/)) issues.push('Contains age number');
    if (prompt.match(/\bchild\b/i)) issues.push('Contains "child"');
    if (prompt.match(/\bkid\b/i)) issues.push('Contains "kid"');
    
    return { safe: issues.length === 0, issues };
  }
  
  private sanitizePrompt(prompt: string): string {
    let safe = prompt;
    safe = safe.replace(/\d+-year-old/g, 'young character with age-appropriate proportions');
    safe = safe.replace(/\bchild\b/gi, 'young character');
    safe = safe.replace(/\bkid\b/gi, 'young person');
    return safe;
  }
}


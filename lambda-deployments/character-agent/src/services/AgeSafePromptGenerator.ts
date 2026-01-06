/**
 * Age-Safe Prompt Generator
 * Converts age numbers to gpt-image-1 safe descriptors
 */

export class AgeSafePromptGenerator {
  /**
   * Convert age to safety-compliant descriptor
   */
  static getAgeSafeDescriptor(age: number, gender?: string): string {
    const ageDescriptors: Record<number, string> = {
      1: 'very young character with toddler proportions and emerging features',
      2: 'very young character with toddler stature and baby-faced features',
      3: 'young character with preschool proportions and youthful features',
      4: 'young character with preschool-age stature and playful demeanor',
      5: 'young character with kindergarten-age proportions and bright curious expression',
      6: 'young character with early elementary features and school-age proportions',
      7: 'young character with elementary school proportions and youthful energy',
      8: 'young character with mid-elementary features and growing confidence',
      9: 'young character with upper elementary proportions approaching pre-teen',
      10: 'pre-adolescent character with late elementary features and maturing presence'
    };
    
    const base = ageDescriptors[age] || 'young character with age-appropriate proportions';
    
    if (gender && gender !== 'Prefer not to specify') {
      const genderMap: Record<string, string> = {
        'Male': 'male-presenting',
        'Female': 'female-presenting',
        'Non-Binary': 'androgynous',
        'Gender Fluid': 'gender-diverse presentation',
        'Other': 'unique gender expression'
      };
      
      return `${base}, ${genderMap[gender] || 'gender-neutral'} features`;
    }
    
    return base;
  }
  
  /**
   * Generate full safety-compliant character description
   */
  static generateSafeCharacterPrompt(character: {
    age: number;
    gender?: string;
    ethnicity: string[];
    skinHex: string;
    hairHex: string;
    eyeHex: string;
    inclusivity: string[];
    appearanceDetails: string;
  }): string {
    const ageSafe = this.getAgeSafeDescriptor(character.age, character.gender);
    
    // Avoid "child", "kid", "boy", "girl" without modifiers
    const prompt = `
Portrait of ${ageSafe}.

VISUAL IDENTITY:
- Heritage: ${character.ethnicity.join(' and ')} features visible
- Skin tone: Hex ${character.skinHex} (warm and natural)
- Hair: Hex ${character.hairHex} (${character.appearanceDetails})
- Eyes: Hex ${character.eyeHex} (bright and expressive)

INCLUSIVITY (Celebrated Naturally):
${character.inclusivity.map(trait => this.getInclusivityPrompt(trait)).join('\n')}

COMPOSITION:
Headshot portrait (shoulders up), direct eye contact with viewer.
Warm, encouraging expression. Professional children's book illustration.
Appropriate for therapeutic storytelling, ages 3-10 audience.

ARTISTIC STYLE:
High-resolution digital hand-painting, soft airbrush blends, painterly brushstrokes.
Vibrant cinematic palette, warm key lighting, atmospheric depth.

TECHNICAL:
No text, no captions, no UI, no watermarks.
Professional portrait celebrating diversity and inclusion.
`;
    
    return prompt;
  }
  
  /**
   * Get inclusivity-specific prompt fragment
   */
  private static getInclusivityPrompt(traitId: string): string {
    // Map to visual descriptions from INCLUSIVITY_TRAITS
    const prompts: Record<string, string> = {
      wheelchair_manual: '- Custom wheelchair visible in frame, decorated and personalized, shown as empowering mobility',
      vitiligo: '- Beautiful vitiligo creating light patches in star-like patterns, celebrated as unique feature',
      hearing_aids: '- Colorful hearing aids visible behind ears, shown as cool tech accessory',
      down_syndrome: '- Almond-shaped eyes, flatter nasal bridge, warm rounded features portrayed with dignity',
      // ... more mappings
    };
    
    return prompts[traitId] || `- Unique trait: ${traitId}`;
  }
  
  /**
   * Validate prompt for safety compliance
   */
  static validatePromptSafety(prompt: string): { safe: boolean; issues: string[] } {
    const blockedPatterns = [
      /\d+-year-old/gi,
      /\bchild\b/gi,
      /\bkid\b/gi,
      /\bminor\b/gi,
      /\bunderage\b/gi,
      /\bboy\b(?!\s*character)/gi, // "boy" alone, not "boy character"
      /\bgirl\b(?!\s*character)/gi, // "girl" alone, not "girl character"
    ];
    
    const issues: string[] = [];
    
    blockedPatterns.forEach(pattern => {
      if (pattern.test(prompt)) {
        issues.push(`Contains blocked pattern: ${pattern.source}`);
      }
    });
    
    return {
      safe: issues.length === 0,
      issues
    };
  }
  
  /**
   * Auto-sanitize prompt if validation fails
   */
  static sanitizePrompt(prompt: string): string {
    let safe = prompt;
    
    // Replace blocked terms
    safe = safe.replace(/\d+-year-old/gi, match => {
      const age = parseInt(match);
      return this.getAgeSafeDescriptor(age);
    });
    
    safe = safe.replace(/\bchild\b/gi, 'young character');
    safe = safe.replace(/\bkid\b/gi, 'young person');
    safe = safe.replace(/\b(\d+) year old (boy|girl)\b/gi, (match, age, gender) => {
      return this.getAgeSafeDescriptor(parseInt(age), gender === 'boy' ? 'Male' : 'Female');
    });
    
    return safe;
  }
}


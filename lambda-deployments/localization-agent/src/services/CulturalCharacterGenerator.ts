import OpenAI from 'openai';
import {
  CulturalCharacterGenerationRequest,
  CulturalCharacterGenerationResponse,
  CulturalCharacterTrait
} from '../types';

export class CulturalCharacterGenerator {
  constructor(private openai: OpenAI) {}

  async generateCharacter(request: CulturalCharacterGenerationRequest): Promise<CulturalCharacterGenerationResponse> {
    try {
      const characterPrompt = this.buildCulturalCharacterPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in culturally sensitive character creation for children\'s stories. Create authentic, respectful, and age-appropriate characters that celebrate diversity while avoiding stereotypes.'
          },
          {
            role: 'user',
            content: characterPrompt
          }
        ],
        temperature: 0.4
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        adaptedCharacter: response.adaptedCharacter,
        culturalConsiderations: response.culturalConsiderations || [],
        respectfulRepresentation: response.respectfulRepresentation || true,
        suggestedModifications: response.suggestedModifications || []
      };
    } catch (error) {
      console.error('Cultural character generation error:', error);
      throw new Error('Failed to generate cultural character');
    }
  }

  async getCulturalCharacterTraits(culturalBackground: string[]): Promise<CulturalCharacterTrait[]> {
    const traits: CulturalCharacterTrait[] = [];

    // Define culturally-aware character traits
    const baseTraits = [
      'name',
      'appearance',
      'clothing',
      'food_preferences',
      'family_structure',
      'celebrations',
      'values',
      'communication_style',
      'hobbies',
      'beliefs'
    ];

    for (const trait of baseTraits) {
      const culturalTrait = await this.getCulturalVariationsForTrait(trait, culturalBackground);
      if (culturalTrait) {
        traits.push(culturalTrait);
      }
    }

    return traits;
  }

  async validateCulturalRepresentation(
    character: any,
    culturalBackground: string[]
  ): Promise<{
    isRespectful: boolean;
    concerns: string[];
    suggestions: string[];
  }> {
    try {
      const validationPrompt = `
Please validate this character for cultural sensitivity and respectful representation:

Character: ${JSON.stringify(character, null, 2)}
Cultural Background: ${culturalBackground.join(', ')}

Check for:
1. Stereotypical representations
2. Cultural appropriation
3. Respectful authenticity
4. Age-appropriate cultural elements
5. Inclusive representation

Respond with JSON:
{
  "isRespectful": true/false,
  "concerns": ["list of any cultural sensitivity concerns"],
  "suggestions": ["suggestions for improvement"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a cultural sensitivity expert specializing in children\'s media. Provide thoughtful analysis of character representation.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        temperature: 0.2
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Cultural validation error:', error);
      return {
        isRespectful: false,
        concerns: ['Unable to validate due to technical error'],
        suggestions: ['Please review character manually for cultural sensitivity']
      };
    }
  }

  private buildCulturalCharacterPrompt(request: CulturalCharacterGenerationRequest): string {
    return `
Create a culturally authentic and respectful character based on these requirements:

Cultural Background: ${request.culturalBackground.join(', ')}
Base Character Traits: ${JSON.stringify(request.characterTraits, null, 2)}
Story Context: ${JSON.stringify(request.storyContext, null, 2)}
Respect Cultural Norms: ${request.respectCulturalNorms}

Guidelines:
1. Avoid stereotypes while celebrating authentic cultural elements
2. Include appropriate cultural details (names, clothing, traditions)
3. Ensure representation is respectful and educational
4. Make the character relatable to children of all backgrounds
5. Consider cultural values and family structures
6. Include positive cultural elements that children can learn from
7. Ensure the character fits naturally into the story context

Cultural Considerations:
- Use authentic names that are appropriate for the cultural background
- Include culturally appropriate clothing or accessories when relevant
- Consider cultural values and how they might influence character behavior
- Include cultural celebrations or traditions if they fit the story
- Respect religious or spiritual considerations
- Consider family structure and relationships typical of the culture
- Include cultural foods, games, or activities when appropriate

Please respond with a JSON object containing:
{
  "adaptedCharacter": {
    "name": "culturally appropriate name with meaning",
    "appearance": "respectful physical description",
    "clothing": "culturally appropriate attire",
    "personality": "traits that reflect cultural values positively",
    "background": "brief cultural context",
    "family": "family structure and relationships",
    "interests": "culturally relevant hobbies or activities",
    "values": "positive cultural values the character embodies",
    "language": "languages spoken and cultural expressions used",
    "traditions": "cultural traditions or celebrations the character might participate in"
  },
  "culturalConsiderations": ["important cultural elements incorporated"],
  "respectfulRepresentation": true,
  "suggestedModifications": ["any suggestions for further cultural authenticity"]
}
    `;
  }

  private async getCulturalVariationsForTrait(
    trait: string,
    culturalBackground: string[]
  ): Promise<CulturalCharacterTrait | null> {
    // This would typically query a comprehensive cultural database
    // For now, we'll provide some example variations
    const traitVariations: { [key: string]: any } = {
      'name': {
        trait: 'name',
        culturalVariations: {
          'japanese': {
            appropriateValues: ['Akira', 'Yuki', 'Hana', 'Kenji', 'Sakura'],
            inappropriateValues: ['stereotypical names', 'mispronounced names'],
            culturalNotes: 'Japanese names often have meaningful kanji characters and should be pronounced correctly'
          },
          'arabic': {
            appropriateValues: ['Amira', 'Omar', 'Layla', 'Hassan', 'Zara'],
            inappropriateValues: ['names with negative connotations', 'mispronounced names'],
            culturalNotes: 'Arabic names often have religious or poetic meanings and should be treated with respect'
          },
          'african': {
            appropriateValues: ['Amara', 'Kofi', 'Asha', 'Kwame', 'Zuri'],
            inappropriateValues: ['generic "African" names', 'names without cultural context'],
            culturalNotes: 'African names vary greatly by region and culture, each with specific meanings and traditions'
          }
        }
      },
      'clothing': {
        trait: 'clothing',
        culturalVariations: {
          'indian': {
            appropriateValues: ['colorful kurta', 'traditional sari for special occasions', 'modern fusion wear'],
            inappropriateValues: ['costume-like representations', 'overly exotic descriptions'],
            culturalNotes: 'Indian clothing varies by region and occasion, often featuring beautiful colors and patterns'
          },
          'mexican': {
            appropriateValues: ['embroidered blouse', 'colorful dress', 'modern casual wear with cultural touches'],
            inappropriateValues: ['sombrero and poncho stereotypes', 'costume representations'],
            culturalNotes: 'Mexican clothing includes beautiful traditional embroidery and modern interpretations'
          }
        }
      }
    };

    return traitVariations[trait] || null;
  }

  /**
   * Generate culturally appropriate character names
   */
  async generateCulturalNames(
    culturalBackground: string[],
    gender?: string,
    meaningPreference?: string
  ): Promise<{
    suggestions: Array<{
      name: string;
      meaning: string;
      pronunciation: string;
      culturalSignificance: string;
    }>;
  }> {
    try {
      const namePrompt = `
Generate culturally appropriate names for a character with these backgrounds: ${culturalBackground.join(', ')}
${gender ? 'Gender: ' + gender : ''}
${meaningPreference ? 'Meaning preference: ' + meaningPreference : ''}

Provide 5 authentic name suggestions with:
1. Correct pronunciation guide
2. Cultural meaning
3. Cultural significance
4. Appropriateness for children's stories

Respond with JSON:
{
  "suggestions": [
    {
      "name": "name",
      "meaning": "what the name means",
      "pronunciation": "phonetic pronunciation",
      "culturalSignificance": "cultural context and significance"
    }
  ]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in cultural naming traditions worldwide. Provide authentic, respectful name suggestions with accurate cultural context.'
          },
          {
            role: 'user',
            content: namePrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Cultural name generation error:', error);
      return { suggestions: [] };
    }
  }
}
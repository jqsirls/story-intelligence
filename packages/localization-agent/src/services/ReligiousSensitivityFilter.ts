import OpenAI from 'openai';
import {
  ReligiousSensitivityCheck,
  ReligiousSensitivityResult
} from '../types';

export class ReligiousSensitivityFilter {
  constructor(private openai: OpenAI) {}

  async checkSensitivity(check: ReligiousSensitivityCheck): Promise<ReligiousSensitivityResult> {
    try {
      const sensitivityPrompt = this.buildSensitivityCheckPrompt(check);
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in religious sensitivity and interfaith dialogue. Analyze content for potential religious concerns while maintaining respect for all faith traditions.'
          },
          {
            role: 'user',
            content: sensitivityPrompt
          }
        ],
        temperature: 0.2
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        isAppropriate: response.isAppropriate || false,
        concerns: response.concerns || [],
        suggestions: response.suggestions || [],
        alternativeContent: response.alternativeContent
      };
    } catch (error) {
      console.error('Religious sensitivity check error:', error);
      return {
        isAppropriate: false,
        concerns: ['Unable to perform sensitivity check due to technical error'],
        suggestions: ['Please review content manually for religious sensitivity']
      };
    }
  }

  async getReligiousGuidelines(religiousContext: string[]): Promise<{
    [religion: string]: {
      sensitiveTopics: string[];
      appropriateAlternatives: { [topic: string]: string[] };
      respectfulLanguage: string[];
      celebrationsToInclude: string[];
      celebrationsToAvoid: string[];
    };
  }> {
    // Comprehensive religious guidelines
    return {
      'christianity': {
        sensitiveTopics: ['blasphemy', 'inappropriate religious imagery', 'mocking religious figures'],
        appropriateAlternatives: {
          'magic': ['miracles', 'blessings', 'divine gifts'],
          'witchcraft': ['wisdom', 'special abilities', 'talents']
        },
        respectfulLanguage: ['blessed', 'faithful', 'prayerful', 'gracious'],
        celebrationsToInclude: ['Christmas', 'Easter', 'Thanksgiving'],
        celebrationsToAvoid: ['Halloween (for some denominations)']
      },
      'islam': {
        sensitiveTopics: ['pork', 'alcohol', 'inappropriate imagery', 'disrespect to prophets'],
        appropriateAlternatives: {
          'pork': ['chicken', 'beef', 'lamb', 'vegetables'],
          'alcohol': ['juice', 'water', 'tea', 'milk'],
          'gambling': ['games', 'puzzles', 'sports']
        },
        respectfulLanguage: ['blessed', 'peaceful', 'grateful', 'faithful'],
        celebrationsToInclude: ['Eid al-Fitr', 'Eid al-Adha'],
        celebrationsToAvoid: ['celebrations with alcohol', 'inappropriate music/dancing']
      },
      'judaism': {
        sensitiveTopics: ['non-kosher food', 'sabbath violations', 'inappropriate religious symbols'],
        appropriateAlternatives: {
          'non-kosher': ['kosher alternatives', 'vegetables', 'fruits'],
          'work on sabbath': ['rest', 'family time', 'study', 'prayer']
        },
        respectfulLanguage: ['blessed', 'peaceful', 'wise', 'faithful'],
        celebrationsToInclude: ['Hanukkah', 'Passover', 'Rosh Hashanah'],
        celebrationsToAvoid: ['mixing of meat and dairy', 'work on sabbath']
      },
      'hinduism': {
        sensitiveTopics: ['beef', 'disrespect to animals', 'inappropriate use of sacred symbols'],
        appropriateAlternatives: {
          'beef': ['chicken', 'vegetables', 'lentils', 'dairy'],
          'leather': ['cloth', 'synthetic materials']
        },
        respectfulLanguage: ['blessed', 'peaceful', 'dharmic', 'spiritual'],
        celebrationsToInclude: ['Diwali', 'Holi', 'Dussehra'],
        celebrationsToAvoid: ['disrespect to cows', 'inappropriate use of sacred symbols']
      },
      'buddhism': {
        sensitiveTopics: ['violence', 'harm to living beings', 'disrespect to Buddha'],
        appropriateAlternatives: {
          'violence': ['peaceful resolution', 'compassion', 'understanding'],
          'hunting': ['gardening', 'nature observation', 'caring for animals']
        },
        respectfulLanguage: ['compassionate', 'mindful', 'peaceful', 'wise'],
        celebrationsToInclude: ['Vesak', 'Buddhist New Year'],
        celebrationsToAvoid: ['violence', 'harm to animals']
      }
    };
  }

  async generateReligiouslyInclusiveContent(
    originalContent: string,
    religiousContexts: string[]
  ): Promise<{
    inclusiveContent: string;
    adaptations: string[];
    respectfulElements: string[];
  }> {
    try {
      const inclusivePrompt = `
Transform this content to be respectful and inclusive of these religious contexts: ${religiousContexts.join(', ')}

Original Content: "${originalContent}"

Guidelines:
1. Remove or replace potentially offensive elements
2. Include positive elements from different traditions when appropriate
3. Use universal values that resonate across faiths
4. Maintain the story's core message and entertainment value
5. Ensure age-appropriate religious education when relevant

Respond with JSON:
{
  "inclusiveContent": "adapted content that respects all mentioned religious contexts",
  "adaptations": ["list of changes made for religious sensitivity"],
  "respectfulElements": ["positive religious or spiritual elements included"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in creating religiously inclusive content for children. Transform stories to be respectful of diverse faith traditions while maintaining their educational and entertainment value.'
          },
          {
            role: 'user',
            content: inclusivePrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Religious inclusive content generation error:', error);
      return {
        inclusiveContent: originalContent,
        adaptations: [],
        respectfulElements: []
      };
    }
  }

  private buildSensitivityCheckPrompt(check: ReligiousSensitivityCheck): string {
    return `
Please analyze this content for religious sensitivity:

Content: "${check.content}"
Religious Context: ${check.religiousContext.join(', ')}
Sensitivity Level: ${check.sensitivityLevel}

Check for:
1. Potentially offensive religious references
2. Inappropriate use of religious symbols or figures
3. Content that might conflict with religious beliefs
4. Opportunities to be more inclusive
5. Respectful alternatives if issues are found

Consider the sensitivity level:
- High: Very strict adherence to religious guidelines
- Medium: Respectful but not overly restrictive
- Low: Basic respect for major religious sensitivities

Respond with JSON:
{
  "isAppropriate": true/false,
  "concerns": ["list of specific religious sensitivity concerns"],
  "suggestions": ["suggestions for making content more appropriate"],
  "alternativeContent": "revised content if changes are needed (optional)"
}
    `;
  }

  /**
   * Get interfaith dialogue suggestions for stories involving multiple religions
   */
  async getInterfaithDialogueSuggestions(
    religions: string[],
    storyContext: any
  ): Promise<{
    commonValues: string[];
    respectfulInteractions: string[];
    educationalOpportunities: string[];
    potentialConflicts: string[];
    resolutionStrategies: string[];
  }> {
    try {
      const dialoguePrompt = `
Provide interfaith dialogue guidance for a story involving these religions: ${religions.join(', ')}

Story Context: ${JSON.stringify(storyContext, null, 2)}

Provide guidance on:
1. Common values shared across these faiths
2. How characters can interact respectfully
3. Educational opportunities about different traditions
4. Potential areas of conflict to handle sensitively
5. Strategies for peaceful resolution and understanding

Respond with JSON:
{
  "commonValues": ["values shared across the mentioned faiths"],
  "respectfulInteractions": ["ways characters can interact respectfully"],
  "educationalOpportunities": ["learning opportunities about different traditions"],
  "potentialConflicts": ["areas that might need sensitive handling"],
  "resolutionStrategies": ["approaches for peaceful understanding"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in interfaith dialogue and religious education for children. Provide guidance for creating respectful multi-faith storytelling experiences.'
          },
          {
            role: 'user',
            content: dialoguePrompt
          }
        ],
        temperature: 0.3
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Interfaith dialogue suggestions error:', error);
      return {
        commonValues: ['compassion', 'kindness', 'helping others', 'family love'],
        respectfulInteractions: ['listening to each other', 'asking questions politely', 'sharing traditions'],
        educationalOpportunities: ['learning about different celebrations', 'understanding diverse perspectives'],
        potentialConflicts: ['different dietary restrictions', 'different worship practices'],
        resolutionStrategies: ['focus on common values', 'celebrate differences', 'promote understanding']
      };
    }
  }
}
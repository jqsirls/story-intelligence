import OpenAI from 'openai';
import {
  FamilyStructureAdaptation,
  FamilyStructureAdaptationResult,
  FamilyStructure
} from '../types';

export class FamilyStructureAdapter {
  constructor(private openai: OpenAI) {}

  async adaptContent(adaptation: FamilyStructureAdaptation): Promise<FamilyStructureAdaptationResult> {
    try {
      const adaptationPrompt = this.buildFamilyAdaptationPrompt(adaptation);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in family diversity and inclusive storytelling. Adapt content to reflect different family structures while maintaining story integrity and promoting acceptance of all family types.'
          },
          {
            role: 'user',
            content: adaptationPrompt
          }
        ],
        temperature: 0.3
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        adaptedContent: response.adaptedContent,
        changesExplanation: response.changesExplanation || [],
        culturallyAppropriate: response.culturallyAppropriate || true
      };
    } catch (error) {
      console.error('Family structure adaptation error:', error);
      throw new Error('Failed to adapt content for family structure');
    }
  }

  async getFamilyStructureVariations(): Promise<{
    [structureType: string]: {
      description: string;
      commonTerms: FamilyStructure;
      culturalConsiderations: string[];
      storytellingApproaches: string[];
    };
  }> {
    return {
      'nuclear': {
        description: 'Traditional two-parent household with children',
        commonTerms: {
          type: 'nuclear',
          parentTerms: {
            mother: ['mom', 'mama', 'mother', 'mommy'],
            father: ['dad', 'papa', 'father', 'daddy'],
            parent: ['parent', 'guardian']
          },
          siblingTerms: {
            brother: ['brother', 'bro'],
            sister: ['sister', 'sis'],
            sibling: ['sibling', 'brother or sister']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'grandmother', 'nana'],
            grandfather: ['grandpa', 'grandfather', 'papa'],
            aunt: ['aunt', 'auntie'],
            uncle: ['uncle'],
            cousin: ['cousin']
          }
        },
        culturalConsiderations: ['Most common in Western cultures', 'May not reflect all family realities'],
        storytellingApproaches: ['Include both parents in decision-making', 'Show balanced parental roles']
      },
      'single_parent': {
        description: 'One parent raising children',
        commonTerms: {
          type: 'single_parent',
          parentTerms: {
            mother: ['mom', 'mama', 'mother', 'mommy'],
            father: ['dad', 'papa', 'father', 'daddy'],
            parent: ['parent', 'guardian', 'my grown-up']
          },
          siblingTerms: {
            brother: ['brother', 'bro'],
            sister: ['sister', 'sis'],
            sibling: ['sibling', 'brother or sister']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'grandmother', 'nana'],
            grandfather: ['grandpa', 'grandfather', 'papa'],
            aunt: ['aunt', 'auntie'],
            uncle: ['uncle'],
            cousin: ['cousin']
          }
        },
        culturalConsiderations: ['Increasingly common across cultures', 'May involve extended family support'],
        storytellingApproaches: ['Show strength and resilience', 'Include supportive community', 'Avoid pity narratives']
      },
      'blended': {
        description: 'Families formed through remarriage with children from previous relationships',
        commonTerms: {
          type: 'blended',
          parentTerms: {
            mother: ['mom', 'mama', 'stepmom', 'bonus mom'],
            father: ['dad', 'papa', 'stepdad', 'bonus dad'],
            parent: ['parent', 'step-parent', 'bonus parent']
          },
          siblingTerms: {
            brother: ['brother', 'stepbrother', 'half-brother'],
            sister: ['sister', 'stepsister', 'half-sister'],
            sibling: ['sibling', 'step-sibling', 'bonus sibling']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'step-grandma', 'bonus grandma'],
            grandfather: ['grandpa', 'step-grandpa', 'bonus grandpa'],
            aunt: ['aunt', 'step-aunt'],
            uncle: ['uncle', 'step-uncle'],
            cousin: ['cousin', 'step-cousin']
          }
        },
        culturalConsiderations: ['Complex relationships require sensitivity', 'Multiple households may be involved'],
        storytellingApproaches: ['Celebrate expanded family', 'Address adjustment challenges positively', 'Show love in different forms']
      },
      'multigenerational': {
        description: 'Multiple generations living together',
        commonTerms: {
          type: 'multigenerational',
          parentTerms: {
            mother: ['mom', 'mama', 'mother'],
            father: ['dad', 'papa', 'father'],
            parent: ['parent', 'guardian']
          },
          siblingTerms: {
            brother: ['brother', 'bro'],
            sister: ['sister', 'sis'],
            sibling: ['sibling']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'nana', 'abuela', 'nonna'],
            grandfather: ['grandpa', 'abuelo', 'nonno'],
            aunt: ['aunt', 'tia'],
            uncle: ['uncle', 'tio'],
            cousin: ['cousin', 'primo', 'prima']
          }
        },
        culturalConsiderations: ['Common in many cultures worldwide', 'Respect for elders is important'],
        storytellingApproaches: ['Show wisdom of elders', 'Include cultural traditions', 'Demonstrate intergenerational bonds']
      },
      'chosen_family': {
        description: 'Non-biological family bonds formed by choice',
        commonTerms: {
          type: 'chosen_family',
          parentTerms: {
            mother: ['mom', 'chosen mom', 'family mom'],
            father: ['dad', 'chosen dad', 'family dad'],
            parent: ['parent', 'guardian', 'family grown-up']
          },
          siblingTerms: {
            brother: ['brother', 'chosen brother', 'family brother'],
            sister: ['sister', 'chosen sister', 'family sister'],
            sibling: ['sibling', 'family sibling']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'chosen grandma', 'family grandma'],
            grandfather: ['grandpa', 'chosen grandpa', 'family grandpa'],
            aunt: ['aunt', 'family aunt'],
            uncle: ['uncle', 'family uncle'],
            cousin: ['cousin', 'family cousin']
          }
        },
        culturalConsiderations: ['Important in LGBTQ+ communities', 'May include close friends as family'],
        storytellingApproaches: ['Emphasize love over biology', 'Show strength of chosen bonds', 'Include diverse relationship types']
      },
      'extended': {
        description: 'Includes aunts, uncles, cousins as primary caregivers',
        commonTerms: {
          type: 'extended',
          parentTerms: {
            mother: ['mom', 'mama', 'aunt-mom', 'tia'],
            father: ['dad', 'papa', 'uncle-dad', 'tio'],
            parent: ['parent', 'guardian', 'family caregiver']
          },
          siblingTerms: {
            brother: ['brother', 'cousin-brother'],
            sister: ['sister', 'cousin-sister'],
            sibling: ['sibling', 'family sibling']
          },
          extendedFamilyTerms: {
            grandmother: ['grandma', 'abuela', 'nana'],
            grandfather: ['grandpa', 'abuelo', 'papa'],
            aunt: ['aunt', 'tia', 'auntie'],
            uncle: ['uncle', 'tio'],
            cousin: ['cousin', 'primo', 'prima']
          }
        },
        culturalConsiderations: ['Common in many cultures', 'Strong community bonds'],
        storytellingApproaches: ['Show community support', 'Include cultural traditions', 'Demonstrate extended family love']
      }
    };
  }

  async generateFamilyInclusiveLanguage(
    originalText: string,
    targetFamilyStructures: string[]
  ): Promise<{
    inclusiveText: string;
    adaptations: string[];
    familyTermsUsed: string[];
  }> {
    try {
      const inclusivePrompt = `
Adapt this text to be inclusive of these family structures: ${targetFamilyStructures.join(', ')}

Original Text: "${originalText}"

Guidelines:
1. Use inclusive language that doesn't assume traditional nuclear family
2. Replace specific family terms with more general ones when appropriate
3. Include diverse family representations
4. Maintain the story's emotional impact
5. Ensure age-appropriate language for children

Respond with JSON:
{
  "inclusiveText": "adapted text that includes diverse family structures",
  "adaptations": ["list of changes made for family inclusivity"],
  "familyTermsUsed": ["family terms included in the adaptation"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in family diversity and inclusive language for children\'s content. Create content that celebrates all types of families while maintaining story quality.'
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
      console.error('Family inclusive language generation error:', error);
      return {
        inclusiveText: originalText,
        adaptations: [],
        familyTermsUsed: []
      };
    }
  }

  private buildFamilyAdaptationPrompt(adaptation: FamilyStructureAdaptation): string {
    return `
Adapt this content for the specified family structure:

Original Content: "${adaptation.originalContent}"
Target Family Structure: ${JSON.stringify(adaptation.targetFamilyStructure, null, 2)}
Cultural Context: ${adaptation.culturalContext}

Guidelines:
1. Use appropriate family terminology from the target structure
2. Ensure the adaptation feels natural and authentic
3. Maintain the story's core message and emotional impact
4. Consider cultural context in family relationships
5. Make the family structure feel positive and normal
6. Avoid stereotypes or assumptions about family dynamics
7. Include age-appropriate explanations if needed

Family Structure Considerations:
- Use the correct terms for family members
- Reflect the actual family dynamics
- Consider cultural variations in family roles
- Show positive aspects of this family structure
- Address any unique challenges sensitively
- Celebrate the love and support within the family

Respond with JSON:
{
  "adaptedContent": "content adapted for the target family structure",
  "changesExplanation": ["explanation of changes made and why"],
  "culturallyAppropriate": true
}
    `;
  }

  /**
   * Validate family representation for cultural appropriateness
   */
  async validateFamilyRepresentation(
    familyStructure: FamilyStructure,
    culturalContext: string,
    storyContent: string
  ): Promise<{
    isAppropriate: boolean;
    concerns: string[];
    suggestions: string[];
    culturalNotes: string[];
  }> {
    try {
      const validationPrompt = `
Validate this family representation for cultural appropriateness:

Family Structure: ${JSON.stringify(familyStructure, null, 2)}
Cultural Context: ${culturalContext}
Story Content: "${storyContent}"

Check for:
1. Cultural accuracy in family roles and relationships
2. Respectful representation of family dynamics
3. Appropriate use of family terminology
4. Sensitivity to cultural values around family
5. Positive representation without stereotypes

Respond with JSON:
{
  "isAppropriate": true/false,
  "concerns": ["any cultural concerns about the family representation"],
  "suggestions": ["suggestions for improvement"],
  "culturalNotes": ["important cultural context about family structures"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in cultural family structures and representation. Validate family portrayals for cultural sensitivity and accuracy.'
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
      console.error('Family representation validation error:', error);
      return {
        isAppropriate: false,
        concerns: ['Unable to validate due to technical error'],
        suggestions: ['Please review family representation manually'],
        culturalNotes: []
      };
    }
  }
}
import OpenAI from 'openai';
import {
  DynamicLanguageSwitchRequest,
  LocalizationResponse
} from '../types';

export class DynamicLanguageSwitcher {
  constructor(private openai: OpenAI) {}

  async switchLanguage(request: DynamicLanguageSwitchRequest): Promise<LocalizationResponse> {
    try {
      const switchPrompt = this.buildLanguageSwitchPrompt(request);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in seamless language switching during storytelling. Maintain narrative continuity while switching languages naturally and appropriately for children.'
          },
          {
            role: 'user',
            content: switchPrompt
          }
        ],
        temperature: 0.3
      });

      const response = JSON.parse(completion.choices[0].message.content || '{}');

      return {
        localizedContent: response.localizedContent,
        culturalAdaptations: response.culturalAdaptations || [],
        languageNotes: response.languageNotes || [],
        confidenceScore: response.confidenceScore || 0.8,
        alternativeVersions: response.alternativeVersions
      };
    } catch (error) {
      console.error('Dynamic language switch error:', error);
      throw new Error('Failed to switch language dynamically');
    }
  }

  private buildLanguageSwitchPrompt(request: DynamicLanguageSwitchRequest): string {
    return `
Please perform a seamless language switch in the middle of this story:

Current Language: ${request.currentLanguage}
Target Language: ${request.targetLanguage}
Switch Reason: ${request.switchReason}

Story Context: ${JSON.stringify(request.storyContext, null, 2)}
Character Context: ${JSON.stringify(request.characterContext, null, 2)}

Requirements:
1. Maintain narrative continuity and flow
2. Ensure the language switch feels natural and purposeful
3. Preserve character personalities and story momentum
4. Use age-appropriate language in both languages
5. If switching for educational purposes, make it engaging and fun
6. If switching for cultural appropriateness, explain the context subtly

Please provide a smooth transition that:
- Acknowledges the language change if appropriate
- Continues the story seamlessly in the new language
- Maintains the same emotional tone and pacing
- Preserves all character details and story elements

Respond with a JSON object containing:
{
  "localizedContent": "the story continuation in the new language with smooth transition",
  "culturalAdaptations": ["any cultural adaptations made during the switch"],
  "languageNotes": ["notes about the language transition and any linguistic considerations"],
  "confidenceScore": 0.95,
  "alternativeVersions": ["alternative ways to handle the language switch if applicable"]
}
    `;
  }

  /**
   * Determine if a language switch is appropriate at this point in the story
   */
  async shouldSwitchLanguage(
    currentContext: any,
    targetLanguage: string,
    reason: string
  ): Promise<{
    shouldSwitch: boolean;
    reasoning: string;
    suggestedTransitionPhrase?: string;
  }> {
    try {
      const analysisPrompt = `
Analyze whether this is an appropriate moment for a language switch:

Current Story Context: ${JSON.stringify(currentContext, null, 2)}
Target Language: ${targetLanguage}
Switch Reason: ${reason}

Consider:
1. Narrative flow and pacing
2. Character development moment
3. Educational value
4. Cultural appropriateness
5. Child engagement level

Respond with JSON:
{
  "shouldSwitch": true/false,
  "reasoning": "explanation of why this is or isn't a good moment",
  "suggestedTransitionPhrase": "optional phrase to introduce the switch naturally"
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in pedagogical storytelling and language learning. Analyze the appropriateness of language switches in children\'s stories.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.2
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Language switch analysis error:', error);
      return {
        shouldSwitch: false,
        reasoning: 'Unable to analyze switch appropriateness due to technical error'
      };
    }
  }

  /**
   * Generate educational context for language switches
   */
  async generateEducationalContext(
    fromLanguage: string,
    toLanguage: string,
    storyContext: any
  ): Promise<{
    educationalValue: string;
    childFriendlyExplanation: string;
    vocabularyHighlights: string[];
  }> {
    try {
      const educationalPrompt = `
Create educational context for switching from ${fromLanguage} to ${toLanguage}:

Story Context: ${JSON.stringify(storyContext, null, 2)}

Generate:
1. Educational value of this language switch
2. Child-friendly explanation of why we're switching
3. Key vocabulary words to highlight in both languages

Make it engaging and age-appropriate for children 3-12.

Respond with JSON:
{
  "educationalValue": "explanation of learning benefits",
  "childFriendlyExplanation": "simple explanation for children",
  "vocabularyHighlights": ["key words to emphasize"]
}
      `;

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are a children\'s language education specialist. Create engaging educational content for young learners.'
          },
          {
            role: 'user',
            content: educationalPrompt
          }
        ],
        temperature: 0.4
      });

      return JSON.parse(completion.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Educational context generation error:', error);
      return {
        educationalValue: 'Language exposure helps children develop multilingual skills',
        childFriendlyExplanation: 'Let\'s try telling this part of our story in a different language!',
        vocabularyHighlights: []
      };
    }
  }
}
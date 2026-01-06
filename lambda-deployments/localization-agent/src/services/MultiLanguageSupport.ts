import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  LanguageProfile,
  CulturalContext,
  LocalizationResponse
} from '../types';

export interface AccentDialectProfile {
  language: string;
  region: string;
  accentName: string;
  characteristics: string[];
  pronunciationNotes: string[];
  culturalContext: string[];
  appropriateUsage: string[];
  childFriendlyFeatures: string[];
}

export interface BilingualStorytellingRequest {
  primaryLanguage: string;
  secondaryLanguage: string;
  storyContent: any;
  switchingStrategy: 'alternating_sentences' | 'alternating_paragraphs' | 'character_based' | 'theme_based' | 'educational_moments';
  educationalGoals: string[];
  targetAge: number;
  culturalContext: CulturalContext;
}

export interface BilingualStorytellingResponse {
  bilingualContent: string;
  languageSwitchPoints: {
    position: number;
    fromLanguage: string;
    toLanguage: string;
    reason: string;
    educationalNote?: string;
  }[];
  vocabularyHighlights: {
    [language: string]: string[];
  };
  culturalBridges: string[];
  learningObjectives: string[];
}

export interface CodeSwitchingRequest {
  familyLanguages: string[];
  dominantLanguage: string;
  storyContext: any;
  switchingTriggers: ('emotional_moments' | 'cultural_references' | 'family_interactions' | 'educational_opportunities')[];
  naturalness: 'high' | 'medium' | 'low';
}

export interface CodeSwitchingResponse {
  codeSwitchedContent: string;
  switchingPatterns: {
    trigger: string;
    languages: string[];
    context: string;
    naturalness: number;
  }[];
  familyLanguageBalance: {
    [language: string]: number; // percentage
  };
  culturalAuthenticity: number;
}

export interface LanguageLearningIntegration {
  targetLanguage: string;
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  learningObjectives: string[];
  interactiveElements: {
    type: 'vocabulary_practice' | 'pronunciation_guide' | 'grammar_point' | 'cultural_note';
    content: string;
    position: number;
  }[];
  assessmentOpportunities: {
    type: 'comprehension_check' | 'vocabulary_quiz' | 'pronunciation_practice';
    content: string;
    expectedResponse: string;
  }[];
}

export interface CulturallyAdaptedTranslation {
  originalText: string;
  targetLanguage: string;
  culturalContext: string[];
  translationApproach: 'literal' | 'cultural_adaptation' | 'localization' | 'transcreation';
  adaptedTranslation: string;
  culturalNotes: string[];
  alternativeVersions: {
    approach: string;
    translation: string;
    reasoning: string;
  }[];
}

export class MultiLanguageSupport {
  constructor(
    private supabase: SupabaseClient,
    private openai: OpenAI
  ) {}

  /**
   * Create bilingual storytelling experience
   */
  async createBilingualStory(request: BilingualStorytellingRequest): Promise<BilingualStorytellingResponse> {
    const prompt = this.buildBilingualStoryPrompt(request);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in bilingual education and children's storytelling. Create engaging bilingual stories that naturally incorporate two languages while maintaining narrative flow and educational value.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Implement natural code-switching for multilingual families
   */
  async implementCodeSwitching(request: CodeSwitchingRequest): Promise<CodeSwitchingResponse> {
    const prompt = this.buildCodeSwitchingPrompt(request);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in multilingual family dynamics and natural code-switching patterns. Create authentic, natural language mixing that reflects how multilingual families actually communicate.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Get accent and dialect profiles for natural speech
   */
  async getAccentDialectProfiles(language: string, regions?: string[]): Promise<AccentDialectProfile[]> {
    const profiles: AccentDialectProfile[] = [];
    
    const targetRegions = regions || await this.getCommonRegionsForLanguage(language);
    
    for (const region of targetRegions) {
      const profile = await this.getAccentProfileForRegion(language, region);
      if (profile) {
        profiles.push(profile);
      }
    }

    return profiles;
  }

  /**
   * Create culturally adapted translation
   */
  async createCulturallyAdaptedTranslation(
    originalText: string,
    targetLanguage: string,
    culturalContext: string[],
    approach: CulturallyAdaptedTranslation['translationApproach'] = 'cultural_adaptation'
  ): Promise<CulturallyAdaptedTranslation> {
    const prompt = this.buildCulturalTranslationPrompt(originalText, targetLanguage, culturalContext, approach);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert cultural translator specializing in children's content. Create translations that are not just linguistically accurate but culturally resonant and appropriate for the target audience.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.4
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      originalText,
      targetLanguage,
      culturalContext,
      translationApproach: approach,
      ...response
    };
  }

  /**
   * Integrate language learning features
   */
  async integrateLanguageLearning(
    storyContent: any,
    targetLanguage: string,
    proficiencyLevel: LanguageLearningIntegration['proficiencyLevel'],
    learningObjectives: string[]
  ): Promise<LanguageLearningIntegration> {
    const prompt = this.buildLanguageLearningPrompt(storyContent, targetLanguage, proficiencyLevel, learningObjectives);

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are a children's language learning specialist. Integrate educational language learning elements into stories in a way that feels natural and engaging, not forced or academic.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      targetLanguage,
      proficiencyLevel,
      learningObjectives,
      ...response
    };
  }

  /**
   * Switch language mid-conversation with enhanced context awareness
   */
  async switchLanguageMidConversation(
    currentLanguage: string,
    targetLanguage: string,
    conversationContext: any,
    switchReason: 'user_request' | 'cultural_appropriateness' | 'educational_purpose' | 'character_authenticity' | 'emotional_resonance',
    transitionStyle: 'seamless' | 'acknowledged' | 'educational' | 'playful'
  ): Promise<{
    transitionPhrase: string;
    continuationInNewLanguage: string;
    educationalNote?: string;
    culturalContext?: string;
  }> {
    const prompt = this.buildLanguageSwitchPrompt(
      currentLanguage,
      targetLanguage,
      conversationContext,
      switchReason,
      transitionStyle
    );

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: `You are an expert in seamless multilingual storytelling. Create natural, contextually appropriate language transitions that enhance rather than disrupt the storytelling experience.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.6
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response;
  }

  /**
   * Generate pronunciation guides for children
   */
  async generatePronunciationGuide(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    childAge: number
  ): Promise<{
    phoneticGuide: string;
    simplifiedPronunciation: string;
    audioDescription: string;
    practiceWords: string[];
    similarSounds: { [word: string]: string }; // similar sounds in source language
  }> {
    const prompt = `
Create a child-friendly pronunciation guide for the following text:

Text: "${text}"
Target Language: ${targetLanguage}
Source Language: ${sourceLanguage}
Child Age: ${childAge}

Please provide:
1. Phonetic guide using simple notation
2. Simplified pronunciation using familiar sounds from ${sourceLanguage}
3. Audio description (how it should sound)
4. Practice words that use similar sounds
5. Similar sounds in ${sourceLanguage} to help with pronunciation

Make it fun and engaging for a ${childAge}-year-old child.

Respond with JSON format:
{
  "phoneticGuide": "phonetic notation",
  "simplifiedPronunciation": "pronunciation using familiar sounds",
  "audioDescription": "description of how it should sound",
  "practiceWords": ["word1", "word2", "word3"],
  "similarSounds": {
    "target_word": "similar sound in source language"
  }
}
    `;

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
      messages: [
        {
          role: 'system',
          content: 'You are a children\'s language pronunciation specialist. Create fun, accessible pronunciation guides for young learners.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3
    });

    return JSON.parse(completion.choices[0].message.content || '{}');
  }

  private async getCommonRegionsForLanguage(language: string): Promise<string[]> {
    const regionMap: { [key: string]: string[] } = {
      'english': ['US', 'UK', 'Australia', 'Canada', 'Ireland', 'South Africa'],
      'spanish': ['Spain', 'Mexico', 'Argentina', 'Colombia', 'Peru', 'Chile'],
      'french': ['France', 'Canada', 'Belgium', 'Switzerland', 'Senegal', 'Morocco'],
      'portuguese': ['Brazil', 'Portugal', 'Angola', 'Mozambique'],
      'arabic': ['Egypt', 'Saudi Arabia', 'Morocco', 'Lebanon', 'UAE', 'Jordan'],
      'chinese': ['Mainland China', 'Taiwan', 'Hong Kong', 'Singapore'],
      'german': ['Germany', 'Austria', 'Switzerland'],
      'italian': ['Italy', 'Switzerland'],
      'japanese': ['Japan'],
      'korean': ['South Korea', 'North Korea'],
      'hindi': ['India', 'Nepal'],
      'russian': ['Russia', 'Ukraine', 'Belarus', 'Kazakhstan']
    };

    return regionMap[language.toLowerCase()] || [language];
  }

  private async getAccentProfileForRegion(language: string, region: string): Promise<AccentDialectProfile | null> {
    // This would typically query a comprehensive accent/dialect database
    const accentDatabase: { [key: string]: AccentDialectProfile } = {
      'english_us': {
        language: 'English',
        region: 'United States',
        accentName: 'General American',
        characteristics: ['Rhotic (pronounces R sounds)', 'Flapped T in words like "water"', 'Broad A in words like "dance"'],
        pronunciationNotes: ['Clear R sounds at end of words', 'T sounds like D in middle of words', 'Relaxed vowel sounds'],
        culturalContext: ['American cultural references', 'Informal tone acceptable', 'Direct communication style'],
        appropriateUsage: ['Casual storytelling', 'Educational content', 'Adventure stories'],
        childFriendlyFeatures: ['Clear consonants', 'Familiar rhythm', 'Easy to imitate']
      },
      'english_uk': {
        language: 'English',
        region: 'United Kingdom',
        accentName: 'Received Pronunciation',
        characteristics: ['Non-rhotic (drops R sounds)', 'Clear T pronunciation', 'Distinct vowel sounds'],
        pronunciationNotes: ['Silent R at end of words', 'Crisp T sounds', 'Precise vowel articulation'],
        culturalContext: ['British cultural references', 'More formal tone', 'Polite communication style'],
        appropriateUsage: ['Formal storytelling', 'Educational content', 'Fantasy stories'],
        childFriendlyFeatures: ['Clear articulation', 'Musical quality', 'Distinctive character']
      },
      'spanish_mexico': {
        language: 'Spanish',
        region: 'Mexico',
        accentName: 'Mexican Spanish',
        characteristics: ['Seseo (S sound for C/Z)', 'Clear vowel pronunciation', 'Distinctive intonation patterns'],
        pronunciationNotes: ['Five clear vowel sounds', 'Rolled R sounds', 'Soft consonants'],
        culturalContext: ['Mexican cultural references', 'Warm, family-oriented tone', 'Expressive communication'],
        appropriateUsage: ['Family stories', 'Cultural tales', 'Adventure stories'],
        childFriendlyFeatures: ['Musical intonation', 'Clear vowels', 'Expressive rhythm']
      },
      'french_france': {
        language: 'French',
        region: 'France',
        accentName: 'Standard French',
        characteristics: ['Nasal vowels', 'Silent final consonants', 'Liaison between words'],
        pronunciationNotes: ['Nasal sounds through nose', 'Don\'t pronounce final consonants', 'Connect words smoothly'],
        culturalContext: ['French cultural references', 'Elegant expression', 'Artistic communication'],
        appropriateUsage: ['Artistic stories', 'Cultural tales', 'Elegant narratives'],
        childFriendlyFeatures: ['Melodic quality', 'Smooth flow', 'Beautiful sounds']
      }
    };

    const key = `${language.toLowerCase()}_${region.toLowerCase().replace(/\s+/g, '_')}`;
    return accentDatabase[key] || null;
  }

  private buildBilingualStoryPrompt(request: BilingualStorytellingRequest): string {
    return `
Create a bilingual story that naturally incorporates two languages:

Primary Language: ${request.primaryLanguage}
Secondary Language: ${request.secondaryLanguage}
Switching Strategy: ${request.switchingStrategy}
Educational Goals: ${request.educationalGoals.join(', ')}
Target Age: ${request.targetAge}
Cultural Context: ${JSON.stringify(request.culturalContext, null, 2)}

Story Content: ${JSON.stringify(request.storyContent, null, 2)}

Please create a bilingual story that:
1. Uses the specified switching strategy naturally
2. Maintains narrative flow and engagement
3. Achieves the educational goals
4. Is appropriate for age ${request.targetAge}
5. Respects the cultural context
6. Provides vocabulary learning opportunities
7. Creates cultural bridges between languages

Respond with JSON format:
{
  "bilingualContent": "the complete bilingual story",
  "languageSwitchPoints": [
    {
      "position": number,
      "fromLanguage": "language",
      "toLanguage": "language",
      "reason": "why the switch occurred",
      "educationalNote": "optional educational explanation"
    }
  ],
  "vocabularyHighlights": {
    "language1": ["key words"],
    "language2": ["key words"]
  },
  "culturalBridges": ["cultural connections made"],
  "learningObjectives": ["what children will learn"]
}
    `;
  }

  private buildCodeSwitchingPrompt(request: CodeSwitchingRequest): string {
    return `
Create natural code-switching patterns for a multilingual family story:

Family Languages: ${request.familyLanguages.join(', ')}
Dominant Language: ${request.dominantLanguage}
Switching Triggers: ${request.switchingTriggers.join(', ')}
Naturalness Level: ${request.naturalness}

Story Context: ${JSON.stringify(request.storyContext, null, 2)}

Please create authentic code-switching that:
1. Reflects natural multilingual family communication
2. Uses the specified triggers appropriately
3. Maintains the desired naturalness level
4. Balances all family languages appropriately
5. Feels authentic to multilingual families
6. Is engaging for children

Respond with JSON format:
{
  "codeSwitchedContent": "story with natural code-switching",
  "switchingPatterns": [
    {
      "trigger": "what triggered the switch",
      "languages": ["languages involved"],
      "context": "context of the switch",
      "naturalness": number_0_to_1
    }
  ],
  "familyLanguageBalance": {
    "language": percentage
  },
  "culturalAuthenticity": number_0_to_1
}
    `;
  }

  private buildCulturalTranslationPrompt(
    originalText: string,
    targetLanguage: string,
    culturalContext: string[],
    approach: CulturallyAdaptedTranslation['translationApproach']
  ): string {
    return `
Create a culturally adapted translation:

Original Text: "${originalText}"
Target Language: ${targetLanguage}
Cultural Context: ${culturalContext.join(', ')}
Translation Approach: ${approach}

Please provide:
1. A culturally adapted translation using the specified approach
2. Cultural notes explaining adaptations made
3. Alternative versions with different approaches
4. Reasoning for cultural choices

Consider:
- Cultural appropriateness for children
- Local customs and values
- Family structures and relationships
- Religious and social sensitivities
- Age-appropriate cultural concepts

Respond with JSON format:
{
  "adaptedTranslation": "the culturally adapted translation",
  "culturalNotes": ["explanations of cultural adaptations"],
  "alternativeVersions": [
    {
      "approach": "approach name",
      "translation": "alternative translation",
      "reasoning": "why this approach was chosen"
    }
  ]
}
    `;
  }

  private buildLanguageLearningPrompt(
    storyContent: any,
    targetLanguage: string,
    proficiencyLevel: LanguageLearningIntegration['proficiencyLevel'],
    learningObjectives: string[]
  ): string {
    return `
Integrate language learning features into this story:

Story Content: ${JSON.stringify(storyContent, null, 2)}
Target Language: ${targetLanguage}
Proficiency Level: ${proficiencyLevel}
Learning Objectives: ${learningObjectives.join(', ')}

Please create:
1. Interactive elements that support language learning
2. Assessment opportunities that feel like play
3. Natural integration that doesn't disrupt the story
4. Age-appropriate learning activities

Respond with JSON format:
{
  "interactiveElements": [
    {
      "type": "vocabulary_practice|pronunciation_guide|grammar_point|cultural_note",
      "content": "the interactive content",
      "position": number_in_story
    }
  ],
  "assessmentOpportunities": [
    {
      "type": "comprehension_check|vocabulary_quiz|pronunciation_practice",
      "content": "the assessment content",
      "expectedResponse": "what response indicates understanding"
    }
  ]
}
    `;
  }

  private buildLanguageSwitchPrompt(
    currentLanguage: string,
    targetLanguage: string,
    conversationContext: any,
    switchReason: string,
    transitionStyle: string
  ): string {
    return `
Create a smooth language transition:

Current Language: ${currentLanguage}
Target Language: ${targetLanguage}
Switch Reason: ${switchReason}
Transition Style: ${transitionStyle}

Conversation Context: ${JSON.stringify(conversationContext, null, 2)}

Please provide:
1. A transition phrase that introduces the language change
2. Continuation of the conversation in the new language
3. Educational note if appropriate
4. Cultural context if relevant

Make the transition feel natural and purposeful.

Respond with JSON format:
{
  "transitionPhrase": "phrase to introduce the language change",
  "continuationInNewLanguage": "story continuation in new language",
  "educationalNote": "optional educational explanation",
  "culturalContext": "optional cultural context"
}
    `;
  }
}
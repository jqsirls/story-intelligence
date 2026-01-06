"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLanguageSupport = void 0;
class MultiLanguageSupport {
    constructor(supabase, openai) {
        this.supabase = supabase;
        this.openai = openai;
    }
    /**
     * Create bilingual storytelling experience
     */
    async createBilingualStory(request) {
        const prompt = this.buildBilingualStoryPrompt(request);
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async implementCodeSwitching(request) {
        const prompt = this.buildCodeSwitchingPrompt(request);
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async getAccentDialectProfiles(language, regions) {
        const profiles = [];
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
    async createCulturallyAdaptedTranslation(originalText, targetLanguage, culturalContext, approach = 'cultural_adaptation') {
        const prompt = this.buildCulturalTranslationPrompt(originalText, targetLanguage, culturalContext, approach);
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async integrateLanguageLearning(storyContent, targetLanguage, proficiencyLevel, learningObjectives) {
        const prompt = this.buildLanguageLearningPrompt(storyContent, targetLanguage, proficiencyLevel, learningObjectives);
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async switchLanguageMidConversation(currentLanguage, targetLanguage, conversationContext, switchReason, transitionStyle) {
        const prompt = this.buildLanguageSwitchPrompt(currentLanguage, targetLanguage, conversationContext, switchReason, transitionStyle);
        const completion = await this.openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async generatePronunciationGuide(text, targetLanguage, sourceLanguage, childAge) {
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
            model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
    async getCommonRegionsForLanguage(language) {
        const regionMap = {
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
    async getAccentProfileForRegion(language, region) {
        // This would typically query a comprehensive accent/dialect database
        const accentDatabase = {
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
    buildBilingualStoryPrompt(request) {
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
    buildCodeSwitchingPrompt(request) {
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
    buildCulturalTranslationPrompt(originalText, targetLanguage, culturalContext, approach) {
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
    buildLanguageLearningPrompt(storyContent, targetLanguage, proficiencyLevel, learningObjectives) {
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
    buildLanguageSwitchPrompt(currentLanguage, targetLanguage, conversationContext, switchReason, transitionStyle) {
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
exports.MultiLanguageSupport = MultiLanguageSupport;
//# sourceMappingURL=MultiLanguageSupport.js.map
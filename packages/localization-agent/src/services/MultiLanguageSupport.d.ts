import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { CulturalContext } from '../types';
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
        [language: string]: number;
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
export declare class MultiLanguageSupport {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
    /**
     * Create bilingual storytelling experience
     */
    createBilingualStory(request: BilingualStorytellingRequest): Promise<BilingualStorytellingResponse>;
    /**
     * Implement natural code-switching for multilingual families
     */
    implementCodeSwitching(request: CodeSwitchingRequest): Promise<CodeSwitchingResponse>;
    /**
     * Get accent and dialect profiles for natural speech
     */
    getAccentDialectProfiles(language: string, regions?: string[]): Promise<AccentDialectProfile[]>;
    /**
     * Create culturally adapted translation
     */
    createCulturallyAdaptedTranslation(originalText: string, targetLanguage: string, culturalContext: string[], approach?: CulturallyAdaptedTranslation['translationApproach']): Promise<CulturallyAdaptedTranslation>;
    /**
     * Integrate language learning features
     */
    integrateLanguageLearning(storyContent: any, targetLanguage: string, proficiencyLevel: LanguageLearningIntegration['proficiencyLevel'], learningObjectives: string[]): Promise<LanguageLearningIntegration>;
    /**
     * Switch language mid-conversation with enhanced context awareness
     */
    switchLanguageMidConversation(currentLanguage: string, targetLanguage: string, conversationContext: any, switchReason: 'user_request' | 'cultural_appropriateness' | 'educational_purpose' | 'character_authenticity' | 'emotional_resonance', transitionStyle: 'seamless' | 'acknowledged' | 'educational' | 'playful'): Promise<{
        transitionPhrase: string;
        continuationInNewLanguage: string;
        educationalNote?: string;
        culturalContext?: string;
    }>;
    /**
     * Generate pronunciation guides for children
     */
    generatePronunciationGuide(text: string, targetLanguage: string, sourceLanguage: string, childAge: number): Promise<{
        phoneticGuide: string;
        simplifiedPronunciation: string;
        audioDescription: string;
        practiceWords: string[];
        similarSounds: {
            [word: string]: string;
        };
    }>;
    private getCommonRegionsForLanguage;
    private getAccentProfileForRegion;
    private buildBilingualStoryPrompt;
    private buildCodeSwitchingPrompt;
    private buildCulturalTranslationPrompt;
    private buildLanguageLearningPrompt;
    private buildLanguageSwitchPrompt;
}
//# sourceMappingURL=MultiLanguageSupport.d.ts.map
import { CulturalContext, LanguageProfile, LocalizationRequest, LocalizationResponse, DynamicLanguageSwitchRequest, CulturalCharacterGenerationRequest, CulturalCharacterGenerationResponse, ReligiousSensitivityCheck, ReligiousSensitivityResult, FamilyStructureAdaptation, FamilyStructureAdaptationResult, StorytellingTradition, CulturalSensitivityFilter } from './types';
import { TraditionalStoryPattern, HolidayStoryMode, CrossCulturalScenario } from './services/GlobalStorytellingEngine';
import { HolidayStoryRequest, HolidayStoryResponse } from './services/HolidayStoryModeManager';
import { CulturalBridgeScenario, CulturalExchangeActivity } from './services/CrossCulturalInteractionEngine';
import { CulturalSymbol, CulturalArchetype, StoryElementAnalysis, CulturalCelebration, CrossCulturalInteraction } from './services/CulturalIntelligenceEngine';
import { AccentDialectProfile, BilingualStorytellingRequest, BilingualStorytellingResponse, CodeSwitchingRequest, CodeSwitchingResponse, LanguageLearningIntegration, CulturallyAdaptedTranslation } from './services/MultiLanguageSupport';
import { TraditionalNarrativeStructure, OralTraditionPattern, CulturalMythologyIntegration, IndigenousStorytellingMethod, CommunityStorytellingTradition, StorytellingTraditionDocumentation } from './services/CulturalStorytellingPreservation';
export declare class LocalizationAgent {
    private supabase;
    private openai;
    private culturalContextEngine;
    private dynamicLanguageSwitcher;
    private culturalCharacterGenerator;
    private religiousSensitivityFilter;
    private familyStructureAdapter;
    private globalStorytellingEngine;
    private holidayStoryModeManager;
    private crossCulturalInteractionEngine;
    private culturalIntelligenceEngine;
    private multiLanguageSupport;
    private culturalStorytellingPreservation;
    constructor(supabaseUrl: string, supabaseKey: string, openaiApiKey: string);
    /**
     * Get or create cultural context for a user
     */
    getCulturalContext(userId: string): Promise<CulturalContext | null>;
    /**
     * Update cultural context for a user
     */
    updateCulturalContext(userId: string, context: Partial<CulturalContext>): Promise<CulturalContext>;
    /**
     * Get supported languages
     */
    getSupportedLanguages(): Promise<LanguageProfile[]>;
    /**
     * Localize content to target language and cultural context
     */
    localizeContent(request: LocalizationRequest): Promise<LocalizationResponse>;
    /**
     * Switch language dynamically during story creation
     */
    switchLanguageDynamically(request: DynamicLanguageSwitchRequest): Promise<LocalizationResponse>;
    /**
     * Generate culturally appropriate character
     */
    generateCulturalCharacter(request: CulturalCharacterGenerationRequest): Promise<CulturalCharacterGenerationResponse>;
    /**
     * Check religious sensitivity
     */
    checkReligiousSensitivity(check: ReligiousSensitivityCheck): Promise<ReligiousSensitivityResult>;
    /**
     * Adapt content for family structure
     */
    adaptForFamilyStructure(adaptation: FamilyStructureAdaptation): Promise<FamilyStructureAdaptationResult>;
    /**
     * Get storytelling traditions for a culture
     */
    getStorytellingTraditions(culturalBackground: string[]): Promise<StorytellingTradition[]>;
    /**
     * Get cultural sensitivity filters
     */
    getCulturalSensitivityFilters(culturalContext: string[]): Promise<CulturalSensitivityFilter[]>;
    /**
     * Get traditional storytelling patterns for integration
     */
    getTraditionalStoryPatterns(culturalBackground: string[]): Promise<TraditionalStoryPattern[]>;
    /**
     * Create holiday-specific story mode
     */
    createHolidayStoryMode(holiday: string, culturalContext: string[], userAge: number): Promise<HolidayStoryMode>;
    /**
     * Generate cross-cultural character interaction scenarios
     */
    generateCrossCulturalScenario(cultures: string[], interactionType: CrossCulturalScenario['interactionType'], storyContext: any): Promise<CrossCulturalScenario>;
    /**
     * Create holiday story
     */
    createHolidayStory(request: HolidayStoryRequest): Promise<HolidayStoryResponse>;
    /**
     * Get seasonal story calendar
     */
    getSeasonalStoryCalendar(culturalContexts: string[]): Promise<import("./services/HolidayStoryModeManager").SeasonalStoryCalendar[]>;
    /**
     * Get holiday story suggestions
     */
    getHolidayStorySuggestions(culturalContext: string[], currentDate: Date, userAge: number): Promise<{
        holiday: string;
        urgency: "immediate" | "upcoming" | "seasonal";
        culturalRelevance: number;
        storyIdeas: string[];
        educationalValue: string[];
    }[]>;
    /**
     * Create multicultural holiday story
     */
    createMulticulturalHolidayStory(holidays: string[], culturalContexts: string[], userAge: number, theme: string): Promise<HolidayStoryResponse>;
    /**
     * Generate cross-cultural friendship scenario
     */
    generateFriendshipScenario(cultures: string[], ageGroup: string, setting: string): Promise<CrossCulturalScenario>;
    /**
     * Create cultural bridge scenario
     */
    createCulturalBridgeScenario(cultures: string[], commonTheme: string, storyContext: any): Promise<CulturalBridgeScenario>;
    /**
     * Generate cultural exchange activity
     */
    generateCulturalExchangeActivity(cultures: string[], activityType: 'food' | 'music' | 'art' | 'games' | 'stories' | 'celebrations', ageGroup: string): Promise<CulturalExchangeActivity>;
    /**
     * Preserve storytelling tradition
     */
    preserveStorytellingTradition(tradition: string, culturalContext: string, modernStoryContext: any): Promise<import("./services/GlobalStorytellingEngine").StorytellingTraditionPreservation>;
    /**
     * Adapt story for traditional storytelling pattern
     */
    adaptStoryForTradition(story: any, tradition: TraditionalStoryPattern, culturalContext: CulturalContext): Promise<{
        adaptedStory: any;
        traditionalElements: string[];
        culturalEnhancements: string[];
        preservedOriginalElements: string[];
    }>;
    /**
     * Generate culturally diverse character ensemble
     */
    generateCulturallyDiverseEnsemble(cultures: string[], storyType: string, ageGroup: string): Promise<{
        characters: Array<{
            name: string;
            culturalBackground: string;
            role: string;
            traits: string[];
            culturalElements: string[];
            interactionStyle: string;
        }>;
        groupDynamics: string[];
        culturalLearningOpportunities: string[];
        respectfulInteractions: string[];
    }>;
    /**
     * Analyze story elements for cultural appropriateness
     */
    analyzeStoryElements(elements: string[], targetCultures: string[], storyContext: any): Promise<StoryElementAnalysis[]>;
    /**
     * Get cultural symbols for story integration
     */
    getCulturalSymbols(culturalBackground: string[]): Promise<CulturalSymbol[]>;
    /**
     * Get cultural archetypes for character development
     */
    getCulturalArchetypes(culturalBackground: string[]): Promise<CulturalArchetype[]>;
    /**
     * Integrate storytelling traditions into modern narratives
     */
    integrateStorytellingTraditionsIntelligently(traditions: StorytellingTradition[], modernStoryContext: any, targetAudience: {
        age: number;
        culturalBackground: string[];
    }): Promise<{
        integratedNarrative: any;
        traditionalElements: string[];
        modernAdaptations: string[];
        culturalRespect: string[];
    }>;
    /**
     * Get cultural celebrations with enhanced intelligence
     */
    getCulturalCelebrationsIntelligently(culturalBackground: string[], timeframe?: {
        start: Date;
        end: Date;
    }): Promise<CulturalCelebration[]>;
    /**
     * Generate intelligent cross-cultural interaction scenarios
     */
    generateIntelligentCrossCulturalInteraction(cultures: string[], interactionType: CrossCulturalInteraction['interactionType'], storyContext: any, ageGroup: string): Promise<CrossCulturalInteraction>;
    /**
     * Create enhanced religious sensitivity engine
     */
    createEnhancedReligiousSensitivityEngine(religiousContexts: string[], customFilters?: any): Promise<{
        filters: CulturalSensitivityFilter[];
        guidelines: string[];
        respectfulAlternatives: {
            [topic: string]: string[];
        };
    }>;
    /**
     * Analyze cultural context with intelligence
     */
    analyzeCulturalContextIntelligently(storyContent: any, targetCultures: string[], sensitivityLevel?: 'high' | 'medium' | 'low'): Promise<{
        overallAppropriateness: boolean;
        culturalAnalysis: {
            [culture: string]: any;
        };
        recommendations: string[];
        requiredAdaptations: string[];
    }>;
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
     * Integrate language learning features into stories
     */
    integrateLanguageLearning(storyContent: any, targetLanguage: string, proficiencyLevel: LanguageLearningIntegration['proficiencyLevel'], learningObjectives: string[]): Promise<LanguageLearningIntegration>;
    /**
     * Switch language mid-conversation with enhanced context awareness
     */
    switchLanguageMidConversationEnhanced(currentLanguage: string, targetLanguage: string, conversationContext: any, switchReason: 'user_request' | 'cultural_appropriateness' | 'educational_purpose' | 'character_authenticity' | 'emotional_resonance', transitionStyle: 'seamless' | 'acknowledged' | 'educational' | 'playful'): Promise<{
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
    /**
     * Integrate traditional narrative structures into modern stories
     */
    integrateTraditionalNarrativeStructure(modernStory: any, traditionalStructure: TraditionalNarrativeStructure, targetAudience: {
        age: number;
        culturalBackground: string[];
    }): Promise<{
        restructuredStory: any;
        traditionalElements: string[];
        audienceParticipationPoints: any[];
        culturalEducation: string[];
        preservationAchieved: string[];
    }>;
    /**
     * Recognize and apply oral tradition patterns
     */
    recognizeOralTraditionPatterns(culturalBackground: string[], storyContent: any): Promise<OralTraditionPattern[]>;
    /**
     * Integrate cultural mythology and folklore respectfully
     */
    integrateCulturalMythology(mythology: string, culturalOrigin: string[], modernStoryContext: any, collaborationApproval?: boolean): Promise<CulturalMythologyIntegration>;
    /**
     * Support indigenous storytelling methods with cultural protocols
     */
    supportIndigenousStorytellingMethods(indigenousGroup: string[], communityApproval?: boolean, culturalLiaison?: string | null): Promise<IndigenousStorytellingMethod[]>;
    /**
     * Create cultural celebration story templates with community input
     */
    createCulturalCelebrationTemplatesWithCommunity(celebrations: string[], culturalCommunityInput?: {
        [celebration: string]: any;
    }): Promise<{
        templates: any[];
        communityValidation: {
            [celebration: string]: boolean;
        };
        respectfulRepresentation: string[];
        educationalValue: string[];
    }>;
    /**
     * Document community storytelling traditions
     */
    documentCommunityStorytellingTraditions(community: string, geographicOrigin: string[], communityParticipation?: boolean): Promise<CommunityStorytellingTradition>;
    /**
     * Create comprehensive tradition documentation
     */
    createTraditionDocumentation(tradition: string, culturalContext: string[], communityCollaboration: {
        approved: boolean;
        collaborators: string[];
        permissions: string[];
    }): Promise<StorytellingTraditionDocumentation>;
    /**
     * Get traditional narrative structures for specific cultures
     */
    getTraditionalNarrativeStructures(culturalBackground: string[]): Promise<TraditionalNarrativeStructure[]>;
    /**
     * Validate cultural appropriateness of storytelling adaptations
     */
    validateCulturalAppropriateness(adaptation: any, originalTradition: string, culturalContext: string[], communityReview?: boolean): Promise<{
        appropriate: boolean;
        concerns: string[];
        recommendations: string[];
        communityApprovalRequired: boolean;
        respectfulAlternatives: string[];
    }>;
    private buildLocalizationPrompt;
    private checkCulturalSensitivity;
}
//# sourceMappingURL=LocalizationAgent.d.ts.map
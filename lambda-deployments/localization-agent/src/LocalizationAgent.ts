import { createClient, SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import {
  CulturalContext,
  LanguageProfile,
  LocalizationRequest,
  LocalizationResponse,
  DynamicLanguageSwitchRequest,
  CulturalCharacterGenerationRequest,
  CulturalCharacterGenerationResponse,
  ReligiousSensitivityCheck,
  ReligiousSensitivityResult,
  FamilyStructureAdaptation,
  FamilyStructureAdaptationResult,
  StorytellingTradition,
  CulturalSensitivityFilter
} from './types';
import { CulturalContextEngine } from './services/CulturalContextEngine';
import { DynamicLanguageSwitcher } from './services/DynamicLanguageSwitcher';
import { CulturalCharacterGenerator } from './services/CulturalCharacterGenerator';
import { ReligiousSensitivityFilter } from './services/ReligiousSensitivityFilter';
import { FamilyStructureAdapter } from './services/FamilyStructureAdapter';
import { GlobalStorytellingEngine, TraditionalStoryPattern, HolidayStoryMode, CrossCulturalScenario } from './services/GlobalStorytellingEngine';
import { HolidayStoryModeManager, HolidayStoryRequest, HolidayStoryResponse } from './services/HolidayStoryModeManager';
import { CrossCulturalInteractionEngine, CulturalBridgeScenario, CulturalExchangeActivity } from './services/CrossCulturalInteractionEngine';
import { 
  CulturalIntelligenceEngine, 
  CulturalSymbol, 
  CulturalArchetype, 
  StoryElementAnalysis, 
  CulturalCelebration, 
  CrossCulturalInteraction 
} from './services/CulturalIntelligenceEngine';
import { 
  MultiLanguageSupport,
  AccentDialectProfile,
  BilingualStorytellingRequest,
  BilingualStorytellingResponse,
  CodeSwitchingRequest,
  CodeSwitchingResponse,
  LanguageLearningIntegration,
  CulturallyAdaptedTranslation
} from './services/MultiLanguageSupport';
import {
  CulturalStorytellingPreservation,
  TraditionalNarrativeStructure,
  OralTraditionPattern,
  CulturalMythologyIntegration,
  IndigenousStorytellingMethod,
  CommunityStorytellingTradition,
  StorytellingTraditionDocumentation
} from './services/CulturalStorytellingPreservation';

export class LocalizationAgent {
  private supabase: SupabaseClient;
  private openai: OpenAI;
  private culturalContextEngine: CulturalContextEngine;
  private dynamicLanguageSwitcher: DynamicLanguageSwitcher;
  private culturalCharacterGenerator: CulturalCharacterGenerator;
  private religiousSensitivityFilter: ReligiousSensitivityFilter;
  private familyStructureAdapter: FamilyStructureAdapter;
  private globalStorytellingEngine: GlobalStorytellingEngine;
  private holidayStoryModeManager: HolidayStoryModeManager;
  private crossCulturalInteractionEngine: CrossCulturalInteractionEngine;
  private culturalIntelligenceEngine: CulturalIntelligenceEngine;
  private multiLanguageSupport: MultiLanguageSupport;
  private culturalStorytellingPreservation: CulturalStorytellingPreservation;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    openaiApiKey: string
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    
    this.culturalContextEngine = new CulturalContextEngine(this.supabase, this.openai);
    this.dynamicLanguageSwitcher = new DynamicLanguageSwitcher(this.openai);
    this.culturalCharacterGenerator = new CulturalCharacterGenerator(this.openai);
    this.religiousSensitivityFilter = new ReligiousSensitivityFilter(this.openai);
    this.familyStructureAdapter = new FamilyStructureAdapter(this.openai);
    this.globalStorytellingEngine = new GlobalStorytellingEngine(this.supabase, this.openai);
    this.holidayStoryModeManager = new HolidayStoryModeManager(this.supabase, this.openai);
    this.crossCulturalInteractionEngine = new CrossCulturalInteractionEngine(this.openai);
    this.culturalIntelligenceEngine = new CulturalIntelligenceEngine(this.supabase, this.openai);
    this.multiLanguageSupport = new MultiLanguageSupport(this.supabase, this.openai);
    this.culturalStorytellingPreservation = new CulturalStorytellingPreservation(this.supabase, this.openai);
  }

  /**
   * Get or create cultural context for a user
   */
  async getCulturalContext(userId: string): Promise<CulturalContext | null> {
    return this.culturalContextEngine.getCulturalContext(userId);
  }

  /**
   * Update cultural context for a user
   */
  async updateCulturalContext(userId: string, context: Partial<CulturalContext>): Promise<CulturalContext> {
    return this.culturalContextEngine.updateCulturalContext(userId, context);
  }

  /**
   * Get supported languages
   */
  async getSupportedLanguages(): Promise<LanguageProfile[]> {
    return this.culturalContextEngine.getSupportedLanguages();
  }

  /**
   * Localize content to target language and cultural context
   */
  async localizeContent(request: LocalizationRequest): Promise<LocalizationResponse> {
    try {
      // Get user's cultural context
      const culturalContext = await this.getCulturalContext(request.userId);
      if (!culturalContext) {
        throw new Error('Cultural context not found for user');
      }

      // Apply cultural sensitivity filters
      const sensitivityCheck = await this.checkCulturalSensitivity(
        request.content,
        culturalContext
      );

      if (!sensitivityCheck.isAppropriate) {
        // Adapt content to be culturally appropriate
        request.content = sensitivityCheck.alternativeContent || request.content;
      }

      // Perform localization
      const localizationPrompt = this.buildLocalizationPrompt(request, culturalContext);
      
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL_ROUTING || process.env.OPENAI_MODEL || 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert cultural localization specialist for children\'s stories. Provide culturally sensitive and linguistically accurate translations while preserving the story\'s essence and age-appropriateness.'
          },
          {
            role: 'user',
            content: localizationPrompt
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
      console.error('Localization error:', error);
      throw new Error('Failed to localize content');
    }
  }

  /**
   * Switch language dynamically during story creation
   */
  async switchLanguageDynamically(request: DynamicLanguageSwitchRequest): Promise<LocalizationResponse> {
    return this.dynamicLanguageSwitcher.switchLanguage(request);
  }

  /**
   * Generate culturally appropriate character
   */
  async generateCulturalCharacter(request: CulturalCharacterGenerationRequest): Promise<CulturalCharacterGenerationResponse> {
    return this.culturalCharacterGenerator.generateCharacter(request);
  }

  /**
   * Check religious sensitivity
   */
  async checkReligiousSensitivity(check: ReligiousSensitivityCheck): Promise<ReligiousSensitivityResult> {
    return this.religiousSensitivityFilter.checkSensitivity(check);
  }

  /**
   * Adapt content for family structure
   */
  async adaptForFamilyStructure(adaptation: FamilyStructureAdaptation): Promise<FamilyStructureAdaptationResult> {
    return this.familyStructureAdapter.adaptContent(adaptation);
  }

  /**
   * Get storytelling traditions for a culture
   */
  async getStorytellingTraditions(culturalBackground: string[]): Promise<StorytellingTradition[]> {
    return this.culturalContextEngine.getStorytellingTraditions(culturalBackground);
  }

  /**
   * Get cultural sensitivity filters
   */
  async getCulturalSensitivityFilters(culturalContext: string[]): Promise<CulturalSensitivityFilter[]> {
    return this.culturalContextEngine.getCulturalSensitivityFilters(culturalContext);
  }

  // Global Storytelling Features

  /**
   * Get traditional storytelling patterns for integration
   */
  async getTraditionalStoryPatterns(culturalBackground: string[]): Promise<TraditionalStoryPattern[]> {
    return this.globalStorytellingEngine.getTraditionalStoryPatterns(culturalBackground);
  }

  /**
   * Create holiday-specific story mode
   */
  async createHolidayStoryMode(holiday: string, culturalContext: string[], userAge: number): Promise<HolidayStoryMode> {
    return this.globalStorytellingEngine.createHolidayStoryMode(holiday, culturalContext, userAge);
  }

  /**
   * Generate cross-cultural character interaction scenarios
   */
  async generateCrossCulturalScenario(
    cultures: string[],
    interactionType: CrossCulturalScenario['interactionType'],
    storyContext: any
  ): Promise<CrossCulturalScenario> {
    return this.globalStorytellingEngine.generateCrossCulturalScenario(cultures, interactionType, storyContext);
  }

  /**
   * Create holiday story
   */
  async createHolidayStory(request: HolidayStoryRequest): Promise<HolidayStoryResponse> {
    return this.holidayStoryModeManager.createHolidayStory(request);
  }

  /**
   * Get seasonal story calendar
   */
  async getSeasonalStoryCalendar(culturalContexts: string[]) {
    return this.holidayStoryModeManager.getSeasonalStoryCalendar(culturalContexts);
  }

  /**
   * Get holiday story suggestions
   */
  async getHolidayStorySuggestions(culturalContext: string[], currentDate: Date, userAge: number) {
    return this.holidayStoryModeManager.getHolidayStorySuggestions(culturalContext, currentDate, userAge);
  }

  /**
   * Create multicultural holiday story
   */
  async createMulticulturalHolidayStory(
    holidays: string[],
    culturalContexts: string[],
    userAge: number,
    theme: string
  ): Promise<HolidayStoryResponse> {
    return this.holidayStoryModeManager.createMulticulturalHolidayStory(holidays, culturalContexts, userAge, theme);
  }

  /**
   * Generate cross-cultural friendship scenario
   */
  async generateFriendshipScenario(cultures: string[], ageGroup: string, setting: string): Promise<CrossCulturalScenario> {
    return this.crossCulturalInteractionEngine.generateFriendshipScenario(cultures, ageGroup, setting);
  }

  /**
   * Create cultural bridge scenario
   */
  async createCulturalBridgeScenario(cultures: string[], commonTheme: string, storyContext: any): Promise<CulturalBridgeScenario> {
    return this.crossCulturalInteractionEngine.createCulturalBridgeScenario(cultures, commonTheme, storyContext);
  }

  /**
   * Generate cultural exchange activity
   */
  async generateCulturalExchangeActivity(
    cultures: string[],
    activityType: 'food' | 'music' | 'art' | 'games' | 'stories' | 'celebrations',
    ageGroup: string
  ): Promise<CulturalExchangeActivity> {
    return this.crossCulturalInteractionEngine.generateCulturalExchangeActivity(cultures, activityType, ageGroup);
  }

  /**
   * Preserve storytelling tradition
   */
  async preserveStorytellingTradition(tradition: string, culturalContext: string, modernStoryContext: any) {
    return this.globalStorytellingEngine.preserveStorytellingTradition(tradition, culturalContext, modernStoryContext);
  }

  /**
   * Adapt story for traditional storytelling pattern
   */
  async adaptStoryForTradition(story: any, tradition: TraditionalStoryPattern, culturalContext: CulturalContext) {
    return this.globalStorytellingEngine.adaptStoryForTradition(story, tradition, culturalContext);
  }

  /**
   * Generate culturally diverse character ensemble
   */
  async generateCulturallyDiverseEnsemble(cultures: string[], storyType: string, ageGroup: string) {
    return this.globalStorytellingEngine.generateCulturallyDiverseEnsemble(cultures, storyType, ageGroup);
  }

  // Cultural Intelligence Engine Methods

  /**
   * Analyze story elements for cultural appropriateness
   */
  async analyzeStoryElements(
    elements: string[],
    targetCultures: string[],
    storyContext: any
  ): Promise<StoryElementAnalysis[]> {
    return this.culturalIntelligenceEngine.analyzeStoryElements(elements, targetCultures, storyContext);
  }

  /**
   * Get cultural symbols for story integration
   */
  async getCulturalSymbols(culturalBackground: string[]): Promise<CulturalSymbol[]> {
    return this.culturalIntelligenceEngine.getCulturalSymbols(culturalBackground);
  }

  /**
   * Get cultural archetypes for character development
   */
  async getCulturalArchetypes(culturalBackground: string[]): Promise<CulturalArchetype[]> {
    return this.culturalIntelligenceEngine.getCulturalArchetypes(culturalBackground);
  }

  /**
   * Integrate storytelling traditions into modern narratives
   */
  async integrateStorytellingTraditionsIntelligently(
    traditions: StorytellingTradition[],
    modernStoryContext: any,
    targetAudience: { age: number; culturalBackground: string[] }
  ): Promise<{
    integratedNarrative: any;
    traditionalElements: string[];
    modernAdaptations: string[];
    culturalRespect: string[];
  }> {
    return this.culturalIntelligenceEngine.integrateStorytellingTraditions(traditions, modernStoryContext, targetAudience);
  }

  /**
   * Get cultural celebrations with enhanced intelligence
   */
  async getCulturalCelebrationsIntelligently(
    culturalBackground: string[],
    timeframe?: { start: Date; end: Date }
  ): Promise<CulturalCelebration[]> {
    return this.culturalIntelligenceEngine.getCulturalCelebrations(culturalBackground, timeframe);
  }

  /**
   * Generate intelligent cross-cultural interaction scenarios
   */
  async generateIntelligentCrossCulturalInteraction(
    cultures: string[],
    interactionType: CrossCulturalInteraction['interactionType'],
    storyContext: any,
    ageGroup: string
  ): Promise<CrossCulturalInteraction> {
    return this.culturalIntelligenceEngine.generateCrossCulturalInteraction(cultures, interactionType, storyContext, ageGroup);
  }

  /**
   * Create enhanced religious sensitivity engine
   */
  async createEnhancedReligiousSensitivityEngine(
    religiousContexts: string[],
    customFilters?: any
  ): Promise<{
    filters: CulturalSensitivityFilter[];
    guidelines: string[];
    respectfulAlternatives: { [topic: string]: string[] };
  }> {
    return this.culturalIntelligenceEngine.createReligiousSensitivityEngine(religiousContexts, customFilters);
  }

  /**
   * Analyze cultural context with intelligence
   */
  async analyzeCulturalContextIntelligently(
    storyContent: any,
    targetCultures: string[],
    sensitivityLevel: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<{
    overallAppropriateness: boolean;
    culturalAnalysis: { [culture: string]: any };
    recommendations: string[];
    requiredAdaptations: string[];
  }> {
    return this.culturalIntelligenceEngine.analyzeCulturalContext(storyContent, targetCultures, sensitivityLevel);
  }

  // Multi-Language Support Methods

  /**
   * Create bilingual storytelling experience
   */
  async createBilingualStory(request: BilingualStorytellingRequest): Promise<BilingualStorytellingResponse> {
    return this.multiLanguageSupport.createBilingualStory(request);
  }

  /**
   * Implement natural code-switching for multilingual families
   */
  async implementCodeSwitching(request: CodeSwitchingRequest): Promise<CodeSwitchingResponse> {
    return this.multiLanguageSupport.implementCodeSwitching(request);
  }

  /**
   * Get accent and dialect profiles for natural speech
   */
  async getAccentDialectProfiles(language: string, regions?: string[]): Promise<AccentDialectProfile[]> {
    return this.multiLanguageSupport.getAccentDialectProfiles(language, regions);
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
    return this.multiLanguageSupport.createCulturallyAdaptedTranslation(originalText, targetLanguage, culturalContext, approach);
  }

  /**
   * Integrate language learning features into stories
   */
  async integrateLanguageLearning(
    storyContent: any,
    targetLanguage: string,
    proficiencyLevel: LanguageLearningIntegration['proficiencyLevel'],
    learningObjectives: string[]
  ): Promise<LanguageLearningIntegration> {
    return this.multiLanguageSupport.integrateLanguageLearning(storyContent, targetLanguage, proficiencyLevel, learningObjectives);
  }

  /**
   * Switch language mid-conversation with enhanced context awareness
   */
  async switchLanguageMidConversationEnhanced(
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
    return this.multiLanguageSupport.switchLanguageMidConversation(
      currentLanguage,
      targetLanguage,
      conversationContext,
      switchReason,
      transitionStyle
    );
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
    similarSounds: { [word: string]: string };
  }> {
    return this.multiLanguageSupport.generatePronunciationGuide(text, targetLanguage, sourceLanguage, childAge);
  }

  // Cultural Storytelling Preservation Methods

  /**
   * Integrate traditional narrative structures into modern stories
   */
  async integrateTraditionalNarrativeStructure(
    modernStory: any,
    traditionalStructure: TraditionalNarrativeStructure,
    targetAudience: { age: number; culturalBackground: string[] }
  ): Promise<{
    restructuredStory: any;
    traditionalElements: string[];
    audienceParticipationPoints: any[];
    culturalEducation: string[];
    preservationAchieved: string[];
  }> {
    return this.culturalStorytellingPreservation.integrateTraditionalNarrativeStructure(
      modernStory,
      traditionalStructure,
      targetAudience
    );
  }

  /**
   * Recognize and apply oral tradition patterns
   */
  async recognizeOralTraditionPatterns(
    culturalBackground: string[],
    storyContent: any
  ): Promise<OralTraditionPattern[]> {
    return this.culturalStorytellingPreservation.recognizeOralTraditionPatterns(culturalBackground, storyContent);
  }

  /**
   * Integrate cultural mythology and folklore respectfully
   */
  async integrateCulturalMythology(
    mythology: string,
    culturalOrigin: string[],
    modernStoryContext: any,
    collaborationApproval: boolean = false
  ): Promise<CulturalMythologyIntegration> {
    return this.culturalStorytellingPreservation.integrateCulturalMythology(
      mythology,
      culturalOrigin,
      modernStoryContext,
      collaborationApproval
    );
  }

  /**
   * Support indigenous storytelling methods with cultural protocols
   */
  async supportIndigenousStorytellingMethods(
    indigenousGroup: string[],
    communityApproval: boolean = false,
    culturalLiaison: string | null = null
  ): Promise<IndigenousStorytellingMethod[]> {
    return this.culturalStorytellingPreservation.supportIndigenousStorytellingMethods(
      indigenousGroup,
      communityApproval,
      culturalLiaison
    );
  }

  /**
   * Create cultural celebration story templates with community input
   */
  async createCulturalCelebrationTemplatesWithCommunity(
    celebrations: string[],
    culturalCommunityInput: { [celebration: string]: any } = {}
  ): Promise<{
    templates: any[];
    communityValidation: { [celebration: string]: boolean };
    respectfulRepresentation: string[];
    educationalValue: string[];
  }> {
    return this.culturalStorytellingPreservation.createCulturalCelebrationTemplates(celebrations, culturalCommunityInput);
  }

  /**
   * Document community storytelling traditions
   */
  async documentCommunityStorytellingTraditions(
    community: string,
    geographicOrigin: string[],
    communityParticipation: boolean = false
  ): Promise<CommunityStorytellingTradition> {
    return this.culturalStorytellingPreservation.documentCommunityStorytellingTraditions(
      community,
      geographicOrigin,
      communityParticipation
    );
  }

  /**
   * Create comprehensive tradition documentation
   */
  async createTraditionDocumentation(
    tradition: string,
    culturalContext: string[],
    communityCollaboration: {
      approved: boolean;
      collaborators: string[];
      permissions: string[];
    }
  ): Promise<StorytellingTraditionDocumentation> {
    return this.culturalStorytellingPreservation.createTraditionDocumentation(
      tradition,
      culturalContext,
      communityCollaboration
    );
  }

  /**
   * Get traditional narrative structures for specific cultures
   */
  async getTraditionalNarrativeStructures(culturalBackground: string[]): Promise<TraditionalNarrativeStructure[]> {
    return this.culturalStorytellingPreservation.getTraditionalNarrativeStructures(culturalBackground);
  }

  /**
   * Validate cultural appropriateness of storytelling adaptations
   */
  async validateCulturalAppropriateness(
    adaptation: any,
    originalTradition: string,
    culturalContext: string[],
    communityReview: boolean = false
  ): Promise<{
    appropriate: boolean;
    concerns: string[];
    recommendations: string[];
    communityApprovalRequired: boolean;
    respectfulAlternatives: string[];
  }> {
    return this.culturalStorytellingPreservation.validateCulturalAppropriateness(
      adaptation,
      originalTradition,
      culturalContext,
      communityReview
    );
  }

  private buildLocalizationPrompt(request: LocalizationRequest, culturalContext: CulturalContext): string {
    return `
Please localize the following ${request.contentType} content:

Original Content: "${request.content}"
Target Language: ${request.targetLanguage}
Cultural Context: ${JSON.stringify(culturalContext, null, 2)}
Preserve Original Meaning: ${request.preserveOriginalMeaning}
Adapt for Culture: ${request.adaptForCulture}

Requirements:
1. Maintain age-appropriate language for children
2. Respect cultural sensitivities and taboos
3. Use appropriate family structure terminology
4. Consider religious considerations if applicable
5. Incorporate storytelling traditions when relevant
6. Ensure linguistic accuracy and natural flow

Please respond with a JSON object containing:
{
  "localizedContent": "translated and culturally adapted content",
  "culturalAdaptations": ["list of cultural changes made"],
  "languageNotes": ["linguistic notes and explanations"],
  "confidenceScore": 0.95,
  "alternativeVersions": ["alternative translations if applicable"]
}
    `;
  }

  private async checkCulturalSensitivity(content: string, culturalContext: CulturalContext): Promise<{
    isAppropriate: boolean;
    alternativeContent?: string;
  }> {
    // Check against cultural taboos and sensitive topics
    const filters = await this.getCulturalSensitivityFilters(culturalContext.culturalBackground);
    
    for (const filter of filters) {
      for (const sensitivePattern of filter.avoidancePatterns) {
        if (content.toLowerCase().includes(sensitivePattern.toLowerCase())) {
          // Find appropriate alternative
          const alternatives = filter.appropriateAlternatives[sensitivePattern];
          if (alternatives && alternatives.length > 0) {
            const adaptedContent = content.replace(
              new RegExp(sensitivePattern, 'gi'),
              alternatives[0]
            );
            return {
              isAppropriate: false,
              alternativeContent: adaptedContent
            };
          }
        }
      }
    }

    return { isAppropriate: true };
  }
}
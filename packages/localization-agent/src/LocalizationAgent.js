"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizationAgent = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const openai_1 = __importDefault(require("openai"));
const CulturalContextEngine_1 = require("./services/CulturalContextEngine");
const DynamicLanguageSwitcher_1 = require("./services/DynamicLanguageSwitcher");
const CulturalCharacterGenerator_1 = require("./services/CulturalCharacterGenerator");
const ReligiousSensitivityFilter_1 = require("./services/ReligiousSensitivityFilter");
const FamilyStructureAdapter_1 = require("./services/FamilyStructureAdapter");
const GlobalStorytellingEngine_1 = require("./services/GlobalStorytellingEngine");
const HolidayStoryModeManager_1 = require("./services/HolidayStoryModeManager");
const CrossCulturalInteractionEngine_1 = require("./services/CrossCulturalInteractionEngine");
const CulturalIntelligenceEngine_1 = require("./services/CulturalIntelligenceEngine");
const MultiLanguageSupport_1 = require("./services/MultiLanguageSupport");
const CulturalStorytellingPreservation_1 = require("./services/CulturalStorytellingPreservation");
class LocalizationAgent {
    constructor(supabaseUrl, supabaseKey, openaiApiKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        this.openai = new openai_1.default({ apiKey: openaiApiKey });
        this.culturalContextEngine = new CulturalContextEngine_1.CulturalContextEngine(this.supabase, this.openai);
        this.dynamicLanguageSwitcher = new DynamicLanguageSwitcher_1.DynamicLanguageSwitcher(this.openai);
        this.culturalCharacterGenerator = new CulturalCharacterGenerator_1.CulturalCharacterGenerator(this.openai);
        this.religiousSensitivityFilter = new ReligiousSensitivityFilter_1.ReligiousSensitivityFilter(this.openai);
        this.familyStructureAdapter = new FamilyStructureAdapter_1.FamilyStructureAdapter(this.openai);
        this.globalStorytellingEngine = new GlobalStorytellingEngine_1.GlobalStorytellingEngine(this.supabase, this.openai);
        this.holidayStoryModeManager = new HolidayStoryModeManager_1.HolidayStoryModeManager(this.supabase, this.openai);
        this.crossCulturalInteractionEngine = new CrossCulturalInteractionEngine_1.CrossCulturalInteractionEngine(this.openai);
        this.culturalIntelligenceEngine = new CulturalIntelligenceEngine_1.CulturalIntelligenceEngine(this.supabase, this.openai);
        this.multiLanguageSupport = new MultiLanguageSupport_1.MultiLanguageSupport(this.supabase, this.openai);
        this.culturalStorytellingPreservation = new CulturalStorytellingPreservation_1.CulturalStorytellingPreservation(this.supabase, this.openai);
    }
    /**
     * Get or create cultural context for a user
     */
    async getCulturalContext(userId) {
        return this.culturalContextEngine.getCulturalContext(userId);
    }
    /**
     * Update cultural context for a user
     */
    async updateCulturalContext(userId, context) {
        return this.culturalContextEngine.updateCulturalContext(userId, context);
    }
    /**
     * Get supported languages
     */
    async getSupportedLanguages() {
        return this.culturalContextEngine.getSupportedLanguages();
    }
    /**
     * Localize content to target language and cultural context
     */
    async localizeContent(request) {
        try {
            // Get user's cultural context
            const culturalContext = await this.getCulturalContext(request.userId);
            if (!culturalContext) {
                throw new Error('Cultural context not found for user');
            }
            // Apply cultural sensitivity filters
            const sensitivityCheck = await this.checkCulturalSensitivity(request.content, culturalContext);
            if (!sensitivityCheck.isAppropriate) {
                // Adapt content to be culturally appropriate
                request.content = sensitivityCheck.alternativeContent || request.content;
            }
            // Perform localization
            const localizationPrompt = this.buildLocalizationPrompt(request, culturalContext);
            const completion = await this.openai.chat.completions.create({
                model: process.env.OPENAI_MODEL || 'gpt-5.1',
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
        }
        catch (error) {
            console.error('Localization error:', error);
            throw new Error('Failed to localize content');
        }
    }
    /**
     * Switch language dynamically during story creation
     */
    async switchLanguageDynamically(request) {
        return this.dynamicLanguageSwitcher.switchLanguage(request);
    }
    /**
     * Generate culturally appropriate character
     */
    async generateCulturalCharacter(request) {
        return this.culturalCharacterGenerator.generateCharacter(request);
    }
    /**
     * Check religious sensitivity
     */
    async checkReligiousSensitivity(check) {
        return this.religiousSensitivityFilter.checkSensitivity(check);
    }
    /**
     * Adapt content for family structure
     */
    async adaptForFamilyStructure(adaptation) {
        return this.familyStructureAdapter.adaptContent(adaptation);
    }
    /**
     * Get storytelling traditions for a culture
     */
    async getStorytellingTraditions(culturalBackground) {
        return this.culturalContextEngine.getStorytellingTraditions(culturalBackground);
    }
    /**
     * Get cultural sensitivity filters
     */
    async getCulturalSensitivityFilters(culturalContext) {
        return this.culturalContextEngine.getCulturalSensitivityFilters(culturalContext);
    }
    // Global Storytelling Features
    /**
     * Get traditional storytelling patterns for integration
     */
    async getTraditionalStoryPatterns(culturalBackground) {
        return this.globalStorytellingEngine.getTraditionalStoryPatterns(culturalBackground);
    }
    /**
     * Create holiday-specific story mode
     */
    async createHolidayStoryMode(holiday, culturalContext, userAge) {
        return this.globalStorytellingEngine.createHolidayStoryMode(holiday, culturalContext, userAge);
    }
    /**
     * Generate cross-cultural character interaction scenarios
     */
    async generateCrossCulturalScenario(cultures, interactionType, storyContext) {
        return this.globalStorytellingEngine.generateCrossCulturalScenario(cultures, interactionType, storyContext);
    }
    /**
     * Create holiday story
     */
    async createHolidayStory(request) {
        return this.holidayStoryModeManager.createHolidayStory(request);
    }
    /**
     * Get seasonal story calendar
     */
    async getSeasonalStoryCalendar(culturalContexts) {
        return this.holidayStoryModeManager.getSeasonalStoryCalendar(culturalContexts);
    }
    /**
     * Get holiday story suggestions
     */
    async getHolidayStorySuggestions(culturalContext, currentDate, userAge) {
        return this.holidayStoryModeManager.getHolidayStorySuggestions(culturalContext, currentDate, userAge);
    }
    /**
     * Create multicultural holiday story
     */
    async createMulticulturalHolidayStory(holidays, culturalContexts, userAge, theme) {
        return this.holidayStoryModeManager.createMulticulturalHolidayStory(holidays, culturalContexts, userAge, theme);
    }
    /**
     * Generate cross-cultural friendship scenario
     */
    async generateFriendshipScenario(cultures, ageGroup, setting) {
        return this.crossCulturalInteractionEngine.generateFriendshipScenario(cultures, ageGroup, setting);
    }
    /**
     * Create cultural bridge scenario
     */
    async createCulturalBridgeScenario(cultures, commonTheme, storyContext) {
        return this.crossCulturalInteractionEngine.createCulturalBridgeScenario(cultures, commonTheme, storyContext);
    }
    /**
     * Generate cultural exchange activity
     */
    async generateCulturalExchangeActivity(cultures, activityType, ageGroup) {
        return this.crossCulturalInteractionEngine.generateCulturalExchangeActivity(cultures, activityType, ageGroup);
    }
    /**
     * Preserve storytelling tradition
     */
    async preserveStorytellingTradition(tradition, culturalContext, modernStoryContext) {
        return this.globalStorytellingEngine.preserveStorytellingTradition(tradition, culturalContext, modernStoryContext);
    }
    /**
     * Adapt story for traditional storytelling pattern
     */
    async adaptStoryForTradition(story, tradition, culturalContext) {
        return this.globalStorytellingEngine.adaptStoryForTradition(story, tradition, culturalContext);
    }
    /**
     * Generate culturally diverse character ensemble
     */
    async generateCulturallyDiverseEnsemble(cultures, storyType, ageGroup) {
        return this.globalStorytellingEngine.generateCulturallyDiverseEnsemble(cultures, storyType, ageGroup);
    }
    // Cultural Intelligence Engine Methods
    /**
     * Analyze story elements for cultural appropriateness
     */
    async analyzeStoryElements(elements, targetCultures, storyContext) {
        return this.culturalIntelligenceEngine.analyzeStoryElements(elements, targetCultures, storyContext);
    }
    /**
     * Get cultural symbols for story integration
     */
    async getCulturalSymbols(culturalBackground) {
        return this.culturalIntelligenceEngine.getCulturalSymbols(culturalBackground);
    }
    /**
     * Get cultural archetypes for character development
     */
    async getCulturalArchetypes(culturalBackground) {
        return this.culturalIntelligenceEngine.getCulturalArchetypes(culturalBackground);
    }
    /**
     * Integrate storytelling traditions into modern narratives
     */
    async integrateStorytellingTraditionsIntelligently(traditions, modernStoryContext, targetAudience) {
        return this.culturalIntelligenceEngine.integrateStorytellingTraditions(traditions, modernStoryContext, targetAudience);
    }
    /**
     * Get cultural celebrations with enhanced intelligence
     */
    async getCulturalCelebrationsIntelligently(culturalBackground, timeframe) {
        return this.culturalIntelligenceEngine.getCulturalCelebrations(culturalBackground, timeframe);
    }
    /**
     * Generate intelligent cross-cultural interaction scenarios
     */
    async generateIntelligentCrossCulturalInteraction(cultures, interactionType, storyContext, ageGroup) {
        return this.culturalIntelligenceEngine.generateCrossCulturalInteraction(cultures, interactionType, storyContext, ageGroup);
    }
    /**
     * Create enhanced religious sensitivity engine
     */
    async createEnhancedReligiousSensitivityEngine(religiousContexts, customFilters) {
        return this.culturalIntelligenceEngine.createReligiousSensitivityEngine(religiousContexts, customFilters);
    }
    /**
     * Analyze cultural context with intelligence
     */
    async analyzeCulturalContextIntelligently(storyContent, targetCultures, sensitivityLevel = 'medium') {
        return this.culturalIntelligenceEngine.analyzeCulturalContext(storyContent, targetCultures, sensitivityLevel);
    }
    // Multi-Language Support Methods
    /**
     * Create bilingual storytelling experience
     */
    async createBilingualStory(request) {
        return this.multiLanguageSupport.createBilingualStory(request);
    }
    /**
     * Implement natural code-switching for multilingual families
     */
    async implementCodeSwitching(request) {
        return this.multiLanguageSupport.implementCodeSwitching(request);
    }
    /**
     * Get accent and dialect profiles for natural speech
     */
    async getAccentDialectProfiles(language, regions) {
        return this.multiLanguageSupport.getAccentDialectProfiles(language, regions);
    }
    /**
     * Create culturally adapted translation
     */
    async createCulturallyAdaptedTranslation(originalText, targetLanguage, culturalContext, approach = 'cultural_adaptation') {
        return this.multiLanguageSupport.createCulturallyAdaptedTranslation(originalText, targetLanguage, culturalContext, approach);
    }
    /**
     * Integrate language learning features into stories
     */
    async integrateLanguageLearning(storyContent, targetLanguage, proficiencyLevel, learningObjectives) {
        return this.multiLanguageSupport.integrateLanguageLearning(storyContent, targetLanguage, proficiencyLevel, learningObjectives);
    }
    /**
     * Switch language mid-conversation with enhanced context awareness
     */
    async switchLanguageMidConversationEnhanced(currentLanguage, targetLanguage, conversationContext, switchReason, transitionStyle) {
        return this.multiLanguageSupport.switchLanguageMidConversation(currentLanguage, targetLanguage, conversationContext, switchReason, transitionStyle);
    }
    /**
     * Generate pronunciation guides for children
     */
    async generatePronunciationGuide(text, targetLanguage, sourceLanguage, childAge) {
        return this.multiLanguageSupport.generatePronunciationGuide(text, targetLanguage, sourceLanguage, childAge);
    }
    // Cultural Storytelling Preservation Methods
    /**
     * Integrate traditional narrative structures into modern stories
     */
    async integrateTraditionalNarrativeStructure(modernStory, traditionalStructure, targetAudience) {
        return this.culturalStorytellingPreservation.integrateTraditionalNarrativeStructure(modernStory, traditionalStructure, targetAudience);
    }
    /**
     * Recognize and apply oral tradition patterns
     */
    async recognizeOralTraditionPatterns(culturalBackground, storyContent) {
        return this.culturalStorytellingPreservation.recognizeOralTraditionPatterns(culturalBackground, storyContent);
    }
    /**
     * Integrate cultural mythology and folklore respectfully
     */
    async integrateCulturalMythology(mythology, culturalOrigin, modernStoryContext, collaborationApproval = false) {
        return this.culturalStorytellingPreservation.integrateCulturalMythology(mythology, culturalOrigin, modernStoryContext, collaborationApproval);
    }
    /**
     * Support indigenous storytelling methods with cultural protocols
     */
    async supportIndigenousStorytellingMethods(indigenousGroup, communityApproval = false, culturalLiaison = null) {
        return this.culturalStorytellingPreservation.supportIndigenousStorytellingMethods(indigenousGroup, communityApproval, culturalLiaison);
    }
    /**
     * Create cultural celebration story templates with community input
     */
    async createCulturalCelebrationTemplatesWithCommunity(celebrations, culturalCommunityInput = {}) {
        return this.culturalStorytellingPreservation.createCulturalCelebrationTemplates(celebrations, culturalCommunityInput);
    }
    /**
     * Document community storytelling traditions
     */
    async documentCommunityStorytellingTraditions(community, geographicOrigin, communityParticipation = false) {
        return this.culturalStorytellingPreservation.documentCommunityStorytellingTraditions(community, geographicOrigin, communityParticipation);
    }
    /**
     * Create comprehensive tradition documentation
     */
    async createTraditionDocumentation(tradition, culturalContext, communityCollaboration) {
        return this.culturalStorytellingPreservation.createTraditionDocumentation(tradition, culturalContext, communityCollaboration);
    }
    /**
     * Get traditional narrative structures for specific cultures
     */
    async getTraditionalNarrativeStructures(culturalBackground) {
        return this.culturalStorytellingPreservation.getTraditionalNarrativeStructures(culturalBackground);
    }
    /**
     * Validate cultural appropriateness of storytelling adaptations
     */
    async validateCulturalAppropriateness(adaptation, originalTradition, culturalContext, communityReview = false) {
        return this.culturalStorytellingPreservation.validateCulturalAppropriateness(adaptation, originalTradition, culturalContext, communityReview);
    }
    buildLocalizationPrompt(request, culturalContext) {
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
    async checkCulturalSensitivity(content, culturalContext) {
        // Check against cultural taboos and sensitive topics
        const filters = await this.getCulturalSensitivityFilters(culturalContext.culturalBackground);
        for (const filter of filters) {
            for (const sensitivePattern of filter.avoidancePatterns) {
                if (content.toLowerCase().includes(sensitivePattern.toLowerCase())) {
                    // Find appropriate alternative
                    const alternatives = filter.appropriateAlternatives[sensitivePattern];
                    if (alternatives && alternatives.length > 0) {
                        const adaptedContent = content.replace(new RegExp(sensitivePattern, 'gi'), alternatives[0]);
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
exports.LocalizationAgent = LocalizationAgent;
//# sourceMappingURL=LocalizationAgent.js.map
import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { CulturalContext } from '../types';
export interface TraditionalStoryPattern {
    name: string;
    culturalOrigin: string[];
    structure: {
        opening: string;
        development: string;
        climax: string;
        resolution: string;
        closing: string;
    };
    commonElements: string[];
    moralFramework: string;
    adaptationGuidelines: string[];
}
export interface HolidayStoryMode {
    holiday: string;
    culturalContext: string[];
    storyThemes: string[];
    characterTypes: string[];
    settingElements: string[];
    traditionalElements: string[];
    modernAdaptations: string[];
    ageAppropriateActivities: string[];
}
export interface CrossCulturalScenario {
    scenario: string;
    cultures: string[];
    interactionType: 'celebration' | 'learning' | 'friendship' | 'cooperation' | 'understanding';
    learningObjectives: string[];
    respectfulApproaches: string[];
    potentialChallenges: string[];
    resolutionStrategies: string[];
}
export interface CulturalCelebrationTemplate {
    celebration: string;
    culturalOrigin: string;
    significance: string;
    traditionalElements: string[];
    storyIntegrationPoints: string[];
    ageAppropriateExplanations: {
        [ageGroup: string]: string;
    };
    respectfulRepresentation: string[];
    modernAdaptations: string[];
}
export interface StorytellingTraditionPreservation {
    tradition: string;
    culturalContext: string;
    originalElements: string[];
    preservationMethods: string[];
    modernAdaptations: string[];
    educationalValue: string[];
    respectfulIntegration: string[];
}
export declare class GlobalStorytellingEngine {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
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
     * Get cultural celebration story templates
     */
    getCulturalCelebrationTemplates(celebrations: string[]): Promise<CulturalCelebrationTemplate[]>;
    /**
     * Integrate storytelling tradition preservation
     */
    preserveStorytellingTradition(tradition: string, culturalContext: string, modernStoryContext: any): Promise<StorytellingTraditionPreservation>;
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
    private getTraditionalPatternForCulture;
    private getCelebrationTemplate;
    private buildHolidayStoryPrompt;
    private buildCrossCulturalScenarioPrompt;
    private buildTraditionPreservationPrompt;
    private buildStoryAdaptationPrompt;
    private buildCulturalEnsemblePrompt;
}
//# sourceMappingURL=GlobalStorytellingEngine.d.ts.map
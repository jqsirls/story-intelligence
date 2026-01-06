import { SupabaseClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { StorytellingTradition, CulturalSensitivityFilter } from '../types';
export interface CulturalSymbol {
    symbol: string;
    culturalOrigin: string[];
    meaning: string;
    appropriateContexts: string[];
    inappropriateContexts: string[];
    respectfulUsage: string[];
    modernAdaptations: string[];
}
export interface CulturalArchetype {
    name: string;
    culturalOrigin: string[];
    characteristics: string[];
    modernInterpretations: string[];
    respectfulPortrayal: string[];
    avoidStereotypes: string[];
    positiveTraits: string[];
    culturalSignificance: string;
}
export interface StoryElementAnalysis {
    element: string;
    culturalAppropriateness: {
        [culture: string]: {
            appropriate: boolean;
            concerns: string[];
            suggestions: string[];
            alternatives: string[];
        };
    };
    universalThemes: string[];
    culturalSpecificAdaptations: {
        [culture: string]: string;
    };
}
export interface CulturalCelebration {
    name: string;
    culturalOrigin: string[];
    date: string | 'variable';
    significance: string;
    traditionalElements: string[];
    modernCelebrations: string[];
    childFriendlyActivities: string[];
    storyThemes: string[];
    respectfulInclusion: string[];
}
export interface CrossCulturalInteraction {
    cultures: string[];
    interactionType: 'friendship' | 'learning' | 'celebration' | 'conflict_resolution' | 'collaboration';
    commonGround: string[];
    culturalDifferences: string[];
    bridgingElements: string[];
    learningOpportunities: string[];
    respectfulExchange: string[];
}
export declare class CulturalIntelligenceEngine {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
    /**
     * Analyze story elements for cultural appropriateness
     */
    analyzeStoryElements(elements: string[], targetCultures: string[], storyContext: any): Promise<StoryElementAnalysis[]>;
    /**
     * Get cultural symbols for integration
     */
    getCulturalSymbols(culturalBackground: string[]): Promise<CulturalSymbol[]>;
    /**
     * Get cultural archetypes for character development
     */
    getCulturalArchetypes(culturalBackground: string[]): Promise<CulturalArchetype[]>;
    /**
     * Integrate storytelling traditions into modern narratives
     */
    integrateStorytellingTraditions(traditions: StorytellingTradition[], modernStoryContext: any, targetAudience: {
        age: number;
        culturalBackground: string[];
    }): Promise<{
        integratedNarrative: any;
        traditionalElements: string[];
        modernAdaptations: string[];
        culturalRespect: string[];
    }>;
    /**
     * Get cultural celebrations and holidays
     */
    getCulturalCelebrations(culturalBackground: string[], timeframe?: {
        start: Date;
        end: Date;
    }): Promise<CulturalCelebration[]>;
    /**
     * Generate cross-cultural interaction scenarios
     */
    generateCrossCulturalInteraction(cultures: string[], interactionType: CrossCulturalInteraction['interactionType'], storyContext: any, ageGroup: string): Promise<CrossCulturalInteraction>;
    /**
     * Create culturally sensitive religious content filters
     */
    createReligiousSensitivityEngine(religiousContexts: string[], customFilters?: any): Promise<{
        filters: CulturalSensitivityFilter[];
        guidelines: string[];
        respectfulAlternatives: {
            [topic: string]: string[];
        };
    }>;
    /**
     * Analyze cultural context for story appropriateness
     */
    analyzeCulturalContext(storyContent: any, targetCultures: string[], sensitivityLevel?: 'high' | 'medium' | 'low'): Promise<{
        overallAppropriateness: boolean;
        culturalAnalysis: {
            [culture: string]: any;
        };
        recommendations: string[];
        requiredAdaptations: string[];
    }>;
    private analyzeIndividualElement;
    private getSymbolsForCulture;
    private getArchetypesForCulture;
    private getCelebrationsForCulture;
    private createReligiousFilter;
    private getReligiousGuidelines;
    private buildTraditionIntegrationPrompt;
    private buildCrossCulturalInteractionPrompt;
    private buildCulturalAnalysisPrompt;
}
//# sourceMappingURL=CulturalIntelligenceEngine.d.ts.map
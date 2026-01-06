import OpenAI from 'openai';
import { CrossCulturalScenario } from './GlobalStorytellingEngine';
export interface CulturalBridgeScenario {
    scenario: string;
    cultures: string[];
    bridgeElements: string[];
    commonValues: string[];
    learningOutcomes: string[];
    conflictResolution: string[];
}
export interface CulturalExchangeActivity {
    activity: string;
    participatingCultures: string[];
    exchangeElements: string[];
    mutualLearning: string[];
    respectfulPractices: string[];
    ageAdaptations: {
        [ageGroup: string]: string;
    };
}
export interface CulturalMisunderstandingScenario {
    misunderstanding: string;
    culturalFactors: string[];
    educationalOpportunity: string;
    resolutionSteps: string[];
    preventionStrategies: string[];
    empathyBuilding: string[];
}
export declare class CrossCulturalInteractionEngine {
    private openai;
    constructor(openai: OpenAI);
    /**
     * Generate cross-cultural friendship scenarios
     */
    generateFriendshipScenario(cultures: string[], ageGroup: string, setting: string): Promise<CrossCulturalScenario>;
    /**
     * Create cultural bridge scenarios that connect different traditions
     */
    createCulturalBridgeScenario(cultures: string[], commonTheme: string, storyContext: any): Promise<CulturalBridgeScenario>;
    /**
     * Generate cultural exchange activities
     */
    generateCulturalExchangeActivity(cultures: string[], activityType: 'food' | 'music' | 'art' | 'games' | 'stories' | 'celebrations', ageGroup: string): Promise<CulturalExchangeActivity>;
    /**
     * Create scenarios for handling cultural misunderstandings
     */
    createMisunderstandingScenario(cultures: string[], misunderstandingType: 'communication' | 'customs' | 'values' | 'traditions', ageGroup: string): Promise<CulturalMisunderstandingScenario>;
    /**
     * Generate collaborative problem-solving scenarios
     */
    generateCollaborativeScenario(cultures: string[], problemType: 'community' | 'environmental' | 'social' | 'creative', ageGroup: string): Promise<{
        problem: string;
        culturalPerspectives: Array<{
            culture: string;
            perspective: string;
            uniqueContribution: string;
            culturalWisdom: string;
        }>;
        collaborativeSolution: string;
        learningOutcomes: string[];
        valuesDemonstrated: string[];
    }>;
    /**
     * Create cultural celebration integration scenarios
     */
    createCelebrationIntegrationScenario(primaryCelebration: string, primaryCulture: string, participatingCultures: string[], ageGroup: string): Promise<{
        scenario: string;
        integrationApproaches: string[];
        respectfulParticipation: string[];
        learningOpportunities: string[];
        inclusiveElements: string[];
        culturalSensitivities: string[];
    }>;
    /**
     * Generate empathy-building exercises
     */
    generateEmpathyBuildingExercise(cultures: string[], focusArea: 'perspective-taking' | 'emotional-understanding' | 'cultural-appreciation' | 'bias-awareness', ageGroup: string): Promise<{
        exercise: string;
        culturalPerspectives: string[];
        empathyPrompts: string[];
        reflectionQuestions: string[];
        actionSteps: string[];
        successIndicators: string[];
    }>;
    private buildFriendshipScenarioPrompt;
    private buildCulturalBridgePrompt;
    private buildCulturalExchangePrompt;
    private buildMisunderstandingScenarioPrompt;
    private buildCollaborativeScenarioPrompt;
    private buildCelebrationIntegrationPrompt;
    private buildEmpathyBuildingPrompt;
}
//# sourceMappingURL=CrossCulturalInteractionEngine.d.ts.map
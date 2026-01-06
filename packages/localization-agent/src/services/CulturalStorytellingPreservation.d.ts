import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
export interface TraditionalNarrativeStructure {
    name: string;
    culturalOrigin: string[];
    structureType: 'linear' | 'circular' | 'spiral' | 'nested' | 'episodic' | 'call_response';
    phases: {
        name: string;
        purpose: string;
        characteristics: string[];
        modernAdaptation: string;
    }[];
    audienceParticipation: {
        type: 'call_response' | 'repetition' | 'prediction' | 'physical_movement' | 'singing';
        description: string;
        modernImplementation: string;
    }[];
    culturalSignificance: string;
    preservationPriority: 'critical' | 'important' | 'valuable';
}
export interface OralTraditionPattern {
    tradition: string;
    culturalContext: string[];
    oralElements: {
        rhythm: string;
        repetition: string[];
        memorabilityFeatures: string[];
        voiceModulation: string[];
    };
    communityRole: {
        storyteller: string;
        audience: string;
        setting: string;
        purpose: string;
    };
    preservationMethods: {
        traditional: string[];
        modern: string[];
        digital: string[];
    };
    adaptationGuidelines: string[];
}
export interface CulturalMythologyIntegration {
    mythology: string;
    culturalOrigin: string[];
    coreMyths: {
        name: string;
        significance: string;
        keyElements: string[];
        moralLessons: string[];
        modernRelevance: string;
    }[];
    respectfulAdaptation: {
        guidelines: string[];
        taboos: string[];
        appropriateContexts: string[];
        collaborationRequirements: string[];
    };
    educationalValue: string[];
    childFriendlyVersions: {
        ageGroup: string;
        adaptations: string[];
        focusPoints: string[];
    }[];
}
export interface IndigenousStorytellingMethod {
    method: string;
    indigenousGroup: string[];
    traditionalPractices: {
        setting: string;
        timing: string;
        participants: string[];
        ritualElements: string[];
    };
    storytellingTechniques: {
        voiceWork: string[];
        bodyLanguage: string[];
        props: string[];
        environmentalElements: string[];
    };
    culturalProtocols: {
        permissions: string[];
        restrictions: string[];
        respectfulPractices: string[];
        collaborationRequirements: string[];
    };
    modernAdaptation: {
        preservedElements: string[];
        adaptedElements: string[];
        technologyIntegration: string[];
        educationalFramework: string[];
    };
}
export interface CommunityStorytellingTradition {
    community: string;
    geographicOrigin: string[];
    traditionName: string;
    communityRole: {
        storytellers: string[];
        audienceParticipation: string[];
        settingImportance: string;
        seasonalAspects: string[];
    };
    preservationEfforts: {
        currentStatus: 'thriving' | 'declining' | 'endangered' | 'revitalization';
        preservationMethods: string[];
        communityInvolvement: string[];
        documentationNeeds: string[];
    };
    modernRelevance: {
        educationalValue: string[];
        culturalContinuity: string[];
        communityBuilding: string[];
        childDevelopment: string[];
    };
    integrationStrategies: {
        schoolPrograms: string[];
        familyActivities: string[];
        communityEvents: string[];
        digitalPreservation: string[];
    };
}
export interface StorytellingTraditionDocumentation {
    tradition: string;
    culturalContext: string[];
    documentation: {
        oralHistory: {
            interviews: string[];
            recordings: string[];
            transcriptions: string[];
        };
        practicalElements: {
            techniques: string[];
            props: string[];
            settings: string[];
            timing: string[];
        };
        culturalContext: {
            significance: string[];
            taboos: string[];
            protocols: string[];
            permissions: string[];
        };
    };
    preservationPlan: {
        immediateActions: string[];
        longTermGoals: string[];
        communityInvolvement: string[];
        educationalIntegration: string[];
    };
    accessibilityConsiderations: {
        ageAppropriate: {
            [ageGroup: string]: string[];
        };
        culturalSensitivity: string[];
        modernAdaptations: string[];
    };
}
export declare class CulturalStorytellingPreservation {
    private supabase;
    private openai;
    constructor(supabase: SupabaseClient, openai: OpenAI);
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
    createCulturalCelebrationTemplates(celebrations: string[], culturalCommunityInput?: {
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
    private getNarrativeStructureForCulture;
    private getOralTraditionPattern;
    private getIndigenousMethod;
    private buildNarrativeStructurePrompt;
    private buildMythologyIntegrationPrompt;
    private buildCelebrationTemplatePrompt;
    private buildCommunityDocumentationPrompt;
    private buildTraditionDocumentationPrompt;
    private buildCulturalValidationPrompt;
}
//# sourceMappingURL=CulturalStorytellingPreservation.d.ts.map
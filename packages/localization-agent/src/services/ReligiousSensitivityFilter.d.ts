import OpenAI from 'openai';
import { ReligiousSensitivityCheck, ReligiousSensitivityResult } from '../types';
export declare class ReligiousSensitivityFilter {
    private openai;
    constructor(openai: OpenAI);
    checkSensitivity(check: ReligiousSensitivityCheck): Promise<ReligiousSensitivityResult>;
    getReligiousGuidelines(religiousContext: string[]): Promise<{
        [religion: string]: {
            sensitiveTopics: string[];
            appropriateAlternatives: {
                [topic: string]: string[];
            };
            respectfulLanguage: string[];
            celebrationsToInclude: string[];
            celebrationsToAvoid: string[];
        };
    }>;
    generateReligiouslyInclusiveContent(originalContent: string, religiousContexts: string[]): Promise<{
        inclusiveContent: string;
        adaptations: string[];
        respectfulElements: string[];
    }>;
    private buildSensitivityCheckPrompt;
    /**
     * Get interfaith dialogue suggestions for stories involving multiple religions
     */
    getInterfaithDialogueSuggestions(religions: string[], storyContext: any): Promise<{
        commonValues: string[];
        respectfulInteractions: string[];
        educationalOpportunities: string[];
        potentialConflicts: string[];
        resolutionStrategies: string[];
    }>;
}
//# sourceMappingURL=ReligiousSensitivityFilter.d.ts.map
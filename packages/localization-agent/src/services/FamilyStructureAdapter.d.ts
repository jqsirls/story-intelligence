import OpenAI from 'openai';
import { FamilyStructureAdaptation, FamilyStructureAdaptationResult, FamilyStructure } from '../types';
export declare class FamilyStructureAdapter {
    private openai;
    constructor(openai: OpenAI);
    adaptContent(adaptation: FamilyStructureAdaptation): Promise<FamilyStructureAdaptationResult>;
    getFamilyStructureVariations(): Promise<{
        [structureType: string]: {
            description: string;
            commonTerms: FamilyStructure;
            culturalConsiderations: string[];
            storytellingApproaches: string[];
        };
    }>;
    generateFamilyInclusiveLanguage(originalText: string, targetFamilyStructures: string[]): Promise<{
        inclusiveText: string;
        adaptations: string[];
        familyTermsUsed: string[];
    }>;
    private buildFamilyAdaptationPrompt;
    /**
     * Validate family representation for cultural appropriateness
     */
    validateFamilyRepresentation(familyStructure: FamilyStructure, culturalContext: string, storyContent: string): Promise<{
        isAppropriate: boolean;
        concerns: string[];
        suggestions: string[];
        culturalNotes: string[];
    }>;
}
//# sourceMappingURL=FamilyStructureAdapter.d.ts.map
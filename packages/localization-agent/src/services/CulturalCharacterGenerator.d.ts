import OpenAI from 'openai';
import { CulturalCharacterGenerationRequest, CulturalCharacterGenerationResponse, CulturalCharacterTrait } from '../types';
export declare class CulturalCharacterGenerator {
    private openai;
    constructor(openai: OpenAI);
    generateCharacter(request: CulturalCharacterGenerationRequest): Promise<CulturalCharacterGenerationResponse>;
    getCulturalCharacterTraits(culturalBackground: string[]): Promise<CulturalCharacterTrait[]>;
    validateCulturalRepresentation(character: any, culturalBackground: string[]): Promise<{
        isRespectful: boolean;
        concerns: string[];
        suggestions: string[];
    }>;
    private buildCulturalCharacterPrompt;
    private getCulturalVariationsForTrait;
    /**
     * Generate culturally appropriate character names
     */
    generateCulturalNames(culturalBackground: string[], gender?: string, meaningPreference?: string): Promise<{
        suggestions: Array<{
            name: string;
            meaning: string;
            pronunciation: string;
            culturalSignificance: string;
        }>;
    }>;
}
//# sourceMappingURL=CulturalCharacterGenerator.d.ts.map
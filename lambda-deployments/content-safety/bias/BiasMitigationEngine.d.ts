import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest, BiasDetectionResult } from '../types';
export interface BiasMitigationResult {
    mitigatedContent: string;
    mitigationStrategies: string[];
    remainingBiasScore: number;
    mitigationSuccess: boolean;
    corrections: Array<{
        originalText: string;
        correctedText: string;
        biasType: string;
        explanation: string;
    }>;
}
export declare class BiasMitigationEngine {
    private openai;
    private logger;
    constructor(openai: OpenAI, logger: Logger);
    initialize(): Promise<void>;
    mitigateBias(content: string, biasDetectionResult: BiasDetectionResult, request: ContentSafetyRequest): Promise<BiasMitigationResult>;
    private applyBiasMitigation;
    private mitigateGenderBias;
    private mitigateRacialBias;
    private mitigateAgeBias;
    private migrateCulturalBias;
    private mitigateAbilityBias;
    private mitigateClassBias;
    private mitigateGenericBias;
    private improveRepresentation;
    private enhanceCharacterDiversity;
    private addressProblematicThemes;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=BiasMitigationEngine.d.ts.map
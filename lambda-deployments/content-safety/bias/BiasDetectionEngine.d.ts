import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest, BiasDetectionResult } from '../types';
export declare class BiasDetectionEngine {
    private openai;
    private logger;
    constructor(openai: OpenAI, logger: Logger);
    initialize(): Promise<void>;
    detectBias(content: string, request: ContentSafetyRequest): Promise<BiasDetectionResult>;
    private detectDemographicBias;
    private detectGenderBias;
    private detectCulturalBias;
    private detectAbilityBias;
    private detectSocioeconomicBias;
    private analyzeRepresentation;
    private simpleRepresentationAnalysis;
    private calculateOverallBiasScore;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=BiasDetectionEngine.d.ts.map
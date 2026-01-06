import OpenAI from 'openai';
import { Logger } from 'winston';
import { AlternativeContentRequest, AlternativeContentResult } from '../types';
export declare class AlternativeContentGenerator {
    private openai;
    private logger;
    private enabled;
    constructor(openai: OpenAI, logger: Logger, enabled?: boolean);
    generateAlternative(request: AlternativeContentRequest): Promise<AlternativeContentResult>;
    private createAlternativeContentPrompt;
    private analyzeAlternativeContent;
    private calculateContentSimilarity;
    private checkCategoryImprovement;
    private generateRuleBasedAlternative;
    private generateGenericSafeContent;
    batchGenerateAlternatives(requests: AlternativeContentRequest[]): Promise<AlternativeContentResult[]>;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=AlternativeContentGenerator.d.ts.map
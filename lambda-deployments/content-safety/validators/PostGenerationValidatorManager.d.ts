import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest, PostGenerationValidationResult } from '../types';
export declare class PostGenerationValidatorManager {
    private validators;
    private openai;
    private logger;
    constructor(openai: OpenAI, logger: Logger);
    initialize(): Promise<void>;
    runValidators(content: string, request: ContentSafetyRequest): Promise<PostGenerationValidationResult[]>;
    private validateBasicContent;
    private validateWithOpenAI;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=PostGenerationValidatorManager.d.ts.map
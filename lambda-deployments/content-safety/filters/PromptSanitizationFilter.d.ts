import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest, PreGenerationFilter, PreGenerationFilterResult } from '../types';
export declare class PromptSanitizationFilter implements PreGenerationFilter {
    name: string;
    priority: number;
    enabled: boolean;
    private openai;
    private logger;
    constructor(openai: OpenAI, logger: Logger);
    filter(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
}
//# sourceMappingURL=PromptSanitizationFilter.d.ts.map
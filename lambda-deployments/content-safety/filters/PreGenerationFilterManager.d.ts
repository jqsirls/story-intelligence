import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest, PreGenerationFilterResult } from '../types';
export declare class PreGenerationFilterManager {
    private filters;
    private openai;
    private logger;
    constructor(openai: OpenAI, logger: Logger);
    initialize(): Promise<void>;
    runFilters(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
    healthCheck(): Promise<boolean>;
    getFilterStatus(): Array<{
        name: string;
        enabled: boolean;
        priority: number;
    }>;
    enableFilter(filterName: string): void;
    disableFilter(filterName: string): void;
}
//# sourceMappingURL=PreGenerationFilterManager.d.ts.map
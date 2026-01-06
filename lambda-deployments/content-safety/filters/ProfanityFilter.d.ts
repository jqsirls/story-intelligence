import { Logger } from 'winston';
import { ContentSafetyRequest, PreGenerationFilter, PreGenerationFilterResult } from '../types';
export declare class ProfanityFilter implements PreGenerationFilter {
    name: string;
    priority: number;
    enabled: boolean;
    private logger;
    private profanityList;
    private leetSpeakMap;
    constructor(logger: Logger);
    filter(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
    private initializeProfanityList;
    private initializeLeetSpeakMap;
    private detectDirectProfanity;
    private detectObfuscatedProfanity;
    private detectInappropriateSlang;
    private detectContextualInappropriateness;
    private checkAgeSpecificLanguage;
    private getProfanitySeverity;
}
//# sourceMappingURL=ProfanityFilter.d.ts.map
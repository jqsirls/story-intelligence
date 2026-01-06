import { Logger } from 'winston';
import { ContentSafetyRequest, PreGenerationFilter, PreGenerationFilterResult } from '../types';
export declare class AgeAppropriatenessFilter implements PreGenerationFilter {
    name: string;
    priority: number;
    enabled: boolean;
    private logger;
    constructor(logger: Logger);
    filter(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
    private checkToddlerContent;
    private checkEarlyChildhoodContent;
    private checkMiddleChildhoodContent;
    private checkTeenContent;
    private checkVocabularyComplexity;
    private checkSentenceComplexity;
    private checkEmotionalComplexity;
    private getMaxWordLength;
    private getMaxComplexityRatio;
    private getMaxWordsPerSentence;
    private isComplexWord;
}
//# sourceMappingURL=AgeAppropriatenessFilter.d.ts.map
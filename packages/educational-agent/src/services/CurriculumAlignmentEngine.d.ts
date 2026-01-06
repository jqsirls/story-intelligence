import { StoryTemplate, CurriculumAlignmentRequest, CurriculumAlignmentResponse, GradeLevel, SubjectArea } from '../types';
export declare class CurriculumAlignmentEngine {
    private frameworks;
    private templates;
    constructor();
    /**
     * Analyze story content against curriculum standards
     */
    analyzeAlignment(request: CurriculumAlignmentRequest): Promise<CurriculumAlignmentResponse>;
    /**
     * Get curriculum-aligned story templates
     */
    getAlignedTemplates(gradeLevel: GradeLevel, subjectArea: SubjectArea, learningObjectiveIds?: string[]): Promise<StoryTemplate[]>;
    /**
     * Create custom story template aligned to specific objectives
     */
    createAlignedTemplate(title: string, gradeLevel: GradeLevel, subjectArea: SubjectArea, learningObjectiveIds: string[]): Promise<StoryTemplate>;
    /**
     * Filter content for educational appropriateness
     */
    filterEducationalContent(content: string, gradeLevel: GradeLevel, filterLevel?: 'strict' | 'moderate' | 'standard'): Promise<{
        filtered: string;
        modifications: string[];
    }>;
    /**
     * Track learning objective progress
     */
    trackObjectiveProgress(studentId: string, objectiveId: string, assessmentScore: number, engagementMetrics: any): Promise<void>;
    private getRelevantObjectives;
    private getObjectivesByIds;
    private calculateAlignmentScore;
    private analyzeVocabularyLevel;
    private calculateReadabilityScore;
    private generateModificationSuggestions;
    private generateStoryStructure;
    private generateCharacterGuidelines;
    private generateAssessmentQuestions;
    private generateVocabularyList;
    private gradeToNumeric;
    private getWordComplexity;
    private countSyllables;
    private countWordSyllables;
    private extractStandardKeywords;
    private checkVocabularyAppropriateness;
    private simplifyVocabulary;
    private checkContentComplexity;
    private reduceComplexity;
    private assessEducationalValue;
    private enhanceEducationalValue;
    private performStrictSafetyFilter;
    private generateId;
    private initializeDefaultFrameworks;
}
//# sourceMappingURL=CurriculumAlignmentEngine.d.ts.map
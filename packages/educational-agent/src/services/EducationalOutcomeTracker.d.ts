import { EducationalOutcome, EducationalAssessmentRequest, EducationalAssessmentResponse, GradeLevel, SubjectArea } from '../types';
export interface StudentProgress {
    studentId: string;
    objectiveId: string;
    attempts: number;
    bestScore: number;
    averageScore: number;
    totalTimeSpent: number;
    lastAttemptDate: Date;
    masteryLevel: 'not-started' | 'developing' | 'proficient' | 'advanced';
    trends: {
        improving: boolean;
        stagnant: boolean;
        declining: boolean;
    };
}
export interface ClassroomAnalytics {
    classroomId: string;
    totalStudents: number;
    activeStudents: number;
    averageEngagement: number;
    objectiveProgress: Array<{
        objectiveId: string;
        studentsStarted: number;
        studentsCompleted: number;
        averageScore: number;
        averageTime: number;
    }>;
    strugglingStudents: string[];
    exceedingStudents: string[];
    recommendedInterventions: string[];
}
export declare class EducationalOutcomeTracker {
    private outcomes;
    private studentProgress;
    /**
     * Record educational outcome for a student
     */
    recordOutcome(outcome: EducationalOutcome): Promise<void>;
    /**
     * Assess student responses and generate educational feedback
     */
    assessStudent(request: EducationalAssessmentRequest): Promise<EducationalAssessmentResponse>;
    /**
     * Get student progress for specific learning objectives
     */
    getStudentProgress(studentId: string, objectiveIds?: string[]): Promise<StudentProgress[]>;
    /**
     * Generate classroom analytics and insights
     */
    generateClassroomAnalytics(classroomId: string, studentIds: string[], timeRange?: {
        start: Date;
        end: Date;
    }): Promise<ClassroomAnalytics>;
    /**
     * Generate learning objective mastery report
     */
    generateMasteryReport(studentId: string, gradeLevel: GradeLevel, subjectArea: SubjectArea): Promise<{
        overallMastery: number;
        objectiveMastery: Array<{
            objectiveId: string;
            masteryLevel: string;
            score: number;
            timeSpent: number;
            recommendations: string[];
        }>;
        strengths: string[];
        areasForImprovement: string[];
        nextObjectives: string[];
    }>;
    private updateStudentProgress;
    private calculateOverallScore;
    private analyzeObjectivePerformance;
    private generateRecommendations;
    private determineNextSteps;
    private calculateEngagementScore;
    private calculateAverageScore;
    private generateInterventionRecommendations;
    private calculateNewAverage;
    private determineMasteryLevel;
    private analyzeTrends;
    private generateObjectiveRecommendations;
    private calculateOverallMastery;
    private identifyStrengths;
    private identifyAreasForImprovement;
    private suggestNextObjectives;
}
//# sourceMappingURL=EducationalOutcomeTracker.d.ts.map
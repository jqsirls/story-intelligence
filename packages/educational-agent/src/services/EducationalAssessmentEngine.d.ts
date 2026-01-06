import { GradeLevel, SubjectArea } from '../types';
export interface AutomatedAssessment {
    id: string;
    title: string;
    description: string;
    classroomId: string;
    createdBy: string;
    learningObjectives: string[];
    gradeLevel: GradeLevel;
    subjectArea: SubjectArea;
    assessmentType: 'formative' | 'summative' | 'diagnostic' | 'adaptive';
    questions: AssessmentQuestion[];
    rubric: AssessmentRubric;
    timeLimit?: number;
    attempts: number;
    adaptiveSettings?: AdaptiveAssessmentSettings;
    differentiationRules: DifferentiationRule[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AssessmentQuestion {
    id: string;
    type: 'multiple-choice' | 'open-ended' | 'true-false' | 'matching' | 'ordering' | 'story-based';
    question: string;
    options?: string[];
    correctAnswer?: string | string[];
    points: number;
    difficulty: 'easy' | 'medium' | 'hard';
    learningObjectiveId: string;
    hints?: string[];
    explanation?: string;
    adaptiveMetadata?: {
        prerequisiteQuestions: string[];
        followUpQuestions: string[];
        difficultyAdjustment: number;
    };
}
export interface AssessmentRubric {
    id: string;
    name: string;
    description: string;
    criteria: RubricCriterion[];
    scoringMethod: 'points' | 'percentage' | 'letter-grade' | 'standards-based';
    passingThreshold: number;
}
export interface RubricCriterion {
    id: string;
    name: string;
    description: string;
    weight: number;
    levels: RubricLevel[];
}
export interface RubricLevel {
    level: string;
    description: string;
    points: number;
    indicators: string[];
}
export interface AdaptiveAssessmentSettings {
    enabled: boolean;
    initialDifficulty: 'easy' | 'medium' | 'hard';
    difficultyAdjustmentThreshold: number;
    maxDifficultyIncrease: number;
    maxDifficultyDecrease: number;
    terminationCriteria: {
        confidenceLevel: number;
        maxQuestions: number;
        minQuestions: number;
    };
}
export interface DifferentiationRule {
    id: string;
    condition: DifferentiationCondition;
    modification: DifferentiationModification;
    targetStudents: string[];
    isActive: boolean;
}
export interface DifferentiationCondition {
    type: 'learning-style' | 'reading-level' | 'special-needs' | 'performance-history' | 'engagement-level';
    criteria: any;
    operator: 'equals' | 'greater-than' | 'less-than' | 'contains' | 'not-contains';
    value: any;
}
export interface DifferentiationModification {
    type: 'question-format' | 'time-extension' | 'hint-availability' | 'content-simplification' | 'visual-aids';
    parameters: any;
    description: string;
}
export interface AssessmentAttempt {
    id: string;
    assessmentId: string;
    studentId: string;
    startedAt: Date;
    completedAt?: Date;
    responses: AssessmentResponse[];
    score: number;
    percentage: number;
    grade: string;
    timeSpent: number;
    adaptiveData?: AdaptiveAttemptData;
    feedback: AssessmentFeedback;
    status: 'in-progress' | 'completed' | 'abandoned' | 'expired';
}
export interface AssessmentResponse {
    questionId: string;
    answer: string | string[];
    isCorrect: boolean;
    points: number;
    timeSpent: number;
    hintsUsed: number;
    attempts: number;
    confidence?: number;
}
export interface AdaptiveAttemptData {
    difficultyProgression: Array<{
        questionId: string;
        difficulty: string;
        performance: number;
    }>;
    abilityEstimate: number;
    confidenceInterval: [number, number];
    terminationReason: 'confidence-reached' | 'max-questions' | 'time-limit' | 'manual';
}
export interface AssessmentFeedback {
    overall: string;
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
    nextSteps: string[];
    questionFeedback: Array<{
        questionId: string;
        feedback: string;
        explanation?: string;
    }>;
}
export interface ProgressReport {
    studentId: string;
    studentName: string;
    classroomId: string;
    reportPeriod: {
        start: Date;
        end: Date;
    };
    overallProgress: {
        averageScore: number;
        improvementTrend: 'improving' | 'stable' | 'declining';
        masteryLevel: 'below-basic' | 'basic' | 'proficient' | 'advanced';
        effortLevel: 'low' | 'medium' | 'high';
    };
    learningObjectiveProgress: LearningObjectiveProgress[];
    assessmentHistory: AssessmentSummary[];
    recommendations: string[];
    parentNotes: string[];
    teacherNotes: string[];
    generatedAt: Date;
}
export interface LearningObjectiveProgress {
    objectiveId: string;
    objectiveName: string;
    currentMastery: number;
    targetMastery: number;
    progress: 'not-started' | 'developing' | 'approaching' | 'proficient' | 'advanced';
    assessmentCount: number;
    lastAssessmentDate: Date;
    trend: 'improving' | 'stable' | 'declining';
    timeSpent: number;
}
export interface AssessmentSummary {
    assessmentId: string;
    assessmentTitle: string;
    completedAt: Date;
    score: number;
    percentage: number;
    grade: string;
    timeSpent: number;
    attempts: number;
}
export interface StandardsBasedGrading {
    enabled: boolean;
    standards: GradingStandard[];
    reportingPeriods: ReportingPeriod[];
    gradingScale: GradingScale;
    masteryThresholds: MasteryThreshold[];
}
export interface GradingStandard {
    id: string;
    code: string;
    description: string;
    gradeLevel: GradeLevel;
    subjectArea: SubjectArea;
    learningObjectives: string[];
    weight: number;
}
export interface ReportingPeriod {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
}
export interface GradingScale {
    type: 'points' | 'percentage' | 'letter' | 'standards-based';
    levels: GradeLevel[];
}
export interface GradeLevel {
    level: string;
    description: string;
    minScore: number;
    maxScore: number;
    color?: string;
}
export interface MasteryThreshold {
    level: 'not-started' | 'developing' | 'approaching' | 'proficient' | 'advanced';
    minScore: number;
    description: string;
    color: string;
}
export interface StudentPortfolio {
    studentId: string;
    studentName: string;
    classroomId: string;
    artifacts: PortfolioArtifact[];
    reflections: StudentReflection[];
    goals: LearningGoal[];
    achievements: Achievement[];
    createdAt: Date;
    updatedAt: Date;
}
export interface PortfolioArtifact {
    id: string;
    type: 'story' | 'assessment' | 'project' | 'reflection' | 'peer-feedback';
    title: string;
    description: string;
    content: any;
    learningObjectives: string[];
    dateCreated: Date;
    tags: string[];
    isPublic: boolean;
    teacherComments?: string;
    peerComments?: string[];
}
export interface StudentReflection {
    id: string;
    prompt: string;
    response: string;
    learningObjectives: string[];
    dateCreated: Date;
    teacherFeedback?: string;
}
export interface LearningGoal {
    id: string;
    description: string;
    targetDate: Date;
    status: 'not-started' | 'in-progress' | 'achieved' | 'revised';
    progress: number;
    evidence: string[];
    createdAt: Date;
    updatedAt: Date;
}
export interface Achievement {
    id: string;
    title: string;
    description: string;
    badgeUrl?: string;
    earnedAt: Date;
    criteria: string[];
    evidence: string[];
}
export interface DataExportRequest {
    requestId: string;
    requestedBy: string;
    exportType: 'student-data' | 'classroom-data' | 'assessment-results' | 'progress-reports' | 'portfolio';
    filters: {
        studentIds?: string[];
        classroomIds?: string[];
        dateRange?: {
            start: Date;
            end: Date;
        };
        assessmentIds?: string[];
        includePersonalData?: boolean;
    };
    format: 'csv' | 'json' | 'pdf' | 'excel';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    downloadUrl?: string;
    createdAt: Date;
    completedAt?: Date;
}
export declare class EducationalAssessmentEngine {
    private assessments;
    private attempts;
    private progressReports;
    private portfolios;
    private standardsBasedGrading;
    constructor();
    /**
     * Create automated assessment aligned with learning objectives
     */
    createAutomatedAssessment(title: string, description: string, classroomId: string, createdBy: string, learningObjectives: string[], gradeLevel: GradeLevel, subjectArea: SubjectArea, assessmentType?: AutomatedAssessment['assessmentType']): Promise<AutomatedAssessment>;
    /**
     * Generate differentiated assessment based on student needs
     */
    generateDifferentiatedAssessment(baseAssessmentId: string, studentId: string, studentProfile: StudentProfile): Promise<AutomatedAssessment>;
    /**
     * Start assessment attempt with adaptive capabilities
     */
    startAssessmentAttempt(assessmentId: string, studentId: string, adaptiveMode?: boolean): Promise<AssessmentAttempt>;
    /**
     * Submit assessment response with immediate feedback
     */
    submitAssessmentResponse(attemptId: string, questionId: string, answer: string | string[], timeSpent: number, confidence?: number): Promise<{
        isCorrect: boolean;
        points: number;
        feedback: string;
        nextQuestion?: AssessmentQuestion;
        isComplete: boolean;
    }>;
    /**
     * Generate comprehensive progress report
     */
    generateProgressReport(studentId: string, classroomId: string, reportPeriod: {
        start: Date;
        end: Date;
    }): Promise<ProgressReport>;
    /**
     * Implement standards-based grading integration
     */
    calculateStandardsBasedGrade(studentId: string, standardId: string, reportingPeriodId: string): Promise<{
        standard: GradingStandard;
        currentLevel: string;
        evidence: AssessmentEvidence[];
        trend: 'improving' | 'stable' | 'declining';
        recommendations: string[];
    }>;
    /**
     * Create and manage student portfolios
     */
    createStudentPortfolio(studentId: string, classroomId: string): Promise<StudentPortfolio>;
    /**
     * Add artifact to student portfolio
     */
    addPortfolioArtifact(studentId: string, artifact: Omit<PortfolioArtifact, 'id' | 'dateCreated'>): Promise<PortfolioArtifact>;
    /**
     * Export data for school information systems
     */
    exportDataForSIS(exportRequest: Omit<DataExportRequest, 'requestId' | 'status' | 'createdAt'>): Promise<DataExportRequest>;
    private initializeStandardsBasedGrading;
    private generateDefaultRubric;
    private generateDefaultDifferentiationRules;
    private generateQuestionsForObjectives;
    private generateQuestionsForObjective;
    private applyDifferentiation;
    private evaluateDifferentiationCondition;
    private applyDifferentiationModification;
    private simplifyVocabulary;
    private findAttempt;
    private evaluateResponse;
    private generateImmediateFeedback;
    private updateAdaptiveAssessment;
    private updateAbilityEstimate;
    private hasReachedConfidence;
    private selectAdaptiveQuestion;
    private completeAssessment;
    private calculateGrade;
    private generateComprehensiveFeedback;
    private calculateImprovementTrend;
    private determineMasteryLevel;
    private calculateLearningObjectiveProgress;
    private calculateEffortLevel;
    private generateProgressRecommendations;
    private getStudentName;
    private collectAssessmentEvidence;
    private calculateMasteryLevel;
    private calculateStandardTrend;
    private generateStandardRecommendations;
    private processDataExport;
    private generateId;
}
interface StudentProfile {
    id: string;
    name: string;
    gradeLevel: GradeLevel;
    readingLevel: 'below' | 'at' | 'above';
    learningStyle: {
        visualLearner: boolean;
        auditoryLearner: boolean;
        kinestheticLearner: boolean;
    };
    specialNeeds: string[];
    accommodations: string[];
}
interface AssessmentEvidence {
    assessmentId: string;
    score: number;
    date: Date;
    learningObjectives: string[];
}
export {};
//# sourceMappingURL=EducationalAssessmentEngine.d.ts.map
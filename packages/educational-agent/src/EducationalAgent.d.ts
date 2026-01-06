import { CurriculumAlignmentRequest, CurriculumAlignmentResponse, EducationalAssessmentRequest, EducationalAssessmentResponse, GradeLevel, SubjectArea, StoryTemplate, EducationalOutcome, Classroom } from './types';
export interface EducationalAgentConfig {
    enableCurriculumAlignment: boolean;
    enableOutcomeTracking: boolean;
    enableClassroomManagement: boolean;
    defaultContentFiltering: 'strict' | 'moderate' | 'standard';
    maxStudentsPerClassroom: number;
    maxGroupSessionParticipants: number;
}
export declare class EducationalAgent {
    private curriculumEngine;
    private outcomeTracker;
    private classroomManager;
    private collaborativeEngine;
    private assessmentEngine;
    private config;
    constructor(config?: Partial<EducationalAgentConfig>);
    /**
     * Analyze story content alignment with curriculum standards
     */
    analyzeStoryAlignment(request: CurriculumAlignmentRequest): Promise<CurriculumAlignmentResponse>;
    /**
     * Get curriculum-aligned story templates
     */
    getAlignedStoryTemplates(gradeLevel: GradeLevel, subjectArea: SubjectArea, learningObjectiveIds?: string[]): Promise<StoryTemplate[]>;
    /**
     * Create custom story template aligned to specific learning objectives
     */
    createCustomAlignedTemplate(title: string, gradeLevel: GradeLevel, subjectArea: SubjectArea, learningObjectiveIds: string[]): Promise<StoryTemplate>;
    /**
     * Filter and enhance content for educational appropriateness
     */
    filterEducationalContent(content: string, gradeLevel: GradeLevel, filterLevel?: 'strict' | 'moderate' | 'standard'): Promise<{
        filtered: string;
        modifications: string[];
    }>;
    /**
     * Record educational outcome for a student
     */
    recordStudentOutcome(outcome: EducationalOutcome): Promise<void>;
    /**
     * Assess student responses and provide educational feedback
     */
    assessStudentPerformance(request: EducationalAssessmentRequest): Promise<EducationalAssessmentResponse>;
    /**
     * Get comprehensive student progress report
     */
    getStudentProgressReport(studentId: string, gradeLevel: GradeLevel, subjectArea: SubjectArea): Promise<{
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
    /**
     * Create a new classroom
     */
    createClassroom(name: string, teacherId: string, schoolId: string, gradeLevel: GradeLevel, subject: SubjectArea, settings?: Partial<Classroom['settings']>): Promise<Classroom>;
    /**
     * Bulk create student accounts for a classroom
     */
    bulkCreateStudents(classroomId: string, students: Array<{
        firstName: string;
        lastName: string;
        parentEmail?: string;
        specialNeeds?: string[];
        learningPreferences?: any;
    }>, options?: {
        sendWelcomeEmails?: boolean;
        generatePasswords?: boolean;
    }): Promise<{
        created: any[];
        failed: Array<{
            student: any;
            error: string;
        }>;
        credentials?: Array<{
            studentId: string;
            username: string;
            password: string;
        }>;
    }>;
    /**
     * Generate teacher dashboard with classroom insights
     */
    generateTeacherDashboard(teacherId: string, classroomId?: string): Promise<any>;
    /**
     * Create group storytelling session
     */
    createGroupStorytellingSession(classroomId: string, title: string, description: string, facilitatorId: string, storyPrompt: string, learningObjectives: string[], sessionType?: 'collaborative' | 'turn-based' | 'guided', maxParticipants?: number, scheduledStart?: Date): Promise<any>;
    /**
     * Send communication to parent
     */
    sendParentCommunication(studentId: string, teacherId: string, subject: string, message: string, type?: 'progress_update' | 'concern' | 'achievement' | 'general' | 'assignment', priority?: 'low' | 'medium' | 'high' | 'urgent', attachments?: Array<{
        filename: string;
        url: string;
        type: 'story' | 'assessment' | 'report' | 'image';
    }>): Promise<any>;
    /**
     * Get classroom engagement metrics
     */
    getClassroomEngagementMetrics(classroomId: string): Promise<{
        overallEngagement: number;
        studentEngagement: Array<{
            studentId: string;
            studentName: string;
            engagementScore: number;
            lastActivity: Date;
            storiesCompleted: number;
            averageScore: number;
        }>;
        trends: {
            weeklyEngagement: number[];
            monthlyCompletion: number[];
        };
    }>;
    /**
     * Apply enhanced content filtering for educational environments
     */
    applyClassroomContentFilter(content: string, classroomId: string): Promise<{
        filtered: string;
        modifications: string[];
    }>;
    /**
     * Complete educational story workflow: alignment, creation, assessment
     */
    processEducationalStory(storyContent: string, studentId: string, classroomId: string, learningObjectiveIds: string[]): Promise<{
        alignmentAnalysis: CurriculumAlignmentResponse;
        filteredContent: {
            filtered: string;
            modifications: string[];
        };
        assessmentReady: boolean;
        recommendations: string[];
    }>;
    /**
     * Generate comprehensive classroom report
     */
    generateClassroomReport(classroomId: string, timeRange: {
        start: Date;
        end: Date;
    }): Promise<{
        classroomSummary: any;
        engagementMetrics: any;
        studentProgress: Array<{
            studentId: string;
            studentName: string;
            progressSummary: any;
        }>;
        curriculumCoverage: {
            objectivesCovered: number;
            objectivesTotal: number;
            coveragePercentage: number;
            gaps: string[];
        };
        recommendations: string[];
    }>;
    /**
     * Import students from CSV with comprehensive validation and error handling
     */
    importStudentsFromCSV(classroomId: string, csvData: string, options?: {
        hasHeaders?: boolean;
        skipDuplicates?: boolean;
        sendWelcomeEmails?: boolean;
        generatePasswords?: boolean;
    }): Promise<{
        imported: any[];
        failed: Array<{
            row: number;
            data: any;
            error: string;
        }>;
        summary: {
            totalRows: number;
            successfulImports: number;
            failedImports: number;
            duplicates: number;
        };
    }>;
    /**
     * Get real-time engagement metrics with alerts and notifications
     */
    getRealTimeEngagementMetrics(classroomId: string): Promise<{
        classroomId: string;
        timestamp: Date;
        activeStudents: number;
        averageEngagement: number;
        currentActivities: Array<{
            activityType: 'story-creation' | 'group-session' | 'assessment' | 'reading';
            participantCount: number;
            averageScore?: number;
        }>;
        alerts: Array<{
            type: 'low-engagement' | 'struggling-student' | 'technical-issue' | 'behavioral-concern';
            studentId?: string;
            message: string;
            severity: 'low' | 'medium' | 'high';
        }>;
    }>;
    /**
     * Create curriculum standards mapping for alignment tracking
     */
    createCurriculumMapping(classroomId: string, standardId: string, standardName: string, description: string, alignedObjectives: string[]): Promise<{
        standardId: string;
        standardName: string;
        description: string;
        gradeLevel: GradeLevel;
        subjectArea: SubjectArea;
        alignedObjectives: string[];
    }>;
    /**
     * Create and track assignments with progress monitoring
     */
    createAssignment(classroomId: string, title: string, description: string, assignedBy: string, assignedTo: string[], dueDate: Date, learningObjectives: string[], storyTemplateId?: string): Promise<{
        id: string;
        classroomId: string;
        title: string;
        description: string;
        assignedBy: string;
        assignedTo: string[];
        dueDate: Date;
        storyTemplateId?: string;
        learningObjectives: string[];
        status: 'draft' | 'assigned' | 'in-progress' | 'completed' | 'overdue';
        submissions: Array<{
            studentId: string;
            submittedAt: Date;
            storyId: string;
            score?: number;
            feedback?: string;
        }>;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Track assignment progress and completion rates
     */
    getAssignmentProgress(assignmentId: string): Promise<{
        assignment: any;
        completionRate: number;
        averageScore: number;
        onTimeSubmissions: number;
        lateSubmissions: number;
        pendingSubmissions: string[];
    }>;
    /**
     * Create special needs accommodation system
     */
    createSpecialNeedsAccommodation(studentId: string, accommodationType: 'visual' | 'auditory' | 'motor' | 'cognitive' | 'behavioral' | 'communication', description: string, implementation: string, tools: string[], createdBy: string, reviewDate: Date): Promise<{
        id: string;
        studentId: string;
        accommodationType: 'visual' | 'auditory' | 'motor' | 'cognitive' | 'behavioral' | 'communication';
        description: string;
        implementation: string;
        tools: string[];
        effectiveness: 'low' | 'medium' | 'high';
        reviewDate: Date;
        isActive: boolean;
        createdBy: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    /**
     * Update accommodation effectiveness based on teacher observation
     */
    updateAccommodationEffectiveness(accommodationId: string, effectiveness: 'low' | 'medium' | 'high', notes?: string): Promise<void>;
    /**
     * Create parent-teacher communication portal
     */
    createParentTeacherPortal(classroomId: string): Promise<{
        portalId: string;
        accessUrl: string;
        features: string[];
        parentAccess: Array<{
            parentEmail: string;
            studentIds: string[];
            accessToken: string;
        }>;
    }>;
    /**
     * Generate enhanced teacher dashboard with comprehensive metrics
     */
    generateEnhancedTeacherDashboard(teacherId: string, classroomId?: string): Promise<any>;
    /**
     * Create a collaborative storytelling session with role assignments
     */
    createCollaborativeStorySession(classroomId: string, title: string, description: string, facilitatorId: string, storyPrompt: string, learningObjectives: string[], sessionType?: 'collaborative' | 'turn-based' | 'guided', maxParticipants?: number, scheduledStart?: Date): Promise<any>;
    /**
     * Add participants to collaborative session with role assignments
     */
    addParticipantsWithRoles(sessionId: string, studentIds: string[], roleAssignmentStrategy?: 'random' | 'skill-based' | 'preference-based' | 'manual'): Promise<{
        added: any[];
        failed: Array<{
            studentId: string;
            reason: string;
        }>;
    }>;
    /**
     * Handle story contribution with conflict detection
     */
    addStoryContribution(sessionId: string, studentId: string, content: string, segmentType: 'introduction' | 'character-development' | 'plot-advancement' | 'conflict' | 'resolution' | 'dialogue'): Promise<{
        segment: any;
        conflicts: any[];
        requiresApproval: boolean;
    }>;
    /**
     * Provide peer feedback on story contributions
     */
    providePeerFeedback(sessionId: string, reviewerId: string, segmentId: string, feedbackType: 'suggestion' | 'praise' | 'concern' | 'question', content: string): Promise<any>;
    /**
     * Resolve conflicts in collaborative storytelling
     */
    resolveCollaborativeConflict(sessionId: string, conflictId: string, resolutionStrategy: 'voting' | 'discussion' | 'compromise' | 'facilitator-decision' | 'alternative-versions', initiatorId: string, resolutionData: any): Promise<any>;
    /**
     * Generate group presentation from collaborative story
     */
    generateGroupPresentation(sessionId: string, presentationConfig: {
        enabled: boolean;
        format: 'live-reading' | 'recorded-video' | 'illustrated-book' | 'interactive-presentation';
        audienceType: 'classmates' | 'parents' | 'school-community' | 'public';
        preparationTime: number;
        presentationTime: number;
        feedbackCollection: boolean;
    }): Promise<any>;
    /**
     * Assess collaborative storytelling work
     */
    assessCollaborativeWork(sessionId: string, assessmentType?: 'individual' | 'group' | 'peer' | 'self'): Promise<any>;
    /**
     * Create automated assessment aligned with learning objectives
     */
    createAutomatedAssessment(title: string, description: string, classroomId: string, createdBy: string, learningObjectives: string[], gradeLevel: GradeLevel, subjectArea: SubjectArea, assessmentType?: 'formative' | 'summative' | 'diagnostic' | 'adaptive'): Promise<any>;
    /**
     * Generate differentiated assessment for individual student needs
     */
    generateDifferentiatedAssessment(baseAssessmentId: string, studentId: string, studentProfile: {
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
    }): Promise<any>;
    /**
     * Start assessment attempt with adaptive capabilities
     */
    startAssessmentAttempt(assessmentId: string, studentId: string, adaptiveMode?: boolean): Promise<any>;
    /**
     * Submit assessment response with immediate feedback
     */
    submitAssessmentResponse(attemptId: string, questionId: string, answer: string | string[], timeSpent: number, confidence?: number): Promise<{
        isCorrect: boolean;
        points: number;
        feedback: string;
        nextQuestion?: any;
        isComplete: boolean;
    }>;
    /**
     * Generate comprehensive progress report for student
     */
    generateProgressReport(studentId: string, classroomId: string, reportPeriod: {
        start: Date;
        end: Date;
    }): Promise<any>;
    /**
     * Calculate standards-based grade for student
     */
    calculateStandardsBasedGrade(studentId: string, standardId: string, reportingPeriodId: string): Promise<{
        standard: any;
        currentLevel: string;
        evidence: any[];
        trend: 'improving' | 'stable' | 'declining';
        recommendations: string[];
    }>;
    /**
     * Create and manage student portfolio
     */
    createStudentPortfolio(studentId: string, classroomId: string): Promise<any>;
    /**
     * Add artifact to student portfolio
     */
    addPortfolioArtifact(studentId: string, artifact: {
        type: 'story' | 'assessment' | 'project' | 'reflection' | 'peer-feedback';
        title: string;
        description: string;
        content: any;
        learningObjectives: string[];
        tags: string[];
        isPublic: boolean;
        teacherComments?: string;
        peerComments?: string[];
    }): Promise<any>;
    /**
     * Export data for school information systems
     */
    exportDataForSIS(exportRequest: {
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
    }): Promise<any>;
    /**
     * Get classroom information
     */
    getClassroomInfo(classroomId: string): Promise<Classroom | null>;
    /**
     * List all classrooms for a teacher
     */
    listClassroomsForTeacher(teacherId: string): Promise<Classroom[]>;
    /**
     * Get student information
     */
    getStudentInfo(studentId: string): Promise<any>;
    private generateIntegratedRecommendations;
}
//# sourceMappingURL=EducationalAgent.d.ts.map
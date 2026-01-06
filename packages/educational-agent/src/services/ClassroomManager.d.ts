import { Classroom, GradeLevel, SubjectArea } from '../types';
export interface Student {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    gradeLevel: GradeLevel;
    parentEmail?: string;
    specialNeeds?: string[];
    learningPreferences?: {
        visualLearner: boolean;
        auditoryLearner: boolean;
        kinestheticLearner: boolean;
        readingLevel: 'below' | 'at' | 'above';
        attentionSpan: 'short' | 'medium' | 'long';
    };
    enrollmentDate: Date;
    isActive: boolean;
}
export interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    schoolId: string;
    subjects: SubjectArea[];
    gradeLevel: GradeLevel[];
    certifications: string[];
    isActive: boolean;
}
export interface BulkStudentCreationRequest {
    classroomId: string;
    students: Array<{
        firstName: string;
        lastName: string;
        parentEmail?: string;
        specialNeeds?: string[];
        learningPreferences?: Student['learningPreferences'];
    }>;
    sendWelcomeEmails: boolean;
    generatePasswords: boolean;
}
export interface GroupStorytellingSession {
    id: string;
    classroomId: string;
    title: string;
    description: string;
    facilitatorId: string;
    participants: string[];
    storyPrompt: string;
    learningObjectives: string[];
    maxParticipants: number;
    sessionType: 'collaborative' | 'turn-based' | 'guided';
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    scheduledStart: Date;
    actualStart?: Date;
    actualEnd?: Date;
    storyContent?: string;
    participantContributions: Array<{
        studentId: string;
        contribution: string;
        timestamp: Date;
        wordCount: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
export interface ParentTeacherCommunication {
    id: string;
    studentId: string;
    teacherId: string;
    parentEmail: string;
    subject: string;
    message: string;
    type: 'progress_update' | 'concern' | 'achievement' | 'general' | 'assignment';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    attachments?: Array<{
        filename: string;
        url: string;
        type: 'story' | 'assessment' | 'report' | 'image';
    }>;
    parentResponse?: string;
    responseDate?: Date;
    isRead: boolean;
    sentAt: Date;
    createdAt: Date;
}
export interface TeacherDashboardData {
    classroomId: string;
    totalStudents: number;
    activeStudents: number;
    recentActivity: Array<{
        studentId: string;
        studentName: string;
        activity: string;
        timestamp: Date;
        score?: number;
    }>;
    engagementMetrics: {
        averageSessionTime: number;
        storiesCompleted: number;
        averageScore: number;
        participationRate: number;
    };
    strugglingStudents: Array<{
        studentId: string;
        studentName: string;
        concerns: string[];
        lastActivity: Date;
    }>;
    topPerformers: Array<{
        studentId: string;
        studentName: string;
        achievements: string[];
        averageScore: number;
    }>;
    upcomingDeadlines: Array<{
        assignmentId: string;
        title: string;
        dueDate: Date;
        completionRate: number;
    }>;
    parentCommunications: {
        pending: number;
        thisWeek: number;
        needsResponse: number;
    };
}
export interface CSVImportResult {
    imported: Student[];
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
}
export interface CurriculumStandardsMapping {
    standardId: string;
    standardName: string;
    description: string;
    gradeLevel: GradeLevel;
    subjectArea: SubjectArea;
    alignedObjectives: string[];
}
export interface AssignmentTracker {
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
}
export interface SpecialNeedsAccommodation {
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
}
export interface RealTimeEngagementMetrics {
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
}
export declare class ClassroomManager {
    private classrooms;
    private students;
    private teachers;
    private groupSessions;
    private communications;
    private assignments;
    private accommodations;
    private curriculumMappings;
    private outcomeTracker;
    constructor();
    /**
     * Create a new classroom
     */
    createClassroom(name: string, teacherId: string, schoolId: string, gradeLevel: GradeLevel, subject: SubjectArea, settings?: Partial<Classroom['settings']>): Promise<Classroom>;
    /**
     * Get classroom by ID
     */
    getClassroom(classroomId: string): Promise<Classroom | null>;
    /**
     * Get all classrooms for a teacher
     */
    getClassroomsForTeacher(teacherId: string): Promise<Classroom[]>;
    /**
     * Get student by ID
     */
    getStudent(studentId: string): Promise<Student | null>;
    /**
     * Bulk create student accounts
     */
    bulkCreateStudents(request: BulkStudentCreationRequest): Promise<{
        created: Student[];
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
     * Generate teacher dashboard data
     */
    generateTeacherDashboard(teacherId: string, classroomId?: string): Promise<TeacherDashboardData>;
    /**
     * Create group storytelling session
     */
    createGroupStorytellingSession(classroomId: string, title: string, description: string, facilitatorId: string, storyPrompt: string, learningObjectives: string[], sessionType?: GroupStorytellingSession['sessionType'], maxParticipants?: number, scheduledStart?: Date): Promise<GroupStorytellingSession>;
    /**
     * Add students to group storytelling session
     */
    addStudentsToSession(sessionId: string, studentIds: string[]): Promise<{
        added: string[];
        failed: Array<{
            studentId: string;
            reason: string;
        }>;
    }>;
    /**
     * Send communication to parent
     */
    sendParentCommunication(studentId: string, teacherId: string, subject: string, message: string, type?: ParentTeacherCommunication['type'], priority?: ParentTeacherCommunication['priority'], attachments?: ParentTeacherCommunication['attachments']): Promise<ParentTeacherCommunication>;
    /**
     * Apply enhanced content filtering for educational environments
     */
    applyEducationalContentFilter(content: string, classroomId: string): Promise<{
        filtered: string;
        modifications: string[];
    }>;
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
     * Import students from CSV file with comprehensive validation
     */
    importStudentsFromCSV(classroomId: string, csvData: string, options?: {
        hasHeaders?: boolean;
        skipDuplicates?: boolean;
        sendWelcomeEmails?: boolean;
        generatePasswords?: boolean;
    }): Promise<CSVImportResult>;
    /**
     * Get real-time engagement metrics with alerts
     */
    getRealTimeEngagementMetrics(classroomId: string): Promise<RealTimeEngagementMetrics>;
    /**
     * Create and manage curriculum standards alignment
     */
    createCurriculumMapping(classroomId: string, standardId: string, standardName: string, description: string, alignedObjectives: string[]): Promise<CurriculumStandardsMapping>;
    /**
     * Create and track assignments with progress monitoring
     */
    createAssignment(classroomId: string, title: string, description: string, assignedBy: string, assignedTo: string[], dueDate: Date, learningObjectives: string[], storyTemplateId?: string): Promise<AssignmentTracker>;
    /**
     * Track assignment progress and completion
     */
    getAssignmentProgress(assignmentId: string): Promise<{
        assignment: AssignmentTracker;
        completionRate: number;
        averageScore: number;
        onTimeSubmissions: number;
        lateSubmissions: number;
        pendingSubmissions: string[];
    }>;
    /**
     * Create special needs accommodation system
     */
    createSpecialNeedsAccommodation(studentId: string, accommodationType: SpecialNeedsAccommodation['accommodationType'], description: string, implementation: string, tools: string[], createdBy: string, reviewDate: Date): Promise<SpecialNeedsAccommodation>;
    /**
     * Update accommodation effectiveness based on teacher observation
     */
    updateAccommodationEffectiveness(accommodationId: string, effectiveness: SpecialNeedsAccommodation['effectiveness'], notes?: string): Promise<void>;
    /**
     * Enhanced parent-teacher communication portal
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
     * Generate comprehensive teacher dashboard with real-time metrics
     */
    generateEnhancedTeacherDashboard(teacherId: string, classroomId?: string): Promise<TeacherDashboardData & {
        realTimeMetrics: RealTimeEngagementMetrics;
        curriculumCoverage: {
            standardsCovered: number;
            standardsTotal: number;
            coveragePercentage: number;
            upcomingStandards: string[];
        };
        specialNeedsSupport: {
            studentsWithAccommodations: number;
            accommodationTypes: Array<{
                type: string;
                count: number;
                effectiveness: number;
            }>;
        };
        assignmentTracking: {
            activeAssignments: number;
            averageCompletionRate: number;
            overdueAssignments: number;
        };
    }>;
    private getRecentActivity;
    private getStrugglingStudentsDetails;
    private getTopPerformersDetails;
    private getUpcomingDeadlines;
    private getParentCommunicationStats;
    private applyStrictEducationalFilter;
    private applyModerateEducationalFilter;
    private applyStandardEducationalFilter;
    private ensureGradeLevelAppropriate;
    private generateStudentEmail;
    private generateUsername;
    private generateSecurePassword;
    private sendWelcomeEmail;
    private sendEmail;
    private generateId;
    private generateSecureToken;
    private parseCSVLine;
}
//# sourceMappingURL=ClassroomManager.d.ts.map
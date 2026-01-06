"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EducationalAgent = void 0;
const CurriculumAlignmentEngine_1 = require("./services/CurriculumAlignmentEngine");
const EducationalOutcomeTracker_1 = require("./services/EducationalOutcomeTracker");
const ClassroomManager_1 = require("./services/ClassroomManager");
const CollaborativeStorytellingEngine_1 = require("./services/CollaborativeStorytellingEngine");
const EducationalAssessmentEngine_1 = require("./services/EducationalAssessmentEngine");
class EducationalAgent {
    constructor(config = {}) {
        this.config = {
            enableCurriculumAlignment: true,
            enableOutcomeTracking: true,
            enableClassroomManagement: true,
            defaultContentFiltering: 'moderate',
            maxStudentsPerClassroom: 30,
            maxGroupSessionParticipants: 6,
            ...config
        };
        this.curriculumEngine = new CurriculumAlignmentEngine_1.CurriculumAlignmentEngine();
        this.outcomeTracker = new EducationalOutcomeTracker_1.EducationalOutcomeTracker();
        this.classroomManager = new ClassroomManager_1.ClassroomManager();
        this.collaborativeEngine = new CollaborativeStorytellingEngine_1.CollaborativeStorytellingEngine();
        this.assessmentEngine = new EducationalAssessmentEngine_1.EducationalAssessmentEngine();
    }
    // Curriculum Alignment Methods
    /**
     * Analyze story content alignment with curriculum standards
     */
    async analyzeStoryAlignment(request) {
        if (!this.config.enableCurriculumAlignment) {
            throw new Error('Curriculum alignment is disabled');
        }
        return await this.curriculumEngine.analyzeAlignment(request);
    }
    /**
     * Get curriculum-aligned story templates
     */
    async getAlignedStoryTemplates(gradeLevel, subjectArea, learningObjectiveIds) {
        if (!this.config.enableCurriculumAlignment) {
            throw new Error('Curriculum alignment is disabled');
        }
        return await this.curriculumEngine.getAlignedTemplates(gradeLevel, subjectArea, learningObjectiveIds);
    }
    /**
     * Create custom story template aligned to specific learning objectives
     */
    async createCustomAlignedTemplate(title, gradeLevel, subjectArea, learningObjectiveIds) {
        if (!this.config.enableCurriculumAlignment) {
            throw new Error('Curriculum alignment is disabled');
        }
        return await this.curriculumEngine.createAlignedTemplate(title, gradeLevel, subjectArea, learningObjectiveIds);
    }
    /**
     * Filter and enhance content for educational appropriateness
     */
    async filterEducationalContent(content, gradeLevel, filterLevel) {
        if (!this.config.enableCurriculumAlignment) {
            throw new Error('Curriculum alignment is disabled');
        }
        const level = filterLevel || this.config.defaultContentFiltering;
        return await this.curriculumEngine.filterEducationalContent(content, gradeLevel, level);
    }
    // Educational Outcome Tracking Methods
    /**
     * Record educational outcome for a student
     */
    async recordStudentOutcome(outcome) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        await this.outcomeTracker.recordOutcome(outcome);
    }
    /**
     * Assess student responses and provide educational feedback
     */
    async assessStudentPerformance(request) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.outcomeTracker.assessStudent(request);
    }
    /**
     * Get comprehensive student progress report
     */
    async getStudentProgressReport(studentId, gradeLevel, subjectArea) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.outcomeTracker.generateMasteryReport(studentId, gradeLevel, subjectArea);
    }
    // Classroom Management Methods
    /**
     * Create a new classroom
     */
    async createClassroom(name, teacherId, schoolId, gradeLevel, subject, settings) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        const classroomSettings = {
            contentFiltering: this.config.defaultContentFiltering,
            ...settings
        };
        return await this.classroomManager.createClassroom(name, teacherId, schoolId, gradeLevel, subject, classroomSettings);
    }
    /**
     * Bulk create student accounts for a classroom
     */
    async bulkCreateStudents(classroomId, students, options = {}) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        if (students.length > this.config.maxStudentsPerClassroom) {
            throw new Error(`Cannot create more than ${this.config.maxStudentsPerClassroom} students per classroom`);
        }
        return await this.classroomManager.bulkCreateStudents({
            classroomId,
            students,
            sendWelcomeEmails: options.sendWelcomeEmails || false,
            generatePasswords: options.generatePasswords || false
        });
    }
    /**
     * Generate teacher dashboard with classroom insights
     */
    async generateTeacherDashboard(teacherId, classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.generateTeacherDashboard(teacherId, classroomId);
    }
    /**
     * Create group storytelling session
     */
    async createGroupStorytellingSession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType = 'collaborative', maxParticipants, scheduledStart) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        const participants = maxParticipants || this.config.maxGroupSessionParticipants;
        if (participants > this.config.maxGroupSessionParticipants) {
            throw new Error(`Maximum ${this.config.maxGroupSessionParticipants} participants allowed per session`);
        }
        return await this.classroomManager.createGroupStorytellingSession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType, participants, scheduledStart);
    }
    /**
     * Send communication to parent
     */
    async sendParentCommunication(studentId, teacherId, subject, message, type = 'general', priority = 'medium', attachments) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.sendParentCommunication(studentId, teacherId, subject, message, type, priority, attachments);
    }
    /**
     * Get classroom engagement metrics
     */
    async getClassroomEngagementMetrics(classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getClassroomEngagementMetrics(classroomId);
    }
    /**
     * Apply enhanced content filtering for educational environments
     */
    async applyClassroomContentFilter(content, classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.applyEducationalContentFilter(content, classroomId);
    }
    // Integrated Educational Workflow Methods
    /**
     * Complete educational story workflow: alignment, creation, assessment
     */
    async processEducationalStory(storyContent, studentId, classroomId, learningObjectiveIds) {
        // Get classroom info for context
        const classroom = await this.getClassroomInfo(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        // Analyze curriculum alignment
        const alignmentAnalysis = await this.analyzeStoryAlignment({
            storyContent,
            gradeLevel: classroom.gradeLevel,
            subjectArea: classroom.subject,
            learningObjectives: learningObjectiveIds
        });
        // Apply educational content filtering
        const filteredContent = await this.applyClassroomContentFilter(storyContent, classroomId);
        // Determine if story is ready for assessment
        const assessmentReady = alignmentAnalysis.alignmentScore >= 70 &&
            alignmentAnalysis.vocabularyLevel === 'appropriate';
        // Generate integrated recommendations
        const recommendations = this.generateIntegratedRecommendations(alignmentAnalysis, filteredContent, assessmentReady);
        return {
            alignmentAnalysis,
            filteredContent,
            assessmentReady,
            recommendations
        };
    }
    /**
     * Generate comprehensive classroom report
     */
    async generateClassroomReport(classroomId, timeRange) {
        if (!this.config.enableClassroomManagement || !this.config.enableOutcomeTracking) {
            throw new Error('Full classroom reporting requires both classroom management and outcome tracking');
        }
        const classroom = await this.getClassroomInfo(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const dashboard = await this.generateTeacherDashboard(classroom.teacherId, classroomId);
        const engagementMetrics = await this.getClassroomEngagementMetrics(classroomId);
        // Get progress for all students
        const studentProgress = await Promise.all(classroom.students.map(async (studentId) => {
            const student = await this.getStudentInfo(studentId);
            if (!student) {
                return null;
            }
            const progressSummary = await this.getStudentProgressReport(studentId, classroom.gradeLevel, classroom.subject);
            return {
                studentId,
                studentName: `${student.firstName} ${student.lastName}`,
                progressSummary
            };
        })).then(results => results.filter(r => r !== null));
        // Calculate curriculum coverage (simplified)
        const curriculumCoverage = {
            objectivesCovered: 15, // Would be calculated from actual data
            objectivesTotal: 20,
            coveragePercentage: 75,
            gaps: ['Advanced problem solving', 'Creative writing techniques']
        };
        // Generate comprehensive recommendations
        const recommendations = [
            'Consider additional practice sessions for struggling students',
            'Implement more collaborative storytelling activities',
            'Focus on uncovered curriculum objectives',
            'Increase parent communication frequency'
        ];
        return {
            classroomSummary: dashboard,
            engagementMetrics,
            studentProgress,
            curriculumCoverage,
            recommendations
        };
    }
    // ===== ENHANCED CLASSROOM MANAGEMENT METHODS =====
    /**
     * Import students from CSV with comprehensive validation and error handling
     */
    async importStudentsFromCSV(classroomId, csvData, options = {}) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.importStudentsFromCSV(classroomId, csvData, options);
    }
    /**
     * Get real-time engagement metrics with alerts and notifications
     */
    async getRealTimeEngagementMetrics(classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getRealTimeEngagementMetrics(classroomId);
    }
    /**
     * Create curriculum standards mapping for alignment tracking
     */
    async createCurriculumMapping(classroomId, standardId, standardName, description, alignedObjectives) {
        if (!this.config.enableCurriculumAlignment) {
            throw new Error('Curriculum alignment is disabled');
        }
        return await this.classroomManager.createCurriculumMapping(classroomId, standardId, standardName, description, alignedObjectives);
    }
    /**
     * Create and track assignments with progress monitoring
     */
    async createAssignment(classroomId, title, description, assignedBy, assignedTo, dueDate, learningObjectives, storyTemplateId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.createAssignment(classroomId, title, description, assignedBy, assignedTo, dueDate, learningObjectives, storyTemplateId);
    }
    /**
     * Track assignment progress and completion rates
     */
    async getAssignmentProgress(assignmentId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getAssignmentProgress(assignmentId);
    }
    /**
     * Create special needs accommodation system
     */
    async createSpecialNeedsAccommodation(studentId, accommodationType, description, implementation, tools, createdBy, reviewDate) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.createSpecialNeedsAccommodation(studentId, accommodationType, description, implementation, tools, createdBy, reviewDate);
    }
    /**
     * Update accommodation effectiveness based on teacher observation
     */
    async updateAccommodationEffectiveness(accommodationId, effectiveness, notes) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        await this.classroomManager.updateAccommodationEffectiveness(accommodationId, effectiveness, notes);
    }
    /**
     * Create parent-teacher communication portal
     */
    async createParentTeacherPortal(classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.createParentTeacherPortal(classroomId);
    }
    /**
     * Generate enhanced teacher dashboard with comprehensive metrics
     */
    async generateEnhancedTeacherDashboard(teacherId, classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.generateEnhancedTeacherDashboard(teacherId, classroomId);
    }
    // ===== COLLABORATIVE STORYTELLING METHODS =====
    /**
     * Create a collaborative storytelling session with role assignments
     */
    async createCollaborativeStorySession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType = 'collaborative', maxParticipants = 6, scheduledStart = new Date()) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        if (maxParticipants > this.config.maxGroupSessionParticipants) {
            throw new Error(`Maximum ${this.config.maxGroupSessionParticipants} participants allowed per session`);
        }
        return await this.collaborativeEngine.createCollaborativeSession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType, maxParticipants, scheduledStart);
    }
    /**
     * Add participants to collaborative session with role assignments
     */
    async addParticipantsWithRoles(sessionId, studentIds, roleAssignmentStrategy = 'random') {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.collaborativeEngine.addParticipantsWithRoles(sessionId, studentIds, roleAssignmentStrategy);
    }
    /**
     * Handle story contribution with conflict detection
     */
    async addStoryContribution(sessionId, studentId, content, segmentType) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.collaborativeEngine.addStoryContribution(sessionId, studentId, content, segmentType);
    }
    /**
     * Provide peer feedback on story contributions
     */
    async providePeerFeedback(sessionId, reviewerId, segmentId, feedbackType, content) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.collaborativeEngine.providePeerFeedback(sessionId, reviewerId, segmentId, feedbackType, content);
    }
    /**
     * Resolve conflicts in collaborative storytelling
     */
    async resolveCollaborativeConflict(sessionId, conflictId, resolutionStrategy, initiatorId, resolutionData) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.collaborativeEngine.resolveConflict(sessionId, conflictId, resolutionStrategy, initiatorId, resolutionData);
    }
    /**
     * Generate group presentation from collaborative story
     */
    async generateGroupPresentation(sessionId, presentationConfig) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.collaborativeEngine.generateGroupPresentation(sessionId, presentationConfig);
    }
    /**
     * Assess collaborative storytelling work
     */
    async assessCollaborativeWork(sessionId, assessmentType = 'individual') {
        if (!this.config.enableClassroomManagement || !this.config.enableOutcomeTracking) {
            throw new Error('Collaborative assessment requires both classroom management and outcome tracking');
        }
        return await this.collaborativeEngine.assessCollaborativeWork(sessionId, assessmentType);
    }
    // ===== EDUCATIONAL ASSESSMENT AND REPORTING METHODS =====
    /**
     * Create automated assessment aligned with learning objectives
     */
    async createAutomatedAssessment(title, description, classroomId, createdBy, learningObjectives, gradeLevel, subjectArea, assessmentType = 'formative') {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.createAutomatedAssessment(title, description, classroomId, createdBy, learningObjectives, gradeLevel, subjectArea, assessmentType);
    }
    /**
     * Generate differentiated assessment for individual student needs
     */
    async generateDifferentiatedAssessment(baseAssessmentId, studentId, studentProfile) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.generateDifferentiatedAssessment(baseAssessmentId, studentId, studentProfile);
    }
    /**
     * Start assessment attempt with adaptive capabilities
     */
    async startAssessmentAttempt(assessmentId, studentId, adaptiveMode = false) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.startAssessmentAttempt(assessmentId, studentId, adaptiveMode);
    }
    /**
     * Submit assessment response with immediate feedback
     */
    async submitAssessmentResponse(attemptId, questionId, answer, timeSpent, confidence) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.submitAssessmentResponse(attemptId, questionId, answer, timeSpent, confidence);
    }
    /**
     * Generate comprehensive progress report for student
     */
    async generateProgressReport(studentId, classroomId, reportPeriod) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.generateProgressReport(studentId, classroomId, reportPeriod);
    }
    /**
     * Calculate standards-based grade for student
     */
    async calculateStandardsBasedGrade(studentId, standardId, reportingPeriodId) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.calculateStandardsBasedGrade(studentId, standardId, reportingPeriodId);
    }
    /**
     * Create and manage student portfolio
     */
    async createStudentPortfolio(studentId, classroomId) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.createStudentPortfolio(studentId, classroomId);
    }
    /**
     * Add artifact to student portfolio
     */
    async addPortfolioArtifact(studentId, artifact) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.addPortfolioArtifact(studentId, artifact);
    }
    /**
     * Export data for school information systems
     */
    async exportDataForSIS(exportRequest) {
        if (!this.config.enableOutcomeTracking) {
            throw new Error('Outcome tracking is disabled');
        }
        return await this.assessmentEngine.exportDataForSIS(exportRequest);
    }
    /**
     * Get classroom information
     */
    async getClassroomInfo(classroomId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getClassroom(classroomId);
    }
    /**
     * List all classrooms for a teacher
     */
    async listClassroomsForTeacher(teacherId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getClassroomsForTeacher(teacherId);
    }
    /**
     * Get student information
     */
    async getStudentInfo(studentId) {
        if (!this.config.enableClassroomManagement) {
            throw new Error('Classroom management is disabled');
        }
        return await this.classroomManager.getStudent(studentId);
    }
    generateIntegratedRecommendations(alignmentAnalysis, filteredContent, assessmentReady) {
        const recommendations = [];
        if (alignmentAnalysis.alignmentScore < 70) {
            recommendations.push('Improve curriculum alignment by incorporating more learning objective keywords');
        }
        if (alignmentAnalysis.vocabularyLevel === 'above') {
            recommendations.push('Simplify vocabulary to match grade level');
        }
        else if (alignmentAnalysis.vocabularyLevel === 'below') {
            recommendations.push('Consider adding more challenging vocabulary');
        }
        if (filteredContent.modifications.length > 0) {
            recommendations.push('Content has been modified for educational appropriateness');
        }
        if (!assessmentReady) {
            recommendations.push('Story needs improvement before it can be used for assessment');
        }
        else {
            recommendations.push('Story is ready for educational assessment');
        }
        return recommendations;
    }
}
exports.EducationalAgent = EducationalAgent;
//# sourceMappingURL=EducationalAgent.js.map
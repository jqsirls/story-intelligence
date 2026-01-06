"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassroomManager = void 0;
const EducationalOutcomeTracker_1 = require("./EducationalOutcomeTracker");
class ClassroomManager {
    constructor() {
        this.classrooms = new Map();
        this.students = new Map();
        this.teachers = new Map();
        this.groupSessions = new Map();
        this.communications = new Map();
        this.assignments = new Map();
        this.accommodations = new Map();
        this.curriculumMappings = new Map();
        this.outcomeTracker = new EducationalOutcomeTracker_1.EducationalOutcomeTracker();
    }
    /**
     * Create a new classroom
     */
    async createClassroom(name, teacherId, schoolId, gradeLevel, subject, settings) {
        const classroom = {
            id: this.generateId('classroom'),
            name,
            teacherId,
            schoolId,
            gradeLevel,
            subject,
            students: [],
            curriculumFramework: 'common-core-us', // default
            settings: {
                contentFiltering: 'moderate',
                collaborativeMode: true,
                parentNotifications: true,
                assessmentMode: 'both',
                ...settings
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.classrooms.set(classroom.id, classroom);
        return classroom;
    }
    /**
     * Get classroom by ID
     */
    async getClassroom(classroomId) {
        return this.classrooms.get(classroomId) || null;
    }
    /**
     * Get all classrooms for a teacher
     */
    async getClassroomsForTeacher(teacherId) {
        return Array.from(this.classrooms.values()).filter(classroom => classroom.teacherId === teacherId && classroom.isActive);
    }
    /**
     * Get student by ID
     */
    async getStudent(studentId) {
        return this.students.get(studentId) || null;
    }
    /**
     * Bulk create student accounts
     */
    async bulkCreateStudents(request) {
        const { classroomId, students, sendWelcomeEmails, generatePasswords } = request;
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const created = [];
        const failed = [];
        const credentials = [];
        for (const studentData of students) {
            try {
                // Validate student data
                if (!studentData.firstName?.trim() || !studentData.lastName?.trim()) {
                    failed.push({ student: studentData, error: 'First name and last name are required' });
                    continue;
                }
                // Create student account
                const student = {
                    id: this.generateId('student'),
                    firstName: studentData.firstName,
                    lastName: studentData.lastName,
                    email: this.generateStudentEmail(studentData.firstName, studentData.lastName),
                    gradeLevel: classroom.gradeLevel,
                    parentEmail: studentData.parentEmail,
                    specialNeeds: studentData.specialNeeds || [],
                    learningPreferences: studentData.learningPreferences || {
                        visualLearner: false,
                        auditoryLearner: false,
                        kinestheticLearner: false,
                        readingLevel: 'at',
                        attentionSpan: 'medium'
                    },
                    enrollmentDate: new Date(),
                    isActive: true
                };
                // Generate credentials if requested
                if (generatePasswords) {
                    const username = this.generateUsername(student.firstName, student.lastName);
                    const password = this.generateSecurePassword();
                    credentials.push({
                        studentId: student.id,
                        username,
                        password
                    });
                }
                // Add student to classroom
                classroom.students.push(student.id);
                this.students.set(student.id, student);
                created.push(student);
                // Send welcome email if requested
                if (sendWelcomeEmails && student.parentEmail) {
                    await this.sendWelcomeEmail(student, classroom);
                }
            }
            catch (error) {
                failed.push({
                    student: studentData,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Update classroom
        classroom.updatedAt = new Date();
        this.classrooms.set(classroomId, classroom);
        return {
            created,
            failed,
            credentials: generatePasswords ? credentials : undefined
        };
    }
    /**
     * Generate teacher dashboard data
     */
    async generateTeacherDashboard(teacherId, classroomId) {
        const teacher = this.teachers.get(teacherId);
        if (!teacher) {
            throw new Error(`Teacher ${teacherId} not found`);
        }
        // Get teacher's classrooms
        const teacherClassrooms = Array.from(this.classrooms.values())
            .filter(c => c.teacherId === teacherId);
        let targetClassroom;
        if (classroomId) {
            const classroom = this.classrooms.get(classroomId);
            if (!classroom || classroom.teacherId !== teacherId) {
                throw new Error(`Classroom ${classroomId} not found or not accessible`);
            }
            targetClassroom = classroom;
        }
        else {
            // Use first classroom if no specific one requested
            targetClassroom = teacherClassrooms[0];
            if (!targetClassroom) {
                throw new Error('No classrooms found for teacher');
            }
        }
        // Get classroom analytics
        const analytics = await this.outcomeTracker.generateClassroomAnalytics(targetClassroom.id, targetClassroom.students);
        // Get recent activity
        const recentActivity = await this.getRecentActivity(targetClassroom.id);
        // Get struggling students details
        const strugglingStudents = await this.getStrugglingStudentsDetails(analytics.strugglingStudents);
        // Get top performers details
        const topPerformers = await this.getTopPerformersDetails(analytics.exceedingStudents);
        // Get upcoming deadlines (placeholder)
        const upcomingDeadlines = await this.getUpcomingDeadlines(targetClassroom.id);
        // Get parent communication stats
        const parentCommunications = await this.getParentCommunicationStats(targetClassroom.id);
        return {
            classroomId: targetClassroom.id,
            totalStudents: analytics.totalStudents,
            activeStudents: analytics.activeStudents,
            recentActivity,
            engagementMetrics: {
                averageSessionTime: 25, // minutes - would be calculated from actual data
                storiesCompleted: 150, // would be calculated from actual data
                averageScore: analytics.averageEngagement,
                participationRate: (analytics.activeStudents / analytics.totalStudents) * 100
            },
            strugglingStudents,
            topPerformers,
            upcomingDeadlines,
            parentCommunications
        };
    }
    /**
     * Create group storytelling session
     */
    async createGroupStorytellingSession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType = 'collaborative', maxParticipants = 6, scheduledStart = new Date()) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const session = {
            id: this.generateId('session'),
            classroomId,
            title,
            description,
            facilitatorId,
            participants: [],
            storyPrompt,
            learningObjectives,
            maxParticipants,
            sessionType,
            status: 'scheduled',
            scheduledStart,
            participantContributions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.groupSessions.set(session.id, session);
        return session;
    }
    /**
     * Add students to group storytelling session
     */
    async addStudentsToSession(sessionId, studentIds) {
        const session = this.groupSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const added = [];
        const failed = [];
        for (const studentId of studentIds) {
            if (session.participants.length >= session.maxParticipants) {
                failed.push({ studentId, reason: 'Session is full' });
                continue;
            }
            if (session.participants.includes(studentId)) {
                failed.push({ studentId, reason: 'Student already in session' });
                continue;
            }
            const student = this.students.get(studentId);
            if (!student) {
                failed.push({ studentId, reason: 'Student not found' });
                continue;
            }
            session.participants.push(studentId);
            added.push(studentId);
        }
        session.updatedAt = new Date();
        this.groupSessions.set(sessionId, session);
        return { added, failed };
    }
    /**
     * Send communication to parent
     */
    async sendParentCommunication(studentId, teacherId, subject, message, type = 'general', priority = 'medium', attachments) {
        const student = this.students.get(studentId);
        if (!student || !student.parentEmail) {
            throw new Error('Student not found or no parent email available');
        }
        const teacher = this.teachers.get(teacherId);
        if (!teacher) {
            throw new Error(`Teacher ${teacherId} not found`);
        }
        const communication = {
            id: this.generateId('comm'),
            studentId,
            teacherId,
            parentEmail: student.parentEmail,
            subject,
            message,
            type,
            priority,
            attachments,
            isRead: false,
            sentAt: new Date(),
            createdAt: new Date()
        };
        // Store communication
        const studentComms = this.communications.get(studentId) || [];
        studentComms.push(communication);
        this.communications.set(studentId, studentComms);
        // Send email (placeholder - would integrate with email service)
        await this.sendEmail(communication);
        return communication;
    }
    /**
     * Apply enhanced content filtering for educational environments
     */
    async applyEducationalContentFilter(content, classroomId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const filterLevel = classroom.settings.contentFiltering;
        let filtered = content;
        const modifications = [];
        // Apply classroom-specific filtering
        switch (filterLevel) {
            case 'strict':
                const strictResult = await this.applyStrictEducationalFilter(filtered);
                filtered = strictResult.content;
                modifications.push(...strictResult.modifications);
                break;
            case 'moderate':
                const moderateResult = await this.applyModerateEducationalFilter(filtered);
                filtered = moderateResult.content;
                modifications.push(...moderateResult.modifications);
                break;
            case 'standard':
                const standardResult = await this.applyStandardEducationalFilter(filtered);
                filtered = standardResult.content;
                modifications.push(...standardResult.modifications);
                break;
        }
        // Apply grade-level appropriate language
        const gradeResult = await this.ensureGradeLevelAppropriate(filtered, classroom.gradeLevel);
        filtered = gradeResult.content;
        modifications.push(...gradeResult.modifications);
        return { filtered, modifications };
    }
    /**
     * Get classroom engagement metrics
     */
    async getClassroomEngagementMetrics(classroomId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const analytics = await this.outcomeTracker.generateClassroomAnalytics(classroomId, classroom.students);
        const studentEngagement = await Promise.all(classroom.students.map(async (studentId) => {
            const student = this.students.get(studentId);
            const progress = await this.outcomeTracker.getStudentProgress(studentId);
            return {
                studentId,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                engagementScore: progress.reduce((sum, p) => sum + p.averageScore, 0) / Math.max(progress.length, 1),
                lastActivity: progress.length > 0 ? progress[0].lastAttemptDate : new Date(0),
                storiesCompleted: progress.filter(p => p.masteryLevel === 'proficient' || p.masteryLevel === 'advanced').length,
                averageScore: progress.reduce((sum, p) => sum + p.bestScore, 0) / Math.max(progress.length, 1)
            };
        }));
        return {
            overallEngagement: analytics.averageEngagement,
            studentEngagement,
            trends: {
                weeklyEngagement: [75, 80, 85, 82, 88], // Placeholder data
                monthlyCompletion: [65, 70, 75, 80] // Placeholder data
            }
        };
    }
    // ===== ENHANCED CLASSROOM MANAGEMENT METHODS =====
    /**
     * Import students from CSV file with comprehensive validation
     */
    async importStudentsFromCSV(classroomId, csvData, options = {}) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const { hasHeaders = true, skipDuplicates = true, sendWelcomeEmails = false, generatePasswords = false } = options;
        const lines = csvData.trim().split('\n');
        const imported = [];
        const failed = [];
        let duplicates = 0;
        // Skip header row if present
        const dataLines = hasHeaders ? lines.slice(1) : lines;
        for (let i = 0; i < dataLines.length; i++) {
            const rowNumber = hasHeaders ? i + 2 : i + 1; // Account for header row
            const line = dataLines[i];
            try {
                const columns = this.parseCSVLine(line);
                // Expected format: firstName, lastName, parentEmail, specialNeeds (comma-separated), learningPreferences (JSON)
                if (columns.length < 2) {
                    failed.push({ row: rowNumber, data: columns, error: 'Insufficient columns (minimum: firstName, lastName)' });
                    continue;
                }
                const [firstName, lastName, parentEmail, specialNeedsStr, learningPrefsStr] = columns;
                // Validate student data first
                if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
                    failed.push({ row: rowNumber, data: columns, error: 'First name and last name are required' });
                    continue;
                }
                // Check for duplicates
                const existingStudent = Array.from(this.students.values()).find(s => s.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
                    s.lastName.toLowerCase() === lastName.trim().toLowerCase());
                if (existingStudent && skipDuplicates) {
                    duplicates++;
                    continue;
                }
                // Parse special needs
                const specialNeeds = specialNeedsStr ?
                    specialNeedsStr.split(';').map(s => s.trim()).filter(s => s.length > 0) : [];
                // Parse learning preferences
                let learningPreferences = {
                    visualLearner: false,
                    auditoryLearner: false,
                    kinestheticLearner: false,
                    readingLevel: 'at',
                    attentionSpan: 'medium'
                };
                if (learningPrefsStr) {
                    try {
                        learningPreferences = { ...learningPreferences, ...JSON.parse(learningPrefsStr) };
                    }
                    catch (e) {
                        // Use defaults if JSON parsing fails
                    }
                }
                // Create student
                const student = {
                    id: this.generateId('student'),
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    email: this.generateStudentEmail(firstName.trim(), lastName.trim()),
                    gradeLevel: classroom.gradeLevel,
                    parentEmail: parentEmail?.trim() || undefined,
                    specialNeeds,
                    learningPreferences,
                    enrollmentDate: new Date(),
                    isActive: true
                };
                // Add to classroom and storage
                classroom.students.push(student.id);
                this.students.set(student.id, student);
                imported.push(student);
                // Send welcome email if requested
                if (sendWelcomeEmails && student.parentEmail) {
                    await this.sendWelcomeEmail(student, classroom);
                }
            }
            catch (error) {
                failed.push({
                    row: rowNumber,
                    data: line,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        // Update classroom
        classroom.updatedAt = new Date();
        this.classrooms.set(classroomId, classroom);
        return {
            imported,
            failed,
            summary: {
                totalRows: dataLines.length,
                successfulImports: imported.length,
                failedImports: failed.length,
                duplicates
            }
        };
    }
    /**
     * Get real-time engagement metrics with alerts
     */
    async getRealTimeEngagementMetrics(classroomId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const analytics = await this.outcomeTracker.generateClassroomAnalytics(classroomId, classroom.students);
        // Simulate real-time activity data
        const currentActivities = [
            {
                activityType: 'story-creation',
                participantCount: 8,
                averageScore: 82
            },
            {
                activityType: 'group-session',
                participantCount: 6,
                averageScore: 75
            }
        ];
        // Generate alerts based on engagement patterns
        const alerts = [];
        // Check for low engagement
        if (analytics.averageEngagement < 60) {
            alerts.push({
                type: 'low-engagement',
                message: 'Classroom engagement is below 60%',
                severity: 'medium'
            });
        }
        // Check for struggling students
        for (const studentId of analytics.strugglingStudents) {
            const student = this.students.get(studentId);
            alerts.push({
                type: 'struggling-student',
                studentId,
                message: `${student?.firstName} ${student?.lastName} may need additional support`,
                severity: 'high'
            });
        }
        return {
            classroomId,
            timestamp: new Date(),
            activeStudents: analytics.activeStudents,
            averageEngagement: analytics.averageEngagement,
            currentActivities,
            alerts
        };
    }
    /**
     * Create and manage curriculum standards alignment
     */
    async createCurriculumMapping(classroomId, standardId, standardName, description, alignedObjectives) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const mapping = {
            standardId,
            standardName,
            description,
            gradeLevel: classroom.gradeLevel,
            subjectArea: classroom.subject,
            alignedObjectives
        };
        const classroomMappings = this.curriculumMappings.get(classroomId) || [];
        classroomMappings.push(mapping);
        this.curriculumMappings.set(classroomId, classroomMappings);
        return mapping;
    }
    /**
     * Create and track assignments with progress monitoring
     */
    async createAssignment(classroomId, title, description, assignedBy, assignedTo, dueDate, learningObjectives, storyTemplateId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const assignment = {
            id: this.generateId('assignment'),
            classroomId,
            title,
            description,
            assignedBy,
            assignedTo,
            dueDate,
            storyTemplateId,
            learningObjectives,
            status: 'assigned',
            submissions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.assignments.set(assignment.id, assignment);
        // Send notifications to students/parents
        for (const studentId of assignedTo) {
            const student = this.students.get(studentId);
            if (student?.parentEmail) {
                await this.sendParentCommunication(studentId, assignedBy, `New Assignment: ${title}`, `Your child has been assigned a new storytelling activity: ${description}. Due date: ${dueDate.toLocaleDateString()}`, 'assignment', 'medium');
            }
        }
        return assignment;
    }
    /**
     * Track assignment progress and completion
     */
    async getAssignmentProgress(assignmentId) {
        const assignment = this.assignments.get(assignmentId);
        if (!assignment) {
            throw new Error(`Assignment ${assignmentId} not found`);
        }
        const totalAssigned = assignment.assignedTo.length;
        const completedSubmissions = assignment.submissions.length;
        const completionRate = (completedSubmissions / totalAssigned) * 100;
        const averageScore = completedSubmissions > 0 ?
            assignment.submissions.reduce((sum, sub) => sum + (sub.score || 0), 0) / completedSubmissions : 0;
        const onTimeSubmissions = assignment.submissions.filter(sub => sub.submittedAt <= assignment.dueDate).length;
        const lateSubmissions = completedSubmissions - onTimeSubmissions;
        const submittedStudentIds = assignment.submissions.map(sub => sub.studentId);
        const pendingSubmissions = assignment.assignedTo.filter(studentId => !submittedStudentIds.includes(studentId));
        return {
            assignment,
            completionRate,
            averageScore,
            onTimeSubmissions,
            lateSubmissions,
            pendingSubmissions
        };
    }
    /**
     * Create special needs accommodation system
     */
    async createSpecialNeedsAccommodation(studentId, accommodationType, description, implementation, tools, createdBy, reviewDate) {
        const student = this.students.get(studentId);
        if (!student) {
            throw new Error(`Student ${studentId} not found`);
        }
        const accommodation = {
            id: this.generateId('accommodation'),
            studentId,
            accommodationType,
            description,
            implementation,
            tools,
            effectiveness: 'medium', // Default, to be updated based on observation
            reviewDate,
            isActive: true,
            createdBy,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const studentAccommodations = this.accommodations.get(studentId) || [];
        studentAccommodations.push(accommodation);
        this.accommodations.set(studentId, studentAccommodations);
        return accommodation;
    }
    /**
     * Update accommodation effectiveness based on teacher observation
     */
    async updateAccommodationEffectiveness(accommodationId, effectiveness, notes) {
        for (const [studentId, accommodations] of this.accommodations.entries()) {
            const accommodation = accommodations.find(acc => acc.id === accommodationId);
            if (accommodation) {
                accommodation.effectiveness = effectiveness;
                accommodation.updatedAt = new Date();
                // Log the update for tracking
                if (notes) {
                    console.log(`Accommodation ${accommodationId} effectiveness updated to ${effectiveness}: ${notes}`);
                }
                return;
            }
        }
        throw new Error(`Accommodation ${accommodationId} not found`);
    }
    /**
     * Enhanced parent-teacher communication portal
     */
    async createParentTeacherPortal(classroomId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom) {
            throw new Error(`Classroom ${classroomId} not found`);
        }
        const portalId = this.generateId('portal');
        const accessUrl = `https://storytailor.edu/portal/${portalId}`;
        // Generate access tokens for parents
        const parentAccess = [];
        const parentStudentMap = new Map();
        // Group students by parent email
        for (const studentId of classroom.students) {
            const student = this.students.get(studentId);
            if (student?.parentEmail) {
                const studentIds = parentStudentMap.get(student.parentEmail) || [];
                studentIds.push(studentId);
                parentStudentMap.set(student.parentEmail, studentIds);
            }
        }
        // Create access tokens for each parent
        for (const [parentEmail, studentIds] of parentStudentMap.entries()) {
            parentAccess.push({
                parentEmail,
                studentIds,
                accessToken: this.generateSecureToken()
            });
        }
        return {
            portalId,
            accessUrl,
            features: [
                'Real-time progress tracking',
                'Story portfolio viewing',
                'Teacher communication',
                'Assignment notifications',
                'Engagement metrics',
                'Special needs accommodation tracking'
            ],
            parentAccess
        };
    }
    /**
     * Generate comprehensive teacher dashboard with real-time metrics
     */
    async generateEnhancedTeacherDashboard(teacherId, classroomId) {
        const baseDashboard = await this.generateTeacherDashboard(teacherId, classroomId);
        const targetClassroomId = classroomId || baseDashboard.classroomId;
        const realTimeMetrics = await this.getRealTimeEngagementMetrics(targetClassroomId);
        // Calculate curriculum coverage
        const mappings = this.curriculumMappings.get(targetClassroomId) || [];
        const curriculumCoverage = {
            standardsCovered: mappings.length,
            standardsTotal: 25, // Would be calculated from curriculum framework
            coveragePercentage: (mappings.length / 25) * 100,
            upcomingStandards: ['Reading Comprehension Level 3', 'Creative Writing Techniques']
        };
        // Calculate special needs support metrics
        const classroom = this.classrooms.get(targetClassroomId);
        const studentsWithAccommodations = new Set();
        const accommodationTypeCount = new Map();
        for (const studentId of classroom?.students || []) {
            const accommodations = this.accommodations.get(studentId) || [];
            if (accommodations.length > 0) {
                studentsWithAccommodations.add(studentId);
                for (const acc of accommodations.filter(a => a.isActive)) {
                    const current = accommodationTypeCount.get(acc.accommodationType) || { count: 0, totalEffectiveness: 0 };
                    current.count++;
                    current.totalEffectiveness += acc.effectiveness === 'high' ? 3 : acc.effectiveness === 'medium' ? 2 : 1;
                    accommodationTypeCount.set(acc.accommodationType, current);
                }
            }
        }
        const accommodationTypes = Array.from(accommodationTypeCount.entries()).map(([type, data]) => ({
            type,
            count: data.count,
            effectiveness: data.totalEffectiveness / data.count
        }));
        // Calculate assignment tracking metrics
        const classroomAssignments = Array.from(this.assignments.values())
            .filter(a => a.classroomId === targetClassroomId);
        const activeAssignments = classroomAssignments.filter(a => a.status === 'assigned' || a.status === 'in-progress').length;
        const overdueAssignments = classroomAssignments.filter(a => a.status !== 'completed' && a.dueDate < new Date()).length;
        const completionRates = await Promise.all(classroomAssignments.map(async (a) => {
            const progress = await this.getAssignmentProgress(a.id);
            return progress.completionRate;
        }));
        const averageCompletionRate = completionRates.reduce((sum, rate) => sum + rate, 0) /
            Math.max(completionRates.length, 1);
        return {
            ...baseDashboard,
            realTimeMetrics,
            curriculumCoverage,
            specialNeedsSupport: {
                studentsWithAccommodations: studentsWithAccommodations.size,
                accommodationTypes
            },
            assignmentTracking: {
                activeAssignments,
                averageCompletionRate,
                overdueAssignments
            }
        };
    }
    // Private helper methods
    async getRecentActivity(classroomId) {
        // Placeholder implementation - would query actual activity data
        return [
            {
                studentId: 'student-1',
                studentName: 'Alice Johnson',
                activity: 'Completed "The Magic Garden" story',
                timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
                score: 85
            },
            {
                studentId: 'student-2',
                studentName: 'Bob Smith',
                activity: 'Started collaborative story session',
                timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
            }
        ];
    }
    async getStrugglingStudentsDetails(studentIds) {
        return studentIds.map(id => {
            const student = this.students.get(id);
            return {
                studentId: id,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                concerns: ['Low completion rate', 'Difficulty with reading comprehension'],
                lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3) // 3 days ago
            };
        });
    }
    async getTopPerformersDetails(studentIds) {
        return studentIds.map(id => {
            const student = this.students.get(id);
            return {
                studentId: id,
                studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
                achievements: ['Perfect attendance', 'High story completion rate'],
                averageScore: 92
            };
        });
    }
    async getUpcomingDeadlines(classroomId) {
        // Placeholder implementation
        return [
            {
                assignmentId: 'assign-1',
                title: 'Character Development Exercise',
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
                completionRate: 65
            }
        ];
    }
    async getParentCommunicationStats(classroomId) {
        const classroom = this.classrooms.get(classroomId);
        if (!classroom)
            return { pending: 0, thisWeek: 0, needsResponse: 0 };
        let pending = 0;
        let thisWeek = 0;
        let needsResponse = 0;
        const weekAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7);
        for (const studentId of classroom.students) {
            const comms = this.communications.get(studentId) || [];
            for (const comm of comms) {
                if (!comm.isRead)
                    pending++;
                if (comm.sentAt >= weekAgo)
                    thisWeek++;
                if (comm.parentResponse && !comm.responseDate)
                    needsResponse++;
            }
        }
        return { pending, thisWeek, needsResponse };
    }
    async applyStrictEducationalFilter(content) {
        const modifications = [];
        let filtered = content;
        // Remove any potentially distracting elements
        const distractingPatterns = [
            /\b(video games?|social media|youtube|tiktok)\b/gi,
            /\b(scary|frightening|violent)\b/gi
        ];
        for (const pattern of distractingPatterns) {
            if (pattern.test(filtered)) {
                filtered = filtered.replace(pattern, '[educational content]');
                modifications.push('Removed potentially distracting content');
            }
        }
        return { content: filtered, modifications };
    }
    async applyModerateEducationalFilter(content) {
        const modifications = [];
        let filtered = content;
        // Apply moderate filtering
        const inappropriatePatterns = [/\b(violent|scary)\b/gi];
        for (const pattern of inappropriatePatterns) {
            if (pattern.test(filtered)) {
                filtered = filtered.replace(pattern, 'challenging');
                modifications.push('Replaced inappropriate language');
            }
        }
        return { content: filtered, modifications };
    }
    async applyStandardEducationalFilter(content) {
        // Standard filtering - minimal changes
        return { content, modifications: [] };
    }
    async ensureGradeLevelAppropriate(content, gradeLevel) {
        const modifications = [];
        let filtered = content;
        // Simplify vocabulary for lower grades
        if (['pre-k', 'kindergarten', 'grade-1', 'grade-2'].includes(gradeLevel)) {
            const complexWords = {
                'magnificent': 'great',
                'extraordinary': 'amazing',
                'tremendous': 'big'
            };
            for (const [complex, simple] of Object.entries(complexWords)) {
                if (filtered.includes(complex)) {
                    filtered = filtered.replace(new RegExp(complex, 'gi'), simple);
                    modifications.push(`Simplified vocabulary: ${complex} → ${simple}`);
                }
            }
        }
        return { content: filtered, modifications };
    }
    generateStudentEmail(firstName, lastName) {
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
        return `${cleanFirst}.${cleanLast}@student.storytailor.edu`;
    }
    generateUsername(firstName, lastName) {
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
        const randomNum = Math.floor(Math.random() * 1000);
        return `${cleanFirst}${cleanLast}${randomNum}`;
    }
    generateSecurePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }
    async sendWelcomeEmail(student, classroom) {
        // Placeholder for email sending logic
        console.log(`Sending welcome email to ${student.parentEmail} for student ${student.firstName} ${student.lastName}`);
    }
    async sendEmail(communication) {
        // Placeholder for email sending logic
        console.log(`Sending email to ${communication.parentEmail}: ${communication.subject}`);
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSecureToken() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }
}
exports.ClassroomManager = ClassroomManager;
//# sourceMappingURL=ClassroomManager.js.map
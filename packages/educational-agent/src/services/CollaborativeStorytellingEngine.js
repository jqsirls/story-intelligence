"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollaborativeStorytellingEngine = void 0;
class CollaborativeStorytellingEngine {
    constructor() {
        this.sessions = new Map();
        this.roleTemplates = new Map();
        this.conflictResolutionHistory = new Map();
        this.initializeDefaultRoles();
    }
    /**
     * Create a new collaborative storytelling session with role assignments
     */
    async createCollaborativeSession(classroomId, title, description, facilitatorId, storyPrompt, learningObjectives, sessionType = 'collaborative', maxParticipants = 6, scheduledStart = new Date()) {
        const session = {
            id: this.generateId('session'),
            classroomId,
            title,
            description,
            facilitatorId,
            participants: [],
            storyPrompt,
            learningObjectives,
            sessionType,
            status: 'scheduled',
            storyContent: [],
            roles: this.getDefaultRolesForSession(sessionType, maxParticipants),
            conflictResolution: this.getDefaultConflictResolution(),
            assessmentCriteria: this.getDefaultAssessmentCriteria(learningObjectives),
            scheduledStart,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.sessions.set(session.id, session);
        return session;
    }
    /**
     * Add participants to session with automatic role assignment
     */
    async addParticipantsWithRoles(sessionId, studentIds, roleAssignmentStrategy = 'random') {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const added = [];
        const failed = [];
        for (const studentId of studentIds) {
            try {
                // Check if student is already in session
                if (session.participants.some(p => p.studentId === studentId)) {
                    failed.push({ studentId, reason: 'Student already in session' });
                    continue;
                }
                // Check capacity
                if (session.participants.length >= session.roles.length) {
                    failed.push({ studentId, reason: 'Session is full' });
                    continue;
                }
                // Assign role based on strategy
                const assignedRole = await this.assignRole(session, studentId, roleAssignmentStrategy);
                const participant = {
                    studentId,
                    studentName: await this.getStudentName(studentId),
                    role: assignedRole,
                    contributions: [],
                    engagementScore: 0,
                    collaborationRating: 0,
                    joinedAt: new Date(),
                    lastActivity: new Date(),
                    isActive: true
                };
                session.participants.push(participant);
                added.push(participant);
            }
            catch (error) {
                failed.push({
                    studentId,
                    reason: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        session.updatedAt = new Date();
        this.sessions.set(sessionId, session);
        return { added, failed };
    }
    /**
     * Handle story contribution with conflict detection and resolution
     */
    async addStoryContribution(sessionId, studentId, content, segmentType) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const participant = session.participants.find(p => p.studentId === studentId);
        if (!participant) {
            throw new Error(`Student ${studentId} not found in session`);
        }
        // Check if it's the participant's turn (for turn-based sessions)
        if (session.sessionType === 'turn-based' && session.currentTurn !== studentId) {
            throw new Error('Not your turn to contribute');
        }
        // Create story segment
        const segment = {
            id: this.generateId('segment'),
            authorId: studentId,
            content: content.trim(),
            wordCount: content.trim().split(/\s+/).length,
            timestamp: new Date(),
            segmentType,
            approvalStatus: 'pending',
            feedback: [],
            editHistory: []
        };
        // Detect potential conflicts
        const conflicts = await this.detectConflicts(session, segment);
        // Determine if approval is required
        const requiresApproval = conflicts.length > 0 ||
            session.sessionType === 'guided' ||
            segment.wordCount > 100; // Long contributions need approval
        if (!requiresApproval) {
            segment.approvalStatus = 'approved';
            session.storyContent.push(segment);
        }
        // Record contribution
        const contribution = {
            id: this.generateId('contribution'),
            segmentId: segment.id,
            contributionType: 'original-content',
            content,
            wordCount: segment.wordCount,
            qualityScore: await this.calculateQualityScore(content, session.learningObjectives),
            peerRatings: [],
            timestamp: new Date()
        };
        participant.contributions.push(contribution);
        participant.lastActivity = new Date();
        // Update turn for turn-based sessions
        if (session.sessionType === 'turn-based') {
            session.currentTurn = this.getNextTurn(session);
        }
        session.updatedAt = new Date();
        this.sessions.set(sessionId, session);
        return { segment, conflicts, requiresApproval };
    }
    /**
     * Implement peer feedback system
     */
    async providePeerFeedback(sessionId, reviewerId, segmentId, feedbackType, content) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const segment = session.storyContent.find(s => s.id === segmentId);
        if (!segment) {
            throw new Error(`Segment ${segmentId} not found`);
        }
        const feedback = {
            id: this.generateId('feedback'),
            reviewerId,
            reviewerType: 'peer',
            feedbackType,
            content,
            isResolved: false,
            timestamp: new Date()
        };
        segment.feedback.push(feedback);
        // Update reviewer's contribution record
        const reviewer = session.participants.find(p => p.studentId === reviewerId);
        if (reviewer) {
            const contribution = {
                id: this.generateId('contribution'),
                segmentId,
                contributionType: 'feedback',
                content,
                wordCount: content.split(/\s+/).length,
                qualityScore: await this.calculateFeedbackQuality(content, feedbackType),
                peerRatings: [],
                timestamp: new Date()
            };
            reviewer.contributions.push(contribution);
            reviewer.lastActivity = new Date();
        }
        session.updatedAt = new Date();
        this.sessions.set(sessionId, session);
        return feedback;
    }
    /**
     * Handle conflict resolution through various strategies
     */
    async resolveConflict(sessionId, conflictId, resolutionStrategy, initiatorId, resolutionData) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const conflict = await this.getConflict(sessionId, conflictId);
        if (!conflict) {
            throw new Error(`Conflict ${conflictId} not found`);
        }
        let result;
        switch (resolutionStrategy) {
            case 'voting':
                result = await this.resolveByVoting(session, conflict, resolutionData);
                break;
            case 'discussion':
                result = await this.resolveByDiscussion(session, conflict, resolutionData);
                break;
            case 'compromise':
                result = await this.resolveByCompromise(session, conflict, resolutionData);
                break;
            case 'facilitator-decision':
                result = await this.resolveByFacilitatorDecision(session, conflict, resolutionData);
                break;
            case 'alternative-versions':
                result = await this.resolveByAlternativeVersions(session, conflict, resolutionData);
                break;
            default:
                throw new Error(`Unknown resolution strategy: ${resolutionStrategy}`);
        }
        // Record resolution
        const resolutionRecord = {
            conflictId,
            strategy: resolutionStrategy,
            initiatorId,
            result,
            timestamp: new Date(),
            participantVotes: resolutionData.votes || [],
            finalDecision: result.resolution
        };
        const history = this.conflictResolutionHistory.get(sessionId) || [];
        history.push(resolutionRecord);
        this.conflictResolutionHistory.set(sessionId, history);
        session.updatedAt = new Date();
        this.sessions.set(sessionId, session);
        return result;
    }
    /**
     * Generate group presentation from collaborative story
     */
    async generateGroupPresentation(sessionId, presentationConfig) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        if (session.status !== 'completed') {
            throw new Error('Session must be completed before generating presentation');
        }
        // Compile story content
        const fullStory = session.storyContent
            .filter(segment => segment.approvalStatus === 'approved')
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
            .map(segment => segment.content)
            .join('\n\n');
        // Generate presentation materials based on format
        const presentationMaterials = await this.createPresentationMaterials(session, fullStory, presentationConfig);
        // Assign presentation roles
        const presentationRoles = await this.assignPresentationRoles(session.participants, presentationConfig.format);
        // Generate assessment rubric for presentation
        const presentationRubric = await this.createPresentationRubric(session.learningObjectives, presentationConfig);
        return {
            sessionId,
            fullStory,
            presentationMaterials,
            presentationRoles,
            presentationRubric,
            estimatedDuration: presentationConfig.presentationTime,
            preparationGuidelines: await this.generatePreparationGuidelines(presentationConfig),
            createdAt: new Date()
        };
    }
    /**
     * Assess collaborative work using multiple criteria
     */
    async assessCollaborativeWork(sessionId, assessmentType = 'individual') {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const assessmentResults = [];
        for (const participant of session.participants) {
            const individualResult = await this.assessIndividualParticipant(session, participant, assessmentType);
            assessmentResults.push(individualResult);
        }
        // Calculate group metrics
        const groupMetrics = await this.calculateGroupMetrics(session, assessmentResults);
        // Generate recommendations
        const recommendations = await this.generateCollaborationRecommendations(session, assessmentResults);
        return {
            sessionId,
            assessmentType,
            individualResults: assessmentResults,
            groupMetrics,
            recommendations,
            overallScore: groupMetrics.averageScore,
            completedAt: new Date()
        };
    }
    // Private helper methods
    initializeDefaultRoles() {
        const defaultRoles = [
            {
                id: 'story-architect',
                name: 'Story Architect',
                description: 'Plans the overall story structure and ensures narrative coherence',
                responsibilities: ['Plan story outline', 'Ensure plot consistency', 'Guide story direction'],
                permissions: [
                    { action: 'suggest-direction', scope: 'story-direction' },
                    { action: 'add-content', scope: 'all-content' }
                ]
            },
            {
                id: 'character-developer',
                name: 'Character Developer',
                description: 'Creates and develops characters throughout the story',
                responsibilities: ['Create characters', 'Develop character arcs', 'Write dialogue'],
                permissions: [
                    { action: 'add-content', scope: 'own-content' },
                    { action: 'edit-content', scope: 'own-content' }
                ]
            },
            {
                id: 'world-builder',
                name: 'World Builder',
                description: 'Creates and maintains the story setting and environment',
                responsibilities: ['Describe settings', 'Maintain world consistency', 'Add environmental details'],
                permissions: [
                    { action: 'add-content', scope: 'own-content' },
                    { action: 'suggest-direction', scope: 'story-direction' }
                ]
            },
            {
                id: 'editor',
                name: 'Editor',
                description: 'Reviews and improves story content for clarity and quality',
                responsibilities: ['Review content', 'Suggest improvements', 'Ensure quality'],
                permissions: [
                    { action: 'edit-content', scope: 'all-content' },
                    { action: 'add-content', scope: 'own-content' }
                ]
            },
            {
                id: 'illustrator',
                name: 'Illustrator',
                description: 'Creates visual elements and describes imagery for the story',
                responsibilities: ['Create visual descriptions', 'Plan illustrations', 'Enhance imagery'],
                permissions: [
                    { action: 'add-content', scope: 'own-content' }
                ]
            },
            {
                id: 'mediator',
                name: 'Mediator',
                description: 'Helps resolve conflicts and facilitates group decisions',
                responsibilities: ['Resolve conflicts', 'Facilitate discussions', 'Ensure fair participation'],
                permissions: [
                    { action: 'resolve-conflict', scope: 'session-management' },
                    { action: 'moderate', scope: 'session-management' }
                ]
            }
        ];
        defaultRoles.forEach(role => {
            this.roleTemplates.set(role.id, role);
        });
    }
    getDefaultRolesForSession(sessionType, maxParticipants) {
        const roles = [];
        const availableRoles = Array.from(this.roleTemplates.values());
        // Select roles based on session type and participant count
        if (sessionType === 'guided') {
            // Guided sessions need more structured roles
            roles.push(availableRoles.find(r => r.id === 'story-architect'), availableRoles.find(r => r.id === 'character-developer'), availableRoles.find(r => r.id === 'world-builder'), availableRoles.find(r => r.id === 'editor'));
        }
        else {
            // Collaborative and turn-based can use all roles
            roles.push(...availableRoles.slice(0, Math.min(maxParticipants, availableRoles.length)));
        }
        return roles;
    }
    getDefaultConflictResolution() {
        return {
            enabled: true,
            strategies: [
                {
                    type: 'discussion',
                    description: 'Open discussion to reach consensus',
                    applicableScenarios: ['content-disagreement', 'direction-conflict'],
                    timeLimit: 10,
                    requiredParticipation: 75
                },
                {
                    type: 'voting',
                    description: 'Democratic voting on alternatives',
                    applicableScenarios: ['multiple-options', 'deadlock'],
                    timeLimit: 5,
                    requiredParticipation: 80
                },
                {
                    type: 'facilitator-decision',
                    description: 'Teacher makes final decision',
                    applicableScenarios: ['escalated-conflict', 'time-pressure'],
                    timeLimit: 2,
                    requiredParticipation: 0
                }
            ],
            escalationPath: [
                {
                    level: 1,
                    trigger: 'Initial conflict detected',
                    action: 'Attempt discussion resolution',
                    timeLimit: 10,
                    requiredRoles: ['mediator']
                },
                {
                    level: 2,
                    trigger: 'Discussion failed',
                    action: 'Initiate voting process',
                    timeLimit: 5,
                    requiredRoles: ['all-participants']
                },
                {
                    level: 3,
                    trigger: 'Voting inconclusive',
                    action: 'Escalate to facilitator',
                    timeLimit: 2,
                    requiredRoles: ['facilitator']
                }
            ],
            votingSystem: {
                enabled: true,
                votingMethod: 'simple-majority',
                minimumParticipation: 75,
                timeLimit: 5,
                anonymousVoting: true
            },
            mediationRules: [
                {
                    scenario: 'Content quality dispute',
                    mediator: 'peer-elected',
                    process: ['Present both versions', 'Discuss merits', 'Seek compromise'],
                    successCriteria: ['All parties agree', 'Quality maintained']
                }
            ]
        };
    }
    getDefaultAssessmentCriteria(learningObjectives) {
        return [
            {
                id: 'collaboration-quality',
                name: 'Collaboration Quality',
                description: 'How well the student worked with others',
                weight: 30,
                rubric: [
                    {
                        level: 'Excellent',
                        description: 'Actively collaborates, supports others, resolves conflicts constructively',
                        points: 4,
                        indicators: ['Helps teammates', 'Shares ideas freely', 'Resolves conflicts positively']
                    },
                    {
                        level: 'Good',
                        description: 'Collaborates well most of the time, generally supportive',
                        points: 3,
                        indicators: ['Usually helpful', 'Shares some ideas', 'Avoids major conflicts']
                    },
                    {
                        level: 'Satisfactory',
                        description: 'Basic collaboration, follows group decisions',
                        points: 2,
                        indicators: ['Participates when asked', 'Follows group lead', 'Minimal conflict']
                    },
                    {
                        level: 'Needs Improvement',
                        description: 'Limited collaboration, may create conflicts',
                        points: 1,
                        indicators: ['Rarely participates', 'Doesn\'t share ideas', 'Creates conflicts']
                    }
                ],
                assessmentType: 'peer'
            },
            {
                id: 'content-contribution',
                name: 'Content Contribution',
                description: 'Quality and quantity of story contributions',
                weight: 40,
                rubric: [
                    {
                        level: 'Excellent',
                        description: 'High-quality, creative contributions that enhance the story',
                        points: 4,
                        indicators: ['Creative ideas', 'Well-written content', 'Advances plot effectively']
                    },
                    {
                        level: 'Good',
                        description: 'Good quality contributions that support the story',
                        points: 3,
                        indicators: ['Clear writing', 'Relevant content', 'Supports story development']
                    },
                    {
                        level: 'Satisfactory',
                        description: 'Basic contributions that meet requirements',
                        points: 2,
                        indicators: ['Meets word count', 'Follows story direction', 'Adequate quality']
                    },
                    {
                        level: 'Needs Improvement',
                        description: 'Limited or poor quality contributions',
                        points: 1,
                        indicators: ['Below word count', 'Off-topic content', 'Poor quality writing']
                    }
                ],
                assessmentType: 'individual'
            },
            {
                id: 'learning-objectives',
                name: 'Learning Objectives Mastery',
                description: 'Demonstration of learning objective achievement',
                weight: 30,
                rubric: [
                    {
                        level: 'Excellent',
                        description: 'Clearly demonstrates mastery of all learning objectives',
                        points: 4,
                        indicators: ['Exceeds objectives', 'Shows deep understanding', 'Applies knowledge creatively']
                    },
                    {
                        level: 'Good',
                        description: 'Demonstrates understanding of most learning objectives',
                        points: 3,
                        indicators: ['Meets most objectives', 'Shows good understanding', 'Applies knowledge appropriately']
                    },
                    {
                        level: 'Satisfactory',
                        description: 'Demonstrates basic understanding of learning objectives',
                        points: 2,
                        indicators: ['Meets basic objectives', 'Shows surface understanding', 'Limited application']
                    },
                    {
                        level: 'Needs Improvement',
                        description: 'Limited demonstration of learning objective achievement',
                        points: 1,
                        indicators: ['Misses key objectives', 'Shows little understanding', 'No clear application']
                    }
                ],
                assessmentType: 'individual'
            }
        ];
    }
    async assignRole(session, studentId, strategy) {
        const availableRoles = session.roles.filter(role => !session.participants.some(p => p.role.id === role.id));
        if (availableRoles.length === 0) {
            throw new Error('No available roles for assignment');
        }
        switch (strategy) {
            case 'random':
                return availableRoles[Math.floor(Math.random() * availableRoles.length)];
            case 'skill-based':
                // In a real implementation, this would analyze student skills
                return availableRoles[0];
            case 'preference-based':
                // In a real implementation, this would consider student preferences
                return availableRoles[0];
            case 'manual':
                // Manual assignment would be handled by the facilitator
                return availableRoles[0];
            default:
                return availableRoles[0];
        }
    }
    async getStudentName(studentId) {
        // In a real implementation, this would fetch from the student database
        return `Student ${studentId.slice(-4)}`;
    }
    async detectConflicts(session, segment) {
        const conflicts = [];
        // Check for content conflicts with existing story
        const existingContent = session.storyContent.map(s => s.content).join(' ');
        // Simple conflict detection (in reality, this would be more sophisticated)
        if (existingContent.length > 0) {
            // Check for character name conflicts
            const existingCharacters = this.extractCharacterNames(existingContent);
            const newCharacters = this.extractCharacterNames(segment.content);
            for (const newChar of newCharacters) {
                if (existingCharacters.includes(newChar)) {
                    conflicts.push({
                        type: 'character-conflict',
                        description: `Character "${newChar}" already exists in the story`,
                        severity: 'medium',
                        suggestedResolution: 'Use existing character or choose different name'
                    });
                }
            }
            // Check for plot consistency
            if (this.detectPlotInconsistency(existingContent, segment.content)) {
                conflicts.push({
                    type: 'plot-inconsistency',
                    description: 'New content conflicts with established plot elements',
                    severity: 'high',
                    suggestedResolution: 'Revise content to maintain plot consistency'
                });
            }
        }
        return conflicts;
    }
    extractCharacterNames(content) {
        // Simple character name extraction (in reality, this would use NLP)
        const names = content.match(/\b[A-Z][a-z]+\b/g) || [];
        return [...new Set(names)];
    }
    detectPlotInconsistency(existingContent, newContent) {
        // Simple plot consistency check (in reality, this would be more sophisticated)
        return false; // Placeholder
    }
    async calculateQualityScore(content, learningObjectives) {
        // Simple quality scoring (in reality, this would use NLP and ML)
        let score = 50; // Base score
        // Length bonus
        const wordCount = content.split(/\s+/).length;
        if (wordCount >= 20)
            score += 10;
        if (wordCount >= 50)
            score += 10;
        // Grammar and spelling (simplified)
        if (content.includes('.') || content.includes('!') || content.includes('?'))
            score += 10;
        // Creativity indicators (simplified)
        const creativeWords = ['magical', 'mysterious', 'adventure', 'discovered', 'suddenly'];
        const creativeCount = creativeWords.filter(word => content.toLowerCase().includes(word)).length;
        score += creativeCount * 5;
        return Math.min(100, Math.max(0, score));
    }
    async calculateFeedbackQuality(content, feedbackType) {
        // Simple feedback quality scoring
        let score = 50;
        if (content.length > 20)
            score += 20;
        if (feedbackType === 'suggestion' && content.includes('could'))
            score += 15;
        if (feedbackType === 'praise' && content.includes('good'))
            score += 10;
        return Math.min(100, Math.max(0, score));
    }
    getNextTurn(session) {
        const currentIndex = session.participants.findIndex(p => p.studentId === session.currentTurn);
        const nextIndex = (currentIndex + 1) % session.participants.length;
        return session.participants[nextIndex].studentId;
    }
    async getConflict(sessionId, conflictId) {
        // In a real implementation, this would fetch from conflict storage
        return null;
    }
    async resolveByVoting(session, conflict, resolutionData) {
        // Implement voting resolution logic
        return {
            success: true,
            resolution: 'Resolved by majority vote',
            participantSatisfaction: 85,
            timeToResolution: 5
        };
    }
    async resolveByDiscussion(session, conflict, resolutionData) {
        // Implement discussion resolution logic
        return {
            success: true,
            resolution: 'Resolved through discussion and compromise',
            participantSatisfaction: 90,
            timeToResolution: 10
        };
    }
    async resolveByCompromise(session, conflict, resolutionData) {
        // Implement compromise resolution logic
        return {
            success: true,
            resolution: 'Resolved through compromise solution',
            participantSatisfaction: 80,
            timeToResolution: 8
        };
    }
    async resolveByFacilitatorDecision(session, conflict, resolutionData) {
        // Implement facilitator decision logic
        return {
            success: true,
            resolution: 'Resolved by facilitator decision',
            participantSatisfaction: 70,
            timeToResolution: 2
        };
    }
    async resolveByAlternativeVersions(session, conflict, resolutionData) {
        // Implement alternative versions resolution logic
        return {
            success: true,
            resolution: 'Resolved by creating alternative story branches',
            participantSatisfaction: 95,
            timeToResolution: 15
        };
    }
    async createPresentationMaterials(session, fullStory, config) {
        // Generate presentation materials based on format
        return {
            storyScript: fullStory,
            visualAids: [],
            audioElements: [],
            interactiveElements: [],
            handouts: []
        };
    }
    async assignPresentationRoles(participants, format) {
        // Assign presentation roles based on format and participant strengths
        return participants.map((participant, index) => ({
            participantId: participant.studentId,
            roleName: `Presenter ${index + 1}`,
            responsibilities: ['Present story section', 'Answer questions'],
            timeAllocation: 2 // minutes
        }));
    }
    async createPresentationRubric(learningObjectives, config) {
        // Create presentation-specific rubric
        return [
            {
                id: 'presentation-delivery',
                name: 'Presentation Delivery',
                description: 'Quality of presentation delivery and engagement',
                weight: 50,
                rubric: [
                    {
                        level: 'Excellent',
                        description: 'Clear, engaging delivery with good eye contact and voice projection',
                        points: 4,
                        indicators: ['Clear speech', 'Good eye contact', 'Engaging delivery']
                    }
                ],
                assessmentType: 'group'
            }
        ];
    }
    async generatePreparationGuidelines(config) {
        return [
            'Practice reading your sections aloud',
            'Prepare visual aids if needed',
            'Plan smooth transitions between speakers',
            'Rehearse timing to stay within limits'
        ];
    }
    async assessIndividualParticipant(session, participant, assessmentType) {
        // Calculate individual assessment scores
        const collaborationScore = this.calculateCollaborationScore(participant);
        const contentScore = this.calculateContentScore(participant);
        const learningObjectivesScore = this.calculateLearningObjectivesScore(participant, session.learningObjectives);
        return {
            participantId: participant.studentId,
            participantName: participant.studentName,
            scores: {
                collaboration: collaborationScore,
                contentContribution: contentScore,
                learningObjectives: learningObjectivesScore,
                overall: (collaborationScore + contentScore + learningObjectivesScore) / 3
            },
            strengths: await this.identifyStrengths(participant),
            areasForImprovement: await this.identifyImprovementAreas(participant),
            recommendations: await this.generateIndividualRecommendations(participant)
        };
    }
    calculateCollaborationScore(participant) {
        // Calculate collaboration score based on peer ratings and engagement
        return participant.collaborationRating || 75; // Default score
    }
    calculateContentScore(participant) {
        // Calculate content score based on contributions
        const totalQuality = participant.contributions.reduce((sum, contrib) => sum + contrib.qualityScore, 0);
        return participant.contributions.length > 0 ? totalQuality / participant.contributions.length : 0;
    }
    calculateLearningObjectivesScore(participant, objectives) {
        // Calculate learning objectives score
        return 80; // Placeholder
    }
    async identifyStrengths(participant) {
        const strengths = [];
        if (participant.contributions.length > 3) {
            strengths.push('Active contributor');
        }
        if (participant.collaborationRating > 80) {
            strengths.push('Excellent collaborator');
        }
        return strengths;
    }
    async identifyImprovementAreas(participant) {
        const areas = [];
        if (participant.contributions.length < 2) {
            areas.push('Increase participation');
        }
        if (participant.collaborationRating < 60) {
            areas.push('Improve collaboration skills');
        }
        return areas;
    }
    async generateIndividualRecommendations(participant) {
        return [
            'Continue active participation in group discussions',
            'Practice giving constructive feedback to peers',
            'Focus on quality over quantity in contributions'
        ];
    }
    async calculateGroupMetrics(session, assessments) {
        const averageScore = assessments.reduce((sum, assessment) => sum + assessment.scores.overall, 0) / assessments.length;
        return {
            averageScore,
            collaborationEffectiveness: 85,
            storyQuality: 80,
            learningObjectiveAchievement: 75,
            participationBalance: this.calculateParticipationBalance(assessments),
            conflictResolutionSuccess: 90
        };
    }
    calculateParticipationBalance(assessments) {
        // Calculate how balanced participation was across all members
        const contributions = assessments.map(a => a.scores.contentContribution);
        const mean = contributions.reduce((sum, score) => sum + score, 0) / contributions.length;
        const variance = contributions.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / contributions.length;
        // Lower variance = better balance, convert to 0-100 scale
        return Math.max(0, 100 - variance);
    }
    async generateCollaborationRecommendations(session, assessments) {
        const recommendations = [];
        const avgCollaboration = assessments.reduce((sum, a) => sum + a.scores.collaboration, 0) / assessments.length;
        if (avgCollaboration < 70) {
            recommendations.push('Focus on improving collaboration skills in future group work');
        }
        const participationBalance = this.calculateParticipationBalance(assessments);
        if (participationBalance < 70) {
            recommendations.push('Encourage more balanced participation from all group members');
        }
        return recommendations;
    }
    generateId(prefix) {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.CollaborativeStorytellingEngine = CollaborativeStorytellingEngine;
//# sourceMappingURL=CollaborativeStorytellingEngine.js.map
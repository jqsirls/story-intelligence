export interface CollaborativeStorySession {
    id: string;
    classroomId: string;
    title: string;
    description: string;
    facilitatorId: string;
    participants: CollaborativeParticipant[];
    storyPrompt: string;
    learningObjectives: string[];
    sessionType: 'collaborative' | 'turn-based' | 'guided';
    status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
    currentTurn?: string;
    storyContent: StorySegment[];
    roles: ParticipantRole[];
    conflictResolution: ConflictResolutionProtocol;
    assessmentCriteria: AssessmentCriteria[];
    scheduledStart: Date;
    actualStart?: Date;
    actualEnd?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CollaborativeParticipant {
    studentId: string;
    studentName: string;
    role: ParticipantRole;
    contributions: ContributionRecord[];
    engagementScore: number;
    collaborationRating: number;
    joinedAt: Date;
    lastActivity: Date;
    isActive: boolean;
}
export interface ParticipantRole {
    id: string;
    name: string;
    description: string;
    responsibilities: string[];
    permissions: RolePermission[];
    rotationSchedule?: {
        duration: number;
        nextRotation: Date;
    };
}
export interface RolePermission {
    action: 'add-content' | 'edit-content' | 'suggest-direction' | 'resolve-conflict' | 'moderate';
    scope: 'own-content' | 'all-content' | 'story-direction' | 'session-management';
    conditions?: string[];
}
export interface StorySegment {
    id: string;
    authorId: string;
    content: string;
    wordCount: number;
    timestamp: Date;
    segmentType: 'introduction' | 'character-development' | 'plot-advancement' | 'conflict' | 'resolution' | 'dialogue';
    approvalStatus: 'pending' | 'approved' | 'needs-revision' | 'rejected';
    feedback: SegmentFeedback[];
    editHistory: EditRecord[];
}
export interface SegmentFeedback {
    id: string;
    reviewerId: string;
    reviewerType: 'peer' | 'facilitator' | 'system';
    feedbackType: 'suggestion' | 'praise' | 'concern' | 'question';
    content: string;
    isResolved: boolean;
    timestamp: Date;
}
export interface EditRecord {
    id: string;
    editorId: string;
    originalContent: string;
    newContent: string;
    reason: string;
    timestamp: Date;
    approvedBy?: string;
}
export interface ContributionRecord {
    id: string;
    segmentId: string;
    contributionType: 'original-content' | 'edit' | 'suggestion' | 'feedback' | 'conflict-resolution';
    content: string;
    wordCount: number;
    qualityScore: number;
    peerRatings: PeerRating[];
    timestamp: Date;
}
export interface PeerRating {
    raterId: string;
    criteria: string;
    score: number;
    comment?: string;
    timestamp: Date;
}
export interface ConflictResolutionProtocol {
    enabled: boolean;
    strategies: ConflictStrategy[];
    escalationPath: EscalationLevel[];
    votingSystem: VotingConfiguration;
    mediationRules: MediationRule[];
}
export interface ConflictStrategy {
    type: 'voting' | 'discussion' | 'compromise' | 'facilitator-decision' | 'alternative-versions';
    description: string;
    applicableScenarios: string[];
    timeLimit: number;
    requiredParticipation: number;
}
export interface EscalationLevel {
    level: number;
    trigger: string;
    action: string;
    timeLimit: number;
    requiredRoles: string[];
}
export interface VotingConfiguration {
    enabled: boolean;
    votingMethod: 'simple-majority' | 'consensus' | 'weighted' | 'ranked-choice';
    minimumParticipation: number;
    timeLimit: number;
    anonymousVoting: boolean;
}
export interface MediationRule {
    scenario: string;
    mediator: 'facilitator' | 'peer-elected' | 'system-assigned';
    process: string[];
    successCriteria: string[];
}
export interface AssessmentCriteria {
    id: string;
    name: string;
    description: string;
    weight: number;
    rubric: RubricLevel[];
    assessmentType: 'individual' | 'group' | 'peer' | 'self';
}
export interface RubricLevel {
    level: string;
    description: string;
    points: number;
    indicators: string[];
}
export interface GroupPresentationConfig {
    enabled: boolean;
    format: 'live-reading' | 'recorded-video' | 'illustrated-book' | 'interactive-presentation';
    audienceType: 'classmates' | 'parents' | 'school-community' | 'public';
    preparationTime: number;
    presentationTime: number;
    feedbackCollection: boolean;
}
export declare class CollaborativeStorytellingEngine {
    private sessions;
    private roleTemplates;
    private conflictResolutionHistory;
    constructor();
    /**
     * Create a new collaborative storytelling session with role assignments
     */
    createCollaborativeSession(classroomId: string, title: string, description: string, facilitatorId: string, storyPrompt: string, learningObjectives: string[], sessionType?: CollaborativeStorySession['sessionType'], maxParticipants?: number, scheduledStart?: Date): Promise<CollaborativeStorySession>;
    /**
     * Add participants to session with automatic role assignment
     */
    addParticipantsWithRoles(sessionId: string, studentIds: string[], roleAssignmentStrategy?: 'random' | 'skill-based' | 'preference-based' | 'manual'): Promise<{
        added: CollaborativeParticipant[];
        failed: Array<{
            studentId: string;
            reason: string;
        }>;
    }>;
    /**
     * Handle story contribution with conflict detection and resolution
     */
    addStoryContribution(sessionId: string, studentId: string, content: string, segmentType: StorySegment['segmentType']): Promise<{
        segment: StorySegment;
        conflicts: ConflictDetectionResult[];
        requiresApproval: boolean;
    }>;
    /**
     * Implement peer feedback system
     */
    providePeerFeedback(sessionId: string, reviewerId: string, segmentId: string, feedbackType: SegmentFeedback['feedbackType'], content: string): Promise<SegmentFeedback>;
    /**
     * Handle conflict resolution through various strategies
     */
    resolveConflict(sessionId: string, conflictId: string, resolutionStrategy: ConflictStrategy['type'], initiatorId: string, resolutionData: any): Promise<ConflictResolutionResult>;
    /**
     * Generate group presentation from collaborative story
     */
    generateGroupPresentation(sessionId: string, presentationConfig: GroupPresentationConfig): Promise<GroupPresentationResult>;
    /**
     * Assess collaborative work using multiple criteria
     */
    assessCollaborativeWork(sessionId: string, assessmentType?: 'individual' | 'group' | 'peer' | 'self'): Promise<CollaborativeAssessmentResult>;
    private initializeDefaultRoles;
    private getDefaultRolesForSession;
    private getDefaultConflictResolution;
    private getDefaultAssessmentCriteria;
    private assignRole;
    private getStudentName;
    private detectConflicts;
    private extractCharacterNames;
    private detectPlotInconsistency;
    private calculateQualityScore;
    private calculateFeedbackQuality;
    private getNextTurn;
    private getConflict;
    private resolveByVoting;
    private resolveByDiscussion;
    private resolveByCompromise;
    private resolveByFacilitatorDecision;
    private resolveByAlternativeVersions;
    private createPresentationMaterials;
    private assignPresentationRoles;
    private createPresentationRubric;
    private generatePreparationGuidelines;
    private assessIndividualParticipant;
    private calculateCollaborationScore;
    private calculateContentScore;
    private calculateLearningObjectivesScore;
    private identifyStrengths;
    private identifyImprovementAreas;
    private generateIndividualRecommendations;
    private calculateGroupMetrics;
    private calculateParticipationBalance;
    private generateCollaborationRecommendations;
    private generateId;
}
interface ConflictDetectionResult {
    type: 'character-conflict' | 'plot-inconsistency' | 'style-mismatch' | 'content-inappropriate';
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestedResolution: string;
}
interface ConflictResolutionResult {
    success: boolean;
    resolution: string;
    participantSatisfaction: number;
    timeToResolution: number;
}
interface GroupPresentationResult {
    sessionId: string;
    fullStory: string;
    presentationMaterials: PresentationMaterials;
    presentationRoles: PresentationRole[];
    presentationRubric: AssessmentCriteria[];
    estimatedDuration: number;
    preparationGuidelines: string[];
    createdAt: Date;
}
interface PresentationMaterials {
    storyScript: string;
    visualAids: any[];
    audioElements: any[];
    interactiveElements: any[];
    handouts: any[];
}
interface PresentationRole {
    participantId: string;
    roleName: string;
    responsibilities: string[];
    timeAllocation: number;
}
interface CollaborativeAssessmentResult {
    sessionId: string;
    assessmentType: 'individual' | 'group' | 'peer' | 'self';
    individualResults: IndividualAssessment[];
    groupMetrics: GroupMetrics;
    recommendations: string[];
    overallScore: number;
    completedAt: Date;
}
interface IndividualAssessment {
    participantId: string;
    participantName: string;
    scores: {
        collaboration: number;
        contentContribution: number;
        learningObjectives: number;
        overall: number;
    };
    strengths: string[];
    areasForImprovement: string[];
    recommendations: string[];
}
interface GroupMetrics {
    averageScore: number;
    collaborationEffectiveness: number;
    storyQuality: number;
    learningObjectiveAchievement: number;
    participationBalance: number;
    conflictResolutionSuccess: number;
}
export {};
//# sourceMappingURL=CollaborativeStorytellingEngine.d.ts.map
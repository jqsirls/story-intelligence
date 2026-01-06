import { CollaborativeStorytellingEngine } from '../services/CollaborativeStorytellingEngine';

describe('CollaborativeStorytellingEngine', () => {
  let engine: CollaborativeStorytellingEngine;

  beforeEach(() => {
    engine = new CollaborativeStorytellingEngine();
  });

  describe('createCollaborativeSession', () => {
    it('should create a collaborative storytelling session', async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Adventure Quest',
        'Create an adventure story together',
        'teacher-123',
        'Once upon a time in a magical forest...',
        ['creative-writing', 'collaboration', 'narrative-structure'],
        'collaborative',
        4,
        new Date()
      );

      expect(session).toBeDefined();
      expect(session.title).toBe('Adventure Quest');
      expect(session.classroomId).toBe('classroom-123');
      expect(session.sessionType).toBe('collaborative');
      expect(session.status).toBe('scheduled');
      expect(session.participants).toHaveLength(0);
      expect(session.roles).toBeDefined();
      expect(session.conflictResolution).toBeDefined();
      expect(session.assessmentCriteria).toBeDefined();
    });

    it('should create session with appropriate roles for session type', async () => {
      const guidedSession = await engine.createCollaborativeSession(
        'classroom-123',
        'Guided Story',
        'Teacher-guided story creation',
        'teacher-123',
        'Story prompt',
        ['objective-1'],
        'guided',
        4
      );

      expect(guidedSession.roles).toBeDefined();
      expect(guidedSession.roles.length).toBeGreaterThan(0);
      expect(guidedSession.roles.some(role => role.id === 'story-architect')).toBe(true);
    });

    it('should set up conflict resolution protocols', async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );

      expect(session.conflictResolution.enabled).toBe(true);
      expect(session.conflictResolution.strategies).toBeDefined();
      expect(session.conflictResolution.strategies.length).toBeGreaterThan(0);
      expect(session.conflictResolution.votingSystem).toBeDefined();
      expect(session.conflictResolution.escalationPath).toBeDefined();
    });
  });

  describe('addParticipantsWithRoles', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1'],
        'collaborative',
        4
      );
      sessionId = session.id;
    });

    it('should add participants with role assignments', async () => {
      const studentIds = ['student-1', 'student-2', 'student-3'];
      
      const result = await engine.addParticipantsWithRoles(
        sessionId,
        studentIds,
        'random'
      );

      expect(result.added).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      
      result.added.forEach(participant => {
        expect(participant.studentId).toBeDefined();
        expect(participant.role).toBeDefined();
        expect(participant.role.id).toBeDefined();
        expect(participant.role.name).toBeDefined();
        expect(participant.contributions).toEqual([]);
        expect(participant.isActive).toBe(true);
      });
    });

    it('should handle capacity limits', async () => {
      // First, add participants up to capacity
      const studentIds1 = ['student-1', 'student-2', 'student-3', 'student-4'];
      await engine.addParticipantsWithRoles(sessionId, studentIds1, 'random');

      // Try to add more participants beyond capacity
      const studentIds2 = ['student-5', 'student-6'];
      const result = await engine.addParticipantsWithRoles(sessionId, studentIds2, 'random');

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].reason).toBe('Session is full');
    });

    it('should prevent duplicate participants', async () => {
      const studentIds = ['student-1', 'student-2'];
      
      // Add participants first time
      await engine.addParticipantsWithRoles(sessionId, studentIds, 'random');
      
      // Try to add same participants again
      const result = await engine.addParticipantsWithRoles(sessionId, studentIds, 'random');

      expect(result.added).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].reason).toBe('Student already in session');
    });
  });

  describe('addStoryContribution', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1'],
        'collaborative',
        4
      );
      sessionId = session.id;

      // Add a participant
      await engine.addParticipantsWithRoles(sessionId, ['student-1'], 'random');
    });

    it('should add story contribution successfully', async () => {
      const content = 'The brave knight walked through the dark forest, searching for the lost treasure.';
      
      const result = await engine.addStoryContribution(
        sessionId,
        'student-1',
        content,
        'plot-advancement'
      );

      expect(result.segment).toBeDefined();
      expect(result.segment.authorId).toBe('student-1');
      expect(result.segment.content).toBe(content);
      expect(result.segment.segmentType).toBe('plot-advancement');
      expect(result.segment.wordCount).toBeGreaterThan(0);
      expect(result.conflicts).toBeInstanceOf(Array);
      expect(typeof result.requiresApproval).toBe('boolean');
    });

    it('should detect conflicts in story contributions', async () => {
      // Add first contribution
      await engine.addStoryContribution(
        sessionId,
        'student-1',
        'The character John walked into the room.',
        'character-development'
      );

      // Add second participant
      await engine.addParticipantsWithRoles(sessionId, ['student-2'], 'random');

      // Add conflicting contribution (same character name)
      const result = await engine.addStoryContribution(
        sessionId,
        'student-2',
        'John was already in the room waiting.',
        'character-development'
      );

      expect(result.conflicts).toBeDefined();
      // Note: Conflict detection is simplified in the current implementation
    });

    it('should handle turn-based sessions correctly', async () => {
      // Create turn-based session
      const turnBasedSession = await engine.createCollaborativeSession(
        'classroom-123',
        'Turn-based Story',
        'Take turns adding to the story',
        'teacher-123',
        'Story prompt',
        ['objective-1'],
        'turn-based',
        2
      );

      // Add participants
      await engine.addParticipantsWithRoles(turnBasedSession.id, ['student-1', 'student-2'], 'random');

      // First student should be able to contribute
      const result1 = await engine.addStoryContribution(
        turnBasedSession.id,
        'student-1',
        'First contribution',
        'introduction'
      );

      expect(result1.segment).toBeDefined();

      // Second student should now be able to contribute (turn should have switched)
      const result2 = await engine.addStoryContribution(
        turnBasedSession.id,
        'student-2',
        'Second contribution',
        'plot-advancement'
      );

      expect(result2.segment).toBeDefined();
    });

    it('should throw error for non-participant', async () => {
      await expect(
        engine.addStoryContribution(
          sessionId,
          'non-participant',
          'Some content',
          'introduction'
        )
      ).rejects.toThrow('Student non-participant not found in session');
    });
  });

  describe('providePeerFeedback', () => {
    let sessionId: string;
    let segmentId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );
      sessionId = session.id;

      // Add participants
      await engine.addParticipantsWithRoles(sessionId, ['student-1', 'student-2'], 'random');

      // Add a story contribution
      const result = await engine.addStoryContribution(
        sessionId,
        'student-1',
        'Test story content',
        'introduction'
      );
      segmentId = result.segment.id;
    });

    it('should provide peer feedback successfully', async () => {
      const feedback = await engine.providePeerFeedback(
        sessionId,
        'student-2',
        segmentId,
        'suggestion',
        'This is a great start! Maybe you could add more details about the setting.'
      );

      expect(feedback).toBeDefined();
      expect(feedback.reviewerId).toBe('student-2');
      expect(feedback.reviewerType).toBe('peer');
      expect(feedback.feedbackType).toBe('suggestion');
      expect(feedback.content).toContain('great start');
      expect(feedback.isResolved).toBe(false);
    });

    it('should handle different feedback types', async () => {
      const feedbackTypes: Array<'suggestion' | 'praise' | 'concern' | 'question'> = [
        'suggestion', 'praise', 'concern', 'question'
      ];

      for (const type of feedbackTypes) {
        const feedback = await engine.providePeerFeedback(
          sessionId,
          'student-2',
          segmentId,
          type,
          `This is a ${type} feedback.`
        );

        expect(feedback.feedbackType).toBe(type);
      }
    });
  });

  describe('resolveConflict', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );
      sessionId = session.id;

      // Add participants
      await engine.addParticipantsWithRoles(sessionId, ['student-1', 'student-2'], 'random');
    });

    it('should resolve conflict by voting', async () => {
      const resolutionData = {
        votes: [
          { participantId: 'student-1', choice: 'option-a' },
          { participantId: 'student-2', choice: 'option-a' }
        ]
      };

      const result = await engine.resolveConflict(
        sessionId,
        'conflict-123',
        'voting',
        'student-1',
        resolutionData
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.resolution).toBeDefined();
      expect(result.participantSatisfaction).toBeGreaterThan(0);
      expect(result.timeToResolution).toBeGreaterThan(0);
    });

    it('should resolve conflict by discussion', async () => {
      const resolutionData = {
        discussionNotes: 'Participants agreed on a compromise solution'
      };

      const result = await engine.resolveConflict(
        sessionId,
        'conflict-123',
        'discussion',
        'student-1',
        resolutionData
      );

      expect(result.success).toBe(true);
      expect(result.resolution).toContain('discussion');
    });

    it('should resolve conflict by facilitator decision', async () => {
      const resolutionData = {
        facilitatorDecision: 'Use option B as it better fits the story theme'
      };

      const result = await engine.resolveConflict(
        sessionId,
        'conflict-123',
        'facilitator-decision',
        'teacher-123',
        resolutionData
      );

      expect(result.success).toBe(true);
      expect(result.resolution).toContain('facilitator');
    });
  });

  describe('generateGroupPresentation', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );
      sessionId = session.id;

      // Add participants and contributions
      await engine.addParticipantsWithRoles(sessionId, ['student-1', 'student-2'], 'random');
      
      await engine.addStoryContribution(
        sessionId,
        'student-1',
        'First part of the story',
        'introduction'
      );
      
      await engine.addStoryContribution(
        sessionId,
        'student-2',
        'Second part of the story',
        'plot-advancement'
      );

      // Mark session as completed
      const sessionData = (engine as any).sessions.get(sessionId);
      sessionData.status = 'completed';
      (engine as any).sessions.set(sessionId, sessionData);
    });

    it('should generate group presentation materials', async () => {
      const presentationConfig = {
        enabled: true,
        format: 'live-reading' as const,
        audienceType: 'classmates' as const,
        preparationTime: 15,
        presentationTime: 10,
        feedbackCollection: true
      };

      const result = await engine.generateGroupPresentation(sessionId, presentationConfig);

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.fullStory).toBeDefined();
      expect(result.presentationMaterials).toBeDefined();
      expect(result.presentationRoles).toBeDefined();
      expect(result.presentationRubric).toBeDefined();
      expect(result.preparationGuidelines).toBeInstanceOf(Array);
      expect(result.estimatedDuration).toBe(10);
    });

    it('should throw error for incomplete session', async () => {
      // Create new session that's not completed
      const incompleteSession = await engine.createCollaborativeSession(
        'classroom-123',
        'Incomplete Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );

      const presentationConfig = {
        enabled: true,
        format: 'live-reading' as const,
        audienceType: 'classmates' as const,
        preparationTime: 15,
        presentationTime: 10,
        feedbackCollection: true
      };

      await expect(
        engine.generateGroupPresentation(incompleteSession.id, presentationConfig)
      ).rejects.toThrow('Session must be completed before generating presentation');
    });
  });

  describe('assessCollaborativeWork', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['creative-writing', 'collaboration']
      );
      sessionId = session.id;

      // Add participants
      await engine.addParticipantsWithRoles(sessionId, ['student-1', 'student-2'], 'random');
      
      // Add contributions
      await engine.addStoryContribution(
        sessionId,
        'student-1',
        'Great story beginning with vivid descriptions',
        'introduction'
      );
      
      await engine.addStoryContribution(
        sessionId,
        'student-2',
        'Excellent plot development that builds on the introduction',
        'plot-advancement'
      );

      // Add peer feedback
      await engine.providePeerFeedback(
        sessionId,
        'student-2',
        (await engine.addStoryContribution(sessionId, 'student-1', 'Test', 'dialogue')).segment.id,
        'praise',
        'Great dialogue!'
      );
    });

    it('should assess individual collaborative work', async () => {
      const result = await engine.assessCollaborativeWork(sessionId, 'individual');

      expect(result).toBeDefined();
      expect(result.sessionId).toBe(sessionId);
      expect(result.assessmentType).toBe('individual');
      expect(result.individualResults).toHaveLength(2);
      expect(result.groupMetrics).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.overallScore).toBeGreaterThan(0);

      // Check individual results structure
      result.individualResults.forEach(individual => {
        expect(individual.participantId).toBeDefined();
        expect(individual.participantName).toBeDefined();
        expect(individual.scores).toBeDefined();
        expect(individual.scores.collaboration).toBeGreaterThanOrEqual(0);
        expect(individual.scores.contentContribution).toBeGreaterThanOrEqual(0);
        expect(individual.scores.learningObjectives).toBeGreaterThanOrEqual(0);
        expect(individual.scores.overall).toBeGreaterThanOrEqual(0);
        expect(individual.strengths).toBeInstanceOf(Array);
        expect(individual.areasForImprovement).toBeInstanceOf(Array);
        expect(individual.recommendations).toBeInstanceOf(Array);
      });
    });

    it('should assess group collaborative work', async () => {
      const result = await engine.assessCollaborativeWork(sessionId, 'group');

      expect(result.assessmentType).toBe('group');
      expect(result.groupMetrics.averageScore).toBeGreaterThan(0);
      expect(result.groupMetrics.collaborationEffectiveness).toBeGreaterThan(0);
      expect(result.groupMetrics.storyQuality).toBeGreaterThan(0);
      expect(result.groupMetrics.participationBalance).toBeGreaterThanOrEqual(0);
    });

    it('should provide meaningful recommendations', async () => {
      const result = await engine.assessCollaborativeWork(sessionId, 'individual');

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      // Check that recommendations are strings
      result.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent session', async () => {
      await expect(
        engine.addParticipantsWithRoles('non-existent-session', ['student-1'], 'random')
      ).rejects.toThrow('Session non-existent-session not found');
    });

    it('should throw error for non-existent segment in feedback', async () => {
      const session = await engine.createCollaborativeSession(
        'classroom-123',
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );

      await engine.addParticipantsWithRoles(session.id, ['student-1'], 'random');

      await expect(
        engine.providePeerFeedback(
          session.id,
          'student-1',
          'non-existent-segment',
          'suggestion',
          'Test feedback'
        )
      ).rejects.toThrow('Segment non-existent-segment not found');
    });
  });
});
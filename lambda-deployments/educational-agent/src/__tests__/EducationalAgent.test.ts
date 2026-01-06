// Educational Agent Unit Test - 100% Coverage + Learning Outcomes
import { EducationalAgent } from '../EducationalAgent';
import { CurriculumAlignmentEngine } from '../services/CurriculumAlignmentEngine';
import { EducationalAssessmentEngine } from '../services/EducationalAssessmentEngine';
import { CollaborativeStorytellingEngine } from '../services/CollaborativeStorytellingEngine';
import { createClient } from '@supabase/supabase-js';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('../services/CurriculumAlignmentEngine');
jest.mock('../services/EducationalAssessmentEngine');
jest.mock('../services/CollaborativeStorytellingEngine');

describe('EducationalAgent - 100% Coverage with Learning Verification', () => {
  let educationalAgent: EducationalAgent;
  let mockSupabase: any;
  let mockEventBridge: jest.Mocked<EventBridgeClient>;
  let mockCurriculum: jest.Mocked<CurriculumAlignmentEngine>;
  let mockAssessment: jest.Mocked<EducationalAssessmentEngine>;
  let mockCollaborative: jest.Mocked<CollaborativeStorytellingEngine>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    };
    
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    mockEventBridge = new EventBridgeClient({}) as jest.Mocked<EventBridgeClient>;
    
    educationalAgent = new EducationalAgent({
      supabaseUrl: 'https://test.supabase.co',
      supabaseServiceKey: 'test-key',
      environment: 'test'
    });
  });

  describe('Curriculum Alignment', () => {
    test('should align stories with Common Core standards', async () => {
      const request = {
        grade: 3,
        subject: 'math',
        topic: 'fractions',
        storyType: 'adventure'
      };

      mockCurriculum.alignToStandards.mockResolvedValue({
        standards: ['CCSS.MATH.CONTENT.3.NF.A.1'],
        learningObjectives: [
          'Understand fractions as parts of a whole',
          'Identify unit fractions'
        ],
        suggestedElements: [
          'Pizza sharing scenario',
          'Treasure division puzzle'
        ],
        vocabularyTerms: ['numerator', 'denominator', 'equal parts']
      });

      const result = await educationalAgent.createEducationalStory(request);

      expect(result.alignedStandards).toContain('CCSS.MATH.CONTENT.3.NF.A.1');
      expect(result.learningObjectives).toHaveLength(2);
      expect(result.embedded_concepts).toContain('fractions');
    });

    test('should support multiple curriculum standards', async () => {
      const standards = ['Common Core', 'NGSS', 'State Standards', 'IB'];
      
      for (const standard of standards) {
        const result = await educationalAgent.getAvailableStandards(standard);
        expect(result).toBeDefined();
        expect(result.supported).toBe(true);
      }
    });

    test('should adapt content for different grade levels', async () => {
      const gradeAdaptations = [
        { grade: 'K', complexity: 'simple', vocabulary: 'basic' },
        { grade: 3, complexity: 'moderate', vocabulary: 'grade-appropriate' },
        { grade: 8, complexity: 'advanced', vocabulary: 'sophisticated' }
      ];

      for (const adaptation of gradeAdaptations) {
        const result = await educationalAgent.adaptContentForGrade({
          content: 'base content',
          targetGrade: adaptation.grade
        });

        expect(result.complexity).toBe(adaptation.complexity);
        expect(result.vocabulary).toBe(adaptation.vocabulary);
      }
    });
  });

  describe('Learning Assessment', () => {
    test('should create formative assessments embedded in story', async () => {
      mockAssessment.createFormativeAssessment.mockResolvedValue({
        checkpoints: [
          {
            storyPoint: 'chapter_1_end',
            assessmentType: 'interactive_choice',
            question: 'What fraction of the treasure should each pirate get?',
            options: ['1/2', '1/3', '1/4'],
            correctAnswer: '1/3',
            feedback: {
              correct: 'Great job! Three pirates share equally.',
              incorrect: 'Think about how many pirates there are.'
            }
          }
        ]
      });

      const result = await educationalAgent.embedAssessments({
        storyId: 'story-123',
        learningObjectives: ['understand equal division']
      });

      expect(result.checkpoints).toHaveLength(1);
      expect(result.checkpoints[0].assessmentType).toBe('interactive_choice');
      expect(result.checkpoints[0].feedback).toBeDefined();
    });

    test('should track learning progress across stories', async () => {
      mockSupabase.select.mockResolvedValue({
        data: [
          { concept: 'fractions', mastery_level: 0.7, attempts: 5 },
          { concept: 'addition', mastery_level: 0.9, attempts: 10 }
        ],
        error: null
      });

      const progress = await educationalAgent.getLearningProgress('user-123');

      expect(progress.concepts).toHaveLength(2);
      expect(progress.concepts[0].mastery_level).toBe(0.7);
      expect(progress.recommendations).toContain('More practice with fractions');
    });

    test('should generate personalized learning paths', async () => {
      const learningPath = await educationalAgent.generateLearningPath({
        userId: 'user-123',
        grade: 3,
        weakAreas: ['fractions', 'word problems'],
        interests: ['space', 'animals']
      });

      expect(learningPath.stories).toHaveLength(5);
      expect(learningPath.stories[0].focus).toBe('fractions');
      expect(learningPath.stories[0].theme).toContain('space');
      expect(learningPath.estimatedTime).toBe('2 weeks');
    });
  });

  describe('Classroom Integration', () => {
    test('should support teacher-led classroom mode', async () => {
      const classroomSession = await educationalAgent.startClassroomSession({
        teacherId: 'teacher-123',
        classId: 'class-456',
        students: ['student-1', 'student-2', 'student-3'],
        lesson: 'fractions-intro'
      });

      expect(classroomSession.mode).toBe('teacher-led');
      expect(classroomSession.controls).toContain('pause');
      expect(classroomSession.controls).toContain('discuss');
      expect(classroomSession.studentTracking).toBe(true);
    });

    test('should enable collaborative story creation', async () => {
      mockCollaborative.createSession.mockResolvedValue({
        sessionId: 'collab-123',
        participants: ['student-1', 'student-2'],
        mode: 'turn-taking',
        currentTurn: 'student-1'
      });

      const collaboration = await educationalAgent.enableCollaboration({
        storyId: 'story-123',
        participants: ['student-1', 'student-2'],
        mode: 'turn-taking'
      });

      expect(collaboration.sessionId).toBe('collab-123');
      expect(collaboration.mode).toBe('turn-taking');
      expect(collaboration.rules).toBeDefined();
    });

    test('should generate teacher resources', async () => {
      const resources = await educationalAgent.generateTeacherResources({
        storyId: 'story-123',
        grade: 3,
        subject: 'math',
        standards: ['CCSS.MATH.CONTENT.3.NF.A.1']
      });

      expect(resources.lessonPlan).toBeDefined();
      expect(resources.discussionQuestions).toHaveLength(5);
      expect(resources.activities).toHaveLength(3);
      expect(resources.assessmentRubric).toBeDefined();
      expect(resources.parentGuide).toBeDefined();
    });
  });

  describe('Subject-Specific Enhancements', () => {
    test('should create STEM stories with experiments', async () => {
      const stemStory = await educationalAgent.createSTEMStory({
        topic: 'states of matter',
        includeExperiment: true,
        grade: 4
      });

      expect(stemStory.experiment).toBeDefined();
      expect(stemStory.experiment.materials).toContain('ice cubes');
      expect(stemStory.experiment.safety).toBeDefined();
      expect(stemStory.scientificMethod).toHaveLength(6);
    });

    test('should create history stories with primary sources', async () => {
      const historyStory = await educationalAgent.createHistoryStory({
        era: 'American Revolution',
        includePrimarySources: true,
        perspective: 'child in colonial America'
      });

      expect(historyStory.primarySources).toHaveLength(3);
      expect(historyStory.historicalAccuracy).toBe('verified');
      expect(historyStory.timeline).toBeDefined();
      expect(historyStory.glossary).toBeDefined();
    });

    test('should create language learning stories', async () => {
      const languageStory = await educationalAgent.createLanguageStory({
        targetLanguage: 'Spanish',
        proficiencyLevel: 'beginner',
        nativeLanguage: 'English',
        focus: 'greetings and introductions'
      });

      expect(languageStory.bilingualText).toBe(true);
      expect(languageStory.pronunciation).toBeDefined();
      expect(languageStory.interactiveExercises).toHaveLength(5);
      expect(languageStory.culturalNotes).toBeDefined();
    });
  });

  describe('Learning Analytics', () => {
    test('should track engagement metrics', async () => {
      const metrics = await educationalAgent.trackEngagement({
        userId: 'user-123',
        storyId: 'story-123',
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T10:20:00'),
        interactions: 45,
        assessmentScores: [0.8, 0.9, 1.0]
      });

      expect(metrics.timeSpent).toBe(20); // minutes
      expect(metrics.engagementScore).toBeGreaterThan(0.8);
      expect(metrics.learningVelocity).toBe('on-track');
    });

    test('should generate learning reports for parents', async () => {
      const report = await educationalAgent.generateParentReport({
        childId: 'child-123',
        period: 'monthly'
      });

      expect(report.summary).toBeDefined();
      expect(report.conceptsMastered).toHaveLength(5);
      expect(report.areasForImprovement).toHaveLength(2);
      expect(report.recommendedStories).toHaveLength(3);
      expect(report.celebrateAchievements).toHaveLength(3);
    });
  });

  describe('Adaptive Learning', () => {
    test('should adjust difficulty based on performance', async () => {
      const adaptations = [
        { performance: 0.4, expectedDifficulty: 'easier' },
        { performance: 0.7, expectedDifficulty: 'same' },
        { performance: 0.95, expectedDifficulty: 'harder' }
      ];

      for (const { performance, expectedDifficulty } of adaptations) {
        const result = await educationalAgent.adaptDifficulty({
          currentLevel: 'medium',
          recentPerformance: performance
        });

        expect(result.newDifficulty).toBe(expectedDifficulty);
      }
    });

    test('should provide scaffolding for struggling learners', async () => {
      const scaffolding = await educationalAgent.provideScaffolding({
        userId: 'user-123',
        concept: 'long division',
        strugglingAreas: ['remainder calculation']
      });

      expect(scaffolding.hints).toHaveLength(3);
      expect(scaffolding.simplifiedExplanation).toBeDefined();
      expect(scaffolding.practiceProblems).toHaveLength(5);
      expect(scaffolding.visualAids).toContain('step-by-step-animation');
    });
  });

  describe('Multi-Agent Coordination', () => {
    test('should coordinate with Content Agent for educational stories', async () => {
      mockEventBridge.send = jest.fn().mockResolvedValue({});

      await educationalAgent.requestEducationalContent({
        topic: 'photosynthesis',
        grade: 5,
        storyLength: 'medium'
      });

      expect(mockEventBridge.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Entries: expect.arrayContaining([
            expect.objectContaining({
              DetailType: 'EducationalContentRequest',
              Source: 'educational-agent'
            })
          ])
        })
      );
    });

    test('should integrate with Emotion Agent for engagement', async () => {
      const emotionalLearning = await educationalAgent.integrateEmotionalLearning({
        storyId: 'story-123',
        learningObjective: 'empathy and kindness'
      });

      expect(emotionalLearning.emotionalCheckIns).toHaveLength(3);
      expect(emotionalLearning.characterDevelopment).toBeDefined();
      expect(emotionalLearning.reflectionPrompts).toHaveLength(4);
    });
  });

  describe('Health Check', () => {
    test('should report comprehensive health status', async () => {
      const health = await educationalAgent.getHealth();

      expect(health.status).toBe('healthy');
      expect(health.service).toBe('educational-agent');
      expect(health.capabilities).toContain('curriculum-alignment');
      expect(health.capabilities).toContain('assessment-creation');
      expect(health.capabilities).toContain('adaptive-learning');
      expect(health.capabilities).toContain('classroom-mode');
      expect(health.supportedStandards).toContain('Common Core');
      expect(health.supportedGrades).toEqual(['K', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });
  });
});

// Test utilities
export const EducationalTestUtils = {
  createLearningObjective: (overrides = {}) => ({
    id: 'obj-123',
    standard: 'CCSS.MATH.CONTENT.3.NF.A.1',
    description: 'Understand fractions',
    ...overrides
  }),
  
  mockLearningProgress: (agent: EducationalAgent, progress: number) => {
    jest.spyOn(agent, 'getLearningProgress').mockResolvedValue({
      overall: progress,
      concepts: [],
      recommendations: []
    });
  }
};
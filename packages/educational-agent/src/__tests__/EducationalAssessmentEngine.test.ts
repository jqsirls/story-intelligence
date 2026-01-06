import { EducationalAssessmentEngine } from '../services/EducationalAssessmentEngine';

describe('EducationalAssessmentEngine', () => {
  let engine: EducationalAssessmentEngine;

  beforeEach(() => {
    engine = new EducationalAssessmentEngine();
  });

  describe('createAutomatedAssessment', () => {
    it('should create an automated assessment', async () => {
      const assessment = await engine.createAutomatedAssessment(
        'Reading Comprehension Test',
        'Test students understanding of story elements',
        'classroom-123',
        'teacher-123',
        ['reading-comprehension', 'story-analysis'],
        'grade-3',
        'language-arts',
        'formative'
      );

      expect(assessment).toBeDefined();
      expect(assessment.title).toBe('Reading Comprehension Test');
      expect(assessment.classroomId).toBe('classroom-123');
      expect(assessment.assessmentType).toBe('formative');
      expect(assessment.learningObjectives).toEqual(['reading-comprehension', 'story-analysis']);
      expect(assessment.questions).toBeDefined();
      expect(assessment.questions.length).toBeGreaterThan(0);
      expect(assessment.rubric).toBeDefined();
      expect(assessment.differentiationRules).toBeDefined();
      expect(assessment.isActive).toBe(true);
    });

    it('should generate questions aligned to learning objectives', async () => {
      const assessment = await engine.createAutomatedAssessment(
        'Math Assessment',
        'Test basic math skills',
        'classroom-123',
        'teacher-123',
        ['addition', 'subtraction'],
        'grade-2',
        'mathematics',
        'summative'
      );

      expect(assessment.questions.length).toBeGreaterThan(0);
      
      assessment.questions.forEach(question => {
        expect(question.id).toBeDefined();
        expect(question.type).toBeDefined();
        expect(question.question).toBeDefined();
        expect(question.points).toBeGreaterThan(0);
        expect(question.difficulty).toBeDefined();
        expect(question.learningObjectiveId).toBeDefined();
        expect(['addition', 'subtraction']).toContain(question.learningObjectiveId);
      });
    });

    it('should create appropriate rubric for assessment type', async () => {
      const formativeAssessment = await engine.createAutomatedAssessment(
        'Formative Test',
        'Quick check',
        'classroom-123',
        'teacher-123',
        ['objective-1'],
        'grade-3',
        'language-arts',
        'formative'
      );

      expect(formativeAssessment.rubric).toBeDefined();
      expect(formativeAssessment.rubric.name).toContain('formative');
      expect(formativeAssessment.rubric.criteria).toBeDefined();
      expect(formativeAssessment.rubric.criteria.length).toBeGreaterThan(0);
      
      formativeAssessment.rubric.criteria.forEach(criterion => {
        expect(criterion.name).toBeDefined();
        expect(criterion.weight).toBeGreaterThan(0);
        expect(criterion.levels).toBeDefined();
        expect(criterion.levels.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateDifferentiatedAssessment', () => {
    let baseAssessmentId: string;

    beforeEach(async () => {
      const assessment = await engine.createAutomatedAssessment(
        'Base Assessment',
        'Base test for differentiation',
        'classroom-123',
        'teacher-123',
        ['reading-comprehension'],
        'grade-3',
        'language-arts'
      );
      baseAssessmentId = assessment.id;
    });

    it('should create differentiated assessment for visual learner', async () => {
      const studentProfile = {
        id: 'student-123',
        name: 'Visual Learner',
        gradeLevel: 'grade-3' as const,
        readingLevel: 'at' as const,
        learningStyle: {
          visualLearner: true,
          auditoryLearner: false,
          kinestheticLearner: false
        },
        specialNeeds: [],
        accommodations: []
      };

      const differentiatedAssessment = await engine.generateDifferentiatedAssessment(
        baseAssessmentId,
        'student-123',
        studentProfile
      );

      expect(differentiatedAssessment).toBeDefined();
      expect(differentiatedAssessment.title).toContain('Differentiated');
      expect(differentiatedAssessment.title).toContain(studentProfile.name);
      expect(differentiatedAssessment.questions).toBeDefined();
    });

    it('should apply extended time for students with special needs', async () => {
      const studentProfile = {
        id: 'student-456',
        name: 'Extended Time Student',
        gradeLevel: 'grade-3' as const,
        readingLevel: 'below' as const,
        learningStyle: {
          visualLearner: false,
          auditoryLearner: true,
          kinestheticLearner: false
        },
        specialNeeds: ['extended-time', 'processing-delay'],
        accommodations: ['extra-time']
      };

      const differentiatedAssessment = await engine.generateDifferentiatedAssessment(
        baseAssessmentId,
        'student-456',
        studentProfile
      );

      expect(differentiatedAssessment.timeLimit).toBeGreaterThan(30); // Should be extended
      expect(differentiatedAssessment.attempts).toBeGreaterThanOrEqual(3); // Should allow multiple attempts
    });

    it('should simplify content for below-level readers', async () => {
      const studentProfile = {
        id: 'student-789',
        name: 'Below Level Reader',
        gradeLevel: 'grade-3' as const,
        readingLevel: 'below' as const,
        learningStyle: {
          visualLearner: false,
          auditoryLearner: false,
          kinestheticLearner: true
        },
        specialNeeds: [],
        accommodations: ['simplified-language']
      };

      const differentiatedAssessment = await engine.generateDifferentiatedAssessment(
        baseAssessmentId,
        'student-789',
        studentProfile
      );

      expect(differentiatedAssessment.questions).toBeDefined();
      // In a real implementation, we would check that vocabulary was simplified
    });
  });

  describe('startAssessmentAttempt', () => {
    let assessmentId: string;

    beforeEach(async () => {
      const assessment = await engine.createAutomatedAssessment(
        'Test Assessment',
        'Test description',
        'classroom-123',
        'teacher-123',
        ['objective-1'],
        'grade-3',
        'language-arts'
      );
      assessmentId = assessment.id;
    });

    it('should start a regular assessment attempt', async () => {
      const attempt = await engine.startAssessmentAttempt(
        assessmentId,
        'student-123',
        false
      );

      expect(attempt).toBeDefined();
      expect(attempt.assessmentId).toBe(assessmentId);
      expect(attempt.studentId).toBe('student-123');
      expect(attempt.status).toBe('in-progress');
      expect(attempt.startedAt).toBeInstanceOf(Date);
      expect(attempt.responses).toEqual([]);
      expect(attempt.score).toBe(0);
      expect(attempt.adaptiveData).toBeUndefined();
    });

    it('should start an adaptive assessment attempt', async () => {
      // First create an adaptive assessment
      const adaptiveAssessment = await engine.createAutomatedAssessment(
        'Adaptive Test',
        'Adaptive assessment',
        'classroom-123',
        'teacher-123',
        ['objective-1'],
        'grade-3',
        'language-arts',
        'adaptive'
      );

      // Enable adaptive settings
      (adaptiveAssessment as any).adaptiveSettings = {
        enabled: true,
        initialDifficulty: 'medium',
        difficultyAdjustmentThreshold: 0.7,
        maxDifficultyIncrease: 2,
        maxDifficultyDecrease: 2,
        terminationCriteria: {
          confidenceLevel: 0.9,
          maxQuestions: 20,
          minQuestions: 5
        }
      };

      const attempt = await engine.startAssessmentAttempt(
        adaptiveAssessment.id,
        'student-123',
        true
      );

      expect(attempt.adaptiveData).toBeDefined();
      expect(attempt.adaptiveData!.abilityEstimate).toBe(0.5);
      expect(attempt.adaptiveData!.difficultyProgression).toEqual([]);
      expect(attempt.adaptiveData!.confidenceInterval).toEqual([0.3, 0.7]);
    });

    it('should throw error for non-existent assessment', async () => {
      await expect(
        engine.startAssessmentAttempt('non-existent', 'student-123')
      ).rejects.toThrow('Assessment non-existent not found');
    });
  });

  describe('submitAssessmentResponse', () => {
    let assessmentId: string;
    let attemptId: string;
    let questionId: string;

    beforeEach(async () => {
      const assessment = await engine.createAutomatedAssessment(
        'Test Assessment',
        'Test description',
        'classroom-123',
        'teacher-123',
        ['objective-1'],
        'grade-3',
        'language-arts'
      );
      assessmentId = assessment.id;
      questionId = assessment.questions[0].id;

      const attempt = await engine.startAssessmentAttempt(assessmentId, 'student-123');
      attemptId = attempt.id;
    });

    it('should submit correct response and provide feedback', async () => {
      const result = await engine.submitAssessmentResponse(
        attemptId,
        questionId,
        'The character learns to be brave',
        30
      );

      expect(result).toBeDefined();
      expect(result.isCorrect).toBe(true);
      expect(result.points).toBeGreaterThan(0);
      expect(result.feedback).toBeDefined();
      expect(result.feedback).toContain('Correct');
    });

    it('should submit incorrect response and provide feedback', async () => {
      const result = await engine.submitAssessmentResponse(
        attemptId,
        questionId,
        'Wrong answer',
        45
      );

      expect(result).toBeDefined();
      expect(result.isCorrect).toBe(false);
      expect(result.points).toBe(0);
      expect(result.feedback).toBeDefined();
      expect(result.feedback).toContain('Not quite right');
    });

    it('should handle open-ended questions', async () => {
      // Find an open-ended question
      const assessment = (engine as any).assessments.get(assessmentId);
      const openEndedQuestion = assessment.questions.find((q: any) => q.type === 'open-ended');
      
      if (openEndedQuestion) {
        const result = await engine.submitAssessmentResponse(
          attemptId,
          openEndedQuestion.id,
          'The character changed from being scared to being brave throughout the story.',
          60
        );

        expect(result).toBeDefined();
        expect(result.isCorrect).toBe(true); // Long enough response
        expect(result.feedback).toBeDefined();
      }
    });

    it('should complete assessment when all questions answered', async () => {
      const assessment = (engine as any).assessments.get(assessmentId);
      
      // Answer all questions
      for (const question of assessment.questions) {
        const result = await engine.submitAssessmentResponse(
          attemptId,
          question.id,
          question.correctAnswer || 'Sample answer for open-ended',
          30
        );

        if (question === assessment.questions[assessment.questions.length - 1]) {
          expect(result.isComplete).toBe(true);
        }
      }
    });
  });

  describe('generateProgressReport', () => {
    let studentId: string;
    let classroomId: string;

    beforeEach(async () => {
      studentId = 'student-123';
      classroomId = 'classroom-123';

      // Create and complete some assessments
      const assessment1 = await engine.createAutomatedAssessment(
        'Assessment 1',
        'First assessment',
        classroomId,
        'teacher-123',
        ['reading-comprehension'],
        'grade-3',
        'language-arts'
      );

      const attempt1 = await engine.startAssessmentAttempt(assessment1.id, studentId);
      
      // Complete the assessment
      for (const question of assessment1.questions) {
        await engine.submitAssessmentResponse(
          attempt1.id,
          question.id,
          question.correctAnswer || 'Good answer',
          30
        );
      }
    });

    it('should generate comprehensive progress report', async () => {
      const reportPeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const report = await engine.generateProgressReport(
        studentId,
        classroomId,
        reportPeriod
      );

      expect(report).toBeDefined();
      expect(report.studentId).toBe(studentId);
      expect(report.classroomId).toBe(classroomId);
      expect(report.reportPeriod).toEqual(reportPeriod);
      expect(report.overallProgress).toBeDefined();
      expect(report.overallProgress.averageScore).toBeGreaterThanOrEqual(0);
      expect(['improving', 'stable', 'declining']).toContain(report.overallProgress.improvementTrend);
      expect(['below-basic', 'basic', 'proficient', 'advanced']).toContain(report.overallProgress.masteryLevel);
      expect(['low', 'medium', 'high']).toContain(report.overallProgress.effortLevel);
      expect(report.learningObjectiveProgress).toBeInstanceOf(Array);
      expect(report.assessmentHistory).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should include learning objective progress', async () => {
      const reportPeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const report = await engine.generateProgressReport(
        studentId,
        classroomId,
        reportPeriod
      );

      expect(report.learningObjectiveProgress.length).toBeGreaterThan(0);
      
      report.learningObjectiveProgress.forEach(objective => {
        expect(objective.objectiveId).toBeDefined();
        expect(objective.objectiveName).toBeDefined();
        expect(objective.currentMastery).toBeGreaterThanOrEqual(0);
        expect(objective.currentMastery).toBeLessThanOrEqual(100);
        expect(['not-started', 'developing', 'approaching', 'proficient', 'advanced']).toContain(objective.progress);
        expect(['improving', 'stable', 'declining']).toContain(objective.trend);
      });
    });

    it('should include assessment history', async () => {
      const reportPeriod = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const report = await engine.generateProgressReport(
        studentId,
        classroomId,
        reportPeriod
      );

      expect(report.assessmentHistory.length).toBeGreaterThan(0);
      
      report.assessmentHistory.forEach(assessment => {
        expect(assessment.assessmentId).toBeDefined();
        expect(assessment.assessmentTitle).toBeDefined();
        expect(assessment.completedAt).toBeInstanceOf(Date);
        expect(assessment.score).toBeGreaterThanOrEqual(0);
        expect(assessment.percentage).toBeGreaterThanOrEqual(0);
        expect(assessment.grade).toBeDefined();
      });
    });
  });

  describe('calculateStandardsBasedGrade', () => {
    it('should calculate standards-based grade', async () => {
      const result = await engine.calculateStandardsBasedGrade(
        'student-123',
        'ccss-ela-3-1',
        'q1-2024'
      );

      expect(result).toBeDefined();
      expect(result.standard).toBeDefined();
      expect(result.standard.id).toBe('ccss-ela-3-1');
      expect(result.currentLevel).toBeDefined();
      expect(result.evidence).toBeInstanceOf(Array);
      expect(['improving', 'stable', 'declining']).toContain(result.trend);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should throw error for non-existent standard', async () => {
      await expect(
        engine.calculateStandardsBasedGrade('student-123', 'non-existent', 'q1-2024')
      ).rejects.toThrow('Standard non-existent not found');
    });

    it('should throw error for non-existent reporting period', async () => {
      await expect(
        engine.calculateStandardsBasedGrade('student-123', 'ccss-ela-3-1', 'non-existent')
      ).rejects.toThrow('Reporting period non-existent not found');
    });
  });

  describe('createStudentPortfolio', () => {
    it('should create student portfolio', async () => {
      const portfolio = await engine.createStudentPortfolio(
        'student-123',
        'classroom-123'
      );

      expect(portfolio).toBeDefined();
      expect(portfolio.studentId).toBe('student-123');
      expect(portfolio.classroomId).toBe('classroom-123');
      expect(portfolio.studentName).toBeDefined();
      expect(portfolio.artifacts).toEqual([]);
      expect(portfolio.reflections).toEqual([]);
      expect(portfolio.goals).toEqual([]);
      expect(portfolio.achievements).toEqual([]);
      expect(portfolio.createdAt).toBeInstanceOf(Date);
      expect(portfolio.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('addPortfolioArtifact', () => {
    let studentId: string;

    beforeEach(async () => {
      studentId = 'student-123';
      await engine.createStudentPortfolio(studentId, 'classroom-123');
    });

    it('should add artifact to portfolio', async () => {
      const artifact = await engine.addPortfolioArtifact(studentId, {
        type: 'story',
        title: 'My Adventure Story',
        description: 'A story about a brave knight',
        content: { text: 'Once upon a time...' },
        learningObjectives: ['creative-writing', 'narrative-structure'],
        tags: ['adventure', 'knight', 'brave'],
        isPublic: false,
        teacherComments: 'Great creativity!'
      });

      expect(artifact).toBeDefined();
      expect(artifact.id).toBeDefined();
      expect(artifact.type).toBe('story');
      expect(artifact.title).toBe('My Adventure Story');
      expect(artifact.dateCreated).toBeInstanceOf(Date);
      expect(artifact.learningObjectives).toEqual(['creative-writing', 'narrative-structure']);
      expect(artifact.tags).toEqual(['adventure', 'knight', 'brave']);
    });

    it('should throw error for non-existent portfolio', async () => {
      await expect(
        engine.addPortfolioArtifact('non-existent-student', {
          type: 'story',
          title: 'Test',
          description: 'Test',
          content: {},
          learningObjectives: [],
          tags: [],
          isPublic: false
        })
      ).rejects.toThrow('Portfolio for student non-existent-student not found');
    });
  });

  describe('exportDataForSIS', () => {
    it('should create data export request', async () => {
      const exportRequest = await engine.exportDataForSIS({
        requestedBy: 'teacher-123',
        exportType: 'student-data',
        filters: {
          studentIds: ['student-123', 'student-456'],
          classroomIds: ['classroom-123'],
          includePersonalData: false
        },
        format: 'csv'
      });

      expect(exportRequest).toBeDefined();
      expect(exportRequest.requestId).toBeDefined();
      expect(exportRequest.requestedBy).toBe('teacher-123');
      expect(exportRequest.exportType).toBe('student-data');
      expect(exportRequest.format).toBe('csv');
      expect(exportRequest.status).toBe('pending');
      expect(exportRequest.createdAt).toBeInstanceOf(Date);
    });

    it('should handle different export types', async () => {
      const exportTypes: Array<'student-data' | 'classroom-data' | 'assessment-results' | 'progress-reports' | 'portfolio'> = [
        'student-data',
        'classroom-data',
        'assessment-results',
        'progress-reports',
        'portfolio'
      ];

      for (const exportType of exportTypes) {
        const exportRequest = await engine.exportDataForSIS({
          requestedBy: 'teacher-123',
          exportType,
          filters: {},
          format: 'json'
        });

        expect(exportRequest.exportType).toBe(exportType);
      }
    });

    it('should handle different formats', async () => {
      const formats: Array<'csv' | 'json' | 'pdf' | 'excel'> = ['csv', 'json', 'pdf', 'excel'];

      for (const format of formats) {
        const exportRequest = await engine.exportDataForSIS({
          requestedBy: 'teacher-123',
          exportType: 'student-data',
          filters: {},
          format
        });

        expect(exportRequest.format).toBe(format);
      }
    });
  });

  describe('error handling', () => {
    it('should handle invalid assessment IDs', async () => {
      await expect(
        engine.startAssessmentAttempt('invalid-id', 'student-123')
      ).rejects.toThrow('Assessment invalid-id not found');
    });

    it('should handle invalid attempt IDs', async () => {
      await expect(
        engine.submitAssessmentResponse('invalid-attempt', 'question-1', 'answer', 30)
      ).rejects.toThrow('Attempt invalid-attempt not found');
    });
  });
});
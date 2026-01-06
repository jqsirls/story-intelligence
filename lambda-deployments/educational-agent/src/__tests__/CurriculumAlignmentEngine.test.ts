import { CurriculumAlignmentEngine } from '../services/CurriculumAlignmentEngine';
import { CurriculumAlignmentRequest } from '../types';

describe('CurriculumAlignmentEngine', () => {
  let engine: CurriculumAlignmentEngine;

  beforeEach(() => {
    engine = new CurriculumAlignmentEngine();
  });

  describe('analyzeAlignment', () => {
    it('should analyze story content alignment with curriculum standards', async () => {
      const request: CurriculumAlignmentRequest = {
        storyContent: 'Once upon a time, there was a little girl who loved phonological awareness. She practiced syllable identification and word segmentation with her teacher.',
        gradeLevel: 'kindergarten',
        subjectArea: 'language-arts'
      };

      const result = await engine.analyzeAlignment(request);

      expect(result.alignmentScore).toBeGreaterThan(0);
      expect(result.matchedObjectives).toBeDefined();
      expect(result.vocabularyLevel).toMatch(/below|appropriate|above/);
      expect(result.readabilityScore).toBeGreaterThan(0);
      expect(Array.isArray(result.suggestedModifications)).toBe(true);
    });

    it('should provide appropriate vocabulary level assessment', async () => {
      const simpleRequest: CurriculumAlignmentRequest = {
        storyContent: 'The cat sat on the mat. The cat was happy.',
        gradeLevel: 'grade-3',
        subjectArea: 'language-arts'
      };

      const result = await engine.analyzeAlignment(simpleRequest);
      expect(result.vocabularyLevel).toBe('below');
    });

    it('should suggest modifications for low alignment scores', async () => {
      const request: CurriculumAlignmentRequest = {
        storyContent: 'A story with no educational content whatsoever.',
        gradeLevel: 'grade-2',
        subjectArea: 'science'
      };

      const result = await engine.analyzeAlignment(request);
      expect(result.suggestedModifications.length).toBeGreaterThan(0);
    });
  });

  describe('getAlignedTemplates', () => {
    it('should return templates matching grade level and subject', async () => {
      const templates = await engine.getAlignedTemplates('kindergarten', 'language-arts');
      
      expect(Array.isArray(templates)).toBe(true);
      templates.forEach(template => {
        expect(template.gradeLevel).toBe('kindergarten');
        expect(template.subjectArea).toBe('language-arts');
        expect(template.isActive).toBe(true);
      });
    });

    it('should filter by specific learning objectives when provided', async () => {
      const templates = await engine.getAlignedTemplates(
        'grade-1', 
        'mathematics', 
        ['specific-objective-id']
      );
      
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('createAlignedTemplate', () => {
    it('should create a custom template aligned to specific objectives', async () => {
      const template = await engine.createAlignedTemplate(
        'Custom Math Story',
        'grade-2',
        'mathematics',
        ['math-objective-1', 'math-objective-2']
      );

      expect(template.title).toBe('Custom Math Story');
      expect(template.gradeLevel).toBe('grade-2');
      expect(template.subjectArea).toBe('mathematics');
      expect(template.learningObjectives).toEqual(['math-objective-1', 'math-objective-2']);
      expect(template.isActive).toBe(true);
    });
  });

  describe('filterEducationalContent', () => {
    it('should filter content for educational appropriateness', async () => {
      const content = 'This is a scary story about fighting monsters in a terrifying battle.';
      
      const result = await engine.filterEducationalContent(content, 'grade-2', 'strict');
      
      expect(result.filtered).not.toContain('scary');
      expect(result.filtered).not.toContain('fighting');
      expect(result.filtered).not.toContain('terrifying');
      expect(result.modifications.length).toBeGreaterThan(0);
    });

    it('should simplify vocabulary when needed', async () => {
      const content = 'The protagonist will utilize advanced methodologies to demonstrate comprehension.';
      
      const result = await engine.filterEducationalContent(content, 'grade-1');
      
      expect(result.filtered).toContain('use');
      expect(result.filtered).toContain('show');
      expect(result.filtered).toContain('understand');
    });

    it('should enhance educational value when low', async () => {
      const content = 'A simple story with no learning elements.';
      
      const result = await engine.filterEducationalContent(content, 'grade-3');
      
      expect(result.modifications).toContain('Enhanced educational value');
    });
  });

  describe('trackObjectiveProgress', () => {
    it('should track learning objective progress for students', async () => {
      // This is a void method, so we just ensure it doesn't throw
      await expect(
        engine.trackObjectiveProgress('student-123', 'objective-456', 85, {
          interactionCount: 10,
          choicesMade: 5
        })
      ).resolves.not.toThrow();
    });
  });
});
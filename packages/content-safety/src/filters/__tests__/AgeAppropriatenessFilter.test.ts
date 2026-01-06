import { AgeAppropriatenessFilter } from '../AgeAppropriatenessFilter';
import OpenAI from 'openai';
import { Logger } from 'winston';
import { ContentSafetyRequest } from '../../types';

// Mock OpenAI and ContextualSafetyAnalyzer
jest.mock('openai');
jest.mock('../ContextualSafetyAnalyzer');

describe('AgeAppropriatenessFilter', () => {
  let filter: AgeAppropriatenessFilter;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOpenAI = {} as any;
    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    filter = new AgeAppropriatenessFilter(mockOpenAI as any, mockLogger);
  });

  describe('G rating (0-4 years)', () => {
    it('should block inappropriate content for G rating', async () => {
      const request: ContentSafetyRequest = {
        content: 'A scary monster with blood',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 3
      };

      // Mock contextual analyzer to return safe content
      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: false,
        riskLevel: 'low',
        categories: [],
        reasoning: '',
        confidence: 0.8,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(false);
      expect(result.warnings.some(w => w.includes('G rating'))).toBe(true);
    });

    it('should allow simple, age-appropriate content for G rating', async () => {
      const request: ContentSafetyRequest = {
        content: 'A friendly cat plays with a ball',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 4
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: false,
        riskLevel: 'low',
        categories: [],
        reasoning: '',
        confidence: 0.9,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe('PG rating (4-6 years)', () => {
    it('should allow action sequences for PG rating', async () => {
      const request: ContentSafetyRequest = {
        content: 'The hero fought bravely to save the day',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 5
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: false,
        riskLevel: 'low',
        categories: [],
        reasoning: 'Action sequence allowed',
        confidence: 0.8,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: true, context: 'action', allowed: true },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      // Action should be allowed (fight removed from prohibited words)
      expect(result.allowed).toBe(true);
    });
  });

  describe('PG-13 rating (7+ years)', () => {
    it('should allow more complex content for PG-13 rating', async () => {
      const request: ContentSafetyRequest = {
        content: 'The adventure begins with exciting action',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 8
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: false,
        riskLevel: 'low',
        categories: [],
        reasoning: '',
        confidence: 0.8,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Universal prohibitions', () => {
    it('should block sexual content for all ages', async () => {
      const request: ContentSafetyRequest = {
        content: 'Explicit sexual content',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 10
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: true,
        riskLevel: 'high',
        categories: ['sexual'],
        reasoning: 'Sexual content detected',
        confidence: 0.95,
        contextualFlags: {
          nudity: { detected: true, context: 'human', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
    });

    it('should block romantic intent for all ages', async () => {
      const request: ContentSafetyRequest = {
        content: 'They kissed romantically',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 6
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: true,
        riskLevel: 'high',
        categories: ['romance'],
        reasoning: 'Romantic intent detected',
        confidence: 0.9,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: true, intent: 'romantic', allowed: false },
          gore: { detected: false, context: 'none', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(false);
    });

    it('should block gore/blood for all ages', async () => {
      const request: ContentSafetyRequest = {
        content: 'Graphic violence with blood and gore',
        contentType: 'story',
        userId: 'test-user',
        sessionId: 'test-session',
        userAge: 8
      };

      const mockAnalyzer = (filter as any).contextualAnalyzer;
      mockAnalyzer.analyzeContextualSafety = jest.fn().mockResolvedValue({
        isInappropriate: true,
        riskLevel: 'high',
        categories: ['gore'],
        reasoning: 'Graphic violence detected',
        confidence: 0.95,
        contextualFlags: {
          nudity: { detected: false, context: 'none', allowed: false },
          romance: { detected: false, intent: 'none', allowed: false },
          gore: { detected: true, context: 'graphic', allowed: false },
          silliness: { detected: false, context: 'none', allowed: false }
        }
      });

      const result = await filter.filter(request);

      expect(result.allowed).toBe(false);
      expect(result.riskLevel).toBe('high');
    });
  });
});

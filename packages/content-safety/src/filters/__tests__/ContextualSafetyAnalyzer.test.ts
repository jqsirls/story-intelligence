import { ContextualSafetyAnalyzer } from '../ContextualSafetyAnalyzer';
import OpenAI from 'openai';
import { Logger } from 'winston';

// Mock OpenAI
jest.mock('openai');

describe('ContextualSafetyAnalyzer', () => {
  let analyzer: ContextualSafetyAnalyzer;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    analyzer = new ContextualSafetyAnalyzer(mockOpenAI as any, mockLogger);
  });

  describe('analyzeContextualSafety', () => {
    it('should detect human nudity and block it', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              riskLevel: 'high',
              categories: ['nudity'],
              reasoning: 'Human nudity detected',
              confidence: 0.9,
              contextualFlags: {
                nudity: { detected: true, context: 'human', allowed: false },
                romance: { detected: false, intent: 'none', allowed: false },
                gore: { detected: false, context: 'none', allowed: false },
                silliness: { detected: false, context: 'none', allowed: false }
              }
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeContextualSafety('A naked person', 5, 'story');

      expect(result.isInappropriate).toBe(true);
      expect(result.contextualFlags.nudity.detected).toBe(true);
      expect(result.contextualFlags.nudity.allowed).toBe(false);
    });

    it('should allow non-human nudity in comedic contexts', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              riskLevel: 'low',
              categories: [],
              reasoning: 'Silly dog in comedic context',
              confidence: 0.8,
              contextualFlags: {
                nudity: { detected: true, context: 'non-human', allowed: true },
                romance: { detected: false, intent: 'none', allowed: false },
                gore: { detected: false, context: 'none', allowed: false },
                silliness: { detected: true, context: 'playful', allowed: true }
              }
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeContextualSafety('A silly dog laughing because it\'s naked', 5, 'story');

      expect(result.isInappropriate).toBe(false);
      expect(result.contextualFlags.nudity.detected).toBe(true);
      expect(result.contextualFlags.nudity.allowed).toBe(true);
    });

    it('should detect romantic intent and block it', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
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
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeContextualSafety('They were boyfriend and girlfriend and kissed', 5, 'story');

      expect(result.isInappropriate).toBe(true);
      expect(result.contextualFlags.romance.detected).toBe(true);
      expect(result.contextualFlags.romance.allowed).toBe(false);
    });

    it('should allow innocent "boyfriend/girlfriend" meaning friend', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              riskLevel: 'low',
              categories: [],
              reasoning: 'Innocent friendship language',
              confidence: 0.85,
              contextualFlags: {
                nudity: { detected: false, context: 'none', allowed: false },
                romance: { detected: true, intent: 'innocent', allowed: true },
                gore: { detected: false, context: 'none', allowed: false },
                silliness: { detected: false, context: 'none', allowed: false }
              }
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeContextualSafety('My boyfriend helped me with my homework', 5, 'story');

      expect(result.isInappropriate).toBe(false);
      expect(result.contextualFlags.romance.detected).toBe(true);
      expect(result.contextualFlags.romance.allowed).toBe(true);
    });

    it('should distinguish action sequences from graphic violence', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              riskLevel: 'low',
              categories: [],
              reasoning: 'Action sequence, not graphic violence',
              confidence: 0.8,
              contextualFlags: {
                nudity: { detected: false, context: 'none', allowed: false },
                romance: { detected: false, intent: 'none', allowed: false },
                gore: { detected: true, context: 'action', allowed: true },
                silliness: { detected: false, context: 'none', allowed: false }
              }
            })
          }
        }]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeContextualSafety('The hero fought bravely to save the day', 7, 'story');

      expect(result.isInappropriate).toBe(false);
      expect(result.contextualFlags.gore.detected).toBe(true);
      expect(result.contextualFlags.gore.allowed).toBe(true);
    });

    it('should return conservative analysis on error', async () => {
      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(new Error('API error'));

      const result = await analyzer.analyzeContextualSafety('test content', 5, 'story');

      expect(result.isInappropriate).toBe(true);
      expect(result.riskLevel).toBe('high');
      expect(result.categories).toContain('analysis_error');
    });
  });
});

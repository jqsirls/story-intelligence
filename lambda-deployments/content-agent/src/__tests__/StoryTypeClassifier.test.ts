import { StoryTypeClassifier } from '../services/StoryTypeClassifier';
import { StoryClassificationRequest } from '../types';
import OpenAI from 'openai';
import { createLogger } from 'winston';

// Mock OpenAI
jest.mock('openai');
const MockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('StoryTypeClassifier', () => {
  let classifier: StoryTypeClassifier;
  let mockOpenAI: jest.Mocked<OpenAI>;
  let logger: any;

  beforeEach(() => {
    logger = createLogger({ silent: true });
    mockOpenAI = new MockedOpenAI() as jest.Mocked<OpenAI>;
    classifier = new StoryTypeClassifier(mockOpenAI, logger);
  });

  describe('classifyStoryIntent', () => {
    it('should classify adventure story correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Adventure',
                confidence: 0.9,
                reasoning: 'User mentioned exploration and quest'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'I want to go on an adventure and find treasure',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.classifyStoryIntent(request);

      expect(result.storyType).toBe('Adventure');
      expect(result.confidence).toBe(0.9);
      expect(result.reasoning).toContain('exploration');
    });

    it('should classify bedtime story correctly', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Bedtime',
                confidence: 0.95,
                reasoning: 'User wants a calming story for sleep'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Tell me a gentle story to help me sleep',
        userId: 'user123',
        sessionId: 'session123',
        context: {
          currentPhase: 'greeting',
          userAge: 5
        }
      };

      const result = await classifier.classifyStoryIntent(request);

      expect(result.storyType).toBe('Bedtime');
      expect(result.confidence).toBe(0.95);
    });

    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('API Error'))
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Tell me a story',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.classifyStoryIntent(request);

      expect(result.storyType).toBe('Adventure'); // Default fallback
      expect(result.confidence).toBe(0.5);
      expect(result.reasoning).toContain('Default classification');
    });

    it('should include context in classification', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Educational',
                confidence: 0.8,
                reasoning: 'User wants to learn about numbers'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'I want to learn about counting',
        userId: 'user123',
        sessionId: 'session123',
        context: {
          currentPhase: 'story',
          userAge: 4,
          emotionalState: 'curious',
          previousMessages: ['Hello', 'What kind of story?']
        }
      };

      await classifier.classifyStoryIntent(request);

      const createCall = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0];
      const userPrompt = createCall.messages[1].content;

      expect(userPrompt).toContain('User age: 4');
      expect(userPrompt).toContain('Emotional state: curious');
      expect(userPrompt).toContain('Previous messages');
    });
  });

  describe('routeStoryType', () => {
    it('should proceed when confidence is high', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Adventure',
                confidence: 0.9,
                reasoning: 'Clear adventure intent'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Adventure story please',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.routeStoryType(request);

      expect(result.shouldProceed).toBe(true);
      expect(result.storyType).toBe('Adventure');
      expect(result.clarificationNeeded).toBeUndefined();
    });

    it('should ask for clarification when confidence is low', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Adventure',
                confidence: 0.5,
                reasoning: 'Unclear intent',
                alternativeTypes: [
                  { type: 'Educational', confidence: 0.4 },
                  { type: 'Bedtime', confidence: 0.3 }
                ]
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Tell me something',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.routeStoryType(request);

      expect(result.shouldProceed).toBe(false);
      expect(result.storyType).toBe('Adventure');
      expect(result.clarificationNeeded).toContain('Adventure');
      expect(result.clarificationNeeded).toContain('Educational');
    });
  });

  describe('validation', () => {
    it('should validate story type enum', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'InvalidType',
                confidence: 0.9,
                reasoning: 'Test'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Test input',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.classifyStoryIntent(request);

      // Should fall back to default on validation error
      expect(result.storyType).toBe('Adventure');
      expect(result.confidence).toBe(0.5);
    });

    it('should validate confidence range', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              arguments: JSON.stringify({
                storyType: 'Adventure',
                confidence: 1.5, // Invalid confidence > 1
                reasoning: 'Test'
              })
            }
          }
        }]
      };

      mockOpenAI.chat = {
        completions: {
          create: jest.fn().mockResolvedValue(mockResponse)
        }
      } as any;

      const request: StoryClassificationRequest = {
        userInput: 'Test input',
        userId: 'user123',
        sessionId: 'session123'
      };

      const result = await classifier.classifyStoryIntent(request);

      // Should fall back to default on validation error
      expect(result.storyType).toBe('Adventure');
      expect(result.confidence).toBe(0.5);
    });
  });
});
import { InappropriateContentHandler } from '../services/InappropriateContentHandler';
import { InappropriateContentRequest, InappropriateCategory } from '../types';

// Mock dependencies
jest.mock('openai');
jest.mock('winston');

describe('InappropriateContentHandler', () => {
  let handler: InappropriateContentHandler;
  let mockOpenAI: any;
  let mockLogger: any;

  beforeEach(() => {
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    };

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    };

    handler = new InappropriateContentHandler(mockOpenAI, mockLogger);
  });

  describe('handleInappropriateContent', () => {
    it('should detect and handle violent content', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-123',
        sessionId: 'test-session-456',
        userAge: 8,
        userInput: 'I want to make a story where the hero kills all the bad guys with a sword',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['violence'],
              severity: 'moderate',
              confidence: 0.8,
              reasoning: 'Content contains violent themes inappropriate for children'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.VIOLENCE);
      expect(result.severity).toBe('moderate');
      expect(result.redirectionResponse).toContain('solve problems peacefully');
      expect(result.educationalOpportunity).toBeDefined();
      expect(result.educationalOpportunity?.topic).toBe('Conflict Resolution and Kindness');
      expect(result.escalationRequired).toBe(false);
      expect(result.patternConcern).toBe(false);
    });

    it('should detect and handle sexual content', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-789',
        sessionId: 'test-session-101',
        userAge: 7,
        userInput: 'Can we make a story about kissing and romantic stuff?',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['sexual_content'],
              severity: 'mild',
              confidence: 0.7,
              reasoning: 'Romantic content inappropriate for child\'s age'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.SEXUAL_CONTENT);
      expect(result.severity).toBe('severe'); // Sexual content gets elevated severity
      expect(result.redirectionResponse).toContain('when you\'re older');
      expect(result.educationalOpportunity?.topic).toBe('Body Safety and Privacy');
    });

    it('should detect and handle profanity', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-456',
        sessionId: 'test-session-789',
        userAge: 9,
        userInput: 'I want my character to say damn and stupid to everyone',
        conversationContext: [],
        previousInappropriateRequests: 1,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['profanity'],
              severity: 'mild',
              confidence: 0.6,
              reasoning: 'Contains mild profanity inappropriate for children\'s stories'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.PROFANITY);
      expect(result.redirectionResponse).toContain('positive');
      expect(result.educationalOpportunity?.topic).toBe('Respectful Communication');
    });

    it('should detect dangerous activities', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-321',
        sessionId: 'test-session-654',
        userAge: 6,
        userInput: 'Let\'s make a story about playing with fire and matches',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['dangerous_activities'],
              severity: 'moderate',
              confidence: 0.9,
              reasoning: 'Content promotes dangerous activities with fire'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.DANGEROUS_ACTIVITIES);
      expect(result.redirectionResponse).toContain('Safety first');
      expect(result.educationalOpportunity?.topic).toBe('Safety and Risk Assessment');
    });

    it('should handle scary content for young children', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-555',
        sessionId: 'test-session-888',
        userAge: 4,
        userInput: 'I want a really scary monster that gives nightmares',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['scary_content'],
              severity: 'moderate',
              confidence: 0.8,
              reasoning: 'Scary content inappropriate for young child\'s age'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.SCARY_CONTENT);
      expect(result.redirectionResponse).toContain('exciting but not scary');
      expect(result.educationalOpportunity?.topic).toBe('Age-Appropriate Content');
    });

    it('should handle personal information requests', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-777',
        sessionId: 'test-session-999',
        userAge: 8,
        userInput: 'Can I put my real address and phone number in the story?',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['personal_information'],
              severity: 'moderate',
              confidence: 0.9,
              reasoning: 'Request for sharing personal information'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.PERSONAL_INFORMATION);
      expect(result.redirectionResponse).toContain('positive');
      expect(result.educationalOpportunity?.topic).toBe('Privacy and Internet Safety');
    });

    it('should detect pattern concerns with multiple inappropriate requests', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-888',
        sessionId: 'test-session-111',
        userAge: 10,
        userInput: 'Let\'s make another violent fighting story',
        conversationContext: ['Previous violent request', 'Another inappropriate request'],
        previousInappropriateRequests: 2,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['violence'],
              severity: 'moderate',
              confidence: 0.8,
              reasoning: 'Repeated violent content requests'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.patternConcern).toBe(true);
      expect(result.escalationRequired).toBe(false); // Not severe enough yet
    });

    it('should require escalation for severe content', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-999',
        sessionId: 'test-session-222',
        userAge: 7,
        userInput: 'I want to make a story with really bad adult stuff',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['sexual_content'],
              severity: 'severe',
              confidence: 0.9,
              reasoning: 'Severe inappropriate content request'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.severity).toBe('severe');
      expect(result.escalationRequired).toBe(true);
    });

    it('should require escalation after multiple inappropriate requests', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-000',
        sessionId: 'test-session-333',
        userAge: 9,
        userInput: 'Another inappropriate request',
        conversationContext: [],
        previousInappropriateRequests: 3, // Threshold reached
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['violence'],
              severity: 'moderate',
              confidence: 0.7,
              reasoning: 'Pattern of inappropriate requests'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.escalationRequired).toBe(true);
      expect(result.patternConcern).toBe(true);
    });

    it('should handle appropriate content correctly', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-111',
        sessionId: 'test-session-444',
        userAge: 8,
        userInput: 'I want to create a happy story about friendship and adventure',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              categories: [],
              severity: 'mild',
              confidence: 0.9,
              reasoning: 'Content is appropriate for children'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(false);
      expect(result.inappropriateCategories).toHaveLength(0);
      expect(result.escalationRequired).toBe(false);
      expect(result.patternConcern).toBe(false);
      expect(result.educationalOpportunity).toBeUndefined();
    });

    it('should adapt responses for younger children', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-222',
        sessionId: 'test-session-555',
        userAge: 5, // Young child
        userInput: 'I want fighting in my story',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['violence'],
              severity: 'moderate',
              confidence: 0.8,
              reasoning: 'Violent content inappropriate for young child'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.redirectionResponse).toContain('everyone is kind and safe');
      // Should use simpler language for younger children
      expect(result.redirectionResponse).not.toContain('complex');
    });

    it('should handle multiple inappropriate categories', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-333',
        sessionId: 'test-session-666',
        userAge: 10,
        userInput: 'I want a scary violent story with bad words',
        conversationContext: [],
        previousInappropriateRequests: 1,
        timestamp: new Date().toISOString()
      };

      // Mock AI analysis response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: true,
              categories: ['violence', 'profanity', 'scary_content'],
              severity: 'severe',
              confidence: 0.9,
              reasoning: 'Multiple inappropriate content categories detected'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(true);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.VIOLENCE);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.PROFANITY);
      expect(result.inappropriateCategories).toContain(InappropriateCategory.SCARY_CONTENT);
      expect(result.severity).toBe('severe');
      expect(result.escalationRequired).toBe(true);
    });
  });

  describe('health check', () => {
    it('should return true when service is healthy', async () => {
      // Mock successful AI call
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              categories: [],
              severity: 'mild',
              confidence: 0.9,
              reasoning: 'Health check successful'
            })
          }
        }]
      });

      const result = await handler.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when AI service fails', async () => {
      // Mock failed AI call
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await handler.healthCheck();
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('InappropriateContentHandler health check failed', { error: expect.any(Error) });
    });
  });

  describe('edge cases', () => {
    it('should handle AI service failure gracefully', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-444',
        sessionId: 'test-session-777',
        userAge: 8,
        userInput: 'Test input',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI failure
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('AI service down'));

      const result = await handler.handleInappropriateContent(request);

      // Should still return a safe result
      expect(result.isInappropriate).toBe(false);
      expect(result.redirectionResponse).toContain('amazing story');
    });

    it('should handle malformed AI response gracefully', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-555',
        sessionId: 'test-session-888',
        userAge: 8,
        userInput: 'Test input',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock malformed AI response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      // Should fall back to pattern detection only
      expect(result).toBeDefined();
      expect(result.redirectionResponse).toBeDefined();
    });

    it('should handle empty user input', async () => {
      const request: InappropriateContentRequest = {
        userId: 'test-user-666',
        sessionId: 'test-session-999',
        userAge: 8,
        userInput: '',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI response for empty input
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              categories: [],
              severity: 'mild',
              confidence: 0.1,
              reasoning: 'Empty input is not inappropriate'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result.isInappropriate).toBe(false);
      expect(result.inappropriateCategories).toHaveLength(0);
    });

    it('should handle very long user input', async () => {
      const longInput = 'This is a very long input '.repeat(100);
      const request: InappropriateContentRequest = {
        userId: 'test-user-777',
        sessionId: 'test-session-000',
        userAge: 8,
        userInput: longInput,
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      // Mock AI response
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              isInappropriate: false,
              categories: [],
              severity: 'mild',
              confidence: 0.5,
              reasoning: 'Long but appropriate content'
            })
          }
        }]
      });

      const result = await handler.handleInappropriateContent(request);

      expect(result).toBeDefined();
      expect(result.redirectionResponse).toBeDefined();
    });
  });
});
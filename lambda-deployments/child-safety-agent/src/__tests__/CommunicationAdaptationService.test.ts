import { CommunicationAdaptationService } from '../services/CommunicationAdaptationService';
import { CommunicationAdaptationRequest } from '../types';

// Mock dependencies
jest.mock('openai');
jest.mock('winston');

describe('CommunicationAdaptationService', () => {
  let service: CommunicationAdaptationService;
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

    service = new CommunicationAdaptationService(mockOpenAI, mockLogger);
  });

  describe('adaptMessage', () => {
    it('should adapt message for autism with structured approach', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-123',
        userAge: 8,
        specialNeeds: [{
          type: 'autism',
          severity: 'moderate',
          accommodations: ['structured_approach', 'clear_instructions']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 20,
          processingDelay: 2000,
          preferredInteractionStyle: 'structured',
          triggerWords: ['loud', 'sudden'],
          comfortTopics: ['animals', 'trains']
        },
        currentMessage: 'Let\'s create an amazing story with a character who goes on adventures and meets friends!',
        context: 'Story creation introduction'
      };

      // Mock AI response for vocabulary adaptation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Let\'s make a story. We will pick a character. The character will go places and meet friends.'
          }
        }]
      });

      // Mock AI response for tone adaptation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'Let\'s make a story. First, we will pick a character. Then, the character will go to places. The character will meet friends.'
          }
        }]
      });

      const result = await service.adaptMessage(request);

      expect(result.adaptedMessage).toContain('First');
      expect(result.adaptationsMade.length).toBeGreaterThan(0);
      expect(result.estimatedProcessingTime).toBeGreaterThan(2000); // Should account for processing delay
      expect(result.engagementStrategy).toBe('structured_and_predictable');
      expect(result.followUpSuggestions).toContain('I can break this down into smaller steps if helpful');
    });

    it('should adapt message for ADHD with dynamic engagement', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-456',
        userAge: 10,
        specialNeeds: [{
          type: 'adhd',
          severity: 'mild',
          accommodations: ['frequent_breaks', 'varied_activities']
        }],
        communicationProfile: {
          preferredPace: 'fast',
          vocabularyLevel: 'standard',
          attentionSpan: 15,
          processingDelay: 500,
          preferredInteractionStyle: 'playful',
          triggerWords: ['boring', 'wait'],
          comfortTopics: ['games', 'sports']
        },
        currentMessage: 'Now we need to think carefully about what your character looks like and what they want to do in the story.',
        context: 'Character creation'
      };

      const result = await service.adaptMessage(request);

      expect(result.engagementStrategy).toBe('dynamic_and_engaging');
      expect(result.followUpSuggestions).toContain('We can take breaks whenever you need');
      expect(result.followUpSuggestions).toContain('Feel free to ask questions if your mind wanders');
    });

    it('should adapt message for speech delay with extended processing time', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-789',
        userAge: 6,
        specialNeeds: [{
          type: 'speech_delay',
          severity: 'severe',
          accommodations: ['extra_time', 'simple_language']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 30,
          processingDelay: 5000,
          preferredInteractionStyle: 'gentle',
          triggerWords: ['fast', 'hurry'],
          comfortTopics: ['family', 'pets']
        },
        currentMessage: 'What kind of character would you like to create for your story?',
        context: 'Character selection'
      };

      // Mock AI response for vocabulary adaptation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'What kind of person do you want in your story?'
          }
        }]
      });

      const result = await service.adaptMessage(request);

      expect(result.estimatedProcessingTime).toBeGreaterThan(10000); // Should be significantly higher for severe speech delay
      expect(result.engagementStrategy).toBe('patient_and_slow_paced');
      expect(result.followUpSuggestions).toContain('You can take as long as you need to respond');
      expect(result.followUpSuggestions).toContain('I can repeat anything if you need me to');
    });

    it('should adapt message for anxiety disorder with calm approach', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-101',
        userAge: 9,
        specialNeeds: [{
          type: 'anxiety_disorder',
          severity: 'moderate',
          accommodations: ['reassurance', 'predictable_structure']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'standard',
          attentionSpan: 25,
          processingDelay: 1500,
          preferredInteractionStyle: 'gentle',
          triggerWords: ['wrong', 'mistake', 'bad'],
          comfortTopics: ['nature', 'books']
        },
        currentMessage: 'Don\'t worry if you make a mistake - we can always change things later!',
        context: 'Reassurance during story creation'
      };

      // Mock AI response for tone adaptation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'It\'s okay to try different ideas - we can explore and adjust as we go!'
          }
        }]
      });

      const result = await service.adaptMessage(request);

      expect(result.engagementStrategy).toBe('calm_and_reassuring');
      expect(result.followUpSuggestions).toContain('There\'s no pressure to respond quickly');
      expect(result.followUpSuggestions).toContain('Remember, there are no wrong answers');
    });

    it('should adapt message for cognitive delay with simple structure', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-202',
        userAge: 7,
        specialNeeds: [{
          type: 'cognitive_delay',
          severity: 'moderate',
          accommodations: ['simple_steps', 'repetition']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 10,
          processingDelay: 3000,
          preferredInteractionStyle: 'structured',
          triggerWords: ['complicated', 'difficult'],
          comfortTopics: ['colors', 'shapes']
        },
        currentMessage: 'Let\'s think about what your character looks like, what they wear, and what makes them special.',
        context: 'Character appearance'
      };

      // Mock AI response for vocabulary adaptation
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'What does your character look like?'
          }
        }]
      });

      const result = await service.adaptMessage(request);

      expect(result.engagementStrategy).toBe('simple_and_repetitive');
      expect(result.estimatedProcessingTime).toBeGreaterThan(6000); // Should account for cognitive processing needs
      expect(result.adaptedMessage.length).toBeLessThan(request.currentMessage.length); // Should be simplified
    });

    it('should adapt message for motor difficulties with flexible timing', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-303',
        userAge: 11,
        specialNeeds: [{
          type: 'motor_difficulties',
          severity: 'mild',
          accommodations: ['extra_time', 'no_time_pressure']
        }],
        communicationProfile: {
          preferredPace: 'normal',
          vocabularyLevel: 'standard',
          attentionSpan: 40,
          processingDelay: 1000,
          preferredInteractionStyle: 'gentle',
          triggerWords: ['quick', 'fast'],
          comfortTopics: ['music', 'art']
        },
        currentMessage: 'Take your time to think about your answer - there\'s no rush at all.',
        context: 'Patient encouragement'
      };

      const result = await service.adaptMessage(request);

      expect(result.engagementStrategy).toBe('flexible_timing');
      expect(result.followUpSuggestions).toContain('Take your time to think about it');
    });

    it('should handle multiple special needs with appropriate prioritization', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-404',
        userAge: 8,
        specialNeeds: [
          {
            type: 'autism',
            severity: 'mild',
            accommodations: ['structured_approach']
          },
          {
            type: 'anxiety_disorder',
            severity: 'severe',
            accommodations: ['reassurance', 'calm_environment']
          }
        ],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 20,
          processingDelay: 2000,
          preferredInteractionStyle: 'gentle',
          triggerWords: ['wrong', 'mistake'],
          comfortTopics: ['animals']
        },
        currentMessage: 'Let\'s create your character step by step.',
        context: 'Multi-need adaptation'
      };

      const result = await service.adaptMessage(request);

      // Should prioritize the more severe need (anxiety disorder)
      expect(result.engagementStrategy).toBe('calm_and_reassuring');
      expect(result.followUpSuggestions).toContain('Take your time to think about it');
    });

    it('should handle short attention span with length adaptation', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-505',
        userAge: 5,
        specialNeeds: [{
          type: 'adhd',
          severity: 'moderate',
          accommodations: ['short_segments']
        }],
        communicationProfile: {
          preferredPace: 'normal',
          vocabularyLevel: 'simple',
          attentionSpan: 10, // Very short attention span
          processingDelay: 500,
          preferredInteractionStyle: 'playful',
          triggerWords: ['long', 'boring'],
          comfortTopics: ['games']
        },
        currentMessage: 'Now let\'s think about creating a wonderful character for your story. We can choose what they look like, what they wear, what they like to do, and what makes them special and unique in your amazing adventure story.',
        context: 'Long message that needs shortening'
      };

      const result = await service.adaptMessage(request);

      expect(result.adaptedMessage.length).toBeLessThan(request.currentMessage.length);
      expect(result.adaptationsMade.some(a => a.type === 'length')).toBe(true);
    });

    it('should handle processing disorder with clear structure', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-606',
        userAge: 9,
        specialNeeds: [{
          type: 'processing_disorder',
          severity: 'moderate',
          accommodations: ['clear_instructions', 'processing_time']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'standard',
          attentionSpan: 30,
          processingDelay: 4000,
          preferredInteractionStyle: 'structured',
          triggerWords: ['confusing', 'unclear'],
          comfortTopics: ['science', 'nature']
        },
        currentMessage: 'What do you think about making your character someone who loves exploring?',
        context: 'Character trait suggestion'
      };

      const result = await service.adaptMessage(request);

      expect(result.engagementStrategy).toBe('patient_and_slow_paced');
      expect(result.followUpSuggestions).toContain('Take all the time you need to process this');
      expect(result.followUpSuggestions).toContain('I can say this in a different way if it helps');
      expect(result.estimatedProcessingTime).toBeGreaterThan(8000); // Should account for processing disorder
    });
  });

  describe('health check', () => {
    it('should return true when service is healthy', async () => {
      // Mock successful AI call
      mockOpenAI.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: {
            content: 'This is a simple test message.'
          }
        }]
      });

      const result = await service.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false when AI service fails', async () => {
      // Mock failed AI call for the adaptVocabulary method called by healthCheck
      mockOpenAI.chat.completions.create.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await service.healthCheck();
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('CommunicationAdaptationService health check failed', { error: expect.any(Error) });
    });
  });

  describe('edge cases', () => {
    it('should handle empty special needs array', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-707',
        userAge: 8,
        specialNeeds: [],
        communicationProfile: {
          preferredPace: 'normal',
          vocabularyLevel: 'standard',
          attentionSpan: 30,
          processingDelay: 0,
          preferredInteractionStyle: 'gentle',
          triggerWords: [],
          comfortTopics: ['stories']
        },
        currentMessage: 'What kind of story would you like to create?',
        context: 'No special needs'
      };

      const result = await service.adaptMessage(request);

      expect(result.adaptedMessage).toBe(request.currentMessage);
      expect(result.adaptationsMade).toHaveLength(0);
      expect(result.engagementStrategy).toBe('patient_and_supportive');
    });

    it('should handle AI service failure gracefully', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-808',
        userAge: 7,
        specialNeeds: [{
          type: 'autism',
          severity: 'mild',
          accommodations: ['structured_approach']
        }],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 25,
          processingDelay: 1000,
          preferredInteractionStyle: 'structured',
          triggerWords: [],
          comfortTopics: ['animals']
        },
        currentMessage: 'Let\'s create a character together.',
        context: 'AI failure test'
      };

      // Mock AI failure
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('AI service down'));

      const result = await service.adaptMessage(request);

      // Should still return a result with basic adaptations
      expect(result.adaptedMessage).toBeDefined();
      expect(result.estimatedProcessingTime).toBeGreaterThan(0);
      expect(result.engagementStrategy).toBe('structured_and_predictable');
    });

    it('should calculate processing time correctly for severe needs', async () => {
      const request: CommunicationAdaptationRequest = {
        userId: 'test-user-909',
        userAge: 6,
        specialNeeds: [
          {
            type: 'cognitive_delay',
            severity: 'severe',
            accommodations: ['extra_time']
          },
          {
            type: 'speech_delay',
            severity: 'severe',
            accommodations: ['processing_time']
          }
        ],
        communicationProfile: {
          preferredPace: 'slow',
          vocabularyLevel: 'simple',
          attentionSpan: 15,
          processingDelay: 3000,
          preferredInteractionStyle: 'gentle',
          triggerWords: [],
          comfortTopics: ['toys']
        },
        currentMessage: 'What is your character\'s name?',
        context: 'Severe processing needs'
      };

      const result = await service.adaptMessage(request);

      // Should have significantly increased processing time for multiple severe needs
      expect(result.estimatedProcessingTime).toBeGreaterThan(15000);
    });
  });
});
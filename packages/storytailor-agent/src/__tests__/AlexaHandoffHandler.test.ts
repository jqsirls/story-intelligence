import { AlexaHandoffHandler } from '../services/AlexaHandoffHandler';

describe('AlexaHandoffHandler', () => {
  let handler: AlexaHandoffHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new AlexaHandoffHandler();
  });

  describe('handleTurnContext', () => {
    it('should process Alexa turn context successfully', async () => {
      const turnContext = {
        request: {
          type: 'IntentRequest',
          intent: {
            name: 'CreateStoryIntent',
            slots: {
              storyType: { value: 'bedtime' }
            }
          }
        },
        session: {
          sessionId: 'session-123',
          user: { userId: 'user-456' }
        },
        context: {
          System: {
            user: { userId: 'user-456' },
            device: { deviceId: 'device-789' }
          }
        }
      };

      const result = await handler.handleTurnContext(turnContext);

      expect(result).toEqual({
        intent: 'CreateStoryIntent',
        parameters: { storyType: 'bedtime' },
        userId: 'user-456',
        sessionId: 'session-123',
        deviceId: 'device-789'
      });
    });

    it('should handle launch requests', async () => {
      const turnContext = {
        request: {
          type: 'LaunchRequest'
        },
        session: {
          sessionId: 'session-123',
          user: { userId: 'user-456' }
        },
        context: {
          System: {
            user: { userId: 'user-456' },
            device: { deviceId: 'device-789' }
          }
        }
      };

      const result = await handler.handleTurnContext(turnContext);

      expect(result.intent).toBe('LaunchRequest');
    });

    it('should handle session end requests', async () => {
      const turnContext = {
        request: {
          type: 'SessionEndedRequest',
          reason: 'USER_INITIATED'
        },
        session: {
          sessionId: 'session-123',
          user: { userId: 'user-456' }
        },
        context: {
          System: {
            user: { userId: 'user-456' },
            device: { deviceId: 'device-789' }
          }
        }
      };

      const result = await handler.handleTurnContext(turnContext);

      expect(result.intent).toBe('SessionEndedRequest');
      expect(result.parameters.reason).toBe('USER_INITIATED');
    });
  });

  describe('extractSlots', () => {
    it('should extract slot values correctly', () => {
      const slots = {
        storyType: { value: 'adventure' },
        characterName: { value: 'Luna' },
        emptySlot: {}
      };

      const result = handler.extractSlots(slots);

      expect(result).toEqual({
        storyType: 'adventure',
        characterName: 'Luna'
      });
    });

    it('should handle empty slots object', () => {
      const result = handler.extractSlots({});
      expect(result).toEqual({});
    });

    it('should handle undefined slots', () => {
      const result = handler.extractSlots(undefined);
      expect(result).toEqual({});
    });
  });

  describe('validateTurnContext', () => {
    it('should validate valid turn context', () => {
      const turnContext = {
        request: { type: 'IntentRequest' },
        session: { sessionId: 'session-123', user: { userId: 'user-456' } },
        context: { System: { user: { userId: 'user-456' } } }
      };

      expect(() => handler.validateTurnContext(turnContext)).not.toThrow();
    });

    it('should throw error for invalid turn context', () => {
      const invalidContext = {
        request: { type: 'IntentRequest' }
        // Missing session and context
      };

      expect(() => handler.validateTurnContext(invalidContext)).toThrow('Invalid turn context');
    });
  });

  describe('error handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const malformedContext = {
        request: null,
        session: { sessionId: 'session-123' }
      };

      await expect(handler.handleTurnContext(malformedContext)).rejects.toThrow();
    });

    it('should handle missing user ID', async () => {
      const contextWithoutUser = {
        request: { type: 'IntentRequest' },
        session: { sessionId: 'session-123' },
        context: { System: {} }
      };

      await expect(handler.handleTurnContext(contextWithoutUser)).rejects.toThrow();
    });
  });
});
import { ConversationInterruptionHandler, InterruptionType } from '../services/ConversationInterruptionHandler';
import { ConversationPhase, IntentType, StoryType } from '../types';
import { createClient } from 'redis';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';

// Mock Redis
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  })),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({ error: null })),
    })),
  })),
}));

describe('ConversationInterruptionHandler', () => {
  jest.setTimeout(10000); // 10 second timeout
  
  let handler: ConversationInterruptionHandler;
  let mockRedis: any;
  let mockSupabase: any;
  let mockLogger: Logger;

  const mockConfig = {
    redis: {
      url: 'redis://localhost:6379',
      keyPrefix: 'test',
      checkpointTtl: 3600,
      interruptionTtl: 7200,
    },
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-key',
    },
    checkpointing: {
      enabled: true,
      autoCheckpointInterval: 300,
      maxCheckpointsPerSession: 5,
      criticalPhases: [ConversationPhase.STORY_BUILDING, ConversationPhase.CHARACTER_CREATION],
    },
    recovery: {
      maxRecoveryAttempts: 3,
      recoveryTimeoutMs: 30000,
      gracefulRecoveryEnabled: true,
    },
    multiUser: {
      enabled: true,
      userSwitchTimeoutMs: 5000,
      maxConcurrentUsers: 4,
    },
  };

  beforeEach(async () => {
    // Clean up previous handler if exists
    if (handler) {
      try {
        await handler.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }

    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    mockSupabase = {
      from: jest.fn(() => ({
        upsert: jest.fn(() => ({ error: null })),
      })),
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as any;

    (createClient as jest.Mock).mockReturnValue(mockRedis);
    (createSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    handler = new ConversationInterruptionHandler(mockConfig, mockLogger);
  });

  afterEach(async () => {
    if (handler) {
      try {
        await handler.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Ensure all handlers are properly shut down
    if (handler) {
      try {
        await handler.shutdown();
      } catch (error) {
        // Ignore shutdown errors in tests
      }
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await handler.initialize();

      expect(mockRedis.connect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('ConversationInterruptionHandler initialized successfully');
    });

    it('should handle initialization errors', async () => {
      const error = new Error('Redis connection failed');
      mockRedis.connect.mockRejectedValue(error);

      await expect(handler.initialize()).rejects.toThrow(error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize ConversationInterruptionHandler',
        { error: 'Redis connection failed' }
      );
    });
  });

  describe('checkpoint creation', () => {
    const mockMemoryState = {
      userId: 'user-123',
      sessionId: 'session-456',
      conversationPhase: ConversationPhase.CHARACTER_CREATION,
      currentStoryId: 'story-789',
      currentCharacterId: 'char-101',
      storyType: StoryType.ADVENTURE,
      lastIntent: IntentType.CREATE_CHARACTER,
      context: {
        characterDetails: { name: 'Luna', species: 'unicorn' },
        currentBeat: 1,
        storyOutline: { theme: 'friendship' },
        narrativeChoices: [],
        plotPoints: [],
        conversationHistory: [],
        lastUserInput: 'Create a unicorn character',
        lastAgentResponse: 'Great! Let\'s create Luna the unicorn.',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    };

    it('should create a checkpoint successfully', async () => {
      await handler.initialize();
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.keys.mockResolvedValue([]);

      const checkpoint = await handler.createCheckpoint(mockMemoryState);

      expect(checkpoint).toBeDefined();
      expect(checkpoint.sessionId).toBe('session-456');
      expect(checkpoint.userId).toBe('user-123');
      expect(checkpoint.conversationPhase).toBe(ConversationPhase.CHARACTER_CREATION);
      expect(checkpoint.storyState.characterDetails).toEqual({ name: 'Luna', species: 'unicorn' });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('test:checkpoint:checkpoint_session-456_'),
        3600,
        expect.any(String)
      );
    });

    it('should persist critical phase checkpoints to Supabase', async () => {
      await handler.initialize();
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.keys.mockResolvedValue([]);

      const criticalMemoryState = {
        ...mockMemoryState,
        conversationPhase: ConversationPhase.STORY_BUILDING,
      };

      await handler.createCheckpoint(criticalMemoryState);

      expect(mockSupabase.from).toHaveBeenCalledWith('conversation_checkpoints');
    });

    it('should clean up old checkpoints', async () => {
      await handler.initialize();
      mockRedis.setEx.mockResolvedValue('OK');
      mockRedis.keys.mockResolvedValue([
        'test:checkpoint:checkpoint_session-456_1000',
        'test:checkpoint:checkpoint_session-456_2000',
        'test:checkpoint:checkpoint_session-456_3000',
        'test:checkpoint:checkpoint_session-456_4000',
        'test:checkpoint:checkpoint_session-456_5000',
        'test:checkpoint:checkpoint_session-456_6000', // This should be deleted
      ]);
      mockRedis.del.mockResolvedValue(1);

      await handler.createCheckpoint(mockMemoryState);

      expect(mockRedis.del).toHaveBeenCalledWith('test:checkpoint:checkpoint_session-456_1000');
    });
  });

  describe('interruption handling', () => {
    it('should handle user stop interruption', async () => {
      await handler.initialize();
      
      const mockCheckpoint = {
        checkpointId: 'checkpoint-123',
        sessionId: 'session-456',
        userId: 'user-123',
        timestamp: new Date(),
        conversationPhase: ConversationPhase.STORY_BUILDING,
        storyState: {
          lastCompleteAction: 'story_beat_1_completed',
          pendingActions: ['continue_story_narration'],
        },
        conversationContext: {
          lastUserInput: 'Continue the story',
          lastAgentResponse: 'Luna walked into the magical forest...',
          lastIntent: IntentType.CONTINUE_STORY,
          conversationHistory: [],
        },
        userContext: {
          primaryUserId: 'user-123',
          activeUsers: ['user-123'],
        },
      };

      mockRedis.keys.mockResolvedValue(['test:checkpoint:checkpoint_session-456_123']);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCheckpoint));
      mockRedis.setEx.mockResolvedValue('OK');

      const interruption = await handler.handleInterruption(
        'session-456',
        'user-123',
        InterruptionType.USER_STOP
      );

      expect(interruption).toBeDefined();
      expect(interruption.interruptionType).toBe(InterruptionType.USER_STOP);
      expect(interruption.sessionId).toBe('session-456');
      expect(interruption.userId).toBe('user-123');
      expect(interruption.resumptionPrompt).toContain('You stopped our conversation earlier');

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringContaining('test:interruption:interruption_session-456_'),
        7200,
        expect.any(String)
      );
    });

    it('should handle device switch interruption', async () => {
      await handler.initialize();
      
      const mockCheckpoint = {
        checkpointId: 'checkpoint-123',
        sessionId: 'session-456',
        userId: 'user-123',
        timestamp: new Date(),
        conversationPhase: ConversationPhase.CHARACTER_CREATION,
        storyState: {
          characterDetails: { name: 'Luna' },
          lastCompleteAction: 'character_details_collected',
          pendingActions: [],
        },
        conversationContext: {
          lastUserInput: 'Her name is Luna',
          lastAgentResponse: 'Luna is a beautiful name!',
          lastIntent: IntentType.CREATE_CHARACTER,
          conversationHistory: [],
        },
        userContext: {
          primaryUserId: 'user-123',
          activeUsers: ['user-123'],
        },
      };

      mockRedis.keys.mockResolvedValue(['test:checkpoint:checkpoint_session-456_123']);
      mockRedis.get.mockResolvedValue(JSON.stringify(mockCheckpoint));
      mockRedis.setEx.mockResolvedValue('OK');

      const interruption = await handler.handleInterruption(
        'session-456',
        'user-123',
        InterruptionType.DEVICE_SWITCH,
        {},
        {
          deviceId: 'echo-show-456',
          deviceType: 'screen',
          capabilities: ['voice', 'display'],
        }
      );

      expect(interruption.resumptionPrompt).toContain('I see you\'re on a different device now');
      expect(interruption.metadata?.deviceContext).toBeDefined();
    });
  });

  describe('interruption recovery', () => {
    it('should recover from interruption successfully', async () => {
      await handler.initialize();
      
      const mockInterruption = {
        interruptionId: 'interruption-123',
        sessionId: 'session-456',
        userId: 'user-123',
        interruptionType: InterruptionType.TIMEOUT,
        timestamp: new Date(),
        checkpointId: 'checkpoint-123',
        resumptionPrompt: 'Welcome back!',
        contextSnapshot: {},
        recoveryAttempts: 0,
        maxRecoveryAttempts: 3,
        isRecovered: false,
      };

      const mockCheckpoint = {
        checkpointId: 'checkpoint-123',
        sessionId: 'session-456',
        userId: 'user-123',
        timestamp: new Date(),
        conversationPhase: ConversationPhase.STORY_BUILDING,
        storyState: {
          storyId: 'story-789',
          characterId: 'char-101',
          storyType: StoryType.ADVENTURE,
          currentBeat: 2,
          storyOutline: { theme: 'adventure' },
          characterDetails: { name: 'Luna' },
          narrativeChoices: [],
          plotPoints: [],
          lastCompleteAction: 'story_beat_2_completed',
          pendingActions: ['continue_story_narration'],
        },
        conversationContext: {
          lastUserInput: 'What happens next?',
          lastAgentResponse: 'Luna discovered a hidden cave...',
          lastIntent: IntentType.CONTINUE_STORY,
          conversationHistory: [],
        },
        userContext: {
          primaryUserId: 'user-123',
          activeUsers: ['user-123'],
        },
      };

      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockInterruption))
        .mockResolvedValueOnce(JSON.stringify(mockCheckpoint));
      mockRedis.setEx.mockResolvedValue('OK');

      const newTurnContext = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        userInput: 'Continue my story',
        channel: 'alexa' as const,
        locale: 'en-US',
        timestamp: new Date().toISOString(),
      };

      const result = await handler.recoverFromInterruption('interruption-123', newTurnContext);

      expect(result.success).toBe(true);
      expect(result.memoryState).toBeDefined();
      expect(result.memoryState?.conversationPhase).toBe(ConversationPhase.STORY_BUILDING);
      expect(result.memoryState?.currentStoryId).toBe('story-789');
      expect(result.memoryState?.context.recoveredFromCheckpoint).toBe(true);
      expect(result.resumptionPrompt).toBe('Welcome back!');
    });

    it('should fail recovery when interruption not found', async () => {
      await handler.initialize();
      mockRedis.get.mockResolvedValue(null);

      const newTurnContext = {
        userId: 'user-123',
        sessionId: 'session-456',
        requestId: 'req-789',
        userInput: 'Continue my story',
        channel: 'alexa' as const,
        locale: 'en-US',
        timestamp: new Date().toISOString(),
      };

      const result = await handler.recoverFromInterruption('interruption-123', newTurnContext);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Interruption state not found');
    });
  });

  describe('multi-user context separation', () => {
    it('should separate user contexts successfully', async () => {
      await handler.initialize();
      mockRedis.setEx.mockResolvedValue('OK');

      const userContexts = {
        'user-123': {
          personalContext: { conversationPhase: ConversationPhase.STORY_BUILDING },
          storyPreferences: { genre: 'adventure' },
          emotionalState: { mood: 'happy' },
        },
        'user-456': {
          personalContext: { conversationPhase: ConversationPhase.CHARACTER_CREATION },
          storyPreferences: { genre: 'bedtime' },
          emotionalState: { mood: 'calm' },
        },
      };

      await handler.separateUserContext(
        'session-789',
        'user-123',
        ['user-123', 'user-456'],
        userContexts
      );

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'test:user_separation:session-789',
        7200,
        expect.any(String)
      );

      expect(mockLogger.info).toHaveBeenCalledWith('User context separated', {
        sessionId: 'session-789',
        primaryUserId: 'user-123',
        totalUsers: 2,
        separationId: expect.any(String),
      });
    });

    it('should reject too many concurrent users', async () => {
      await handler.initialize();
      const tooManyUsers = Array.from({ length: 6 }, (_, i) => `user-${i}`);
      const userContexts = {};

      await expect(
        handler.separateUserContext('session-789', 'user-0', tooManyUsers, userContexts)
      ).rejects.toThrow('Too many concurrent users');
    });
  });

  describe('user context switching', () => {
    it('should switch user context successfully', async () => {
      await handler.initialize();
      
      const mockMemoryState = {
        userId: 'user-123',
        sessionId: 'session-456',
        conversationPhase: ConversationPhase.STORY_BUILDING,
        currentStoryId: 'story-789',
        currentCharacterId: 'char-101',
        storyType: StoryType.ADVENTURE,
        lastIntent: IntentType.CONTINUE_STORY,
        context: {
          storyPreferences: { genre: 'adventure' },
          emotionalState: { mood: 'excited' },
          activeUsers: ['user-123', 'user-456'],
          userSeparation: {},
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      const mockCheckpoint = {
        checkpointId: 'checkpoint-123',
        sessionId: 'session-456',
        userId: 'user-123',
        timestamp: new Date(),
        conversationPhase: ConversationPhase.STORY_BUILDING,
        storyState: {
          lastCompleteAction: 'story_building_started',
          pendingActions: [],
        },
        conversationContext: {
          lastUserInput: 'Continue story',
          lastAgentResponse: 'Story continues...',
          lastIntent: IntentType.CONTINUE_STORY,
          conversationHistory: [],
        },
        userContext: {
          primaryUserId: 'user-123',
          activeUsers: ['user-123', 'user-456'],
        },
      };

      const mockSeparationData = {
        sessionId: 'session-456',
        primaryUserId: 'user-123',
        allUserIds: ['user-123', 'user-456'],
        userContexts: {
          'user-456': {
            personalContext: {
              conversationPhase: ConversationPhase.CHARACTER_CREATION,
              currentStoryId: 'story-abc',
              storyType: StoryType.BEDTIME,
              lastIntent: IntentType.CREATE_CHARACTER,
            },
            storyPreferences: { genre: 'bedtime' },
            emotionalState: { mood: 'calm' },
          },
        },
        timestamp: new Date(),
      };

      // Set up all the mocks in the correct order
      mockRedis.setEx.mockResolvedValue('OK');
      
      // Mock for checkpoint creation (keys call for cleanup, then setEx)
      mockRedis.keys
        .mockResolvedValueOnce([]) // For checkpoint cleanup during createCheckpoint
        .mockResolvedValueOnce(['test:checkpoint:checkpoint_session-456_123']); // For getLatestCheckpoint
      
      // Mock for getting latest checkpoint and user separation data
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockCheckpoint)) // Latest checkpoint
        .mockResolvedValueOnce(JSON.stringify(mockSeparationData)); // User separation data

      const result = await handler.switchUserContext(
        'session-456',
        'user-123',
        'user-456',
        mockMemoryState
      );

      expect(result.success).toBe(true);
      expect(result.updatedMemoryState).toBeDefined();
      expect(result.updatedMemoryState?.userId).toBe('user-456');
      expect(result.updatedMemoryState?.conversationPhase).toBe(ConversationPhase.CHARACTER_CREATION);
      expect(result.updatedMemoryState?.currentStoryId).toBe('story-abc');
      expect(result.updatedMemoryState?.storyType).toBe(StoryType.BEDTIME);
      expect(result.interruptionId).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully', async () => {
      await handler.initialize();
      await handler.shutdown();

      expect(mockRedis.disconnect).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('ConversationInterruptionHandler shutdown completed');
    });
  });
});
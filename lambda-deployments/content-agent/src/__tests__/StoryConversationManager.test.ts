import { StoryConversationManager } from '../services/StoryConversationManager';
import { StoryCreationService } from '../services/StoryCreationService';
import { RedisClientType } from 'redis';

// Mock dependencies
jest.mock('redis');
jest.mock('../services/StoryCreationService');

describe('StoryConversationManager', () => {
  let manager: StoryConversationManager;
  let mockRedis: jest.Mocked<RedisClientType>;
  let mockLogger: any;
  let mockStoryCreationService: jest.Mocked<StoryCreationService>;

  beforeEach(() => {
    mockRedis = {
      setEx: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      keys: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockStoryCreationService = {
      createStoryDraft: jest.fn(),
      continueStoryBeat: jest.fn(),
      editStoryViaVoice: jest.fn(),
      finalizeStory: jest.fn()
    } as any;

    manager = new StoryConversationManager(
      mockRedis,
      mockLogger,
      mockStoryCreationService
    );
  });

  describe('startStoryConversation', () => {
    it('should start a new story conversation session', async () => {
      const mockStoryDraft = {
        id: 'draft-123',
        characterId: 'char-123',
        storyType: 'Adventure',
        outline: 'Hero\'s journey outline...',
        currentBeat: 0,
        choices: [
          { id: 'choice-1', text: 'Explore the forest', consequence: 'You enter the forest' },
          { id: 'choice-2', text: 'Meet new friends', consequence: 'You look for friends' }
        ]
      };

      mockStoryCreationService.createStoryDraft.mockResolvedValue(mockStoryDraft);
      mockRedis.setEx.mockResolvedValue('OK' as any);

      const result = await manager.startStoryConversation(
        'user-123',
        'lib-123',
        'char-123',
        'Adventure',
        6
      );

      expect(result).toMatchObject({
        sessionId: expect.stringMatching(/^story_conv_/),
        agentResponse: expect.stringContaining('excited to create'),
        choices: mockStoryDraft.choices,
        phase: 'setup',
        isComplete: false
      });

      expect(mockStoryCreationService.createStoryDraft).toHaveBeenCalledWith({
        characterId: 'char-123',
        storyType: 'Adventure',
        userAge: 6
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^story_conversation:/),
        24 * 60 * 60,
        expect.any(String)
      );

      expect(mockLogger.info).toHaveBeenCalledWith('Starting story conversation', {
        userId: 'user-123',
        libraryId: 'lib-123',
        characterId: 'char-123',
        storyType: 'Adventure'
      });
    });
  });

  describe('continueStoryConversation', () => {
    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      libraryId: 'lib-123',
      characterId: 'char-123',
      storyType: 'Adventure',
      phase: 'setup',
      currentBeat: 0,
      storyDraft: { id: 'draft-123' },
      conversationHistory: [],
      choices: [
        { id: 'choice-1', text: 'Explore the forest', consequence: 'You enter the forest' }
      ],
      lastActivity: new Date().toISOString(),
      ageContext: 6
    };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));
    });

    it('should handle setup phase and transition to creation', async () => {
      const mockBeatResult = {
        beat: {
          id: 'beat-1',
          sequence: 1,
          content: 'You step into the magical forest and see sparkling lights...',
          emotionalTone: 'adventurous'
        },
        choices: [
          { id: 'choice-2', text: 'Follow the lights', consequence: 'You chase the lights' }
        ],
        isComplete: false
      };

      mockStoryCreationService.continueStoryBeat.mockResolvedValue(mockBeatResult);

      const result = await manager.continueStoryConversation(
        'session-123',
        'I want to explore the forest!',
        6
      );

      expect(result).toMatchObject({
        sessionId: 'session-123',
        agentResponse: expect.stringContaining('magical forest'),
        storyBeat: mockBeatResult.beat,
        choices: mockBeatResult.choices,
        phase: 'creation',
        isComplete: false
      });

      expect(mockStoryCreationService.continueStoryBeat).toHaveBeenCalledWith({
        storyId: 'draft-123',
        userChoice: 'Explore the forest',
        voiceInput: 'I want to explore the forest!'
      });
    });

    it('should handle creation phase with story continuation', async () => {
      const creationSession = { ...mockSession, phase: 'creation', currentBeat: 1 };
      mockRedis.get.mockResolvedValue(JSON.stringify(creationSession));

      const mockBeatResult = {
        beat: {
          id: 'beat-2',
          sequence: 2,
          content: 'The lights lead you to a clearing with a wise old owl...',
          emotionalTone: 'mysterious'
        },
        choices: [
          { id: 'choice-3', text: 'Talk to the owl', consequence: 'You approach the owl' }
        ],
        isComplete: false
      };

      mockStoryCreationService.continueStoryBeat.mockResolvedValue(mockBeatResult);

      const result = await manager.continueStoryConversation(
        'session-123',
        'Follow the lights',
        6
      );

      expect(result.phase).toBe('creation');
      expect(result.storyBeat.content).toContain('wise old owl');
    });

    it('should handle story completion and transition to finalization', async () => {
      const creationSession = { ...mockSession, phase: 'creation', currentBeat: 11 };
      mockRedis.get.mockResolvedValue(JSON.stringify(creationSession));

      const mockBeatResult = {
        beat: {
          id: 'beat-12',
          sequence: 12,
          content: 'And so your adventure comes to an end...',
          emotionalTone: 'peaceful'
        },
        choices: [],
        isComplete: true
      };

      mockStoryCreationService.continueStoryBeat.mockResolvedValue(mockBeatResult);

      const result = await manager.continueStoryConversation(
        'session-123',
        'Return home with wisdom',
        6
      );

      expect(result.phase).toBe('finalization');
      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationType).toBe('story_finalization');
      expect(result.agentResponse).toContain('amazing story we\'ve created');
    });

    it('should handle edit requests during creation', async () => {
      const creationSession = { ...mockSession, phase: 'creation' };
      mockRedis.get.mockResolvedValue(JSON.stringify(creationSession));

      const mockEditResult = {
        updatedBeats: [],
        affectedCharacters: ['char-123'],
        narrativeChanges: ['Changed character to dragon']
      };

      mockStoryCreationService.editStoryViaVoice.mockResolvedValue(mockEditResult);

      const result = await manager.continueStoryConversation(
        'session-123',
        'Actually, can we change the character to a dragon?',
        6
      );

      expect(result.phase).toBe('creation');
      expect(result.needsConfirmation).toBe(true);
      expect(result.confirmationType).toBe('major_edit');
      expect(result.agentResponse).toContain('made those changes');

      expect(mockStoryCreationService.editStoryViaVoice).toHaveBeenCalledWith({
        storyId: 'draft-123',
        voiceCommand: 'Actually, can we change the character to a dragon?'
      });
    });

    it('should handle finalization confirmation', async () => {
      const finalizationSession = { ...mockSession, phase: 'finalization' };
      mockRedis.get.mockResolvedValue(JSON.stringify(finalizationSession));

      const mockFinalStory = {
        id: 'story-123',
        title: 'The Forest Adventure',
        status: 'final'
      };

      mockStoryCreationService.finalizeStory.mockResolvedValue(mockFinalStory);

      const result = await manager.continueStoryConversation(
        'session-123',
        'Yes, I love it!',
        6
      );

      expect(result.isComplete).toBe(true);
      expect(result.agentResponse).toContain('saving your amazing story');

      expect(mockStoryCreationService.finalizeStory).toHaveBeenCalledWith(
        'draft-123',
        true
      );
    });

    it('should handle finalization rejection', async () => {
      const finalizationSession = { ...mockSession, phase: 'finalization' };
      mockRedis.get.mockResolvedValue(JSON.stringify(finalizationSession));

      const result = await manager.continueStoryConversation(
        'session-123',
        'No, I want to change something',
        6
      );

      expect(result.phase).toBe('creation');
      expect(result.isComplete).toBe(false);
      expect(result.agentResponse).toContain('keep working on your story');
    });

    it('should throw error for non-existent session', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(
        manager.continueStoryConversation('non-existent', 'test input')
      ).rejects.toThrow('Story conversation session not found');
    });
  });

  describe('choice matching', () => {
    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      libraryId: 'lib-123',
      characterId: 'char-123',
      storyType: 'Adventure',
      phase: 'setup',
      currentBeat: 0,
      storyDraft: { id: 'draft-123' },
      conversationHistory: [],
      choices: [
        { id: 'choice-1', text: 'Explore the magical forest', consequence: 'You enter the forest' },
        { id: 'choice-2', text: 'Meet friendly animals', consequence: 'You look for animals' },
        { id: 'choice-3', text: 'Find hidden treasure', consequence: 'You search for treasure' }
      ],
      lastActivity: new Date().toISOString(),
      ageContext: 6
    };

    beforeEach(() => {
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));
      mockStoryCreationService.continueStoryBeat.mockResolvedValue({
        beat: { id: 'beat-1', sequence: 1, content: 'Story continues...', emotionalTone: 'neutral' },
        choices: [],
        isComplete: false
      });
    });

    it('should match choices by number', async () => {
      await manager.continueStoryConversation('session-123', '2', 6);

      expect(mockStoryCreationService.continueStoryBeat).toHaveBeenCalledWith({
        storyId: 'draft-123',
        userChoice: 'Meet friendly animals',
        voiceInput: '2'
      });
    });

    it('should match choices by keywords', async () => {
      await manager.continueStoryConversation('session-123', 'I want to find treasure', 6);

      expect(mockStoryCreationService.continueStoryBeat).toHaveBeenCalledWith({
        storyId: 'draft-123',
        userChoice: 'Find hidden treasure',
        voiceInput: 'I want to find treasure'
      });
    });

    it('should handle free-form input when no choice matches', async () => {
      await manager.continueStoryConversation('session-123', 'I want to dance with unicorns', 6);

      expect(mockStoryCreationService.continueStoryBeat).toHaveBeenCalledWith({
        storyId: 'draft-123',
        userChoice: null,
        voiceInput: 'I want to dance with unicorns'
      });
    });
  });

  describe('age-appropriate responses', () => {
    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      libraryId: 'lib-123',
      characterId: 'char-123',
      storyType: 'Adventure',
      phase: 'setup',
      currentBeat: 0,
      storyDraft: { id: 'draft-123' },
      conversationHistory: [],
      choices: [],
      lastActivity: new Date().toISOString()
    };

    it('should use age-appropriate language for young children', async () => {
      const youngSession = { ...mockSession, ageContext: 4 };
      mockRedis.get.mockResolvedValue(JSON.stringify(youngSession));
      mockStoryCreationService.continueStoryBeat.mockResolvedValue({
        beat: { id: 'beat-1', sequence: 1, content: 'Story...', emotionalTone: 'happy' },
        choices: [{ id: 'choice-1', text: 'Do something', consequence: 'Something happens' }],
        isComplete: false
      });

      const result = await manager.continueStoryConversation('session-123', 'test', 4);

      expect(result.agentResponse).toContain('Ooh!');
    });

    it('should use age-appropriate language for older children', async () => {
      const olderSession = { ...mockSession, ageContext: 8 };
      mockRedis.get.mockResolvedValue(JSON.stringify(olderSession));
      mockStoryCreationService.continueStoryBeat.mockResolvedValue({
        beat: { id: 'beat-1', sequence: 1, content: 'Story...', emotionalTone: 'adventurous' },
        choices: [{ id: 'choice-1', text: 'Do something', consequence: 'Something happens' }],
        isComplete: false
      });

      const result = await manager.continueStoryConversation('session-123', 'test', 8);

      expect(result.agentResponse).toContain('Here\'s where it gets interesting!');
    });
  });

  describe('session management', () => {
    it('should get conversation session details', async () => {
      const mockSession = { id: 'session-123', userId: 'user-123' };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await manager.getConversationSession('session-123');

      expect(result).toEqual(mockSession);
      expect(mockRedis.get).toHaveBeenCalledWith('story_conversation:session-123');
    });

    it('should get conversation history', async () => {
      const mockSession = {
        conversationHistory: [
          { timestamp: '2023-01-01T00:00:00Z', speaker: 'user', content: 'Hello', type: 'choice_selection' },
          { timestamp: '2023-01-01T00:01:00Z', speaker: 'agent', content: 'Hi there!', type: 'story_beat' }
        ]
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(mockSession));

      const result = await manager.getConversationHistory('session-123');

      expect(result).toEqual(mockSession.conversationHistory);
    });

    it('should end conversation session', async () => {
      await manager.endConversationSession('session-123');

      expect(mockRedis.del).toHaveBeenCalledWith('story_conversation:session-123');
      expect(mockLogger.info).toHaveBeenCalledWith('Story conversation session ended', {
        sessionId: 'session-123'
      });
    });

    it('should get user conversation sessions', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-123' },
        { id: 'session-2', userId: 'user-456' },
        { id: 'session-3', userId: 'user-123' }
      ];

      mockRedis.keys.mockResolvedValue(['story_conversation:session-1', 'story_conversation:session-2', 'story_conversation:session-3']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockSessions[0]))
        .mockResolvedValueOnce(JSON.stringify(mockSessions[1]))
        .mockResolvedValueOnce(JSON.stringify(mockSessions[2]));

      const result = await manager.getUserConversationSessions('user-123');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-123');
      expect(result[1].userId).toBe('user-123');
    });

    it('should clean up expired sessions', async () => {
      const now = new Date();
      const expired = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recent = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      const mockSessions = [
        { id: 'session-1', lastActivity: expired.toISOString() },
        { id: 'session-2', lastActivity: recent.toISOString() }
      ];

      mockRedis.keys.mockResolvedValue(['story_conversation:session-1', 'story_conversation:session-2']);
      mockRedis.get
        .mockResolvedValueOnce(JSON.stringify(mockSessions[0]))
        .mockResolvedValueOnce(JSON.stringify(mockSessions[1]));

      const result = await manager.cleanupExpiredSessions();

      expect(result).toBe(1);
      expect(mockRedis.del).toHaveBeenCalledWith('story_conversation:session-1');
      expect(mockRedis.del).not.toHaveBeenCalledWith('story_conversation:session-2');
    });
  });
});
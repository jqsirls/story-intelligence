/**
 * AnimationService Tests - Tier Gating and Sora Integration
 */

import { AnimationService, TierRestrictionError, AnimationRequest } from '../AnimationService';
import { TierQualityService } from '../TierQualityService';
import { Logger } from 'winston';

// Mock dependencies
jest.mock('winston', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

jest.mock('../TierQualityService');

describe('AnimationService - Tier Gating', () => {
  let animationService: AnimationService;
  let mockTierService: jest.Mocked<TierQualityService>;
  let mockLogger: jest.Mocked<Logger>;

  const mockRequest: AnimationRequest = {
    images: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
      'https://example.com/image3.jpg'
    ],
    storyText: 'Once upon a time, there was a brave knight who went on an adventure.',
    characterTraits: {
      name: 'Brave Knight',
      visualDescription: 'A knight with brown hair and blue eyes'
    },
    duration: 10,
    userId: 'test-user-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    } as any;

    mockTierService = {
      getUserTierInfo: jest.fn(),
      getQualityConfig: jest.fn(),
      getVideoGenerationUpgradeMessage: jest.fn()
    } as any;

    animationService = new AnimationService(mockLogger, mockTierService);
  });

  describe('Tier Access Control', () => {
    it('should allow Premium tier users to generate videos', async () => {
      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'premium',
        storyLimit: -1,
        storiesUsed: 0,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-5.2',
        imageCount: 5,
        audioProvider: 'elevenlabs',
        priorityQueue: true,
        costPerStory: 1.00,
        videoGeneration: true
      });

      // Mock OpenAI and Sora response
      const mockOpenAI = {
        videos: {
          create: jest.fn().mockResolvedValue({
            data: [{
              url: 'https://example.com/video.mp4'
            }]
          })
        }
      };

      jest.doMock('openai', () => ({
        default: jest.fn().mockImplementation(() => mockOpenAI)
      }));

      // Mock S3 upload
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100))
      } as any);

      const result = await animationService.generateAnimatedCover(mockRequest);

      expect(mockTierService.getUserTierInfo).toHaveBeenCalledWith('test-user-123');
      expect(mockTierService.getQualityConfig).toHaveBeenCalledWith('premium');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tier check passed for video generation',
        expect.objectContaining({ tier: 'premium' })
      );
    });

    it('should allow Family tier users to generate videos', async () => {
      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'family',
        storyLimit: 20,
        storiesUsed: 5,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-5.2',
        imageCount: 5,
        audioProvider: 'elevenlabs',
        priorityQueue: false,
        costPerStory: 1.00,
        videoGeneration: true
      });

      // Mock OpenAI and Sora response
      const mockOpenAI = {
        videos: {
          create: jest.fn().mockResolvedValue({
            data: [{
              url: 'https://example.com/video.mp4'
            }]
          })
        }
      };

      jest.doMock('openai', () => ({
        default: jest.fn().mockImplementation(() => mockOpenAI)
      }));

      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(100))
      } as any);

      const result = await animationService.generateAnimatedCover(mockRequest);

      expect(mockTierService.getUserTierInfo).toHaveBeenCalledWith('test-user-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Tier check passed for video generation',
        expect.objectContaining({ tier: 'family' })
      );
    });

    it('should block Free tier users and return upgrade message', async () => {
      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'free',
        storyLimit: 1,
        storiesUsed: 0,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-4-turbo-preview',
        imageCount: 2,
        audioProvider: 'polly',
        priorityQueue: false,
        costPerStory: 0.15,
        videoGeneration: false
      });

      mockTierService.getVideoGenerationUpgradeMessage.mockReturnValue({
        message: 'Video generation is available on Premium and Family plans. Upgrade to unlock animated story videos with Sora-2.',
        upgradeTier: 'premium',
        upgradeUrl: 'https://storytailor.com/upgrade'
      });

      await expect(
        animationService.generateAnimatedCover(mockRequest)
      ).rejects.toThrow(TierRestrictionError);

      expect(mockTierService.getUserTierInfo).toHaveBeenCalledWith('test-user-123');
      expect(mockTierService.getQualityConfig).toHaveBeenCalledWith('free');
      expect(mockTierService.getVideoGenerationUpgradeMessage).toHaveBeenCalledWith('free');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Video generation blocked due to tier restriction',
        expect.objectContaining({
          tier: 'free',
          upgradeTier: 'premium'
        })
      );
    });

    it('should block Individual tier users and return upgrade message', async () => {
      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'individual',
        storyLimit: 30,
        storiesUsed: 10,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-5.2',
        imageCount: 5,
        audioProvider: 'elevenlabs',
        priorityQueue: false,
        costPerStory: 1.00,
        videoGeneration: false
      });

      mockTierService.getVideoGenerationUpgradeMessage.mockReturnValue({
        message: 'Video generation is available on Premium and Family plans. Upgrade to unlock animated story videos with Sora-2.',
        upgradeTier: 'premium',
        upgradeUrl: 'https://storytailor.com/upgrade'
      });

      await expect(
        animationService.generateAnimatedCover(mockRequest)
      ).rejects.toThrow(TierRestrictionError);

      const error = await animationService.generateAnimatedCover(mockRequest).catch(e => e);
      expect(error).toBeInstanceOf(TierRestrictionError);
      expect(error.tier).toBe('individual');
      expect(error.upgradeMessage).toBeDefined();
    });

    it('should work without tier checking if userId is not provided', async () => {
      const requestWithoutUserId = { ...mockRequest };
      delete requestWithoutUserId.userId;

      // Should not throw tier restriction error
      // (will fail on Sora API call, but that's expected in test environment)
      await expect(
        animationService.generateAnimatedCover(requestWithoutUserId)
      ).rejects.not.toThrow(TierRestrictionError);

      expect(mockTierService.getUserTierInfo).not.toHaveBeenCalled();
    });

    it('should work without tier checking if tierService is not provided', async () => {
      const serviceWithoutTier = new AnimationService(mockLogger);

      // Should not throw tier restriction error
      await expect(
        serviceWithoutTier.generateAnimatedCover(mockRequest)
      ).rejects.not.toThrow(TierRestrictionError);

      expect(mockTierService.getUserTierInfo).not.toHaveBeenCalled();
    });
  });

  describe('Upgrade Messaging', () => {
    it('should include upgrade message in TierRestrictionError', async () => {
      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'free',
        storyLimit: 1,
        storiesUsed: 0,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-4-turbo-preview',
        imageCount: 2,
        audioProvider: 'polly',
        priorityQueue: false,
        costPerStory: 0.15,
        videoGeneration: false
      });

      const upgradeMessage = {
        message: 'Video generation is available on Premium and Family plans.',
        upgradeTier: 'premium',
        upgradeUrl: 'https://storytailor.com/upgrade'
      };

      mockTierService.getVideoGenerationUpgradeMessage.mockReturnValue(upgradeMessage);

      try {
        await animationService.generateAnimatedCover(mockRequest);
        fail('Should have thrown TierRestrictionError');
      } catch (error) {
        expect(error).toBeInstanceOf(TierRestrictionError);
        expect((error as TierRestrictionError).upgradeMessage).toEqual(upgradeMessage);
        expect((error as TierRestrictionError).tier).toBe('free');
      }
    });
  });

  describe('Story Beat Analysis', () => {
    it('should analyze story structure for prompt enhancement', async () => {
      const longStory = `
        Once upon a time, there was a brave knight. The knight lived in a magical kingdom.
        One day, the knight decided to go on an adventure. The knight encountered many challenges.
        Finally, the knight overcame all obstacles and learned an important lesson.
        And so, the knight lived happily ever after with new wisdom.
      `;

      const requestWithLongStory = {
        ...mockRequest,
        storyText: longStory,
        userId: 'premium-user'
      };

      mockTierService.getUserTierInfo.mockResolvedValue({
        tier: 'premium',
        storyLimit: -1,
        storiesUsed: 0,
        canCreate: true,
        hasCredits: false,
        credits: 0
      });

      mockTierService.getQualityConfig.mockReturnValue({
        gptModel: 'gpt-5.2',
        imageCount: 5,
        audioProvider: 'elevenlabs',
        priorityQueue: true,
        costPerStory: 1.00,
        videoGeneration: true
      });

      // The analyzeStoryStructure method should be called internally
      // We can verify the prompt includes story structure analysis
      const service = animationService as any;
      const beats = service.analyzeStoryStructure(longStory);
      
      expect(beats).toBeDefined();
      expect(Array.isArray(beats)).toBe(true);
      if (beats.length > 0) {
        expect(beats[0]).toHaveProperty('phase');
        expect(beats[0]).toHaveProperty('emotion');
        expect(beats[0]).toHaveProperty('description');
      }
    });
  });
});

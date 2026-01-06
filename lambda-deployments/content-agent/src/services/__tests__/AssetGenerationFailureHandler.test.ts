import { 
  AssetGenerationFailureHandler, 
  AssetGenerationFailure, 
  ProgressUpdate,
  AssetQualityValidation 
} from '../AssetGenerationFailureHandler';
import { RedisClientType } from 'redis';
import { createLogger } from 'winston';

// Mock dependencies
jest.mock('redis');
jest.mock('winston');

describe('AssetGenerationFailureHandler', () => {
  let failureHandler: AssetGenerationFailureHandler;
  let mockRedis: jest.Mocked<RedisClientType>;
  let mockLogger: any;

  beforeEach(() => {
    mockRedis = {
      setEx: jest.fn(),
      get: jest.fn(),
      ping: jest.fn()
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    failureHandler = new AssetGenerationFailureHandler(mockRedis, mockLogger);
  });

  describe('handleGenerationFailure', () => {
    it('should handle art generation failure with appropriate fallback', async () => {
      const failure: AssetGenerationFailure = {
        assetType: 'art',
        error: new Error('Image generation failed'),
        timestamp: new Date().toISOString(),
        retryCount: 1,
        context: {
          storyId: 'story-123',
          characterId: 'char-456',
          userId: 'user-789',
          sessionId: 'session-abc'
        }
      };

      const result = await failureHandler.handleGenerationFailure(failure);

      expect(result.fallbackAsset).toBeDefined();
      expect(result.userNotification).toBeDefined();
      expect(result.userNotification.type).toBe('failure_notification');
      expect(result.fallbackStrategy).toBeDefined();
      expect(result.retryRecommended).toBe(true); // Should retry for first attempt
    });

    it('should not recommend retry for permanent failures', async () => {
      const failure: AssetGenerationFailure = {
        assetType: 'audio',
        error: new Error('Quota exceeded'),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        context: {
          storyId: 'story-123',
          characterId: 'char-456',
          userId: 'user-789',
          sessionId: 'session-abc'
        }
      };

      const result = await failureHandler.handleGenerationFailure(failure);

      expect(result.retryRecommended).toBe(false);
    });

    it('should use more aggressive fallbacks after multiple retries', async () => {
      const failure: AssetGenerationFailure = {
        assetType: 'art',
        error: new Error('Generation failed'),
        timestamp: new Date().toISOString(),
        retryCount: 3,
        context: {
          storyId: 'story-123',
          characterId: 'char-456',
          userId: 'user-789',
          sessionId: 'session-abc'
        }
      };

      const result = await failureHandler.handleGenerationFailure(failure);

      expect(result.fallbackStrategy).toMatch(/placeholder|text_only/);
    });

    it('should cache failure patterns for learning', async () => {
      const failure: AssetGenerationFailure = {
        assetType: 'pdf',
        error: new Error('PDF generation failed'),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        context: {
          storyId: 'story-123',
          characterId: 'char-456',
          userId: 'user-789',
          sessionId: 'session-abc'
        }
      };

      await failureHandler.handleGenerationFailure(failure);

      expect(mockRedis.setEx).toHaveBeenCalled();
    });
  });

  describe('generateWithProgressUpdates', () => {
    it('should provide progress updates during generation', async () => {
      const mockRequest = {
        story: { id: 'story-123' },
        character: { id: 'char-456' },
        assetTypes: ['art', 'audio'] as const,
        targetAge: 6
      };

      const progressUpdates: ProgressUpdate[] = [];
      const updateCallback = jest.fn().mockImplementation((update: ProgressUpdate) => {
        progressUpdates.push(update);
        return Promise.resolve();
      });

      // Mock the generateSingleAsset method to avoid actual generation
      jest.spyOn(failureHandler as any, 'generateSingleAsset').mockResolvedValue({
        type: 'art',
        url: 'https://example.com/art.jpg'
      });

      jest.spyOn(failureHandler, 'validateAssetQuality').mockResolvedValue({
        assetType: 'art',
        isValid: true,
        qualityScore: 0.9,
        issues: [],
        recommendation: 'accept'
      });

      const result = await failureHandler.generateWithProgressUpdates(mockRequest, updateCallback);

      expect(updateCallback).toHaveBeenCalledTimes(5); // 2 assets * 2 updates + 1 final
      expect(progressUpdates.some(u => u.status === 'generating')).toBe(true);
      expect(progressUpdates.some(u => u.status === 'completed')).toBe(true);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should handle generation failures during progressive generation', async () => {
      const mockRequest = {
        story: { id: 'story-123' },
        character: { id: 'char-456' },
        assetTypes: ['art'] as const,
        targetAge: 6
      };

      const updateCallback = jest.fn().mockResolvedValue(undefined);

      // Mock failure
      jest.spyOn(failureHandler as any, 'generateSingleAsset').mockRejectedValue(
        new Error('Generation failed')
      );

      jest.spyOn(failureHandler, 'handleGenerationFailure').mockResolvedValue({
        fallbackAsset: { type: 'art', url: 'fallback.jpg' },
        userNotification: {
          sessionId: 'session-abc',
          type: 'failure_notification',
          title: 'Small Hiccup',
          message: 'Using fallback',
          actionRequired: false,
          priority: 'normal'
        },
        retryRecommended: false,
        fallbackStrategy: 'placeholder'
      });

      const result = await failureHandler.generateWithProgressUpdates(mockRequest, updateCallback);

      expect(result.metadata.errors).toHaveLength(1);
      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'fallback' })
      );
    });
  });

  describe('regenerateAssetWithUserFeedback', () => {
    it('should regenerate asset based on user feedback', async () => {
      const originalAsset = {
        type: 'art',
        url: 'https://example.com/original.jpg'
      };

      const context = {
        storyId: 'story-123',
        characterId: 'char-456',
        sessionId: 'session-abc'
      };

      // Mock the parsing and regeneration methods
      jest.spyOn(failureHandler as any, 'parseUserFeedback').mockResolvedValue([
        {
          type: 'color_change',
          description: 'Make eyes blue',
          priority: 'normal'
        }
      ]);

      jest.spyOn(failureHandler as any, 'applyChangesAndRegenerate').mockResolvedValue({
        ...originalAsset,
        version: 2,
        updatedAt: new Date().toISOString()
      });

      jest.spyOn(failureHandler, 'validateAssetQuality').mockResolvedValue({
        assetType: 'art',
        isValid: true,
        qualityScore: 0.9,
        issues: [],
        recommendation: 'accept'
      });

      const result = await failureHandler.regenerateAssetWithUserFeedback(
        originalAsset,
        'art',
        'Can you make the eyes blue?',
        context
      );

      expect(result.regeneratedAsset).toBeDefined();
      expect(result.improvementsMade).toContain('Make eyes blue');
      expect(result.userNotification.type).toBe('completion');
    });

    it('should handle regeneration failures gracefully', async () => {
      const originalAsset = {
        type: 'art',
        url: 'https://example.com/original.jpg'
      };

      const context = {
        storyId: 'story-123',
        characterId: 'char-456',
        sessionId: 'session-abc'
      };

      // Mock failure
      jest.spyOn(failureHandler as any, 'parseUserFeedback').mockRejectedValue(
        new Error('Parsing failed')
      );

      const result = await failureHandler.regenerateAssetWithUserFeedback(
        originalAsset,
        'art',
        'Invalid feedback',
        context
      );

      expect(result.regeneratedAsset).toBe(originalAsset);
      expect(result.improvementsMade).toHaveLength(0);
      expect(result.userNotification.type).toBe('failure_notification');
      expect(result.userNotification.actionRequired).toBe(true);
    });
  });

  describe('validateAssetQuality', () => {
    it('should validate art asset quality', async () => {
      const asset = {
        type: 'art',
        url: 'https://example.com/art.jpg',
        metadata: { resolution: '1024x1024' }
      };

      const result = await failureHandler.validateAssetQuality(asset, 'art');

      expect(result.assetType).toBe('art');
      expect(result.isValid).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.recommendation).toBe('accept');
    });

    it('should detect quality issues', async () => {
      const asset = {
        type: 'art',
        // Missing URL should trigger quality issue
        metadata: {}
      };

      const result = await failureHandler.validateAssetQuality(asset, 'art');

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('technical_error');
      expect(result.recommendation).toBe('fallback');
    });

    it('should handle validation errors', async () => {
      const asset = null; // Invalid asset

      const result = await failureHandler.validateAssetQuality(asset, 'art');

      expect(result.isValid).toBe(false);
      expect(result.qualityScore).toBe(0);
      expect(result.recommendation).toBe('fallback');
    });
  });

  describe('createUserNotification', () => {
    it('should create appropriate notifications for different scenarios', () => {
      const sessionId = 'session-123';

      const progressNotification = failureHandler.createUserNotification(
        sessionId,
        'progress_update',
        'art'
      );

      expect(progressNotification.type).toBe('progress_update');
      expect(progressNotification.title).toBe('Creating Your Story Assets');
      expect(progressNotification.actionRequired).toBe(false);
      expect(progressNotification.priority).toBe('low');

      const failureNotification = failureHandler.createUserNotification(
        sessionId,
        'failure_notification',
        'audio',
        'Service unavailable'
      );

      expect(failureNotification.type).toBe('failure_notification');
      expect(failureNotification.message).toContain('Service unavailable');
      expect(failureNotification.priority).toBe('normal');

      const completionNotification = failureHandler.createUserNotification(
        sessionId,
        'completion',
        'pdf'
      );

      expect(completionNotification.type).toBe('completion');
      expect(completionNotification.title).toBe('All Done!');
    });
  });

  describe('fallback strategies', () => {
    it('should have appropriate fallback strategies for each asset type', () => {
      const artFallbacks = (failureHandler as any).getFallbackOptions('art', 0);
      expect(artFallbacks).toHaveLength(2);
      expect(artFallbacks.some((f: any) => f.fallbackStrategy === 'simplified')).toBe(true);

      const audioFallbacks = (failureHandler as any).getFallbackOptions('audio', 0);
      expect(audioFallbacks).toHaveLength(2);
      expect(audioFallbacks.some((f: any) => f.fallbackStrategy === 'text_only')).toBe(true);
    });

    it('should select more aggressive fallbacks for higher retry counts', () => {
      const fallbacks = (failureHandler as any).getFallbackOptions('art', 3);
      expect(fallbacks.every((f: any) => 
        f.fallbackStrategy === 'placeholder' || f.fallbackStrategy === 'text_only'
      )).toBe(true);
    });
  });

  describe('quality thresholds', () => {
    it('should have appropriate quality thresholds for different asset types', () => {
      const artThreshold = (failureHandler as any).qualityThresholds.get('art');
      expect(artThreshold).toBe(0.7);

      const audioThreshold = (failureHandler as any).qualityThresholds.get('audio');
      expect(audioThreshold).toBe(0.8);

      const pdfThreshold = (failureHandler as any).qualityThresholds.get('pdf');
      expect(pdfThreshold).toBe(0.5);
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockRedis.setEx.mockRejectedValue(new Error('Redis error'));

      const failure: AssetGenerationFailure = {
        assetType: 'art',
        error: new Error('Generation failed'),
        timestamp: new Date().toISOString(),
        retryCount: 0,
        context: {
          storyId: 'story-123',
          characterId: 'char-456',
          userId: 'user-789',
          sessionId: 'session-abc'
        }
      };

      const result = await failureHandler.handleGenerationFailure(failure);

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to cache failure pattern',
        expect.any(Object)
      );
    });
  });
});
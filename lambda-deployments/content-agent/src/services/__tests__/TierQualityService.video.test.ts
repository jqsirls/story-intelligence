/**
 * TierQualityService Tests - Video Generation Feature Gating
 */

import { TierQualityService } from '../TierQualityService';
import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js');

describe('TierQualityService - Video Generation', () => {
  let tierService: TierQualityService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      or: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis()
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);

    tierService = new TierQualityService(
      'https://test.supabase.co',
      'test-key'
    );
  });

  describe('Video Generation Access', () => {
    it('should return videoGeneration: false for free tier', () => {
      const config = tierService.getQualityConfig('free');
      expect(config.videoGeneration).toBe(false);
    });

    it('should return videoGeneration: false for alexa_free tier', () => {
      const config = tierService.getQualityConfig('alexa_free');
      expect(config.videoGeneration).toBe(false);
    });

    it('should return videoGeneration: false for alexa_starter tier', () => {
      const config = tierService.getQualityConfig('alexa_starter');
      expect(config.videoGeneration).toBe(false);
    });

    it('should return videoGeneration: false for individual tier', () => {
      const config = tierService.getQualityConfig('individual');
      expect(config.videoGeneration).toBe(false);
    });

    it('should return videoGeneration: true for premium tier', () => {
      const config = tierService.getQualityConfig('premium');
      expect(config.videoGeneration).toBe(true);
    });

    it('should return videoGeneration: true for family tier', () => {
      const config = tierService.getQualityConfig('family');
      expect(config.videoGeneration).toBe(true);
    });
  });

  describe('Upgrade Messaging', () => {
    it('should return upgrade message for free tier', () => {
      const message = tierService.getVideoGenerationUpgradeMessage('free');
      
      expect(message).toBeDefined();
      expect(message.message).toContain('Premium');
      expect(message.upgradeTier).toBe('premium');
      expect(message.upgradeUrl).toBeDefined();
    });

    it('should return upgrade message for individual tier', () => {
      const message = tierService.getVideoGenerationUpgradeMessage('individual');
      
      expect(message).toBeDefined();
      expect(message.message).toContain('Premium');
      expect(message.upgradeTier).toBe('premium');
    });

    it('should return upgrade message for alexa_starter tier', () => {
      const message = tierService.getVideoGenerationUpgradeMessage('alexa_starter');
      
      expect(message).toBeDefined();
      expect(message.upgradeTier).toBe('premium');
    });

    it('should return upgrade message for premium tier (already has access)', () => {
      const message = tierService.getVideoGenerationUpgradeMessage('premium');
      
      // Even premium users get upgrade message (could upgrade to family)
      expect(message).toBeDefined();
      expect(message.upgradeTier).toBe('premium');
    });
  });
});

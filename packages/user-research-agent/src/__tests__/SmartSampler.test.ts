/**
 * Smart Sampler Tests
 */

import { SmartSampler } from '../core/SmartSampler';
import { Event } from '../types';

describe('SmartSampler', () => {
  let sampler: SmartSampler;

  beforeEach(() => {
    sampler = new SmartSampler();
  });

  describe('shouldAnalyze', () => {
    it('should always analyze critical events', () => {
      const event: Event = {
        id: '1',
        event_id: 'evt_1',
        event_type: 'account_deleted',
        source: 'system',
        event_time: new Date(),
        data: {}
      };

      // Run multiple times - should always return true for critical
      let allTrue = true;
      for (let i = 0; i < 10; i++) {
        if (!sampler.shouldAnalyze(event)) {
          allTrue = false;
          break;
        }
      }
      
      expect(allTrue).toBe(true);
    });

    it('should sample medium priority events at ~10% rate', () => {
      const event: Event = {
        id: '1',
        event_id: 'evt_1',
        event_type: 'story_created',
        source: 'system',
        event_time: new Date(),
        data: {}
      };

      let sampledCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (sampler.shouldAnalyze(event)) {
          sampledCount++;
        }
      }

      const samplingRate = sampledCount / iterations;
      expect(samplingRate).toBeGreaterThan(0.05); // At least 5%
      expect(samplingRate).toBeLessThan(0.15); // At most 15%
    });

    it('should sample low priority events at ~1% rate', () => {
      const event: Event = {
        id: '1',
        event_id: 'evt_1',
        event_type: 'page_view',
        source: 'system',
        event_time: new Date(),
        data: {}
      };

      let sampledCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (sampler.shouldAnalyze(event)) {
          sampledCount++;
        }
      }

      const samplingRate = sampledCount / iterations;
      expect(samplingRate).toBeLessThan(0.03); // At most 3%
    });
  });

  describe('getSamplingStatistics', () => {
    it('should return sampling statistics', () => {
      const stats = sampler.getSamplingStatistics();
      expect(stats).toHaveProperty('totalRules');
      expect(stats).toHaveProperty('rules');
      expect(Array.isArray(stats.rules)).toBe(true);
    });
  });

  describe('updateSamplingRule', () => {
    it('should update sampling rate for event type', () => {
      sampler.updateSamplingRule('custom_event', 0.5);
      
      const event: Event = {
        id: '1',
        event_id: 'evt_1',
        event_type: 'custom_event',
        source: 'system',
        event_time: new Date(),
        data: {}
      };

      let sampledCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        if (sampler.shouldAnalyze(event)) {
          sampledCount++;
        }
      }

      const samplingRate = sampledCount / iterations;
      expect(samplingRate).toBeGreaterThan(0.3);
      expect(samplingRate).toBeLessThan(0.7);
    });
  });
});

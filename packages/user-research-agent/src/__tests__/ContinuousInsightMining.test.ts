/**
 * Continuous Insight Mining Track Tests
 */

import { ContinuousInsightMining } from '../core/tracks/ContinuousInsightMining';
import { SupabaseClient } from '@supabase/supabase-js';
import { Event, Pattern } from '../types';

jest.mock('@supabase/supabase-js');

describe('ContinuousInsightMining', () => {
  let track: ContinuousInsightMining;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn()
    } as any;

    track = new ContinuousInsightMining(mockSupabase);
  });

  describe('detectAbandonmentPatterns', () => {
    it('should detect high abandonment rates', async () => {
      const events: Event[] = Array(100).fill(null).map((_, i) => ({
        id: `${i}`,
        event_id: `evt_${i}`,
        event_type: i % 10 === 0 ? 'story_complete' : 'story_abandon',
        source: 'system',
        event_time: new Date(),
        session_id: `session_${i}`,
        data: {}
      }));

      const patterns = await track.detectAbandonmentPatterns(events);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('abandonment');
    });

    it('should not detect patterns with low abandonment', async () => {
      const events: Event[] = Array(100).fill(null).map((_, i) => ({
        id: `${i}`,
        event_id: `evt_${i}`,
        event_type: 'story_complete',
        source: 'system',
        event_time: new Date(),
        session_id: `session_${i}`,
        data: {}
      }));

      const patterns = await track.detectAbandonmentPatterns(events);
      
      expect(patterns.length).toBe(0);
    });
  });

  describe('analyzeRetryBehavior', () => {
    it('should detect retry patterns', async () => {
      const now = Date.now();
      const events: Event[] = [
        {
          id: '1',
          event_id: 'evt_1',
          event_type: 'button_click',
          source: 'system',
          event_time: new Date(now),
          session_id: 'session_1',
          data: {}
        },
        {
          id: '2',
          event_id: 'evt_2',
          event_type: 'button_click',
          source: 'system',
          event_time: new Date(now + 5000), // 5 seconds later
          session_id: 'session_1',
          data: {}
        }
      ];

      // Repeat for multiple sessions
      const manyRetries = Array(60).fill(null).flatMap((_, i) => 
        events.map(e => ({ ...e, session_id: `session_${i}` }))
      );

      const patterns = await track.analyzeRetryBehavior(manyRetries);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].type).toBe('retry');
    });
  });

  describe('identifyConfusionSignals', () => {
    it('should detect back-and-forth navigation', async () => {
      const now = Date.now();
      const backAndForthPattern = [
        { event_type: 'page_a', time: now },
        { event_type: 'page_b', time: now + 1000 },
        { event_type: 'page_a', time: now + 2000 } // Back to A
      ];

      const events: Event[] = Array(120).fill(null).flatMap((_, i) =>
        backAndForthPattern.map((p, j) => ({
          id: `${i}_${j}`,
          event_id: `evt_${i}_${j}`,
          event_type: p.event_type,
          source: 'system',
          event_time: new Date(p.time),
          session_id: `session_${i}`,
          data: {}
        }))
      );

      const patterns = await track.identifyConfusionSignals(events);
      
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('synthesizeInsights', () => {
    it('should limit to top 5 insights', async () => {
      const patterns: Pattern[] = Array(10).fill(null).map((_, i) => ({
        type: 'test',
        description: `Pattern ${i}`,
        frequency: 100 + i * 10,
        affectedUsers: 100,
        confidence: 0.8,
        examples: []
      }));

      const insights = await track.synthesizeInsights(patterns);
      
      expect(insights.length).toBeLessThanOrEqual(5);
    });
  });
});

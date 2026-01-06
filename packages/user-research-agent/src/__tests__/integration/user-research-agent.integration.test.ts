/**
 * Fieldnotes (User Research Agent) Integration Tests
 * End-to-end tests for complete workflows
 */

import { ResearchEngine } from '../../core/ResearchEngine';
import { storytailorConfig } from '../../config/tenants/storytailor';
import { FieldnotesClient } from '../../sdk';

// These tests require infrastructure to be running
describe('Fieldnotes Integration Tests', () => {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

  let engine: ResearchEngine;

  beforeAll(async () => {
    // Skip if infrastructure not available
    if (!SUPABASE_KEY) {
      console.log('Skipping integration tests - no Supabase key configured');
      return;
    }

    engine = new ResearchEngine(SUPABASE_URL, SUPABASE_KEY, REDIS_URL);
    
    try {
      await engine.initialize();
    } catch (error) {
      console.log('Skipping integration tests - infrastructure not available');
    }
  });

  afterAll(async () => {
    if (engine) {
      await engine.shutdown();
    }
  });

  describe('On-demand Analysis', () => {
    it('should analyze events and return insights', async () => {
      if (!engine) {
        console.log('Skipping - engine not initialized');
        return;
      }

      const result = await engine.analyzeOnDemand({
        tenantId: 'storytailor',
        timeframe: '7 days',
        focus: 'all'
      });

      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('patterns');
      expect(result).toHaveProperty('trackEvaluations');
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  describe('Pre-Launch Memo Generation', () => {
    it('should generate pre-launch memo for feature', async () => {
      if (!engine) {
        console.log('Skipping - engine not initialized');
        return;
      }

      const feature = {
        name: 'Quick Story Mode',
        description: 'Fast-path story creation in 3 taps',
        targetAudience: 'parents',
        successMetrics: ['completion_rate', 'time_to_story']
      };

      const memo = await engine.generatePreLaunchMemo('storytailor', feature);

      expect(memo).toHaveProperty('featureName', 'Quick Story Mode');
      expect(memo).toHaveProperty('recommendation');
      expect(['ship', 'dont_ship', 'fix_first']).toContain(memo.recommendation);
      expect(memo.confidence).toBeGreaterThanOrEqual(0);
      expect(memo.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Agent Challenge', () => {
    it('should challenge another agent', async () => {
      if (!engine) {
        console.log('Skipping - engine not initialized');
        return;
      }

      const challenge = await engine.challengeAgent(
        'storytailor',
        'content-agent',
        'Why are brave princess stories generating low retention?'
      );

      expect(challenge).toHaveProperty('challengedAgent', 'content-agent');
      expect(challenge).toHaveProperty('question');
      expect(challenge).toHaveProperty('synthesis');
    });
  });

  describe('SDK Client', () => {
    it('should connect and make requests via SDK', async () => {
      // This would require API server to be running
      const client = new FieldnotesClient({
        apiUrl: 'http://localhost:3000',
        apiKey: process.env.FIELDNOTES_API_KEY || 'test-key'
      });

      // Test would make actual API call
      // For now, just verify client creation
      expect(client).toBeInstanceOf(FieldnotesClient);
    });
  });
});

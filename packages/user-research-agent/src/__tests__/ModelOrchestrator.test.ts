/**
 * Model Orchestrator Tests
 */

import { ModelOrchestrator } from '../core/ModelOrchestrator';

// Mock OpenAI and Anthropic
jest.mock('openai');
jest.mock('@anthropic-ai/sdk');

describe('ModelOrchestrator', () => {
  let orchestrator: ModelOrchestrator;

  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.ANTHROPIC_API_KEY = 'test-key';
    orchestrator = new ModelOrchestrator();
  });

  describe('getModelForTask', () => {
    it('should route data aggregation to gpt-4o-mini', () => {
      const model = orchestrator.getModelForTask('dataAggregation');
      expect(model).toBe('gpt-4o-mini');
    });

    it('should route pattern detection to gpt-4o-mini', () => {
      const model = orchestrator.getModelForTask('patternDetection');
      expect(model).toBe('gpt-4o-mini');
    });

    it('should route adversarial critique to claude-haiku', () => {
      const model = orchestrator.getModelForTask('adversarialCritique');
      expect(model).toBe('claude-haiku');
    });

    it('should route strategic synthesis to claude-sonnet', () => {
      const model = orchestrator.getModelForTask('strategicSynthesis');
      expect(model).toBe('claude-sonnet');
    });
  });

  describe('estimateCost', () => {
    it('should estimate cost for gpt-4o-mini tasks', () => {
      const cost = orchestrator.estimateCost('dataAggregation', 1000, 500);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Should be very cheap
    });

    it('should estimate higher cost for strategic synthesis', () => {
      const cheapCost = orchestrator.estimateCost('dataAggregation', 1000, 500);
      const expensiveCost = orchestrator.estimateCost('strategicSynthesis', 1000, 500);
      expect(expensiveCost).toBeGreaterThan(cheapCost);
    });
  });
});

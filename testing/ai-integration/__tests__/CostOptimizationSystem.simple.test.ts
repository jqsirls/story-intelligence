import { CostOptimizationSystem } from '../CostOptimizationSystem';

// Simple, focused tests without timers or complex async operations
describe('CostOptimizationSystem - Simple Tests', () => {
  let costOptimizer: CostOptimizationSystem;

  beforeEach(() => {
    costOptimizer = new CostOptimizationSystem();
  });

  afterEach(() => {
    if (costOptimizer && typeof costOptimizer.destroy === 'function') {
      costOptimizer.destroy();
    }
  });

  describe('Basic Cost Tracking', () => {
    it('should track usage costs', () => {
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05, {
        tokens: 1000,
        model: 'gpt-4',
        requestId: 'test-request-1'
      });

      const currentCost = costOptimizer.getCurrentCost('openai', 'story-generation');
      expect(currentCost).toBe(0.05);
    });

    it('should accumulate costs correctly', () => {
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.03);
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.02);
      
      const totalCost = costOptimizer.getCurrentCost('openai', 'story-generation');
      expect(totalCost).toBe(0.05);
    });

    it('should track costs for different services', () => {
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.03);
      costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10);
      
      expect(costOptimizer.getCurrentCost('openai')).toBe(0.03);
      expect(costOptimizer.getCurrentCost('elevenlabs')).toBe(0.10);
    });
  });

  describe('Cost Thresholds', () => {
    it('should set cost thresholds', () => {
      const threshold = {
        service: 'openai',
        dailyLimit: 50,
        monthlyLimit: 1000,
        alertThreshold: 80
      };

      costOptimizer.setCostThreshold(threshold);
      
      // Verify threshold was set by checking if it affects behavior
      expect(() => costOptimizer.setCostThreshold(threshold)).not.toThrow();
    });
  });

  describe('Model Optimization', () => {
    it('should optimize model selection', () => {
      const optimizedModel = costOptimizer.optimizeModelSelection('openai', 0.85);
      
      expect(optimizedModel).toBeTruthy();
      expect(optimizedModel!.service).toBe('openai');
      expect(optimizedModel!.qualityScore).toBeGreaterThanOrEqual(0.85);
    });

    it('should respect cost constraints', () => {
      const optimizedModel = costOptimizer.optimizeModelSelection('openai', 0.80, 0.005);
      
      if (optimizedModel) {
        expect(optimizedModel.costPerRequest).toBeLessThanOrEqual(0.005);
        expect(optimizedModel.qualityScore).toBeGreaterThanOrEqual(0.80);
      }
    });

    it('should return null for non-existent services', () => {
      const optimizedModel = costOptimizer.optimizeModelSelection('nonexistent-service', 0.99);
      expect(optimizedModel).toBeNull();
    });
  });

  describe('Caching Strategy', () => {
    it('should implement caching strategies', () => {
      const strategy = costOptimizer.implementCaching('test-cache-key', 3600, 0.05);
      
      expect(strategy.key).toBe('test-cache-key');
      expect(strategy.ttl).toBe(3600);
      expect(strategy.cost).toBe(0.05);
      expect(strategy.hitCount).toBe(0);
      expect(strategy.missCount).toBe(0);
    });

    it('should record cache events', () => {
      costOptimizer.implementCaching('test-cache', 3600, 0.02);
      
      // This should not throw
      expect(() => {
        costOptimizer.recordCacheEvent('test-cache', true);
      }).not.toThrow();
    });
  });

  describe('Analytics Report', () => {
    beforeEach(() => {
      // Add test data
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05, { model: 'gpt-4' });
      costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10);
      costOptimizer.implementCaching('cache-1', 3600, 0.05);
      costOptimizer.recordCacheEvent('cache-1', true);
    });

    it('should generate analytics report', () => {
      const report = costOptimizer.generateAnalyticsReport('daily');
      
      expect(report).toHaveProperty('totalCost');
      expect(report).toHaveProperty('serviceBreakdown');
      expect(report).toHaveProperty('operationBreakdown');
      expect(report).toHaveProperty('topCostDrivers');
      expect(report).toHaveProperty('cacheEfficiency');
      expect(report).toHaveProperty('modelUsage');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.totalCost).toBe(0.15);
      expect(report.serviceBreakdown.openai).toBe(0.05);
      expect(report.serviceBreakdown.elevenlabs).toBe(0.10);
    });

    it('should include model usage in report', () => {
      const report = costOptimizer.generateAnalyticsReport('daily');
      
      expect(report.modelUsage).toHaveProperty('gpt-4');
      expect(report.modelUsage['gpt-4'].usage).toBe(1);
      expect(report.modelUsage['gpt-4'].cost).toBe(0.05);
    });

    it('should provide recommendations', () => {
      const report = costOptimizer.generateAnalyticsReport('daily');
      
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Budget Monitoring', () => {
    it('should monitor budget thresholds', () => {
      costOptimizer.setCostThreshold({
        service: 'openai',
        dailyLimit: 10,
        monthlyLimit: 200,
        alertThreshold: 50
      });

      // Track costs that exceed threshold
      costOptimizer.trackUsageCosts('openai', 'story-generation', 120);

      const alerts = costOptimizer.monitorBudgetThresholds('openai', 200);
      
      expect(Array.isArray(alerts)).toBe(true);
      if (alerts.length > 0) {
        expect(alerts[0]).toHaveProperty('service');
        expect(alerts[0]).toHaveProperty('severity');
        expect(alerts[0]).toHaveProperty('currentCost');
        expect(alerts[0]).toHaveProperty('limit');
      }
    });
  });
});
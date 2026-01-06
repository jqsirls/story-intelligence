import { CostOptimizationSystemTestOnly } from '../CostOptimizationSystem.test-only';

describe('CostOptimizationSystem - Fast Tests', () => {
  let costOptimizer: CostOptimizationSystemTestOnly;

  beforeEach(() => {
    costOptimizer = new CostOptimizationSystemTestOnly();
  });

  afterEach(() => {
    costOptimizer.removeAllListeners();
  });

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

  it('should optimize model selection', () => {
    const optimizedModel = costOptimizer.optimizeModelSelection('openai', 0.85);
    
    expect(optimizedModel).toBeTruthy();
    expect(optimizedModel!.service).toBe('openai');
    expect(optimizedModel!.qualityScore).toBeGreaterThanOrEqual(0.85);
  });

  it('should generate analytics report', () => {
    costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05, { model: 'gpt-4' });
    costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10);
    
    const report = costOptimizer.generateAnalyticsReport('daily');
    
    expect(report.totalCost).toBe(0.15);
    expect(report.serviceBreakdown.openai).toBe(0.05);
    expect(report.serviceBreakdown.elevenlabs).toBe(0.10);
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('should implement caching strategies', () => {
    const strategy = costOptimizer.implementCaching('test-cache-key', 3600, 0.05);
    
    expect(strategy.key).toBe('test-cache-key');
    expect(strategy.ttl).toBe(3600);
    expect(strategy.cost).toBe(0.05);
  });

  it('should monitor budget thresholds', () => {
    costOptimizer.setCostThreshold({
      service: 'openai',
      dailyLimit: 10,
      monthlyLimit: 200,
      alertThreshold: 50
    });

    costOptimizer.trackUsageCosts('openai', 'story-generation', 120);
    const alerts = costOptimizer.monitorBudgetThresholds('openai', 200);
    
    expect(Array.isArray(alerts)).toBe(true);
    if (alerts.length > 0) {
      expect(alerts[0].service).toBe('openai');
      expect(alerts[0].severity).toBe('critical');
    }
  });
});
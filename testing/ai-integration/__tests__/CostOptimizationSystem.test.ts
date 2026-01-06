import { CostOptimizationSystem, CostMetrics, CostThreshold, BudgetAlert } from '../CostOptimizationSystem';
import { CostTrackingMiddleware } from '../CostTrackingMiddleware';
import { CostAlertingSystem } from '../CostAlertingSystem';
import { CostAnalyticsDashboard } from '../CostAnalyticsDashboard';

// Mock timers to prevent hanging
jest.useFakeTimers();

describe('CostOptimizationSystem', () => {
  let costOptimizer: CostOptimizationSystem;

  beforeEach(() => {
    jest.clearAllTimers();
    costOptimizer = new CostOptimizationSystem();
  });

  afterEach(() => {
    costOptimizer.destroy();
    jest.clearAllTimers();
  });

  describe('Cost Tracking', () => {
    it('should track usage costs correctly', () => {
      const trackingPromise = new Promise<CostMetrics>((resolve) => {
        costOptimizer.on('costTracked', resolve);
      });

      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05, {
        tokens: 1000,
        model: 'gpt-4',
        duration: 2000,
        requestId: 'test-request-1'
      });

      return trackingPromise.then((metric) => {
        expect(metric.service).toBe('openai');
        expect(metric.operation).toBe('story-generation');
        expect(metric.cost).toBe(0.05);
        expect(metric.tokens).toBe(1000);
        expect(metric.model).toBe('gpt-4');
        expect(metric.duration).toBe(2000);
        expect(metric.requestId).toBe('test-request-1');
      });
    });

    it('should accumulate costs correctly', () => {
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.03);
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.02);
      costOptimizer.trackUsageCosts('openai', 'text-completion', 0.01);

      expect(costOptimizer.getCurrentCost('openai', 'story-generation')).toBe(0.05);
      expect(costOptimizer.getCurrentCost('openai', 'text-completion')).toBe(0.01);
      expect(costOptimizer.getCurrentCost('openai')).toBe(0.06);
    });

    it('should track monthly costs separately', () => {
      costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10);
      
      expect(costOptimizer.getCurrentCost('elevenlabs', undefined, 'daily')).toBe(0.10);
      expect(costOptimizer.getCurrentCost('elevenlabs', undefined, 'monthly')).toBe(0.10);
    });
  });

  describe('Cost Thresholds', () => {
    it('should set and retrieve cost thresholds', () => {
      const threshold: CostThreshold = {
        service: 'openai',
        operation: 'story-generation',
        dailyLimit: 50,
        monthlyLimit: 1000,
        alertThreshold: 80
      };

      const thresholdPromise = new Promise<CostThreshold>((resolve) => {
        costOptimizer.on('thresholdSet', resolve);
      });

      costOptimizer.setCostThreshold(threshold);

      return thresholdPromise.then((setThreshold) => {
        expect(setThreshold).toEqual(threshold);
      });
    });

    it('should trigger threshold exceeded events', () => {
      const threshold: CostThreshold = {
        service: 'openai',
        dailyLimit: 10,
        monthlyLimit: 200,
        alertThreshold: 80
      };

      costOptimizer.setCostThreshold(threshold);

      const thresholdPromise = new Promise<any>((resolve) => {
        costOptimizer.on('thresholdExceeded', resolve);
      });

      // Trigger threshold by exceeding 80% of daily limit (8.0)
      costOptimizer.trackUsageCosts('openai', 'story-generation', 8.5);

      return thresholdPromise.then((event) => {
        expect(event.service).toBe('openai');
        expect(event.type).toBe('daily');
        expect(event.current).toBe(8.5);
      });
    });
  });

  describe('Caching Strategy', () => {
    it('should implement caching strategies', () => {
      const cachePromise = new Promise<any>((resolve) => {
        costOptimizer.on('cacheStrategyImplemented', resolve);
      });

      const strategy = costOptimizer.implementCaching('test-cache-key', 3600, 0.05);

      expect(strategy.key).toBe('test-cache-key');
      expect(strategy.ttl).toBe(3600);
      expect(strategy.cost).toBe(0.05);
      expect(strategy.hitCount).toBe(0);
      expect(strategy.missCount).toBe(0);

      return cachePromise.then((implementedStrategy) => {
        expect(implementedStrategy).toEqual(strategy);
      });
    });

    it('should record cache hits and misses', () => {
      costOptimizer.implementCaching('test-cache', 3600, 0.02);

      const cacheEventPromise = new Promise<any>((resolve) => {
        costOptimizer.on('cacheEvent', resolve);
      });

      costOptimizer.recordCacheEvent('test-cache', true);

      return cacheEventPromise.then((event) => {
        expect(event.cacheKey).toBe('test-cache');
        expect(event.hit).toBe(true);
        expect(event.strategy.hitCount).toBe(1);
        expect(event.strategy.missCount).toBe(0);
      });
    });
  });

  describe('Model Optimization', () => {
    it('should optimize model selection based on quality requirements', () => {
      const optimizationPromise = new Promise<any>((resolve) => {
        costOptimizer.on('modelOptimized', resolve);
      });

      const optimizedModel = costOptimizer.optimizeModelSelection('openai', 0.90);

      expect(optimizedModel).toBeTruthy();
      expect(optimizedModel!.service).toBe('openai');
      expect(optimizedModel!.qualityScore).toBeGreaterThanOrEqual(0.90);

      return optimizationPromise.then((event) => {
        expect(event.service).toBe('openai');
        expect(event.selected).toEqual(optimizedModel);
      });
    });

    it('should respect cost constraints in model selection', () => {
      const optimizedModel = costOptimizer.optimizeModelSelection('openai', 0.80, 0.005);

      expect(optimizedModel).toBeTruthy();
      expect(optimizedModel!.costPerRequest).toBeLessThanOrEqual(0.005);
      expect(optimizedModel!.qualityScore).toBeGreaterThanOrEqual(0.80);
    });

    it('should return null when no models meet requirements', () => {
      const optimizedModel = costOptimizer.optimizeModelSelection('nonexistent-service', 0.99);
      expect(optimizedModel).toBeNull();
    });
  });

  describe('Analytics Report', () => {
    beforeEach(() => {
      // Add some test data
      costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05, { model: 'gpt-4' });
      costOptimizer.trackUsageCosts('openai', 'text-completion', 0.02, { model: 'gpt-3.5-turbo' });
      costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10, { model: 'eleven_multilingual_v2' });
      
      costOptimizer.implementCaching('cache-1', 3600, 0.05);
      costOptimizer.recordCacheEvent('cache-1', true);
      costOptimizer.recordCacheEvent('cache-1', true);
      costOptimizer.recordCacheEvent('cache-1', false);
    });

    it('should generate comprehensive analytics report', () => {
      const report = costOptimizer.generateAnalyticsReport('daily');

      expect(report.totalCost).toBe(0.17);
      expect(report.serviceBreakdown.openai).toBe(0.07);
      expect(report.serviceBreakdown.elevenlabs).toBe(0.10);
      
      expect(report.topCostDrivers).toHaveLength(3);
      expect(report.topCostDrivers[0].key).toBe('elevenlabs:voice-synthesis');
      expect(report.topCostDrivers[0].cost).toBe(0.10);
      
      expect(report.cacheEfficiency['cache-1'].hitRate).toBeCloseTo(0.67, 2);
      expect(report.cacheEfficiency['cache-1'].costSaved).toBe(0.10);
      
      expect(report.modelUsage['gpt-4']).toBeDefined();
      expect(report.modelUsage['gpt-4'].usage).toBe(1);
      expect(report.modelUsage['gpt-4'].cost).toBe(0.05);
      
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate different reports for different periods', () => {
      const dailyReport = costOptimizer.generateAnalyticsReport('daily');
      const weeklyReport = costOptimizer.generateAnalyticsReport('weekly');
      const monthlyReport = costOptimizer.generateAnalyticsReport('monthly');

      expect(dailyReport.totalCost).toBe(weeklyReport.totalCost);
      expect(weeklyReport.totalCost).toBe(monthlyReport.totalCost);
    });
  });

  describe('Budget Monitoring', () => {
    it('should monitor budget thresholds and generate alerts', () => {
      costOptimizer.setCostThreshold({
        service: 'openai',
        dailyLimit: 10,
        monthlyLimit: 200,
        alertThreshold: 50
      });

      // Track costs that exceed 50% of monthly budget (100)
      costOptimizer.trackUsageCosts('openai', 'story-generation', 120);

      const alerts = costOptimizer.monitorBudgetThresholds('openai', 200);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].service).toBe('openai');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].currentCost).toBe(120);
      expect(alerts[0].limit).toBe(200);
    });

    it('should emit budget alert events', () => {
      const alertPromise = new Promise<BudgetAlert[]>((resolve) => {
        costOptimizer.on('budgetAlert', resolve);
      });

      costOptimizer.setCostThreshold({
        service: 'elevenlabs',
        dailyLimit: 5,
        monthlyLimit: 100,
        alertThreshold: 75
      });

      costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 80);
      costOptimizer.monitorBudgetThresholds('elevenlabs', 100);

      return alertPromise.then((alerts) => {
        expect(alerts).toHaveLength(1);
        expect(alerts[0].service).toBe('elevenlabs');
        expect(alerts[0].severity).toBe('critical');
      });
    });
  });
});

describe('CostTrackingMiddleware', () => {
  let costOptimizer: CostOptimizationSystem;
  let middleware: CostTrackingMiddleware;

  beforeEach(() => {
    jest.clearAllTimers();
    costOptimizer = new CostOptimizationSystem();
    middleware = new CostTrackingMiddleware(costOptimizer);
  });

  afterEach(() => {
    costOptimizer.destroy();
    middleware.destroy();
    jest.clearAllTimers();
  });

  describe('Service Call Wrapping', () => {
    it('should wrap service calls with cost tracking', async () => {
      const mockServiceCall = jest.fn().mockResolvedValue({ story: 'Test story' });

      const result = await middleware.wrapServiceCall(
        {
          service: 'openai',
          operation: 'story-generation',
          model: 'gpt-4',
          tokens: 500,
          timestamp: new Date()
        },
        mockServiceCall
      );

      expect(mockServiceCall).toHaveBeenCalled();
      expect(result.data).toEqual({ story: 'Test story' });
      expect(result.metrics.service).toBe('openai');
      expect(result.metrics.operation).toBe('story-generation');
      expect(result.metrics.cost).toBeGreaterThan(0);
      expect(result.metrics.duration).toBeGreaterThan(0);
    });

    it('should handle service call failures', async () => {
      const mockServiceCall = jest.fn().mockRejectedValue(new Error('Service error'));

      await expect(
        middleware.wrapServiceCall(
          {
            service: 'openai',
            operation: 'story-generation',
            timestamp: new Date()
          },
          mockServiceCall
        )
      ).rejects.toThrow('Service error');

      expect(mockServiceCall).toHaveBeenCalled();
    });

    it('should use caching when enabled', async () => {
      const mockServiceCall = jest.fn().mockResolvedValue({ story: 'Cached story' });

      // First call - should execute service
      const result1 = await middleware.wrapServiceCall(
        {
          service: 'openai',
          operation: 'story-generation',
          timestamp: new Date()
        },
        mockServiceCall,
        { cacheable: true, cacheKey: 'test-cache-key' }
      );

      expect(mockServiceCall).toHaveBeenCalledTimes(1);
      expect(result1.metrics.cost).toBeGreaterThan(0);

      // Second call - should use cache
      const result2 = await middleware.wrapServiceCall(
        {
          service: 'openai',
          operation: 'story-generation',
          timestamp: new Date()
        },
        mockServiceCall,
        { cacheable: true, cacheKey: 'test-cache-key' }
      );

      expect(mockServiceCall).toHaveBeenCalledTimes(1); // Still only called once
      expect(result2.metrics.cost).toBe(0); // Cached response has no cost
      expect(result2.data).toEqual({ story: 'Cached story' });
    });
  });

  describe('Model Optimization', () => {
    it('should get optimal model for requests', () => {
      const optimalModel = middleware.getOptimalModel('openai', 0.85, 0.01);
      
      expect(optimalModel).toBeTruthy();
      expect(optimalModel).toBe('gpt-3.5-turbo'); // Should select cheaper model that meets quality requirement
    });

    it('should return null when no model meets requirements', () => {
      const optimalModel = middleware.getOptimalModel('nonexistent', 0.99);
      expect(optimalModel).toBeNull();
    });
  });

  describe('Request Batching', () => {
    it('should batch multiple requests for cost optimization', async () => {
      const mockBatchCall = jest.fn().mockResolvedValue([
        { story: 'Story 1' },
        { story: 'Story 2' },
        { story: 'Story 3' }
      ]);

      const requests = [
        { service: 'openai', operation: 'story-generation', timestamp: new Date() },
        { service: 'openai', operation: 'story-generation', timestamp: new Date() },
        { service: 'openai', operation: 'story-generation', timestamp: new Date() }
      ];

      const results = await middleware.batchRequests(requests, mockBatchCall);

      expect(mockBatchCall).toHaveBeenCalledTimes(1);
      expect(mockBatchCall).toHaveBeenCalledWith(requests);
      expect(results).toHaveLength(3);
      expect(results[0].data).toEqual({ story: 'Story 1' });
      expect(results[1].data).toEqual({ story: 'Story 2' });
      expect(results[2].data).toEqual({ story: 'Story 3' });
    });

    it('should handle batch size limits', async () => {
      const mockBatchCall = jest.fn()
        .mockResolvedValueOnce([{ story: 'Batch 1' }, { story: 'Batch 2' }])
        .mockResolvedValueOnce([{ story: 'Batch 3' }]);

      const requests = [
        { service: 'openai', operation: 'story-generation', timestamp: new Date() },
        { service: 'openai', operation: 'story-generation', timestamp: new Date() },
        { service: 'openai', operation: 'story-generation', timestamp: new Date() }
      ];

      const results = await middleware.batchRequests(requests, mockBatchCall, {
        maxBatchSize: 2
      });

      expect(mockBatchCall).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(3);
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = middleware.getCacheStatistics();
      
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('costSaved');
      expect(stats).toHaveProperty('oldestEntry');
      expect(stats).toHaveProperty('newestEntry');
    });

    it('should clear cache entries', () => {
      const cleared = middleware.clearCache();
      expect(typeof cleared).toBe('number');
    });

    it('should clear cache entries by pattern', () => {
      const cleared = middleware.clearCache('openai.*');
      expect(typeof cleared).toBe('number');
    });
  });
});

describe('CostAlertingSystem', () => {
  let costOptimizer: CostOptimizationSystem;
  let alertingSystem: CostAlertingSystem;

  beforeEach(() => {
    jest.clearAllTimers();
    costOptimizer = new CostOptimizationSystem();
    alertingSystem = new CostAlertingSystem(costOptimizer);
  });

  afterEach(() => {
    costOptimizer.destroy();
    alertingSystem.destroy();
    jest.clearAllTimers();
  });

  describe('Alert Rules', () => {
    it('should add and manage alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        service: 'openai',
        condition: 'threshold_exceeded' as const,
        threshold: 80,
        timeWindow: 60,
        severity: 'high' as const,
        channels: ['console'],
        cooldown: 30,
        enabled: true
      };

      const rulePromise = new Promise<any>((resolve) => {
        alertingSystem.on('ruleAdded', resolve);
      });

      alertingSystem.addAlertRule(rule);

      return rulePromise.then((addedRule) => {
        expect(addedRule).toEqual(rule);
      });
    });

    it('should update alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        service: 'openai',
        condition: 'threshold_exceeded' as const,
        threshold: 80,
        timeWindow: 60,
        severity: 'high' as const,
        channels: ['console'],
        cooldown: 30,
        enabled: true
      };

      alertingSystem.addAlertRule(rule);

      const updatePromise = new Promise<any>((resolve) => {
        alertingSystem.on('ruleUpdated', resolve);
      });

      const updated = alertingSystem.updateAlertRule('test-rule', { threshold: 90 });

      expect(updated).toBe(true);

      return updatePromise.then((event) => {
        expect(event.ruleId).toBe('test-rule');
        expect(event.rule.threshold).toBe(90);
      });
    });

    it('should remove alert rules', () => {
      const rule = {
        id: 'test-rule',
        name: 'Test Rule',
        service: 'openai',
        condition: 'threshold_exceeded' as const,
        threshold: 80,
        timeWindow: 60,
        severity: 'high' as const,
        channels: ['console'],
        cooldown: 30,
        enabled: true
      };

      alertingSystem.addAlertRule(rule);

      const removePromise = new Promise<string>((resolve) => {
        alertingSystem.on('ruleRemoved', resolve);
      });

      const removed = alertingSystem.removeAlertRule('test-rule');

      expect(removed).toBe(true);

      return removePromise.then((ruleId) => {
        expect(ruleId).toBe('test-rule');
      });
    });
  });

  describe('Alert Triggering', () => {
    beforeEach(() => {
      alertingSystem.addAlertRule({
        id: 'test-alert-rule',
        name: 'Test Alert Rule',
        service: 'openai',
        condition: 'threshold_exceeded',
        threshold: 80,
        timeWindow: 60,
        severity: 'high',
        channels: ['console'],
        cooldown: 5, // 5 minutes cooldown
        enabled: true
      });
    });

    it('should trigger alerts', async () => {
      const alertPromise = new Promise<any>((resolve) => {
        alertingSystem.on('alertTriggered', resolve);
      });

      const alert = await alertingSystem.triggerAlert(
        'test-alert-rule',
        'Test alert message',
        { testData: 'test value' }
      );

      expect(alert).toBeTruthy();
      expect(alert!.ruleId).toBe('test-alert-rule');
      expect(alert!.message).toBe('Test alert message');
      expect(alert!.severity).toBe('high');
      expect(alert!.details.testData).toBe('test value');

      return alertPromise.then((triggeredAlert) => {
        expect(triggeredAlert).toEqual(alert);
      });
    });

    it('should respect cooldown periods', async () => {
      // Trigger first alert
      const alert1 = await alertingSystem.triggerAlert('test-alert-rule', 'First alert');
      expect(alert1).toBeTruthy();

      // Try to trigger second alert immediately (should be blocked by cooldown)
      const alert2 = await alertingSystem.triggerAlert('test-alert-rule', 'Second alert');
      expect(alert2).toBeNull();
    });

    it('should not trigger alerts for disabled rules', async () => {
      alertingSystem.updateAlertRule('test-alert-rule', { enabled: false });

      const alert = await alertingSystem.triggerAlert('test-alert-rule', 'Disabled rule alert');
      expect(alert).toBeNull();
    });
  });

  describe('Alert Management', () => {
    let testAlert: any;

    beforeEach(async () => {
      alertingSystem.addAlertRule({
        id: 'test-rule',
        name: 'Test Rule',
        service: 'openai',
        condition: 'threshold_exceeded',
        threshold: 80,
        timeWindow: 60,
        severity: 'high',
        channels: ['console'],
        cooldown: 5,
        enabled: true
      });

      testAlert = await alertingSystem.triggerAlert('test-rule', 'Test alert');
    });

    it('should acknowledge alerts', () => {
      const ackPromise = new Promise<any>((resolve) => {
        alertingSystem.on('alertAcknowledged', resolve);
      });

      const acknowledged = alertingSystem.acknowledgeAlert(testAlert.id, 'test-user');

      expect(acknowledged).toBe(true);

      return ackPromise.then((alert) => {
        expect(alert.id).toBe(testAlert.id);
        expect(alert.acknowledged).toBe(true);
        expect(alert.details.acknowledgedBy).toBe('test-user');
      });
    });

    it('should resolve alerts', () => {
      const resolvePromise = new Promise<any>((resolve) => {
        alertingSystem.on('alertResolved', resolve);
      });

      const resolved = alertingSystem.resolveAlert(testAlert.id, 'test-user');

      expect(resolved).toBe(true);

      return resolvePromise.then((alert) => {
        expect(alert.id).toBe(testAlert.id);
        expect(alert.resolvedAt).toBeTruthy();
        expect(alert.details.resolvedBy).toBe('test-user');
      });
    });

    it('should get active alerts', () => {
      const activeAlerts = alertingSystem.getActiveAlerts();

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(testAlert.id);
    });

    it('should filter active alerts', () => {
      const filteredAlerts = alertingSystem.getActiveAlerts({
        service: 'openai',
        severity: 'high',
        acknowledged: false
      });

      expect(filteredAlerts).toHaveLength(1);
      expect(filteredAlerts[0].service).toBe('openai');
      expect(filteredAlerts[0].severity).toBe('high');
      expect(filteredAlerts[0].acknowledged).toBe(false);
    });

    it('should get alert history', () => {
      const history = alertingSystem.getAlertHistory(10);

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(testAlert.id);
    });
  });

  describe('Alert Statistics', () => {
    beforeEach(async () => {
      alertingSystem.addAlertRule({
        id: 'test-rule-1',
        name: 'Test Rule 1',
        service: 'openai',
        condition: 'threshold_exceeded',
        threshold: 80,
        timeWindow: 60,
        severity: 'high',
        channels: ['console'],
        cooldown: 1, // 1 minute cooldown for testing
        enabled: true
      });

      alertingSystem.addAlertRule({
        id: 'test-rule-2',
        name: 'Test Rule 2',
        service: 'elevenlabs',
        condition: 'threshold_exceeded',
        threshold: 75,
        timeWindow: 60,
        severity: 'medium',
        channels: ['console'],
        cooldown: 1,
        enabled: true
      });

      // Trigger some test alerts
      await alertingSystem.triggerAlert('test-rule-1', 'High severity alert');
      
      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await alertingSystem.triggerAlert('test-rule-2', 'Medium severity alert');
    });

    it('should generate alerting statistics', () => {
      const stats = alertingSystem.getAlertingStatistics('daily');

      expect(stats.totalAlerts).toBe(2);
      expect(stats.alertsBySeverity.high).toBe(1);
      expect(stats.alertsBySeverity.medium).toBe(1);
      expect(stats.alertsByService.openai).toBe(1);
      expect(stats.alertsByService.elevenlabs).toBe(1);
      expect(stats.topAlertRules).toHaveLength(2);
    });
  });

  describe('Alert Channels', () => {
    it('should test alert channels', async () => {
      const testResult = await alertingSystem.testAlertChannel('console');
      expect(testResult).toBe(true);
    });

    it('should return false for non-existent channels', async () => {
      const testResult = await alertingSystem.testAlertChannel('non-existent');
      expect(testResult).toBe(false);
    });
  });
});

describe('CostAnalyticsDashboard', () => {
  let costOptimizer: CostOptimizationSystem;
  let alertingSystem: CostAlertingSystem;
  let dashboard: CostAnalyticsDashboard;

  beforeEach(() => {
    jest.clearAllTimers();
    costOptimizer = new CostOptimizationSystem();
    alertingSystem = new CostAlertingSystem(costOptimizer);
    dashboard = new CostAnalyticsDashboard(costOptimizer, alertingSystem);

    // Add some test data
    costOptimizer.trackUsageCosts('openai', 'story-generation', 0.05);
    costOptimizer.trackUsageCosts('elevenlabs', 'voice-synthesis', 0.10);
    costOptimizer.implementCaching('test-cache', 3600, 0.02);
    costOptimizer.recordCacheEvent('test-cache', true);
  });

  afterEach(() => {
    costOptimizer.destroy();
    alertingSystem.destroy();
    dashboard.destroy();
    jest.clearAllTimers();
  });

  describe('Dashboard Metrics', () => {
    it('should get current dashboard metrics', () => {
      const metrics = dashboard.getCurrentMetrics();

      expect(metrics.totalCost).toBe(0.15);
      expect(metrics.dailyCost).toBe(0.15);
      expect(metrics.topServices).toHaveLength(2);
      expect(metrics.topServices[0].service).toBe('elevenlabs');
      expect(metrics.topServices[0].cost).toBe(0.10);
      expect(metrics.topOperations).toHaveLength(2);
      expect(metrics.cacheEfficiency).toBeGreaterThan(0);
      expect(metrics.budgetUtilization).toBeDefined();
    });

    it('should calculate cost trends', () => {
      const metrics = dashboard.getCurrentMetrics();
      expect(['increasing', 'decreasing', 'stable']).toContain(metrics.costTrend);
    });
  });

  describe('Cost Forecasts', () => {
    it('should generate cost forecasts', () => {
      const forecasts = dashboard.generateCostForecasts();

      expect(forecasts).toBeInstanceOf(Array);
      expect(forecasts.length).toBeGreaterThan(0);
      
      const openaiForecast = forecasts.find(f => f.service === 'openai');
      expect(openaiForecast).toBeDefined();
      expect(openaiForecast!.projectedMonthlyCost).toBeGreaterThan(0);
      expect(openaiForecast!.confidence).toBeGreaterThan(0);
      expect(['up', 'down', 'stable']).toContain(openaiForecast!.trend);
    });
  });

  describe('Optimization Recommendations', () => {
    it('should generate optimization recommendations', () => {
      const recommendations = dashboard.generateOptimizationRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);
      
      const recommendation = recommendations[0];
      expect(recommendation).toHaveProperty('id');
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('service');
      expect(recommendation).toHaveProperty('description');
      expect(recommendation).toHaveProperty('estimatedSavings');
      expect(recommendation).toHaveProperty('effort');
      expect(recommendation).toHaveProperty('priority');
      expect(recommendation).toHaveProperty('implementation');
      
      expect(['caching', 'model_selection', 'batching', 'threshold_adjustment']).toContain(recommendation.type);
      expect(['low', 'medium', 'high']).toContain(recommendation.effort);
    });
  });

  describe('Cost Trends', () => {
    it('should get cost trends over time', () => {
      const trends = dashboard.getCostTrends('daily');

      expect(trends).toBeInstanceOf(Array);
      expect(trends.length).toBe(30); // 30 days
      
      const trend = trends[0];
      expect(trend).toHaveProperty('timestamp');
      expect(trend).toHaveProperty('totalCost');
      expect(trend).toHaveProperty('serviceBreakdown');
      expect(trend.timestamp).toBeInstanceOf(Date);
    });

    it('should support different trend periods', () => {
      const hourlyTrends = dashboard.getCostTrends('hourly');
      const dailyTrends = dashboard.getCostTrends('daily');
      const weeklyTrends = dashboard.getCostTrends('weekly');

      expect(hourlyTrends.length).toBe(24);
      expect(dailyTrends.length).toBe(30);
      expect(weeklyTrends.length).toBe(12);
    });
  });

  describe('Data Export', () => {
    it('should export dashboard data as JSON', () => {
      const jsonData = dashboard.exportDashboardData('json');
      const parsedData = JSON.parse(jsonData);

      expect(parsedData).toHaveProperty('timestamp');
      expect(parsedData).toHaveProperty('metrics');
      expect(parsedData).toHaveProperty('forecasts');
      expect(parsedData).toHaveProperty('recommendations');
      expect(parsedData).toHaveProperty('trends');
      expect(parsedData).toHaveProperty('alerts');
      expect(parsedData).toHaveProperty('config');
    });

    it('should export dashboard data as CSV', () => {
      const csvData = dashboard.exportDashboardData('csv');

      expect(typeof csvData).toBe('string');
      expect(csvData).toContain('timestamp');
      expect(csvData).toContain('totalCost');
      expect(csvData).toContain(','); // CSV delimiter
    });
  });

  describe('Efficiency Report', () => {
    it('should generate cost efficiency report', () => {
      const report = dashboard.generateEfficiencyReport();

      expect(report).toHaveProperty('overallEfficiency');
      expect(report).toHaveProperty('serviceEfficiency');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('benchmarks');
      
      expect(typeof report.overallEfficiency).toBe('number');
      expect(report.serviceEfficiency).toBeInstanceOf(Object);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.benchmarks).toBeInstanceOf(Object);
    });
  });

  describe('Real-time Updates', () => {
    it('should support real-time metric subscriptions', (done) => {
      const unsubscribe = dashboard.subscribeToRealTimeUpdates((metrics) => {
        expect(metrics).toHaveProperty('totalCost');
        expect(metrics).toHaveProperty('dailyCost');
        expect(metrics).toHaveProperty('topServices');
        
        unsubscribe();
        done();
      });

      // Trigger an update by adding more cost data
      costOptimizer.trackUsageCosts('openai', 'text-completion', 0.01);
    });
  });
});
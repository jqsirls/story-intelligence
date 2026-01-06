import { LatencyOptimizer, LatencyConfig, OptimizationRequest } from '../latency/LatencyOptimizer';

describe('LatencyOptimizer', () => {
  let optimizer: LatencyOptimizer;
  let mockConfig: LatencyConfig;

  beforeEach(() => {
    mockConfig = {
      predictiveGeneration: {
        enabled: true,
        maxPredictions: 50,
        confidenceThreshold: 0.7
      },
      connectionPooling: {
        maxConnections: 10,
        keepAliveTimeout: 30000,
        idleTimeout: 60000
      },
      requestPrioritization: {
        enabled: true,
        maxConcurrentRequests: 5,
        priorityLevels: 3
      },
      adaptiveTimeouts: {
        enabled: true,
        baseTimeout: 5000,
        maxTimeout: 30000,
        adjustmentFactor: 0.1
      },
      performanceTargets: {
        p50Latency: 500,
        p95Latency: 2000,
        p99Latency: 5000
      }
    };

    optimizer = new LatencyOptimizer(mockConfig);
  });

  describe('request optimization', () => {
    it('should optimize a simple request', async () => {
      const request: OptimizationRequest = {
        id: 'test-request-1',
        type: 'story_generation',
        priority: 'high',
        userId: 'user-123',
        context: { storyType: 'bedtime' }
      };

      const mockHandler = jest.fn().mockResolvedValue({ story: 'Generated story' });
      
      const result = await optimizer.optimizeRequest(request, mockHandler);
      
      expect(result).toEqual({ story: 'Generated story' });
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it('should handle request timeouts', async () => {
      const request: OptimizationRequest = {
        id: 'timeout-request',
        type: 'story_generation',
        priority: 'low',
        userId: 'user-123',
        context: {},
        timeout: 100 // Very short timeout
      };

      const mockHandler = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200)) // Longer than timeout
      );

      await expect(optimizer.optimizeRequest(request, mockHandler))
        .rejects.toThrow('Request timeout');
    });

    it('should retry failed requests when policy allows', async () => {
      const request: OptimizationRequest = {
        id: 'retry-request',
        type: 'story_generation',
        priority: 'medium',
        userId: 'user-123',
        context: {},
        retryPolicy: {
          maxRetries: 2,
          backoffMultiplier: 1.5,
          maxBackoffTime: 5000
        }
      };

      let callCount = 0;
      const mockHandler = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          throw new Error('500 Internal Server Error');
        }
        return Promise.resolve({ success: true });
      });

      const result = await optimizer.optimizeRequest(request, mockHandler);
      
      expect(result).toEqual({ success: true });
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('batch optimization', () => {
    it('should process batch requests by priority', async () => {
      const requests: OptimizationRequest[] = [
        {
          id: 'low-priority',
          type: 'asset_generation',
          priority: 'low',
          userId: 'user-1',
          context: {}
        },
        {
          id: 'high-priority',
          type: 'conversation',
          priority: 'high',
          userId: 'user-2',
          context: {}
        },
        {
          id: 'medium-priority',
          type: 'character_creation',
          priority: 'medium',
          userId: 'user-3',
          context: {}
        }
      ];

      const processOrder: string[] = [];
      const mockHandler = jest.fn().mockImplementation((req: OptimizationRequest) => {
        processOrder.push(req.id);
        return Promise.resolve({ id: req.id });
      });

      const results = await optimizer.batchOptimize(requests, mockHandler);

      expect(results.size).toBe(3);
      expect(processOrder[0]).toBe('high-priority'); // High priority processed first
      expect(results.get('high-priority')).toEqual({ id: 'high-priority' });
    });
  });

  describe('metrics and reporting', () => {
    it('should provide latency metrics', () => {
      const metrics = optimizer.getMetrics();
      
      expect(metrics).toHaveProperty('averageLatency');
      expect(metrics).toHaveProperty('p50Latency');
      expect(metrics).toHaveProperty('p95Latency');
      expect(metrics).toHaveProperty('p99Latency');
      expect(metrics).toHaveProperty('requestsPerSecond');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should generate performance reports', () => {
      const report = optimizer.getPerformanceReport();
      
      expect(report).toHaveProperty('currentMetrics');
      expect(report).toHaveProperty('performanceTargets');
      expect(report).toHaveProperty('targetsMet');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('recentTrends');
    });
  });

  describe('configuration updates', () => {
    it('should update configuration dynamically', () => {
      const updates = {
        predictiveGeneration: {
          enabled: false,
          maxPredictions: 25,
          confidenceThreshold: 0.8
        }
      };

      const configPromise = new Promise(resolve => {
        optimizer.once('configurationUpdated', resolve);
      });

      optimizer.adjustConfiguration(updates);

      expect(configPromise).resolves.toBeDefined();
    });
  });

  describe('predictive loading', () => {
    it('should preload predictive responses', () => {
      const contexts = [
        { storyType: 'bedtime', characterAge: 5 },
        { storyType: 'adventure', characterAge: 8 }
      ];

      // Should not throw
      expect(() => {
        optimizer.preloadPredictiveResponses('story_generation', contexts, 'high');
      }).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should emit latency events', async () => {
      const request: OptimizationRequest = {
        id: 'event-test',
        type: 'story_generation',
        priority: 'medium',
        userId: 'user-123',
        context: {}
      };

      const mockHandler = jest.fn().mockResolvedValue({ result: 'success' });
      
      const latencyPromise = new Promise(resolve => {
        optimizer.once('latencyRecorded', resolve);
      });

      await optimizer.optimizeRequest(request, mockHandler);
      
      await expect(latencyPromise).resolves.toBeDefined();
    });

    it('should emit error events on request failures', async () => {
      const request: OptimizationRequest = {
        id: 'error-test',
        type: 'story_generation',
        priority: 'medium',
        userId: 'user-123',
        context: {}
      };

      const mockHandler = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const errorPromise = new Promise(resolve => {
        optimizer.once('requestError', resolve);
      });

      await expect(optimizer.optimizeRequest(request, mockHandler))
        .rejects.toThrow('Test error');
      
      await expect(errorPromise).resolves.toBeDefined();
    });
  });
});
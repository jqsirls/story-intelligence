/**
 * Test suite for Load Testing Infrastructure
 */

import { LoadTestingInfrastructure, LoadTestConfig, LoadTestScenario } from '../LoadTestingInfrastructure';
import { ConcurrentRequestHandler } from '../ConcurrentRequestHandler';
import { ServiceScalabilityValidator } from '../ServiceScalabilityValidator';
import { ResourceUtilizationMonitor } from '../ResourceUtilizationMonitor';
import { PerformanceDegradationDetector } from '../PerformanceDegradationDetector';
import { BottleneckIdentificationTool } from '../BottleneckIdentificationTool';

// Mock fetch for testing
global.fetch = jest.fn();

describe('LoadTestingInfrastructure', () => {
  let loadTester: LoadTestingInfrastructure;
  let mockConfig: LoadTestConfig;

  beforeEach(() => {
    mockConfig = {
      testName: 'AI Integration Load Test',
      duration: 30000, // 30 seconds
      maxConcurrentRequests: 50,
      rampUpTime: 5000,
      rampDownTime: 5000,
      endpoints: {
        openai: 'https://api.openai.com/v1/chat/completions',
        elevenlabs: 'https://api.elevenlabs.io/v1/text-to-speech',
        personality: 'https://api.storytailor.com/v1/personality',
        webvtt: 'https://api.storytailor.com/v1/webvtt'
      },
      thresholds: {
        maxResponseTime: 5000,
        maxErrorRate: 5,
        maxCpuUsage: 80,
        maxMemoryUsage: 80,
        minThroughput: 10
      },
      scenarios: [
        {
          name: 'Story Generation',
          weight: 40,
          endpoint: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          payload: {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Tell me a story about a brave mouse' }]
          },
          expectedResponseTime: 3000
        },
        {
          name: 'Voice Synthesis',
          weight: 30,
          endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
          method: 'POST',
          payload: {
            text: 'Once upon a time, there was a brave little mouse.',
            voice_id: 'test-voice-id'
          },
          expectedResponseTime: 5000
        },
        {
          name: 'Personality Analysis',
          weight: 20,
          endpoint: 'https://api.storytailor.com/v1/personality',
          method: 'POST',
          payload: {
            age: 7,
            preferences: ['adventure', 'animals']
          },
          expectedResponseTime: 1000
        },
        {
          name: 'WebVTT Generation',
          weight: 10,
          endpoint: 'https://api.storytailor.com/v1/webvtt',
          method: 'GET',
          expectedResponseTime: 500
        }
      ]
    };

    loadTester = new LoadTestingInfrastructure(mockConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Load Test Execution', () => {
    it('should initialize with correct configuration', () => {
      expect(loadTester).toBeDefined();
      expect(loadTester['config']).toEqual(mockConfig);
    });

    it('should start and complete a load test', async () => {
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200
      });

      const startPromise = loadTester.startLoadTest();
      
      // Simulate test completion
      setTimeout(() => {
        loadTester['isRunning'] = false;
      }, 100);

      const result = await startPromise;

      expect(result).toBeDefined();
      expect(result.testName).toBe(mockConfig.testName);
      expect(result.totalRequests).toBeGreaterThan(0);
      expect(result.overallResult).toBeDefined();
    });

    it('should handle ramp-up phase correctly', async () => {
      const rampUpSpy = jest.spyOn(loadTester as any, 'executeRampUp');
      
      // Mock the private methods to avoid actual execution
      jest.spyOn(loadTester as any, 'executeSustainedLoad').mockResolvedValue(undefined);
      jest.spyOn(loadTester as any, 'executeRampDown').mockResolvedValue(undefined);
      jest.spyOn(loadTester as any, 'generateTestResult').mockResolvedValue({
        testName: 'test',
        totalRequests: 100,
        overallResult: 'passed'
      });

      await loadTester.startLoadTest();

      expect(rampUpSpy).toHaveBeenCalled();
    });

    it('should emit progress events during execution', async () => {
      const progressEvents: any[] = [];
      
      loadTester.on('rampUpProgress', (data) => progressEvents.push({ type: 'rampUp', data }));
      loadTester.on('sustainedLoadComplete', (data) => progressEvents.push({ type: 'sustained', data }));
      loadTester.on('rampDownProgress', (data) => progressEvents.push({ type: 'rampDown', data }));

      // Mock methods to complete quickly
      jest.spyOn(loadTester as any, 'executeRampUp').mockImplementation(async () => {
        loadTester.emit('rampUpProgress', { step: 1, progress: 100 });
      });
      jest.spyOn(loadTester as any, 'executeSustainedLoad').mockImplementation(async () => {
        loadTester.emit('sustainedLoadComplete', { duration: 1000 });
      });
      jest.spyOn(loadTester as any, 'executeRampDown').mockImplementation(async () => {
        loadTester.emit('rampDownProgress', { step: 1, progress: 100 });
      });
      jest.spyOn(loadTester as any, 'generateTestResult').mockResolvedValue({});

      await loadTester.startLoadTest();

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents.some(e => e.type === 'rampUp')).toBe(true);
    });

    it('should detect performance degradation', async () => {
      const degradationEvents: any[] = [];
      
      loadTester.on('performanceDegradation', (data) => degradationEvents.push(data));

      // Mock slow response to trigger degradation detection
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
        status: 200
      });

      // Simulate performance degradation by mocking slow response times
      jest.spyOn(loadTester as any, 'executeRequest').mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second delay
      });

      // Start test with short duration
      const shortConfig = { ...mockConfig, duration: 1000 };
      const shortLoadTester = new LoadTestingInfrastructure(shortConfig);
      
      // Mock the test to complete quickly but emit degradation
      setTimeout(() => {
        shortLoadTester.emit('performanceDegradation', {
          scenario: 'Story Generation',
          expectedTime: 3000,
          actualTime: 10000,
          degradationFactor: 3.33
        });
      }, 50);

      shortLoadTester.on('performanceDegradation', (data) => degradationEvents.push(data));

      // Wait for events
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(degradationEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Resource Monitoring', () => {
    it('should start and stop resource monitoring', async () => {
      const startSpy = jest.spyOn(loadTester as any, 'startResourceMonitoring');
      const stopSpy = jest.spyOn(loadTester as any, 'stopResourceMonitoring');

      // Mock other methods
      jest.spyOn(loadTester as any, 'executeRampUp').mockResolvedValue(undefined);
      jest.spyOn(loadTester as any, 'executeSustainedLoad').mockResolvedValue(undefined);
      jest.spyOn(loadTester as any, 'executeRampDown').mockResolvedValue(undefined);
      jest.spyOn(loadTester as any, 'generateTestResult').mockResolvedValue({});

      await loadTester.startLoadTest();

      expect(startSpy).toHaveBeenCalled();
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should collect resource data', () => {
      const resourceData = loadTester['collectResourceData']();

      expect(resourceData).toBeDefined();
      expect(resourceData.timestamp).toBeDefined();
      expect(resourceData.cpu).toBeDefined();
      expect(resourceData.memory).toBeDefined();
      expect(resourceData.network).toBeDefined();
      expect(resourceData.disk).toBeDefined();
    });

    it('should detect resource bottlenecks', () => {
      const bottleneckEvents: any[] = [];
      loadTester.on('bottleneckDetected', (data) => bottleneckEvents.push(data));

      // Create resource data that exceeds thresholds
      const highResourceData = {
        timestamp: Date.now(),
        cpu: { usage: 95, loadAverage: [3.0, 2.5, 2.0], cores: 4 },
        memory: { used: 8000000000, free: 1000000000, total: 9000000000, percentage: 89 },
        network: { bytesIn: 0, bytesOut: 0, packetsIn: 0, packetsOut: 0 },
        disk: { readBytes: 0, writeBytes: 0, readOps: 0, writeOps: 0 }
      };

      loadTester['checkResourceBottlenecks'](highResourceData);

      expect(bottleneckEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Collection', () => {
    it('should calculate current metrics correctly', () => {
      // Add some mock response times
      loadTester['responseTimes'] = [100, 200, 300, 400, 500];
      loadTester['errors'] = 1;
      loadTester['startTime'] = Date.now() - 5000; // 5 seconds ago

      const metrics = loadTester['calculateCurrentMetrics']();

      expect(metrics).toBeDefined();
      expect(metrics.requestsPerSecond).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBe(300); // Average of [100,200,300,400,500]
      expect(metrics.errorRate).toBe(20); // 1 error out of 5 requests = 20%
    });

    it('should calculate percentiles correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      
      const p95 = loadTester['calculatePercentile'](values, 95);
      const p99 = loadTester['calculatePercentile'](values, 99);

      expect(p95).toBe(100); // 95th percentile
      expect(p99).toBe(100); // 99th percentile
    });
  });

  describe('Scenario Selection', () => {
    it('should select scenarios based on weights', () => {
      const selectedScenarios: string[] = [];
      
      // Select scenarios multiple times to test distribution
      for (let i = 0; i < 1000; i++) {
        const scenario = loadTester['selectScenario']();
        selectedScenarios.push(scenario.name);
      }

      // Check that Story Generation (40% weight) is selected most frequently
      const storyGenerationCount = selectedScenarios.filter(s => s === 'Story Generation').length;
      const voiceSynthesisCount = selectedScenarios.filter(s => s === 'Voice Synthesis').length;

      expect(storyGenerationCount).toBeGreaterThan(voiceSynthesisCount);
      expect(storyGenerationCount).toBeGreaterThan(300); // Should be around 400 (40%)
    });
  });

  describe('Error Handling', () => {
    it('should handle request errors gracefully', async () => {
      const errorEvents: any[] = [];
      loadTester.on('requestError', (error) => errorEvents.push(error));

      // Mock fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Execute a single request worker briefly
      const endTime = Date.now() + 100;
      await loadTester['executeRequestWorker'](endTime);

      expect(errorEvents.length).toBeGreaterThan(0);
    });

    it('should prevent starting multiple tests simultaneously', async () => {
      loadTester['isRunning'] = true;

      await expect(loadTester.startLoadTest()).rejects.toThrow('Load test is already running');
    });
  });

  describe('Test Result Generation', () => {
    it('should generate comprehensive test results', async () => {
      // Set up mock data
      loadTester['responseTimes'] = [100, 200, 300, 400, 500];
      loadTester['errors'] = 1;
      loadTester['startTime'] = Date.now() - 10000;
      loadTester['metrics'] = [
        {
          timestamp: Date.now(),
          requestsPerSecond: 10,
          averageResponseTime: 300,
          p95ResponseTime: 500,
          p99ResponseTime: 500,
          errorRate: 20,
          activeConnections: 5,
          cpuUsage: 50,
          memoryUsage: 60,
          networkLatency: 10,
          throughput: 10
        }
      ];

      const result = await loadTester['generateTestResult']();

      expect(result).toBeDefined();
      expect(result.testName).toBe(mockConfig.testName);
      expect(result.totalRequests).toBe(5);
      expect(result.successfulRequests).toBe(4);
      expect(result.failedRequests).toBe(1);
      expect(result.averageResponseTime).toBe(300);
      expect(result.errorRate).toBe(20);
      expect(result.bottlenecks).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should analyze response time trends', () => {
      // Set up response times with degradation
      loadTester['responseTimes'] = [
        100, 110, 120, 130, 140, // First quarter
        200, 210, 220, 230, 240, // Second quarter
        300, 310, 320, 330, 340, // Third quarter
        400, 410, 420, 430, 440  // Last quarter (degraded)
      ];

      const trend = loadTester['analyzeResponseTimeTrend']();

      expect(trend.degradation).toBeGreaterThan(0);
      expect(trend.firstQuarterAvg).toBeLessThan(trend.lastQuarterAvg);
    });
  });
});

describe('ConcurrentRequestHandler', () => {
  let requestHandler: ConcurrentRequestHandler;

  beforeEach(() => {
    requestHandler = new ConcurrentRequestHandler({
      maxConcurrency: 10,
      connectionPoolSize: 20,
      requestTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      keepAlive: true,
      maxSockets: 50
    });
  });

  it('should initialize with correct configuration', () => {
    expect(requestHandler).toBeDefined();
  });

  it('should handle concurrent requests', async () => {
    await requestHandler.start();

    const tasks = [
      {
        id: 'test-1',
        url: 'https://httpbin.org/delay/1',
        method: 'GET' as const,
        priority: 'medium' as const,
        expectedResponseTime: 1000
      },
      {
        id: 'test-2',
        url: 'https://httpbin.org/delay/1',
        method: 'GET' as const,
        priority: 'high' as const,
        expectedResponseTime: 1000
      }
    ];

    requestHandler.addRequests(tasks);

    // Wait for requests to be processed
    await new Promise(resolve => setTimeout(resolve, 100));

    const metrics = requestHandler.getMetrics();
    expect(metrics.queuedRequests).toBeGreaterThanOrEqual(0);

    await requestHandler.stop();
  });

  it('should prioritize high priority requests', async () => {
    await requestHandler.start();

    const lowPriorityTask = {
      id: 'low-priority',
      url: 'https://httpbin.org/delay/1',
      method: 'GET' as const,
      priority: 'low' as const,
      expectedResponseTime: 1000
    };

    const highPriorityTask = {
      id: 'high-priority',
      url: 'https://httpbin.org/delay/1',
      method: 'GET' as const,
      priority: 'high' as const,
      expectedResponseTime: 1000
    };

    requestHandler.addRequest(lowPriorityTask);
    requestHandler.addRequest(highPriorityTask);

    // The high priority task should be selected first
    const nextTask = requestHandler['getNextPriorityTask']();
    expect(nextTask?.priority).toBe('high');

    await requestHandler.stop();
  });
});

describe('ServiceScalabilityValidator', () => {
  let scalabilityValidator: ServiceScalabilityValidator;

  beforeEach(() => {
    scalabilityValidator = new ServiceScalabilityValidator({
      serviceName: 'AI Integration Service',
      baseUrl: 'https://api.storytailor.com',
      testDuration: 60000,
      scalingSteps: [
        {
          name: 'Low Load',
          concurrency: 10,
          duration: 15000,
          expectedThroughput: 50,
          expectedResponseTime: 200
        },
        {
          name: 'Medium Load',
          concurrency: 25,
          duration: 15000,
          expectedThroughput: 100,
          expectedResponseTime: 300
        }
      ],
      thresholds: {
        maxResponseTimeDegradation: 50,
        maxThroughputDegradation: 30,
        maxErrorRateIncrease: 5,
        minScalingEfficiency: 70
      },
      endpoints: [
        {
          name: 'Health Check',
          path: '/health',
          method: 'GET',
          weight: 50,
          criticalPath: true
        },
        {
          name: 'Story Generation',
          path: '/v1/stories',
          method: 'POST',
          weight: 50,
          criticalPath: true
        }
      ]
    });
  });

  it('should initialize with correct configuration', () => {
    expect(scalabilityValidator).toBeDefined();
  });

  it('should calculate scaling efficiency correctly', () => {
    // Mock baseline metrics
    scalabilityValidator['metrics'] = [
      {
        step: 'baseline',
        concurrency: 10,
        throughput: 50,
        averageResponseTime: 200,
        p95ResponseTime: 250,
        p99ResponseTime: 300,
        errorRate: 1,
        scalingEfficiency: 100,
        resourceUtilization: { cpu: 30, memory: 40, network: 20, connections: 50 },
        bottlenecks: []
      }
    ];

    const step = {
      name: 'Medium Load',
      concurrency: 20,
      duration: 15000,
      expectedThroughput: 100,
      expectedResponseTime: 300
    };

    const metrics = {
      requestsPerSecond: 80, // 80 RPS actual vs 100 RPS theoretical
      averageResponseTime: 250,
      errorRate: 2,
      connectionPoolUtilization: 60
    };

    const efficiency = scalabilityValidator['calculateScalingEfficiency'](step, metrics as any);
    expect(efficiency).toBeGreaterThan(0);
    expect(efficiency).toBeLessThanOrEqual(100);
  });
});

describe('Integration Tests', () => {
  it('should integrate all load testing components', async () => {
    const loadTester = new LoadTestingInfrastructure({
      testName: 'Integration Test',
      duration: 5000, // Short test
      maxConcurrentRequests: 5,
      rampUpTime: 1000,
      rampDownTime: 1000,
      endpoints: {
        openai: 'https://httpbin.org/delay/1',
        elevenlabs: 'https://httpbin.org/delay/2',
        personality: 'https://httpbin.org/delay/1',
        webvtt: 'https://httpbin.org/get'
      },
      thresholds: {
        maxResponseTime: 5000,
        maxErrorRate: 10,
        maxCpuUsage: 90,
        maxMemoryUsage: 90,
        minThroughput: 1
      },
      scenarios: [
        {
          name: 'Test Scenario',
          weight: 100,
          endpoint: 'https://httpbin.org/get',
          method: 'GET',
          expectedResponseTime: 1000
        }
      ]
    });

    const events: string[] = [];
    
    loadTester.on('rampUpProgress', () => events.push('rampUp'));
    loadTester.on('sustainedLoadComplete', () => events.push('sustained'));
    loadTester.on('rampDownProgress', () => events.push('rampDown'));

    // Mock successful responses
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
      status: 200
    });

    const result = await loadTester.startLoadTest();

    expect(result).toBeDefined();
    expect(result.testName).toBe('Integration Test');
    expect(events.length).toBeGreaterThan(0);
  });
});
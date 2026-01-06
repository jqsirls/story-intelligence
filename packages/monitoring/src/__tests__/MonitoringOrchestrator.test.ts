import { MonitoringOrchestrator } from '../MonitoringOrchestrator';
import { CloudWatch, CloudWatchLogs } from 'aws-sdk';
import { EventBridge } from '@aws-sdk/client-eventbridge';
import { StatsD } from 'node-statsd';
import { createClient } from 'redis';

// Mock all dependencies
jest.mock('aws-sdk');
jest.mock('@aws-sdk/client-eventbridge');
jest.mock('node-statsd');
jest.mock('redis');
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  transports: {
    Console: jest.fn()
  },
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn()
  }
}));

describe('MonitoringOrchestrator', () => {
  let orchestrator: MonitoringOrchestrator;
  let mockCloudWatch: jest.Mocked<CloudWatch>;
  let mockCloudWatchLogs: jest.Mocked<CloudWatchLogs>;
  let mockEventBridge: jest.Mocked<EventBridge>;
  let mockStatsD: jest.Mocked<StatsD>;
  let mockRedis: any;

  const config = {
    serviceName: 'test-service',
    environment: 'test',
    region: 'us-east-1',
    cloudWatchLogGroup: '/aws/lambda/test',
    cloudWatchLogStream: 'test-stream',
    metricsNamespace: 'TestApp',
    enableTracing: false,
    enableMetrics: true,
    enableLogs: true,
    alertingEnabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup CloudWatch mock
    mockCloudWatch = {
      putMetricData: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      }),
      putMetricAlarm: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      }),
      getMetricStatistics: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Datapoints: [] })
      }),
      putDashboard: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      })
    } as any;

    // Setup CloudWatchLogs mock
    mockCloudWatchLogs = {
      createLogStream: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      }),
      putLogEvents: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ nextSequenceToken: 'token123' })
      }),
      filterLogEvents: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ events: [] })
      })
    } as any;

    // Setup EventBridge mock
    mockEventBridge = {
      putEvents: jest.fn().mockResolvedValue({})
    } as any;

    // Setup StatsD mock
    mockStatsD = {
      increment: jest.fn(),
      timing: jest.fn(),
      gauge: jest.fn()
    } as any;

    // Setup Redis mock
    mockRedis = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined)
    };

    (CloudWatch as jest.Mock).mockImplementation(() => mockCloudWatch);
    (CloudWatchLogs as jest.Mock).mockImplementation(() => mockCloudWatchLogs);
    (EventBridge as jest.Mock).mockImplementation(() => mockEventBridge);
    (StatsD as jest.Mock).mockImplementation(() => mockStatsD);
    (createClient as jest.Mock).mockReturnValue(mockRedis);

    orchestrator = new MonitoringOrchestrator(config);
  });

  describe('log', () => {
    it('should log info messages', async () => {
      await orchestrator.log({
        level: 'info',
        message: 'Test message',
        context: { key: 'value' }
      });

      // Verify logger was called
      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'info',
        'Test message',
        expect.objectContaining({
          level: 'info',
          message: 'Test message',
          key: 'value'
        })
      );
    });

    it('should publish error events to EventBridge', async () => {
      await orchestrator.log({
        level: 'error',
        message: 'Error occurred',
        error: new Error('Test error')
      });

      expect(mockEventBridge.putEvents).toHaveBeenCalledWith({
        Entries: [{
          Source: 'storytailor.test-service',
          DetailType: 'Error Event',
          Detail: expect.stringContaining('Error occurred')
        }]
      });
    });

    it('should include trace information when provided', async () => {
      await orchestrator.log({
        level: 'info',
        message: 'Traced message',
        traceId: 'trace-123',
        spanId: 'span-456',
        correlationId: 'corr-789'
      });

      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'info',
        'Traced message',
        expect.objectContaining({
          traceId: 'trace-123',
          spanId: 'span-456',
          correlationId: 'corr-789'
        })
      );
    });
  });

  describe('recordMetric', () => {
    it('should send count metrics to StatsD and CloudWatch', async () => {
      await orchestrator.recordMetric({
        name: 'test.count',
        value: 5,
        unit: 'Count'
      });

      expect(mockStatsD.increment).toHaveBeenCalledWith('test.count', 5);
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestApp',
        MetricData: [{
          MetricName: 'test.count',
          Value: 5,
          Unit: 'Count',
          Timestamp: expect.any(Date),
          Dimensions: expect.arrayContaining([
            { Name: 'Service', Value: 'test-service' },
            { Name: 'Environment', Value: 'test' }
          ])
        }]
      });
    });

    it('should send timing metrics', async () => {
      await orchestrator.recordMetric({
        name: 'api.latency',
        value: 150,
        unit: 'Milliseconds'
      });

      expect(mockStatsD.timing).toHaveBeenCalledWith('api.latency', 150);
    });

    it('should send gauge metrics', async () => {
      await orchestrator.recordMetric({
        name: 'memory.usage',
        value: 75.5,
        unit: 'Percent'
      });

      expect(mockStatsD.gauge).toHaveBeenCalledWith('memory.usage', 75.5);
    });

    it('should include custom dimensions', async () => {
      await orchestrator.recordMetric({
        name: 'custom.metric',
        value: 1,
        unit: 'Count',
        dimensions: {
          endpoint: '/api/test',
          method: 'GET'
        }
      });

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: [{
            MetricName: 'custom.metric',
            Value: 1,
            Unit: 'Count',
            Timestamp: expect.any(Date),
            Dimensions: expect.arrayContaining([
              { Name: 'endpoint', Value: '/api/test' },
              { Name: 'method', Value: 'GET' }
            ])
          }]
        })
      );
    });

    it('should not send metrics when disabled', async () => {
      const disabledOrchestrator = new MonitoringOrchestrator({
        ...config,
        enableMetrics: false
      });

      await disabledOrchestrator.recordMetric({
        name: 'test.metric',
        value: 1,
        unit: 'Count'
      });

      expect(mockStatsD.increment).not.toHaveBeenCalled();
      expect(mockCloudWatch.putMetricData).not.toHaveBeenCalled();
    });
  });

  describe('createAlarm', () => {
    it('should create CloudWatch alarm', async () => {
      await orchestrator.createAlarm('test-alarm', {
        metricName: 'api.errors',
        threshold: 10,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 2,
        period: 300,
        statistic: 'Sum',
        actionsEnabled: true
      });

      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledWith({
        AlarmName: 'test-service-test-test-alarm',
        ComparisonOperator: 'GreaterThanThreshold',
        EvaluationPeriods: 2,
        MetricName: 'api.errors',
        Namespace: 'TestApp',
        Period: 300,
        Statistic: 'Sum',
        Threshold: 10,
        ActionsEnabled: true,
        AlarmActions: undefined,
        AlarmDescription: undefined,
        Dimensions: expect.any(Array)
      });
    });

    it('should not create alarms when alerting is disabled', async () => {
      const noAlertOrchestrator = new MonitoringOrchestrator({
        ...config,
        alertingEnabled: false
      });

      await noAlertOrchestrator.createAlarm('test', {
        metricName: 'test',
        threshold: 1,
        comparisonOperator: 'GreaterThanThreshold',
        evaluationPeriods: 1,
        period: 60,
        statistic: 'Average',
        actionsEnabled: true
      });

      expect(mockCloudWatch.putMetricAlarm).not.toHaveBeenCalled();
    });
  });

  describe('trackRequest', () => {
    it('should track successful requests', async () => {
      await orchestrator.trackRequest({
        method: 'GET',
        path: '/api/test',
        statusCode: 200,
        duration: 125,
        userId: 'user-123'
      });

      // Should log the request
      expect((orchestrator as any).logger.log).toHaveBeenCalled();

      // Should record count metric
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'api.request.count',
              Value: 1
            })
          ])
        })
      );

      // Should record duration metric
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'api.request.duration',
              Value: 125
            })
          ])
        })
      );
    });

    it('should track error requests', async () => {
      await orchestrator.trackRequest({
        method: 'POST',
        path: '/api/error',
        statusCode: 500,
        duration: 50,
        error: new Error('Server error')
      });

      // Should record error metric
      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'api.request.error',
              Value: 1
            })
          ])
        })
      );
    });
  });

  describe('trackAgentCommunication', () => {
    it('should track successful agent communication', async () => {
      await orchestrator.trackAgentCommunication({
        sourceAgent: 'router',
        targetAgent: 'content',
        eventType: 'CREATE_STORY',
        success: true,
        duration: 200
      });

      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'info',
        'Agent communication: router -> content',
        expect.any(Object)
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalled();
    });

    it('should track failed agent communication', async () => {
      await orchestrator.trackAgentCommunication({
        sourceAgent: 'router',
        targetAgent: 'auth',
        eventType: 'VERIFY_TOKEN',
        success: false,
        duration: 50,
        error: new Error('Connection failed')
      });

      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'error',
        'Agent communication: router -> auth',
        expect.any(Object)
      );
    });
  });

  describe('trackPerformance', () => {
    it('should track operation performance', async () => {
      await orchestrator.trackPerformance({
        operation: 'database.query',
        duration: 45,
        success: true
      });

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'performance.database.query.duration',
              Value: 45
            })
          ])
        })
      );
    });

    it('should log warnings for slow operations', async () => {
      await orchestrator.trackPerformance({
        operation: 'slow.operation',
        duration: 6000,
        success: true
      });

      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'warn',
        'Slow operation detected: slow.operation',
        expect.objectContaining({
          duration: 6000
        })
      );
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should register and run health checks', async () => {
      const healthChecker = jest.fn().mockResolvedValue({
        healthy: true,
        details: { version: '1.0.0' }
      });

      await orchestrator.registerHealthCheck('test-service', healthChecker);

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(30000);
      await Promise.resolve(); // Let promises resolve

      expect(healthChecker).toHaveBeenCalled();
    });

    it('should handle health check failures', async () => {
      const failingChecker = jest.fn().mockRejectedValue(new Error('Health check failed'));

      await orchestrator.registerHealthCheck('failing-service', failingChecker);

      jest.advanceTimersByTime(30000);
      await Promise.resolve();

      const status = await orchestrator.getHealthStatus();
      expect(status.services).toContainEqual(
        expect.objectContaining({
          service: 'failing-service',
          status: 'unhealthy'
        })
      );
    });
  });

  describe('createDashboard', () => {
    it('should create CloudWatch dashboard', async () => {
      await orchestrator.createDashboard('main', [{
        type: 'metric',
        title: 'API Requests',
        metrics: ['api.request.count', 'api.request.duration'],
        width: 12,
        height: 6,
        position: { x: 0, y: 0 }
      }]);

      expect(mockCloudWatch.putDashboard).toHaveBeenCalledWith({
        DashboardName: 'test-service-test-main',
        DashboardBody: expect.stringContaining('API Requests')
      });
    });
  });

  describe('searchLogs', () => {
    it('should search CloudWatch logs', async () => {
      const mockEvents = [
        { message: 'Log 1', timestamp: Date.now() },
        { message: 'Log 2', timestamp: Date.now() }
      ];

      mockCloudWatchLogs.filterLogEvents.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ events: mockEvents })
      } as any);

      const results = await orchestrator.searchLogs({
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(),
        filter: 'ERROR'
      });

      expect(mockCloudWatchLogs.filterLogEvents).toHaveBeenCalledWith({
        logGroupName: '/aws/lambda/test',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        filterPattern: 'ERROR',
        limit: 100
      });

      expect(results).toEqual(mockEvents);
    });
  });

  describe('getMetricStats', () => {
    it('should retrieve metric statistics', async () => {
      const mockDatapoints = [
        { Timestamp: new Date(), Average: 150 },
        { Timestamp: new Date(), Average: 175 }
      ];

      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Datapoints: mockDatapoints })
      } as any);

      const stats = await orchestrator.getMetricStats({
        metricName: 'api.latency',
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date()
      });

      expect(mockCloudWatch.getMetricStatistics).toHaveBeenCalled();
      expect(stats).toEqual(mockDatapoints);
    });
  });

  describe('setupDefaultAlarms', () => {
    it('should create all default alarms', async () => {
      await orchestrator.setupDefaultAlarms();

      // Should create multiple alarms
      expect(mockCloudWatch.putMetricAlarm).toHaveBeenCalledTimes(4);

      // Verify specific alarms
      const alarmCalls = mockCloudWatch.putMetricAlarm.mock.calls;
      const alarmNames = alarmCalls.map(call => call[0].AlarmName);

      expect(alarmNames).toContain('test-service-test-high-error-rate');
      expect(alarmNames).toContain('test-service-test-high-latency');
      expect(alarmNames).toContain('test-service-test-agent-communication-failure');
      expect(alarmNames).toContain('test-service-test-health-check-failure');
    });
  });

  describe('trackColdStart', () => {
    it('should track Lambda cold starts', async () => {
      await orchestrator.trackColdStart(500);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'lambda.cold_start',
              Value: 1,
              Unit: 'Count'
            })
          ])
        })
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'lambda.cold_start.duration',
              Value: 500,
              Unit: 'Milliseconds'
            })
          ])
        })
      );
    });
  });

  describe('trackMemoryUsage', () => {
    it('should track memory metrics', async () => {
      const mockMemoryUsage = {
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        external: 5 * 1024 * 1024 // 5MB
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockMemoryUsage as any);

      await orchestrator.trackMemoryUsage();

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'memory.heap.used',
              Value: mockMemoryUsage.heapUsed
            })
          ])
        })
      );
    });

    it('should warn on high memory usage', async () => {
      const mockHighMemoryUsage = {
        heapUsed: 95 * 1024 * 1024, // 95MB
        heapTotal: 100 * 1024 * 1024, // 100MB  
        external: 5 * 1024 * 1024
      };

      jest.spyOn(process, 'memoryUsage').mockReturnValue(mockHighMemoryUsage as any);

      await orchestrator.trackMemoryUsage();

      expect((orchestrator as any).logger.log).toHaveBeenCalledWith(
        'warn',
        'High memory usage detected',
        expect.objectContaining({
          percentage: expect.any(Number)
        })
      );
    });
  });

  describe('Business Metrics', () => {
    it('should track business events', async () => {
      await orchestrator.trackBusinessMetric({
        name: 'story.created',
        value: 1,
        dimensions: {
          userId: 'user-123',
          characterId: 'char-456'
        }
      });

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricData: expect.arrayContaining([
            expect.objectContaining({
              MetricName: 'business.story.created',
              Value: 1
            })
          ])
        })
      );

      // Should also log significant events
      expect((orchestrator as any).logger.log).toHaveBeenCalled();
    });
  });
});
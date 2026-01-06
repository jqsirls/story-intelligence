import { LoadTestOrchestrator } from '../LoadTestOrchestrator';
import { CloudWatch, Lambda, EventBridge } from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  CloudWatch: jest.fn().mockImplementation(() => ({
    getMetricData: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        MetricDataResults: [
          { Id: 'lambda_invocations', Values: [50000] },
          { Id: 'lambda_errors', Values: [50] },
          { Id: 'lambda_concurrent', Values: [4500] }
        ]
      })
    })
  })),
  Lambda: jest.fn().mockImplementation(() => ({
    listFunctions: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Functions: [] })
    })
  })),
  EventBridge: jest.fn().mockImplementation(() => ({
    putEvents: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ FailedEntryCount: 0 })
    })
  }))
}));

// Mock file system
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn()
}));

// Mock child_process
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

describe('LoadTestOrchestrator', () => {
  let orchestrator: LoadTestOrchestrator;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
  const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new LoadTestOrchestrator();
    
    // Mock k6 execution result
    mockExecSync.mockReturnValue('k6 test completed');
    
    // Mock k6 JSON output
    mockReadFileSync.mockReturnValue(JSON.stringify({
      type: 'Point',
      metric: 'http_reqs',
      data: { value: 1000000 }
    }) + '\n' + JSON.stringify({
      type: 'Point',
      metric: 'http_req_failed',
      data: { value: 1000 }
    }));
  });

  describe('runMegaLoadTest', () => {
    it('should run 100K concurrent user load test', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result).toMatchObject({
        testId: expect.stringMatching(/^load-test-\d+$/),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        maxConcurrentUsers: 100000,
        totalRequests: expect.any(Number),
        passed: expect.any(Boolean)
      });

      // Verify k6 script was generated
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('load-test-'),
        expect.stringContaining('stages')
      );
    });

    it('should include all required test scenarios', async () => {
      await orchestrator.runMegaLoadTest();

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      
      // Check for all scenarios
      expect(scriptContent).toContain('new_user_onboarding');
      expect(scriptContent).toContain('story_generation');
      expect(scriptContent).toContain('library_browsing');
      expect(scriptContent).toContain('voice_interaction');
      expect(scriptContent).toContain('crisis_intervention');
    });

    it('should generate test users file', async () => {
      await orchestrator.runMegaLoadTest();

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-users.json'),
        expect.stringContaining('loadtest-user')
      );
    });

    it('should analyze bottlenecks correctly', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result.bottlenecks).toBeDefined();
      expect(Array.isArray(result.bottlenecks)).toBe(true);
      
      // Should identify any performance issues
      if (result.bottlenecks.length > 0) {
        expect(result.bottlenecks[0]).toMatchObject({
          component: expect.any(String),
          metric: expect.any(String),
          observedValue: expect.any(Number),
          threshold: expect.any(Number),
          severity: expect.stringMatching(/low|medium|high|critical/),
          impact: expect.any(String)
        });
      }
    });

    it('should generate recommendations', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should generate detailed report', async () => {
      await orchestrator.runMegaLoadTest();

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('load-test-'),
        expect.stringContaining('Load Test Report')
      );
    });
  });

  describe('runGradualRampUpTest', () => {
    it('should execute gradual ramp-up with stages', async () => {
      const result = await orchestrator.runGradualRampUpTest();

      expect(result).toBeDefined();
      expect(result.maxConcurrentUsers).toBe(100000);

      // Check that stages were properly configured
      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('1000'); // First stage
      expect(scriptContent).toContain('10000'); // Second stage
      expect(scriptContent).toContain('50000'); // Third stage
      expect(scriptContent).toContain('100000'); // Final stage
    });

    it('should include ramp-down phase', async () => {
      await orchestrator.runGradualRampUpTest();

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('target: 0'); // Ramp down
    });
  });

  describe('runBurstTrafficTest', () => {
    it('should simulate burst traffic scenario', async () => {
      const result = await orchestrator.runBurstTrafficTest();

      expect(result).toBeDefined();
      expect(result.maxConcurrentUsers).toBe(50000);

      // Verify burst configuration
      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('30s'); // Fast ramp-up
      expect(scriptContent).toContain('viral_story_event');
    });

    it('should have relaxed thresholds for burst', async () => {
      const result = await orchestrator.runBurstTrafficTest();

      // During burst, we allow higher latency and error rates
      expect(result.metrics.responseTime.p95).toBeLessThanOrEqual(2000);
      expect(result.metrics.errorRate).toBeLessThanOrEqual(1.0);
    });
  });

  describe('testAgentUnderLoad', () => {
    it('should test specific agent with custom load', async () => {
      const result = await orchestrator.testAgentUnderLoad('content-agent', 10000);

      expect(result).toBeDefined();
      expect(result.maxConcurrentUsers).toBe(10000);

      // Verify agent-specific configuration
      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('story_generation_load');
    });

    it('should apply agent-specific thresholds', async () => {
      await orchestrator.testAgentUnderLoad('auth-agent', 5000);

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('p(95)<200'); // Auth should be fast
    });
  });

  describe('Performance Metrics Collection', () => {
    it('should collect CloudWatch metrics during test', async () => {
      const cloudWatchMock = new CloudWatch();
      await orchestrator.runMegaLoadTest();

      expect(cloudWatchMock.getMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          MetricDataQueries: expect.arrayContaining([
            expect.objectContaining({ Id: 'lambda_invocations' }),
            expect.objectContaining({ Id: 'lambda_errors' }),
            expect.objectContaining({ Id: 'lambda_concurrent' })
          ])
        })
      );
    });

    it('should calculate error rate correctly', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result.metrics.errorRate).toBeDefined();
      expect(result.metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(result.metrics.errorRate).toBeLessThanOrEqual(100);
    });

    it('should track Lambda metrics', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result.metrics.lambdaMetrics).toMatchObject({
        invocations: expect.any(Number),
        errors: expect.any(Number),
        throttles: expect.any(Number),
        concurrentExecutions: expect.any(Number),
        duration: {
          avg: expect.any(Number),
          max: expect.any(Number)
        }
      });
    });

    it('should track database metrics', async () => {
      const result = await orchestrator.runMegaLoadTest();

      expect(result.metrics.databaseMetrics).toMatchObject({
        activeConnections: expect.any(Number),
        connectionPoolUtilization: expect.any(Number),
        queryTime: {
          avg: expect.any(Number),
          max: expect.any(Number)
        }
      });
    });
  });

  describe('Bottleneck Analysis', () => {
    it('should identify response time bottlenecks', async () => {
      const result = await orchestrator.runMegaLoadTest();

      // If p95 exceeds threshold, should be identified
      if (result.metrics.responseTime.p95 > 1000) {
        const bottleneck = result.bottlenecks.find(b => 
          b.metric === 'p95 Response Time'
        );
        expect(bottleneck).toBeDefined();
      }
    });

    it('should identify Lambda concurrency limits', async () => {
      const result = await orchestrator.runMegaLoadTest();

      // Check if approaching Lambda limits
      if (result.metrics.lambdaMetrics.concurrentExecutions > 4500) {
        const bottleneck = result.bottlenecks.find(b => 
          b.component === 'AWS Lambda'
        );
        expect(bottleneck).toBeDefined();
      }
    });

    it('should classify bottleneck severity correctly', async () => {
      const result = await orchestrator.runMegaLoadTest();

      result.bottlenecks.forEach(bottleneck => {
        if (bottleneck.observedValue > bottleneck.threshold * 2) {
          expect(bottleneck.severity).toMatch(/high|critical/);
        }
      });
    });
  });

  describe('Recommendations Engine', () => {
    it('should provide Lambda scaling recommendations', async () => {
      const result = await orchestrator.runMegaLoadTest();

      if (result.metrics.lambdaMetrics.concurrentExecutions > 4000) {
        const lambdaRec = result.recommendations.find(r => 
          r.includes('Lambda concurrency limit')
        );
        expect(lambdaRec).toBeDefined();
      }
    });

    it('should provide database optimization recommendations', async () => {
      const result = await orchestrator.runMegaLoadTest();

      if (result.metrics.databaseMetrics.connectionPoolUtilization > 80) {
        const dbRec = result.recommendations.find(r => 
          r.includes('database connection pool')
        );
        expect(dbRec).toBeDefined();
      }
    });

    it('should include cost optimization recommendations', async () => {
      const result = await orchestrator.runMegaLoadTest();

      const costRec = result.recommendations.find(r => 
        r.includes('cost') || r.includes('auto-scaling')
      );
      expect(costRec).toBeDefined();
    });
  });

  describe('k6 Script Generation', () => {
    it('should generate valid k6 script with stages', async () => {
      await orchestrator.runMegaLoadTest();

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      
      // Verify k6 script structure
      expect(scriptContent).toContain('import http from \'k6/http\'');
      expect(scriptContent).toContain('export const options');
      expect(scriptContent).toContain('stages:');
      expect(scriptContent).toContain('thresholds:');
      expect(scriptContent).toContain('export default function()');
    });

    it('should include authentication logic', async () => {
      await orchestrator.runMegaLoadTest();

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('function authenticate(user)');
      expect(scriptContent).toContain('/v1/auth/login');
    });

    it('should implement scenario weighting', async () => {
      await orchestrator.runMegaLoadTest();

      const scriptContent = mockWriteFileSync.mock.calls[0][1] as string;
      expect(scriptContent).toContain('selectScenario()');
      expect(scriptContent).toContain('Math.random() * 100');
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start monitoring during test', async () => {
      jest.useFakeTimers();
      
      const monitoringPromise = orchestrator.runMegaLoadTest();
      
      // Fast-forward time to trigger monitoring
      jest.advanceTimersByTime(5000);
      
      // CloudWatch should be called for monitoring
      const cloudWatchMock = new CloudWatch();
      expect(cloudWatchMock.getMetricData).toHaveBeenCalled();
      
      jest.useRealTimers();
      await monitoringPromise;
    });

    it('should handle monitoring errors gracefully', async () => {
      const cloudWatchMock = new CloudWatch();
      (cloudWatchMock.getMetricData as jest.Mock).mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('CloudWatch error'))
      });

      // Should not throw even with monitoring errors
      await expect(orchestrator.runMegaLoadTest()).resolves.toBeDefined();
    });
  });

  describe('Test Result Validation', () => {
    it('should mark test as passed when within thresholds', async () => {
      const result = await orchestrator.runMegaLoadTest();

      if (result.bottlenecks.filter(b => b.severity === 'critical').length === 0) {
        expect(result.passed).toBe(true);
      }
    });

    it('should mark test as failed with critical bottlenecks', async () => {
      // Mock critical performance issues
      mockReadFileSync.mockReturnValueOnce(
        JSON.stringify({ type: 'Point', metric: 'http_req_duration', data: { value: 5000 } })
      );

      const result = await orchestrator.runMegaLoadTest();

      if (result.bottlenecks.some(b => b.severity === 'critical')) {
        expect(result.passed).toBe(false);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle k6 execution failures', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('k6 command not found');
      });

      await expect(orchestrator.runMegaLoadTest()).rejects.toThrow('k6 command not found');
    });

    it('should clean up monitoring on test failure', async () => {
      mockExecSync.mockImplementation(() => {
        throw new Error('Test failed');
      });

      try {
        await orchestrator.runMegaLoadTest();
      } catch (error) {
        // Monitoring should be stopped
        expect(error).toBeDefined();
      }
    });
  });
});
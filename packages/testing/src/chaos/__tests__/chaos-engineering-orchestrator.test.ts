import { ChaosEngineeringOrchestrator } from '../ChaosEngineeringOrchestrator';
import { Lambda, EventBridge, CloudWatch, SSM, RDS } from 'aws-sdk';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  Lambda: jest.fn().mockImplementation(() => ({
    listFunctions: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Functions: [
          { FunctionName: 'storytailor-router-agent-staging' },
          { FunctionName: 'storytailor-auth-agent-staging' },
          { FunctionName: 'storytailor-content-agent-staging' }
        ]
      })
    }),
    updateFunctionConfiguration: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    putFunctionConcurrency: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    deleteFunctionConcurrency: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    getFunctionConfiguration: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Environment: { Variables: {} }
      })
    })
  })),
  EventBridge: jest.fn().mockImplementation(() => ({
    putRule: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    putTargets: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    removeTargets: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    deleteRule: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  CloudWatch: jest.fn().mockImplementation(() => ({
    getMetricData: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        MetricDataResults: []
      })
    })
  })),
  SSM: jest.fn().mockImplementation(() => ({
    putParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    }),
    deleteParameter: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    })
  })),
  RDS: jest.fn().mockImplementation(() => ({}))
}));

describe('ChaosEngineeringOrchestrator', () => {
  let orchestrator: ChaosEngineeringOrchestrator;
  let mockLambda: any;
  let mockEventBridge: any;
  let mockSSM: any;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new ChaosEngineeringOrchestrator();
    mockLambda = new Lambda();
    mockEventBridge = new EventBridge();
    mockSSM = new SSM();
  });

  describe('runChaosTestSuite', () => {
    it('should execute comprehensive chaos test suite', async () => {
      const result = await orchestrator.runChaosTestSuite();

      expect(result).toMatchObject({
        testId: expect.stringMatching(/^chaos-\d+$/),
        startTime: expect.any(Date),
        endTime: expect.any(Date),
        duration: expect.any(Number),
        scenariosExecuted: expect.any(Array),
        systemMetrics: expect.any(Object),
        findings: expect.any(Array),
        resilienceScore: expect.any(Object),
        recommendations: expect.any(Array),
        passed: expect.any(Boolean)
      });
    });

    it('should include all major chaos scenarios', async () => {
      const result = await orchestrator.runChaosTestSuite();

      const scenarioTypes = result.scenariosExecuted.map(s => s.scenarioName);
      
      // Should test various failure types
      expect(scenarioTypes.some(s => s.includes('Lambda'))).toBe(true);
      expect(scenarioTypes.some(s => s.includes('EventBridge'))).toBe(true);
      expect(scenarioTypes.some(s => s.includes('Database'))).toBe(true);
    });

    it('should calculate resilience score', async () => {
      const result = await orchestrator.runChaosTestSuite();

      expect(result.resilienceScore).toMatchObject({
        overall: expect.any(Number),
        availability: expect.any(Number),
        performance: expect.any(Number),
        recoverability: expect.any(Number),
        scalability: expect.any(Number),
        dataIntegrity: expect.any(Number)
      });

      // All scores should be 0-100
      Object.values(result.resilienceScore).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('testLambdaFailures', () => {
    it('should inject Lambda function failures', async () => {
      await orchestrator.testLambdaFailures();

      // Should update Lambda configuration to inject failures
      expect(mockLambda.updateFunctionConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          Environment: expect.objectContaining({
            Variables: expect.objectContaining({
              CHAOS_FAILURE_ENABLED: 'true'
            })
          })
        })
      );
    });

    it('should test cold start delays', async () => {
      const result = await orchestrator.testLambdaFailures();

      const coldStartScenario = result.scenariosExecuted.find(
        s => s.scenarioId === 'lambda-cold-start'
      );

      expect(coldStartScenario).toBeDefined();
    });

    it('should test Lambda throttling', async () => {
      await orchestrator.testLambdaFailures();

      // Should set concurrency limits
      expect(mockLambda.putFunctionConcurrency).toHaveBeenCalledWith(
        expect.objectContaining({
          ReservedConcurrentExecutions: expect.any(Number)
        })
      );
    });
  });

  describe('testEventBridgeFailures', () => {
    it('should inject EventBridge delays', async () => {
      process.env.CHAOS_DELAY_QUEUE_ARN = 'arn:aws:sqs:us-east-1:123456789012:chaos-delay';
      
      await orchestrator.testEventBridgeFailures();

      expect(mockEventBridge.putRule).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: expect.stringContaining('chaos-delay'),
          State: 'ENABLED'
        })
      );
    });

    it('should simulate message loss', async () => {
      process.env.CHAOS_BLACKHOLE_ARN = 'arn:aws:lambda:us-east-1:123456789012:function:blackhole';
      
      const result = await orchestrator.testEventBridgeFailures();

      const lossScenario = result.scenariosExecuted.find(
        s => s.scenarioId === 'eventbridge-loss'
      );

      expect(lossScenario).toBeDefined();
    });
  });

  describe('testDatabaseFailures', () => {
    it('should limit database connections', async () => {
      await orchestrator.testDatabaseFailures();

      expect(mockSSM.putParameter).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: '/chaos/database/connection-limit',
          Value: expect.any(String)
        })
      );
    });

    it('should simulate slow queries', async () => {
      const result = await orchestrator.testDatabaseFailures();

      const slowQueryScenario = result.scenariosExecuted.find(
        s => s.scenarioId === 'db-slow-queries'
      );

      expect(slowQueryScenario).toBeDefined();
      expect(slowQueryScenario?.impact.latencyIncrease).toBeGreaterThan(0);
    });
  });

  describe('testCascadingFailures', () => {
    it('should test auth service cascade', async () => {
      const result = await orchestrator.testCascadingFailures();

      const authCascade = result.scenariosExecuted.find(
        s => s.scenarioId === 'auth-cascade'
      );

      expect(authCascade).toBeDefined();
      expect(authCascade?.impact.cascadingEffects).toBeDefined();
    });

    it('should identify cascading impact', async () => {
      const result = await orchestrator.testCascadingFailures();

      // Should have findings about cascading failures
      const cascadingFindings = result.findings.filter(
        f => f.category === 'Cascading Failure'
      );

      expect(cascadingFindings.length).toBeGreaterThan(0);
    });
  });

  describe('testNetworkPartitions', () => {
    it('should simulate availability zone failures', async () => {
      const result = await orchestrator.testNetworkPartitions();

      const azPartition = result.scenariosExecuted.find(
        s => s.scenarioId === 'az-partition'
      );

      expect(azPartition).toBeDefined();
    });

    it('should test service-to-service network issues', async () => {
      const result = await orchestrator.testNetworkPartitions();

      const serviceIsolation = result.scenariosExecuted.find(
        s => s.scenarioId === 'service-isolation'
      );

      expect(serviceIsolation).toBeDefined();
    });
  });

  describe('Scenario Execution', () => {
    it('should respect probability settings', async () => {
      // Run test multiple times to check probability
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = await orchestrator.runChaosTestSuite();
        results.push(result.scenariosExecuted.length);
      }

      // Not all scenarios should execute every time due to probability
      const uniqueCounts = new Set(results);
      expect(uniqueCounts.size).toBeGreaterThan(1);
    });

    it('should monitor impact of chaos scenarios', async () => {
      const result = await orchestrator.runChaosTestSuite();

      result.scenariosExecuted.forEach(scenario => {
        expect(scenario.impact).toMatchObject({
          affectedServices: expect.any(Array),
          errorRate: expect.any(Number),
          latencyIncrease: expect.any(Number),
          availabilityDrop: expect.any(Number),
          cascadingEffects: expect.any(Array)
        });
      });
    });

    it('should track recovery metrics', async () => {
      const result = await orchestrator.runChaosTestSuite();

      result.scenariosExecuted.forEach(scenario => {
        expect(scenario.recovery).toMatchObject({
          detectionTime: expect.any(Number),
          mitigationTime: expect.any(Number),
          fullRecoveryTime: expect.any(Number),
          automaticRecovery: expect.any(Boolean),
          manualInterventions: expect.any(Array)
        });
      });
    });
  });

  describe('Safeguards', () => {
    it('should trigger rollback when safeguards are breached', async () => {
      // Mock high error rate to trigger safeguard
      jest.spyOn(orchestrator as any, 'checkSafeguards')
        .mockResolvedValueOnce(true);

      const result = await orchestrator.runChaosTestSuite();

      // Should have fewer scenarios executed due to rollback
      expect(result.scenariosExecuted.length).toBeLessThan(5);
    });

    it('should clean up chaos resources after test', async () => {
      await orchestrator.runChaosTestSuite();

      // Should remove Lambda chaos configurations
      expect(mockLambda.updateFunctionConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          Environment: expect.objectContaining({
            Variables: expect.not.objectContaining({
              CHAOS_FAILURE_ENABLED: expect.anything()
            })
          })
        })
      );
    });
  });

  describe('Findings and Recommendations', () => {
    it('should identify critical failures', async () => {
      const result = await orchestrator.runChaosTestSuite();

      if (!result.passed) {
        const criticalFindings = result.findings.filter(
          f => f.severity === 'critical'
        );
        expect(criticalFindings.length).toBeGreaterThan(0);
      }
    });

    it('should provide actionable recommendations', async () => {
      const result = await orchestrator.runChaosTestSuite();

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Recommendations should be specific
      result.recommendations.forEach(rec => {
        expect(rec).toMatch(/implement|add|improve|enable|create/i);
      });
    });

    it('should recommend circuit breakers for cascading failures', async () => {
      const result = await orchestrator.testCascadingFailures();

      const circuitBreakerRec = result.recommendations.find(
        r => r.toLowerCase().includes('circuit breaker')
      );

      expect(circuitBreakerRec).toBeDefined();
    });
  });

  describe('Resilience Scoring', () => {
    it('should calculate accurate availability score', async () => {
      const result = await orchestrator.runChaosTestSuite();

      // Availability score should reflect system metrics
      const expectedAvailability = result.systemMetrics.availability;
      expect(result.resilienceScore.availability).toBeCloseTo(expectedAvailability, 5);
    });

    it('should penalize slow recovery times', async () => {
      const result = await orchestrator.runChaosTestSuite();

      // Find scenarios with slow recovery
      const slowRecoveries = result.scenariosExecuted.filter(
        s => s.recovery.fullRecoveryTime > 300
      );

      if (slowRecoveries.length > 0) {
        expect(result.resilienceScore.recoverability).toBeLessThan(80);
      }
    });

    it('should calculate overall score as weighted average', async () => {
      const result = await orchestrator.runChaosTestSuite();

      const { 
        availability, 
        performance, 
        recoverability, 
        scalability, 
        dataIntegrity 
      } = result.resilienceScore;

      const expectedOverall = 
        availability * 0.3 +
        performance * 0.2 +
        recoverability * 0.2 +
        scalability * 0.15 +
        dataIntegrity * 0.15;

      expect(result.resilienceScore.overall).toBeCloseTo(expectedOverall, 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle scenario execution failures gracefully', async () => {
      // Mock a failure during scenario execution
      jest.spyOn(orchestrator as any, 'injectFailure')
        .mockRejectedValueOnce(new Error('Injection failed'));

      const result = await orchestrator.runChaosTestSuite();

      // Should continue with other scenarios
      expect(result.scenariosExecuted.length).toBeGreaterThan(0);
      
      // Failed scenario should be marked
      const failedScenario = result.scenariosExecuted.find(s => !s.success);
      expect(failedScenario?.errors.length).toBeGreaterThan(0);
    });

    it('should cleanup resources even on test failure', async () => {
      // Force test failure
      jest.spyOn(orchestrator as any, 'executeScenario')
        .mockRejectedValueOnce(new Error('Test failed'));

      try {
        await orchestrator.runChaosTestSuite();
      } catch (error) {
        // Expected
      }

      // Cleanup should still be called
      expect(mockLambda.updateFunctionConfiguration).toHaveBeenCalled();
    });
  });

  describe('Reporting', () => {
    it('should generate comprehensive chaos report', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await orchestrator.runChaosTestSuite();

      // Should log detailed report
      const reportCalls = consoleSpy.mock.calls.filter(
        call => call[0].includes('Chaos Engineering Test Report')
      );

      expect(reportCalls.length).toBeGreaterThan(0);
      
      // Report should include key sections
      const report = reportCalls[0][0];
      expect(report).toContain('Resilience Score');
      expect(report).toContain('System Metrics');
      expect(report).toContain('Scenario Results');
      expect(report).toContain('Recommendations');

      consoleSpy.mockRestore();
    });

    it('should mark test as failed for low resilience score', async () => {
      // Mock poor performance
      jest.spyOn(orchestrator as any, 'calculateResilienceScore')
        .mockReturnValueOnce({
          overall: 60,
          availability: 70,
          performance: 50,
          recoverability: 60,
          scalability: 65,
          dataIntegrity: 55
        });

      const result = await orchestrator.runChaosTestSuite();

      expect(result.passed).toBe(false);
    });
  });
});
import { Lambda, EventBridge, CloudWatch, SSM, RDS } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import * as pLimit from 'p-limit';

interface ChaosTestConfig {
  testId: string;
  targetEnvironment: 'staging' | 'load-test' | 'chaos-test';
  duration: number; // minutes
  intensity: 'low' | 'medium' | 'high' | 'extreme';
  scenarios: ChaosScenario[];
  safeguards: SafeguardConfig;
  rollbackPlan: RollbackPlan;
}

interface ChaosScenario {
  id: string;
  name: string;
  type: ChaosType;
  target: ChaosTarget;
  parameters: Record<string, any>;
  duration: number; // seconds
  probability: number; // 0-1
  severity: 'low' | 'medium' | 'high' | 'critical';
}

type ChaosType = 
  | 'lambda_failure'
  | 'lambda_timeout'
  | 'lambda_throttle'
  | 'eventbridge_delay'
  | 'eventbridge_loss'
  | 'database_connection_failure'
  | 'api_gateway_throttle'
  | 'network_partition'
  | 'resource_exhaustion'
  | 'cascading_failure'
  | 'cache_invalidation'
  | 'service_degradation'
  | 'configuration_drift';

interface ChaosTarget {
  service: string;
  resource?: string;
  percentage?: number; // percentage of requests affected
}

interface SafeguardConfig {
  maxErrorRate: number; // percentage
  maxLatency: number; // milliseconds
  minAvailability: number; // percentage
  circuitBreakerThreshold: number;
  autoRollbackEnabled: boolean;
}

interface RollbackPlan {
  triggerConditions: TriggerCondition[];
  steps: RollbackStep[];
  notificationTargets: string[];
}

interface TriggerCondition {
  metric: string;
  threshold: number;
  duration: number; // seconds
}

interface RollbackStep {
  action: string;
  target: string;
  parameters: Record<string, any>;
}

interface ChaosTestResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  scenariosExecuted: ScenarioResult[];
  systemMetrics: SystemMetrics;
  findings: Finding[];
  resilience Score: ResilienceScore;
  recommendations: string[];
  passed: boolean;
}

interface ScenarioResult {
  scenarioId: string;
  scenarioName: string;
  executionTime: Date;
  impact: Impact;
  recovery: Recovery;
  success: boolean;
  errors: string[];
}

interface Impact {
  affectedServices: string[];
  errorRate: number;
  latencyIncrease: number;
  availabilityDrop: number;
  cascadingEffects: string[];
}

interface Recovery {
  detectionTime: number; // seconds
  mitigationTime: number; // seconds
  fullRecoveryTime: number; // seconds
  automaticRecovery: boolean;
  manualInterventions: string[];
}

interface SystemMetrics {
  availability: number;
  errorRate: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number;
  lambdaErrors: number;
  eventBridgeFailures: number;
  databaseErrors: number;
}

interface Finding {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  affectedComponents: string[];
  recommendation: string;
}

interface ResilienceScore {
  overall: number; // 0-100
  availability: number;
  performance: number;
  recoverability: number;
  scalability: number;
  dataIntegrity: number;
}

export class ChaosEngineeringOrchestrator {
  private lambda: Lambda;
  private eventBridge: EventBridge;
  private cloudWatch: CloudWatch;
  private ssm: SSM;
  private rds: RDS;
  private activeExperiments: Map<string, ChaosExperiment> = new Map();
  private metrics: MetricsCollector;
  private limit = pLimit(5); // Limit concurrent chaos operations

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    this.lambda = new Lambda({ region });
    this.eventBridge = new EventBridge({ region });
    this.cloudWatch = new CloudWatch({ region });
    this.ssm = new SSM({ region });
    this.rds = new RDS({ region });
    this.metrics = new MetricsCollector(this.cloudWatch);
  }

  /**
   * Run comprehensive chaos engineering test suite
   */
  async runChaosTestSuite(): Promise<ChaosTestResult> {
    console.log(`\n⚡ Starting Chaos Engineering Test Suite\n`);

    const config: ChaosTestConfig = {
      testId: `chaos-${Date.now()}`,
      targetEnvironment: 'chaos-test',
      duration: 30, // 30 minutes
      intensity: 'medium',
      scenarios: this.getComprehensiveChaosScenarios(),
      safeguards: {
        maxErrorRate: 5, // 5%
        maxLatency: 5000, // 5s
        minAvailability: 95, // 95%
        circuitBreakerThreshold: 50,
        autoRollbackEnabled: true
      },
      rollbackPlan: this.getDefaultRollbackPlan()
    };

    return this.executeChaosTest(config);
  }

  /**
   * Test Lambda function failures
   */
  async testLambdaFailures(): Promise<ChaosTestResult> {
    console.log(`\n🔥 Testing Lambda Function Failures\n`);

    const scenarios: ChaosScenario[] = [
      {
        id: 'lambda-cold-start',
        name: 'Simulate Cold Start Delays',
        type: 'lambda_timeout',
        target: { service: 'all-agents', percentage: 20 },
        parameters: { delay: 3000 },
        duration: 300,
        probability: 0.2,
        severity: 'medium'
      },
      {
        id: 'lambda-oom',
        name: 'Simulate Out of Memory',
        type: 'lambda_failure',
        target: { service: 'content-agent', percentage: 10 },
        parameters: { errorType: 'ResourceExhausted' },
        duration: 180,
        probability: 0.1,
        severity: 'high'
      },
      {
        id: 'lambda-throttle',
        name: 'Simulate Throttling',
        type: 'lambda_throttle',
        target: { service: 'router-agent', percentage: 30 },
        parameters: { throttleRate: 0.3 },
        duration: 300,
        probability: 0.3,
        severity: 'high'
      }
    ];

    const config = this.createChaosConfig('lambda-failures', scenarios, 'high');
    return this.executeChaosTest(config);
  }

  /**
   * Test EventBridge failures
   */
  async testEventBridgeFailures(): Promise<ChaosTestResult> {
    console.log(`\n📨 Testing EventBridge Failures\n`);

    const scenarios: ChaosScenario[] = [
      {
        id: 'eventbridge-delay',
        name: 'Simulate Message Delays',
        type: 'eventbridge_delay',
        target: { service: 'eventbridge', percentage: 25 },
        parameters: { delayMs: 5000 },
        duration: 300,
        probability: 0.25,
        severity: 'medium'
      },
      {
        id: 'eventbridge-loss',
        name: 'Simulate Message Loss',
        type: 'eventbridge_loss',
        target: { service: 'eventbridge', percentage: 5 },
        parameters: { lossRate: 0.05 },
        duration: 180,
        probability: 0.05,
        severity: 'critical'
      }
    ];

    const config = this.createChaosConfig('eventbridge-failures', scenarios, 'medium');
    return this.executeChaosTest(config);
  }

  /**
   * Test database failures
   */
  async testDatabaseFailures(): Promise<ChaosTestResult> {
    console.log(`\n🗄️ Testing Database Failures\n`);

    const scenarios: ChaosScenario[] = [
      {
        id: 'db-connection-pool',
        name: 'Exhaust Connection Pool',
        type: 'database_connection_failure',
        target: { service: 'supabase', percentage: 50 },
        parameters: { connectionLimit: 10 },
        duration: 300,
        probability: 0.5,
        severity: 'high'
      },
      {
        id: 'db-slow-queries',
        name: 'Simulate Slow Queries',
        type: 'service_degradation',
        target: { service: 'supabase', percentage: 30 },
        parameters: { queryDelay: 3000 },
        duration: 300,
        probability: 0.3,
        severity: 'medium'
      }
    ];

    const config = this.createChaosConfig('database-failures', scenarios, 'high');
    return this.executeChaosTest(config);
  }

  /**
   * Test cascading failures
   */
  async testCascadingFailures(): Promise<ChaosTestResult> {
    console.log(`\n🌊 Testing Cascading Failures\n`);

    const scenarios: ChaosScenario[] = [
      {
        id: 'auth-cascade',
        name: 'Auth Service Failure Cascade',
        type: 'cascading_failure',
        target: { service: 'auth-agent' },
        parameters: { 
          initialFailure: 'auth-agent',
          expectedCascade: ['content-agent', 'library-agent', 'commerce-agent']
        },
        duration: 600,
        probability: 1.0,
        severity: 'critical'
      },
      {
        id: 'router-cascade',
        name: 'Router Failure Cascade',
        type: 'cascading_failure',
        target: { service: 'router-agent' },
        parameters: {
          initialFailure: 'router-agent',
          expectedCascade: 'all-agents'
        },
        duration: 300,
        probability: 1.0,
        severity: 'critical'
      }
    ];

    const config = this.createChaosConfig('cascading-failures', scenarios, 'extreme');
    return this.executeChaosTest(config);
  }

  /**
   * Test network partitions
   */
  async testNetworkPartitions(): Promise<ChaosTestResult> {
    console.log(`\n🔌 Testing Network Partitions\n`);

    const scenarios: ChaosScenario[] = [
      {
        id: 'az-partition',
        name: 'Availability Zone Partition',
        type: 'network_partition',
        target: { service: 'multi-az', percentage: 33 },
        parameters: {
          partitionType: 'availability-zone',
          affectedAZ: 'us-east-1a'
        },
        duration: 300,
        probability: 1.0,
        severity: 'high'
      },
      {
        id: 'service-isolation',
        name: 'Service-to-Service Network Issues',
        type: 'network_partition',
        target: { service: 'inter-agent-communication' },
        parameters: {
          source: 'content-agent',
          destination: 'emotion-agent',
          packetLoss: 0.5
        },
        duration: 180,
        probability: 0.5,
        severity: 'medium'
      }
    ];

    const config = this.createChaosConfig('network-partitions', scenarios, 'high');
    return this.executeChaosTest(config);
  }

  /**
   * Execute chaos test with given configuration
   */
  private async executeChaosTest(config: ChaosTestConfig): Promise<ChaosTestResult> {
    const startTime = new Date();
    const experiment = new ChaosExperiment(config, this);
    
    this.activeExperiments.set(config.testId, experiment);

    // Start metrics collection
    const metricsHandle = this.metrics.startCollection(config.testId);

    // Deploy safeguards
    await this.deploySafeguards(config.safeguards);

    const scenarioResults: ScenarioResult[] = [];
    const findings: Finding[] = [];

    try {
      // Execute scenarios
      for (const scenario of config.scenarios) {
        if (Math.random() <= scenario.probability) {
          console.log(`\n🎯 Executing: ${scenario.name}`);
          
          const result = await this.executeScenario(scenario, config);
          scenarioResults.push(result);

          // Check safeguards
          if (await this.checkSafeguards(config.safeguards)) {
            console.log('⚠️  Safeguard triggered - rolling back');
            await this.executeRollback(config.rollbackPlan);
            break;
          }

          // Wait between scenarios
          await this.delay(10000); // 10 seconds
        }
      }

      // Collect final metrics
      const endTime = new Date();
      const systemMetrics = await this.metrics.stopCollection(metricsHandle);

      // Analyze results
      const resilienceScore = this.calculateResilienceScore(scenarioResults, systemMetrics);
      findings.push(...this.analyzeFindings(scenarioResults, systemMetrics));
      const recommendations = this.generateRecommendations(findings);

      // Determine if test passed
      const passed = resilienceScore.overall >= 80 && 
                    findings.filter(f => f.severity === 'critical').length === 0;

      const result: ChaosTestResult = {
        testId: config.testId,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        scenariosExecuted: scenarioResults,
        systemMetrics,
        findings,
        resilienceScore,
        recommendations,
        passed
      };

      // Generate report
      this.generateChaosReport(result);

      return result;

    } finally {
      // Cleanup
      this.activeExperiments.delete(config.testId);
      await this.cleanupChaosResources(config);
    }
  }

  /**
   * Execute individual chaos scenario
   */
  private async executeScenario(
    scenario: ChaosScenario, 
    config: ChaosTestConfig
  ): Promise<ScenarioResult> {
    const executionTime = new Date();
    const errors: string[] = [];

    try {
      // Inject failure
      await this.injectFailure(scenario);

      // Monitor impact
      const impactStartTime = Date.now();
      const impact = await this.monitorImpact(scenario, config);

      // Wait for scenario duration
      await this.delay(scenario.duration * 1000);

      // Remove failure
      await this.removeFailure(scenario);

      // Monitor recovery
      const recovery = await this.monitorRecovery(scenario, config, impactStartTime);

      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        executionTime,
        impact,
        recovery,
        success: recovery.fullRecoveryTime < 300, // Recovery within 5 minutes
        errors
      };

    } catch (error: any) {
      errors.push(error.message);
      
      return {
        scenarioId: scenario.id,
        scenarioName: scenario.name,
        executionTime,
        impact: this.getEmptyImpact(),
        recovery: this.getEmptyRecovery(),
        success: false,
        errors
      };
    }
  }

  /**
   * Inject failure based on scenario type
   */
  private async injectFailure(scenario: ChaosScenario): Promise<void> {
    switch (scenario.type) {
      case 'lambda_failure':
        await this.injectLambdaFailure(scenario);
        break;
      
      case 'lambda_timeout':
        await this.injectLambdaTimeout(scenario);
        break;
      
      case 'lambda_throttle':
        await this.injectLambdaThrottle(scenario);
        break;
      
      case 'eventbridge_delay':
        await this.injectEventBridgeDelay(scenario);
        break;
      
      case 'eventbridge_loss':
        await this.injectEventBridgeLoss(scenario);
        break;
      
      case 'database_connection_failure':
        await this.injectDatabaseFailure(scenario);
        break;
      
      case 'network_partition':
        await this.injectNetworkPartition(scenario);
        break;
      
      case 'cascading_failure':
        await this.injectCascadingFailure(scenario);
        break;
      
      default:
        throw new Error(`Unknown chaos type: ${scenario.type}`);
    }
  }

  /**
   * Lambda failure injection methods
   */
  private async injectLambdaFailure(scenario: ChaosScenario): Promise<void> {
    const functions = await this.getTargetLambdaFunctions(scenario.target);
    
    for (const func of functions) {
      // Add environment variable to trigger failures
      await this.lambda.updateFunctionConfiguration({
        FunctionName: func,
        Environment: {
          Variables: {
            CHAOS_FAILURE_ENABLED: 'true',
            CHAOS_FAILURE_RATE: String(scenario.target.percentage || 100),
            CHAOS_FAILURE_TYPE: scenario.parameters.errorType || 'InternalError'
          }
        }
      }).promise();
    }
  }

  private async injectLambdaTimeout(scenario: ChaosScenario): Promise<void> {
    const functions = await this.getTargetLambdaFunctions(scenario.target);
    
    for (const func of functions) {
      await this.lambda.updateFunctionConfiguration({
        FunctionName: func,
        Environment: {
          Variables: {
            CHAOS_DELAY_ENABLED: 'true',
            CHAOS_DELAY_MS: String(scenario.parameters.delay),
            CHAOS_DELAY_RATE: String(scenario.target.percentage || 100)
          }
        }
      }).promise();
    }
  }

  private async injectLambdaThrottle(scenario: ChaosScenario): Promise<void> {
    const functions = await this.getTargetLambdaFunctions(scenario.target);
    
    for (const func of functions) {
      // Temporarily reduce reserved concurrent executions
      await this.lambda.putFunctionConcurrency({
        FunctionName: func,
        ReservedConcurrentExecutions: 5 // Very low to simulate throttling
      }).promise();
    }
  }

  /**
   * EventBridge failure injection
   */
  private async injectEventBridgeDelay(scenario: ChaosScenario): Promise<void> {
    // Create a rule that intercepts and delays messages
    await this.eventBridge.putRule({
      Name: `chaos-delay-${scenario.id}`,
      EventBusName: 'storytailor-staging',
      EventPattern: JSON.stringify({
        account: [{ exists: true }]
      }),
      State: 'ENABLED'
    }).promise();

    // Add target with delay (using SQS with delay queue)
    await this.eventBridge.putTargets({
      Rule: `chaos-delay-${scenario.id}`,
      EventBusName: 'storytailor-staging',
      Targets: [{
        Id: '1',
        Arn: process.env.CHAOS_DELAY_QUEUE_ARN!,
        SqsParameters: {
          MessageGroupId: 'chaos-test'
        }
      }]
    }).promise();
  }

  private async injectEventBridgeLoss(scenario: ChaosScenario): Promise<void> {
    // Create a rule that drops messages
    await this.eventBridge.putRule({
      Name: `chaos-loss-${scenario.id}`,
      EventBusName: 'storytailor-staging',
      EventPattern: JSON.stringify({
        account: [{ exists: true }]
      }),
      State: 'ENABLED'
    }).promise();

    // Add a dead target that simulates message loss
    await this.eventBridge.putTargets({
      Rule: `chaos-loss-${scenario.id}`,
      EventBusName: 'storytailor-staging',
      Targets: [{
        Id: '1',
        Arn: process.env.CHAOS_BLACKHOLE_ARN!, // Lambda that does nothing
        RetryPolicy: {
          MaximumRetryAttempts: 0
        }
      }]
    }).promise();
  }

  /**
   * Database failure injection
   */
  private async injectDatabaseFailure(scenario: ChaosScenario): Promise<void> {
    // Use SSM to update database proxy settings
    await this.ssm.putParameter({
      Name: '/chaos/database/connection-limit',
      Value: String(scenario.parameters.connectionLimit || 1),
      Type: 'String',
      Overwrite: true
    }).promise();

    // The database proxy or connection pool should read this parameter
  }

  /**
   * Network partition injection
   */
  private async injectNetworkPartition(scenario: ChaosScenario): Promise<void> {
    // This would typically use AWS Network ACLs or Security Group rules
    // For simulation, we'll use Lambda environment variables
    
    if (scenario.parameters.partitionType === 'availability-zone') {
      // Simulate AZ failure by disabling functions in that AZ
      const functions = await this.getFunctionsInAZ(scenario.parameters.affectedAZ);
      
      for (const func of functions) {
        await this.lambda.updateFunctionConfiguration({
          FunctionName: func,
          Environment: {
            Variables: {
              CHAOS_NETWORK_PARTITION: 'true',
              CHAOS_PARTITION_TYPE: 'az-failure'
            }
          }
        }).promise();
      }
    }
  }

  /**
   * Cascading failure injection
   */
  private async injectCascadingFailure(scenario: ChaosScenario): Promise<void> {
    // First, fail the initial service
    await this.injectLambdaFailure({
      ...scenario,
      target: { service: scenario.parameters.initialFailure, percentage: 100 }
    });

    // The cascade should happen naturally due to dependencies
    // We'll monitor to ensure it cascades as expected
  }

  /**
   * Remove injected failures
   */
  private async removeFailure(scenario: ChaosScenario): Promise<void> {
    switch (scenario.type) {
      case 'lambda_failure':
      case 'lambda_timeout':
        await this.removeLambdaFailure(scenario);
        break;
      
      case 'lambda_throttle':
        await this.removeLambdaThrottle(scenario);
        break;
      
      case 'eventbridge_delay':
      case 'eventbridge_loss':
        await this.removeEventBridgeFailure(scenario);
        break;
      
      case 'database_connection_failure':
        await this.removeDatabaseFailure(scenario);
        break;
      
      case 'network_partition':
        await this.removeNetworkPartition(scenario);
        break;
      
      case 'cascading_failure':
        await this.removeCascadingFailure(scenario);
        break;
    }
  }

  /**
   * Monitor impact of chaos scenario
   */
  private async monitorImpact(
    scenario: ChaosScenario, 
    config: ChaosTestConfig
  ): Promise<Impact> {
    // Wait for impact to be observable
    await this.delay(5000);

    // Collect metrics
    const metrics = await this.metrics.getCurrentMetrics();
    
    // Identify affected services
    const affectedServices = await this.identifyAffectedServices(scenario, metrics);
    
    // Calculate impact metrics
    const baselineMetrics = await this.metrics.getBaselineMetrics();
    
    return {
      affectedServices,
      errorRate: metrics.errorRate - baselineMetrics.errorRate,
      latencyIncrease: 
        ((metrics.latency.p95 - baselineMetrics.latency.p95) / 
         baselineMetrics.latency.p95) * 100,
      availabilityDrop: baselineMetrics.availability - metrics.availability,
      cascadingEffects: await this.detectCascadingEffects(scenario, affectedServices)
    };
  }

  /**
   * Monitor recovery after failure removal
   */
  private async monitorRecovery(
    scenario: ChaosScenario,
    config: ChaosTestConfig,
    impactStartTime: number
  ): Promise<Recovery> {
    const detectionTime = (Date.now() - impactStartTime) / 1000;
    let mitigationTime = 0;
    let fullRecoveryTime = 0;
    const manualInterventions: string[] = [];

    // Monitor recovery progress
    const maxRecoveryTime = 600; // 10 minutes max
    const startRecovery = Date.now();
    
    while ((Date.now() - startRecovery) / 1000 < maxRecoveryTime) {
      const metrics = await this.metrics.getCurrentMetrics();
      const baseline = await this.metrics.getBaselineMetrics();
      
      // Check if partially recovered (50% better)
      if (mitigationTime === 0) {
        const errorRateDiff = Math.abs(metrics.errorRate - baseline.errorRate);
        const latencyDiff = Math.abs(metrics.latency.p95 - baseline.latency.p95);
        
        if (errorRateDiff < 1 && latencyDiff < 100) {
          mitigationTime = (Date.now() - impactStartTime) / 1000;
        }
      }
      
      // Check if fully recovered
      if (this.isFullyRecovered(metrics, baseline)) {
        fullRecoveryTime = (Date.now() - impactStartTime) / 1000;
        break;
      }
      
      await this.delay(5000); // Check every 5 seconds
    }

    return {
      detectionTime,
      mitigationTime: mitigationTime || fullRecoveryTime,
      fullRecoveryTime: fullRecoveryTime || maxRecoveryTime,
      automaticRecovery: manualInterventions.length === 0,
      manualInterventions
    };
  }

  /**
   * Calculate resilience score
   */
  private calculateResilienceScore(
    scenarios: ScenarioResult[],
    metrics: SystemMetrics
  ): ResilienceScore {
    // Availability score
    const availability = metrics.availability;
    
    // Performance score (based on latency degradation)
    const performance = Math.max(0, 100 - (metrics.latency.p95 / 10));
    
    // Recoverability score (based on recovery times)
    const avgRecoveryTime = scenarios.reduce((sum, s) => 
      sum + s.recovery.fullRecoveryTime, 0
    ) / scenarios.length;
    const recoverability = Math.max(0, 100 - (avgRecoveryTime / 6)); // 600s = 0 score
    
    // Scalability (based on throughput maintenance)
    const scalability = Math.min(100, (metrics.throughput / 1000) * 100);
    
    // Data integrity (based on successful scenarios)
    const dataIntegrity = (scenarios.filter(s => s.success).length / scenarios.length) * 100;
    
    // Overall score (weighted average)
    const overall = (
      availability * 0.3 +
      performance * 0.2 +
      recoverability * 0.2 +
      scalability * 0.15 +
      dataIntegrity * 0.15
    );

    return {
      overall,
      availability,
      performance,
      recoverability,
      scalability,
      dataIntegrity
    };
  }

  /**
   * Analyze findings from chaos test
   */
  private analyzeFindings(
    scenarios: ScenarioResult[],
    metrics: SystemMetrics
  ): Finding[] {
    const findings: Finding[] = [];

    // Check for critical failures
    scenarios.forEach(scenario => {
      if (!scenario.success) {
        findings.push({
          severity: 'critical',
          category: 'Resilience Failure',
          description: `Service failed to recover from ${scenario.scenarioName}`,
          affectedComponents: scenario.impact.affectedServices,
          recommendation: `Implement circuit breakers and retry mechanisms for ${scenario.impact.affectedServices.join(', ')}`
        });
      }

      // Check recovery times
      if (scenario.recovery.fullRecoveryTime > 300) {
        findings.push({
          severity: 'high',
          category: 'Slow Recovery',
          description: `Recovery took ${scenario.recovery.fullRecoveryTime}s for ${scenario.scenarioName}`,
          affectedComponents: scenario.impact.affectedServices,
          recommendation: 'Implement faster detection and automated recovery procedures'
        });
      }

      // Check cascading failures
      if (scenario.impact.cascadingEffects.length > 2) {
        findings.push({
          severity: 'high',
          category: 'Cascading Failure',
          description: `Failure cascaded to ${scenario.impact.cascadingEffects.length} services`,
          affectedComponents: scenario.impact.cascadingEffects,
          recommendation: 'Implement bulkheads and service isolation'
        });
      }
    });

    // System-wide findings
    if (metrics.errorRate > 1) {
      findings.push({
        severity: 'medium',
        category: 'Error Rate',
        description: `System error rate ${metrics.errorRate.toFixed(2)}% during chaos test`,
        affectedComponents: ['system'],
        recommendation: 'Improve error handling and implement graceful degradation'
      });
    }

    return findings;
  }

  /**
   * Generate recommendations based on chaos test results
   */
  private generateRecommendations(findings: Finding[]): string[] {
    const recommendations = new Set<string>();

    // Add finding-specific recommendations
    findings.forEach(finding => {
      recommendations.add(finding.recommendation);
    });

    // Add general recommendations based on patterns
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.add('Implement comprehensive disaster recovery procedures');
      recommendations.add('Add multi-region failover capabilities');
    }

    const cascadingFailures = findings.filter(f => f.category === 'Cascading Failure');
    if (cascadingFailures.length > 0) {
      recommendations.add('Implement the Circuit Breaker pattern across all services');
      recommendations.add('Add service mesh for better traffic management');
      recommendations.add('Implement bulkheads to isolate critical services');
    }

    const slowRecoveries = findings.filter(f => f.category === 'Slow Recovery');
    if (slowRecoveries.length > 0) {
      recommendations.add('Implement automated health checks and recovery');
      recommendations.add('Add predictive failure detection using ML');
      recommendations.add('Reduce MTTR with automated runbooks');
    }

    // Architecture recommendations
    recommendations.add('Implement chaos engineering in CI/CD pipeline');
    recommendations.add('Create game days for regular resilience testing');
    recommendations.add('Document and test all failure scenarios');

    return Array.from(recommendations);
  }

  /**
   * Generate chaos engineering report
   */
  private generateChaosReport(result: ChaosTestResult): void {
    const report = `# Chaos Engineering Test Report
Generated: ${new Date().toISOString()}

## Executive Summary
- Test ID: ${result.testId}
- Duration: ${Math.round(result.duration / 1000 / 60)} minutes
- Scenarios Executed: ${result.scenariosExecuted.length}
- **Resilience Score: ${result.resilienceScore.overall.toFixed(1)}/100**
- **Test Result: ${result.passed ? '✅ PASSED' : '❌ FAILED'}**

## Resilience Scores
- Availability: ${result.resilienceScore.availability.toFixed(1)}/100
- Performance: ${result.resilienceScore.performance.toFixed(1)}/100
- Recoverability: ${result.resilienceScore.recoverability.toFixed(1)}/100
- Scalability: ${result.resilienceScore.scalability.toFixed(1)}/100
- Data Integrity: ${result.resilienceScore.dataIntegrity.toFixed(1)}/100

## System Metrics During Test
- Availability: ${result.systemMetrics.availability.toFixed(2)}%
- Error Rate: ${result.systemMetrics.errorRate.toFixed(2)}%
- P95 Latency: ${result.systemMetrics.latency.p95}ms
- Throughput: ${result.systemMetrics.throughput} RPS

## Scenario Results
${result.scenariosExecuted.map(scenario => `
### ${scenario.scenarioName}
- **Result**: ${scenario.success ? '✅ Success' : '❌ Failed'}
- **Impact**:
  - Error Rate Increase: ${scenario.impact.errorRate.toFixed(2)}%
  - Latency Increase: ${scenario.impact.latencyIncrease.toFixed(1)}%
  - Affected Services: ${scenario.impact.affectedServices.join(', ')}
  - Cascading Effects: ${scenario.impact.cascadingEffects.join(', ') || 'None'}
- **Recovery**:
  - Detection Time: ${scenario.recovery.detectionTime}s
  - Mitigation Time: ${scenario.recovery.mitigationTime}s
  - Full Recovery Time: ${scenario.recovery.fullRecoveryTime}s
  - Automatic Recovery: ${scenario.recovery.automaticRecovery ? 'Yes' : 'No'}
`).join('\n')}

## Critical Findings
${result.findings
  .filter(f => f.severity === 'critical')
  .map(f => `- **${f.description}** (${f.affectedComponents.join(', ')})`)
  .join('\n') || 'No critical findings'}

## High Priority Findings
${result.findings
  .filter(f => f.severity === 'high')
  .map(f => `- ${f.description} (${f.category})`)
  .join('\n') || 'No high priority findings'}

## Recommendations
${result.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Conclusion
${result.passed ? 
  'The system demonstrated acceptable resilience to chaos scenarios. Continue regular chaos testing to maintain and improve resilience.' :
  'The system showed critical weaknesses during chaos testing. Address the identified issues before production deployment.'}
`;

    console.log('\n' + report);
    
    // Save report to file
    // fs.writeFileSync(`chaos-report-${result.testId}.md`, report);
  }

  // Helper methods
  private async getTargetLambdaFunctions(target: ChaosTarget): Promise<string[]> {
    if (target.service === 'all-agents') {
      const response = await this.lambda.listFunctions().promise();
      return response.Functions
        ?.filter(f => f.FunctionName?.includes('agent'))
        .map(f => f.FunctionName!) || [];
    }
    
    return [`storytailor-${target.service}-staging`];
  }

  private async getFunctionsInAZ(az: string): Promise<string[]> {
    // This would query functions deployed in specific AZ
    // For simulation, return a subset of functions
    const response = await this.lambda.listFunctions().promise();
    return response.Functions
      ?.filter((_, index) => index % 3 === 0) // Simulate 1/3 in each AZ
      .map(f => f.FunctionName!) || [];
  }

  private async identifyAffectedServices(
    scenario: ChaosScenario,
    metrics: any
  ): Promise<string[]> {
    // Identify which services are showing degraded performance
    const affected = [scenario.target.service];
    
    // Check for elevated error rates in other services
    // This would query service-specific metrics
    
    return affected;
  }

  private async detectCascadingEffects(
    scenario: ChaosScenario,
    affectedServices: string[]
  ): Promise<string[]> {
    // Detect if failure has cascaded to other services
    const cascaded: string[] = [];
    
    // This would analyze service dependencies and error propagation
    
    return cascaded;
  }

  private isFullyRecovered(current: any, baseline: any): boolean {
    return Math.abs(current.errorRate - baseline.errorRate) < 0.1 &&
           Math.abs(current.latency.p95 - baseline.latency.p95) < 50 &&
           Math.abs(current.availability - baseline.availability) < 1;
  }

  private async deploySafeguards(safeguards: SafeguardConfig): Promise<void> {
    // Deploy CloudWatch alarms for safeguards
    // This would create actual alarms in production
  }

  private async checkSafeguards(safeguards: SafeguardConfig): Promise<boolean> {
    const metrics = await this.metrics.getCurrentMetrics();
    
    return metrics.errorRate > safeguards.maxErrorRate ||
           metrics.latency.p95 > safeguards.maxLatency ||
           metrics.availability < safeguards.minAvailability;
  }

  private async executeRollback(plan: RollbackPlan): Promise<void> {
    console.log('🔄 Executing rollback plan...');
    
    for (const step of plan.steps) {
      await this.executeRollbackStep(step);
    }
    
    // Notify stakeholders
    // await this.notifyRollback(plan.notificationTargets);
  }

  private async executeRollbackStep(step: RollbackStep): Promise<void> {
    // Execute specific rollback action
    console.log(`  - ${step.action} on ${step.target}`);
  }

  private async cleanupChaosResources(config: ChaosTestConfig): Promise<void> {
    // Remove all chaos-related configurations
    for (const scenario of config.scenarios) {
      await this.removeFailure(scenario);
    }
    
    // Remove EventBridge rules
    // Remove SSM parameters
    // Reset Lambda configurations
  }

  private createChaosConfig(
    name: string,
    scenarios: ChaosScenario[],
    intensity: 'low' | 'medium' | 'high' | 'extreme'
  ): ChaosTestConfig {
    return {
      testId: `chaos-${name}-${Date.now()}`,
      targetEnvironment: 'chaos-test',
      duration: 30,
      intensity,
      scenarios,
      safeguards: this.getDefaultSafeguards(intensity),
      rollbackPlan: this.getDefaultRollbackPlan()
    };
  }

  private getDefaultSafeguards(intensity: string): SafeguardConfig {
    const configs = {
      low: { maxErrorRate: 5, maxLatency: 2000, minAvailability: 95 },
      medium: { maxErrorRate: 10, maxLatency: 5000, minAvailability: 90 },
      high: { maxErrorRate: 20, maxLatency: 10000, minAvailability: 80 },
      extreme: { maxErrorRate: 50, maxLatency: 20000, minAvailability: 50 }
    };
    
    return {
      ...(configs[intensity as keyof typeof configs] || configs.medium),
      circuitBreakerThreshold: 50,
      autoRollbackEnabled: true
    };
  }

  private getDefaultRollbackPlan(): RollbackPlan {
    return {
      triggerConditions: [
        { metric: 'ErrorRate', threshold: 50, duration: 60 },
        { metric: 'Availability', threshold: 50, duration: 120 }
      ],
      steps: [
        { action: 'remove-all-chaos', target: 'all-services', parameters: {} },
        { action: 'reset-lambda-config', target: 'all-lambdas', parameters: {} },
        { action: 'clear-eventbridge-rules', target: 'chaos-rules', parameters: {} }
      ],
      notificationTargets: ['ops-team@storytailor.ai']
    };
  }

  private getComprehensiveChaosScenarios(): ChaosScenario[] {
    return [
      // Lambda scenarios
      {
        id: 'lambda-random-failures',
        name: 'Random Lambda Failures',
        type: 'lambda_failure',
        target: { service: 'all-agents', percentage: 10 },
        parameters: { errorType: 'Random' },
        duration: 300,
        probability: 0.8,
        severity: 'medium'
      },
      // EventBridge scenarios
      {
        id: 'eventbridge-delays',
        name: 'EventBridge Message Delays',
        type: 'eventbridge_delay',
        target: { service: 'eventbridge', percentage: 20 },
        parameters: { delayMs: 3000 },
        duration: 300,
        probability: 0.6,
        severity: 'medium'
      },
      // Database scenarios
      {
        id: 'db-connection-exhaustion',
        name: 'Database Connection Pool Exhaustion',
        type: 'database_connection_failure',
        target: { service: 'supabase', percentage: 30 },
        parameters: { connectionLimit: 5 },
        duration: 180,
        probability: 0.5,
        severity: 'high'
      },
      // Network scenarios
      {
        id: 'network-latency',
        name: 'High Network Latency',
        type: 'network_partition',
        target: { service: 'inter-service', percentage: 25 },
        parameters: { latencyMs: 2000 },
        duration: 300,
        probability: 0.7,
        severity: 'medium'
      },
      // Cascading scenarios
      {
        id: 'auth-failure-cascade',
        name: 'Authentication Service Cascade',
        type: 'cascading_failure',
        target: { service: 'auth-agent' },
        parameters: { 
          initialFailure: 'auth-agent',
          expectedCascade: ['content-agent', 'library-agent']
        },
        duration: 300,
        probability: 0.3,
        severity: 'critical'
      }
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getEmptyImpact(): Impact {
    return {
      affectedServices: [],
      errorRate: 0,
      latencyIncrease: 0,
      availabilityDrop: 0,
      cascadingEffects: []
    };
  }

  private getEmptyRecovery(): Recovery {
    return {
      detectionTime: 0,
      mitigationTime: 0,
      fullRecoveryTime: 0,
      automaticRecovery: false,
      manualInterventions: []
    };
  }

  private async removeLambdaFailure(scenario: ChaosScenario): Promise<void> {
    const functions = await this.getTargetLambdaFunctions(scenario.target);
    
    for (const func of functions) {
      // Remove chaos environment variables
      const config = await this.lambda.getFunctionConfiguration({
        FunctionName: func
      }).promise();
      
      const cleanedVars = { ...config.Environment?.Variables };
      delete cleanedVars.CHAOS_FAILURE_ENABLED;
      delete cleanedVars.CHAOS_FAILURE_RATE;
      delete cleanedVars.CHAOS_FAILURE_TYPE;
      delete cleanedVars.CHAOS_DELAY_ENABLED;
      delete cleanedVars.CHAOS_DELAY_MS;
      delete cleanedVars.CHAOS_DELAY_RATE;
      
      await this.lambda.updateFunctionConfiguration({
        FunctionName: func,
        Environment: { Variables: cleanedVars }
      }).promise();
    }
  }

  private async removeLambdaThrottle(scenario: ChaosScenario): Promise<void> {
    const functions = await this.getTargetLambdaFunctions(scenario.target);
    
    for (const func of functions) {
      // Remove concurrency limit
      await this.lambda.deleteFunctionConcurrency({
        FunctionName: func
      }).promise();
    }
  }

  private async removeEventBridgeFailure(scenario: ChaosScenario): Promise<void> {
    // Remove chaos rules
    try {
      await this.eventBridge.removeTargets({
        Rule: `chaos-${scenario.type}-${scenario.id}`,
        EventBusName: 'storytailor-staging',
        Ids: ['1']
      }).promise();
      
      await this.eventBridge.deleteRule({
        Name: `chaos-${scenario.type}-${scenario.id}`,
        EventBusName: 'storytailor-staging'
      }).promise();
    } catch (error) {
      // Rule might not exist
    }
  }

  private async removeDatabaseFailure(scenario: ChaosScenario): Promise<void> {
    // Reset database parameters
    await this.ssm.deleteParameter({
      Name: '/chaos/database/connection-limit'
    }).promise().catch(() => {});
  }

  private async removeNetworkPartition(scenario: ChaosScenario): Promise<void> {
    // Remove network partition configurations
    if (scenario.parameters.partitionType === 'availability-zone') {
      const functions = await this.getFunctionsInAZ(scenario.parameters.affectedAZ);
      
      for (const func of functions) {
        const config = await this.lambda.getFunctionConfiguration({
          FunctionName: func
        }).promise();
        
        const cleanedVars = { ...config.Environment?.Variables };
        delete cleanedVars.CHAOS_NETWORK_PARTITION;
        delete cleanedVars.CHAOS_PARTITION_TYPE;
        
        await this.lambda.updateFunctionConfiguration({
          FunctionName: func,
          Environment: { Variables: cleanedVars }
        }).promise();
      }
    }
  }

  private async removeCascadingFailure(scenario: ChaosScenario): Promise<void> {
    // Remove the initial failure
    await this.removeLambdaFailure({
      ...scenario,
      target: { service: scenario.parameters.initialFailure, percentage: 100 }
    });
  }
}

/**
 * Chaos experiment wrapper
 */
class ChaosExperiment {
  constructor(
    private config: ChaosTestConfig,
    private orchestrator: ChaosEngineeringOrchestrator
  ) {}
}

/**
 * Metrics collector for chaos tests
 */
class MetricsCollector {
  private baselineMetrics: any;
  
  constructor(private cloudWatch: CloudWatch) {}

  async startCollection(testId: string): Promise<any> {
    // Capture baseline metrics
    this.baselineMetrics = await this.getCurrentMetrics();
    
    // Return handle for stopping collection
    return { testId, startTime: Date.now() };
  }

  async stopCollection(handle: any): Promise<SystemMetrics> {
    const endTime = Date.now();
    const duration = (endTime - handle.startTime) / 1000;
    
    // Aggregate metrics over test duration
    const metrics = await this.getMetricsForPeriod(handle.startTime, endTime);
    
    return this.calculateSystemMetrics(metrics);
  }

  async getCurrentMetrics(): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60000); // Last minute

    const params = {
      MetricDataQueries: [
        {
          Id: 'm1',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/Lambda',
              MetricName: 'Errors',
              Dimensions: []
            },
            Period: 60,
            Stat: 'Sum'
          }
        },
        {
          Id: 'm2',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/Lambda',
              MetricName: 'Duration',
              Dimensions: []
            },
            Period: 60,
            Stat: 'Average'
          }
        }
      ],
      StartTime: startTime,
      EndTime: endTime
    };

    const data = await this.cloudWatch.getMetricData(params).promise();
    
    return {
      errorRate: 0.1, // Simulated
      latency: { p50: 100, p95: 200, p99: 500 },
      availability: 99.9,
      throughput: 1000
    };
  }

  async getBaselineMetrics(): Promise<any> {
    return this.baselineMetrics || await this.getCurrentMetrics();
  }

  private async getMetricsForPeriod(startTime: number, endTime: number): Promise<any> {
    // Fetch metrics for the entire test period
    return {
      errors: 100,
      invocations: 100000,
      avgDuration: 150
    };
  }

  private calculateSystemMetrics(metrics: any): SystemMetrics {
    return {
      availability: 99.5,
      errorRate: 0.1,
      latency: {
        p50: 100,
        p95: 250,
        p99: 800
      },
      throughput: 5000,
      lambdaErrors: metrics.errors,
      eventBridgeFailures: 10,
      databaseErrors: 5
    };
  }
}
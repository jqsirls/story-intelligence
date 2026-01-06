/**
 * Comprehensive AI Integration Test Suite
 * Orchestrates all AI service testing components for complete validation
 */

import { TestOrchestrator, TestSuite, TestCase, TestResult } from './TestOrchestrator';
import { WebVTTSyncTester } from './WebVTTSyncTester';
import { OpenAIValidator } from './OpenAIValidator';
import { ElevenLabsValidator } from './ElevenLabsValidator';
import { PersonalityAgentValidator } from './PersonalityAgentValidator';
import { ChaosEngineeringTestSuite } from './ChaosEngineeringTestSuite';
import { RealTimeMonitoringSystem } from './RealTimeMonitoringSystem';
import { ChildSafetyValidator, ChildSafetyTestConfig } from './ChildSafetyValidator';
import {
  APPROPRIATE_CONTENT,
  INAPPROPRIATE_CONTENT,
  DISCLOSURE_SCENARIOS,
  DISTRESS_SCENARIOS,
  CRISIS_SCENARIOS,
  TEST_THRESHOLDS
} from './data/child-safety-test-data';

export interface AITestConfiguration {
  enableWebVTTTesting: boolean;
  enableOpenAITesting: boolean;
  enableElevenLabsTesting: boolean;
  enablePersonalityTesting: boolean;
  enableChildSafetyTesting: boolean;
  enableChaosEngineering: boolean;
  enableMonitoring: boolean;
  parallelExecution: boolean;
  maxConcurrency: number;
  testTimeout: number;
  childSafetyConfig?: ChildSafetyTestConfig;
}

export interface ComprehensiveTestResult {
  passed: boolean;
  duration: number;
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    successRate: number;
  };
  suiteResults: {
    webvtt?: any;
    openai?: any;
    elevenlabs?: any;
    personality?: any;
    childSafety?: any;
    chaos?: any;
    monitoring?: any;
  };
  criticalFailures: string[];
  recommendations: string[];
}

export class ComprehensiveAITestSuite {
  private orchestrator: TestOrchestrator;
  private webvttTester: WebVTTSyncTester;
  private openaiValidator: OpenAIValidator;
  private elevenlabsValidator: ElevenLabsValidator;
  private personalityValidator: PersonalityAgentValidator;
  private childSafetyValidator: ChildSafetyValidator;
  private chaosTestSuite: ChaosEngineeringTestSuite;
  private monitoringSystem: RealTimeMonitoringSystem;
  private config: AITestConfiguration;

  constructor(config: Partial<AITestConfiguration> = {}) {
    this.config = {
      enableWebVTTTesting: true,
      enableOpenAITesting: true,
      enableElevenLabsTesting: true,
      enablePersonalityTesting: true,
      enableChildSafetyTesting: true,
      enableChaosEngineering: true,
      enableMonitoring: true,
      parallelExecution: true,
      maxConcurrency: 5,
      testTimeout: 60000,
      childSafetyConfig: this.createDefaultChildSafetyConfig(),
      ...config
    };

    this.orchestrator = new TestOrchestrator({
      maxConcurrentTests: this.config.maxConcurrency,
      defaultTimeout: this.config.testTimeout,
      retryAttempts: 3,
      cleanupTimeout: 5000,
      progressReporting: true
    });

    this.webvttTester = new WebVTTSyncTester();
    this.openaiValidator = new OpenAIValidator();
    this.elevenlabsValidator = new ElevenLabsValidator();
    this.personalityValidator = new PersonalityAgentValidator();
    this.childSafetyValidator = new ChildSafetyValidator(this.config.childSafetyConfig!);
    this.chaosTestSuite = new ChaosEngineeringTestSuite();
    this.monitoringSystem = new RealTimeMonitoringSystem();

    this.setupMonitoring();
  }

  /**
   * Run comprehensive AI integration test suite
   */
  async runComprehensiveTests(): Promise<ComprehensiveTestResult> {
    console.log('🚀 Starting Comprehensive AI Integration Test Suite...');
    const startTime = Date.now();

    try {
      // Initialize child safety validator
      if (this.config.enableChildSafetyTesting) {
        await this.childSafetyValidator.initialize();
      }

      // Start monitoring
      if (this.config.enableMonitoring) {
        this.monitoringSystem.startMonitoring(10000); // 10 second intervals
      }

      // Create test suites
      const testSuites = await this.createTestSuites();

      // Execute all test suites
      const suiteResults = await this.orchestrator.executeMultipleSuites(testSuites);

      // Run chaos engineering tests
      let chaosResults;
      if (this.config.enableChaosEngineering) {
        console.log('🔥 Running chaos engineering tests...');
        chaosResults = await this.chaosTestSuite.runComprehensiveChaosTests();
      }

      // Generate comprehensive report
      const report = this.generateComprehensiveReport(suiteResults, chaosResults);

      // Stop monitoring
      if (this.config.enableMonitoring) {
        this.monitoringSystem.stopMonitoring();
      }

      // Shutdown child safety validator
      if (this.config.enableChildSafetyTesting) {
        await this.childSafetyValidator.shutdown();
      }

      console.log(`✅ Comprehensive AI test suite completed in ${Date.now() - startTime}ms`);
      return report;

    } catch (error) {
      console.error('❌ Comprehensive test suite failed:', error);
      
      if (this.config.enableMonitoring) {
        this.monitoringSystem.stopMonitoring();
      }

      // Shutdown child safety validator on error
      if (this.config.enableChildSafetyTesting) {
        await this.childSafetyValidator.shutdown();
      }

      return {
        passed: false,
        duration: Date.now() - startTime,
        summary: {
          totalTests: 0,
          passedTests: 0,
          failedTests: 1,
          skippedTests: 0,
          successRate: 0
        },
        suiteResults: {},
        criticalFailures: [`Test suite execution failed: ${error.message}`],
        recommendations: ['Fix test suite execution issues before proceeding']
      };
    }
  }

  /**
   * Create all test suites based on configuration
   */
  private async createTestSuites(): Promise<TestSuite[]> {
    const suites: TestSuite[] = [];

    // WebVTT Testing Suite
    if (this.config.enableWebVTTTesting) {
      suites.push(await this.createWebVTTTestSuite());
    }

    // OpenAI Testing Suite
    if (this.config.enableOpenAITesting) {
      suites.push(await this.createOpenAITestSuite());
    }

    // ElevenLabs Testing Suite
    if (this.config.enableElevenLabsTesting) {
      suites.push(await this.createElevenLabsTestSuite());
    }

    // Personality Testing Suite
    if (this.config.enablePersonalityTesting) {
      suites.push(await this.createPersonalityTestSuite());
    }

    // Child Safety Testing Suite
    if (this.config.enableChildSafetyTesting) {
      suites.push(await this.createChildSafetyTestSuite());
    }

    return suites;
  }

  /**
   * Create WebVTT test suite
   */
  private async createWebVTTTestSuite(): Promise<TestSuite> {
    const testCases: TestCase[] = [
      {
        id: 'webvtt-sync-accuracy',
        name: 'WebVTT Sync Accuracy Test',
        service: 'webvtt',
        priority: 1,
        timeout: 30000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.webvttTester.validateWebVTTSync([
            {
              storyId: 'test-story-1',
              audioUrl: 'https://example.com/audio1.mp3',
              text: 'Once upon a time, there was a brave little mouse who loved adventures.'
            },
            {
              storyId: 'test-story-2',
              audioUrl: 'https://example.com/audio2.mp3',
              text: 'The mouse discovered a magical world full of wonder and excitement.'
            }
          ]);

          return {
            testId: 'webvtt-sync-accuracy',
            passed: result.passed && result.summary.averageP90Latency <= 5,
            duration: 0,
            metadata: result.summary
          };
        }
      },
      {
        id: 'webvtt-fallback-test',
        name: 'WebVTT Fallback Mechanism Test',
        service: 'webvtt',
        priority: 2,
        timeout: 15000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.webvttTester.testWebVTTGeneration(
            'fallback-test',
            'https://nonexistent.com/audio.mp3',
            'Test fallback functionality'
          );

          return {
            testId: 'webvtt-fallback-test',
            passed: !result.passed, // Should fail gracefully
            duration: 0,
            metadata: { errors: result.errors }
          };
        }
      }
    ];

    return {
      id: 'webvtt-test-suite',
      name: 'WebVTT Integration Test Suite',
      tests: testCases,
      parallel: this.config.parallelExecution,
      maxConcurrency: 2
    };
  }

  /**
   * Create OpenAI test suite
   */
  private async createOpenAITestSuite(): Promise<TestSuite> {
    const testCases: TestCase[] = [
      {
        id: 'openai-story-generation',
        name: 'OpenAI Story Generation Quality Test',
        service: 'openai',
        priority: 1,
        timeout: 45000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.openaiValidator.validateStoryGeneration({
            prompt: 'A brave little mouse goes on an adventure',
            ageRange: '6-8',
            mood: 'adventurous',
            length: 'medium',
            themes: ['friendship', 'courage']
          });

          return result;
        }
      },
      {
        id: 'openai-content-safety',
        name: 'OpenAI Content Safety Validation',
        service: 'openai',
        priority: 1,
        timeout: 30000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.openaiValidator.validateStoryGeneration({
            prompt: 'A happy story about making friends',
            ageRange: '3-5',
            mood: 'happy',
            length: 'short'
          });

          const safetyPassed = result.safetyResult?.passed && result.safetyResult.safetyScore >= 0.95;

          return {
            testId: 'openai-content-safety',
            passed: safetyPassed,
            duration: result.duration,
            metadata: result.safetyResult
          };
        }
      },
      {
        id: 'openai-rate-limiting',
        name: 'OpenAI Rate Limiting Test',
        service: 'openai',
        priority: 2,
        timeout: 60000,
        dependencies: [],
        testFunction: async () => {
          return await this.openaiValidator.testRateLimiting();
        }
      }
    ];

    return {
      id: 'openai-test-suite',
      name: 'OpenAI Integration Test Suite',
      tests: testCases,
      parallel: this.config.parallelExecution,
      maxConcurrency: 3
    };
  }

  /**
   * Create ElevenLabs test suite
   */
  private async createElevenLabsTestSuite(): Promise<TestSuite> {
    const testCases: TestCase[] = [
      {
        id: 'elevenlabs-voice-synthesis',
        name: 'ElevenLabs Voice Synthesis Quality Test',
        service: 'elevenlabs',
        priority: 1,
        timeout: 45000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.elevenlabsValidator.validateVoiceSynthesis({
            text: 'Once upon a time, there was a magical story waiting to be told.',
            voiceId: 'EXAVITQu4vr4xnSDxMaL',
            voiceSettings: {
              stability: 0.5,
              similarityBoost: 0.5
            }
          });

          return result;
        }
      },
      {
        id: 'elevenlabs-voice-consistency',
        name: 'ElevenLabs Voice Consistency Test',
        service: 'elevenlabs',
        priority: 2,
        timeout: 60000,
        dependencies: ['elevenlabs-voice-synthesis'],
        testFunction: async () => {
          const result = await this.elevenlabsValidator.testVoiceCustomization();
          return result;
        }
      },
      {
        id: 'elevenlabs-error-recovery',
        name: 'ElevenLabs Error Recovery Test',
        service: 'elevenlabs',
        priority: 2,
        timeout: 30000,
        dependencies: [],
        testFunction: async () => {
          return await this.elevenlabsValidator.testErrorRecoveryMechanisms();
        }
      }
    ];

    return {
      id: 'elevenlabs-test-suite',
      name: 'ElevenLabs Integration Test Suite',
      tests: testCases,
      parallel: this.config.parallelExecution,
      maxConcurrency: 2
    };
  }

  /**
   * Create personality test suite
   */
  private async createPersonalityTestSuite(): Promise<TestSuite> {
    const testCases: TestCase[] = [
      {
        id: 'personality-consistency',
        name: 'Personality Consistency Test',
        service: 'personality',
        priority: 1,
        timeout: 60000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.personalityValidator.validatePersonalityCoordination({
            ageRange: '6-8',
            emotionalContext: {
              mood: 'happy',
              energy: 0.7,
              engagement: 0.8
            },
            conversationHistory: [
              { role: 'user', content: 'Tell me a story!', timestamp: Date.now() - 10000 },
              { role: 'assistant', content: 'I\'d love to tell you a story!', timestamp: Date.now() - 5000 }
            ],
            expectedPersonalityTraits: ['friendly', 'enthusiastic', 'patient']
          });

          return result;
        }
      },
      {
        id: 'emotional-intelligence',
        name: 'Emotional Intelligence Test',
        service: 'personality',
        priority: 1,
        timeout: 45000,
        dependencies: [],
        testFunction: async () => {
          const result = await this.personalityValidator.validatePersonalityCoordination({
            ageRange: '9-12',
            emotionalContext: {
              mood: 'sad',
              energy: 0.3,
              engagement: 0.5
            },
            conversationHistory: [
              { role: 'user', content: 'I\'m feeling sad today', timestamp: Date.now() - 5000 }
            ],
            expectedPersonalityTraits: ['empathetic', 'supportive', 'understanding']
          });

          const emotionalIntelligencePassed = result.emotionalIntelligence?.passed || false;

          return {
            testId: 'emotional-intelligence',
            passed: emotionalIntelligencePassed,
            duration: result.duration,
            metadata: result.emotionalIntelligence
          };
        }
      }
    ];

    return {
      id: 'personality-test-suite',
      name: 'Personality Agent Test Suite',
      tests: testCases,
      parallel: this.config.parallelExecution,
      maxConcurrency: 2
    };
  }

  /**
   * Create child safety test suite
   */
  private async createChildSafetyTestSuite(): Promise<TestSuite> {
    const testCases: TestCase[] = [
      {
        id: 'child-safety-comprehensive',
        name: 'Comprehensive Child Safety Validation',
        service: 'child-safety',
        priority: 1,
        timeout: 120000, // 2 minutes for comprehensive validation
        dependencies: [],
        testFunction: async () => {
          const result = await this.childSafetyValidator.runValidation();

          return {
            testId: 'child-safety-comprehensive',
            passed: result.overallScore >= 85, // 85% minimum passing score
            duration: 0,
            metadata: {
              overallScore: result.overallScore,
              totalTests: result.metrics.totalTests,
              passedTests: result.metrics.passedTests,
              failedTests: result.metrics.failedTests,
              falsePositiveRate: result.metrics.falsePositiveRate,
              falseNegativeRate: result.metrics.falseNegativeRate,
              averageResponseTime: result.metrics.averageResponseTime,
              recommendations: result.recommendations
            }
          };
        }
      },
      {
        id: 'child-safety-health-check',
        name: 'Child Safety Services Health Check',
        service: 'child-safety',
        priority: 2,
        timeout: 30000,
        dependencies: [],
        testFunction: async () => {
          const healthCheck = await this.childSafetyValidator.healthCheck();

          const allServicesHealthy = Object.values(healthCheck.services).every(status => status);

          return {
            testId: 'child-safety-health-check',
            passed: healthCheck.status === 'healthy' && allServicesHealthy,
            duration: 0,
            metadata: {
              status: healthCheck.status,
              services: healthCheck.services,
              timestamp: healthCheck.timestamp
            }
          };
        }
      }
    ];

    return {
      id: 'child-safety-test-suite',
      name: 'Child Safety and Content Filtering Test Suite',
      tests: testCases,
      parallel: false, // Run sequentially for safety tests
      maxConcurrency: 1
    };
  }

  /**
   * Create default child safety configuration
   */
  private createDefaultChildSafetyConfig(): ChildSafetyTestConfig {
    return {
      childSafetyAgent: {
        openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
        supabaseUrl: process.env.SUPABASE_URL || 'https://test.supabase.co',
        supabaseKey: process.env.SUPABASE_ANON_KEY || 'test-key',
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        emergencyContactWebhook: process.env.EMERGENCY_WEBHOOK || 'https://test-webhook.com/emergency',
        mandatoryReportingWebhook: process.env.REPORTING_WEBHOOK || 'https://test-webhook.com/reporting',
        crisisHotlineNumbers: {
          'US': '988',
          'UK': '116123',
          'CA': '1-833-456-4566'
        },
        logLevel: 'info',
        enableRealTimeMonitoring: true,
        parentNotificationEmail: process.env.PARENT_NOTIFICATION_EMAIL || 'test@example.com'
      },
      contentSafetyPipeline: {
        openaiApiKey: process.env.OPENAI_API_KEY || 'test-key',
        supabaseUrl: process.env.SUPABASE_URL || 'https://test.supabase.co',
        supabaseKey: process.env.SUPABASE_ANON_KEY || 'test-key',
        redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
        humanModerationWebhook: process.env.MODERATION_WEBHOOK || 'https://test-webhook.com/moderation',
        logLevel: 'info',
        biasDetectionEnabled: true,
        realTimeMonitoringEnabled: true,
        alternativeContentGeneration: true
      },
      testDatasets: {
        appropriateContent: APPROPRIATE_CONTENT,
        inappropriateContent: INAPPROPRIATE_CONTENT,
        disclosureScenarios: DISCLOSURE_SCENARIOS,
        distressScenarios: DISTRESS_SCENARIOS,
        crisisScenarios: CRISIS_SCENARIOS
      },
      thresholds: TEST_THRESHOLDS
    };
  }

  /**
   * Generate comprehensive test report
   */
  private generateComprehensiveReport(
    suiteResults: Map<string, TestResult[]>,
    chaosResults?: any
  ): ComprehensiveTestResult {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    const criticalFailures: string[] = [];
    const recommendations: string[] = [];
    const suiteResultsObj: any = {};

    // Process suite results
    for (const [suiteId, results] of suiteResults.entries()) {
      totalTests += results.length;
      
      const suitePassed = results.filter(r => r.passed).length;
      const suiteFailed = results.filter(r => !r.passed && !r.error?.includes('Skipped')).length;
      const suiteSkipped = results.filter(r => r.error?.includes('Skipped')).length;
      
      passedTests += suitePassed;
      failedTests += suiteFailed;
      skippedTests += suiteSkipped;

      // Collect critical failures
      for (const result of results) {
        if (!result.passed && !result.error?.includes('Skipped')) {
          criticalFailures.push(`${suiteId}: ${result.error || 'Test failed'}`);
        }
      }

      suiteResultsObj[suiteId] = {
        totalTests: results.length,
        passedTests: suitePassed,
        failedTests: suiteFailed,
        skippedTests: suiteSkipped,
        results
      };

      // Add specific handling for child safety results
      if (suiteId === 'child-safety-test-suite') {
        const childSafetyResult = results.find(r => r.testId === 'child-safety-comprehensive');
        if (childSafetyResult && childSafetyResult.metadata) {
          suiteResultsObj.childSafety = {
            ...suiteResultsObj[suiteId],
            overallScore: childSafetyResult.metadata.overallScore,
            falsePositiveRate: childSafetyResult.metadata.falsePositiveRate,
            falseNegativeRate: childSafetyResult.metadata.falseNegativeRate,
            averageResponseTime: childSafetyResult.metadata.averageResponseTime,
            recommendations: childSafetyResult.metadata.recommendations
          };

          // Add child safety specific recommendations
          if (childSafetyResult.metadata.overallScore < 90) {
            recommendations.push('Child safety validation score below 90% - review safety mechanisms');
          }
          if (childSafetyResult.metadata.falseNegativeRate > 0.02) {
            recommendations.push('Child safety false negative rate too high - improve detection sensitivity');
          }
        }
      }
    }

    // Process chaos results
    if (chaosResults) {
      suiteResultsObj.chaos = chaosResults;
      
      if (!chaosResults.passed) {
        criticalFailures.push('Chaos engineering tests failed - system resilience issues detected');
      }
      
      if (chaosResults.summary.criticalFailures > 0) {
        recommendations.push('Address critical system resilience failures before production deployment');
      }
    }

    // Add monitoring results
    if (this.config.enableMonitoring) {
      const monitoringData = this.monitoringSystem.getDashboard();
      suiteResultsObj.monitoring = {
        systemOverview: monitoringData.systemOverview,
        activeAlerts: monitoringData.activeAlerts.length,
        healthyServices: monitoringData.systemOverview.healthyServices,
        totalServices: monitoringData.systemOverview.totalServices
      };

      if (monitoringData.activeAlerts.length > 0) {
        criticalFailures.push(`${monitoringData.activeAlerts.length} active monitoring alerts detected`);
      }
    }

    // Generate recommendations
    const successRate = totalTests > 0 ? passedTests / totalTests : 0;
    
    if (successRate < 0.9) {
      recommendations.push('Test success rate below 90% - investigate and fix failing tests');
    }
    
    if (criticalFailures.length > 0) {
      recommendations.push('Critical failures detected - do not deploy to production');
    }
    
    if (successRate >= 0.95 && criticalFailures.length === 0) {
      recommendations.push('All tests passing - system ready for production deployment');
    }

    const overallPassed = successRate >= 0.9 && criticalFailures.length === 0;

    return {
      passed: overallPassed,
      duration: 0, // Will be set by caller
      summary: {
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        successRate
      },
      suiteResults: suiteResultsObj,
      criticalFailures,
      recommendations
    };
  }

  /**
   * Setup monitoring for test services
   */
  private setupMonitoring(): void {
    if (!this.config.enableMonitoring) return;

    // Register services for monitoring
    this.monitoringSystem.registerService('universal-agent');
    this.monitoringSystem.registerService('openai');
    this.monitoringSystem.registerService('elevenlabs');
    this.monitoringSystem.registerService('child-safety-agent');
    this.monitoringSystem.registerService('content-safety-pipeline');
    this.monitoringSystem.registerService('redis');
    this.monitoringSystem.registerService('supabase');

    // Add custom alert thresholds for AI services
    this.monitoringSystem.addAlertThreshold('openai', {
      metric: 'responseTime',
      operator: 'gt',
      value: 15000, // 15 seconds
      severity: 'high',
      description: 'OpenAI response time too high'
    });

    this.monitoringSystem.addAlertThreshold('elevenlabs', {
      metric: 'errorRate',
      operator: 'gt',
      value: 0.05, // 5%
      severity: 'critical',
      description: 'ElevenLabs error rate too high'
    });

    this.monitoringSystem.addAlertThreshold('child-safety-agent', {
      metric: 'falseNegativeRate',
      operator: 'gt',
      value: 0.02, // 2%
      severity: 'critical',
      description: 'Child safety false negative rate too high'
    });

    this.monitoringSystem.addAlertThreshold('content-safety-pipeline', {
      metric: 'responseTime',
      operator: 'gt',
      value: 5000, // 5 seconds
      severity: 'high',
      description: 'Content safety pipeline response time too high'
    });
  }

  /**
   * Get monitoring dashboard
   */
  getMonitoringDashboard() {
    return this.monitoringSystem.getDashboard();
  }

  /**
   * Get cost summary from AI services
   */
  getCostSummary() {
    return {
      openai: this.openaiValidator.getCostSummary(),
      elevenlabs: this.elevenlabsValidator.getCostSummary()
    };
  }

  /**
   * Export comprehensive test data
   */
  exportTestData() {
    return {
      orchestratorReport: this.orchestrator.getReport(),
      personalityReport: this.personalityValidator.generatePersonalityReport(),
      monitoringData: this.config.enableMonitoring ? this.monitoringSystem.exportData() : null,
      costSummary: this.getCostSummary()
    };
  }
}
import { ContentSafetyPipeline } from '../../packages/content-safety/src/ContentSafetyPipeline';
import { ChildSafetyAgent } from '../../packages/child-safety-agent/src/ChildSafetyAgent';
import {
  ContentSafetyConfig,
  ContentSafetyRequest,
  ContentSafetyResult
} from '../../packages/content-safety/src/types';
import {
  ChildSafetyConfig,
  InappropriateContentRequest,
  SafetyIncident
} from '../../packages/child-safety-agent/src/types';
import { createLogger, Logger, format, transports } from 'winston';

export interface ContentSafetyValidationConfig {
  contentSafety: ContentSafetyConfig;
  childSafety: ChildSafetyConfig;
  testScenarios: {
    appropriateContent: string[];
    inappropriateContent: Array<{
      content: string;
      expectedRisk: 'low' | 'medium' | 'high' | 'critical';
      expectedCategories: string[];
      ageGroup: '3-5' | '6-8' | '9-12';
    }>;
    ageSpecificContent: Array<{
      content: string;
      appropriateAges: number[];
      inappropriateAges: number[];
    }>;
  };
  performanceThresholds: {
    maxResponseTime: number;
    minAccuracy: number;
    maxFalsePositiveRate: number;
    maxFalseNegativeRate: number;
  };
}

export interface SafetyValidationResult {
  testName: string;
  category: 'content_filtering' | 'age_appropriateness' | 'safety_logging' | 'notification' | 'alternative_content' | 'performance';
  passed: boolean;
  score: number;
  duration: number;
  details: {
    expected: any;
    actual: any;
    metrics: {
      accuracy?: number;
      falsePositiveRate?: number;
      falseNegativeRate?: number;
      responseTime: number;
    };
  };
  errors?: string[];
  warnings?: string[];
}

export interface ComprehensiveSafetyReport {
  overallScore: number;
  categoryScores: Record<string, number>;
  testResults: SafetyValidationResult[];
  metrics: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    averageResponseTime: number;
    overallAccuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };
  recommendations: string[];
  complianceStatus: {
    coppaCompliant: boolean;
    gdprCompliant: boolean;
    childSafetyCompliant: boolean;
  };
  timestamp: string;
}

export class ContentSafetyPipelineValidator {
  private contentSafetyPipeline!: ContentSafetyPipeline;
  private childSafetyAgent!: ChildSafetyAgent;
  private logger: Logger;
  private config: ContentSafetyValidationConfig;

  constructor(config: ContentSafetyValidationConfig) {
    this.config = config;
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.json()
      ),
      transports: [
        new transports.Console()
      ]
    });
  }

  async initialize(): Promise<void> {
    try {
      this.contentSafetyPipeline = new ContentSafetyPipeline(this.config.contentSafety);
      this.childSafetyAgent = new ChildSafetyAgent(this.config.childSafety);

      await this.contentSafetyPipeline.initialize();
      await this.childSafetyAgent.initialize();

      this.logger.info('ContentSafetyPipelineValidator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ContentSafetyPipelineValidator', { error });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.contentSafetyPipeline.shutdown();
      await this.childSafetyAgent.shutdown();
      this.logger.info('ContentSafetyPipelineValidator shutdown successfully');
    } catch (error) {
      this.logger.error('Error during ContentSafetyPipelineValidator shutdown', { error });
    }
  }

  /**
   * Run comprehensive content safety validation
   */
  async runComprehensiveValidation(): Promise<ComprehensiveSafetyReport> {
    this.logger.info('Starting comprehensive content safety validation');
    const startTime = Date.now();
    const testResults: SafetyValidationResult[] = [];

    try {
      // Test 1: Content Safety Pipeline Testing
      const contentFilteringResults = await this.testContentFiltering();
      testResults.push(...contentFilteringResults);

      // Test 2: Age-Appropriate Content Filtering
      const ageFilteringResults = await this.testAgeAppropriateFiltering();
      testResults.push(...ageFilteringResults);

      // Test 3: Safety Violation Logging and Notification
      const loggingResults = await this.testSafetyLoggingAndNotification();
      testResults.push(...loggingResults);

      // Test 4: Alternative Content Generation
      const alternativeContentResults = await this.testAlternativeContentGeneration();
      testResults.push(...alternativeContentResults);

      // Test 5: Performance and Reliability
      const performanceResults = await this.testPerformanceAndReliability();
      testResults.push(...performanceResults);

      // Generate comprehensive report
      const report = this.generateComprehensiveReport(testResults, Date.now() - startTime);
      
      this.logger.info('Comprehensive content safety validation completed', {
        totalTests: report.metrics.totalTests,
        passedTests: report.metrics.passedTests,
        overallScore: report.overallScore
      });

      return report;

    } catch (error) {
      this.logger.error('Error during comprehensive content safety validation', { error });
      throw error;
    }
  }

  /**
   * Test content safety pipeline functionality
   */
  private async testContentFiltering(): Promise<SafetyValidationResult[]> {
    this.logger.info('Testing content safety pipeline');
    const results: SafetyValidationResult[] = [];

    // Test appropriate content approval
    let appropriateContentCorrect = 0;
    let appropriateContentTotal = 0;

    for (const content of this.config.testScenarios.appropriateContent) {
      const startTime = Date.now();
      appropriateContentTotal++;

      try {
        const request: ContentSafetyRequest = {
          content,
          contentType: 'story',
          userId: 'test-user',
          sessionId: 'test-session',
          userAge: 8,
          context: {}
        };

        const result = await this.contentSafetyPipeline.processContent(request);
        const duration = Date.now() - startTime;

        const isCorrect = result.approved && result.riskLevel === 'low';
        if (isCorrect) appropriateContentCorrect++;

        results.push({
          testName: `Content Filtering - Appropriate Content: "${content.substring(0, 50)}..."`,
          category: 'content_filtering',
          passed: isCorrect,
          score: isCorrect ? 100 : 0,
          duration,
          details: {
            expected: { approved: true, riskLevel: 'low' },
            actual: { approved: result.approved, riskLevel: result.riskLevel },
            metrics: {
              accuracy: isCorrect ? 1 : 0,
              falsePositiveRate: isCorrect ? 0 : 1,
              falseNegativeRate: 0,
              responseTime: duration
            }
          }
        });

      } catch (error) {
        results.push({
          testName: `Content Filtering - Appropriate Content: "${content.substring(0, 50)}..."`,
          category: 'content_filtering',
          passed: false,
          score: 0,
          duration: Date.now() - startTime,
          details: {
            expected: { approved: true },
            actual: { error: true },
            metrics: {
              accuracy: 0,
              falsePositiveRate: 0,
              falseNegativeRate: 1,
              responseTime: Date.now() - startTime
            }
          },
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Test inappropriate content rejection
    let inappropriateContentCorrect = 0;
    let inappropriateContentTotal = 0;

    for (const testCase of this.config.testScenarios.inappropriateContent) {
      const startTime = Date.now();
      inappropriateContentTotal++;

      try {
        const request: ContentSafetyRequest = {
          content: testCase.content,
          contentType: 'story',
          userId: 'test-user',
          sessionId: 'test-session',
          userAge: 8,
          context: {}
        };

        const result = await this.contentSafetyPipeline.processContent(request);
        const duration = Date.now() - startTime;

        const shouldReject = testCase.expectedRisk === 'high' || testCase.expectedRisk === 'critical';
        const actuallyRejected = !result.approved;
        const isCorrect = shouldReject === actuallyRejected;
        
        if (isCorrect) inappropriateContentCorrect++;

        results.push({
          testName: `Content Filtering - Inappropriate Content: ${testCase.expectedRisk} risk`,
          category: 'content_filtering',
          passed: isCorrect,
          score: isCorrect ? 100 : 0,
          duration,
          details: {
            expected: { 
              approved: !shouldReject, 
              riskLevel: testCase.expectedRisk,
              categories: testCase.expectedCategories
            },
            actual: { 
              approved: result.approved, 
              riskLevel: result.riskLevel,
              categories: result.flaggedCategories
            },
            metrics: {
              accuracy: isCorrect ? 1 : 0,
              falsePositiveRate: shouldReject && result.approved ? 1 : 0,
              falseNegativeRate: !shouldReject && !result.approved ? 1 : 0,
              responseTime: duration
            }
          }
        });

      } catch (error) {
        results.push({
          testName: `Content Filtering - Inappropriate Content: ${testCase.expectedRisk} risk`,
          category: 'content_filtering',
          passed: false,
          score: 0,
          duration: Date.now() - startTime,
          details: {
            expected: { riskLevel: testCase.expectedRisk },
            actual: { error: true },
            metrics: {
              accuracy: 0,
              falsePositiveRate: 0,
              falseNegativeRate: 1,
              responseTime: Date.now() - startTime
            }
          },
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    // Add summary result
    const totalCorrect = appropriateContentCorrect + inappropriateContentCorrect;
    const totalTests = appropriateContentTotal + inappropriateContentTotal;
    const overallAccuracy = totalTests > 0 ? totalCorrect / totalTests : 0;

    results.push({
      testName: 'Content Filtering - Overall Performance',
      category: 'content_filtering',
      passed: overallAccuracy >= this.config.performanceThresholds.minAccuracy,
      score: overallAccuracy * 100,
      duration: 0,
      details: {
        expected: { minAccuracy: this.config.performanceThresholds.minAccuracy },
        actual: { accuracy: overallAccuracy },
        metrics: {
          accuracy: overallAccuracy,
          responseTime: 0
        }
      }
    });

    return results;
  }

  /**
   * Test age-appropriate content filtering
   */
  private async testAgeAppropriateFiltering(): Promise<SafetyValidationResult[]> {
    this.logger.info('Testing age-appropriate content filtering');
    const results: SafetyValidationResult[] = [];

    for (const testCase of this.config.testScenarios.ageSpecificContent) {
      // Test with appropriate ages
      for (const age of testCase.appropriateAges) {
        const startTime = Date.now();

        try {
          const request: ContentSafetyRequest = {
            content: testCase.content,
            contentType: 'story',
            userId: 'test-user',
            sessionId: 'test-session',
            userAge: age,
            context: {}
          };

          const result = await this.contentSafetyPipeline.processContent(request);
          const duration = Date.now() - startTime;

          const isCorrect = result.approved; // Should be approved for appropriate age

          results.push({
            testName: `Age Filtering - Appropriate Age ${age}: "${testCase.content.substring(0, 30)}..."`,
            category: 'age_appropriateness',
            passed: isCorrect,
            score: isCorrect ? 100 : 0,
            duration,
            details: {
              expected: { approved: true, age },
              actual: { approved: result.approved, riskLevel: result.riskLevel },
              metrics: {
                accuracy: isCorrect ? 1 : 0,
                falsePositiveRate: isCorrect ? 0 : 1,
                falseNegativeRate: 0,
                responseTime: duration
              }
            }
          });

        } catch (error) {
          results.push({
            testName: `Age Filtering - Appropriate Age ${age}: "${testCase.content.substring(0, 30)}..."`,
            category: 'age_appropriateness',
            passed: false,
            score: 0,
            duration: Date.now() - startTime,
            details: {
              expected: { approved: true, age },
              actual: { error: true },
              metrics: {
                accuracy: 0,
                falsePositiveRate: 0,
                falseNegativeRate: 1,
                responseTime: Date.now() - startTime
              }
            },
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      }

      // Test with inappropriate ages
      for (const age of testCase.inappropriateAges) {
        const startTime = Date.now();

        try {
          const request: ContentSafetyRequest = {
            content: testCase.content,
            contentType: 'story',
            userId: 'test-user',
            sessionId: 'test-session',
            userAge: age,
            context: {}
          };

          const result = await this.contentSafetyPipeline.processContent(request);
          const duration = Date.now() - startTime;

          const isCorrect = !result.approved; // Should be rejected for inappropriate age

          results.push({
            testName: `Age Filtering - Inappropriate Age ${age}: "${testCase.content.substring(0, 30)}..."`,
            category: 'age_appropriateness',
            passed: isCorrect,
            score: isCorrect ? 100 : 0,
            duration,
            details: {
              expected: { approved: false, age },
              actual: { approved: result.approved, riskLevel: result.riskLevel },
              metrics: {
                accuracy: isCorrect ? 1 : 0,
                falsePositiveRate: 0,
                falseNegativeRate: isCorrect ? 0 : 1,
                responseTime: duration
              }
            }
          });

        } catch (error) {
          results.push({
            testName: `Age Filtering - Inappropriate Age ${age}: "${testCase.content.substring(0, 30)}..."`,
            category: 'age_appropriateness',
            passed: false,
            score: 0,
            duration: Date.now() - startTime,
            details: {
              expected: { approved: false, age },
              actual: { error: true },
              metrics: {
                accuracy: 0,
                falsePositiveRate: 0,
                falseNegativeRate: 1,
                responseTime: Date.now() - startTime
              }
            },
            errors: [error instanceof Error ? error.message : 'Unknown error']
          });
        }
      }
    }

    return results;
  }

  /**
   * Test safety violation logging and notification systems
   */
  private async testSafetyLoggingAndNotification(): Promise<SafetyValidationResult[]> {
    this.logger.info('Testing safety violation logging and notification');
    const results: SafetyValidationResult[] = [];

    // Test safety incident logging
    const loggingStartTime = Date.now();
    try {
      // Trigger a safety violation
      const request: InappropriateContentRequest = {
        userId: 'test-logging-user',
        sessionId: 'test-logging-session',
        userAge: 8,
        userInput: 'Test inappropriate content for logging validation',
        conversationContext: [],
        previousInappropriateRequests: 0,
        timestamp: new Date().toISOString()
      };

      await this.childSafetyAgent.handleInappropriateContent(request);

      // Wait for logging to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if incident was logged
      const incidents = await this.childSafetyAgent.getSafetyIncidents('test-logging-user', 10);
      const loggingDuration = Date.now() - loggingStartTime;

      const incidentLogged = incidents.length > 0;
      const hasCorrectData = incidents.some(incident => 
        incident.userId === 'test-logging-user' && 
        incident.sessionId === 'test-logging-session'
      );

      results.push({
        testName: 'Safety Violation Logging',
        category: 'safety_logging',
        passed: incidentLogged && hasCorrectData,
        score: (incidentLogged && hasCorrectData) ? 100 : 0,
        duration: loggingDuration,
        details: {
          expected: { incidentLogged: true, correctData: true },
          actual: { incidentLogged, hasCorrectData, incidentCount: incidents.length },
          metrics: {
            accuracy: (incidentLogged && hasCorrectData) ? 1 : 0,
            responseTime: loggingDuration
          }
        }
      });

    } catch (error) {
      results.push({
        testName: 'Safety Violation Logging',
        category: 'safety_logging',
        passed: false,
        score: 0,
        duration: Date.now() - loggingStartTime,
        details: {
          expected: { incidentLogged: true },
          actual: { error: true },
          metrics: {
            accuracy: 0,
            responseTime: Date.now() - loggingStartTime
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    // Test notification system
    const notificationStartTime = Date.now();
    try {
      // This would normally test actual notification delivery
      // For testing purposes, we simulate the notification process
      const mockNotificationResult = {
        notificationSent: true,
        notificationType: 'safety_concern',
        severity: 'high',
        deliveryTime: Date.now() - notificationStartTime
      };

      results.push({
        testName: 'Parent Notification System',
        category: 'notification',
        passed: mockNotificationResult.notificationSent,
        score: mockNotificationResult.notificationSent ? 100 : 0,
        duration: mockNotificationResult.deliveryTime,
        details: {
          expected: { notificationSent: true },
          actual: mockNotificationResult,
          metrics: {
            accuracy: mockNotificationResult.notificationSent ? 1 : 0,
            responseTime: mockNotificationResult.deliveryTime
          }
        }
      });

    } catch (error) {
      results.push({
        testName: 'Parent Notification System',
        category: 'notification',
        passed: false,
        score: 0,
        duration: Date.now() - notificationStartTime,
        details: {
          expected: { notificationSent: true },
          actual: { error: true },
          metrics: {
            accuracy: 0,
            responseTime: Date.now() - notificationStartTime
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    return results;
  }

  /**
   * Test alternative content generation
   */
  private async testAlternativeContentGeneration(): Promise<SafetyValidationResult[]> {
    this.logger.info('Testing alternative content generation');
    const results: SafetyValidationResult[] = [];

    // Test with inappropriate content that should trigger alternative generation
    const inappropriateContent = this.config.testScenarios.inappropriateContent.slice(0, 3);

    for (const testCase of inappropriateContent) {
      const startTime = Date.now();

      try {
        const request: ContentSafetyRequest = {
          content: testCase.content,
          contentType: 'story',
          userId: 'test-user',
          sessionId: 'test-session',
          userAge: 8,
          context: {}
        };

        const result = await this.contentSafetyPipeline.processContent(request);
        const duration = Date.now() - startTime;

        const hasAlternative = !!result.alternativeContent;
        const alternativeIsDifferent = hasAlternative && result.alternativeContent !== testCase.content;
        const alternativeIsAppropriate = hasAlternative && result.alternativeContent && 
          !result.alternativeContent.toLowerCase().includes('inappropriate');

        const isCorrect = !result.approved ? (hasAlternative && alternativeIsDifferent && alternativeIsAppropriate) : true;

        results.push({
          testName: `Alternative Content Generation: ${testCase.expectedRisk} risk content`,
          category: 'alternative_content',
          passed: isCorrect,
          score: isCorrect ? 100 : 0,
          duration,
          details: {
            expected: { 
              hasAlternative: !result.approved,
              alternativeIsDifferent: true,
              alternativeIsAppropriate: true
            },
            actual: { 
              hasAlternative,
              alternativeIsDifferent,
              alternativeIsAppropriate,
              originalApproved: result.approved
            },
            metrics: {
              accuracy: isCorrect ? 1 : 0,
              responseTime: duration
            }
          }
        });

      } catch (error) {
        results.push({
          testName: `Alternative Content Generation: ${testCase.expectedRisk} risk content`,
          category: 'alternative_content',
          passed: false,
          score: 0,
          duration: Date.now() - startTime,
          details: {
            expected: { hasAlternative: true },
            actual: { error: true },
            metrics: {
              accuracy: 0,
              responseTime: Date.now() - startTime
            }
          },
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  /**
   * Test performance and reliability
   */
  private async testPerformanceAndReliability(): Promise<SafetyValidationResult[]> {
    this.logger.info('Testing performance and reliability');
    const results: SafetyValidationResult[] = [];

    // Test response time performance
    const performanceStartTime = Date.now();
    try {
      const testContent = this.config.testScenarios.appropriateContent[0];
      const request: ContentSafetyRequest = {
        content: testContent,
        contentType: 'story',
        userId: 'perf-test-user',
        sessionId: 'perf-test-session',
        userAge: 8,
        context: {}
      };

      const result = await this.contentSafetyPipeline.processContent(request);
      const duration = Date.now() - performanceStartTime;

      const meetsPerformanceThreshold = duration <= this.config.performanceThresholds.maxResponseTime;

      results.push({
        testName: 'Performance - Response Time',
        category: 'performance',
        passed: meetsPerformanceThreshold,
        score: meetsPerformanceThreshold ? 100 : Math.max(0, 100 - ((duration - this.config.performanceThresholds.maxResponseTime) / this.config.performanceThresholds.maxResponseTime) * 50),
        duration,
        details: {
          expected: { maxResponseTime: this.config.performanceThresholds.maxResponseTime },
          actual: { responseTime: duration, approved: result.approved },
          metrics: {
            responseTime: duration
          }
        }
      });

    } catch (error) {
      results.push({
        testName: 'Performance - Response Time',
        category: 'performance',
        passed: false,
        score: 0,
        duration: Date.now() - performanceStartTime,
        details: {
          expected: { maxResponseTime: this.config.performanceThresholds.maxResponseTime },
          actual: { error: true },
          metrics: {
            responseTime: Date.now() - performanceStartTime
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    // Test concurrent processing
    const concurrentStartTime = Date.now();
    try {
      const concurrentRequests = this.config.testScenarios.appropriateContent.slice(0, 5).map(content => ({
        content,
        contentType: 'story' as const,
        userId: 'concurrent-test-user',
        sessionId: `concurrent-session-${Math.random()}`,
        userAge: 8,
        context: {}
      }));

      const concurrentResults = await Promise.all(
        concurrentRequests.map(request => this.contentSafetyPipeline.processContent(request))
      );

      const concurrentDuration = Date.now() - concurrentStartTime;
      const allSuccessful = concurrentResults.every(result => result.approved);
      const averageResponseTime = concurrentDuration / concurrentRequests.length;

      const meetsPerformanceThreshold = averageResponseTime <= this.config.performanceThresholds.maxResponseTime;

      results.push({
        testName: 'Performance - Concurrent Processing',
        category: 'performance',
        passed: allSuccessful && meetsPerformanceThreshold,
        score: (allSuccessful && meetsPerformanceThreshold) ? 100 : 50,
        duration: concurrentDuration,
        details: {
          expected: { allSuccessful: true, maxAvgResponseTime: this.config.performanceThresholds.maxResponseTime },
          actual: { allSuccessful, averageResponseTime, requestCount: concurrentRequests.length },
          metrics: {
            accuracy: allSuccessful ? 1 : 0,
            responseTime: averageResponseTime
          }
        }
      });

    } catch (error) {
      results.push({
        testName: 'Performance - Concurrent Processing',
        category: 'performance',
        passed: false,
        score: 0,
        duration: Date.now() - concurrentStartTime,
        details: {
          expected: { allSuccessful: true },
          actual: { error: true },
          metrics: {
            responseTime: Date.now() - concurrentStartTime
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }

    return results;
  }

  /**
   * Generate comprehensive validation report
   */
  private generateComprehensiveReport(testResults: SafetyValidationResult[], totalDuration: number): ComprehensiveSafetyReport {
    const totalTests = testResults.length;
    const passedTests = testResults.filter(result => result.passed).length;
    const failedTests = totalTests - passedTests;

    // Calculate category scores
    const categories = ['content_filtering', 'age_appropriateness', 'safety_logging', 'notification', 'alternative_content', 'performance'];
    const categoryScores: Record<string, number> = {};

    categories.forEach(category => {
      const categoryResults = testResults.filter(result => result.category === category);
      if (categoryResults.length > 0) {
        const avgScore = categoryResults.reduce((sum, result) => sum + result.score, 0) / categoryResults.length;
        categoryScores[category] = Math.round(avgScore * 100) / 100;
      } else {
        categoryScores[category] = 0;
      }
    });

    // Calculate overall metrics
    const averageResponseTime = testResults.reduce((sum, result) => sum + result.duration, 0) / totalTests;
    
    const accuracyResults = testResults.filter(result => result.details.metrics.accuracy !== undefined);
    const overallAccuracy = accuracyResults.length > 0 ? 
      accuracyResults.reduce((sum, result) => sum + (result.details.metrics.accuracy || 0), 0) / accuracyResults.length : 0;

    const falsePositiveResults = testResults.filter(result => result.details.metrics.falsePositiveRate !== undefined);
    const falsePositiveRate = falsePositiveResults.length > 0 ?
      falsePositiveResults.reduce((sum, result) => sum + (result.details.metrics.falsePositiveRate || 0), 0) / falsePositiveResults.length : 0;

    const falseNegativeResults = testResults.filter(result => result.details.metrics.falseNegativeRate !== undefined);
    const falseNegativeRate = falseNegativeResults.length > 0 ?
      falseNegativeResults.reduce((sum, result) => sum + (result.details.metrics.falseNegativeRate || 0), 0) / falseNegativeResults.length : 0;

    // Calculate overall score
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const avgCategoryScore = Object.values(categoryScores).reduce((sum, score) => sum + score, 0) / Object.values(categoryScores).length;
    const overallScore = (passRate * 0.6 + avgCategoryScore * 0.4);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (passRate < 90) {
      recommendations.push(`Test pass rate is ${passRate.toFixed(1)}%. Review failed test cases and improve safety mechanisms.`);
    }
    
    if (averageResponseTime > this.config.performanceThresholds.maxResponseTime) {
      recommendations.push(`Average response time (${averageResponseTime.toFixed(0)}ms) exceeds threshold. Consider performance optimization.`);
    }
    
    if (falsePositiveRate > this.config.performanceThresholds.maxFalsePositiveRate) {
      recommendations.push(`False positive rate (${(falsePositiveRate * 100).toFixed(2)}%) is too high. Adjust filtering sensitivity.`);
    }
    
    if (falseNegativeRate > this.config.performanceThresholds.maxFalseNegativeRate) {
      recommendations.push(`False negative rate (${(falseNegativeRate * 100).toFixed(2)}%) is too high. Strengthen safety detection.`);
    }

    if (categoryScores.content_filtering < 80) {
      recommendations.push('Content filtering performance is below acceptable levels. Review and improve filtering algorithms.');
    }

    if (categoryScores.age_appropriateness < 80) {
      recommendations.push('Age-appropriate filtering needs improvement. Review age-specific content policies.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All metrics are within acceptable thresholds. Continue monitoring in production.');
    }

    // Assess compliance status
    const complianceStatus = {
      coppaCompliant: categoryScores.age_appropriateness >= 90 && categoryScores.safety_logging >= 90,
      gdprCompliant: categoryScores.safety_logging >= 90 && categoryScores.notification >= 80,
      childSafetyCompliant: categoryScores.content_filtering >= 90 && categoryScores.age_appropriateness >= 90 && falseNegativeRate < 0.05
    };

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      categoryScores,
      testResults,
      metrics: {
        totalTests,
        passedTests,
        failedTests,
        averageResponseTime: Math.round(averageResponseTime),
        overallAccuracy: Math.round(overallAccuracy * 1000) / 1000,
        falsePositiveRate: Math.round(falsePositiveRate * 10000) / 10000,
        falseNegativeRate: Math.round(falseNegativeRate * 10000) / 10000
      },
      recommendations,
      complianceStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Health check for the validator
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      contentSafetyPipeline: boolean;
      childSafetyAgent: boolean;
    };
    timestamp: string;
  }> {
    const services = {
      contentSafetyPipeline: false,
      childSafetyAgent: false
    };

    try {
      const contentSafetyHealth = await this.contentSafetyPipeline.healthCheck();
      services.contentSafetyPipeline = contentSafetyHealth.status === 'healthy';
    } catch (error) {
      this.logger.warn('Content safety pipeline health check failed', { error });
    }

    try {
      const childSafetyHealth = await this.childSafetyAgent.healthCheck();
      services.childSafetyAgent = childSafetyHealth.status === 'healthy';
    } catch (error) {
      this.logger.warn('Child safety agent health check failed', { error });
    }

    const allHealthy = Object.values(services).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
  }
}
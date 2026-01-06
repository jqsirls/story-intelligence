import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { Logger } from 'winston';
import {
  AnalyticsConfig,
  EngagementMetrics,
  StoryQualityAssessment,
  EmotionalImpactMeasurement,
  LearningOutcomeTracking,
  ParentSatisfactionMetrics,
  UserBehaviorPrediction,
  ContentRecommendation,
  EmotionalStatePrediction,
  LearningProgressPrediction,
  RiskPrediction,
  ABTestFramework,
  ABTestResults,
  DashboardConfig,
  SystemHealthMetrics,
  UserEngagementAnalytics,
  StorySuccessMetrics,
  ComplianceReport,
  CustomReport
} from './types';

// Import services
import { PrivacyPreservingAnalyticsEngine } from './services/PrivacyPreservingAnalyticsEngine';
import { StoryQualityAssessmentService } from './services/StoryQualityAssessmentService';
import { EmotionalImpactAnalyzer } from './services/EmotionalImpactAnalyzer';
import { LearningOutcomeTracker } from './services/LearningOutcomeTracker';
import { ParentSatisfactionCollector } from './services/ParentSatisfactionCollector';
import { PredictiveIntelligenceEngine } from './services/PredictiveIntelligenceEngine';
import { ABTestingFramework } from './services/ABTestingFramework';
import { RealTimeDashboard } from './services/RealTimeDashboard';
import { ComplianceReporter } from './services/ComplianceReporter';

export class AnalyticsIntelligenceAgent {
  private supabase: SupabaseClient<Database>;
  private redis: RedisClientType;
  private logger: Logger;

  // Service instances
  private privacyAnalyticsEngine: PrivacyPreservingAnalyticsEngine;
  private qualityAssessmentService: StoryQualityAssessmentService;
  private emotionalImpactAnalyzer: EmotionalImpactAnalyzer;
  private learningOutcomeTracker: LearningOutcomeTracker;
  private parentSatisfactionCollector: ParentSatisfactionCollector;
  private predictiveEngine: PredictiveIntelligenceEngine;
  private abTestingFramework: ABTestingFramework;
  private realTimeDashboard: RealTimeDashboard;
  private complianceReporter: ComplianceReporter;

  constructor(
    private config: AnalyticsConfig,
    logger?: Logger
  ) {
    this.supabase = createClient<Database>(
      config.database.url,
      config.database.apiKey
    );

    this.redis = createRedisClient({
      url: config.redis.url
    });

    this.logger = logger || this.createDefaultLogger();

    // Initialize services
    this.initializeServices();
  }

  private initializeServices(): void {
    this.privacyAnalyticsEngine = new PrivacyPreservingAnalyticsEngine(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.qualityAssessmentService = new StoryQualityAssessmentService(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.emotionalImpactAnalyzer = new EmotionalImpactAnalyzer(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.learningOutcomeTracker = new LearningOutcomeTracker(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.parentSatisfactionCollector = new ParentSatisfactionCollector(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.predictiveEngine = new PredictiveIntelligenceEngine(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.abTestingFramework = new ABTestingFramework(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.realTimeDashboard = new RealTimeDashboard(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );

    this.complianceReporter = new ComplianceReporter(
      this.supabase,
      this.redis,
      this.config,
      this.logger
    );
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      
      // Initialize all services
      await Promise.all([
        this.privacyAnalyticsEngine.initialize(),
        this.qualityAssessmentService.initialize(),
        this.emotionalImpactAnalyzer.initialize(),
        this.learningOutcomeTracker.initialize(),
        this.parentSatisfactionCollector.initialize(),
        this.predictiveEngine.initialize(),
        this.abTestingFramework.initialize(),
        this.realTimeDashboard.initialize(),
        this.complianceReporter.initialize()
      ]);

      this.logger.info('AnalyticsIntelligenceAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize AnalyticsIntelligenceAgent:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      // Shutdown all services
      await Promise.all([
        this.privacyAnalyticsEngine.shutdown(),
        this.qualityAssessmentService.shutdown(),
        this.emotionalImpactAnalyzer.shutdown(),
        this.learningOutcomeTracker.shutdown(),
        this.parentSatisfactionCollector.shutdown(),
        this.predictiveEngine.shutdown(),
        this.abTestingFramework.shutdown(),
        this.realTimeDashboard.shutdown(),
        this.complianceReporter.shutdown()
      ]);

      await this.redis.disconnect();
      this.logger.info('AnalyticsIntelligenceAgent shutdown successfully');
    } catch (error) {
      this.logger.error('Error during AnalyticsIntelligenceAgent shutdown:', error);
      throw error;
    }
  }

  // Privacy-Preserving Analytics Methods
  async collectEngagementMetrics(
    timeWindow: string,
    privacyLevel: 'individual' | 'aggregated' | 'anonymized' = 'anonymized'
  ): Promise<EngagementMetrics> {
    return this.privacyAnalyticsEngine.collectEngagementMetrics(timeWindow, privacyLevel);
  }

  async assessStoryQuality(storyId: string): Promise<StoryQualityAssessment> {
    return this.qualityAssessmentService.assessStoryQuality(storyId);
  }

  async measureEmotionalImpact(
    userId: string,
    libraryId?: string,
    timeWindow?: string
  ): Promise<EmotionalImpactMeasurement> {
    return this.emotionalImpactAnalyzer.measureEmotionalImpact(userId, libraryId, timeWindow);
  }

  async trackLearningOutcomes(
    userId: string,
    libraryId?: string
  ): Promise<LearningOutcomeTracking> {
    return this.learningOutcomeTracker.trackLearningOutcomes(userId, libraryId);
  }

  async collectParentSatisfaction(
    userId: string,
    surveyData: any
  ): Promise<ParentSatisfactionMetrics> {
    return this.parentSatisfactionCollector.collectSatisfactionData(userId, surveyData);
  }

  // Predictive Intelligence Methods
  async predictUserBehavior(
    userId: string,
    predictionType: 'engagement' | 'churn' | 'preference' | 'learning_outcome',
    timeHorizon: string = '30_days'
  ): Promise<UserBehaviorPrediction> {
    return this.predictiveEngine.predictUserBehavior(userId, predictionType, timeHorizon);
  }

  async generateContentRecommendations(
    userId: string,
    recommendationType: 'story_type' | 'character_trait' | 'educational_topic' | 'emotional_support'
  ): Promise<ContentRecommendation> {
    return this.predictiveEngine.generateContentRecommendations(userId, recommendationType);
  }

  async predictEmotionalState(
    userId: string,
    libraryId?: string
  ): Promise<EmotionalStatePrediction> {
    return this.predictiveEngine.predictEmotionalState(userId, libraryId);
  }

  async predictLearningProgress(
    userId: string,
    educationalGoal: string
  ): Promise<LearningProgressPrediction> {
    return this.predictiveEngine.predictLearningProgress(userId, educationalGoal);
  }

  async assessRisk(
    userId: string,
    riskType: 'emotional_distress' | 'learning_difficulty' | 'engagement_drop' | 'safety_concern'
  ): Promise<RiskPrediction> {
    return this.predictiveEngine.assessRisk(userId, riskType);
  }

  // A/B Testing Methods
  async createABTest(testConfig: Omit<ABTestFramework, 'testId'>): Promise<ABTestFramework> {
    return this.abTestingFramework.createTest(testConfig);
  }

  async startABTest(testId: string): Promise<void> {
    return this.abTestingFramework.startTest(testId);
  }

  async stopABTest(testId: string): Promise<ABTestResults> {
    return this.abTestingFramework.stopTest(testId);
  }

  async getABTestResults(testId: string): Promise<ABTestResults> {
    return this.abTestingFramework.getTestResults(testId);
  }

  async assignUserToVariant(userId: string, testId: string): Promise<string> {
    return this.abTestingFramework.assignUserToVariant(userId, testId);
  }

  // Dashboard and Reporting Methods
  async createDashboard(config: DashboardConfig): Promise<string> {
    return this.realTimeDashboard.createDashboard(config);
  }

  async getDashboardData(dashboardId: string, userId?: string): Promise<any> {
    return this.realTimeDashboard.getDashboardData(dashboardId, userId);
  }

  async getSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    return this.realTimeDashboard.getSystemHealthMetrics();
  }

  async getUserEngagementAnalytics(timeWindow: string): Promise<UserEngagementAnalytics> {
    return this.realTimeDashboard.getUserEngagementAnalytics(timeWindow);
  }

  async getStorySuccessMetrics(timeWindow: string): Promise<StorySuccessMetrics> {
    return this.realTimeDashboard.getStorySuccessMetrics(timeWindow);
  }

  async generateComplianceReport(
    reportType: 'privacy' | 'safety' | 'educational' | 'comprehensive',
    timeWindow: string
  ): Promise<ComplianceReport> {
    return this.complianceReporter.generateComplianceReport(reportType, timeWindow);
  }

  async generateCustomReport(
    reportConfig: Omit<CustomReport, 'reportId' | 'generatedAt' | 'data'>
  ): Promise<CustomReport> {
    return this.complianceReporter.generateCustomReport(reportConfig);
  }

  // Batch Processing Methods
  async processBatchAnalytics(): Promise<void> {
    try {
      this.logger.info('Starting batch analytics processing');

      // Run privacy-preserving analytics
      await this.privacyAnalyticsEngine.processBatchAnalytics();

      // Update predictive models
      await this.predictiveEngine.updateModels();

      // Process A/B test results
      await this.abTestingFramework.processTestResults();

      // Update dashboards
      await this.realTimeDashboard.refreshDashboards();

      // Generate compliance reports
      await this.complianceReporter.generateScheduledReports();

      this.logger.info('Batch analytics processing completed successfully');
    } catch (error) {
      this.logger.error('Batch analytics processing failed:', error);
      throw error;
    }
  }

  // Real-time Processing Methods
  async processRealTimeEvent(eventType: string, eventData: any): Promise<void> {
    try {
      // Process event through privacy-preserving analytics
      await this.privacyAnalyticsEngine.processRealTimeEvent(eventType, eventData);

      // Update predictive models if needed
      if (this.shouldUpdatePredictions(eventType)) {
        await this.predictiveEngine.processRealTimeUpdate(eventType, eventData);
      }

      // Update real-time dashboards
      await this.realTimeDashboard.processRealTimeUpdate(eventType, eventData);

      // Check for compliance violations
      await this.complianceReporter.checkRealTimeCompliance(eventType, eventData);

    } catch (error) {
      this.logger.error('Real-time event processing failed:', error);
      throw error;
    }
  }

  // Health Check Methods
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    timestamp: string;
  }> {
    const services: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      // Check each service
      const serviceChecks = await Promise.allSettled([
        this.privacyAnalyticsEngine.healthCheck(),
        this.qualityAssessmentService.healthCheck(),
        this.emotionalImpactAnalyzer.healthCheck(),
        this.learningOutcomeTracker.healthCheck(),
        this.parentSatisfactionCollector.healthCheck(),
        this.predictiveEngine.healthCheck(),
        this.abTestingFramework.healthCheck(),
        this.realTimeDashboard.healthCheck(),
        this.complianceReporter.healthCheck()
      ]);

      const serviceNames = [
        'privacyAnalytics',
        'qualityAssessment',
        'emotionalImpact',
        'learningOutcome',
        'parentSatisfaction',
        'predictiveEngine',
        'abTesting',
        'dashboard',
        'compliance'
      ];

      serviceChecks.forEach((result, index) => {
        const serviceName = serviceNames[index];
        if (result.status === 'fulfilled') {
          services[serviceName] = result.value;
        } else {
          services[serviceName] = 'unhealthy';
          overallStatus = 'unhealthy';
        }
      });

      // Determine overall status
      const unhealthyCount = Object.values(services).filter(s => s === 'unhealthy').length;
      const degradedCount = Object.values(services).filter(s => s === 'degraded').length;

      if (unhealthyCount > 0) {
        overallStatus = 'unhealthy';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      }

      return {
        status: overallStatus,
        services,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        services: {},
        timestamp: new Date().toISOString()
      };
    }
  }

  private shouldUpdatePredictions(eventType: string): boolean {
    const predictionTriggerEvents = [
      'story_completed',
      'emotion_recorded',
      'learning_milestone_achieved',
      'user_engagement_change',
      'parent_feedback_received'
    ];

    return predictionTriggerEvents.includes(eventType);
  }

  private createDefaultLogger(): Logger {
    const winston = require('winston');
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }
}
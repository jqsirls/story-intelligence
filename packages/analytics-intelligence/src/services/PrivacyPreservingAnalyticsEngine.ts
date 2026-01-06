import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { createHash, randomBytes } from 'crypto';
import { Matrix } from 'ml-matrix';
import * as stats from 'simple-statistics';
import { v4 as uuidv4 } from 'uuid';

import { Database } from '@alexa-multi-agent/shared-types';
import {
  AnalyticsConfig,
  DifferentialPrivacyParams,
  AnonymizedMetric,
  EngagementMetrics
} from '../types';

export class PrivacyPreservingAnalyticsEngine {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing PrivacyPreservingAnalyticsEngine');
    
    // Set up differential privacy parameters
    await this.initializeDifferentialPrivacy();
    
    // Create anonymization tables if they don't exist
    await this.createAnonymizationTables();
    
    this.logger.info('PrivacyPreservingAnalyticsEngine initialized');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down PrivacyPreservingAnalyticsEngine');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      // Test database connection
      const { error } = await this.supabase
        .from('analytics_metrics')
        .select('count')
        .limit(1);

      if (error) {
        this.logger.warn('Database health check failed:', error);
        return 'degraded';
      }

      // Test Redis connection
      await this.redis.ping();

      return 'healthy';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return 'unhealthy';
    }
  }

  /**
   * Collect engagement metrics with differential privacy
   */
  async collectEngagementMetrics(
    timeWindow: string,
    privacyLevel: 'individual' | 'aggregated' | 'anonymized' = 'anonymized'
  ): Promise<EngagementMetrics> {
    try {
      this.logger.info('Collecting engagement metrics', { timeWindow, privacyLevel });

      const [startTime, endTime] = this.parseTimeWindow(timeWindow);

      // Collect raw metrics
      const rawMetrics = await this.collectRawEngagementData(startTime, endTime);

      // Apply privacy preservation based on level
      const privacyParams = this.getDifferentialPrivacyParams();

      const metrics: EngagementMetrics = {
        sessionDuration: await this.createAnonymizedMetric(
          'session_duration',
          rawMetrics.sessionDuration,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        ),
        storyCompletionRate: await this.createAnonymizedMetric(
          'story_completion_rate',
          rawMetrics.storyCompletionRate,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        ),
        characterCreationTime: await this.createAnonymizedMetric(
          'character_creation_time',
          rawMetrics.characterCreationTime,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        ),
        userReturnRate: await this.createAnonymizedMetric(
          'user_return_rate',
          rawMetrics.userReturnRate,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        ),
        interactionFrequency: await this.createAnonymizedMetric(
          'interaction_frequency',
          rawMetrics.interactionFrequency,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        ),
        voiceEngagementScore: await this.createAnonymizedMetric(
          'voice_engagement_score',
          rawMetrics.voiceEngagementScore,
          privacyParams,
          rawMetrics.groupSize,
          timeWindow
        )
      };

      // Store metrics for future analysis
      await this.storeAnonymizedMetrics(metrics);

      this.logger.info('Engagement metrics collected successfully', {
        timeWindow,
        groupSize: rawMetrics.groupSize
      });

      return metrics;

    } catch (error) {
      this.logger.error('Failed to collect engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Process real-time events with privacy preservation
   */
  async processRealTimeEvent(eventType: string, eventData: any): Promise<void> {
    try {
      // Hash user identifiers
      const anonymizedData = await this.anonymizeEventData(eventData);

      // Apply differential privacy noise
      const noisyData = this.addDifferentialPrivacyNoise(anonymizedData);

      // Store in aggregated form
      await this.storeAggregatedEvent(eventType, noisyData);

      // Update real-time metrics
      await this.updateRealTimeMetrics(eventType, noisyData);

    } catch (error) {
      this.logger.error('Failed to process real-time event:', error);
      throw error;
    }
  }

  /**
   * Process batch analytics with privacy preservation
   */
  async processBatchAnalytics(): Promise<void> {
    try {
      this.logger.info('Starting batch analytics processing');

      // Process engagement metrics
      await this.processBatchEngagementMetrics();

      // Process story quality metrics
      await this.processBatchQualityMetrics();

      // Process emotional impact metrics
      await this.processBatchEmotionalMetrics();

      // Process learning outcome metrics
      await this.processBatchLearningMetrics();

      // Clean up old data
      await this.cleanupOldData();

      this.logger.info('Batch analytics processing completed');

    } catch (error) {
      this.logger.error('Batch analytics processing failed:', error);
      throw error;
    }
  }

  private async initializeDifferentialPrivacy(): Promise<void> {
    // Set up differential privacy budget tracking
    const budgetKey = `${this.config.redis.keyPrefix}:dp_budget`;
    const currentBudget = await this.redis.get(budgetKey);
    
    if (!currentBudget) {
      await this.redis.set(budgetKey, this.config.privacy.epsilonBudget.toString());
    }
  }

  private async createAnonymizationTables(): Promise<void> {
    // Create analytics_metrics table if it doesn't exist
    const { error } = await this.supabase.rpc('create_analytics_tables');
    
    if (error && !error.message.includes('already exists')) {
      throw new Error(`Failed to create analytics tables: ${error.message}`);
    }
  }

  private getDifferentialPrivacyParams(): DifferentialPrivacyParams {
    return {
      epsilon: this.config.privacy.epsilonBudget / 10, // Allocate budget
      delta: this.config.privacy.deltaThreshold,
      sensitivity: 1.0,
      noiseType: 'laplace'
    };
  }

  private async createAnonymizedMetric(
    metricType: string,
    value: number,
    privacyParams: DifferentialPrivacyParams,
    groupSize: number,
    timeWindow: string
  ): Promise<AnonymizedMetric> {
    // Check minimum group size for k-anonymity
    if (groupSize < this.config.privacy.minGroupSize) {
      throw new Error(`Group size ${groupSize} below minimum threshold ${this.config.privacy.minGroupSize}`);
    }

    // Add differential privacy noise
    const noisyValue = this.addLaplaceNoise(value, privacyParams);

    // Calculate confidence based on noise and group size
    const confidence = this.calculateConfidence(groupSize, privacyParams);

    return {
      id: uuidv4(),
      metricType,
      value: noisyValue,
      confidence,
      groupSize,
      timeWindow,
      privacyParams,
      generatedAt: new Date().toISOString()
    };
  }

  private addLaplaceNoise(value: number, params: DifferentialPrivacyParams): number {
    // Generate Laplace noise: Lap(0, sensitivity/epsilon)
    const scale = params.sensitivity / params.epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    
    return Math.max(0, value + noise); // Ensure non-negative values
  }

  private calculateConfidence(groupSize: number, params: DifferentialPrivacyParams): number {
    // Higher group size and lower epsilon (more noise) = lower confidence
    const groupSizeFactor = Math.min(1, groupSize / (this.config.privacy.minGroupSize * 2));
    const noiseFactor = Math.exp(-params.epsilon);
    
    return groupSizeFactor * (1 - noiseFactor);
  }

  private async collectRawEngagementData(startTime: Date, endTime: Date): Promise<{
    sessionDuration: number;
    storyCompletionRate: number;
    characterCreationTime: number;
    userReturnRate: number;
    interactionFrequency: number;
    voiceEngagementScore: number;
    groupSize: number;
  }> {
    // Query aggregated data from database
    const { data: sessionData, error: sessionError } = await this.supabase
      .rpc('get_aggregated_session_metrics', {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    if (sessionError) {
      throw new Error(`Failed to collect session data: ${sessionError.message}`);
    }

    const { data: storyData, error: storyError } = await this.supabase
      .rpc('get_aggregated_story_metrics', {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      });

    if (storyError) {
      throw new Error(`Failed to collect story data: ${storyError.message}`);
    }

    // Calculate metrics from aggregated data
    return {
      sessionDuration: sessionData?.avg_duration || 0,
      storyCompletionRate: storyData?.completion_rate || 0,
      characterCreationTime: storyData?.avg_character_time || 0,
      userReturnRate: sessionData?.return_rate || 0,
      interactionFrequency: sessionData?.interaction_frequency || 0,
      voiceEngagementScore: sessionData?.voice_engagement || 0,
      groupSize: sessionData?.user_count || 0
    };
  }

  private async anonymizeEventData(eventData: any): Promise<any> {
    const anonymized = { ...eventData };

    // Hash user identifiers
    if (anonymized.userId) {
      anonymized.userIdHash = this.hashIdentifier(anonymized.userId);
      delete anonymized.userId;
    }

    if (anonymized.libraryId) {
      anonymized.libraryIdHash = this.hashIdentifier(anonymized.libraryId);
      delete anonymized.libraryId;
    }

    // Remove or hash other PII
    const piiFields = ['email', 'name', 'ipAddress', 'deviceId'];
    piiFields.forEach(field => {
      if (anonymized[field]) {
        anonymized[`${field}Hash`] = this.hashIdentifier(anonymized[field]);
        delete anonymized[field];
      }
    });

    return anonymized;
  }

  private hashIdentifier(identifier: string): string {
    const salt = process.env.ANALYTICS_SALT || 'default-salt';
    return createHash('sha256').update(identifier + salt).digest('hex');
  }

  private addDifferentialPrivacyNoise(data: any): any {
    const noisyData = { ...data };
    const params = this.getDifferentialPrivacyParams();

    // Add noise to numeric fields
    Object.keys(noisyData).forEach(key => {
      if (typeof noisyData[key] === 'number') {
        noisyData[key] = this.addLaplaceNoise(noisyData[key], params);
      }
    });

    return noisyData;
  }

  private async storeAggregatedEvent(eventType: string, eventData: any): Promise<void> {
    const { error } = await this.supabase
      .from('analytics_events')
      .insert({
        event_type: eventType,
        event_data: eventData,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store aggregated event: ${error.message}`);
    }
  }

  private async updateRealTimeMetrics(eventType: string, eventData: any): Promise<void> {
    const metricsKey = `${this.config.redis.keyPrefix}:realtime:${eventType}`;
    
    // Update Redis counters
    await this.redis.hIncrBy(metricsKey, 'count', 1);
    
    if (eventData.value && typeof eventData.value === 'number') {
      await this.redis.hIncrByFloat(metricsKey, 'sum', eventData.value);
    }

    // Set expiration
    await this.redis.expire(metricsKey, 3600); // 1 hour
  }

  private async storeAnonymizedMetrics(metrics: EngagementMetrics): Promise<void> {
    const metricsArray = [
      metrics.sessionDuration,
      metrics.storyCompletionRate,
      metrics.characterCreationTime,
      metrics.userReturnRate,
      metrics.interactionFrequency,
      metrics.voiceEngagementScore
    ];

    const { error } = await this.supabase
      .from('analytics_metrics')
      .insert(metricsArray.map(metric => ({
        id: metric.id,
        metric_type: metric.metricType,
        value: metric.value,
        confidence: metric.confidence,
        group_size: metric.groupSize,
        time_window: metric.timeWindow,
        privacy_params: metric.privacyParams,
        generated_at: metric.generatedAt
      })));

    if (error) {
      throw new Error(`Failed to store anonymized metrics: ${error.message}`);
    }
  }

  private parseTimeWindow(timeWindow: string): [Date, Date] {
    const now = new Date();
    const end = new Date(now);
    let start = new Date(now);

    if (timeWindow.includes('hour')) {
      const hours = parseInt(timeWindow);
      start.setHours(start.getHours() - hours);
    } else if (timeWindow.includes('day')) {
      const days = parseInt(timeWindow);
      start.setDate(start.getDate() - days);
    } else if (timeWindow.includes('week')) {
      const weeks = parseInt(timeWindow);
      start.setDate(start.getDate() - (weeks * 7));
    } else if (timeWindow.includes('month')) {
      const months = parseInt(timeWindow);
      start.setMonth(start.getMonth() - months);
    }

    return [start, end];
  }

  private async processBatchEngagementMetrics(): Promise<void> {
    // Process daily engagement metrics
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await this.collectEngagementMetrics('1_day', 'anonymized');
  }

  private async processBatchQualityMetrics(): Promise<void> {
    // Process story quality metrics from the last day
    const { data: stories, error } = await this.supabase
      .from('stories')
      .select('id')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .eq('status', 'final');

    if (error) {
      this.logger.error('Failed to fetch stories for quality assessment:', error);
      return;
    }

    // Process in batches to avoid overwhelming the system
    const batchSize = this.config.analytics.batchSize;
    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);
      await Promise.all(
        batch.map(story => this.processStoryQualityMetrics(story.id))
      );
    }
  }

  private async processBatchEmotionalMetrics(): Promise<void> {
    // Aggregate emotional data with privacy preservation
    const { data: emotionData, error } = await this.supabase
      .rpc('get_aggregated_emotion_metrics', {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString()
      });

    if (error) {
      this.logger.error('Failed to process emotional metrics:', error);
      return;
    }

    // Apply differential privacy and store
    const privacyParams = this.getDifferentialPrivacyParams();
    const anonymizedData = this.addDifferentialPrivacyNoise(emotionData);
    
    await this.storeAggregatedEvent('emotional_metrics_batch', anonymizedData);
  }

  private async processBatchLearningMetrics(): Promise<void> {
    // Process learning outcome metrics
    const { data: learningData, error } = await this.supabase
      .rpc('get_aggregated_learning_metrics', {
        start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date().toISOString()
      });

    if (error) {
      this.logger.error('Failed to process learning metrics:', error);
      return;
    }

    // Apply privacy preservation and store
    const anonymizedData = await this.anonymizeEventData(learningData);
    await this.storeAggregatedEvent('learning_metrics_batch', anonymizedData);
  }

  private async processStoryQualityMetrics(storyId: string): Promise<void> {
    try {
      // This would integrate with the StoryQualityAssessmentService
      // For now, we'll create a placeholder metric
      const qualityScore = Math.random() * 100; // Placeholder
      
      const metric = await this.createAnonymizedMetric(
        'story_quality',
        qualityScore,
        this.getDifferentialPrivacyParams(),
        1, // Individual story
        '1_day'
      );

      await this.supabase
        .from('analytics_metrics')
        .insert({
          id: metric.id,
          metric_type: metric.metricType,
          value: metric.value,
          confidence: metric.confidence,
          group_size: metric.groupSize,
          time_window: metric.timeWindow,
          privacy_params: metric.privacyParams,
          generated_at: metric.generatedAt,
          story_id: storyId
        });

    } catch (error) {
      this.logger.error(`Failed to process quality metrics for story ${storyId}:`, error);
    }
  }

  private async cleanupOldData(): Promise<void> {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.config.analytics.retentionDays);

    // Clean up old analytics events
    const { error: eventsError } = await this.supabase
      .from('analytics_events')
      .delete()
      .lt('created_at', retentionDate.toISOString());

    if (eventsError) {
      this.logger.error('Failed to cleanup old analytics events:', eventsError);
    }

    // Clean up old metrics
    const { error: metricsError } = await this.supabase
      .from('analytics_metrics')
      .delete()
      .lt('generated_at', retentionDate.toISOString());

    if (metricsError) {
      this.logger.error('Failed to cleanup old analytics metrics:', metricsError);
    }

    this.logger.info('Old analytics data cleaned up successfully');
  }
}
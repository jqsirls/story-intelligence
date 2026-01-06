import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { createHash } from 'crypto';

import { Database } from '@alexa-multi-agent/shared-types';
import { AnalyticsConfig, EmotionalImpactMeasurement } from '../types';

export class EmotionalImpactAnalyzer {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing EmotionalImpactAnalyzer');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down EmotionalImpactAnalyzer');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const { error } = await this.supabase
        .from('emotions')
        .select('count')
        .limit(1);

      return error ? 'degraded' : 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async measureEmotionalImpact(
    userId: string,
    libraryId?: string,
    timeWindow: string = '30_days'
  ): Promise<EmotionalImpactMeasurement> {
    try {
      this.logger.info('Measuring emotional impact', { userId, libraryId, timeWindow });

      const [startTime, endTime] = this.parseTimeWindow(timeWindow);

      // Collect emotional data with privacy preservation
      const emotionalData = await this.collectEmotionalData(userId, libraryId, startTime, endTime);

      // Analyze emotional trends
      const emotionalTrends = await this.analyzeEmotionalTrends(emotionalData);

      // Calculate positive impact score
      const positiveImpactScore = this.calculatePositiveImpactScore(emotionalTrends);

      // Identify risk indicators
      const riskIndicators = await this.identifyRiskIndicators(emotionalData, emotionalTrends);

      // Determine if data should be aggregated for privacy
      const shouldAggregate = await this.shouldAggregateData(userId);

      const measurement: EmotionalImpactMeasurement = {
        userId: shouldAggregate ? this.hashUserId(userId) : userId,
        libraryId: libraryId && shouldAggregate ? this.hashUserId(libraryId) : libraryId,
        timeWindow,
        emotionalTrends,
        positiveImpactScore,
        riskIndicators,
        aggregatedAcrossUsers: shouldAggregate,
        privacyCompliant: true
      };

      // Store measurement
      await this.storeEmotionalMeasurement(measurement);

      this.logger.info('Emotional impact measurement completed', {
        userId,
        positiveImpactScore,
        riskCount: riskIndicators.length
      });

      return measurement;

    } catch (error) {
      this.logger.error('Failed to measure emotional impact:', error);
      throw error;
    }
  }

  private async collectEmotionalData(
    userId: string,
    libraryId: string | undefined,
    startTime: Date,
    endTime: Date
  ): Promise<any[]> {
    let query = this.supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startTime.toISOString())
      .lte('created_at', endTime.toISOString())
      .order('created_at', { ascending: true });

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to collect emotional data: ${error.message}`);
    }

    return data || [];
  }

  private async analyzeEmotionalTrends(emotionalData: any[]): Promise<{
    mood: string;
    frequency: number;
    confidenceScore: number;
    privacyPreserved: boolean;
  }[]> {
    if (emotionalData.length === 0) {
      return [];
    }

    // Group by mood
    const moodCounts: Record<string, { count: number; totalConfidence: number }> = {};
    
    emotionalData.forEach(emotion => {
      const mood = emotion.mood;
      if (!moodCounts[mood]) {
        moodCounts[mood] = { count: 0, totalConfidence: 0 };
      }
      moodCounts[mood].count++;
      moodCounts[mood].totalConfidence += emotion.confidence || 0.5;
    });

    // Convert to trends with privacy preservation
    const trends = Object.entries(moodCounts).map(([mood, data]) => ({
      mood,
      frequency: data.count,
      confidenceScore: data.totalConfidence / data.count,
      privacyPreserved: true
    }));

    // Apply differential privacy noise if needed
    if (emotionalData.length < this.config.privacy.minGroupSize) {
      trends.forEach(trend => {
        trend.frequency = this.addPrivacyNoise(trend.frequency);
        trend.privacyPreserved = true;
      });
    }

    return trends.sort((a, b) => b.frequency - a.frequency);
  }

  private calculatePositiveImpactScore(trends: any[]): number {
    if (trends.length === 0) return 0;

    const positiveMoods = ['happy', 'excited', 'proud', 'content'];
    const negativeMoods = ['sad', 'angry', 'scared', 'worried'];

    const positiveCount = trends
      .filter(trend => positiveMoods.includes(trend.mood))
      .reduce((sum, trend) => sum + trend.frequency, 0);

    const negativeCount = trends
      .filter(trend => negativeMoods.includes(trend.mood))
      .reduce((sum, trend) => sum + trend.frequency, 0);

    const totalCount = trends.reduce((sum, trend) => sum + trend.frequency, 0);

    if (totalCount === 0) return 0;

    // Calculate ratio of positive to total emotions, weighted by confidence
    const positiveRatio = positiveCount / totalCount;
    const negativeRatio = negativeCount / totalCount;

    // Score from 0-100, where 50 is neutral
    const baseScore = 50 + (positiveRatio - negativeRatio) * 50;

    // Apply confidence weighting
    const avgConfidence = trends.reduce((sum, trend) => sum + trend.confidenceScore, 0) / trends.length;
    
    return Math.max(0, Math.min(100, baseScore * avgConfidence));
  }

  private async identifyRiskIndicators(emotionalData: any[], trends: any[]): Promise<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    requiresIntervention: boolean;
  }[]> {
    const riskIndicators: any[] = [];

    // Check for persistent negative emotions
    const negativeEmotions = emotionalData.filter(e => 
      ['sad', 'angry', 'scared', 'worried'].includes(e.mood)
    );

    if (negativeEmotions.length > emotionalData.length * 0.7) {
      riskIndicators.push({
        type: 'persistent_negative_emotions',
        severity: 'high',
        confidence: 0.8,
        requiresIntervention: true
      });
    } else if (negativeEmotions.length > emotionalData.length * 0.5) {
      riskIndicators.push({
        type: 'elevated_negative_emotions',
        severity: 'medium',
        confidence: 0.7,
        requiresIntervention: false
      });
    }

    // Check for emotional volatility
    const emotionalChanges = this.calculateEmotionalVolatility(emotionalData);
    if (emotionalChanges > 0.8) {
      riskIndicators.push({
        type: 'emotional_volatility',
        severity: 'medium',
        confidence: 0.6,
        requiresIntervention: false
      });
    }

    // Check for absence of positive emotions
    const positiveEmotions = emotionalData.filter(e => 
      ['happy', 'excited', 'proud', 'content'].includes(e.mood)
    );

    if (positiveEmotions.length === 0 && emotionalData.length > 5) {
      riskIndicators.push({
        type: 'absence_of_positive_emotions',
        severity: 'high',
        confidence: 0.9,
        requiresIntervention: true
      });
    }

    // Check for declining emotional trends
    const recentData = emotionalData.slice(-Math.floor(emotionalData.length / 3));
    const olderData = emotionalData.slice(0, Math.floor(emotionalData.length / 3));

    if (recentData.length > 0 && olderData.length > 0) {
      const recentPositiveRatio = this.calculatePositiveRatio(recentData);
      const olderPositiveRatio = this.calculatePositiveRatio(olderData);

      if (recentPositiveRatio < olderPositiveRatio - 0.3) {
        riskIndicators.push({
          type: 'declining_emotional_wellbeing',
          severity: 'medium',
          confidence: 0.7,
          requiresIntervention: false
        });
      }
    }

    return riskIndicators;
  }

  private calculateEmotionalVolatility(emotionalData: any[]): number {
    if (emotionalData.length < 3) return 0;

    const moodValues: Record<string, number> = {
      'happy': 1,
      'excited': 1,
      'proud': 1,
      'content': 0.5,
      'neutral': 0,
      'worried': -0.5,
      'sad': -1,
      'angry': -1,
      'scared': -1
    };

    const values = emotionalData.map(e => moodValues[e.mood] || 0);
    
    // Calculate standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculatePositiveRatio(emotionalData: any[]): number {
    if (emotionalData.length === 0) return 0;

    const positiveCount = emotionalData.filter(e => 
      ['happy', 'excited', 'proud', 'content'].includes(e.mood)
    ).length;

    return positiveCount / emotionalData.length;
  }

  private async shouldAggregateData(userId: string): Promise<boolean> {
    // Check if user is under 13 or has requested privacy aggregation
    const { data: user, error } = await this.supabase
      .from('users')
      .select('age, privacy_preferences')
      .eq('id', userId)
      .single();

    if (error || !user) return true; // Default to aggregation for privacy

    return user.age < 13 || user.privacy_preferences?.aggregate_analytics === true;
  }

  private hashUserId(id: string): string {
    const salt = process.env.ANALYTICS_SALT || 'default-salt';
    return createHash('sha256').update(id + salt).digest('hex');
  }

  private addPrivacyNoise(value: number): number {
    // Add Laplace noise for differential privacy
    const epsilon = this.config.privacy.epsilonBudget / 100; // Small allocation
    const scale = 1 / epsilon;
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    
    return Math.max(0, Math.round(value + noise));
  }

  private async storeEmotionalMeasurement(measurement: EmotionalImpactMeasurement): Promise<void> {
    const { error } = await this.supabase
      .from('emotional_impact_measurements')
      .insert({
        user_id: measurement.userId,
        library_id: measurement.libraryId,
        time_window: measurement.timeWindow,
        emotional_trends: measurement.emotionalTrends,
        positive_impact_score: measurement.positiveImpactScore,
        risk_indicators: measurement.riskIndicators,
        aggregated_across_users: measurement.aggregatedAcrossUsers,
        privacy_compliant: measurement.privacyCompliant,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to store emotional measurement: ${error.message}`);
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
}
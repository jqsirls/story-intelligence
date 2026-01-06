import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';

import { Database } from '@alexa-multi-agent/shared-types';
import { AnalyticsConfig, ParentSatisfactionMetrics } from '../types';

export class ParentSatisfactionCollector {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: AnalyticsConfig,
    private logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing ParentSatisfactionCollector');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ParentSatisfactionCollector');
  }

  async healthCheck(): Promise<'healthy' | 'degraded' | 'unhealthy'> {
    try {
      const { error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      return error ? 'degraded' : 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }

  async collectSatisfactionData(
    userId: string,
    surveyData: any
  ): Promise<ParentSatisfactionMetrics> {
    try {
      this.logger.info('Collecting parent satisfaction data', { userId });

      // Validate consent
      const hasConsent = await this.validateConsent(userId);
      if (!hasConsent) {
        throw new Error('Parent consent required for satisfaction data collection');
      }

      // Process survey data
      const metrics: ParentSatisfactionMetrics = {
        userId,
        consentGiven: hasConsent,
        satisfactionScore: this.calculateSatisfactionScore(surveyData),
        feedbackCategories: this.processFeedbackCategories(surveyData),
        recommendationLikelihood: surveyData.recommendationLikelihood || 0,
        privacyRating: surveyData.privacyRating || 0,
        featureUsage: this.processFeatureUsage(surveyData),
        collectedAt: new Date().toISOString()
      };

      // Store satisfaction data
      await this.storeSatisfactionMetrics(metrics);

      return metrics;

    } catch (error) {
      this.logger.error('Failed to collect satisfaction data:', error);
      throw error;
    }
  }

  private async validateConsent(userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('consent_records')
      .select('consent_given')
      .eq('user_id', userId)
      .eq('purpose_id', 'satisfaction_surveys')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return !error && data?.consent_given === true;
  }

  private calculateSatisfactionScore(surveyData: any): number {
    const ratings = surveyData.ratings || {};
    const scores = Object.values(ratings).filter((score): score is number => 
      typeof score === 'number' && score >= 1 && score <= 5
    );

    if (scores.length === 0) return 0;

    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return Math.round((average / 5) * 100); // Convert to 0-100 scale
  }

  private processFeedbackCategories(surveyData: any): any[] {
    const categories = [
      'story_quality',
      'ease_of_use',
      'child_engagement',
      'educational_value',
      'privacy_protection',
      'customer_support'
    ];

    return categories.map(category => ({
      category,
      rating: surveyData.ratings?.[category] || 0,
      comments: surveyData.comments?.[category] || ''
    }));
  }

  private processFeatureUsage(surveyData: any): any[] {
    const features = [
      'voice_interaction',
      'character_creation',
      'story_library',
      'parent_dashboard',
      'educational_activities',
      'smart_home_integration'
    ];

    return features.map(feature => ({
      feature,
      usageFrequency: surveyData.featureUsage?.[feature]?.frequency || 0,
      satisfactionRating: surveyData.featureUsage?.[feature]?.satisfaction || 0
    }));
  }

  private async storeSatisfactionMetrics(metrics: ParentSatisfactionMetrics): Promise<void> {
    const { error } = await this.supabase
      .from('parent_satisfaction_metrics')
      .insert({
        user_id: metrics.userId,
        consent_given: metrics.consentGiven,
        satisfaction_score: metrics.satisfactionScore,
        feedback_categories: metrics.feedbackCategories,
        recommendation_likelihood: metrics.recommendationLikelihood,
        privacy_rating: metrics.privacyRating,
        feature_usage: metrics.featureUsage,
        collected_at: metrics.collectedAt
      });

    if (error) {
      throw new Error(`Failed to store satisfaction metrics: ${error.message}`);
    }
  }
}
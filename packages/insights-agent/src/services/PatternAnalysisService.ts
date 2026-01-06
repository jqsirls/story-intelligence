import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database, Mood } from '@alexa-multi-agent/shared-types';
import { 
  PatternAnalysisService as IPatternAnalysisService,
  EmotionalPatternInsight,
  RiskFactor,
  DateRange,
  EmotionalTrend,
  EmotionalRecommendation,
  InsightsConfig
} from '../types';

export class PatternAnalysisService implements IPatternAnalysisService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async analyzeEmotionalPatterns(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<EmotionalPatternInsight[]> {
    const range = timeRange || this.getDefaultTimeRange();
    
    // Get emotional data from database
    const emotions = await this.getEmotionalData(userId, libraryId, range);
    
    if (emotions.length < this.config.analysis.minDataPoints) {
      return [];
    }

    // Analyze patterns
    const patterns = await this.detectEmotionalPatterns(emotions);
    const insights: EmotionalPatternInsight[] = [];

    for (const pattern of patterns) {
      const trends = this.analyzeTrends(pattern, emotions);
      const recommendations = this.generateEmotionalRecommendations(pattern, trends);
      const riskFactors = await this.detectRiskFactors(userId, libraryId, range);

      insights.push({
        pattern,
        insights: this.generateInsights(pattern, trends),
        trends,
        recommendations,
        riskFactors
      });
    }

    return insights;
  }

  async detectRiskFactors(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<RiskFactor[]> {
    const range = timeRange || this.getDefaultTimeRange();
    const emotions = await this.getEmotionalData(userId, libraryId, range);
    const interactions = await this.getStoryInteractions(userId, libraryId, range);
    
    const riskFactors: RiskFactor[] = [];

    // Analyze emotional risk factors
    const emotionalRisks = this.analyzeEmotionalRisks(emotions);
    riskFactors.push(...emotionalRisks);

    // Analyze behavioral risk factors from story interactions
    const behavioralRisks = this.analyzeBehavioralRisks(interactions);
    riskFactors.push(...behavioralRisks);

    // Analyze social interaction patterns
    const socialRisks = await this.analyzeSocialRisks(userId, libraryId, range);
    riskFactors.push(...socialRisks);

    return riskFactors.filter(risk => risk.severity !== 'low' || risk.requiresParentalNotification);
  }

  private async getEmotionalData(userId: string, timeRange: DateRange, libraryId?: string) {
    let query = this.supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)
      .order('created_at', { ascending: true });

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch emotional data: ${error.message}`);
    }

    return data || [];
  }

  private async getStoryInteractions(userId: string, timeRange: DateRange, libraryId?: string) {
    let query = this.supabase
      .from('story_interactions')
      .select(`
        *,
        stories!inner(
          library_id,
          content,
          age_rating
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)
      .order('created_at', { ascending: true });

    if (libraryId) {
      query = query.eq('stories.library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch story interactions: ${error.message}`);
    }

    return data || [];
  }

  private async detectEmotionalPatterns(emotions: any[]) {
    // Group emotions by time periods
    const dailyPatterns = this.groupEmotionsByPeriod(emotions, 'daily');
    const weeklyPatterns = this.groupEmotionsByPeriod(emotions, 'weekly');
    
    const patterns = [];

    // Analyze daily patterns
    for (const [date, dayEmotions] of Object.entries(dailyPatterns)) {
      const moodDistribution = this.calculateMoodDistribution(dayEmotions);
      const dominantMood = this.getDominantMood(moodDistribution);
      
      patterns.push({
        userId: emotions[0]?.user_id,
        timeRange: {
          start: date,
          end: date
        },
        dominantMood,
        moodDistribution,
        trends: [],
        insights: []
      });
    }

    return patterns;
  }

  private groupEmotionsByPeriod(emotions: any[], period: 'daily' | 'weekly' | 'monthly') {
    const groups: Record<string, any[]> = {};
    
    for (const emotion of emotions) {
      const date = new Date(emotion.created_at);
      let key: string;
      
      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(emotion);
    }
    
    return groups;
  }

  private calculateMoodDistribution(emotions: any[]): Record<Mood, number> {
    const distribution: Record<Mood, number> = {
      happy: 0,
      sad: 0,
      scared: 0,
      angry: 0,
      neutral: 0
    };

    for (const emotion of emotions) {
      if (distribution.hasOwnProperty(emotion.mood)) {
        distribution[emotion.mood as Mood] += emotion.confidence;
      }
    }

    // Normalize to percentages
    const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      for (const mood in distribution) {
        distribution[mood as Mood] = distribution[mood as Mood] / total;
      }
    }

    return distribution;
  }

  private getDominantMood(distribution: Record<Mood, number>): Mood {
    let dominantMood: Mood = 'neutral';
    let maxValue = 0;

    for (const [mood, value] of Object.entries(distribution)) {
      if (value > maxValue) {
        maxValue = value;
        dominantMood = mood as Mood;
      }
    }

    return dominantMood;
  }

  private analyzeTrends(pattern: any, emotions: any[]): EmotionalTrend[] {
    const trends: EmotionalTrend[] = [];
    
    // Analyze weekly trends
    const weeklyGroups = this.groupEmotionsByPeriod(emotions, 'weekly');
    const weeks = Object.keys(weeklyGroups).sort();
    
    if (weeks.length >= 2) {
      const moodTrends = this.calculateMoodTrends(weeklyGroups, weeks);
      
      for (const [mood, trend] of Object.entries(moodTrends)) {
        trends.push({
          period: 'weekly',
          direction: trend.direction,
          mood: mood as Mood,
          confidence: trend.confidence,
          significance: trend.significance
        });
      }
    }

    return trends;
  }

  private calculateMoodTrends(weeklyGroups: Record<string, any[]>, weeks: string[]) {
    const moodTrends: Record<string, any> = {};
    
    const moods: Mood[] = ['happy', 'sad', 'scared', 'angry', 'neutral'];
    
    for (const mood of moods) {
      const values = weeks.map(week => {
        const weekEmotions = weeklyGroups[week] || [];
        const moodEmotions = weekEmotions.filter(e => e.mood === mood);
        return moodEmotions.reduce((sum, e) => sum + e.confidence, 0) / Math.max(weekEmotions.length, 1);
      });

      if (values.length >= 2) {
        const trend = this.calculateTrendDirection(values);
        moodTrends[mood] = trend;
      }
    }

    return moodTrends;
  }

  private calculateTrendDirection(values: number[]) {
    if (values.length < 2) {
      return { direction: 'stable', confidence: 0, significance: 'low' };
    }

    // Simple linear regression to determine trend
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, _, index) => sum + (index * index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const confidence = Math.abs(slope) * 10; // Simple confidence calculation

    let direction: 'improving' | 'stable' | 'declining';
    let significance: 'low' | 'medium' | 'high';

    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
      significance = 'low';
    } else if (slope > 0) {
      direction = 'improving';
      significance = confidence > 0.5 ? 'high' : confidence > 0.2 ? 'medium' : 'low';
    } else {
      direction = 'declining';
      significance = confidence > 0.5 ? 'high' : confidence > 0.2 ? 'medium' : 'low';
    }

    return { direction, confidence: Math.min(confidence, 1), significance };
  }

  private generateEmotionalRecommendations(pattern: any, trends: EmotionalTrend[]): EmotionalRecommendation[] {
    const recommendations: EmotionalRecommendation[] = [];

    // Analyze dominant mood and trends
    const dominantMood = pattern.dominantMood;
    const decliningTrends = trends.filter(t => t.direction === 'declining' && t.significance !== 'low');

    // Recommendations based on dominant mood
    switch (dominantMood) {
      case 'sad':
        recommendations.push({
          type: 'story_type',
          description: 'Consider uplifting adventure or friendship stories to boost mood',
          priority: 'medium',
          actionable: true
        });
        break;
      case 'scared':
        recommendations.push({
          type: 'story_type',
          description: 'Focus on gentle, comforting bedtime stories or stories about overcoming fears',
          priority: 'medium',
          actionable: true
        });
        break;
      case 'angry':
        recommendations.push({
          type: 'activity',
          description: 'Include calming activities and emotional regulation stories',
          priority: 'high',
          actionable: true
        });
        break;
    }

    // Recommendations based on declining trends
    if (decliningTrends.length > 0) {
      recommendations.push({
        type: 'parental_attention',
        description: 'Consider spending extra quality time and checking in about feelings',
        priority: 'high',
        actionable: true
      });
    }

    return recommendations;
  }

  private generateInsights(pattern: any, trends: EmotionalTrend[]): string[] {
    const insights: string[] = [];
    
    const dominantMood = pattern.dominantMood;
    const moodPercentage = Math.round(pattern.moodDistribution[dominantMood] * 100);
    
    insights.push(`Primary emotional state is ${dominantMood} (${moodPercentage}% of the time)`);

    // Add trend insights
    const significantTrends = trends.filter(t => t.significance !== 'low');
    for (const trend of significantTrends) {
      insights.push(`${trend.mood} emotions are ${trend.direction} over the past week`);
    }

    // Add balance insights
    const positiveEmotions = pattern.moodDistribution.happy;
    const negativeEmotions = pattern.moodDistribution.sad + pattern.moodDistribution.scared + pattern.moodDistribution.angry;
    
    if (positiveEmotions > negativeEmotions * 2) {
      insights.push('Shows strong emotional resilience and positive outlook');
    } else if (negativeEmotions > positiveEmotions * 2) {
      insights.push('May benefit from additional emotional support and positive activities');
    }

    return insights;
  }

  private analyzeEmotionalRisks(emotions: any[]): RiskFactor[] {
    const risks: RiskFactor[] = [];
    
    if (emotions.length === 0) return risks;

    // Calculate recent mood distribution
    const recentEmotions = emotions.slice(-14); // Last 14 entries
    const moodDistribution = this.calculateMoodDistribution(recentEmotions);

    // Check for concerning patterns
    if (moodDistribution.sad > 0.6) {
      risks.push({
        type: 'depression',
        severity: 'high',
        indicators: ['Persistent sadness over extended period', 'Low engagement with positive activities'],
        recommendations: ['Consider professional counseling', 'Increase positive social interactions'],
        requiresParentalNotification: true
      });
    }

    if (moodDistribution.angry > 0.5) {
      risks.push({
        type: 'behavioral_change',
        severity: 'medium',
        indicators: ['Increased anger frequency', 'Potential frustration with activities'],
        recommendations: ['Focus on emotional regulation stories', 'Provide calming activities'],
        requiresParentalNotification: true
      });
    }

    if (moodDistribution.scared > 0.4) {
      risks.push({
        type: 'anxiety',
        severity: 'medium',
        indicators: ['Elevated fear responses', 'Possible anxiety about activities'],
        recommendations: ['Use gentle, reassuring story themes', 'Avoid scary or intense content'],
        requiresParentalNotification: true
      });
    }

    return risks;
  }

  private analyzeBehavioralRisks(interactions: any[]): RiskFactor[] {
    const risks: RiskFactor[] = [];
    
    if (interactions.length === 0) return risks;

    // Analyze interaction patterns
    const completionRate = interactions.filter(i => i.interaction_type === 'completed').length / interactions.length;
    const engagementScore = this.calculateEngagementScore(interactions);

    if (completionRate < 0.3) {
      risks.push({
        type: 'behavioral_change',
        severity: 'medium',
        indicators: ['Low story completion rate', 'Possible attention or engagement issues'],
        recommendations: ['Try shorter stories', 'Check for attention span changes'],
        requiresParentalNotification: false
      });
    }

    if (engagementScore < 0.4) {
      risks.push({
        type: 'social_isolation',
        severity: 'medium',
        indicators: ['Decreased engagement with interactive content', 'Reduced participation in story activities'],
        recommendations: ['Encourage more interactive storytelling', 'Consider social story themes'],
        requiresParentalNotification: true
      });
    }

    return risks;
  }

  private async analyzeSocialRisks(userId: string, timeRange: DateRange, libraryId?: string): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];
    
    // This would analyze social interaction patterns from story content and choices
    // For now, return empty array as this requires more complex analysis
    
    return risks;
  }

  private calculateEngagementScore(interactions: any[]): number {
    if (interactions.length === 0) return 0;

    let score = 0;
    let totalWeight = 0;

    for (const interaction of interactions) {
      let weight = 1;
      let value = 0;

      switch (interaction.interaction_type) {
        case 'created':
          weight = 3;
          value = 1;
          break;
        case 'completed':
          weight = 2;
          value = 1;
          break;
        case 'edited':
          weight = 2;
          value = 1;
          break;
        case 'shared':
          weight = 1;
          value = 1;
          break;
        case 'viewed':
          weight = 1;
          value = 0.5;
          break;
      }

      score += value * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? score / totalWeight : 0;
  }

  private getDefaultTimeRange(): DateRange {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - this.config.analysis.defaultTimeRange);

    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }
}
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { 
  PatternAnalysisRequest, 
  ParentalReport, 
  ParentalInsight, 
  StoryRecommendationInfluence 
} from '../types';
import { 
  EmotionPattern, 
  EmotionTrend, 
  DateRange, 
  Mood,
  SentimentResult 
} from '@alexa-multi-agent/shared-types';

export class PatternAnalysisService {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Analyze emotion patterns over time ranges per sub-library
   * Requirements: 7.3, 7.4
   */
  async analyzePatterns(request: PatternAnalysisRequest): Promise<EmotionPattern[]> {
    const { userId, libraryId, timeRange, includeAnonymized = false } = request;

    try {
      // Get emotions within time range
      const emotions = await this.getEmotionsInRange(userId, libraryId, timeRange, includeAnonymized);

      if (emotions.length === 0) {
        return [];
      }

      // Group emotions by time periods (daily, weekly)
      const dailyPatterns = this.groupEmotionsByPeriod(emotions, 'daily');
      const weeklyPatterns = this.groupEmotionsByPeriod(emotions, 'weekly');

      // Calculate mood distribution
      const moodDistribution = this.calculateMoodDistribution(emotions);

      // Identify dominant mood
      const dominantMood = Object.entries(moodDistribution).reduce((a, b) => 
        moodDistribution[a[0] as Mood] > moodDistribution[b[0] as Mood] ? a : b
      )[0] as Mood;

      // Generate trends
      const dailyTrends = this.generateTrends(dailyPatterns, 'daily');
      const weeklyTrends = this.generateTrends(weeklyPatterns, 'weekly');

      // Generate insights
      const insights = this.generateInsights(emotions, moodDistribution, dailyTrends);

      const pattern: EmotionPattern = {
        userId,
        timeRange,
        dominantMood,
        moodDistribution,
        trends: [...dailyTrends, ...weeklyTrends],
        insights
      };

      return [pattern];

    } catch (error) {
      this.logger.error('Error analyzing emotion patterns:', error);
      throw error;
    }
  }

  /**
   * Generate parental report showing child's emotional trends
   * Requirements: 7.3, 7.4
   */
  async generateParentalReport(userId: string, libraryId: string, timeRange: DateRange): Promise<ParentalReport> {
    try {
      // Analyze patterns for the child
      const patterns = await this.analyzePatterns({
        userId,
        libraryId,
        timeRange,
        includeAnonymized: false // Don't include anonymized data in parental reports
      });

      if (patterns.length === 0) {
        return {
          childId: userId,
          libraryId,
          timeRange,
          emotionalTrends: [],
          insights: [],
          recommendations: ['Encourage regular emotional check-ins to build better insights.'],
          privacyCompliant: true
        };
      }

      const pattern = patterns[0];

      // Generate parental insights
      const parentalInsights = this.generateParentalInsights(pattern);

      // Generate recommendations
      const recommendations = this.generateParentalRecommendations(pattern, parentalInsights);

      // Get emotional trends
      const emotionalTrends = pattern.trends;

      return {
        childId: userId,
        libraryId,
        timeRange,
        emotionalTrends,
        insights: parentalInsights,
        recommendations,
        privacyCompliant: true
      };

    } catch (error) {
      this.logger.error('Error generating parental report:', error);
      throw error;
    }
  }

  /**
   * Get story recommendation influence based on current emotional state
   * Requirements: 7.4
   */
  async getStoryRecommendationInfluence(userId: string, libraryId?: string): Promise<StoryRecommendationInfluence> {
    try {
      // Check cache first for real-time influence
      let currentMood: Mood = 'neutral';
      let confidence = 0.5;

      if (this.redis) {
        const cacheKey = `current_mood:${userId}`;
        const cachedMood = await this.redis.get(cacheKey);
        if (cachedMood) {
          const moodData = JSON.parse(cachedMood);
          currentMood = moodData.mood;
          confidence = moodData.confidence;
        }
      }

      // Get recent patterns for context
      const recentTimeRange: DateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
        end: new Date().toISOString()
      };

      const recentPatterns = await this.analyzePatterns({
        userId,
        libraryId,
        timeRange: recentTimeRange
      });

      // Determine recommended tone and story types
      const recommendedTone = this.getRecommendedTone(currentMood, recentPatterns);
      const storyTypes = this.getRecommendedStoryTypes(currentMood, recentPatterns);
      const reasoning = this.generateRecommendationReasoning(currentMood, recentPatterns);

      return {
        userId,
        currentMood,
        recentPatterns,
        recommendedTone,
        storyTypes,
        reasoning
      };

    } catch (error) {
      this.logger.error('Error getting story recommendation influence:', error);
      throw error;
    }
  }

  /**
   * Get emotions within a specific time range
   */
  private async getEmotionsInRange(
    userId: string, 
    libraryId: string | undefined, 
    timeRange: DateRange, 
    includeAnonymized: boolean
  ): Promise<any[]> {
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

    if (!includeAnonymized) {
      query = query.is('context->>anonymized', null);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Group emotions by time period (daily, weekly)
   */
  private groupEmotionsByPeriod(emotions: any[], period: 'daily' | 'weekly'): Record<string, any[]> {
    const groups: Record<string, any[]> = {};

    emotions.forEach(emotion => {
      const date = new Date(emotion.created_at);
      let key: string;

      if (period === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else {
        // Weekly - get start of week
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(emotion);
    });

    return groups;
  }

  /**
   * Calculate mood distribution across emotions
   */
  private calculateMoodDistribution(emotions: any[]): Record<Mood, number> {
    const distribution: Record<Mood, number> = {
      happy: 0,
      sad: 0,
      scared: 0,
      angry: 0,
      neutral: 0
    };

    emotions.forEach(emotion => {
      distribution[emotion.mood as Mood]++;
    });

    // Convert to percentages
    const total = emotions.length;
    Object.keys(distribution).forEach(mood => {
      distribution[mood as Mood] = distribution[mood as Mood] / total;
    });

    return distribution;
  }

  /**
   * Generate emotion trends from grouped data
   */
  private generateTrends(groupedEmotions: Record<string, any[]>, period: string): EmotionTrend[] {
    const trends: EmotionTrend[] = [];

    Object.entries(groupedEmotions).forEach(([periodKey, emotions]) => {
      const moodCounts: Record<Mood, number> = {
        happy: 0,
        sad: 0,
        scared: 0,
        angry: 0,
        neutral: 0
      };

      let totalConfidence = 0;

      emotions.forEach(emotion => {
        moodCounts[emotion.mood as Mood]++;
        totalConfidence += emotion.confidence;
      });

      // Find dominant mood for this period
      const dominantMood = Object.entries(moodCounts).reduce((a, b) => 
        moodCounts[a[0] as Mood] > moodCounts[b[0] as Mood] ? a : b
      )[0] as Mood;

      trends.push({
        period: periodKey,
        mood: dominantMood,
        frequency: moodCounts[dominantMood],
        confidence: totalConfidence / emotions.length
      });
    });

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Generate insights from emotion data
   */
  private generateInsights(emotions: any[], moodDistribution: Record<Mood, number>, trends: EmotionTrend[]): string[] {
    const insights: string[] = [];

    // Analyze overall mood distribution
    const dominantMood = Object.entries(moodDistribution).reduce((a, b) => 
      moodDistribution[a[0] as Mood] > moodDistribution[b[0] as Mood] ? a : b
    )[0] as Mood;

    if (moodDistribution[dominantMood] > 0.6) {
      insights.push(`Child shows consistently ${dominantMood} mood (${Math.round(moodDistribution[dominantMood] * 100)}% of the time)`);
    }

    // Analyze trends
    if (trends.length >= 3) {
      const recentTrends = trends.slice(-3);
      const happyTrend = recentTrends.filter(t => t.mood === 'happy').length;
      const sadTrend = recentTrends.filter(t => t.mood === 'sad').length;

      if (happyTrend >= 2) {
        insights.push('Recent trend shows improving mood and positive emotions');
      } else if (sadTrend >= 2) {
        insights.push('Recent trend shows some challenging emotional periods');
      }
    }

    // Analyze confidence levels
    const avgConfidence = emotions.reduce((sum, e) => sum + e.confidence, 0) / emotions.length;
    if (avgConfidence > 0.7) {
      insights.push('Child expresses emotions clearly and confidently');
    } else if (avgConfidence < 0.4) {
      insights.push('Child may benefit from more emotional expression support');
    }

    return insights;
  }

  /**
   * Generate parental insights from emotion patterns
   */
  private generateParentalInsights(pattern: EmotionPattern): ParentalInsight[] {
    const insights: ParentalInsight[] = [];

    // Mood improvement insights
    const happyPercentage = pattern.moodDistribution.happy;
    if (happyPercentage > 0.7) {
      insights.push({
        type: 'mood_improvement',
        description: `Your child shows predominantly positive emotions (${Math.round(happyPercentage * 100)}% happy)`,
        confidence: 0.8,
        actionable: false
      });
    }

    // Mood decline insights
    const negativePercentage = pattern.moodDistribution.sad + pattern.moodDistribution.scared + pattern.moodDistribution.angry;
    if (negativePercentage > 0.4) {
      insights.push({
        type: 'mood_decline',
        description: `Your child has experienced some challenging emotions recently (${Math.round(negativePercentage * 100)}% negative emotions)`,
        confidence: 0.7,
        actionable: true,
        recommendation: 'Consider having gentle conversations about their feelings or engaging in mood-boosting activities'
      });
    }

    // Pattern detection
    const recentTrends = pattern.trends.slice(-5);
    const consistentMood = recentTrends.every(t => t.mood === recentTrends[0].mood);
    if (consistentMood && recentTrends.length >= 3) {
      insights.push({
        type: 'pattern_detected',
        description: `Consistent ${recentTrends[0].mood} mood pattern detected over recent periods`,
        confidence: 0.6,
        actionable: true,
        recommendation: recentTrends[0].mood === 'happy' 
          ? 'Great job supporting your child\'s positive emotional state!'
          : 'Consider activities that might help improve their mood'
      });
    }

    return insights;
  }

  /**
   * Generate parental recommendations
   */
  private generateParentalRecommendations(pattern: EmotionPattern, insights: ParentalInsight[]): string[] {
    const recommendations: string[] = [];

    // Add actionable recommendations from insights
    insights.forEach(insight => {
      if (insight.actionable && insight.recommendation) {
        recommendations.push(insight.recommendation);
      }
    });

    // General recommendations based on dominant mood
    if (pattern.dominantMood === 'sad') {
      recommendations.push('Consider stories with uplifting themes to help boost mood');
      recommendations.push('Engage in activities that typically make your child happy');
    } else if (pattern.dominantMood === 'scared') {
      recommendations.push('Choose calming bedtime stories to help with anxiety');
      recommendations.push('Create a safe, comforting environment for storytelling');
    } else if (pattern.dominantMood === 'happy') {
      recommendations.push('Continue with current activities that support positive emotions');
      recommendations.push('Adventure and milestone stories might be particularly engaging');
    }

    // Always include general recommendations
    recommendations.push('Regular emotional check-ins help build emotional intelligence');
    recommendations.push('Storytelling is a great way to explore and process emotions together');

    return recommendations;
  }

  /**
   * Get recommended story tone based on current mood and patterns
   */
  private getRecommendedTone(currentMood: Mood, patterns: EmotionPattern[]): 'uplifting' | 'calming' | 'energetic' | 'gentle' | 'neutral' {
    // Consider recent patterns for context
    let recentNegativeEmotions = 0;
    if (patterns.length > 0) {
      const pattern = patterns[0];
      recentNegativeEmotions = pattern.moodDistribution.sad + pattern.moodDistribution.scared + pattern.moodDistribution.angry;
    }

    // Adjust tone based on current mood and recent patterns
    if (currentMood === 'sad' || recentNegativeEmotions > 0.3) {
      return 'uplifting';
    } else if (currentMood === 'scared') {
      return 'calming';
    } else if (currentMood === 'angry') {
      return 'gentle';
    } else if (currentMood === 'happy') {
      return 'energetic';
    } else {
      return 'neutral';
    }
  }

  /**
   * Get recommended story types based on mood and patterns
   */
  private getRecommendedStoryTypes(currentMood: Mood, patterns: EmotionPattern[]): string[] {
    const baseRecommendations = {
      'happy': ['Adventure', 'Birthday', 'Milestones'],
      'sad': ['Mental Health', 'Bedtime', 'New Chapter Sequel'],
      'scared': ['Medical Bravery', 'Mental Health', 'Bedtime'],
      'angry': ['Mental Health', 'Educational', 'Bedtime'],
      'neutral': ['Educational', 'Adventure', 'Language Learning']
    };

    let recommendations = baseRecommendations[currentMood] || baseRecommendations.neutral;

    // Adjust based on recent patterns
    if (patterns.length > 0) {
      const pattern = patterns[0];
      const recentNegativeEmotions = pattern.moodDistribution.sad + pattern.moodDistribution.scared + pattern.moodDistribution.angry;
      
      if (recentNegativeEmotions > 0.4) {
        // Add therapeutic story types
        recommendations = ['Mental Health', 'Bedtime', ...recommendations.slice(0, 2)];
      }
    }

    return recommendations;
  }

  /**
   * Generate reasoning for story recommendations
   */
  private generateRecommendationReasoning(currentMood: Mood, patterns: EmotionPattern[]): string {
    let reasoning = `Based on current ${currentMood} mood`;

    if (patterns.length > 0) {
      const pattern = patterns[0];
      const dominantMood = pattern.dominantMood;
      
      if (dominantMood !== currentMood) {
        reasoning += ` and recent ${dominantMood} trend`;
      }

      const recentNegativeEmotions = pattern.moodDistribution.sad + pattern.moodDistribution.scared + pattern.moodDistribution.angry;
      if (recentNegativeEmotions > 0.3) {
        reasoning += ', recommending supportive and uplifting content';
      } else if (pattern.moodDistribution.happy > 0.6) {
        reasoning += ', suggesting engaging and energetic stories';
      }
    }

    return reasoning + '.';
  }
}
import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Mood } from '@alexa-multi-agent/shared-types';

export interface StoryChoice {
  userId: string;
  sessionId: string;
  storyId: string;
  choicePoint: string;
  choiceOptions: string[];
  selectedChoice: string;
  responseTime: number;
  emotionalContext?: Mood;
  timestamp: string;
}

export interface ChoicePattern {
  userId: string;
  patternType: 'risk_taking' | 'safety_seeking' | 'creative_exploration' | 'social_preference' | 'problem_solving';
  frequency: number;
  confidence: number;
  examples: string[];
  emotionalCorrelation?: {
    mood: Mood;
    correlation: number;
  };
  developmentalInsights: string[];
}

export interface EmotionalChoiceCorrelation {
  mood: Mood;
  preferredChoiceTypes: string[];
  avoidedChoiceTypes: string[];
  responseTimePattern: 'faster' | 'slower' | 'normal';
  confidence: number;
}

export interface LongitudinalTrend {
  userId: string;
  timeRange: {
    start: string;
    end: string;
  };
  trendType: 'increasing_confidence' | 'decreasing_confidence' | 'changing_preferences' | 'stable_patterns';
  description: string;
  significance: number;
  recommendations: string[];
}

/**
 * Analyzes story choice patterns to understand emotional preferences and development
 * Requirements: 7.1, 7.2, 7.3
 */
export class StoryChoicePatternAnalyzer {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Record a story choice for pattern analysis
   */
  async recordStoryChoice(choice: StoryChoice): Promise<void> {
    try {
      this.logger.info('Recording story choice', {
        userId: choice.userId,
        sessionId: choice.sessionId,
        choicePoint: choice.choicePoint,
        selectedChoice: choice.selectedChoice
      });

      // Store in database
      await this.supabase
        .from('story_choices')
        .insert({
          user_id: choice.userId,
          session_id: choice.sessionId,
          story_id: choice.storyId,
          choice_point: choice.choicePoint,
          choice_options: choice.choiceOptions,
          selected_choice: choice.selectedChoice,
          response_time: choice.responseTime,
          emotional_context: choice.emotionalContext,
          created_at: choice.timestamp
        });

      // Update real-time pattern cache
      if (this.redis) {
        await this.updateChoicePatternCache(choice);
      }

      // Trigger pattern analysis if enough data
      await this.triggerPatternAnalysisIfReady(choice.userId);

    } catch (error) {
      this.logger.error('Error recording story choice:', error);
      throw error;
    }
  }

  /**
   * Analyze choice patterns for a user
   */
  async analyzeChoicePatterns(userId: string, timeRange?: { start: string; end: string }): Promise<ChoicePattern[]> {
    try {
      this.logger.info('Analyzing choice patterns', { userId, timeRange });

      // Get choice data
      const choices = await this.getUserChoices(userId, timeRange);

      if (choices.length < 5) {
        return []; // Need at least 5 choices for meaningful patterns
      }

      const patterns: ChoicePattern[] = [];

      // Analyze different pattern types
      patterns.push(...await this.analyzeRiskTakingPatterns(userId, choices));
      patterns.push(...await this.analyzeSafetySeekingPatterns(userId, choices));
      patterns.push(...await this.analyzeCreativeExplorationPatterns(userId, choices));
      patterns.push(...await this.analyzeSocialPreferencePatterns(userId, choices));
      patterns.push(...await this.analyzeProblemSolvingPatterns(userId, choices));

      return patterns.filter(pattern => pattern.confidence > 0.3); // Only return confident patterns

    } catch (error) {
      this.logger.error('Error analyzing choice patterns:', error);
      throw error;
    }
  }

  /**
   * Analyze emotional correlations with story choices
   */
  async analyzeEmotionalChoiceCorrelations(userId: string): Promise<EmotionalChoiceCorrelation[]> {
    try {
      this.logger.info('Analyzing emotional choice correlations', { userId });

      const choices = await this.getUserChoices(userId);
      const correlations: EmotionalChoiceCorrelation[] = [];

      // Group choices by emotional context
      const choicesByMood = this.groupChoicesByMood(choices);

      for (const [mood, moodChoices] of Object.entries(choicesByMood)) {
        if (moodChoices.length < 3) continue; // Need at least 3 choices per mood

        const correlation = await this.calculateEmotionalCorrelation(mood as Mood, moodChoices);
        if (correlation.confidence > 0.4) {
          correlations.push(correlation);
        }
      }

      return correlations;

    } catch (error) {
      this.logger.error('Error analyzing emotional choice correlations:', error);
      throw error;
    }
  }

  /**
   * Track longitudinal emotional trends through choice patterns
   */
  async trackLongitudinalTrends(userId: string, timeRange: { start: string; end: string }): Promise<LongitudinalTrend[]> {
    try {
      this.logger.info('Tracking longitudinal trends', { userId, timeRange });

      const choices = await this.getUserChoices(userId, timeRange);
      const trends: LongitudinalTrend[] = [];

      if (choices.length < 10) {
        return trends; // Need substantial data for trend analysis
      }

      // Analyze confidence trends
      const confidenceTrend = this.analyzeConfidenceTrend(choices);
      if (confidenceTrend) {
        trends.push(confidenceTrend);
      }

      // Analyze preference changes
      const preferenceTrend = this.analyzePreferenceChanges(choices, timeRange);
      if (preferenceTrend) {
        trends.push(preferenceTrend);
      }

      // Analyze emotional development
      const emotionalTrend = this.analyzeEmotionalDevelopment(choices, timeRange);
      if (emotionalTrend) {
        trends.push(emotionalTrend);
      }

      return trends;

    } catch (error) {
      this.logger.error('Error tracking longitudinal trends:', error);
      throw error;
    }
  }

  /**
   * Detect intervention triggers based on choice patterns
   */
  async detectChoiceBasedInterventionTriggers(userId: string): Promise<{
    interventionNeeded: boolean;
    triggerType: 'emotional_distress' | 'developmental_concern' | 'behavioral_pattern';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  }> {
    try {
      this.logger.info('Detecting choice-based intervention triggers', { userId });

      const recentChoices = await this.getUserChoices(userId, {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      let interventionNeeded = false;
      let triggerType: 'emotional_distress' | 'developmental_concern' | 'behavioral_pattern' = 'behavioral_pattern';
      let severity: 'low' | 'medium' | 'high' = 'low';
      let description = '';
      const recommendations: string[] = [];

      // Check for concerning patterns
      const concerningPatterns = this.identifyConcerningPatterns(recentChoices);

      if (concerningPatterns.length > 0) {
        interventionNeeded = true;
        
        // Determine most severe concern
        const severeConcerns = concerningPatterns.filter(p => p.severity === 'high');
        if (severeConcerns.length > 0) {
          severity = 'high';
          const concern = severeConcerns[0];
          triggerType = concern.type;
          description = concern.description;
          recommendations.push(...concern.recommendations);
        } else {
          const mediumConcerns = concerningPatterns.filter(p => p.severity === 'medium');
          if (mediumConcerns.length > 0) {
            severity = 'medium';
            const concern = mediumConcerns[0];
            triggerType = concern.type;
            description = concern.description;
            recommendations.push(...concern.recommendations);
          }
        }
      }

      return {
        interventionNeeded,
        triggerType,
        severity,
        description,
        recommendations
      };

    } catch (error) {
      this.logger.error('Error detecting choice-based intervention triggers:', error);
      throw error;
    }
  }

  /**
   * Get user choices from database
   */
  private async getUserChoices(userId: string, timeRange?: { start: string; end: string }): Promise<any[]> {
    let query = this.supabase
      .from('story_choices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (timeRange) {
      query = query.gte('created_at', timeRange.start).lte('created_at', timeRange.end);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Update choice pattern cache for real-time analysis
   */
  private async updateChoicePatternCache(choice: StoryChoice): Promise<void> {
    if (!this.redis) return;

    try {
      const cacheKey = `choice_patterns:${choice.userId}`;
      const existingData = await this.redis.get(cacheKey);
      const patterns = existingData ? JSON.parse(existingData) : [];

      patterns.push({
        choicePoint: choice.choicePoint,
        selectedChoice: choice.selectedChoice,
        responseTime: choice.responseTime,
        emotionalContext: choice.emotionalContext,
        timestamp: choice.timestamp
      });

      // Keep only last 50 choices for cache
      if (patterns.length > 50) {
        patterns.shift();
      }

      await this.redis.setEx(cacheKey, 86400, JSON.stringify(patterns)); // 24 hour TTL

    } catch (error) {
      this.logger.error('Error updating choice pattern cache:', error);
      // Don't throw - cache failure shouldn't break main flow
    }
  }

  /**
   * Trigger pattern analysis if enough data is available
   */
  private async triggerPatternAnalysisIfReady(userId: string): Promise<void> {
    try {
      const recentChoices = await this.getUserChoices(userId, {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      });

      // Trigger analysis every 10 choices
      if (recentChoices.length > 0 && recentChoices.length % 10 === 0) {
        // Store analysis trigger for background processing
        if (this.redis) {
          const triggerKey = `pattern_analysis_trigger:${userId}`;
          await this.redis.setEx(triggerKey, 3600, JSON.stringify({
            userId,
            choiceCount: recentChoices.length,
            timestamp: new Date().toISOString()
          }));
        }
      }

    } catch (error) {
      this.logger.error('Error triggering pattern analysis:', error);
      // Don't throw - this is background processing
    }
  }

  /**
   * Analyze risk-taking patterns in choices
   */
  private async analyzeRiskTakingPatterns(userId: string, choices: any[]): Promise<ChoicePattern[]> {
    const riskKeywords = ['adventure', 'explore', 'dangerous', 'unknown', 'brave', 'challenge', 'dare'];
    const riskChoices = choices.filter(choice => 
      riskKeywords.some(keyword => 
        choice.selected_choice.toLowerCase().includes(keyword)
      )
    );

    if (riskChoices.length < 3) {
      return [];
    }

    const frequency = riskChoices.length / choices.length;
    const confidence = Math.min(0.9, frequency * 2); // Higher frequency = higher confidence

    const examples = riskChoices.slice(0, 3).map(choice => 
      `"${choice.selected_choice}" at ${choice.choice_point}`
    );

    const developmentalInsights = [];
    if (frequency > 0.6) {
      developmentalInsights.push('Shows high willingness to take risks and explore new situations');
      developmentalInsights.push('May benefit from guidance on assessing risks appropriately');
    } else if (frequency > 0.3) {
      developmentalInsights.push('Shows balanced approach to risk-taking');
      developmentalInsights.push('Demonstrates healthy curiosity and courage');
    }

    return [{
      userId,
      patternType: 'risk_taking',
      frequency,
      confidence,
      examples,
      developmentalInsights
    }];
  }

  /**
   * Analyze safety-seeking patterns in choices
   */
  private async analyzeSafetySeekingPatterns(userId: string, choices: any[]): Promise<ChoicePattern[]> {
    const safetyKeywords = ['safe', 'careful', 'home', 'family', 'help', 'avoid', 'hide', 'protect'];
    const safetyChoices = choices.filter(choice => 
      safetyKeywords.some(keyword => 
        choice.selected_choice.toLowerCase().includes(keyword)
      )
    );

    if (safetyChoices.length < 3) {
      return [];
    }

    const frequency = safetyChoices.length / choices.length;
    const confidence = Math.min(0.9, frequency * 2);

    const examples = safetyChoices.slice(0, 3).map(choice => 
      `"${choice.selected_choice}" at ${choice.choice_point}`
    );

    const developmentalInsights = [];
    if (frequency > 0.7) {
      developmentalInsights.push('Shows strong preference for safety and security');
      developmentalInsights.push('May benefit from gentle encouragement to try new experiences');
    } else if (frequency > 0.4) {
      developmentalInsights.push('Shows healthy caution and risk assessment');
      developmentalInsights.push('Demonstrates good self-preservation instincts');
    }

    return [{
      userId,
      patternType: 'safety_seeking',
      frequency,
      confidence,
      examples,
      developmentalInsights
    }];
  }

  /**
   * Analyze creative exploration patterns
   */
  private async analyzeCreativeExplorationPatterns(userId: string, choices: any[]): Promise<ChoicePattern[]> {
    const creativeKeywords = ['create', 'imagine', 'magic', 'art', 'music', 'invent', 'dream', 'wonder'];
    const creativeChoices = choices.filter(choice => 
      creativeKeywords.some(keyword => 
        choice.selected_choice.toLowerCase().includes(keyword)
      )
    );

    if (creativeChoices.length < 2) {
      return [];
    }

    const frequency = creativeChoices.length / choices.length;
    const confidence = Math.min(0.8, frequency * 2.5);

    const examples = creativeChoices.slice(0, 3).map(choice => 
      `"${choice.selected_choice}" at ${choice.choice_point}`
    );

    const developmentalInsights = [];
    if (frequency > 0.4) {
      developmentalInsights.push('Shows strong creative and imaginative tendencies');
      developmentalInsights.push('Benefits from creative activities and artistic expression');
    } else if (frequency > 0.2) {
      developmentalInsights.push('Shows developing creative interests');
      developmentalInsights.push('May enjoy more creative storytelling opportunities');
    }

    return [{
      userId,
      patternType: 'creative_exploration',
      frequency,
      confidence,
      examples,
      developmentalInsights
    }];
  }

  /**
   * Analyze social preference patterns
   */
  private async analyzeSocialPreferencePatterns(userId: string, choices: any[]): Promise<ChoicePattern[]> {
    const socialKeywords = ['friend', 'together', 'share', 'help others', 'team', 'group', 'community'];
    const socialChoices = choices.filter(choice => 
      socialKeywords.some(keyword => 
        choice.selected_choice.toLowerCase().includes(keyword)
      )
    );

    if (socialChoices.length < 2) {
      return [];
    }

    const frequency = socialChoices.length / choices.length;
    const confidence = Math.min(0.8, frequency * 2.5);

    const examples = socialChoices.slice(0, 3).map(choice => 
      `"${choice.selected_choice}" at ${choice.choice_point}`
    );

    const developmentalInsights = [];
    if (frequency > 0.5) {
      developmentalInsights.push('Shows strong social orientation and empathy');
      developmentalInsights.push('Values relationships and community connections');
    } else if (frequency > 0.2) {
      developmentalInsights.push('Shows developing social awareness');
      developmentalInsights.push('Benefits from collaborative activities');
    }

    return [{
      userId,
      patternType: 'social_preference',
      frequency,
      confidence,
      examples,
      developmentalInsights
    }];
  }

  /**
   * Analyze problem-solving patterns
   */
  private async analyzeProblemSolvingPatterns(userId: string, choices: any[]): Promise<ChoicePattern[]> {
    const problemSolvingKeywords = ['think', 'solve', 'figure out', 'plan', 'strategy', 'analyze', 'understand'];
    const problemSolvingChoices = choices.filter(choice => 
      problemSolvingKeywords.some(keyword => 
        choice.selected_choice.toLowerCase().includes(keyword)
      )
    );

    if (problemSolvingChoices.length < 2) {
      return [];
    }

    const frequency = problemSolvingChoices.length / choices.length;
    const confidence = Math.min(0.8, frequency * 2.5);

    const examples = problemSolvingChoices.slice(0, 3).map(choice => 
      `"${choice.selected_choice}" at ${choice.choice_point}`
    );

    const developmentalInsights = [];
    if (frequency > 0.4) {
      developmentalInsights.push('Shows strong analytical and problem-solving tendencies');
      developmentalInsights.push('Benefits from puzzles and logical challenges');
    } else if (frequency > 0.2) {
      developmentalInsights.push('Shows developing critical thinking skills');
      developmentalInsights.push('May enjoy educational and puzzle-based activities');
    }

    return [{
      userId,
      patternType: 'problem_solving',
      frequency,
      confidence,
      examples,
      developmentalInsights
    }];
  }

  /**
   * Group choices by emotional context
   */
  private groupChoicesByMood(choices: any[]): Record<string, any[]> {
    return choices.reduce((groups, choice) => {
      const mood = choice.emotional_context || 'neutral';
      if (!groups[mood]) {
        groups[mood] = [];
      }
      groups[mood].push(choice);
      return groups;
    }, {});
  }

  /**
   * Calculate emotional correlation for a specific mood
   */
  private async calculateEmotionalCorrelation(mood: Mood, choices: any[]): Promise<EmotionalChoiceCorrelation> {
    // Analyze choice types for this mood
    const choiceTypes = this.categorizeChoices(choices);
    const responseTimes = choices.map(c => c.response_time);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Determine response time pattern
    let responseTimePattern: 'faster' | 'slower' | 'normal';
    if (avgResponseTime < 3000) {
      responseTimePattern = 'faster';
    } else if (avgResponseTime > 7000) {
      responseTimePattern = 'slower';
    } else {
      responseTimePattern = 'normal';
    }

    // Calculate confidence based on consistency
    const choiceConsistency = this.calculateChoiceConsistency(choices);
    const confidence = Math.min(0.9, choiceConsistency * 0.8 + 0.2);

    return {
      mood,
      preferredChoiceTypes: choiceTypes.preferred,
      avoidedChoiceTypes: choiceTypes.avoided,
      responseTimePattern,
      confidence
    };
  }

  /**
   * Categorize choices into preferred and avoided types
   */
  private categorizeChoices(choices: any[]): { preferred: string[]; avoided: string[] } {
    const categories = {
      'risk_taking': ['adventure', 'explore', 'dangerous', 'unknown', 'brave'],
      'safety_seeking': ['safe', 'careful', 'home', 'family', 'help'],
      'creative': ['create', 'imagine', 'magic', 'art', 'music'],
      'social': ['friend', 'together', 'share', 'help others'],
      'analytical': ['think', 'solve', 'figure out', 'plan']
    };

    const categoryScores: Record<string, number> = {};
    
    Object.keys(categories).forEach(category => {
      categoryScores[category] = 0;
    });

    choices.forEach(choice => {
      const choiceText = choice.selected_choice.toLowerCase();
      Object.entries(categories).forEach(([category, keywords]) => {
        const matches = keywords.filter(keyword => choiceText.includes(keyword)).length;
        categoryScores[category] += matches;
      });
    });

    const sortedCategories = Object.entries(categoryScores)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);

    return {
      preferred: sortedCategories.slice(0, 2),
      avoided: sortedCategories.slice(-2)
    };
  }

  /**
   * Calculate choice consistency for confidence scoring
   */
  private calculateChoiceConsistency(choices: any[]): number {
    if (choices.length < 3) return 0.5;

    // Measure consistency in response times
    const responseTimes = choices.map(c => c.response_time);
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
    const timeConsistency = Math.max(0, 1 - (variance / (avgTime * avgTime)));

    // Measure consistency in choice patterns
    const choiceWords = choices.map(c => c.selected_choice.toLowerCase().split(' ')).flat();
    const wordFreq: Record<string, number> = {};
    choiceWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    const repeatedWords = Object.values(wordFreq).filter(freq => freq > 1).length;
    const patternConsistency = repeatedWords / Object.keys(wordFreq).length;

    return (timeConsistency + patternConsistency) / 2;
  }

  /**
   * Analyze confidence trend over time
   */
  private analyzeConfidenceTrend(choices: any[]): LongitudinalTrend | null {
    if (choices.length < 10) return null;

    // Split into early and late periods
    const midpoint = Math.floor(choices.length / 2);
    const earlyChoices = choices.slice(0, midpoint);
    const lateChoices = choices.slice(midpoint);

    const earlyAvgTime = earlyChoices.reduce((sum, c) => sum + c.response_time, 0) / earlyChoices.length;
    const lateAvgTime = lateChoices.reduce((sum, c) => sum + c.response_time, 0) / lateChoices.length;

    const timeChange = (earlyAvgTime - lateAvgTime) / earlyAvgTime;
    
    if (Math.abs(timeChange) < 0.2) return null; // Not significant enough

    const trendType = timeChange > 0 ? 'increasing_confidence' : 'decreasing_confidence';
    const significance = Math.min(1, Math.abs(timeChange) * 2);

    return {
      userId: choices[0].user_id,
      timeRange: {
        start: choices[0].created_at,
        end: choices[choices.length - 1].created_at
      },
      trendType,
      description: `Response times ${timeChange > 0 ? 'decreased' : 'increased'} by ${Math.round(Math.abs(timeChange) * 100)}% over time`,
      significance,
      recommendations: timeChange > 0 ? 
        ['Child is becoming more confident in decision-making', 'Continue encouraging independent choices'] :
        ['Child may be experiencing decision fatigue', 'Consider shorter sessions or simpler choices']
    };
  }

  /**
   * Analyze preference changes over time
   */
  private analyzePreferenceChanges(choices: any[], timeRange: { start: string; end: string }): LongitudinalTrend | null {
    if (choices.length < 15) return null;

    // Split into thirds to see progression
    const thirdSize = Math.floor(choices.length / 3);
    const earlyChoices = choices.slice(0, thirdSize);
    const middleChoices = choices.slice(thirdSize, thirdSize * 2);
    const lateChoices = choices.slice(thirdSize * 2);

    const earlyPatterns = this.categorizeChoices(earlyChoices);
    const latePatterns = this.categorizeChoices(lateChoices);

    // Check if preferences changed significantly
    const preferenceOverlap = earlyPatterns.preferred.filter(p => 
      latePatterns.preferred.includes(p)
    ).length;

    if (preferenceOverlap >= earlyPatterns.preferred.length * 0.5) {
      return null; // Preferences are stable
    }

    return {
      userId: choices[0].user_id,
      timeRange,
      trendType: 'changing_preferences',
      description: `Story preferences evolved from ${earlyPatterns.preferred.join(', ')} to ${latePatterns.preferred.join(', ')}`,
      significance: 1 - (preferenceOverlap / earlyPatterns.preferred.length),
      recommendations: [
        'Child is exploring different types of stories and experiences',
        'Continue offering diverse story options to support development',
        'Consider introducing new story types that align with emerging interests'
      ]
    };
  }

  /**
   * Analyze emotional development through choices
   */
  private analyzeEmotionalDevelopment(choices: any[], timeRange: { start: string; end: string }): LongitudinalTrend | null {
    const choicesWithEmotion = choices.filter(c => c.emotional_context);
    
    if (choicesWithEmotion.length < 8) return null;

    // Analyze emotional complexity in choices over time
    const midpoint = Math.floor(choicesWithEmotion.length / 2);
    const earlyChoices = choicesWithEmotion.slice(0, midpoint);
    const lateChoices = choicesWithEmotion.slice(midpoint);

    const earlyComplexity = this.calculateEmotionalComplexity(earlyChoices);
    const lateComplexity = this.calculateEmotionalComplexity(lateChoices);

    const complexityChange = lateComplexity - earlyComplexity;

    if (Math.abs(complexityChange) < 0.1) return null;

    return {
      userId: choices[0].user_id,
      timeRange,
      trendType: complexityChange > 0 ? 'increasing_confidence' : 'stable_patterns',
      description: `Emotional complexity in choices ${complexityChange > 0 ? 'increased' : 'remained stable'} over time`,
      significance: Math.abs(complexityChange),
      recommendations: complexityChange > 0 ? 
        ['Child is developing more sophisticated emotional understanding', 'Continue with emotionally rich storytelling'] :
        ['Child maintains consistent emotional engagement', 'Consider introducing more emotionally complex scenarios']
    };
  }

  /**
   * Calculate emotional complexity score
   */
  private calculateEmotionalComplexity(choices: any[]): number {
    const emotionVariety = new Set(choices.map(c => c.emotional_context)).size;
    const avgResponseTime = choices.reduce((sum, c) => sum + c.response_time, 0) / choices.length;
    
    // Complexity based on emotional variety and thoughtful response times
    const varietyScore = emotionVariety / 5; // Max 5 emotions
    const thoughtfulnessScore = Math.min(1, avgResponseTime / 8000); // 8 seconds = max thoughtfulness
    
    return (varietyScore + thoughtfulnessScore) / 2;
  }

  /**
   * Identify concerning patterns that may need intervention
   */
  private identifyConcerningPatterns(choices: any[]): Array<{
    type: 'emotional_distress' | 'developmental_concern' | 'behavioral_pattern';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendations: string[];
  }> {
    const concerns: Array<{
      type: 'emotional_distress' | 'developmental_concern' | 'behavioral_pattern';
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendations: string[];
    }> = [];

    if (choices.length < 5) return concerns;

    // Check for consistently negative emotional contexts
    const negativeEmotions = choices.filter(c => 
      ['sad', 'scared', 'angry'].includes(c.emotional_context)
    );
    
    if (negativeEmotions.length > choices.length * 0.7) {
      concerns.push({
        type: 'emotional_distress' as const,
        severity: negativeEmotions.length > choices.length * 0.8 ? 'high' as const : 'medium' as const,
        description: 'Child consistently makes choices while in negative emotional states',
        recommendations: [
          'Consider emotional check-ins before story sessions',
          'Focus on uplifting and supportive story content',
          'Monitor for signs of ongoing emotional distress'
        ]
      });
    }

    // Check for extremely long response times (possible distress or confusion)
    const longResponses = choices.filter(c => c.response_time > 20000); // 20 seconds
    if (longResponses.length > choices.length * 0.4) {
      concerns.push({
        type: 'developmental_concern' as const,
        severity: 'medium' as const,
        description: 'Child frequently takes very long to make story choices',
        recommendations: [
          'Simplify choice options',
          'Provide more context or examples',
          'Check if child needs additional support with decision-making'
        ]
      });
    }

    // Check for repetitive, non-engaging choices
    const choiceTexts = choices.map(c => c.selected_choice.toLowerCase());
    const uniqueChoices = new Set(choiceTexts).size;
    if (uniqueChoices < choices.length * 0.3) {
      concerns.push({
        type: 'behavioral_pattern' as const,
        severity: 'low' as const,
        description: 'Child makes very similar choices repeatedly',
        recommendations: [
          'Introduce more varied choice options',
          'Encourage exploration of different story paths',
          'Check if child is engaged with the content'
        ]
      });
    }

    return concerns;
  }
}
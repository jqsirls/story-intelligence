import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';

export interface ResponseLatencyData {
  userId: string;
  sessionId: string;
  questionType: 'character_trait' | 'story_choice' | 'emotional_checkin' | 'general';
  question: string;
  responseTime: number; // milliseconds
  timestamp: string;
  context?: Record<string, any>;
}

export interface EngagementMetrics {
  averageResponseTime: number;
  responseTimeVariance: number;
  engagementLevel: 'high' | 'medium' | 'low';
  attentionSpan: number; // estimated in seconds
  fatigueIndicators: FatigueIndicator[];
  recommendations: string[];
}

export interface FatigueIndicator {
  type: 'increasing_latency' | 'inconsistent_responses' | 'shortened_answers' | 'distraction_signs';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  detectedAt: string;
  description: string;
}

export interface EngagementPattern {
  userId: string;
  sessionId: string;
  timeRange: {
    start: string;
    end: string;
  };
  totalInteractions: number;
  averageLatency: number;
  engagementTrend: 'improving' | 'declining' | 'stable';
  optimalInteractionTime: number; // seconds
  fatigueOnsetTime?: number; // seconds into session
}

/**
 * Analyzes response latency patterns to measure engagement and detect fatigue
 * Requirements: 7.1, 7.2, 7.3
 */
export class ResponseLatencyAnalyzer {
  constructor(
    private supabase: SupabaseClient,
    private redis: RedisClientType | undefined,
    private logger: Logger
  ) {}

  /**
   * Record response latency data for analysis
   */
  async recordResponseLatency(data: ResponseLatencyData): Promise<void> {
    try {
      this.logger.info('Recording response latency', {
        userId: data.userId,
        sessionId: data.sessionId,
        responseTime: data.responseTime,
        questionType: data.questionType
      });

      // Store in database for long-term analysis
      await this.supabase
        .from('response_latency_data')
        .insert({
          user_id: data.userId,
          session_id: data.sessionId,
          question_type: data.questionType,
          question: data.question,
          response_time: data.responseTime,
          context: data.context,
          created_at: data.timestamp
        });

      // Cache recent data for real-time analysis
      if (this.redis) {
        const cacheKey = `latency:${data.userId}:${data.sessionId}`;
        const existingData = await this.redis.get(cacheKey);
        const latencyHistory = existingData ? JSON.parse(existingData) : [];
        
        latencyHistory.push({
          responseTime: data.responseTime,
          questionType: data.questionType,
          timestamp: data.timestamp
        });

        // Keep only last 20 interactions for real-time analysis
        if (latencyHistory.length > 20) {
          latencyHistory.shift();
        }

        await this.redis.setEx(cacheKey, 3600, JSON.stringify(latencyHistory)); // 1 hour TTL
      }

      // Trigger real-time engagement analysis
      await this.analyzeRealTimeEngagement(data.userId, data.sessionId);

    } catch (error) {
      this.logger.error('Error recording response latency:', error);
      throw error;
    }
  }

  /**
   * Analyze engagement metrics for a user session
   */
  async analyzeEngagementMetrics(userId: string, sessionId: string): Promise<EngagementMetrics> {
    try {
      this.logger.info('Analyzing engagement metrics', { userId, sessionId });

      // Get latency data for the session
      const latencyData = await this.getSessionLatencyData(userId, sessionId);

      if (latencyData.length === 0) {
        return this.getDefaultEngagementMetrics();
      }

      // Calculate basic metrics
      const responseTimes = latencyData.map(d => d.response_time);
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const responseTimeVariance = this.calculateVariance(responseTimes, averageResponseTime);

      // Determine engagement level
      const engagementLevel = this.determineEngagementLevel(averageResponseTime, responseTimeVariance);

      // Estimate attention span
      const attentionSpan = this.estimateAttentionSpan(latencyData);

      // Detect fatigue indicators
      const fatigueIndicators = this.detectFatigueIndicators(latencyData);

      // Generate recommendations
      const recommendations = this.generateEngagementRecommendations(
        engagementLevel, 
        attentionSpan, 
        fatigueIndicators
      );

      return {
        averageResponseTime,
        responseTimeVariance,
        engagementLevel,
        attentionSpan,
        fatigueIndicators,
        recommendations
      };

    } catch (error) {
      this.logger.error('Error analyzing engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze engagement patterns over time for a user
   */
  async analyzeEngagementPatterns(userId: string, timeRange: { start: string; end: string }): Promise<EngagementPattern[]> {
    try {
      this.logger.info('Analyzing engagement patterns', { userId, timeRange });

      // Get all sessions in time range
      const { data: sessions, error } = await this.supabase
        .from('response_latency_data')
        .select('session_id, created_at')
        .eq('user_id', userId)
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      if (!sessions || sessions.length === 0) {
        return [];
      }

      // Group by session
      const sessionGroups = this.groupBySession(sessions);
      const patterns: EngagementPattern[] = [];

      for (const [sessionId, sessionData] of Object.entries(sessionGroups)) {
        const pattern = await this.analyzeSessionPattern(userId, sessionId, sessionData);
        patterns.push(pattern);
      }

      return patterns;

    } catch (error) {
      this.logger.error('Error analyzing engagement patterns:', error);
      throw error;
    }
  }

  /**
   * Detect intervention triggers for distress or disengagement
   */
  async detectInterventionTriggers(userId: string, sessionId: string): Promise<{
    interventionNeeded: boolean;
    triggerType: 'fatigue' | 'distress' | 'disengagement' | 'confusion';
    severity: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    try {
      this.logger.info('Detecting intervention triggers', { userId, sessionId });

      const engagementMetrics = await this.analyzeEngagementMetrics(userId, sessionId);
      const latencyData = await this.getSessionLatencyData(userId, sessionId);

      let interventionNeeded = false;
      let triggerType: 'fatigue' | 'distress' | 'disengagement' | 'confusion' = 'disengagement';
      let severity: 'low' | 'medium' | 'high' = 'low';
      const recommendations: string[] = [];

      // Check for fatigue indicators
      const highSeverityFatigue = engagementMetrics.fatigueIndicators.filter(f => f.severity === 'high');
      if (highSeverityFatigue.length > 0) {
        interventionNeeded = true;
        triggerType = 'fatigue';
        severity = 'high';
        recommendations.push('Consider taking a break or shortening the session');
        recommendations.push('Switch to less demanding interaction types');
      }

      // Check for distress patterns (very long or very short response times)
      const extremeLatencies = latencyData.filter(d => 
        d.response_time > 15000 || d.response_time < 500
      );
      if (extremeLatencies.length > latencyData.length * 0.3) {
        interventionNeeded = true;
        triggerType = 'distress';
        severity = extremeLatencies.length > latencyData.length * 0.5 ? 'high' : 'medium';
        recommendations.push('Check if the child needs emotional support');
        recommendations.push('Consider switching to calming activities');
      }

      // Check for disengagement (consistently increasing latency)
      if (engagementMetrics.engagementLevel === 'low' && 
          engagementMetrics.averageResponseTime > 8000) {
        interventionNeeded = true;
        triggerType = 'disengagement';
        severity = engagementMetrics.averageResponseTime > 12000 ? 'high' : 'medium';
        recommendations.push('Try more engaging or interactive content');
        recommendations.push('Consider changing the story type or approach');
      }

      // Check for confusion patterns (high variance in response times)
      if (engagementMetrics.responseTimeVariance > 25000000) { // High variance
        interventionNeeded = true;
        triggerType = 'confusion';
        severity = 'medium';
        recommendations.push('Simplify questions or provide more context');
        recommendations.push('Check if instructions are clear');
      }

      return {
        interventionNeeded,
        triggerType,
        severity,
        recommendations
      };

    } catch (error) {
      this.logger.error('Error detecting intervention triggers:', error);
      throw error;
    }
  }

  /**
   * Get session latency data from database
   */
  private async getSessionLatencyData(userId: string, sessionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('response_latency_data')
      .select('*')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  /**
   * Analyze real-time engagement during active session
   */
  private async analyzeRealTimeEngagement(userId: string, sessionId: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    try {
      const cacheKey = `latency:${userId}:${sessionId}`;
      const cachedData = await this.redis.get(cacheKey);
      
      if (!cachedData) {
        return;
      }

      const latencyHistory = JSON.parse(cachedData);
      
      if (latencyHistory.length < 3) {
        return; // Need at least 3 data points
      }

      // Check for rapid degradation in engagement
      const recentLatencies = latencyHistory.slice(-3).map((d: any) => d.responseTime);
      const isIncreasing = recentLatencies[0] < recentLatencies[1] && recentLatencies[1] < recentLatencies[2];
      const averageIncrease = (recentLatencies[2] - recentLatencies[0]) / 2;

      if (isIncreasing && averageIncrease > 3000) { // 3 second increase
        // Store alert for immediate intervention
        const alertKey = `engagement_alert:${userId}:${sessionId}`;
        await this.redis.setEx(alertKey, 300, JSON.stringify({
          type: 'rapid_disengagement',
          severity: averageIncrease > 6000 ? 'high' : 'medium',
          timestamp: new Date().toISOString(),
          recommendation: 'Consider changing interaction style or taking a break'
        }));

        this.logger.warn('Rapid disengagement detected', {
          userId,
          sessionId,
          averageIncrease,
          recentLatencies
        });
      }

    } catch (error) {
      this.logger.error('Error in real-time engagement analysis:', error);
      // Don't throw - this is background analysis
    }
  }

  /**
   * Calculate variance of response times
   */
  private calculateVariance(values: number[], mean: number): number {
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * Determine engagement level based on response metrics
   */
  private determineEngagementLevel(averageResponseTime: number, variance: number): 'high' | 'medium' | 'low' {
    // Optimal response time for children is typically 2-5 seconds
    if (averageResponseTime >= 2000 && averageResponseTime <= 5000 && variance < 10000000) {
      return 'high';
    } else if (averageResponseTime <= 8000 && variance < 25000000) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Estimate attention span based on response patterns
   */
  private estimateAttentionSpan(latencyData: any[]): number {
    if (latencyData.length === 0) {
      return 300; // Default 5 minutes for children
    }

    // Find the point where response times start consistently increasing
    let attentionSpan = 300; // Default
    const timeWindow = 60; // 1 minute windows
    
    for (let i = 0; i < latencyData.length - 2; i++) {
      const currentTime = new Date(latencyData[i].created_at).getTime();
      const windowData = latencyData.filter(d => {
        const dataTime = new Date(d.created_at).getTime();
        return dataTime >= currentTime && dataTime <= currentTime + timeWindow * 1000;
      });

      if (windowData.length >= 2) {
        const avgLatency = windowData.reduce((sum, d) => sum + d.response_time, 0) / windowData.length;
        if (avgLatency > 8000) { // 8 second threshold indicates fatigue
          const sessionStart = new Date(latencyData[0].created_at).getTime();
          attentionSpan = (currentTime - sessionStart) / 1000;
          break;
        }
      }
    }

    return Math.max(60, Math.min(1800, attentionSpan)); // Between 1 minute and 30 minutes
  }

  /**
   * Detect fatigue indicators from latency patterns
   */
  private detectFatigueIndicators(latencyData: any[]): FatigueIndicator[] {
    const indicators: FatigueIndicator[] = [];

    if (latencyData.length < 5) {
      return indicators;
    }

    // Check for increasing latency trend
    const responseTimes = latencyData.map(d => d.response_time);
    const firstHalf = responseTimes.slice(0, Math.floor(responseTimes.length / 2));
    const secondHalf = responseTimes.slice(Math.floor(responseTimes.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length;
    
    if (secondHalfAvg > firstHalfAvg * 1.5) {
      indicators.push({
        type: 'increasing_latency',
        severity: secondHalfAvg > firstHalfAvg * 2 ? 'high' : 'medium',
        confidence: 0.8,
        detectedAt: latencyData[Math.floor(latencyData.length / 2)].created_at,
        description: `Response times increased by ${Math.round((secondHalfAvg - firstHalfAvg) / 1000)} seconds on average`
      });
    }

    // Check for inconsistent responses (high variance)
    const variance = this.calculateVariance(responseTimes, responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
    if (variance > 25000000) { // High variance threshold
      indicators.push({
        type: 'inconsistent_responses',
        severity: variance > 50000000 ? 'high' : 'medium',
        confidence: 0.7,
        detectedAt: latencyData[latencyData.length - 1].created_at,
        description: 'Response times show high variability, indicating possible distraction or fatigue'
      });
    }

    // Check for very long response times (>15 seconds)
    const longResponses = latencyData.filter(d => d.response_time > 15000);
    if (longResponses.length > latencyData.length * 0.2) {
      indicators.push({
        type: 'distraction_signs',
        severity: longResponses.length > latencyData.length * 0.4 ? 'high' : 'medium',
        confidence: 0.9,
        detectedAt: longResponses[0].created_at,
        description: `${longResponses.length} responses took longer than 15 seconds`
      });
    }

    return indicators;
  }

  /**
   * Generate engagement recommendations
   */
  private generateEngagementRecommendations(
    engagementLevel: 'high' | 'medium' | 'low',
    attentionSpan: number,
    fatigueIndicators: FatigueIndicator[]
  ): string[] {
    const recommendations: string[] = [];

    if (engagementLevel === 'low') {
      recommendations.push('Consider more interactive or engaging content');
      recommendations.push('Try shorter, more focused interactions');
      recommendations.push('Use more visual or audio cues to maintain attention');
    }

    if (attentionSpan < 180) { // Less than 3 minutes
      recommendations.push('Keep interactions very brief and focused');
      recommendations.push('Use frequent positive reinforcement');
      recommendations.push('Consider breaking content into smaller segments');
    }

    fatigueIndicators.forEach(indicator => {
      switch (indicator.type) {
        case 'increasing_latency':
          recommendations.push('Take a break or end the session soon');
          break;
        case 'inconsistent_responses':
          recommendations.push('Check for distractions in the environment');
          break;
        case 'distraction_signs':
          recommendations.push('Use more engaging prompts or change the activity');
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Engagement levels are good - continue current approach');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Group session data by session ID
   */
  private groupBySession(sessions: any[]): Record<string, any[]> {
    return sessions.reduce((groups, session) => {
      const sessionId = session.session_id;
      if (!groups[sessionId]) {
        groups[sessionId] = [];
      }
      groups[sessionId].push(session);
      return groups;
    }, {});
  }

  /**
   * Analyze engagement pattern for a single session
   */
  private async analyzeSessionPattern(userId: string, sessionId: string, sessionData: any[]): Promise<EngagementPattern> {
    const latencyData = await this.getSessionLatencyData(userId, sessionId);
    
    const startTime = sessionData[0].created_at;
    const endTime = sessionData[sessionData.length - 1].created_at;
    const totalInteractions = latencyData.length;
    
    const responseTimes = latencyData.map(d => d.response_time);
    const averageLatency = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    // Determine trend
    const firstQuarter = responseTimes.slice(0, Math.floor(responseTimes.length / 4));
    const lastQuarter = responseTimes.slice(-Math.floor(responseTimes.length / 4));
    
    const firstAvg = firstQuarter.reduce((sum, time) => sum + time, 0) / firstQuarter.length;
    const lastAvg = lastQuarter.reduce((sum, time) => sum + time, 0) / lastQuarter.length;
    
    let engagementTrend: 'improving' | 'declining' | 'stable';
    if (lastAvg < firstAvg * 0.8) {
      engagementTrend = 'improving';
    } else if (lastAvg > firstAvg * 1.2) {
      engagementTrend = 'declining';
    } else {
      engagementTrend = 'stable';
    }

    // Calculate optimal interaction time (when response times are most consistent)
    const optimalInteractionTime = this.calculateOptimalInteractionTime(latencyData);
    
    // Detect fatigue onset
    const fatigueOnsetTime = this.detectFatigueOnset(latencyData);

    return {
      userId,
      sessionId,
      timeRange: {
        start: startTime,
        end: endTime
      },
      totalInteractions,
      averageLatency,
      engagementTrend,
      optimalInteractionTime,
      fatigueOnsetTime
    };
  }

  /**
   * Calculate optimal interaction time based on response consistency
   */
  private calculateOptimalInteractionTime(latencyData: any[]): number {
    if (latencyData.length === 0) {
      return 300; // Default 5 minutes
    }

    const sessionStart = new Date(latencyData[0].created_at).getTime();
    const sessionEnd = new Date(latencyData[latencyData.length - 1].created_at).getTime();
    const sessionDuration = (sessionEnd - sessionStart) / 1000;

    // Find the time window with most consistent response times
    const windowSize = 60; // 1 minute windows
    let bestWindow = sessionDuration;
    let lowestVariance = Infinity;

    for (let start = 0; start < sessionDuration - windowSize; start += 30) {
      const windowEnd = start + windowSize;
      const windowData = latencyData.filter(d => {
        const dataTime = (new Date(d.created_at).getTime() - sessionStart) / 1000;
        return dataTime >= start && dataTime <= windowEnd;
      });

      if (windowData.length >= 3) {
        const responseTimes = windowData.map(d => d.response_time);
        const mean = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const variance = this.calculateVariance(responseTimes, mean);

        if (variance < lowestVariance) {
          lowestVariance = variance;
          bestWindow = windowEnd;
        }
      }
    }

    return Math.max(60, Math.min(900, bestWindow)); // Between 1 and 15 minutes
  }

  /**
   * Detect when fatigue onset occurs in a session
   */
  private detectFatigueOnset(latencyData: any[]): number | undefined {
    if (latencyData.length < 5) {
      return undefined;
    }

    const sessionStart = new Date(latencyData[0].created_at).getTime();
    
    // Look for the point where response times start consistently increasing
    for (let i = 2; i < latencyData.length - 2; i++) {
      const before = latencyData.slice(Math.max(0, i - 2), i);
      const after = latencyData.slice(i, Math.min(latencyData.length, i + 3));
      
      const beforeAvg = before.reduce((sum, d) => sum + d.response_time, 0) / before.length;
      const afterAvg = after.reduce((sum, d) => sum + d.response_time, 0) / after.length;
      
      if (afterAvg > beforeAvg * 1.5 && afterAvg > 6000) { // 50% increase and >6 seconds
        const fatigueTime = new Date(latencyData[i].created_at).getTime();
        return (fatigueTime - sessionStart) / 1000;
      }
    }

    return undefined;
  }

  /**
   * Get default engagement metrics when no data is available
   */
  private getDefaultEngagementMetrics(): EngagementMetrics {
    return {
      averageResponseTime: 3000,
      responseTimeVariance: 5000000,
      engagementLevel: 'medium',
      attentionSpan: 300,
      fatigueIndicators: [],
      recommendations: ['Continue monitoring engagement patterns', 'Encourage regular interaction']
    };
  }
}
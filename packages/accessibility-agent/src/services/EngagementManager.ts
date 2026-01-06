import { SupabaseClient } from '@supabase/supabase-js';
import {
  AccessibilityProfile,
  EngagementCheck,
  AdaptationError,
} from '../types';

interface EngagementMetrics {
  userId: string;
  sessionId: string;
  responseTime: number;
  interactionCount: number;
  errorCount: number;
  completionRate: number;
  timestamp: Date;
}

export class EngagementManager {
  private sessionStartTimes: Map<string, Date> = new Map();
  private lastEngagementCheck: Map<string, Date> = new Map();
  private engagementHistory: Map<string, EngagementCheck[]> = new Map();

  constructor(private supabase: SupabaseClient) {}

  async performEngagementCheck(
    userId: string,
    sessionId: string,
    checkType: 'attention' | 'comprehension' | 'interest' | 'fatigue',
    profile: AccessibilityProfile
  ): Promise<EngagementCheck> {
    try {
      const sessionKey = `${userId}-${sessionId}`;
      const now = new Date();

      // Check if we should perform an engagement check based on frequency
      const lastCheck = this.lastEngagementCheck.get(sessionKey);
      const timeSinceLastCheck = lastCheck ? now.getTime() - lastCheck.getTime() : Infinity;
      
      if (timeSinceLastCheck < profile.engagementCheckFrequency * 1000) {
        // Too soon for another check, return cached result if available
        const history = this.engagementHistory.get(sessionKey) || [];
        const lastEngagementCheck = history[history.length - 1];
        if (lastEngagementCheck) {
          return lastEngagementCheck;
        }
      }

      // Generate appropriate engagement check prompt
      const prompt = this.generateEngagementPrompt(checkType, profile);
      
      // Create engagement check record
      const engagementCheck: EngagementCheck = {
        userId,
        sessionId,
        checkType,
        prompt,
        engagementLevel: 0.5, // Will be updated based on response
        timestamp: now,
      };

      // Store in database
      const { data, error } = await this.supabase
        .from('engagement_checks')
        .insert(engagementCheck)
        .select()
        .single();

      if (error) throw error;

      // Update local tracking
      this.lastEngagementCheck.set(sessionKey, now);
      const history = this.engagementHistory.get(sessionKey) || [];
      history.push(data);
      this.engagementHistory.set(sessionKey, history);

      return data;
    } catch (error) {
      throw new AdaptationError(`Failed to perform engagement check: ${error.message}`, { userId, sessionId, checkType });
    }
  }

  async updateEngagementLevel(
    userId: string,
    sessionId: string,
    checkId: string,
    response: string,
    engagementLevel: number
  ): Promise<void> {
    try {
      // Analyze response to determine engagement level
      const analyzedLevel = await this.analyzeEngagementResponse(response, engagementLevel);
      
      // Determine action to take based on engagement level
      const actionTaken = this.determineEngagementAction(analyzedLevel);

      // Update the engagement check record
      await this.supabase
        .from('engagement_checks')
        .update({
          response,
          engagementLevel: analyzedLevel,
          actionTaken,
        })
        .eq('id', checkId);

      // Update local cache
      const sessionKey = `${userId}-${sessionId}`;
      const history = this.engagementHistory.get(sessionKey) || [];
      const checkIndex = history.findIndex(check => check.id === checkId);
      if (checkIndex !== -1) {
        history[checkIndex] = {
          ...history[checkIndex],
          response,
          engagementLevel: analyzedLevel,
          actionTaken,
        };
        this.engagementHistory.set(sessionKey, history);
      }
    } catch (error) {
      throw new AdaptationError(`Failed to update engagement level: ${error.message}`, { userId, sessionId, checkId });
    }
  }

  async shouldTakeBreak(
    userId: string,
    sessionId: string,
    profile: AccessibilityProfile
  ): Promise<boolean> {
    try {
      if (!profile.breakReminders) {
        return false;
      }

      const sessionKey = `${userId}-${sessionId}`;
      const sessionStart = this.sessionStartTimes.get(sessionKey);
      
      if (!sessionStart) {
        // Start tracking this session
        this.sessionStartTimes.set(sessionKey, new Date());
        return false;
      }

      const sessionDuration = Date.now() - sessionStart.getTime();
      const breakInterval = profile.breakReminderInterval * 1000; // Convert to milliseconds

      // Check if it's time for a break
      if (sessionDuration >= breakInterval) {
        // Check recent engagement levels
        const recentEngagement = await this.getRecentEngagementLevel(userId, sessionId);
        
        // Suggest break if engagement is low or if it's been too long
        if (recentEngagement < 0.6 || sessionDuration >= breakInterval * 1.5) {
          return true;
        }
      }

      // Check attention span
      const attentionSpanMs = profile.attentionSpanMinutes * 60 * 1000;
      if (sessionDuration >= attentionSpanMs) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check break requirement:', error);
      return false; // Default to no break on error
    }
  }

  async recordMetrics(
    userId: string,
    sessionId: string,
    metrics: {
      responseTime: number;
      interactionCount: number;
      errorCount: number;
      completionRate: number;
    }
  ): Promise<void> {
    try {
      const engagementMetrics: EngagementMetrics = {
        userId,
        sessionId,
        ...metrics,
        timestamp: new Date(),
      };

      await this.supabase
        .from('engagement_metrics')
        .insert(engagementMetrics);
    } catch (error) {
      // Log error but don't throw - metrics recording shouldn't break the main flow
      console.error('Failed to record engagement metrics:', error);
    }
  }

  async getEngagementInsights(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    averageEngagement: number;
    engagementTrend: 'improving' | 'declining' | 'stable';
    optimalSessionLength: number;
    recommendedBreakFrequency: number;
    attentionPatterns: Array<{ hour: number; engagement: number }>;
  }> {
    try {
      let query = this.supabase
        .from('engagement_checks')
        .select('*')
        .eq('userId', userId);

      if (timeRange) {
        query = query
          .gte('timestamp', timeRange.start.toISOString())
          .lte('timestamp', timeRange.end.toISOString());
      }

      const { data: checks, error } = await query;
      if (error) throw error;

      if (!checks || checks.length === 0) {
        return {
          averageEngagement: 0.5,
          engagementTrend: 'stable',
          optimalSessionLength: 15,
          recommendedBreakFrequency: 600,
          attentionPatterns: [],
        };
      }

      // Calculate average engagement
      const averageEngagement = checks.reduce((sum, check) => sum + check.engagementLevel, 0) / checks.length;

      // Calculate engagement trend
      const recentChecks = checks.slice(-10);
      const olderChecks = checks.slice(0, -10);
      const recentAvg = recentChecks.reduce((sum, check) => sum + check.engagementLevel, 0) / recentChecks.length;
      const olderAvg = olderChecks.length > 0 
        ? olderChecks.reduce((sum, check) => sum + check.engagementLevel, 0) / olderChecks.length
        : recentAvg;

      let engagementTrend: 'improving' | 'declining' | 'stable';
      if (recentAvg > olderAvg + 0.1) {
        engagementTrend = 'improving';
      } else if (recentAvg < olderAvg - 0.1) {
        engagementTrend = 'declining';
      } else {
        engagementTrend = 'stable';
      }

      // Analyze attention patterns by hour
      const hourlyEngagement: Record<number, number[]> = {};
      for (const check of checks) {
        const hour = new Date(check.timestamp).getHours();
        if (!hourlyEngagement[hour]) {
          hourlyEngagement[hour] = [];
        }
        hourlyEngagement[hour].push(check.engagementLevel);
      }

      const attentionPatterns = Object.entries(hourlyEngagement)
        .map(([hour, levels]) => ({
          hour: parseInt(hour),
          engagement: levels.reduce((sum, level) => sum + level, 0) / levels.length,
        }))
        .sort((a, b) => a.hour - b.hour);

      // Calculate optimal session length based on engagement decline
      const optimalSessionLength = this.calculateOptimalSessionLength(checks);

      // Calculate recommended break frequency
      const recommendedBreakFrequency = Math.max(300, Math.min(1800, optimalSessionLength * 60 * 0.8));

      return {
        averageEngagement,
        engagementTrend,
        optimalSessionLength,
        recommendedBreakFrequency,
        attentionPatterns,
      };
    } catch (error) {
      throw new AdaptationError(`Failed to get engagement insights: ${error.message}`, { userId });
    }
  }

  private generateEngagementPrompt(
    checkType: 'attention' | 'comprehension' | 'interest' | 'fatigue',
    profile: AccessibilityProfile
  ): string {
    const prompts = {
      attention: [
        "Are you still with me? 🎯",
        "Let's make sure we're on the same page! 👀",
        "Quick check - are you following along? ✨",
        "How are you feeling about our story so far? 🤔",
      ],
      comprehension: [
        "Can you tell me what just happened in our story? 📚",
        "What do you think about what we just created? 💭",
        "Does this make sense to you? 🧩",
        "Can you repeat back what we just decided? 🔄",
      ],
      interest: [
        "Are you enjoying this part of our story? 😊",
        "What's your favorite thing so far? ⭐",
        "Should we keep going with this idea? 🚀",
        "Is this fun for you? 🎉",
      ],
      fatigue: [
        "How are you feeling? Need a little break? 😌",
        "Are you getting tired? We can pause anytime! 💤",
        "Should we take a quick rest? 🛋️",
        "How's your energy level? 🔋",
      ],
    };

    const typePrompts = prompts[checkType];
    const selectedPrompt = typePrompts[Math.floor(Math.random() * typePrompts.length)];

    // Adapt prompt based on profile
    if (profile.simplifiedLanguageMode) {
      return this.simplifyPrompt(selectedPrompt);
    }

    return selectedPrompt;
  }

  private simplifyPrompt(prompt: string): string {
    // Simplify engagement prompts for easier comprehension
    const simplifications: Record<string, string> = {
      "Are you still with me?": "Are you listening?",
      "Let's make sure we're on the same page!": "Do you understand?",
      "Quick check - are you following along?": "Do you get it?",
      "How are you feeling about our story so far?": "Do you like our story?",
      "Can you tell me what just happened in our story?": "What happened?",
      "What do you think about what we just created?": "What do you think?",
      "Does this make sense to you?": "Do you understand?",
      "Can you repeat back what we just decided?": "Can you say it back?",
    };

    return simplifications[prompt.replace(/[🎯👀✨🤔📚💭🧩🔄😊⭐🚀🎉😌💤🛋️🔋]/g, '').trim()] || prompt;
  }

  private async analyzeEngagementResponse(response: string, providedLevel: number): Promise<number> {
    // Simple engagement analysis based on response characteristics
    let engagementLevel = providedLevel;

    // Positive indicators
    const positiveWords = ['yes', 'yeah', 'good', 'great', 'fun', 'cool', 'awesome', 'love', 'like'];
    const negativeWords = ['no', 'boring', 'tired', 'stop', 'done', 'bad', 'hate', 'don\'t'];

    const lowerResponse = response.toLowerCase();
    
    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (lowerResponse.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (lowerResponse.includes(word)) negativeCount++;
    }

    // Adjust engagement level based on response content
    if (positiveCount > negativeCount) {
      engagementLevel = Math.min(1.0, engagementLevel + 0.2);
    } else if (negativeCount > positiveCount) {
      engagementLevel = Math.max(0.0, engagementLevel - 0.2);
    }

    // Consider response length (very short responses might indicate low engagement)
    if (response.trim().split(' ').length < 3) {
      engagementLevel = Math.max(0.0, engagementLevel - 0.1);
    }

    return Math.round(engagementLevel * 10) / 10; // Round to 1 decimal place
  }

  private determineEngagementAction(engagementLevel: number): string {
    if (engagementLevel >= 0.8) {
      return 'continue_current_pace';
    } else if (engagementLevel >= 0.6) {
      return 'maintain_engagement';
    } else if (engagementLevel >= 0.4) {
      return 'increase_engagement';
    } else if (engagementLevel >= 0.2) {
      return 'suggest_break';
    } else {
      return 'consider_ending_session';
    }
  }

  private async getRecentEngagementLevel(userId: string, sessionId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from('engagement_checks')
        .select('engagementLevel')
        .eq('userId', userId)
        .eq('sessionId', sessionId)
        .order('timestamp', { ascending: false })
        .limit(3);

      if (error || !data || data.length === 0) {
        return 0.5; // Default engagement level
      }

      const levels = data.map(check => check.engagementLevel);
      return levels.reduce((sum, level) => sum + level, 0) / levels.length;
    } catch (error) {
      return 0.5; // Default on error
    }
  }

  private calculateOptimalSessionLength(checks: EngagementCheck[]): number {
    // Group checks by session and analyze engagement decline
    const sessionGroups: Record<string, EngagementCheck[]> = {};
    
    for (const check of checks) {
      if (!sessionGroups[check.sessionId]) {
        sessionGroups[check.sessionId] = [];
      }
      sessionGroups[check.sessionId].push(check);
    }

    const sessionLengths: number[] = [];

    for (const sessionChecks of Object.values(sessionGroups)) {
      if (sessionChecks.length < 2) continue;

      // Sort by timestamp
      sessionChecks.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // Find point where engagement drops significantly
      let optimalPoint = sessionChecks.length;
      for (let i = 1; i < sessionChecks.length; i++) {
        if (sessionChecks[i].engagementLevel < sessionChecks[i - 1].engagementLevel - 0.2) {
          optimalPoint = i;
          break;
        }
      }

      // Calculate session length up to optimal point
      const startTime = new Date(sessionChecks[0].timestamp).getTime();
      const endTime = new Date(sessionChecks[optimalPoint - 1].timestamp).getTime();
      const lengthMinutes = (endTime - startTime) / (1000 * 60);
      
      if (lengthMinutes > 0) {
        sessionLengths.push(lengthMinutes);
      }
    }

    if (sessionLengths.length === 0) {
      return 15; // Default 15 minutes
    }

    // Return median session length
    sessionLengths.sort((a, b) => a - b);
    const median = sessionLengths[Math.floor(sessionLengths.length / 2)];
    return Math.max(5, Math.min(30, Math.round(median))); // Clamp between 5-30 minutes
  }
}
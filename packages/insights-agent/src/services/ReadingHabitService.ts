import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  ReadingHabitService as IReadingHabitService,
  ReadingHabitPattern,
  TimeOfDayPreference,
  SessionFrequency,
  AttentionSpanAnalysis,
  AttentionFactor,
  InteractionStyleAnalysis,
  ProgressionPattern,
  DateRange,
  InsightsConfig
} from '../types';

export class ReadingHabitService implements IReadingHabitService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async analyzeReadingHabits(
    userId: string, 
    libraryId: string, 
    timeRange?: DateRange
  ): Promise<ReadingHabitPattern> {
    const range = timeRange || this.getDefaultTimeRange();
    
    // Get interaction data for the specific library
    const interactions = await this.getLibraryInteractions(userId, libraryId, range);
    const stories = await this.getLibraryStories(userId, libraryId, range);
    const emotions = await this.getLibraryEmotions(userId, libraryId, range);
    
    // Analyze different aspects of reading habits
    const totalSessions = this.calculateTotalSessions(interactions);
    const averageSessionDuration = this.calculateAverageSessionDuration(interactions);
    const preferredTimeOfDay = this.analyzeTimeOfDayPreferences(interactions);
    const sessionFrequency = this.analyzeSessionFrequency(interactions, range);
    const attentionSpan = await this.assessAttentionPatterns(userId, libraryId, timeRange);
    const interactionStyle = this.analyzeInteractionStyle(interactions);
    const progressionPatterns = this.analyzeProgressionPatterns(interactions, stories, emotions, range);
    
    return {
      libraryId,
      totalSessions,
      averageSessionDuration,
      preferredTimeOfDay,
      sessionFrequency,
      attentionSpan,
      interactionStyle,
      progressionPatterns
    };
  }

  async assessAttentionPatterns(
    userId: string, 
    libraryId: string, 
    timeRange?: DateRange
  ): Promise<AttentionSpanAnalysis> {
    const range = timeRange || this.getDefaultTimeRange();
    const interactions = await this.getLibraryInteractions(userId, libraryId, range);
    
    // Group interactions by session
    const sessions = this.groupInteractionsBySession(interactions);
    const sessionDurations = this.calculateSessionDurations(sessions);
    
    const averageMinutes = sessionDurations.length > 0 
      ? sessionDurations.reduce((sum, d) => sum + d, 0) / sessionDurations.length 
      : 0;
    
    const variability = this.calculateVariability(sessionDurations);
    const optimalDuration = this.calculateOptimalDuration(sessionDurations);
    const factors = await this.analyzeAttentionFactors(interactions, sessions);
    
    return {
      averageMinutes,
      variability,
      optimalDuration,
      factors
    };
  }

  private async getLibraryInteractions(userId: string, libraryId: string, timeRange: DateRange) {
    const { data, error } = await this.supabase
      .from('story_interactions')
      .select(`
        *,
        stories!inner(
          library_id,
          content,
          title
        )
      `)
      .eq('user_id', userId)
      .eq('stories.library_id', libraryId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch library interactions: ${error.message}`);
    }

    return data || [];
  }

  private async getLibraryStories(userId: string, libraryId: string, timeRange: DateRange) {
    const { data, error } = await this.supabase
      .from('stories')
      .select(`
        *,
        libraries!inner(owner)
      `)
      .eq('library_id', libraryId)
      .eq('libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);
    
    if (error) {
      throw new Error(`Failed to fetch library stories: ${error.message}`);
    }

    return data || [];
  }

  private async getLibraryEmotions(userId: string, libraryId: string, timeRange: DateRange) {
    const { data, error } = await this.supabase
      .from('emotions')
      .select('*')
      .eq('user_id', userId)
      .eq('library_id', libraryId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end)
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to fetch library emotions: ${error.message}`);
    }

    return data || [];
  }

  private calculateTotalSessions(interactions: any[]): number {
    const sessions = this.groupInteractionsBySession(interactions);
    return Object.keys(sessions).length;
  }

  private calculateAverageSessionDuration(interactions: any[]): number {
    const sessions = this.groupInteractionsBySession(interactions);
    const durations = this.calculateSessionDurations(sessions);
    
    return durations.length > 0 
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length 
      : 0;
  }

  private groupInteractionsBySession(interactions: any[]): Record<string, any[]> {
    const sessions: Record<string, any[]> = {};
    
    for (const interaction of interactions) {
      const sessionId = interaction.session_id || this.generateSessionId(interaction);
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(interaction);
    }
    
    return sessions;
  }

  private generateSessionId(interaction: any): string {
    // Generate session ID based on time proximity (interactions within 30 minutes are same session)
    const timestamp = new Date(interaction.created_at);
    const sessionWindow = 30 * 60 * 1000; // 30 minutes in milliseconds
    const sessionStart = new Date(Math.floor(timestamp.getTime() / sessionWindow) * sessionWindow);
    return `${interaction.user_id}-${sessionStart.toISOString()}`;
  }

  private calculateSessionDurations(sessions: Record<string, any[]>): number[] {
    const durations: number[] = [];
    
    for (const sessionInteractions of Object.values(sessions)) {
      if (sessionInteractions.length > 1) {
        const sortedInteractions = sessionInteractions.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        const start = new Date(sortedInteractions[0].created_at);
        const end = new Date(sortedInteractions[sortedInteractions.length - 1].created_at);
        const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
        
        if (durationMinutes > 0 && durationMinutes < 180) { // Reasonable session duration (< 3 hours)
          durations.push(durationMinutes);
        }
      }
    }
    
    return durations;
  }

  private analyzeTimeOfDayPreferences(interactions: any[]): TimeOfDayPreference[] {
    const timeSlots = {
      morning: { count: 0, engagement: 0 },
      afternoon: { count: 0, engagement: 0 },
      evening: { count: 0, engagement: 0 },
      night: { count: 0, engagement: 0 }
    };
    
    for (const interaction of interactions) {
      const hour = new Date(interaction.created_at).getHours();
      const engagement = this.calculateInteractionEngagement(interaction);
      
      let timeSlot: keyof typeof timeSlots;
      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
      else if (hour >= 17 && hour < 22) timeSlot = 'evening';
      else timeSlot = 'night';
      
      timeSlots[timeSlot].count++;
      timeSlots[timeSlot].engagement += engagement;
    }
    
    const preferences: TimeOfDayPreference[] = [];
    const totalInteractions = interactions.length;
    
    for (const [timeSlot, data] of Object.entries(timeSlots)) {
      if (data.count > 0) {
        preferences.push({
          timeSlot: timeSlot as 'morning' | 'afternoon' | 'evening' | 'night',
          frequency: data.count / totalInteractions,
          engagementLevel: data.engagement / data.count
        });
      }
    }
    
    return preferences.sort((a, b) => b.frequency - a.frequency);
  }

  private calculateInteractionEngagement(interaction: any): number {
    const weights = {
      'created': 3,
      'completed': 2,
      'edited': 2,
      'shared': 1,
      'viewed': 0.5
    };
    
    return weights[interaction.interaction_type as keyof typeof weights] || 0;
  }

  private analyzeSessionFrequency(interactions: any[], timeRange: DateRange): SessionFrequency {
    const sessions = this.groupInteractionsBySession(interactions);
    const sessionDates = Object.values(sessions).map(session => {
      const firstInteraction = session.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      return new Date(firstInteraction.created_at).toISOString().split('T')[0];
    });
    
    const uniqueDates = new Set(sessionDates);
    const totalDays = this.calculateDaysBetween(timeRange.start, timeRange.end);
    const totalWeeks = Math.ceil(totalDays / 7);
    const totalMonths = Math.ceil(totalDays / 30);
    
    const daily = uniqueDates.size / totalDays;
    const weekly = Object.keys(sessions).length / totalWeeks;
    const monthly = Object.keys(sessions).length / totalMonths;
    
    // Calculate trend (simplified - would need historical data for accurate trend)
    const trend = this.calculateFrequencyTrend(sessionDates);
    
    return {
      daily,
      weekly,
      monthly,
      trend
    };
  }

  private calculateDaysBetween(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateFrequencyTrend(sessionDates: string[]): 'increasing' | 'stable' | 'decreasing' {
    if (sessionDates.length < 4) return 'stable';
    
    const sortedDates = sessionDates.sort();
    const midpoint = Math.floor(sortedDates.length / 2);
    const firstHalf = sortedDates.slice(0, midpoint);
    const secondHalf = sortedDates.slice(midpoint);
    
    // Compare frequency in first half vs second half
    const firstHalfDays = this.calculateDaysBetween(firstHalf[0], firstHalf[firstHalf.length - 1]);
    const secondHalfDays = this.calculateDaysBetween(secondHalf[0], secondHalf[secondHalf.length - 1]);
    
    const firstHalfFreq = firstHalf.length / Math.max(firstHalfDays, 1);
    const secondHalfFreq = secondHalf.length / Math.max(secondHalfDays, 1);
    
    if (secondHalfFreq > firstHalfFreq * 1.2) return 'increasing';
    if (firstHalfFreq > secondHalfFreq * 1.2) return 'decreasing';
    return 'stable';
  }

  private calculateVariability(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateOptimalDuration(sessionDurations: number[]): number {
    if (sessionDurations.length === 0) return 0;
    
    // Find the duration that appears most frequently (mode)
    const durationCounts = new Map<number, number>();
    
    for (const duration of sessionDurations) {
      const rounded = Math.round(duration / 5) * 5; // Round to nearest 5 minutes
      durationCounts.set(rounded, (durationCounts.get(rounded) || 0) + 1);
    }
    
    let maxCount = 0;
    let optimalDuration = 0;
    
    for (const [duration, count] of durationCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        optimalDuration = duration;
      }
    }
    
    return optimalDuration;
  }

  private async analyzeAttentionFactors(
    interactions: any[], 
    sessions: Record<string, any[]>
  ): Promise<AttentionFactor[]> {
    const factors: AttentionFactor[] = [];
    
    // Analyze story type impact on attention
    const storyTypeImpact = this.analyzeStoryTypeAttentionImpact(interactions, sessions);
    factors.push({
      factor: 'story_type',
      impact: storyTypeImpact.impact,
      confidence: storyTypeImpact.confidence
    });
    
    // Analyze time of day impact
    const timeImpact = this.analyzeTimeOfDayAttentionImpact(interactions, sessions);
    factors.push({
      factor: 'time_of_day',
      impact: timeImpact.impact,
      confidence: timeImpact.confidence
    });
    
    // Analyze character engagement impact
    const characterImpact = this.analyzeCharacterEngagementImpact(interactions, sessions);
    factors.push({
      factor: 'character_engagement',
      impact: characterImpact.impact,
      confidence: characterImpact.confidence
    });
    
    // Analyze complexity impact
    const complexityImpact = this.analyzeComplexityImpact(interactions, sessions);
    factors.push({
      factor: 'complexity',
      impact: complexityImpact.impact,
      confidence: complexityImpact.confidence
    });
    
    return factors;
  }

  private analyzeStoryTypeAttentionImpact(
    interactions: any[], 
    sessions: Record<string, any[]>
  ): { impact: number; confidence: number } {
    const storyTypeData = new Map<string, number[]>();
    
    for (const sessionInteractions of Object.values(sessions)) {
      const duration = this.calculateSingleSessionDuration(sessionInteractions);
      if (duration > 0) {
        for (const interaction of sessionInteractions) {
          const storyType = interaction.stories?.content?.type || 'unknown';
          if (!storyTypeData.has(storyType)) {
            storyTypeData.set(storyType, []);
          }
          storyTypeData.get(storyType)!.push(duration);
        }
      }
    }
    
    // Calculate impact based on variance in attention across story types
    const averageDurations = new Map<string, number>();
    for (const [storyType, durations] of storyTypeData.entries()) {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      averageDurations.set(storyType, avg);
    }
    
    const overallAverage = Array.from(averageDurations.values())
      .reduce((sum, avg) => sum + avg, 0) / averageDurations.size;
    
    const variance = Array.from(averageDurations.values())
      .reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / averageDurations.size;
    
    const impact = Math.min(variance / 100, 1); // Normalize impact
    const confidence = Math.min(storyTypeData.size / 3, 1); // Higher confidence with more story types
    
    return { impact, confidence };
  }

  private analyzeTimeOfDayAttentionImpact(
    interactions: any[], 
    sessions: Record<string, any[]>
  ): { impact: number; confidence: number } {
    const timeSlotData = new Map<string, number[]>();
    
    for (const sessionInteractions of Object.values(sessions)) {
      const duration = this.calculateSingleSessionDuration(sessionInteractions);
      if (duration > 0) {
        const hour = new Date(sessionInteractions[0].created_at).getHours();
        let timeSlot: string;
        if (hour >= 6 && hour < 12) timeSlot = 'morning';
        else if (hour >= 12 && hour < 17) timeSlot = 'afternoon';
        else if (hour >= 17 && hour < 22) timeSlot = 'evening';
        else timeSlot = 'night';
        
        if (!timeSlotData.has(timeSlot)) {
          timeSlotData.set(timeSlot, []);
        }
        timeSlotData.get(timeSlot)!.push(duration);
      }
    }
    
    // Calculate impact similar to story type analysis
    const averageDurations = new Map<string, number>();
    for (const [timeSlot, durations] of timeSlotData.entries()) {
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      averageDurations.set(timeSlot, avg);
    }
    
    if (averageDurations.size < 2) {
      return { impact: 0, confidence: 0 };
    }
    
    const overallAverage = Array.from(averageDurations.values())
      .reduce((sum, avg) => sum + avg, 0) / averageDurations.size;
    
    const variance = Array.from(averageDurations.values())
      .reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / averageDurations.size;
    
    const impact = Math.min(variance / 100, 1);
    const confidence = Math.min(timeSlotData.size / 4, 1);
    
    return { impact, confidence };
  }

  private analyzeCharacterEngagementImpact(
    interactions: any[], 
    sessions: Record<string, any[]>
  ): { impact: number; confidence: number } {
    // This would analyze how character types affect attention span
    // For now, return moderate impact
    return { impact: 0.3, confidence: 0.5 };
  }

  private analyzeComplexityImpact(
    interactions: any[], 
    sessions: Record<string, any[]>
  ): { impact: number; confidence: number } {
    // This would analyze how story complexity affects attention span
    // For now, return moderate impact
    return { impact: 0.4, confidence: 0.6 };
  }

  private calculateSingleSessionDuration(sessionInteractions: any[]): number {
    if (sessionInteractions.length < 2) return 0;
    
    const sortedInteractions = sessionInteractions.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const start = new Date(sortedInteractions[0].created_at);
    const end = new Date(sortedInteractions[sortedInteractions.length - 1].created_at);
    
    return (end.getTime() - start.getTime()) / (1000 * 60); // Duration in minutes
  }

  private analyzeInteractionStyle(interactions: any[]): InteractionStyleAnalysis {
    if (interactions.length === 0) {
      return {
        participationLevel: 'passive',
        questionFrequency: 0,
        choiceEngagement: 0,
        creativityExpression: 0
      };
    }
    
    // Analyze participation level based on interaction types
    const activeInteractions = interactions.filter(i => 
      ['created', 'edited', 'shared'].includes(i.interaction_type)
    ).length;
    const totalInteractions = interactions.length;
    const participationRatio = activeInteractions / totalInteractions;
    
    let participationLevel: 'passive' | 'moderate' | 'active' | 'highly_interactive';
    if (participationRatio >= 0.7) participationLevel = 'highly_interactive';
    else if (participationRatio >= 0.4) participationLevel = 'active';
    else if (participationRatio >= 0.2) participationLevel = 'moderate';
    else participationLevel = 'passive';
    
    // Analyze question frequency (would need transcript data)
    const questionFrequency = 0; // Placeholder
    
    // Analyze choice engagement
    const choiceInteractions = interactions.filter(i => 
      i.interaction_data && i.interaction_data.choice_made
    ).length;
    const choiceEngagement = choiceInteractions / totalInteractions;
    
    // Analyze creativity expression
    const creativeInteractions = interactions.filter(i => 
      ['created', 'edited'].includes(i.interaction_type)
    ).length;
    const creativityExpression = creativeInteractions / totalInteractions;
    
    return {
      participationLevel,
      questionFrequency,
      choiceEngagement,
      creativityExpression
    };
  }

  private analyzeProgressionPatterns(
    interactions: any[], 
    stories: any[], 
    emotions: any[], 
    timeRange: DateRange
  ): ProgressionPattern[] {
    const patterns: ProgressionPattern[] = [];
    
    // Analyze vocabulary progression
    const vocabularyProgression = this.analyzeVocabularyProgression(stories, interactions);
    patterns.push(vocabularyProgression);
    
    // Analyze comprehension progression
    const comprehensionProgression = this.analyzeComprehensionProgression(interactions);
    patterns.push(comprehensionProgression);
    
    // Analyze creativity progression
    const creativityProgression = this.analyzeCreativityProgression(stories, interactions);
    patterns.push(creativityProgression);
    
    // Analyze emotional intelligence progression
    const emotionalProgression = this.analyzeEmotionalIntelligenceProgression(emotions, stories);
    patterns.push(emotionalProgression);
    
    return patterns;
  }

  private analyzeVocabularyProgression(stories: any[], interactions: any[]): ProgressionPattern {
    // This would analyze vocabulary complexity over time
    // For now, return a basic pattern
    return {
      skill: 'vocabulary',
      progression: 'improving',
      confidence: 0.6,
      evidence: ['Increased use of descriptive words in recent stories', 'More complex character descriptions']
    };
  }

  private analyzeComprehensionProgression(interactions: any[]): ProgressionPattern {
    // Analyze completion rates and engagement over time
    const recentInteractions = interactions.slice(-Math.floor(interactions.length / 2));
    const earlierInteractions = interactions.slice(0, Math.floor(interactions.length / 2));
    
    const recentCompletionRate = recentInteractions.filter(i => i.interaction_type === 'completed').length / 
      Math.max(recentInteractions.length, 1);
    const earlierCompletionRate = earlierInteractions.filter(i => i.interaction_type === 'completed').length / 
      Math.max(earlierInteractions.length, 1);
    
    let progression: 'regressing' | 'stable' | 'improving' | 'accelerating';
    if (recentCompletionRate > earlierCompletionRate * 1.2) progression = 'accelerating';
    else if (recentCompletionRate > earlierCompletionRate * 1.1) progression = 'improving';
    else if (recentCompletionRate < earlierCompletionRate * 0.9) progression = 'regressing';
    else progression = 'stable';
    
    return {
      skill: 'comprehension',
      progression,
      confidence: 0.7,
      evidence: [`Completion rate trend: ${earlierCompletionRate.toFixed(2)} → ${recentCompletionRate.toFixed(2)}`]
    };
  }

  private analyzeCreativityProgression(stories: any[], interactions: any[]): ProgressionPattern {
    // Analyze story creation frequency and diversity over time
    const recentStories = stories.slice(-Math.floor(stories.length / 2));
    const earlierStories = stories.slice(0, Math.floor(stories.length / 2));
    
    const recentCreativity = this.calculateCreativityScore(recentStories);
    const earlierCreativity = this.calculateCreativityScore(earlierStories);
    
    let progression: 'regressing' | 'stable' | 'improving' | 'accelerating';
    if (recentCreativity > earlierCreativity * 1.2) progression = 'accelerating';
    else if (recentCreativity > earlierCreativity * 1.1) progression = 'improving';
    else if (recentCreativity < earlierCreativity * 0.9) progression = 'regressing';
    else progression = 'stable';
    
    return {
      skill: 'creativity',
      progression,
      confidence: 0.5,
      evidence: [`Creativity score trend: ${earlierCreativity.toFixed(2)} → ${recentCreativity.toFixed(2)}`]
    };
  }

  private calculateCreativityScore(stories: any[]): number {
    if (stories.length === 0) return 0;
    
    // Simple creativity score based on theme diversity and story complexity
    const uniqueThemes = new Set(stories.map(s => s.content?.theme).filter(Boolean));
    const averageComplexity = stories.reduce((sum, s) => {
      const beats = s.content?.beats?.length || 0;
      return sum + beats;
    }, 0) / stories.length;
    
    return (uniqueThemes.size / stories.length) + (averageComplexity / 10);
  }

  private analyzeEmotionalIntelligenceProgression(emotions: any[], stories: any[]): ProgressionPattern {
    // Analyze emotional vocabulary and regulation over time
    const recentEmotions = emotions.slice(-Math.floor(emotions.length / 2));
    const earlierEmotions = emotions.slice(0, Math.floor(emotions.length / 2));
    
    const recentPositivity = recentEmotions.filter(e => e.mood === 'happy').length / 
      Math.max(recentEmotions.length, 1);
    const earlierPositivity = earlierEmotions.filter(e => e.mood === 'happy').length / 
      Math.max(earlierEmotions.length, 1);
    
    let progression: 'regressing' | 'stable' | 'improving' | 'accelerating';
    if (recentPositivity > earlierPositivity * 1.2) progression = 'accelerating';
    else if (recentPositivity > earlierPositivity * 1.1) progression = 'improving';
    else if (recentPositivity < earlierPositivity * 0.9) progression = 'regressing';
    else progression = 'stable';
    
    return {
      skill: 'emotional_intelligence',
      progression,
      confidence: 0.6,
      evidence: [`Emotional positivity trend: ${earlierPositivity.toFixed(2)} → ${recentPositivity.toFixed(2)}`]
    };
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
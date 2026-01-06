import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  BehavioralAnalysisService as IBehavioralAnalysisService,
  BehavioralPattern,
  BehavioralPatternType,
  BehavioralIndicator,
  BehavioralRecommendation,
  DateRange,
  InsightsConfig
} from '../types';

export class BehavioralAnalysisService implements IBehavioralAnalysisService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async analyzeBehavioralPatterns(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<BehavioralPattern[]> {
    const range = timeRange || this.getDefaultTimeRange();
    
    // Get data for behavioral analysis
    const interactions = await this.getStoryInteractions(userId, libraryId, range);
    const emotions = await this.getEmotionalData(userId, libraryId, range);
    const stories = await this.getStoryData(userId, libraryId, range);
    const characters = await this.getCharacterData(userId, libraryId, range);
    
    const patterns: BehavioralPattern[] = [];
    
    // Analyze different behavioral patterns
    patterns.push(await this.analyzeSocialEngagement(interactions, emotions, stories));
    patterns.push(await this.analyzeCreativityExpression(stories, characters, interactions));
    patterns.push(await this.analyzeProblemSolving(interactions, stories));
    patterns.push(await this.analyzeEmotionalRegulation(emotions, interactions));
    patterns.push(await this.analyzeAttentionPatterns(interactions));
    patterns.push(await this.analyzeCommunicationStyle(interactions, stories));
    patterns.push(await this.analyzeConflictResolution(stories, interactions));
    patterns.push(await this.analyzeEmpathyDevelopment(stories, characters, emotions));
    
    // Filter out patterns with low confidence
    return patterns.filter(pattern => pattern.confidence >= this.config.analysis.confidenceThreshold);
  }

  async assessSocialEngagement(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<BehavioralPattern> {
    const range = timeRange || this.getDefaultTimeRange();
    const interactions = await this.getStoryInteractions(userId, libraryId, range);
    const emotions = await this.getEmotionalData(userId, libraryId, range);
    const stories = await this.getStoryData(userId, libraryId, range);
    
    return this.analyzeSocialEngagement(interactions, emotions, stories);
  }

  private async getStoryInteractions(userId: string, timeRange: DateRange, libraryId?: string) {
    let query = this.supabase
      .from('story_interactions')
      .select(`
        *,
        stories!inner(
          library_id,
          content,
          libraries!inner(owner)
        )
      `)
      .eq('user_id', userId)
      .eq('stories.libraries.owner', userId)
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

  private async getStoryData(userId: string, timeRange: DateRange, libraryId?: string) {
    let query = this.supabase
      .from('stories')
      .select(`
        *,
        libraries!inner(owner)
      `)
      .eq('libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (libraryId) {
      query = query.eq('library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch story data: ${error.message}`);
    }

    return data || [];
  }

  private async getCharacterData(userId: string, timeRange: DateRange, libraryId?: string) {
    let query = this.supabase
      .from('characters')
      .select(`
        *,
        stories!inner(
          library_id,
          libraries!inner(owner)
        )
      `)
      .eq('stories.libraries.owner', userId)
      .gte('created_at', timeRange.start)
      .lte('created_at', timeRange.end);

    if (libraryId) {
      query = query.eq('stories.library_id', libraryId);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch character data: ${error.message}`);
    }

    return data || [];
  }

  private async analyzeSocialEngagement(
    interactions: any[], 
    emotions: any[], 
    stories: any[]
  ): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze sharing behavior
    const shareInteractions = interactions.filter(i => i.interaction_type === 'shared');
    const shareRate = shareInteractions.length / Math.max(interactions.length, 1);
    indicators.push({
      metric: 'story_sharing_rate',
      value: shareRate,
      threshold: 0.1,
      trend: this.calculateTrend(shareInteractions.map(i => new Date(i.created_at))),
      significance: shareRate > 0.1 ? 'high' : shareRate > 0.05 ? 'medium' : 'low'
    });

    // Analyze social themes in stories
    const socialThemes = this.countSocialThemes(stories);
    const socialThemeRate = socialThemes / Math.max(stories.length, 1);
    indicators.push({
      metric: 'social_theme_preference',
      value: socialThemeRate,
      threshold: 0.3,
      trend: 'stable', // Would need historical data for trend
      significance: socialThemeRate > 0.5 ? 'high' : socialThemeRate > 0.3 ? 'medium' : 'low'
    });

    // Analyze collaborative character creation
    const collaborativeCharacters = this.countCollaborativeCharacters(stories);
    const collaborationRate = collaborativeCharacters / Math.max(stories.length, 1);
    indicators.push({
      metric: 'collaborative_character_creation',
      value: collaborationRate,
      threshold: 0.2,
      trend: 'stable',
      significance: collaborationRate > 0.4 ? 'high' : collaborationRate > 0.2 ? 'medium' : 'low'
    });

    // Analyze positive emotional responses to social content
    const socialEmotions = emotions.filter(e => 
      e.context && (e.context.social_interaction || e.context.friendship_theme)
    );
    const positivesocialEmotions = socialEmotions.filter(e => e.mood === 'happy').length;
    const socialEmotionPositivity = positiveocialEmotions / Math.max(socialEmotions.length, 1);
    indicators.push({
      metric: 'social_emotional_positivity',
      value: socialEmotionPositivity,
      threshold: 0.6,
      trend: 'stable',
      significance: socialEmotionPositivity > 0.7 ? 'high' : socialEmotionPositivity > 0.5 ? 'medium' : 'low'
    });

    // Calculate overall confidence
    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.3 : ind.significance === 'medium' ? 0.2 : 0.1), 0);
    
    // Determine severity
    const concerningIndicators = indicators.filter(ind => ind.value < ind.threshold);
    const severity = concerningIndicators.length > 2 ? 'concerning' : concerningIndicators.length > 0 ? 'noteworthy' : 'normal';

    return {
      type: 'social_engagement',
      description: this.generateSocialEngagementDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateSocialEngagementRecommendations(indicators, severity)
    };
  }

  private async analyzeCreativityExpression(
    stories: any[], 
    characters: any[], 
    interactions: any[]
  ): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze story creation frequency
    const creationRate = stories.length / 30; // Stories per day over 30-day period
    indicators.push({
      metric: 'story_creation_frequency',
      value: creationRate,
      threshold: 0.1,
      trend: 'stable',
      significance: creationRate > 0.2 ? 'high' : creationRate > 0.1 ? 'medium' : 'low'
    });

    // Analyze character diversity
    const characterDiversity = this.calculateCharacterDiversity(characters);
    indicators.push({
      metric: 'character_diversity',
      value: characterDiversity,
      threshold: 0.5,
      trend: 'stable',
      significance: characterDiversity > 0.7 ? 'high' : characterDiversity > 0.5 ? 'medium' : 'low'
    });

    // Analyze story editing behavior (creativity refinement)
    const editInteractions = interactions.filter(i => i.interaction_type === 'edited');
    const editRate = editInteractions.length / Math.max(stories.length, 1);
    indicators.push({
      metric: 'story_refinement_rate',
      value: editRate,
      threshold: 0.3,
      trend: 'stable',
      significance: editRate > 0.5 ? 'high' : editRate > 0.3 ? 'medium' : 'low'
    });

    // Analyze unique theme exploration
    const uniqueThemes = this.countUniqueThemes(stories);
    const themeVariety = uniqueThemes / Math.max(stories.length, 1);
    indicators.push({
      metric: 'theme_variety',
      value: themeVariety,
      threshold: 0.6,
      trend: 'stable',
      significance: themeVariety > 0.8 ? 'high' : themeVariety > 0.6 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.25 : ind.significance === 'medium' ? 0.15 : 0.1), 0);
    const concerningIndicators = indicators.filter(ind => ind.value < ind.threshold);
    const severity = concerningIndicators.length > 2 ? 'concerning' : concerningIndicators.length > 0 ? 'noteworthy' : 'normal';

    return {
      type: 'creativity_expression',
      description: this.generateCreativityDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateCreativityRecommendations(indicators, severity)
    };
  }

  private async analyzeProblemSolving(interactions: any[], stories: any[]): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze choice-making in stories
    const choiceInteractions = interactions.filter(i => 
      i.interaction_data && i.interaction_data.choice_made
    );
    const choiceEngagement = choiceInteractions.length / Math.max(interactions.length, 1);
    indicators.push({
      metric: 'choice_engagement',
      value: choiceEngagement,
      threshold: 0.4,
      trend: 'stable',
      significance: choiceEngagement > 0.6 ? 'high' : choiceEngagement > 0.4 ? 'medium' : 'low'
    });

    // Analyze problem-solving themes in stories
    const problemSolvingThemes = this.countProblemSolvingThemes(stories);
    const problemSolvingRate = problemSolvingThemes / Math.max(stories.length, 1);
    indicators.push({
      metric: 'problem_solving_theme_preference',
      value: problemSolvingRate,
      threshold: 0.3,
      trend: 'stable',
      significance: problemSolvingRate > 0.5 ? 'high' : problemSolvingRate > 0.3 ? 'medium' : 'low'
    });

    // Analyze story completion rate (persistence)
    const completedStories = interactions.filter(i => i.interaction_type === 'completed');
    const completionRate = completedStories.length / Math.max(stories.length, 1);
    indicators.push({
      metric: 'story_completion_rate',
      value: completionRate,
      threshold: 0.7,
      trend: 'stable',
      significance: completionRate > 0.8 ? 'high' : completionRate > 0.7 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.33 : ind.significance === 'medium' ? 0.2 : 0.1), 0);
    const concerningIndicators = indicators.filter(ind => ind.value < ind.threshold);
    const severity = concerningIndicators.length > 1 ? 'concerning' : concerningIndicators.length > 0 ? 'noteworthy' : 'normal';

    return {
      type: 'problem_solving',
      description: this.generateProblemSolvingDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateProblemSolvingRecommendations(indicators, severity)
    };
  }

  private async analyzeEmotionalRegulation(emotions: any[], interactions: any[]): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze emotional stability
    const emotionalVariability = this.calculateEmotionalVariability(emotions);
    indicators.push({
      metric: 'emotional_stability',
      value: 1 - emotionalVariability, // Higher stability = lower variability
      threshold: 0.6,
      trend: 'stable',
      significance: emotionalVariability < 0.3 ? 'high' : emotionalVariability < 0.5 ? 'medium' : 'low'
    });

    // Analyze recovery from negative emotions
    const recoveryRate = this.calculateEmotionalRecoveryRate(emotions);
    indicators.push({
      metric: 'emotional_recovery_rate',
      value: recoveryRate,
      threshold: 0.7,
      trend: 'stable',
      significance: recoveryRate > 0.8 ? 'high' : recoveryRate > 0.7 ? 'medium' : 'low'
    });

    // Analyze engagement during different emotional states
    const engagementDuringNegativeEmotions = this.calculateEngagementDuringNegativeEmotions(emotions, interactions);
    indicators.push({
      metric: 'engagement_during_negative_emotions',
      value: engagementDuringNegativeEmotions,
      threshold: 0.5,
      trend: 'stable',
      significance: engagementDuringNegativeEmotions > 0.6 ? 'high' : engagementDuringNegativeEmotions > 0.5 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.33 : ind.significance === 'medium' ? 0.2 : 0.1), 0);
    const concerningIndicators = indicators.filter(ind => ind.value < ind.threshold);
    const severity = concerningIndicators.length > 1 ? 'concerning' : concerningIndicators.length > 0 ? 'noteworthy' : 'normal';

    return {
      type: 'emotional_regulation',
      description: this.generateEmotionalRegulationDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateEmotionalRegulationRecommendations(indicators, severity)
    };
  }

  private async analyzeAttentionPatterns(interactions: any[]): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze session duration consistency
    const sessionDurations = this.calculateSessionDurations(interactions);
    const attentionConsistency = this.calculateAttentionConsistency(sessionDurations);
    indicators.push({
      metric: 'attention_consistency',
      value: attentionConsistency,
      threshold: 0.6,
      trend: 'stable',
      significance: attentionConsistency > 0.7 ? 'high' : attentionConsistency > 0.6 ? 'medium' : 'low'
    });

    // Analyze interaction frequency within sessions
    const interactionDensity = this.calculateInteractionDensity(interactions);
    indicators.push({
      metric: 'interaction_density',
      value: interactionDensity,
      threshold: 0.5,
      trend: 'stable',
      significance: interactionDensity > 0.7 ? 'high' : interactionDensity > 0.5 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.5 : ind.significance === 'medium' ? 0.3 : 0.2), 0);
    const concerningIndicators = indicators.filter(ind => ind.value < ind.threshold);
    const severity = concerningIndicators.length > 0 ? 'noteworthy' : 'normal';

    return {
      type: 'attention_patterns',
      description: this.generateAttentionPatternsDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateAttentionPatternsRecommendations(indicators, severity)
    };
  }

  private async analyzeCommunicationStyle(interactions: any[], stories: any[]): Promise<BehavioralPattern> {
    // This would analyze communication patterns from transcripts and story content
    // For now, return a basic pattern
    return {
      type: 'communication_style',
      description: 'Communication style analysis requires transcript data',
      indicators: [],
      confidence: 0.1,
      timeframe: this.getDefaultTimeRange(),
      severity: 'normal',
      recommendations: []
    };
  }

  private async analyzeConflictResolution(stories: any[], interactions: any[]): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze conflict resolution themes in stories
    const conflictResolutionThemes = this.countConflictResolutionThemes(stories);
    const conflictResolutionRate = conflictResolutionThemes / Math.max(stories.length, 1);
    indicators.push({
      metric: 'conflict_resolution_theme_preference',
      value: conflictResolutionRate,
      threshold: 0.2,
      trend: 'stable',
      significance: conflictResolutionRate > 0.4 ? 'high' : conflictResolutionRate > 0.2 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 1 : ind.significance === 'medium' ? 0.6 : 0.3), 0);
    const severity = 'normal'; // Conflict resolution is generally positive

    return {
      type: 'conflict_resolution',
      description: this.generateConflictResolutionDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateConflictResolutionRecommendations(indicators, severity)
    };
  }

  private async analyzeEmpathyDevelopment(stories: any[], characters: any[], emotions: any[]): Promise<BehavioralPattern> {
    const indicators: BehavioralIndicator[] = [];
    
    // Analyze empathetic character traits
    const empatheticCharacters = this.countEmpatheticCharacters(characters);
    const empathyInCharacters = empatheticCharacters / Math.max(characters.length, 1);
    indicators.push({
      metric: 'empathetic_character_creation',
      value: empathyInCharacters,
      threshold: 0.3,
      trend: 'stable',
      significance: empathyInCharacters > 0.5 ? 'high' : empathyInCharacters > 0.3 ? 'medium' : 'low'
    });

    // Analyze empathy themes in stories
    const empathyThemes = this.countEmpathyThemes(stories);
    const empathyThemeRate = empathyThemes / Math.max(stories.length, 1);
    indicators.push({
      metric: 'empathy_theme_preference',
      value: empathyThemeRate,
      threshold: 0.25,
      trend: 'stable',
      significance: empathyThemeRate > 0.4 ? 'high' : empathyThemeRate > 0.25 ? 'medium' : 'low'
    });

    const confidence = indicators.reduce((sum, ind) => sum + (ind.significance === 'high' ? 0.5 : ind.significance === 'medium' ? 0.3 : 0.2), 0);
    const severity = 'normal'; // Empathy development is generally positive

    return {
      type: 'empathy_development',
      description: this.generateEmpathyDevelopmentDescription(indicators),
      indicators,
      confidence: Math.min(confidence, 1),
      timeframe: this.getDefaultTimeRange(),
      severity,
      recommendations: this.generateEmpathyDevelopmentRecommendations(indicators, severity)
    };
  }

  // Helper methods for analysis
  private calculateTrend(dates: Date[]): 'increasing' | 'stable' | 'decreasing' {
    if (dates.length < 2) return 'stable';
    
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const firstHalf = sortedDates.slice(0, Math.floor(sortedDates.length / 2));
    const secondHalf = sortedDates.slice(Math.floor(sortedDates.length / 2));
    
    if (secondHalf.length > firstHalf.length * 1.2) return 'increasing';
    if (firstHalf.length > secondHalf.length * 1.2) return 'decreasing';
    return 'stable';
  }

  private countSocialThemes(stories: any[]): number {
    const socialKeywords = ['friend', 'friendship', 'together', 'team', 'group', 'share', 'help', 'community'];
    let count = 0;
    
    for (const story of stories) {
      const content = JSON.stringify(story.content || {}).toLowerCase();
      for (const keyword of socialKeywords) {
        if (content.includes(keyword)) {
          count++;
          break; // Count each story only once
        }
      }
    }
    
    return count;
  }

  private countCollaborativeCharacters(stories: any[]): number {
    // This would analyze character traits for collaborative indicators
    // For now, return a simple count based on story content
    return stories.filter(story => 
      story.content && 
      story.content.theme && 
      story.content.theme.toLowerCase().includes('friend')
    ).length;
  }

  private calculateCharacterDiversity(characters: any[]): number {
    if (characters.length === 0) return 0;
    
    const uniqueTraits = new Set();
    for (const character of characters) {
      if (character.traits) {
        const traits = JSON.stringify(character.traits);
        uniqueTraits.add(traits);
      }
    }
    
    return uniqueTraits.size / characters.length;
  }

  private countUniqueThemes(stories: any[]): number {
    const themes = new Set();
    for (const story of stories) {
      if (story.content && story.content.theme) {
        themes.add(story.content.theme.toLowerCase());
      }
    }
    return themes.size;
  }

  private countProblemSolvingThemes(stories: any[]): number {
    const problemSolvingKeywords = ['solve', 'problem', 'challenge', 'overcome', 'figure out', 'solution', 'puzzle'];
    let count = 0;
    
    for (const story of stories) {
      const content = JSON.stringify(story.content || {}).toLowerCase();
      for (const keyword of problemSolvingKeywords) {
        if (content.includes(keyword)) {
          count++;
          break;
        }
      }
    }
    
    return count;
  }

  private calculateEmotionalVariability(emotions: any[]): number {
    if (emotions.length < 2) return 0;
    
    const moodValues = { happy: 1, neutral: 0, sad: -1, scared: -0.5, angry: -0.8 };
    const values = emotions.map(e => moodValues[e.mood as keyof typeof moodValues] || 0);
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private calculateEmotionalRecoveryRate(emotions: any[]): number {
    if (emotions.length < 2) return 1;
    
    let recoveries = 0;
    let negativeStates = 0;
    
    for (let i = 0; i < emotions.length - 1; i++) {
      const current = emotions[i];
      const next = emotions[i + 1];
      
      if (['sad', 'scared', 'angry'].includes(current.mood)) {
        negativeStates++;
        if (['happy', 'neutral'].includes(next.mood)) {
          recoveries++;
        }
      }
    }
    
    return negativeStates > 0 ? recoveries / negativeStates : 1;
  }

  private calculateEngagementDuringNegativeEmotions(emotions: any[], interactions: any[]): number {
    const negativeEmotionTimes = emotions
      .filter(e => ['sad', 'scared', 'angry'].includes(e.mood))
      .map(e => new Date(e.created_at));
    
    if (negativeEmotionTimes.length === 0) return 1;
    
    let engagedInteractions = 0;
    
    for (const interaction of interactions) {
      const interactionTime = new Date(interaction.created_at);
      const nearNegativeEmotion = negativeEmotionTimes.some(emotionTime => 
        Math.abs(interactionTime.getTime() - emotionTime.getTime()) < 3600000 // Within 1 hour
      );
      
      if (nearNegativeEmotion && ['created', 'completed', 'edited'].includes(interaction.interaction_type)) {
        engagedInteractions++;
      }
    }
    
    return engagedInteractions / negativeEmotionTimes.length;
  }

  private calculateSessionDurations(interactions: any[]): number[] {
    // Group interactions by session (simplified - would need actual session data)
    const sessionGroups = this.groupInteractionsBySession(interactions);
    const durations: number[] = [];
    
    for (const session of Object.values(sessionGroups)) {
      if (session.length > 1) {
        const start = new Date(session[0].created_at);
        const end = new Date(session[session.length - 1].created_at);
        durations.push((end.getTime() - start.getTime()) / 60000); // Duration in minutes
      }
    }
    
    return durations;
  }

  private groupInteractionsBySession(interactions: any[]): Record<string, any[]> {
    // Simplified session grouping - in reality would use actual session IDs
    const sessions: Record<string, any[]> = {};
    
    for (const interaction of interactions) {
      const sessionId = interaction.session_id || 'default';
      if (!sessions[sessionId]) {
        sessions[sessionId] = [];
      }
      sessions[sessionId].push(interaction);
    }
    
    return sessions;
  }

  private calculateAttentionConsistency(durations: number[]): number {
    if (durations.length < 2) return 1;
    
    const mean = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation relative to mean indicates higher consistency
    return Math.max(0, 1 - (standardDeviation / mean));
  }

  private calculateInteractionDensity(interactions: any[]): number {
    const sessions = this.groupInteractionsBySession(interactions);
    let totalDensity = 0;
    let sessionCount = 0;
    
    for (const session of Object.values(sessions)) {
      if (session.length > 1) {
        const start = new Date(session[0].created_at);
        const end = new Date(session[session.length - 1].created_at);
        const durationMinutes = (end.getTime() - start.getTime()) / 60000;
        
        if (durationMinutes > 0) {
          totalDensity += session.length / durationMinutes;
          sessionCount++;
        }
      }
    }
    
    return sessionCount > 0 ? totalDensity / sessionCount : 0;
  }

  private countConflictResolutionThemes(stories: any[]): number {
    const conflictKeywords = ['conflict', 'argument', 'disagree', 'fight', 'resolve', 'compromise', 'peace', 'forgive'];
    let count = 0;
    
    for (const story of stories) {
      const content = JSON.stringify(story.content || {}).toLowerCase();
      for (const keyword of conflictKeywords) {
        if (content.includes(keyword)) {
          count++;
          break;
        }
      }
    }
    
    return count;
  }

  private countEmpatheticCharacters(characters: any[]): number {
    const empathyKeywords = ['kind', 'caring', 'helpful', 'understanding', 'compassionate', 'gentle', 'supportive'];
    let count = 0;
    
    for (const character of characters) {
      const traits = JSON.stringify(character.traits || {}).toLowerCase();
      for (const keyword of empathyKeywords) {
        if (traits.includes(keyword)) {
          count++;
          break;
        }
      }
    }
    
    return count;
  }

  private countEmpathyThemes(stories: any[]): number {
    const empathyKeywords = ['empathy', 'understanding', 'feelings', 'emotions', 'care', 'help others', 'kindness'];
    let count = 0;
    
    for (const story of stories) {
      const content = JSON.stringify(story.content || {}).toLowerCase();
      for (const keyword of empathyKeywords) {
        if (content.includes(keyword)) {
          count++;
          break;
        }
      }
    }
    
    return count;
  }

  // Description generators
  private generateSocialEngagementDescription(indicators: BehavioralIndicator[]): string {
    const shareRate = indicators.find(i => i.metric === 'story_sharing_rate')?.value || 0;
    const socialThemes = indicators.find(i => i.metric === 'social_theme_preference')?.value || 0;
    
    if (shareRate > 0.1 && socialThemes > 0.3) {
      return 'Shows strong social engagement with frequent story sharing and preference for social themes';
    } else if (shareRate < 0.05 && socialThemes < 0.2) {
      return 'Shows limited social engagement with infrequent sharing and few social themes';
    } else {
      return 'Shows moderate social engagement with some sharing and social theme preferences';
    }
  }

  private generateCreativityDescription(indicators: BehavioralIndicator[]): string {
    const creationRate = indicators.find(i => i.metric === 'story_creation_frequency')?.value || 0;
    const diversity = indicators.find(i => i.metric === 'character_diversity')?.value || 0;
    
    if (creationRate > 0.2 && diversity > 0.7) {
      return 'Demonstrates high creativity with frequent story creation and diverse character development';
    } else if (creationRate < 0.1 && diversity < 0.5) {
      return 'Shows limited creative expression with infrequent story creation and repetitive patterns';
    } else {
      return 'Shows moderate creativity with some story creation and character variety';
    }
  }

  private generateProblemSolvingDescription(indicators: BehavioralIndicator[]): string {
    const choiceEngagement = indicators.find(i => i.metric === 'choice_engagement')?.value || 0;
    const completionRate = indicators.find(i => i.metric === 'story_completion_rate')?.value || 0;
    
    if (choiceEngagement > 0.6 && completionRate > 0.8) {
      return 'Shows strong problem-solving skills with high choice engagement and story completion';
    } else if (choiceEngagement < 0.4 && completionRate < 0.7) {
      return 'May need support with problem-solving and task persistence';
    } else {
      return 'Shows developing problem-solving abilities with moderate engagement';
    }
  }

  private generateEmotionalRegulationDescription(indicators: BehavioralIndicator[]): string {
    const stability = indicators.find(i => i.metric === 'emotional_stability')?.value || 0;
    const recovery = indicators.find(i => i.metric === 'emotional_recovery_rate')?.value || 0;
    
    if (stability > 0.6 && recovery > 0.8) {
      return 'Demonstrates good emotional regulation with stable moods and quick recovery';
    } else if (stability < 0.4 || recovery < 0.5) {
      return 'May benefit from emotional regulation support and coping strategies';
    } else {
      return 'Shows developing emotional regulation skills with room for improvement';
    }
  }

  private generateAttentionPatternsDescription(indicators: BehavioralIndicator[]): string {
    const consistency = indicators.find(i => i.metric === 'attention_consistency')?.value || 0;
    
    if (consistency > 0.7) {
      return 'Shows consistent attention patterns with stable engagement duration';
    } else if (consistency < 0.6) {
      return 'Shows variable attention patterns that may benefit from structured activities';
    } else {
      return 'Shows moderate attention consistency with some variability';
    }
  }

  private generateConflictResolutionDescription(indicators: BehavioralIndicator[]): string {
    const conflictThemes = indicators.find(i => i.metric === 'conflict_resolution_theme_preference')?.value || 0;
    
    if (conflictThemes > 0.4) {
      return 'Shows interest in conflict resolution themes and peaceful problem-solving';
    } else {
      return 'Limited exposure to conflict resolution themes in storytelling';
    }
  }

  private generateEmpathyDevelopmentDescription(indicators: BehavioralIndicator[]): string {
    const empatheticCharacters = indicators.find(i => i.metric === 'empathetic_character_creation')?.value || 0;
    const empathyThemes = indicators.find(i => i.metric === 'empathy_theme_preference')?.value || 0;
    
    if (empatheticCharacters > 0.5 && empathyThemes > 0.4) {
      return 'Shows strong empathy development with caring characters and empathetic themes';
    } else {
      return 'Shows developing empathy with some caring character traits and themes';
    }
  }

  // Recommendation generators
  private generateSocialEngagementRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];
    
    if (severity === 'concerning') {
      recommendations.push({
        action: 'Encourage collaborative storytelling activities',
        rationale: 'Low social engagement may benefit from structured social interaction',
        targetAudience: 'parent',
        urgency: 'high',
        followUpRequired: true
      });
    }
    
    return recommendations;
  }

  private generateCreativityRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];
    
    if (severity === 'concerning') {
      recommendations.push({
        action: 'Provide creative prompts and open-ended story starters',
        rationale: 'Limited creativity expression may benefit from structured creative activities',
        targetAudience: 'parent',
        urgency: 'medium',
        followUpRequired: false
      });
    }
    
    return recommendations;
  }

  private generateProblemSolvingRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];
    
    if (severity === 'concerning') {
      recommendations.push({
        action: 'Focus on stories with clear problem-solving elements and choices',
        rationale: 'Low problem-solving engagement may benefit from structured decision-making practice',
        targetAudience: 'child',
        urgency: 'medium',
        followUpRequired: true
      });
    }
    
    return recommendations;
  }

  private generateEmotionalRegulationRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];
    
    if (severity === 'concerning') {
      recommendations.push({
        action: 'Include emotional regulation themes and coping strategies in stories',
        rationale: 'Emotional regulation challenges may benefit from therapeutic storytelling',
        targetAudience: 'parent',
        urgency: 'high',
        followUpRequired: true
      });
    }
    
    return recommendations;
  }

  private generateAttentionPatternsRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    const recommendations: BehavioralRecommendation[] = [];
    
    if (severity === 'noteworthy') {
      recommendations.push({
        action: 'Adjust story length and complexity to match attention span',
        rationale: 'Variable attention patterns may benefit from personalized pacing',
        targetAudience: 'child',
        urgency: 'low',
        followUpRequired: false
      });
    }
    
    return recommendations;
  }

  private generateConflictResolutionRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    return [{
      action: 'Include more conflict resolution themes in future stories',
      rationale: 'Conflict resolution skills are important for social development',
      targetAudience: 'child',
      urgency: 'low',
      followUpRequired: false
    }];
  }

  private generateEmpathyDevelopmentRecommendations(indicators: BehavioralIndicator[], severity: string): BehavioralRecommendation[] {
    return [{
      action: 'Continue encouraging empathetic character development',
      rationale: 'Empathy development is progressing well and should be reinforced',
      targetAudience: 'child',
      urgency: 'low',
      followUpRequired: false
    }];
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
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Logger } from 'winston';
import { DailyCheckinService } from './services/DailyCheckinService';
import { EmotionDetectionService } from './services/EmotionDetectionService';
import { PatternAnalysisService } from './services/PatternAnalysisService';
import { VoicePatternAnalyzer, VoicePatternAnalysis } from './services/VoicePatternAnalyzer';
import { ResponseLatencyAnalyzer, ResponseLatencyData, EngagementMetrics, EngagementPattern } from './services/ResponseLatencyAnalyzer';
import { StoryChoicePatternAnalyzer, StoryChoice, ChoicePattern, EmotionalChoiceCorrelation } from './services/StoryChoicePatternAnalyzer';
import { LongitudinalTrendTracker, EmotionalTrendData } from './services/LongitudinalTrendTracker';
import { EarlyInterventionDetector, EarlyInterventionSignal, RiskAssessment } from './services/EarlyInterventionDetector';
import { MoodBasedStoryRecommendationEngine, StoryRecommendation, MoodBasedRecommendationContext, TherapeuticStoryPathway, EmotionalJourney } from './services/MoodBasedStoryRecommendationEngine';
import { CrisisEscalationProtocol, CrisisIndicator, CrisisResponse, SafetyPlan } from './services/CrisisEscalationProtocol';
import {
  DailyCheckinRequest,
  DailyCheckinResult,
  LaughterDetectionRequest,
  EmotionUpdateRequest,
  PatternAnalysisRequest,
  ParentalReport,
  StoryRecommendationInfluence,
  AudioData
} from './types';
import {
  Emotion,
  EmotionResult,
  EmotionPattern,
  SentimentResult,
  Mood,
  DateRange
} from '@alexa-multi-agent/shared-types';

export interface EmotionAgentConfig {
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl?: string;
  logLevel?: string;
}

export class EmotionAgent {
  private supabase: SupabaseClient;
  private redis?: RedisClientType;
  private logger: Logger;
  private dailyCheckinService: DailyCheckinService;
  private emotionDetectionService: EmotionDetectionService;
  private patternAnalysisService: PatternAnalysisService;
  private voicePatternAnalyzer: VoicePatternAnalyzer;
  private responseLatencyAnalyzer: ResponseLatencyAnalyzer;
  private storyChoicePatternAnalyzer: StoryChoicePatternAnalyzer;
  private longitudinalTrendTracker: LongitudinalTrendTracker;
  private earlyInterventionDetector: EarlyInterventionDetector;
  private moodBasedRecommendationEngine: MoodBasedStoryRecommendationEngine;
  private crisisEscalationProtocol: CrisisEscalationProtocol;

  constructor(config: EmotionAgentConfig, logger: Logger) {
    this.logger = logger;
    
    // Initialize Supabase client
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    
    // Initialize Redis client if URL provided (optional for Lambda)
    if (config.redisUrl && config.redisUrl !== 'redis://localhost:6379') {
      this.redis = createRedisClient({ url: config.redisUrl });
      this.redis.connect().catch(err => {
        this.logger.error('Failed to connect to Redis:', err);
        // Don't crash if Redis fails - it's optional for caching
      });
    } else {
      this.logger.info('Redis not configured or using localhost - running without cache');
    }

    // Initialize services
    this.dailyCheckinService = new DailyCheckinService(this.supabase, this.redis, this.logger);
    this.emotionDetectionService = new EmotionDetectionService(this.supabase, this.redis, this.logger);
    this.patternAnalysisService = new PatternAnalysisService(this.supabase, this.redis, this.logger);
    this.voicePatternAnalyzer = new VoicePatternAnalyzer(this.logger);
    this.responseLatencyAnalyzer = new ResponseLatencyAnalyzer(this.supabase, this.redis, this.logger);
    this.storyChoicePatternAnalyzer = new StoryChoicePatternAnalyzer(this.supabase, this.redis, this.logger);
    this.longitudinalTrendTracker = new LongitudinalTrendTracker(this.supabase, this.redis, this.logger);
    this.earlyInterventionDetector = new EarlyInterventionDetector(this.supabase, this.redis, this.logger);
    this.moodBasedRecommendationEngine = new MoodBasedStoryRecommendationEngine(this.supabase, this.redis, this.logger);
    this.crisisEscalationProtocol = new CrisisEscalationProtocol(this.supabase, this.redis, this.logger);
  }

  /**
   * Perform daily emotional check-in for a user
   * Requirements: 7.1, 7.2, 4.4
   */
  async performDailyCheckin(request: DailyCheckinRequest): Promise<DailyCheckinResult> {
    this.logger.info('Performing daily check-in', { 
      userId: request.userId, 
      libraryId: request.libraryId 
    });

    try {
      return await this.dailyCheckinService.performCheckin(request);
    } catch (error) {
      this.logger.error('Failed to perform daily check-in:', error);
      throw error;
    }
  }

  /**
   * Detect laughter from audio data during story sessions
   * Requirements: 7.2
   */
  async detectLaughter(request: LaughterDetectionRequest): Promise<EmotionResult> {
    this.logger.info('Detecting laughter from audio', { 
      userId: request.userId, 
      sessionId: request.sessionId 
    });

    try {
      return await this.emotionDetectionService.detectLaughter(request);
    } catch (error) {
      this.logger.error('Failed to detect laughter:', error);
      throw error;
    }
  }

  /**
   * Update user's emotional state when positive signals are detected
   * Requirements: 7.2, 7.4
   */
  async updateEmotionalState(request: EmotionUpdateRequest): Promise<Emotion> {
    this.logger.info('Updating emotional state', { 
      userId: request.userId, 
      mood: request.mood,
      confidence: request.confidence 
    });

    try {
      return await this.emotionDetectionService.updateEmotionalState(request);
    } catch (error) {
      this.logger.error('Failed to update emotional state:', error);
      throw error;
    }
  }

  /**
   * Analyze emotion patterns over time for a user
   * Requirements: 7.3, 7.4
   */
  async analyzeEmotionPatterns(request: PatternAnalysisRequest): Promise<EmotionPattern[]> {
    this.logger.info('Analyzing emotion patterns', { 
      userId: request.userId, 
      timeRange: request.timeRange 
    });

    try {
      return await this.patternAnalysisService.analyzePatterns(request);
    } catch (error) {
      this.logger.error('Failed to analyze emotion patterns:', error);
      throw error;
    }
  }

  /**
   * Generate parental report for child's emotional trends
   * Requirements: 7.3, 7.4
   */
  async generateParentalReport(userId: string, libraryId: string, timeRange: DateRange): Promise<ParentalReport> {
    this.logger.info('Generating parental report', { 
      userId, 
      libraryId, 
      timeRange 
    });

    try {
      return await this.patternAnalysisService.generateParentalReport(userId, libraryId, timeRange);
    } catch (error) {
      this.logger.error('Failed to generate parental report:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment from story interaction transcripts
   * Requirements: 7.3, 7.4
   */
  async analyzeSentiment(transcript: string): Promise<SentimentResult> {
    this.logger.info('Analyzing sentiment from transcript');

    try {
      return await this.emotionDetectionService.analyzeSentiment(transcript);
    } catch (error) {
      this.logger.error('Failed to analyze sentiment:', error);
      throw error;
    }
  }

  /**
   * Get story recommendation influence based on current emotional state
   * Requirements: 7.4
   */
  async getStoryRecommendationInfluence(userId: string, libraryId?: string): Promise<StoryRecommendationInfluence> {
    this.logger.info('Getting story recommendation influence', { userId, libraryId });

    try {
      return await this.patternAnalysisService.getStoryRecommendationInfluence(userId, libraryId);
    } catch (error) {
      this.logger.error('Failed to get story recommendation influence:', error);
      throw error;
    }
  }

  /**
   * Get recent emotions for a user (for internal use by other agents)
   */
  async getRecentEmotions(userId: string, libraryId?: string, limit: number = 10): Promise<Emotion[]> {
    this.logger.info('Getting recent emotions', { userId, libraryId, limit });

    try {
      let query = this.supabase
        .from('emotions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (libraryId) {
        query = query.eq('library_id', libraryId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get recent emotions:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed daily check-in today
   */
  async hasCompletedDailyCheckin(userId: string, libraryId?: string): Promise<boolean> {
    try {
      return await this.dailyCheckinService.hasCompletedToday(userId, libraryId);
    } catch (error) {
      this.logger.error('Failed to check daily check-in status:', error);
      throw error;
    }
  }

  /**
   * Clean up expired emotion data (called by scheduled job)
   */
  async cleanupExpiredData(): Promise<void> {
    this.logger.info('Cleaning up expired emotion data');

    try {
      const { error } = await this.supabase.rpc('cleanup_expired_data_enhanced');
      
      if (error) {
        throw error;
      }

      this.logger.info('Successfully cleaned up expired emotion data');
    } catch (error) {
      this.logger.error('Failed to cleanup expired data:', error);
      throw error;
    }
  }

  /**
   * Analyze voice patterns for sophisticated emotion detection
   * Requirements: 7.1, 7.2, 7.3
   */
  async analyzeVoicePatterns(audioData: AudioData): Promise<VoicePatternAnalysis> {
    this.logger.info('Analyzing voice patterns for emotion detection');

    try {
      return await this.voicePatternAnalyzer.analyzeVoicePatterns(audioData);
    } catch (error) {
      this.logger.error('Failed to analyze voice patterns:', error);
      throw error;
    }
  }

  /**
   * Record response latency for engagement analysis
   * Requirements: 7.1, 7.2
   */
  async recordResponseLatency(data: ResponseLatencyData): Promise<void> {
    this.logger.info('Recording response latency', { 
      userId: data.userId, 
      responseTime: data.responseTime 
    });

    try {
      await this.responseLatencyAnalyzer.recordResponseLatency(data);
    } catch (error) {
      this.logger.error('Failed to record response latency:', error);
      throw error;
    }
  }

  /**
   * Analyze engagement metrics for a user session
   * Requirements: 7.1, 7.2
   */
  async analyzeEngagementMetrics(userId: string, sessionId: string): Promise<EngagementMetrics> {
    this.logger.info('Analyzing engagement metrics', { userId, sessionId });

    try {
      return await this.responseLatencyAnalyzer.analyzeEngagementMetrics(userId, sessionId);
    } catch (error) {
      this.logger.error('Failed to analyze engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Analyze engagement patterns over time
   * Requirements: 7.1, 7.3
   */
  async analyzeEngagementPatterns(userId: string, timeRange: { start: string; end: string }): Promise<EngagementPattern[]> {
    this.logger.info('Analyzing engagement patterns', { userId, timeRange });

    try {
      return await this.responseLatencyAnalyzer.analyzeEngagementPatterns(userId, timeRange);
    } catch (error) {
      this.logger.error('Failed to analyze engagement patterns:', error);
      throw error;
    }
  }

  /**
   * Record story choice for pattern analysis
   * Requirements: 7.1, 7.2, 7.3
   */
  async recordStoryChoice(choice: StoryChoice): Promise<void> {
    this.logger.info('Recording story choice', { 
      userId: choice.userId, 
      choicePoint: choice.choicePoint 
    });

    try {
      await this.storyChoicePatternAnalyzer.recordStoryChoice(choice);
    } catch (error) {
      this.logger.error('Failed to record story choice:', error);
      throw error;
    }
  }

  /**
   * Analyze story choice patterns for developmental insights
   * Requirements: 7.1, 7.2, 7.3
   */
  async analyzeChoicePatterns(userId: string, timeRange?: { start: string; end: string }): Promise<ChoicePattern[]> {
    this.logger.info('Analyzing choice patterns', { userId, timeRange });

    try {
      return await this.storyChoicePatternAnalyzer.analyzeChoicePatterns(userId, timeRange);
    } catch (error) {
      this.logger.error('Failed to analyze choice patterns:', error);
      throw error;
    }
  }

  /**
   * Analyze emotional correlations with story choices
   * Requirements: 7.1, 7.2, 7.3
   */
  async analyzeEmotionalChoiceCorrelations(userId: string): Promise<EmotionalChoiceCorrelation[]> {
    this.logger.info('Analyzing emotional choice correlations', { userId });

    try {
      return await this.storyChoicePatternAnalyzer.analyzeEmotionalChoiceCorrelations(userId);
    } catch (error) {
      this.logger.error('Failed to analyze emotional choice correlations:', error);
      throw error;
    }
  }

  /**
   * Analyze longitudinal emotional trends
   * Requirements: 7.1, 7.2, 7.3
   */
  async analyzeLongitudinalTrends(userId: string, timeRange: DateRange): Promise<EmotionalTrendData> {
    this.logger.info('Analyzing longitudinal emotional trends', { userId, timeRange });

    try {
      return await this.longitudinalTrendTracker.analyzeEmotionalTrends(userId, timeRange);
    } catch (error) {
      this.logger.error('Failed to analyze longitudinal trends:', error);
      throw error;
    }
  }

  /**
   * Detect comprehensive intervention triggers from all analysis sources
   * Requirements: 7.1, 7.2, 7.3
   */
  async detectInterventionTriggers(userId: string, sessionId?: string): Promise<{
    interventionNeeded: boolean;
    triggers: Array<{
      source: 'latency' | 'choice_patterns' | 'voice_analysis' | 'longitudinal_trends';
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendations: string[];
    }>;
    overallRecommendations: string[];
  }> {
    this.logger.info('Detecting comprehensive intervention triggers', { userId, sessionId });

    try {
      const triggers = [];
      let interventionNeeded = false;
      const overallRecommendations: string[] = [];

      // Check latency-based triggers if session provided
      if (sessionId) {
        const latencyTrigger = await this.responseLatencyAnalyzer.detectInterventionTriggers(userId, sessionId);
        if (latencyTrigger.interventionNeeded) {
          interventionNeeded = true;
          triggers.push({
            source: 'latency' as const,
            type: latencyTrigger.triggerType,
            severity: latencyTrigger.severity,
            description: `Response latency indicates ${latencyTrigger.triggerType}`,
            recommendations: latencyTrigger.recommendations
          });
        }
      }

      // Check choice pattern triggers
      const choiceTrigger = await this.storyChoicePatternAnalyzer.detectChoiceBasedInterventionTriggers(userId);
      if (choiceTrigger.interventionNeeded) {
        interventionNeeded = true;
        triggers.push({
          source: 'choice_patterns' as const,
          type: choiceTrigger.triggerType,
          severity: choiceTrigger.severity,
          description: choiceTrigger.description,
          recommendations: choiceTrigger.recommendations
        });
      }

      // Check longitudinal triggers
      const longitudinalTriggers = await this.longitudinalTrendTracker.detectLongitudinalInterventionTriggers(userId);
      if (longitudinalTriggers.urgentTriggers.length > 0) {
        interventionNeeded = true;
        longitudinalTriggers.urgentTriggers.forEach(trigger => {
          triggers.push({
            source: 'longitudinal_trends' as const,
            type: trigger.type,
            severity: trigger.severity,
            description: trigger.description,
            recommendations: trigger.recommendations
          });
        });
      }

      // Compile overall recommendations
      const allRecommendations = triggers.flatMap(t => t.recommendations);
      overallRecommendations.push(...[...new Set(allRecommendations)]);

      // Add general recommendations if intervention needed
      if (interventionNeeded) {
        overallRecommendations.push('Consider consulting with child development specialist');
        overallRecommendations.push('Monitor emotional patterns more closely');
        overallRecommendations.push('Adjust storytelling approach based on detected needs');
      }

      return {
        interventionNeeded,
        triggers,
        overallRecommendations
      };

    } catch (error) {
      this.logger.error('Failed to detect intervention triggers:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive emotional intelligence report
   * Requirements: 7.1, 7.2, 7.3
   */
  async generateEmotionalIntelligenceReport(userId: string, timeRange: DateRange): Promise<{
    summary: {
      overallTrend: string;
      dominantMood: Mood;
      engagementLevel: string;
      developmentalInsights: string[];
    };
    voiceAnalysis: {
      emotionalMarkers: number;
      stressIndicators: number;
      confidenceLevel: number;
    };
    choicePatterns: ChoicePattern[];
    engagementMetrics: {
      averageResponseTime: number;
      attentionSpan: number;
      fatigueIndicators: number;
    };
    longitudinalTrends: EmotionalTrendData;
    interventionRecommendations: string[];
  }> {
    this.logger.info('Generating comprehensive emotional intelligence report', { userId, timeRange });

    try {
      // Gather all analysis data
      const longitudinalTrends = await this.analyzeLongitudinalTrends(userId, timeRange);
      const choicePatterns = await this.analyzeChoicePatterns(userId, timeRange);
      const recentEmotions = await this.getRecentEmotions(userId, undefined, 50);
      
      // Calculate summary metrics
      const moodCounts = recentEmotions.reduce((counts, emotion) => {
        counts[emotion.mood] = (counts[emotion.mood] || 0) + 1;
        return counts;
      }, {} as Record<Mood, number>);
      
      const dominantMood = Object.entries(moodCounts).reduce((a, b) => 
        moodCounts[a[0] as Mood] > moodCounts[b[0] as Mood] ? a : b
      )[0] as Mood;

      // Get recent engagement data
      const recentSessions = await this.getRecentSessionIds(userId, 10);
      let avgResponseTime = 0;
      let avgAttentionSpan = 0;
      let totalFatigueIndicators = 0;
      
      if (recentSessions.length > 0) {
        const engagementPromises = recentSessions.map(sessionId => 
          this.analyzeEngagementMetrics(userId, sessionId).catch(() => null)
        );
        const engagementResults = (await Promise.all(engagementPromises)).filter(Boolean);
        
        if (engagementResults.length > 0) {
          avgResponseTime = engagementResults.reduce((sum, result) => sum + result!.averageResponseTime, 0) / engagementResults.length;
          avgAttentionSpan = engagementResults.reduce((sum, result) => sum + result!.attentionSpan, 0) / engagementResults.length;
          totalFatigueIndicators = engagementResults.reduce((sum, result) => sum + result!.fatigueIndicators.length, 0);
        }
      }

      // Compile developmental insights
      const developmentalInsights = choicePatterns.flatMap(pattern => pattern.developmentalInsights);

      // Generate intervention recommendations
      const interventionTriggers = await this.detectInterventionTriggers(userId);

      return {
        summary: {
          overallTrend: longitudinalTrends.trendAnalysis.overallTrend,
          dominantMood,
          engagementLevel: avgResponseTime < 5000 ? 'high' : avgResponseTime < 8000 ? 'medium' : 'low',
          developmentalInsights: [...new Set(developmentalInsights)]
        },
        voiceAnalysis: {
          emotionalMarkers: 0, // Would be calculated from recent voice analysis
          stressIndicators: 0, // Would be calculated from recent voice analysis
          confidenceLevel: 0.7 // Would be calculated from recent voice analysis
        },
        choicePatterns,
        engagementMetrics: {
          averageResponseTime: avgResponseTime,
          attentionSpan: avgAttentionSpan,
          fatigueIndicators: totalFatigueIndicators
        },
        longitudinalTrends,
        interventionRecommendations: interventionTriggers.overallRecommendations
      };

    } catch (error) {
      this.logger.error('Failed to generate emotional intelligence report:', error);
      throw error;
    }
  }

  /**
   * Get recent session IDs for a user (helper method)
   */
  private async getRecentSessionIds(userId: string, limit: number = 10): Promise<string[]> {
    try {
      const { data, error } = await this.supabase
        .from('response_latency_data')
        .select('session_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return [...new Set(data?.map(d => d.session_id) || [])];
    } catch (error) {
      this.logger.error('Failed to get recent session IDs:', error);
      return [];
    }
  }

  /**
   * Detect early intervention signals for proactive support
   * Requirements: 7.3, 7.4
   */
  async detectEarlyInterventionSignals(userId: string): Promise<EarlyInterventionSignal[]> {
    this.logger.info('Detecting early intervention signals', { userId });

    try {
      return await this.earlyInterventionDetector.detectEarlyInterventionSignals(userId);
    } catch (error) {
      this.logger.error('Failed to detect early intervention signals:', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive risk assessment
   * Requirements: 7.3, 7.4
   */
  async performRiskAssessment(userId: string): Promise<RiskAssessment> {
    this.logger.info('Performing risk assessment', { userId });

    try {
      return await this.earlyInterventionDetector.performRiskAssessment(userId);
    } catch (error) {
      this.logger.error('Failed to perform risk assessment:', error);
      throw error;
    }
  }

  /**
   * Generate mood-based story recommendations
   * Requirements: 7.3, 7.4
   */
  async generateMoodBasedRecommendations(context: MoodBasedRecommendationContext): Promise<StoryRecommendation[]> {
    this.logger.info('Generating mood-based story recommendations', {
      currentMood: context.currentMood,
      emotionalGoal: context.emotionalGoal
    });

    try {
      return await this.moodBasedRecommendationEngine.generateMoodBasedRecommendations(context);
    } catch (error) {
      this.logger.error('Failed to generate mood-based recommendations:', error);
      throw error;
    }
  }

  /**
   * Create therapeutic story pathway for emotional support
   * Requirements: 7.3, 7.4
   */
  async createTherapeuticPathway(
    userId: string,
    targetEmotions: Mood[],
    currentEmotionalState: Mood,
    therapeuticGoals: string[]
  ): Promise<TherapeuticStoryPathway> {
    this.logger.info('Creating therapeutic story pathway', {
      userId,
      targetEmotions,
      currentEmotionalState,
      therapeuticGoals
    });

    try {
      return await this.moodBasedRecommendationEngine.createTherapeuticPathway(
        userId,
        targetEmotions,
        currentEmotionalState,
        therapeuticGoals
      );
    } catch (error) {
      this.logger.error('Failed to create therapeutic pathway:', error);
      throw error;
    }
  }

  /**
   * Start emotional journey for a user
   * Requirements: 7.3, 7.4
   */
  async startEmotionalJourney(userId: string, pathway: TherapeuticStoryPathway): Promise<EmotionalJourney> {
    this.logger.info('Starting emotional journey', { userId, pathwayName: pathway.pathwayName });

    try {
      return await this.moodBasedRecommendationEngine.startEmotionalJourney(userId, pathway);
    } catch (error) {
      this.logger.error('Failed to start emotional journey:', error);
      throw error;
    }
  }

  /**
   * Progress emotional journey to next step
   * Requirements: 7.3, 7.4
   */
  async progressEmotionalJourney(
    userId: string,
    emotionalResponse: Mood,
    engagementLevel: 'high' | 'medium' | 'low',
    sessionFeedback?: string
  ): Promise<{
    journey: EmotionalJourney;
    nextRecommendation: StoryRecommendation;
    adaptationsNeeded: boolean;
  }> {
    this.logger.info('Progressing emotional journey', { userId, emotionalResponse, engagementLevel });

    try {
      return await this.moodBasedRecommendationEngine.progressEmotionalJourney(
        userId,
        emotionalResponse,
        engagementLevel,
        sessionFeedback
      );
    } catch (error) {
      this.logger.error('Failed to progress emotional journey:', error);
      throw error;
    }
  }

  /**
   * Detect crisis indicators and execute response protocol
   * Requirements: 7.3, 7.4
   */
  async detectAndRespondToCrisis(
    userId: string,
    sessionId: string,
    analysisData: {
      voiceAnalysis?: any;
      textContent?: string;
      behavioralPatterns?: any;
      emotionalState?: Mood;
    },
    context: {
      userAge?: number;
      parentContactInfo?: any;
      previousIncidents?: any[];
      sessionDuration: number;
      timeOfDay: string;
    }
  ): Promise<{
    crisisDetected: boolean;
    crisisResponse?: CrisisResponse;
    immediateActions: string[];
  }> {
    this.logger.info('Detecting and responding to crisis indicators', { userId, sessionId });

    try {
      // Detect crisis indicators
      const indicators = await this.crisisEscalationProtocol.detectCrisisIndicators(
        userId,
        sessionId,
        analysisData
      );

      if (indicators.length === 0) {
        return {
          crisisDetected: false,
          immediateActions: []
        };
      }

      // Execute crisis response if indicators found
      const crisisContext = {
        sessionId,
        userId,
        userAge: context.userAge,
        parentContactInfo: context.parentContactInfo,
        previousIncidents: context.previousIncidents || [],
        currentEmotionalState: analysisData.emotionalState || 'neutral',
        sessionDuration: context.sessionDuration,
        timeOfDay: context.timeOfDay
      };

      const crisisResponse = await this.crisisEscalationProtocol.executeCrisisResponse(
        indicators,
        crisisContext
      );

      // Extract immediate actions
      const immediateActions = crisisResponse.escalationActions
        .filter(action => action.timeframe === 'immediate')
        .map(action => action.description);

      return {
        crisisDetected: true,
        crisisResponse,
        immediateActions
      };

    } catch (error) {
      this.logger.error('Failed to detect and respond to crisis:', error);
      throw error;
    }
  }

  /**
   * Create safety plan for user
   * Requirements: 7.3, 7.4
   */
  async createSafetyPlan(
    userId: string,
    crisisIndicators: CrisisIndicator[],
    userAge?: number
  ): Promise<SafetyPlan> {
    this.logger.info('Creating safety plan', { userId, userAge });

    try {
      return await this.crisisEscalationProtocol.createSafetyPlan(userId, crisisIndicators, userAge);
    } catch (error) {
      this.logger.error('Failed to create safety plan:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive predictive emotional support recommendations
   * Requirements: 7.3, 7.4
   */
  async generatePredictiveEmotionalSupport(userId: string): Promise<{
    earlyInterventionSignals: EarlyInterventionSignal[];
    riskAssessment: RiskAssessment;
    storyRecommendations: StoryRecommendation[];
    therapeuticPathway?: TherapeuticStoryPathway;
    predictiveInsights: any;
    supportPlan: {
      immediateActions: string[];
      shortTermGoals: string[];
      longTermObjectives: string[];
      monitoringPlan: string[];
    };
  }> {
    this.logger.info('Generating comprehensive predictive emotional support', { userId });

    try {
      // Detect early intervention signals
      const earlyInterventionSignals = await this.detectEarlyInterventionSignals(userId);

      // Perform risk assessment
      const riskAssessment = await this.performRiskAssessment(userId);

      // Get current emotional state for recommendations
      const recentEmotions = await this.getRecentEmotions(userId, undefined, 1);
      const currentMood = recentEmotions.length > 0 ? recentEmotions[0].mood : 'neutral';

      // Generate mood-based recommendations
      const recommendationContext: MoodBasedRecommendationContext = {
        currentMood,
        recentMoodHistory: recentEmotions.slice(0, 10).map(e => ({
          mood: e.mood as Mood,
          confidence: (e as any).confidence ?? 0.7,
          timestamp: (e as any).createdAt ?? new Date().toISOString(),
          context: (e as any).context?.type || 'unknown'
        })),
        emotionalGoal: riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical' 
          ? 'emotional_processing' : 'mood_improvement',
        sessionContext: {
          timeOfDay: this.getTimeOfDay(),
          sessionLength: 'medium',
          energyLevel: 'medium',
          attentionSpan: 10
        },
        userPreferences: {
          favoriteStoryTypes: [],
          preferredCharacterTraits: [],
          avoidedThemes: [],
          responseToTones: {},
          optimalSessionLength: 10
        }
      };

      const storyRecommendations = await this.generateMoodBasedRecommendations(recommendationContext);

      // Create therapeutic pathway if high risk
      let therapeuticPathway: TherapeuticStoryPathway | undefined;
      if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
        therapeuticPathway = await this.createTherapeuticPathway(
          userId,
          ['happy', 'neutral'],
          currentMood,
          ['emotional_regulation', 'mood_improvement', 'resilience_building']
        );
      }

      // Generate predictive insights
      const predictiveInsights = await this.earlyInterventionDetector.generatePredictiveInsights(userId);

      // Create support plan
      const supportPlan = this.createSupportPlan(
        earlyInterventionSignals,
        riskAssessment,
        storyRecommendations
      );

      return {
        earlyInterventionSignals,
        riskAssessment,
        storyRecommendations,
        therapeuticPathway,
        predictiveInsights,
        supportPlan
      };

    } catch (error) {
      this.logger.error('Failed to generate predictive emotional support:', error);
      throw error;
    }
  }

  /**
   * Helper method to create support plan
   */
  private createSupportPlan(
    signals: EarlyInterventionSignal[],
    riskAssessment: RiskAssessment,
    recommendations: StoryRecommendation[]
  ): {
    immediateActions: string[];
    shortTermGoals: string[];
    longTermObjectives: string[];
    monitoringPlan: string[];
  } {
    const immediateActions: string[] = [];
    const shortTermGoals: string[] = [];
    const longTermObjectives: string[] = [];
    const monitoringPlan: string[] = [];

    // Immediate actions based on signals
    signals.forEach(signal => {
      if (signal.severity === 'high' || signal.severity === 'critical') {
        immediateActions.push(...signal.recommendedActions);
      }
    });

    // Short-term goals based on risk assessment
    if (riskAssessment.overallRiskLevel === 'high' || riskAssessment.overallRiskLevel === 'critical') {
      shortTermGoals.push('Stabilize emotional state');
      shortTermGoals.push('Establish safety measures');
      shortTermGoals.push('Connect with professional support');
    } else if (riskAssessment.overallRiskLevel === 'medium') {
      shortTermGoals.push('Improve emotional regulation');
      shortTermGoals.push('Enhance coping strategies');
      shortTermGoals.push('Strengthen support network');
    }

    // Long-term objectives
    longTermObjectives.push('Build emotional resilience');
    longTermObjectives.push('Develop healthy coping mechanisms');
    longTermObjectives.push('Maintain emotional wellbeing');
    longTermObjectives.push('Foster positive relationships');

    // Monitoring plan
    monitoringPlan.push('Daily emotional check-ins');
    monitoringPlan.push('Weekly pattern analysis');
    monitoringPlan.push('Monthly risk assessment');
    monitoringPlan.push('Quarterly therapeutic pathway review');

    return {
      immediateActions: [...new Set(immediateActions)],
      shortTermGoals,
      longTermObjectives,
      monitoringPlan
    };
  }

  /**
   * Helper method to get current time of day
   */
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Close connections and cleanup resources
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
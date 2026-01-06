import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  PatternAnalysisRequest, 
  PatternAnalysisResult, 
  InsightsConfig,
  DateRange,
  AnalysisType,
  EmotionalPatternInsight,
  InterestPattern,
  BehavioralPattern,
  StoryPreferencePattern,
  ReadingHabitPattern,
  ExternalRecommendation,
  RecommendationFilter,
  ParentalNotification,
  NotificationType
} from './types';
import { PatternAnalysisService } from './services/PatternAnalysisService';
import { InterestDetectionService } from './services/InterestDetectionService';
import { BehavioralAnalysisService } from './services/BehavioralAnalysisService';
import { StoryPreferenceService } from './services/StoryPreferenceService';
import { ReadingHabitService } from './services/ReadingHabitService';
import { ExternalRecommendationService } from './services/ExternalRecommendationService';
import { Logger } from 'winston';

export class InsightsAgent {
  private supabase: SupabaseClient<Database>;
  private redis: RedisClientType;
  private patternAnalysisService: PatternAnalysisService;
  private interestDetectionService: InterestDetectionService;
  private behavioralAnalysisService: BehavioralAnalysisService;
  private storyPreferenceService: StoryPreferenceService;
  private readingHabitService: ReadingHabitService;
  private externalRecommendationService: ExternalRecommendationService;
  private logger: Logger;

  constructor(
    private config: InsightsConfig,
    logger?: Logger
  ) {
    this.supabase = createClient<Database>(
      config.database.url,
      config.database.apiKey
    );

    this.redis = createRedisClient({
      url: config.redis.url
    });

    // Initialize services
    this.patternAnalysisService = new PatternAnalysisService(this.supabase, this.redis, config);
    this.interestDetectionService = new InterestDetectionService(this.supabase, this.redis, config);
    this.behavioralAnalysisService = new BehavioralAnalysisService(this.supabase, this.redis, config);
    this.storyPreferenceService = new StoryPreferenceService(this.supabase, this.redis, config);
    this.readingHabitService = new ReadingHabitService(this.supabase, this.redis, config);
    this.externalRecommendationService = new ExternalRecommendationService(this.supabase, this.redis, config);

    this.logger = logger || this.createDefaultLogger();
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('InsightsAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize InsightsAgent:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      await this.redis.disconnect();
      this.logger.info('InsightsAgent shutdown successfully');
    } catch (error) {
      this.logger.error('Error during InsightsAgent shutdown:', error);
      throw error;
    }
  }

  /**
   * Main method to analyze patterns for a user
   */
  async analyzePatterns(request: PatternAnalysisRequest): Promise<PatternAnalysisResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info('Starting pattern analysis', { 
        userId: request.userId, 
        libraryId: request.libraryId,
        analysisTypes: request.analysisTypes 
      });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cachedResult = await this.getCachedResult(cacheKey);
      if (cachedResult) {
        this.logger.info('Returning cached pattern analysis result');
        return cachedResult;
      }

      // Validate user access
      await this.validateUserAccess(request.userId, request.libraryId);

      // Run analysis services in parallel
      const analysisPromises: Promise<any>[] = [];
      
      if (request.analysisTypes.includes('emotional')) {
        analysisPromises.push(
          this.patternAnalysisService.analyzeEmotionalPatterns(
            request.userId, 
            request.libraryId, 
            request.timeRange
          )
        );
      }

      if (request.analysisTypes.includes('interests')) {
        analysisPromises.push(
          this.interestDetectionService.detectInterests(
            request.userId, 
            request.libraryId, 
            request.timeRange
          )
        );
      }

      if (request.analysisTypes.includes('behavioral')) {
        analysisPromises.push(
          this.behavioralAnalysisService.analyzeBehavioralPatterns(
            request.userId, 
            request.libraryId, 
            request.timeRange
          )
        );
      }

      if (request.analysisTypes.includes('story_preferences')) {
        analysisPromises.push(
          this.storyPreferenceService.analyzeStoryPreferences(
            request.userId, 
            request.libraryId, 
            request.timeRange
          )
        );
      }

      if (request.analysisTypes.includes('reading_habits') && request.libraryId) {
        analysisPromises.push(
          this.readingHabitService.analyzeReadingHabits(
            request.userId, 
            request.libraryId, 
            request.timeRange
          )
        );
      }

      // Wait for all analyses to complete
      const results = await Promise.allSettled(analysisPromises);
      
      // Process results
      const result: PatternAnalysisResult = {
        userId: request.userId,
        libraryId: request.libraryId,
        timeRange: request.timeRange,
        emotionalPatterns: [],
        interestPatterns: [],
        behavioralPatterns: [],
        storyPreferences: [],
        readingHabits: [],
        confidence: 0,
        generatedAt: new Date().toISOString()
      };

      let successfulAnalyses = 0;
      let analysisIndex = 0;

      for (const analysisType of request.analysisTypes) {
        const analysisResult = results[analysisIndex];
        
        if (analysisResult.status === 'fulfilled') {
          successfulAnalyses++;
          
          switch (analysisType) {
            case 'emotional':
              result.emotionalPatterns = analysisResult.value as EmotionalPatternInsight[];
              break;
            case 'interests':
              result.interestPatterns = analysisResult.value as InterestPattern[];
              break;
            case 'behavioral':
              result.behavioralPatterns = analysisResult.value as BehavioralPattern[];
              break;
            case 'story_preferences':
              result.storyPreferences = analysisResult.value as StoryPreferencePattern[];
              break;
            case 'reading_habits':
              result.readingHabits = [analysisResult.value as ReadingHabitPattern];
              break;
          }
        } else {
          this.logger.error(`Analysis failed for ${analysisType}:`, analysisResult.reason);
        }
        
        analysisIndex++;
      }

      // Calculate overall confidence based on successful analyses
      result.confidence = successfulAnalyses / request.analysisTypes.length;

      // Cache the result
      await this.cacheResult(cacheKey, result);

      const duration = Date.now() - startTime;
      this.logger.info('Pattern analysis completed', { 
        userId: request.userId,
        duration,
        confidence: result.confidence,
        successfulAnalyses
      });

      return result;

    } catch (error) {
      this.logger.error('Pattern analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analysis for all supported types
   */
  async getComprehensiveAnalysis(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange
  ): Promise<PatternAnalysisResult> {
    const defaultTimeRange = timeRange || this.getDefaultTimeRange();
    
    const request: PatternAnalysisRequest = {
      userId,
      libraryId,
      timeRange: defaultTimeRange,
      analysisTypes: ['emotional', 'interests', 'behavioral', 'story_preferences', 'reading_habits']
    };

    return this.analyzePatterns(request);
  }

  /**
   * Get analysis for specific library (sub-library)
   */
  async getLibraryAnalysis(
    userId: string, 
    libraryId: string, 
    timeRange?: DateRange
  ): Promise<PatternAnalysisResult> {
    const defaultTimeRange = timeRange || this.getDefaultTimeRange();
    
    const request: PatternAnalysisRequest = {
      userId,
      libraryId,
      timeRange: defaultTimeRange,
      analysisTypes: ['emotional', 'interests', 'behavioral', 'story_preferences', 'reading_habits']
    };

    return this.analyzePatterns(request);
  }

  /**
   * Generate external recommendations based on detected interests
   */
  async generateExternalRecommendations(
    userId: string,
    interests: InterestPattern[],
    userAge?: number,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    try {
      this.logger.info('Generating external recommendations', { 
        userId, 
        interestCount: interests.length,
        userAge 
      });

      const recommendations = await this.externalRecommendationService.generateRecommendations(
        userId,
        interests,
        userAge,
        filter
      );

      this.logger.info('External recommendations generated', { 
        userId,
        recommendationCount: recommendations.length
      });

      return recommendations;

    } catch (error) {
      this.logger.error('Failed to generate external recommendations:', error);
      throw error;
    }
  }

  /**
   * Send parental notification about pattern discoveries
   */
  async sendParentalNotification(
    userId: string,
    libraryId: string,
    type: NotificationType,
    title: string,
    message: string,
    insights: string[],
    recommendations: string[],
    severity: 'info' | 'attention' | 'concern' | 'urgent' = 'info'
  ): Promise<void> {
    try {
      this.logger.info('Sending parental notification', { 
        userId, 
        libraryId,
        type,
        severity 
      });

      await this.externalRecommendationService.sendParentalNotification(
        userId,
        libraryId,
        type,
        title,
        message,
        insights,
        recommendations,
        severity
      );

      this.logger.info('Parental notification sent successfully', { 
        userId,
        type,
        severity
      });

    } catch (error) {
      this.logger.error('Failed to send parental notification:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive analysis with external recommendations
   */
  async getComprehensiveAnalysisWithRecommendations(
    userId: string, 
    libraryId?: string, 
    timeRange?: DateRange,
    recommendationFilter?: RecommendationFilter
  ): Promise<{
    analysis: PatternAnalysisResult;
    recommendations: ExternalRecommendation[];
  }> {
    try {
      // Get comprehensive analysis
      const analysis = await this.getComprehensiveAnalysis(userId, libraryId, timeRange);
      
      // Generate external recommendations based on interests
      const recommendations = await this.generateExternalRecommendations(
        userId,
        analysis.interestPatterns,
        undefined, // Will be fetched from database
        recommendationFilter
      );

      // Check for concerning patterns and send notifications if needed
      await this.checkForConcerningPatterns(userId, libraryId || '', analysis);

      return {
        analysis,
        recommendations
      };

    } catch (error) {
      this.logger.error('Failed to get comprehensive analysis with recommendations:', error);
      throw error;
    }
  }

  /**
   * Check for concerning patterns and send notifications
   */
  private async checkForConcerningPatterns(
    userId: string,
    libraryId: string,
    analysis: PatternAnalysisResult
  ): Promise<void> {
    const concerningPatterns: string[] = [];
    const recommendations: string[] = [];
    let maxSeverity: 'info' | 'attention' | 'concern' | 'urgent' = 'info';

    // Check emotional patterns for risk factors
    for (const emotionalPattern of analysis.emotionalPatterns) {
      for (const riskFactor of emotionalPattern.riskFactors) {
        if (riskFactor.requiresParentalNotification) {
          concerningPatterns.push(`${riskFactor.type}: ${riskFactor.severity} severity`);
          recommendations.push(...riskFactor.recommendations);
          
          // Update severity level
          if (riskFactor.severity === 'critical') maxSeverity = 'urgent';
          else if (riskFactor.severity === 'high' && maxSeverity !== 'urgent') maxSeverity = 'concern';
          else if (riskFactor.severity === 'medium' && !['urgent', 'concern'].includes(maxSeverity)) maxSeverity = 'attention';
        }
      }
    }

    // Check behavioral patterns for concerning trends
    for (const behavioralPattern of analysis.behavioralPatterns) {
      if (behavioralPattern.severity === 'concerning' || behavioralPattern.severity === 'urgent') {
        concerningPatterns.push(`${behavioralPattern.type}: ${behavioralPattern.description}`);
        recommendations.push(...behavioralPattern.recommendations.map(r => r.action));
        
        if (behavioralPattern.severity === 'urgent') maxSeverity = 'urgent';
        else if (behavioralPattern.severity === 'concerning' && maxSeverity !== 'urgent') maxSeverity = 'concern';
      }
    }

    // Send notification if there are concerning patterns
    if (concerningPatterns.length > 0) {
      const title = maxSeverity === 'urgent' 
        ? 'Urgent: Pattern Analysis Alert'
        : maxSeverity === 'concern'
        ? 'Important: Pattern Analysis Findings'
        : 'Pattern Analysis Update';

      const message = `We've detected some patterns in your child's storytelling activities that may benefit from your attention.`;

      await this.sendParentalNotification(
        userId,
        libraryId,
        'pattern_discovery',
        title,
        message,
        concerningPatterns,
        recommendations,
        maxSeverity
      );
    }
  }

  private async validateUserAccess(userId: string, libraryId?: string): Promise<void> {
    // Check if user exists
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userId}`);
    }

    // If libraryId is provided, check access
    if (libraryId) {
      const { data: hasAccess, error: accessError } = await this.supabase
        .rpc('check_library_permission', {
          lib_id: libraryId,
          required_role: 'Viewer'
        });

      if (accessError || !hasAccess) {
        throw new Error(`User ${userId} does not have access to library ${libraryId}`);
      }
    }
  }

  private generateCacheKey(request: PatternAnalysisRequest): string {
    const keyParts = [
      'insights',
      request.userId,
      request.libraryId || 'all',
      request.timeRange.start,
      request.timeRange.end,
      request.analysisTypes.sort().join(',')
    ];
    
    return `${this.config.redis.keyPrefix}:${keyParts.join(':')}`;
  }

  private async getCachedResult(cacheKey: string): Promise<PatternAnalysisResult | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Failed to get cached result:', error);
      return null;
    }
  }

  private async cacheResult(cacheKey: string, result: PatternAnalysisResult): Promise<void> {
    try {
      // Cache for 1 hour
      await this.redis.setEx(cacheKey, 3600, JSON.stringify(result));
    } catch (error) {
      this.logger.warn('Failed to cache result:', error);
    }
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

  private createDefaultLogger(): Logger {
    const winston = require('winston');
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }
}
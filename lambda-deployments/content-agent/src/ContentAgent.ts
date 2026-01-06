import OpenAI from 'openai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createClient as createRedisClient, RedisClientType } from 'redis';
import { StoryType, Story, Character } from '@alexa-multi-agent/shared-types';
import { 
  ContentAgentConfig, 
  StoryClassificationRequest, 
  StoryClassificationResult,
  ModerationRequest,
  ModerationResult,
  PromptTemplate,
  TherapeuticStoryRequest,
  TherapeuticStoryResult,
  PostStoryAnalysisRequest,
  PostStoryAnalysisResult,
  SupportSessionRequest,
  SupportSessionPlan
} from './types';
import { StoryTypeClassifier } from './services/StoryTypeClassifier';
import { PromptSelector } from './services/PromptSelector';
import { ContentModerator } from './services/ContentModerator';
import { PostStorySupportService } from './services/PostStorySupport';
import { CharacterGenerationService } from './services/CharacterGenerationService';
import { CharacterConversationManager } from './services/CharacterConversationManager';
import { CharacterDatabaseService } from './services/CharacterDatabaseService';
import { StoryCreationService } from './services/StoryCreationService';
import { StoryConversationManager } from './services/StoryConversationManager';
import { AssetGenerationPipeline, AssetGenerationPipelineConfig, AssetGenerationRequest, GeneratedAssets, AssetRegenerationRequest } from './services/AssetGenerationPipeline';
import { ConfirmationSystem, ConfirmationRequest, ConfirmationResult, ConfirmationRetraction } from './services/ConfirmationSystem';
import { AssetGenerationFailureHandler, AssetGenerationFailure, ProgressUpdate, AssetQualityValidation } from './services/AssetGenerationFailureHandler';
import { CharacterConsistencyManager, CharacterConsistencyCheck, CharacterChangeRequest, StoryAdaptationPlan, UserConfirmationProtocol } from './services/CharacterConsistencyManager';
import { ActivityGenerationService } from './services/ActivityGenerationService';
import { createLogger, Logger } from 'winston';

export class ContentAgent {
  private openai!: OpenAI;
  private supabase!: SupabaseClient;
  private redis!: RedisClientType;
  private logger!: Logger;
  private classifier!: StoryTypeClassifier;
  private promptSelector!: PromptSelector;
  private moderator!: ContentModerator;
  private postStorySupport!: PostStorySupportService;
  private characterGeneration!: CharacterGenerationService;
  private characterConversation!: CharacterConversationManager;
  private characterDatabase!: CharacterDatabaseService;
  private storyCreation!: StoryCreationService;
  private storyConversation!: StoryConversationManager;
  private assetPipeline!: AssetGenerationPipeline;
  private confirmationSystem!: ConfirmationSystem;
  private assetFailureHandler!: AssetGenerationFailureHandler;
  private characterConsistencyManager!: CharacterConsistencyManager;
  private activityGenerationService!: ActivityGenerationService;
  private config: ContentAgentConfig;

  constructor(config: ContentAgentConfig) {
    this.config = config;
    this.initializeLogger();
    this.initializeClients();
    this.initializeServices();
  }

  private initializeLogger(): void {
    this.logger = createLogger({
      level: this.config.logLevel,
      format: require('winston').format.combine(
        require('winston').format.timestamp(),
        require('winston').format.json()
      ),
      transports: [
        new (require('winston').transports.Console)()
      ]
    });
  }

  private initializeClients(): void {
    this.openai = new OpenAI({
      apiKey: this.config.openaiApiKey
    });

    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseKey
    );

    this.redis = createRedisClient({
      url: this.config.redisUrl
    });
  }

  private initializeServices(): void {
    this.classifier = new StoryTypeClassifier(this.openai, this.logger);
    this.promptSelector = new PromptSelector(this.logger);
    this.moderator = new ContentModerator(this.openai, this.logger, this.config.moderationEnabled);
    this.postStorySupport = new PostStorySupportService(this.openai, this.redis, this.logger);
    this.characterGeneration = new CharacterGenerationService(this.openai, this.logger);
    this.characterDatabase = new CharacterDatabaseService(this.supabase, this.logger);
    this.characterConversation = new CharacterConversationManager(this.redis, this.logger, this.characterGeneration, this.characterDatabase);
    this.storyCreation = new StoryCreationService(this.openai, this.logger);
    this.storyConversation = new StoryConversationManager(this.redis, this.logger, this.storyCreation);
    this.assetPipeline = new AssetGenerationPipeline(this.createAssetPipelineConfig());
    this.confirmationSystem = new ConfirmationSystem(this.openai, this.redis, this.logger);
    this.assetFailureHandler = new AssetGenerationFailureHandler(this.redis, this.logger);
    this.characterConsistencyManager = new CharacterConsistencyManager(this.openai, this.redis, this.logger);
    this.activityGenerationService = new ActivityGenerationService(
      this.config.supabaseUrl,
      this.config.supabaseKey,
      {} as any, // EventBridge client - will be initialized when needed
      this.redis,
      this.logger
    );
  }

  /**
   * Initialize the ContentAgent and connect to external services
   */
  async initialize(): Promise<void> {
    try {
      await this.redis.connect();
      this.logger.info('ContentAgent initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize ContentAgent', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Shutdown the ContentAgent and close connections
   */
  async shutdown(): Promise<void> {
    try {
      await this.redis.quit();
      this.logger.info('ContentAgent shutdown successfully');
    } catch (error) {
      this.logger.error('Error during ContentAgent shutdown', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Classify story intent from user input
   */
  async classifyStoryIntent(request: StoryClassificationRequest): Promise<StoryClassificationResult> {
    this.logger.info('Processing story classification request', { 
      userId: request.userId,
      sessionId: request.sessionId 
    });

    // Check cache first
    const cacheKey = `story_classification:${request.userId}:${Buffer.from(request.userInput).toString('base64')}`;
    const cached = await this.getCachedResult(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached classification result');
      return cached;
    }

    // Moderate user input first
    const moderationResult = await this.moderator.moderateContent({
      content: request.userInput,
      contentType: 'user_input',
      userAge: request.context?.userAge
    });

    if (!moderationResult.approved) {
      this.logger.warn('User input failed moderation', { 
        userId: request.userId,
        flaggedCategories: moderationResult.flaggedCategories 
      });
      
      // Return safe default classification
      return {
        storyType: 'Adventure',
        confidence: 0.5,
        reasoning: 'Default classification due to content moderation'
      };
    }

    // Classify the story type
    const result = await this.classifier.classifyStoryIntent(request);

    // Cache the result
    await this.cacheResult(cacheKey, result, 300); // Cache for 5 minutes

    return result;
  }

  /**
   * Route story type based on user intent with clarification handling
   */
  async routeStoryType(request: StoryClassificationRequest): Promise<{
    storyType: StoryType;
    shouldProceed: boolean;
    clarificationNeeded?: string;
  }> {
    return await this.classifier.routeStoryType(request);
  }

  /**
   * Select appropriate prompt template for story generation
   */
  selectPromptTemplate(storyType: StoryType, age: number): PromptTemplate {
    return this.promptSelector.selectPromptTemplate(storyType, age);
  }

  /**
   * Get age-appropriate content filtering constraints
   */
  getAgeAppropriateConstraints(age: number): string[] {
    return this.promptSelector.getAgeAppropriateConstraints(age);
  }

  /**
   * Moderate content for safety and appropriateness
   */
  async moderateContent(request: ModerationRequest): Promise<ModerationResult> {
    return await this.moderator.moderateContent(request);
  }

  /**
   * Batch moderate multiple pieces of content
   */
  async batchModerateContent(requests: ModerationRequest[]): Promise<ModerationResult[]> {
    return await this.moderator.batchModerate(requests);
  }

  /**
   * Get all available story types
   */
  getAvailableStoryTypes(): StoryType[] {
    return this.promptSelector.getAvailableStoryTypes();
  }

  /**
   * Get story type description for user clarification
   */
  getStoryTypeDescription(storyType: StoryType): string {
    return this.promptSelector.getStoryTypeDescription(storyType);
  }

  /**
   * Generate story type options for user selection
   */
  generateStoryTypeOptions(userAge?: number): Array<{
    type: StoryType;
    description: string;
    ageAppropriate: boolean;
  }> {
    const allTypes = this.getAvailableStoryTypes();
    
    return allTypes.map(type => ({
      type,
      description: this.getStoryTypeDescription(type),
      ageAppropriate: this.isStoryTypeAgeAppropriate(type, userAge || 5)
    }));
  }

  /**
   * Check if a story type is appropriate for a given age
   */
  private isStoryTypeAgeAppropriate(storyType: StoryType, age: number): boolean {
    // Define age restrictions for certain story types
    const ageRestrictions: Partial<Record<StoryType, number>> = {
      'Financial Literacy': 5, // Minimum age 5
      'Mental Health': 6, // Minimum age 6
      'Medical Bravery': 4, // Minimum age 4
      'Tech Readiness': 6 // Minimum age 6
    };

    const minAge = ageRestrictions[storyType];
    return minAge ? age >= minAge : true;
  }

  /**
   * Cache classification results
   */
  private async cacheResult(key: string, result: any, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setEx(key, ttlSeconds, JSON.stringify(result));
    } catch (error) {
      this.logger.warn('Failed to cache result', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get cached classification results
   */
  private async getCachedResult(key: string): Promise<any | null> {
    try {
      const cached = await this.redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      this.logger.warn('Failed to get cached result', { 
        key, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * Health check for the ContentAgent
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    services: {
      openai: boolean;
      supabase: boolean;
      redis: boolean;
    };
    timestamp: string;
  }> {
    const services = {
      openai: false,
      supabase: false,
      redis: false
    };

    try {
      // Test OpenAI connection
      await this.openai.models.list();
      services.openai = true;
    } catch (error) {
      this.logger.warn('OpenAI health check failed', { error });
    }

    try {
      // Test Supabase connection
      const { error } = await this.supabase.from('users').select('id').limit(1);
      services.supabase = !error;
    } catch (error) {
      this.logger.warn('Supabase health check failed', { error });
    }

    try {
      // Test Redis connection
      await this.redis.ping();
      services.redis = true;
    } catch (error) {
      this.logger.warn('Redis health check failed', { error });
    }

    const allHealthy = Object.values(services).every(status => status);

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Classify therapeutic story intent with enhanced context
   */
  async classifyTherapeuticStory(request: TherapeuticStoryRequest): Promise<TherapeuticStoryResult> {
    this.logger.info('Processing therapeutic story classification', { 
      userId: request.userId,
      therapeuticFocus: request.therapeuticFocus 
    });

    // Enhanced classification for therapeutic stories
    const baseResult = await this.classifyStoryIntent(request);
    
    // Determine audience and complexity
    const audience = this.determineStoryAudience(baseResult.storyType, request);
    const complexity = this.determineStoryComplexity(baseResult.storyType);
    
    // Generate safety considerations
    const safetyConsiderations = this.generateSafetyConsiderations(
      baseResult.storyType, 
      request.traumaHistory || [],
      request.currentEmotionalState
    );

    // Generate post-story support plan
    const postStorySupport = await this.generatePostStorySupport(
      baseResult.storyType,
      request.therapeuticFocus,
      request.currentEmotionalState
    );

    return {
      ...baseResult,
      audience,
      complexity,
      therapeuticFocus: request.therapeuticFocus,
      safetyConsiderations,
      postStorySupport
    };
  }

  /**
   * Analyze user's emotional state after story completion
   */
  async analyzePostStoryResponse(request: PostStoryAnalysisRequest): Promise<PostStoryAnalysisResult> {
    return await this.postStorySupport.analyzePostStoryState(request);
  }

  /**
   * Create a personalized support session
   */
  async createSupportSession(request: SupportSessionRequest): Promise<SupportSessionPlan> {
    return await this.postStorySupport.createSupportSession(request);
  }

  /**
   * Generate immediate support recommendations
   */
  async generateImmediateSupport(
    emotionalIntensity: number, 
    storyType: StoryType, 
    triggers: string[] = []
  ) {
    return {
      groundingTechniques: this.postStorySupport.generateImmediateGrounding(emotionalIntensity, triggers),
      visualizations: this.postStorySupport.generateVisualizations(storyType, 'processing'),
      affirmations: this.postStorySupport.generateAffirmations(storyType),
      urgencyLevel: emotionalIntensity >= 8 ? 'high' : emotionalIntensity >= 6 ? 'moderate' : 'low'
    };
  }

  /**
   * Enhanced story type options with therapeutic categories
   */
  generateEnhancedStoryTypeOptions(userAge?: number, therapeuticNeeds?: string[]) {
    const allTypes = this.getAvailableStoryTypes();
    
    return allTypes.map(type => {
      const isTherapeutic = ['Child Loss', 'Inner Child', 'New Birth'].includes(type);
      const audience = isTherapeutic ? 'adult' : 'child';
      const complexity = isTherapeutic ? 'therapeutic' : 'simple';
      
      return {
        type,
        description: this.getStoryTypeDescription(type),
        audience,
        complexity,
        ageAppropriate: this.isStoryTypeAgeAppropriate(type, userAge || 5),
        therapeuticMatch: therapeuticNeeds ? 
          this.assessTherapeuticMatch(type, therapeuticNeeds) : null,
        safetyLevel: this.getStorySafetyLevel(type),
        supportRequired: isTherapeutic
      };
    });
  }

  /**
   * Sanitize story content for permanent storage (removes PII and therapeutic details)
   */
  sanitizeStoryForStorage(storyContent: string, storyType: StoryType): {
    sanitizedContent: string;
    metadata: {
      storyType: string;
      wordCount: number;
      createdAt: string;
      containsTherapeuticElements: boolean;
    };
  } {
    return this.postStorySupport['dataRetention'].sanitizeStoryForStorage(storyContent, storyType);
  }

  /**
   * Purge all therapeutic data for a user session (GDPR compliance)
   */
  async purgeSessionTherapeuticData(sessionId: string, userId: string): Promise<void> {
    await this.postStorySupport['dataRetention'].purgeSessionData(sessionId, userId);
    this.logger.info('Session therapeutic data purged for privacy', { sessionId, userId });
  }

  /**
   * Purge all therapeutic data for a user (GDPR compliance)
   */
  async purgeUserTherapeuticData(userId: string): Promise<void> {
    await this.postStorySupport['dataRetention'].purgeUserTherapeuticData(userId);
    this.logger.info('User therapeutic data purged for privacy', { userId });
  }

  /**
   * Run scheduled cleanup of expired therapeutic data
   */
  async runTherapeuticDataCleanup(): Promise<{
    cleaned: number;
    errors: number;
  }> {
    const result = await this.postStorySupport['dataRetention'].runScheduledCleanup();
    this.logger.info('Therapeutic data cleanup completed', result);
    return result;
  }

  /**
   * Get therapeutic data retention statistics (for monitoring)
   */
  async getTherapeuticDataStats(): Promise<{
    totalEphemeralRecords: number;
    byDataType: Record<string, number>;
    oldestRecord: string | null;
    newestRecord: string | null;
  }> {
    return await this.postStorySupport['dataRetention'].getRetentionStats();
  }

  /**
   * Start a voice-driven character creation conversation
   */
  async startCharacterConversation(
    userId: string,
    libraryId: string,
    ageContext?: number
  ) {
    this.logger.info('Starting character conversation', { userId, libraryId, ageContext });
    return await this.characterConversation.startCharacterConversation(userId, libraryId, ageContext);
  }

  /**
   * Continue character creation conversation with user input
   */
  async continueCharacterConversation(
    sessionId: string,
    userInput: string,
    ageContext?: number
  ) {
    this.logger.info('Continuing character conversation', { sessionId, inputLength: userInput.length });
    return await this.characterConversation.continueCharacterConversation(sessionId, userInput, ageContext);
  }

  /**
   * Get character conversation session details
   */
  async getCharacterConversationSession(sessionId: string) {
    return await this.characterConversation.getConversationSession(sessionId);
  }

  /**
   * Get conversation history for a character creation session
   */
  async getCharacterConversationHistory(sessionId: string) {
    return await this.characterConversation.getConversationHistory(sessionId);
  }

  /**
   * Reset character conversation to a specific phase
   */
  async resetCharacterConversationPhase(sessionId: string, phase: any) {
    this.logger.info('Resetting character conversation phase', { sessionId, phase });
    return await this.characterConversation.resetConversationPhase(sessionId, phase);
  }

  /**
   * End character conversation session
   */
  async endCharacterConversationSession(sessionId: string) {
    this.logger.info('Ending character conversation session', { sessionId });
    await this.characterConversation.endConversationSession(sessionId);
  }

  /**
   * Get user's active character conversation sessions
   */
  async getUserCharacterConversations(userId: string) {
    return await this.characterConversation.getUserConversationSessions(userId);
  }

  /**
   * Get available character species options
   */
  getCharacterSpeciesOptions() {
    return this.characterGeneration.getSpeciesOptions();
  }

  /**
   * Get available inclusivity trait options
   */
  getCharacterInclusivityOptions() {
    return this.characterGeneration.getInclusivityOptions();
  }

  /**
   * Get character conversation statistics
   */
  async getCharacterConversationStats() {
    return await this.characterConversation.getConversationStats();
  }

  /**
   * Clean up expired character conversation sessions
   */
  async cleanupCharacterConversations() {
    const cleaned = await this.characterConversation.cleanupExpiredSessions();
    this.logger.info('Character conversation cleanup completed', { cleaned });
    return { cleaned };
  }

  /**
   * Create a character in a library
   */
  async createCharacter(
    libraryId: string,
    name: string,
    traits: any,
    artPrompt?: string
  ) {
    this.logger.info('Creating character', { libraryId, name });
    return await this.characterDatabase.createCharacter({
      libraryId,
      name,
      traits,
      artPrompt
    });
  }

  /**
   * Get a character by ID
   */
  async getCharacter(characterId: string) {
    return await this.characterDatabase.getCharacter(characterId);
  }

  /**
   * Update a character
   */
  async updateCharacter(
    characterId: string,
    updates: {
      name?: string;
      traits?: any;
      artPrompt?: string;
      appearanceUrl?: string;
    }
  ) {
    this.logger.info('Updating character', { characterId, updates: Object.keys(updates) });
    return await this.characterDatabase.updateCharacter({
      characterId,
      ...updates
    });
  }

  /**
   * Delete a character
   */
  async deleteCharacter(characterId: string) {
    this.logger.info('Deleting character', { characterId });
    return await this.characterDatabase.deleteCharacter(characterId);
  }

  /**
   * Get all characters in a library
   */
  async getLibraryCharacters(libraryId: string) {
    return await this.characterDatabase.getLibraryCharacters(libraryId);
  }

  /**
   * Search characters with filters
   */
  async searchCharacters(options: {
    libraryId: string;
    species?: string;
    ageRange?: { min: number; max: number };
    hasInclusivityTraits?: boolean;
    limit?: number;
    offset?: number;
  }) {
    return await this.characterDatabase.searchCharacters(options);
  }

  /**
   * Check if character name is unique in library
   */
  async isCharacterNameUnique(libraryId: string, name: string, excludeCharacterId?: string) {
    return await this.characterDatabase.isCharacterNameUnique(libraryId, name, excludeCharacterId);
  }

  /**
   * Get character statistics for a library
   */
  async getLibraryCharacterStats(libraryId: string) {
    return await this.characterDatabase.getLibraryCharacterStats(libraryId);
  }

  /**
   * Validate character for age-appropriateness and completeness
   */
  async validateCharacter(traits: any, ageContext?: number) {
    return await this.characterGeneration.validateCharacter(traits, ageContext);
  }

  /**
   * Create character from conversation traits
   */
  async createCharacterFromConversation(
    traits: any,
    libraryId: string,
    userId: string
  ) {
    this.logger.info('Creating character from conversation', { libraryId, userId });
    
    // Generate character using the generation service
    const character = await this.characterGeneration.createCharacterFromTraits(
      traits,
      libraryId,
      userId
    );

    // Save to database
    const savedCharacter = await this.characterDatabase.createCharacter({
      libraryId,
      name: character.name,
      traits: character.traits,
      artPrompt: character.artPrompt
    });

    this.logger.info('Character created from conversation and saved', {
      characterId: savedCharacter.id,
      libraryId,
      name: savedCharacter.name
    });

    return savedCharacter;
  }

  /**
   * Start a voice-driven story creation conversation
   */
  async startStoryConversation(
    userId: string,
    libraryId: string,
    characterId: string,
    storyType: StoryType,
    ageContext?: number
  ) {
    this.logger.info('Starting story conversation', { 
      userId, 
      libraryId, 
      characterId, 
      storyType 
    });
    return await this.storyConversation.startStoryConversation(
      userId,
      libraryId,
      characterId,
      storyType,
      ageContext
    );
  }

  /**
   * Continue story creation conversation with user input
   */
  async continueStoryConversation(
    sessionId: string,
    userInput: string,
    ageContext?: number
  ) {
    this.logger.info('Continuing story conversation', { 
      sessionId, 
      inputLength: userInput.length 
    });
    return await this.storyConversation.continueStoryConversation(
      sessionId,
      userInput,
      ageContext
    );
  }

  /**
   * Create a story draft with hero's journey structure
   */
  async createStoryDraft(request: {
    characterId: string;
    storyType: StoryType;
    userAge?: number;
    preferences?: {
      mood?: any;
      themes?: string[];
      avoidTopics?: string[];
    };
  }) {
    this.logger.info('Creating story draft', { 
      characterId: request.characterId,
      storyType: request.storyType 
    });
    return await this.storyCreation.createStoryDraft(request);
  }

  /**
   * Continue story with user choice in choose-your-adventure style
   */
  async continueStoryBeat(request: {
    storyId: string;
    userChoice?: string;
    voiceInput?: string;
  }) {
    this.logger.info('Continuing story beat', { storyId: request.storyId });
    return await this.storyCreation.continueStoryBeat(request);
  }

  /**
   * Edit story via voice commands
   */
  async editStoryViaVoice(request: {
    storyId: string;
    voiceCommand: string;
    targetBeat?: number;
  }) {
    this.logger.info('Editing story via voice', { 
      storyId: request.storyId,
      command: request.voiceCommand 
    });
    return await this.storyCreation.editStoryViaVoice(request);
  }

  /**
   * Adapt story for character changes mid-story
   */
  async adaptStoryForCharacterChange(
    storyId: string,
    characterChanges: any
  ) {
    this.logger.info('Adapting story for character changes', { 
      storyId,
      changes: Object.keys(characterChanges) 
    });
    return await this.storyCreation.adaptStoryForCharacterChange(
      storyId,
      characterChanges
    );
  }

  /**
   * Finalize story and prepare for asset generation
   */
  async finalizeStory(storyId: string, confirmed: boolean) {
    this.logger.info('Finalizing story', { storyId, confirmed });
    return await this.storyCreation.finalizeStory(storyId, confirmed);
  }

  /**
   * Get story conversation session details
   */
  async getStoryConversationSession(sessionId: string) {
    return await this.storyConversation.getConversationSession(sessionId);
  }

  /**
   * Get story conversation history
   */
  async getStoryConversationHistory(sessionId: string) {
    return await this.storyConversation.getConversationHistory(sessionId);
  }

  /**
   * End story conversation session
   */
  async endStoryConversationSession(sessionId: string) {
    this.logger.info('Ending story conversation session', { sessionId });
    await this.storyConversation.endConversationSession(sessionId);
  }

  /**
   * Get user's active story conversation sessions
   */
  async getUserStoryConversations(userId: string) {
    return await this.storyConversation.getUserConversationSessions(userId);
  }

  /**
   * Get story conversation statistics
   */
  async getStoryConversationStats() {
    return await this.storyConversation.getConversationStats();
  }

  /**
   * Clean up expired story conversation sessions
   */
  async cleanupStoryConversations() {
    const cleaned = await this.storyConversation.cleanupExpiredSessions();
    this.logger.info('Story conversation cleanup completed', { cleaned });
    return { cleaned };
  }

  /**
   * Get metrics for monitoring including therapeutic stories
   */
  async getMetrics(): Promise<{
    classificationsToday: number;
    therapeuticStoriesCreated: number;
    supportSessionsProvided: number;
    crisisInterventions: number;
    moderationsToday: number;
    cacheHitRate: number;
    averageResponseTime: number;
    therapeuticDataStats: {
      totalEphemeralRecords: number;
      byDataType: Record<string, number>;
    };
  }> {
    const therapeuticStats = await this.getTherapeuticDataStats();
    
    // This would typically pull from a metrics store
    // For now, returning mock data with real therapeutic stats
    return {
      classificationsToday: 0,
      therapeuticStoriesCreated: 0,
      supportSessionsProvided: 0,
      crisisInterventions: 0,
      moderationsToday: 0,
      cacheHitRate: 0.85,
      averageResponseTime: 250,
      therapeuticDataStats: {
        totalEphemeralRecords: therapeuticStats.totalEphemeralRecords,
        byDataType: therapeuticStats.byDataType
      }
    };
  }

  // ===== CONFIRMATION AND EDGE CASE HANDLING METHODS =====

  /**
   * Process sophisticated user confirmation with ambiguity detection
   */
  async processConfirmation(request: ConfirmationRequest): Promise<ConfirmationResult> {
    this.logger.info('Processing user confirmation', {
      sessionId: request.sessionId,
      confirmationType: request.confirmationType
    });
    return await this.confirmationSystem.processConfirmation(request);
  }

  /**
   * Handle partial confirmations with intelligent completion
   */
  async handlePartialConfirmation(
    sessionId: string,
    partialResult: ConfirmationResult,
    context: any
  ): Promise<{
    completionSuggestion: string;
    missingElements: string[];
    proceedWithPartial: boolean;
    clarificationPrompt: string;
  }> {
    this.logger.info('Handling partial confirmation', { sessionId });
    return await this.confirmationSystem.handlePartialConfirmation(sessionId, partialResult, context);
  }

  /**
   * Handle confirmation retraction with graceful story updates
   */
  async handleConfirmationRetraction(retraction: ConfirmationRetraction): Promise<{
    rollbackPlan: any;
    userNotification: string;
    alternativeOptions: string[];
  }> {
    this.logger.info('Handling confirmation retraction', { sessionId: retraction.sessionId });
    return await this.confirmationSystem.handleConfirmationRetraction(retraction);
  }

  /**
   * Create context-aware confirmation interpretation
   */
  async createContextAwareInterpretation(
    userInput: string,
    context: any
  ): Promise<{
    interpretation: string;
    confidence: number;
    contextFactors: string[];
    ageAdjustments: string[];
  }> {
    return await this.confirmationSystem.createContextAwareInterpretation(userInput, context);
  }

  /**
   * Generate assets with progressive updates and failure handling
   */
  async generateAssetsWithProgressUpdates(
    request: AssetGenerationRequest,
    updateCallback: (update: ProgressUpdate) => Promise<void>
  ): Promise<GeneratedAssets> {
    this.logger.info('Generating assets with progress updates', {
      storyId: request.story.id,
      assetTypes: request.assetTypes
    });
    return await this.assetFailureHandler.generateWithProgressUpdates(request, updateCallback);
  }

  /**
   * Handle asset generation failure with intelligent fallback
   */
  async handleAssetGenerationFailure(failure: AssetGenerationFailure): Promise<{
    fallbackAsset?: any;
    userNotification: any;
    retryRecommended: boolean;
    fallbackStrategy: string;
  }> {
    this.logger.info('Handling asset generation failure', {
      assetType: failure.assetType,
      retryCount: failure.retryCount
    });
    return await this.assetFailureHandler.handleGenerationFailure(failure);
  }

  /**
   * Regenerate asset based on user feedback
   */
  async regenerateAssetWithUserFeedback(
    originalAsset: any,
    assetType: any,
    userFeedback: string,
    context: {
      storyId: string;
      characterId: string;
      sessionId: string;
    }
  ): Promise<{
    regeneratedAsset: any;
    improvementsMade: string[];
    userNotification: any;
  }> {
    this.logger.info('Regenerating asset with user feedback', {
      assetType,
      storyId: context.storyId
    });
    return await this.assetFailureHandler.regenerateAssetWithUserFeedback(
      originalAsset,
      assetType,
      userFeedback,
      context
    );
  }

  /**
   * Validate asset quality with comprehensive checks
   */
  async validateAssetQuality(asset: any, assetType: any): Promise<AssetQualityValidation> {
    return await this.assetFailureHandler.validateAssetQuality(asset, assetType);
  }

  /**
   * Create user notification for asset generation issues
   */
  createAssetUserNotification(
    sessionId: string,
    type: any,
    assetType: any,
    issue?: string
  ): any {
    return this.assetFailureHandler.createUserNotification(sessionId, type, assetType, issue);
  }

  /**
   * Detect character inconsistencies across story progression
   */
  async detectCharacterInconsistencies(
    characterId: string,
    storyId: string,
    currentTraits: any,
    storyProgression: any[]
  ): Promise<CharacterConsistencyCheck> {
    this.logger.info('Detecting character inconsistencies', {
      characterId,
      storyId,
      totalBeats: storyProgression.length
    });
    return await this.characterConsistencyManager.detectCharacterInconsistencies(
      characterId,
      storyId,
      currentTraits,
      storyProgression
    );
  }

  /**
   * Handle intelligent character change reconciliation
   */
  async reconcileCharacterChanges(
    changeRequest: CharacterChangeRequest,
    currentConsistencyCheck: CharacterConsistencyCheck
  ): Promise<{
    reconciliationPlan: any;
    userConfirmationNeeded: boolean;
    automaticFixes: any[];
    manualReviewRequired: any[];
  }> {
    this.logger.info('Reconciling character changes', {
      characterId: changeRequest.characterId,
      changeType: changeRequest.changeType
    });
    return await this.characterConsistencyManager.reconcileCharacterChanges(
      changeRequest,
      currentConsistencyCheck
    );
  }

  /**
   * Create story adaptation plan for mid-story character modifications
   */
  async createStoryAdaptationPlan(
    characterChanges: CharacterChangeRequest[],
    storyProgression: any[]
  ): Promise<StoryAdaptationPlan> {
    this.logger.info('Creating story adaptation plan', {
      characterChanges: characterChanges.length,
      storyBeats: storyProgression.length
    });
    return await this.characterConsistencyManager.createStoryAdaptationPlan(
      characterChanges,
      storyProgression
    );
  }

  /**
   * Maintain narrative consistency during character changes
   */
  async maintainNarrativeConsistency(
    adaptationPlan: StoryAdaptationPlan,
    userPreferences?: any
  ): Promise<{
    updatedStoryBeats: any[];
    consistencyReport: any;
    userNotifications: string[];
  }> {
    this.logger.info('Maintaining narrative consistency', {
      storyId: adaptationPlan.storyId,
      affectedBeats: adaptationPlan.affectedBeats.length
    });
    return await this.characterConsistencyManager.maintainNarrativeConsistency(
      adaptationPlan,
      userPreferences
    );
  }

  /**
   * Create user confirmation protocols for character changes
   */
  async createUserConfirmationProtocol(
    changeRequest: CharacterChangeRequest,
    impactAssessment: any
  ): Promise<UserConfirmationProtocol> {
    this.logger.info('Creating user confirmation protocol', {
      characterId: changeRequest.characterId,
      changeType: changeRequest.changeType
    });
    return await this.characterConsistencyManager.createUserConfirmationProtocol(
      changeRequest,
      impactAssessment
    );
  }

  // Activity Generation Integration
  async generateActivities(request: any): Promise<any> {
    try {
      return await this.activityGenerationService.generateActivities(request);
    } catch (error) {
      this.logger.error('Error generating activities', {
        storyId: request.storyId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Private helper methods for therapeutic story support
  private determineStoryAudience(storyType: StoryType, request: TherapeuticStoryRequest): 'child' | 'adult' | 'family' {
    const therapeuticTypes = ['Child Loss', 'Inner Child', 'New Birth'];
    if (therapeuticTypes.includes(storyType)) {
      return 'adult';
    }
    
    // Check if it's a family story (adult processing for child's benefit)
    if (request.relationshipContext?.includes('parent') || request.relationshipContext?.includes('family')) {
      return 'family';
    }
    
    return 'child';
  }

  private determineStoryComplexity(storyType: StoryType): 'simple' | 'therapeutic' | 'advanced' {
    const therapeuticTypes = ['Child Loss', 'Inner Child', 'New Birth'];
    if (therapeuticTypes.includes(storyType)) {
      return 'therapeutic';
    }
    
    const complexTypes = ['Mental Health', 'Medical Bravery'];
    if (complexTypes.includes(storyType)) {
      return 'advanced';
    }
    
    return 'simple';
  }

  private generateSafetyConsiderations(
    storyType: StoryType, 
    traumaHistory: string[], 
    emotionalState?: string
  ): string[] {
    const considerations: string[] = [];
    
    if (storyType === 'Child Loss') {
      considerations.push(
        'This story deals with themes of loss and grief',
        'Professional support may be beneficial',
        'Take breaks if you feel overwhelmed',
        'Have support resources available'
      );
    }
    
    if (storyType === 'Inner Child') {
      considerations.push(
        'This story may bring up childhood memories',
        'Emotional responses are normal and healthy',
        'Practice self-compassion throughout',
        'Consider professional guidance for deep trauma'
      );
    }
    
    if (traumaHistory.length > 0) {
      considerations.push(
        'Be aware of potential triggers',
        'Use grounding techniques if needed',
        'Stop if you feel unsafe or overwhelmed'
      );
    }
    
    if (emotionalState === 'vulnerable' || emotionalState === 'crisis') {
      considerations.push(
        'Consider postponing until you feel more stable',
        'Have crisis support resources available',
        'Consider professional support first'
      );
    }
    
    return considerations;
  }

  private async generatePostStorySupport(
    storyType: StoryType,
    therapeuticFocus?: string,
    emotionalState?: string
  ) {
    // Generate appropriate post-story support based on story type
    const support = {
      emotionalState: {
        primary: {
          emotion: emotionalState || 'processing',
          intensity: 5,
          duration: 'lingering' as const
        },
        stabilityLevel: 'processing' as const
      },
      recommendedActions: [],
      visualizations: this.postStorySupport.generateVisualizations(storyType, emotionalState || 'processing'),
      affirmations: this.postStorySupport.generateAffirmations(storyType, therapeuticFocus),
      groundingTechniques: this.postStorySupport.generateImmediateGrounding(5, []),
      followUpPrompts: [
        'How are you feeling after this story?',
        'What resonated most with you?',
        'What do you need right now?'
      ]
    };

    return support;
  }

  private assessTherapeuticMatch(storyType: StoryType, therapeuticNeeds: string[]): number {
    // Simple matching algorithm - would be more sophisticated in real implementation
    const storyThemes = this.getStoryTypeDescription(storyType);
    let matchScore = 0;
    
    therapeuticNeeds.forEach(need => {
      if (storyThemes.toLowerCase().includes(need.toLowerCase())) {
        matchScore += 0.2;
      }
    });
    
    return Math.min(matchScore, 1.0);
  }

  private getStorySafetyLevel(storyType: StoryType): 'low' | 'medium' | 'high' {
    const highRiskTypes = ['Mental Health', 'Medical Bravery'];
    const mediumRiskTypes = ['Milestones', 'New Chapter Sequel'];
    
    if (highRiskTypes.includes(storyType)) return 'high';
    if (mediumRiskTypes.includes(storyType)) return 'medium';
    return 'low';
  }

  private createAssetPipelineConfig(): AssetGenerationPipelineConfig {
    // Lazy Polly client instance cached across synthesize calls
    let pollyClientInstance: any = null;
    return {
      artGeneration: {
        openaiApiKey: this.config.openaiApiKey,
        maxPromptLength: 400,
        imageSize: '1024x1024',
        quality: 'hd',
        style: 'vivid'
      },
      audioGeneration: {
        voiceService: {
          synthesize: async (req: { text: string; format?: string; sessionId?: string }) => {
            const format = req?.format || 'mp3';
            const sessionId = req?.sessionId || `narration-${Date.now()}`;
            // Lazy-init Polly client from voice-synthesis package
            if (!pollyClientInstance) {
              try {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const { PollyClient } = require('@alexa-multi-agent/voice-synthesis/dist/clients/PollyClient.js');
                const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
                const config = {
                  region,
                  maxRetries: 3,
                  timeoutMs: 20000,
                  engine: 'neural',
                  outputFormat: 'mp3',
                  sampleRate: '22050',
                  textType: 'text',
                  voiceId: 'Joanna',
                };
                pollyClientInstance = new PollyClient(config, this.logger);
                try { await pollyClientInstance.initialize(); } catch (e) { this.logger.warn('Polly init failed; falling back to stub URL', { error: (e instanceof Error) ? e.message : String(e) }); }
              } catch (e) {
                this.logger.warn('voice-synthesis package not available; using stub TTS', { error: (e instanceof Error) ? e.message : String(e) });
              }
            }
            try {
              if (pollyClientInstance?.generateLongForm) {
                const result = await pollyClientInstance.generateLongForm({
                  text: req.text,
                  voiceId: 'Joanna',
                  format,
                  language: 'en-US',
                  emotion: 'calm',
                  sessionId
                });
                return { audioUrl: result.audioUrl, duration: result.duration } as any;
              }
            } catch (e) {
              this.logger.warn('Polly synth failed; returning stub URL', { error: (e instanceof Error) ? e.message : String(e) });
            }
            // Fallback stub if Polly unavailable
            const words = Math.max(1, (req?.text || '').split(/\s+/).length);
            const avgWpm = 160;
            const durationSec = Math.ceil((words / avgWpm) * 60);
            const audioUrl = `https://storytailor-audio.s3.amazonaws.com/longform/${encodeURIComponent(sessionId)}.mp3?expires=86400`;
            return { audioUrl, duration: durationSec } as any;
          }
        } as any,
        defaultVoiceId: 'narrator-warm-female',
        narratorVoiceSettings: {
          stability: 0.8,
          similarityBoost: 0.7,
          style: 0.3,
          useSpeakerBoost: false
        },
        characterVoiceSettings: {}
      },
      educationalActivities: {
        openaiApiKey: this.config.openaiApiKey,
        maxActivities: 4,
        ageRanges: {
          'toddler': { min: 2, max: 3, developmentalStage: 'toddler' },
          'preschool': { min: 4, max: 5, developmentalStage: 'preschool' },
          'early_elementary': { min: 6, max: 8, developmentalStage: 'early elementary' },
          'middle_childhood': { min: 9, max: 12, developmentalStage: 'middle childhood' }
        }
      },
      pdfGeneration: {
        outputDirectory: './generated-pdfs',
        fonts: {
          title: 'Helvetica-Bold',
          body: 'Helvetica',
          caption: 'Helvetica-Oblique'
        },
        layout: {
          pageWidth: 612,
          pageHeight: 792,
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        },
        colors: {
          primary: '#2E86AB',
          secondary: '#A23B72',
          text: '#333333',
          background: '#FFFFFF'
        }
      },
      logLevel: this.config.logLevel,
      enableParallelGeneration: true,
      retryAttempts: 3,
      timeoutMs: 300000 // 5 minutes
    };
  }

  /**
   * Generate all assets for a finalized story
   */
  async generateStoryAssets(request: AssetGenerationRequest): Promise<GeneratedAssets> {
    this.logger.info('Generating story assets', {
      storyId: request.story.id,
      characterId: request.character.id,
      assetTypes: request.assetTypes
    });

    return await this.assetPipeline.generateAssets(request);
  }

  /**
   * Regenerate assets when story content changes
   */
  async regenerateStoryAssets(request: AssetRegenerationRequest): Promise<GeneratedAssets> {
    this.logger.info('Regenerating story assets', {
      storyId: request.originalAssets.storyId,
      assetTypes: request.assetTypesToRegenerate
    });

    return await this.assetPipeline.regenerateAssets(request);
  }

  /**
   * Get asset generation status
   */
  async getAssetGenerationStatus(storyId: string) {
    return await this.assetPipeline.getGenerationStatus(storyId);
  }

  /**
   * Cancel asset generation
   */
  async cancelAssetGeneration(storyId: string): Promise<void> {
    await this.assetPipeline.cancelGeneration(storyId);
  }

  /**
   * Estimate asset generation cost
   */
  async estimateAssetGenerationCost(request: AssetGenerationRequest) {
    return await this.assetPipeline.estimateGenerationCost(request);
  }

  /**
   * Generate assets after story finalization (convenience method)
   */
  async generateAssetsAfterStoryFinalization(
    story: Story,
    character: Character,
    targetAge?: number
  ): Promise<GeneratedAssets> {
    const request: AssetGenerationRequest = {
      story,
      character,
      targetAge: targetAge || 6,
      assetTypes: ['art', 'audio', 'activities', 'pdf'],
      priority: 'normal'
    };

    return await this.generateStoryAssets(request);
  }

  /**
   * Generate only specific asset types (for testing or partial generation)
   */
  async generateSpecificAssets(
    story: Story,
    character: Character,
    assetTypes: ('art' | 'audio' | 'activities' | 'pdf')[],
    customization?: any
  ): Promise<GeneratedAssets> {
    const request: AssetGenerationRequest = {
      story,
      character,
      assetTypes,
      customization,
      priority: 'normal'
    };

    return await this.generateStoryAssets(request);
  }

  private getStoryThemes(storyType: StoryType): string[] {
    const themes: Record<StoryType, string[]> = {
      'Adventure': ['courage', 'exploration', 'growth'],
      'Bedtime': ['calm', 'peace', 'comfort'],
      'Birthday': ['celebration', 'joy', 'milestones'],
      'Educational': ['learning', 'discovery', 'knowledge'],
      'Financial Literacy': ['responsibility', 'planning', 'values'],
      'Language Learning': ['communication', 'culture', 'connection'],
      'Medical Bravery': ['courage', 'healing', 'support'],
      'Mental Health': ['emotional wellness', 'coping', 'resilience'],
      'Milestones': ['achievement', 'growth', 'celebration'],
      'New Chapter Sequel': ['continuity', 'development', 'familiarity'],
      'Tech Readiness': ['innovation', 'adaptation', 'digital literacy'],
      'Child Loss': ['grief', 'healing', 'remembrance', 'love'],
      'Inner Child': ['self-compassion', 'healing', 'integration', 'wholeness'],
      'New Birth': ['new beginnings', 'joy', 'transformation', 'hope']
    };
    
    return themes[storyType] || [];
  }

}
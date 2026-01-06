/**
 * Router Integration
 * 
 * Maps A2A methods to router intents and converts responses.
 * Per documentation: docs/platform/a2a/overview.md:254-258
 */

import { Router, TurnContext, Intent, IntentType, AgentResponse, StoryType } from '@alexa-multi-agent/router';
import { UniversalStorytellerAPI } from '@alexa-multi-agent/universal-agent';
import { Task, MethodMapping, A2AContext } from './types';
import { Logger } from 'winston';
import { A2AError, A2AErrorCode } from './types';
import axios, { AxiosInstance } from 'axios';

export class RouterIntegration {
  private methodMappings: Map<string, MethodMapping> = new Map();
  private httpClient: AxiosInstance;

  constructor(
    private router: Router | null,
    private storytellerAPI: UniversalStorytellerAPI | null,
    private logger: Logger,
    private restApiBaseUrl?: string
  ) {
    // Initialize HTTP client for REST API calls
    this.httpClient = axios.create({
      baseURL: restApiBaseUrl || process.env.API_BASE_URL || 'https://api.storytailor.dev',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    this.initializeMethodMappings();
  }

  /**
   * Execute A2A method by routing to appropriate agent or using custom handler
   */
  async executeMethod(
    method: string,
    params: Record<string, unknown>,
    context: A2AContext
  ): Promise<AgentResponse> {
    const mapping = this.methodMappings.get(method);
    if (!mapping) {
      throw new A2AError(
        A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
        `Method ${method} not found`
      );
    }

    // If handler is custom (not routing through router), use it directly
    // Storytailor ID methods have custom handlers that call REST API
    if (method.startsWith('storytailor_id.')) {
      return await mapping.handler(params, context);
    }

    // For other methods, route through router
    if (!this.router) {
      throw new A2AError(
        A2AErrorCode.AGENT_NOT_FOUND,
        'Router not available'
      );
    }

    // Convert A2A params to TurnContext
    const turnContext = this.createTurnContext(params, context);

    // Create intent from mapping
    const intent: Intent = {
      type: mapping.intentType,
      confidence: 1.0,
      parameters: params,
      requiresAuth: mapping.requiresAuth,
      targetAgent: mapping.targetAgent,
      storyType: this.extractStoryType(params),
      conversationPhase: undefined
    };

    // Route through router
    try {
      const customerResponse = await this.router.route(turnContext);
      
      // Convert CustomerResponse to AgentResponse
      return this.convertToAgentResponse(customerResponse, mapping.targetAgent);
    } catch (error) {
      this.logger.error('Router execution failed', { method, error });
      throw error;
    }
  }

  /**
   * Initialize method mappings per documentation
   */
  private initializeMethodMappings(): void {
    // story.generate → Router → Content Agent (docs/platform/a2a/overview.md:255)
    this.methodMappings.set('story.generate', {
      method: 'story.generate',
      intentType: IntentType.CREATE_STORY,
      targetAgent: 'content',
      requiresAuth: false,
      handler: async (params, context) => {
        return this.executeMethod('story.generate', params, context);
      }
    });

    // character.create (additional method)
    this.methodMappings.set('character.create', {
      method: 'character.create',
      intentType: IntentType.CREATE_CHARACTER,
      targetAgent: 'content',
      requiresAuth: false,
      handler: async (params, context) => {
        return this.executeMethod('character.create', params, context);
      }
    });

    // emotion.checkin → Router → Emotion Agent (docs/platform/a2a/overview.md:256)
    this.methodMappings.set('emotion.checkin', {
      method: 'emotion.checkin',
      intentType: IntentType.EMOTION_CHECKIN,
      targetAgent: 'emotion',
      requiresAuth: false,
      handler: async (params, context) => {
        return this.executeMethod('emotion.checkin', params, context);
      }
    });

    // crisis.detect → Router → Emotion Agent (docs/platform/a2a/overview.md:257)
    this.methodMappings.set('crisis.detect', {
      method: 'crisis.detect',
      intentType: IntentType.EMOTION_CHECKIN, // Uses emotion agent
      targetAgent: 'emotion',
      requiresAuth: false,
      handler: async (params, context) => {
        return this.executeMethod('crisis.detect', params, context);
      }
    });

    // library.list → Router → Library Agent (docs/platform/a2a/overview.md:258)
    this.methodMappings.set('library.list', {
      method: 'library.list',
      intentType: IntentType.VIEW_LIBRARY,
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.executeMethod('library.list', params, context);
      }
    });

    // library.get (additional method)
    this.methodMappings.set('library.get', {
      method: 'library.get',
      intentType: IntentType.VIEW_LIBRARY,
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.executeMethod('library.get', params, context);
      }
    });

    // library.share (additional method)
    this.methodMappings.set('library.share', {
      method: 'library.share',
      intentType: IntentType.SHARE_STORY,
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.executeMethod('library.share', params, context);
      }
    });

    // storytailor_id.create → REST API → POST /api/v1/storytailor-ids
    this.methodMappings.set('storytailor_id.create', {
      method: 'storytailor_id.create',
      intentType: IntentType.VIEW_LIBRARY, // Uses library agent
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.handleStorytailorIdCreate(params, context);
      }
    });

    // storytailor_id.get → REST API → GET /api/v1/storytailor-ids/:id
    this.methodMappings.set('storytailor_id.get', {
      method: 'storytailor_id.get',
      intentType: IntentType.VIEW_LIBRARY,
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.handleStorytailorIdGet(params, context);
      }
    });

    // storytailor_id.transfer → REST API → POST /api/v1/storytailor-ids/:id/transfer
    this.methodMappings.set('storytailor_id.transfer', {
      method: 'storytailor_id.transfer',
      intentType: IntentType.SHARE_STORY,
      targetAgent: 'library',
      requiresAuth: true,
      handler: async (params, context) => {
        return this.handleStorytailorIdTransfer(params, context);
      }
    });
  }

  /**
   * Create TurnContext from A2A params
   */
  private createTurnContext(
    params: Record<string, unknown>,
    context: A2AContext
  ): TurnContext {
    return {
      userId: context.userId || 'a2a-user',
      sessionId: context.sessionId || `a2a-session-${Date.now()}`,
      requestId: context.correlationId,
      userInput: this.extractUserInput(params),
      channel: 'api',
      locale: 'en-US',
      timestamp: context.timestamp,
      metadata: {
        a2a: true,
        clientAgentId: context.clientAgentId,
        taskId: context.taskId
      }
    };
  }

  /**
   * Extract user input from params (for intent classification)
   */
  private extractUserInput(params: Record<string, unknown>): string {
    if (params.userInput && typeof params.userInput === 'string') {
      return params.userInput;
    }
    if (params.message && typeof params.message === 'string') {
      return params.message;
    }
    // Fallback: construct from params
    return JSON.stringify(params);
  }

  /**
   * Extract story type from params
   */
  private extractStoryType(params: Record<string, unknown>): StoryType | undefined {
    if (params.storyType && typeof params.storyType === 'string') {
      const storyTypeMap: Record<string, StoryType> = {
        'adventure': StoryType.ADVENTURE,
        'bedtime': StoryType.BEDTIME,
        'birthday': StoryType.BIRTHDAY,
        'educational': StoryType.EDUCATIONAL,
        'financial_literacy': StoryType.FINANCIAL_LITERACY,
        'language_learning': StoryType.LANGUAGE_LEARNING,
        'medical_bravery': StoryType.MEDICAL_BRAVERY,
        'mental_health': StoryType.MENTAL_HEALTH,
        'milestones': StoryType.MILESTONES,
        'new_chapter_sequel': StoryType.NEW_CHAPTER_SEQUEL,
        'tech_readiness': StoryType.TECH_READINESS
      };
      return storyTypeMap[params.storyType.toLowerCase()];
    }
    return undefined;
  }

  /**
   * Convert CustomerResponse to AgentResponse
   */
  private convertToAgentResponse(
    customerResponse: {
      success?: boolean;
      message?: string;
      speechText?: string;
      displayText?: string;
      conversationPhase?: unknown;
      visualElements?: unknown[];
      audioUrl?: string;
      shouldEndSession?: boolean;
      metadata?: Record<string, unknown>;
    },
    agentName: string
  ): AgentResponse {
    return {
      agentName,
      success: customerResponse.success !== false,
      data: {
        message: customerResponse.message,
        speechText: customerResponse.speechText,
        displayText: customerResponse.displayText,
        conversationPhase: customerResponse.conversationPhase,
        visualElements: customerResponse.visualElements,
        audioUrl: customerResponse.audioUrl
      },
      requiresFollowup: customerResponse.shouldEndSession === false,
      metadata: customerResponse.metadata || {}
    };
  }

  /**
   * Handle storytailor_id.create - delegates to REST API
   */
  private async handleStorytailorIdCreate(
    params: Record<string, unknown>,
    context: A2AContext
  ): Promise<AgentResponse> {
    try {
      if (!context.userId) {
        throw new A2AError(
          A2AErrorCode.AUTHENTICATION_FAILED,
          'User ID required for Storytailor ID creation'
        );
      }

      // Extract parameters
      const name = params.name as string;
      const primaryCharacterId = params.primary_character_id as string | undefined;
      const ageRange = params.age_range as string | undefined;
      const isMinor = params.is_minor as boolean | undefined;
      const parentStorytailorId = params.parent_storytailor_id as string | undefined;

      if (!name || typeof name !== 'string') {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          'Name is required for Storytailor ID creation'
        );
      }

      // Make HTTP call to REST API
      // Note: In production, we'd need to get auth token from context
      // For now, we'll assume the REST API endpoint handles A2A authentication
      const response = await this.httpClient.post(
        '/api/v1/storytailor-ids',
        {
          name,
          primary_character_id: primaryCharacterId,
          age_range: ageRange,
          is_minor: isMinor,
          parent_storytailor_id: parentStorytailorId
        },
        {
          headers: {
            'X-User-Id': context.userId,
            'X-A2A-Request': 'true',
            'X-Correlation-Id': context.correlationId
          }
        }
      );

      if (response.data.success) {
        return {
          agentName: 'library',
          success: true,
          data: {
            storytailorId: response.data.storytailorId
          },
          requiresFollowup: false,
          metadata: {
            method: 'storytailor_id.create',
            storytailorId: response.data.storytailorId.id
          }
        };
      } else {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          response.data.error || 'Failed to create Storytailor ID'
        );
      }
    } catch (error) {
      this.logger.error('Storytailor ID creation failed', { error, params, context });
      if (error instanceof A2AError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || error.message;
        throw new A2AError(
          statusCode === 403 ? A2AErrorCode.AUTHENTICATION_FAILED : A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          errorMessage || 'Failed to create Storytailor ID'
        );
      }
      throw new A2AError(
        A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
        error instanceof Error ? error.message : 'Failed to create Storytailor ID'
      );
    }
  }

  /**
   * Handle storytailor_id.get - delegates to REST API
   */
  private async handleStorytailorIdGet(
    params: Record<string, unknown>,
    context: A2AContext
  ): Promise<AgentResponse> {
    try {
      if (!context.userId) {
        throw new A2AError(
          A2AErrorCode.AUTHENTICATION_FAILED,
          'User ID required for Storytailor ID retrieval'
        );
      }

      const storytailorId = params.id as string;
      if (!storytailorId || typeof storytailorId !== 'string') {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          'Storytailor ID is required'
        );
      }

      const response = await this.httpClient.get(
        `/api/v1/storytailor-ids/${storytailorId}`,
        {
          headers: {
            'X-User-Id': context.userId,
            'X-A2A-Request': 'true',
            'X-Correlation-Id': context.correlationId
          }
        }
      );

      if (response.data.success) {
        return {
          agentName: 'library',
          success: true,
          data: {
            storytailorId: response.data.storytailorId
          },
          requiresFollowup: false,
          metadata: {
            method: 'storytailor_id.get',
            storytailorId: response.data.storytailorId.id
          }
        };
      } else {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          response.data.error || 'Failed to get Storytailor ID'
        );
      }
    } catch (error) {
      this.logger.error('Storytailor ID retrieval failed', { error, params, context });
      if (error instanceof A2AError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || error.message;
        if (statusCode === 404) {
          throw new A2AError(
            A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
            'Storytailor ID not found'
          );
        }
        throw new A2AError(
          statusCode === 403 ? A2AErrorCode.AUTHENTICATION_FAILED : A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          errorMessage || 'Failed to get Storytailor ID'
        );
      }
      throw new A2AError(
        A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
        error instanceof Error ? error.message : 'Failed to get Storytailor ID'
      );
    }
  }

  /**
   * Handle storytailor_id.transfer - delegates to REST API
   */
  private async handleStorytailorIdTransfer(
    params: Record<string, unknown>,
    context: A2AContext
  ): Promise<AgentResponse> {
    try {
      if (!context.userId) {
        throw new A2AError(
          A2AErrorCode.AUTHENTICATION_FAILED,
          'User ID required for Storytailor ID transfer'
        );
      }

      const storytailorId = params.id as string;
      const toUserId = params.to_user_id as string;

      if (!storytailorId || typeof storytailorId !== 'string') {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          'Storytailor ID is required'
        );
      }

      if (!toUserId || typeof toUserId !== 'string') {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          'Target user ID (to_user_id) is required'
        );
      }

      const response = await this.httpClient.post(
        `/api/v1/storytailor-ids/${storytailorId}/transfer`,
        {
          to_user_id: toUserId
        },
        {
          headers: {
            'X-User-Id': context.userId,
            'X-A2A-Request': 'true',
            'X-Correlation-Id': context.correlationId
          }
        }
      );

      if (response.data.success) {
        return {
          agentName: 'library',
          success: true,
          data: {
            message: response.data.message,
            data: response.data.data
          },
          requiresFollowup: false,
          metadata: {
            method: 'storytailor_id.transfer',
            storytailorId,
            newOwnerId: toUserId
          }
        };
      } else {
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          response.data.error || 'Failed to transfer Storytailor ID'
        );
      }
    } catch (error) {
      this.logger.error('Storytailor ID transfer failed', { error, params, context });
      if (error instanceof A2AError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error || error.message;
        if (statusCode === 404) {
          throw new A2AError(
            A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
            'Storytailor ID or target user not found'
          );
        }
        if (statusCode === 403) {
          throw new A2AError(
            A2AErrorCode.AUTHENTICATION_FAILED,
            'Permission denied: Only the owner can transfer a Storytailor ID'
          );
        }
        throw new A2AError(
          A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
          errorMessage || 'Failed to transfer Storytailor ID'
        );
      }
      throw new A2AError(
        A2AErrorCode.CAPABILITY_NOT_SUPPORTED,
        error instanceof Error ? error.message : 'Failed to transfer Storytailor ID'
      );
    }
  }
}

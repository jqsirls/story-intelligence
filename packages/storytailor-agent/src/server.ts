import express from 'express';
import cors from 'cors';
import { SystemConfig } from '@alexa-multi-agent/shared-types';
import { createLogger } from './utils/logger';
import { AlexaHandoffHandler } from './services/AlexaHandoffHandler';
import { ConversationStateManager } from './services/ConversationStateManager';
import { APLRenderer } from './services/APLRenderer';
import { StreamingResponseManager } from './services/StreamingResponseManager';
import { LocaleManager } from './services/LocaleManager';
import { VoiceResponseService } from './services/VoiceResponseService';
import { ConversationalFlowManager } from './services/ConversationalFlowManager';
import { AccountLinkingIntegration } from './services/AccountLinkingIntegration';
import { VoiceService } from '@alexa-multi-agent/voice-synthesis';
import { AuthAgent } from '@alexa-multi-agent/auth-agent';
import { AlexaHandoffRequest } from './types/alexa';
import Redis from 'redis';

export const createServer = async (config: SystemConfig) => {
  const app = express();
  const logger = createLogger('storytailor-agent-server');

  // Initialize Redis client for conversation state
  const redis = Redis.createClient({
    url: config.redis?.url || 'redis://localhost:6379'
  });
  
  await redis.connect();
  logger.info('Connected to Redis for conversation state management');

  // Initialize voice synthesis service
  const voiceService = new VoiceService(config.voiceEngine, logger);
  await voiceService.initialize();
  
  // Initialize auth agent
  const authAgent = new AuthAgent(config.authAgent);
  await authAgent.initialize();
  
  // Initialize services
  const conversationStateManager = new ConversationStateManager(redis);
  const aplRenderer = new APLRenderer();
  const streamingManager = new StreamingResponseManager();
  const localeManager = new LocaleManager();
  const voiceResponseService = new VoiceResponseService(voiceService);
  const conversationalFlowManager = new ConversationalFlowManager();
  const accountLinkingIntegration = new AccountLinkingIntegration(authAgent);
  
  const alexaHandoffHandler = new AlexaHandoffHandler(
    conversationStateManager,
    aplRenderer,
    streamingManager,
    localeManager,
    voiceResponseService,
    conversationalFlowManager,
    accountLinkingIntegration
  );

  // Middleware
  app.use(cors(config.cors));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: config.agent.name,
      version: config.agent.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    res.json({
      service: config.agent.name,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    });
  });

  // Alexa+ Multi-Agent SDK handoff endpoint
  app.post('/alexa/handoff', async (req, res) => {
    const correlationId = req.headers['x-correlation-id'] as string || `handoff-${Date.now()}`;
    
    try {
      logger.info('Received Alexa handoff request', {
        correlationId,
        sessionId: req.body.turnContext?.sessionId,
        userId: req.body.turnContext?.userId
      });

      const handoffRequest: AlexaHandoffRequest = req.body;
      const response = await alexaHandoffHandler.handleHandoff(handoffRequest);

      logger.info('Alexa handoff completed successfully', {
        correlationId,
        sessionId: handoffRequest.turnContext.sessionId,
        responseTime: response.response.responseTime,
        shouldContinue: response.shouldContinue
      });

      res.json(response);
    } catch (error) {
      logger.error('Alexa handoff failed', {
        correlationId,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });

      res.status(500).json({
        error: {
          code: 'HANDOFF_FAILED',
          message: 'Failed to process Alexa handoff',
          correlationId
        }
      });
    }
  });

  // Conversation state management endpoints
  app.get('/conversation/:sessionId', async (req, res) => {
    try {
      const context = await conversationStateManager.getContext(req.params.sessionId);
      if (!context) {
        return res.status(404).json({
          error: {
            code: 'CONTEXT_NOT_FOUND',
            message: 'Conversation context not found'
          }
        });
      }
      res.json(context);
    } catch (error) {
      logger.error('Failed to retrieve conversation context', {
        sessionId: req.params.sessionId,
        error: error.message
      });
      res.status(500).json({
        error: {
          code: 'CONTEXT_RETRIEVAL_FAILED',
          message: 'Failed to retrieve conversation context'
        }
      });
    }
  });

  app.delete('/conversation/:sessionId', async (req, res) => {
    try {
      await conversationStateManager.clearContext(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      logger.error('Failed to clear conversation context', {
        sessionId: req.params.sessionId,
        error: error.message
      });
      res.status(500).json({
        error: {
          code: 'CONTEXT_CLEAR_FAILED',
          message: 'Failed to clear conversation context'
        }
      });
    }
  });

  // Error handling middleware
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      path: req.path,
      method: req.method,
    });

    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred',
        correlationId: req.headers['x-correlation-id'] || 'unknown',
      },
    });
  });

  return app;
};
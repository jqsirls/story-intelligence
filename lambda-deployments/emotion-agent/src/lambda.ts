/**
 * Emotion Agent Lambda Handler - PRODUCTION (WIRED TO REAL SERVICE)
 * Tracks emotion on EVERY turn - this is our $1B competitive advantage!
 */

import { EmotionAgent, EmotionAgentConfig } from './EmotionAgent';
import winston from 'winston';
import { Mood } from '@alexa-multi-agent/shared-types';

// Lambda container reuse - persist agent across invocations
let emotionAgent: EmotionAgent | null = null;
let logger: winston.Logger | null = null;

/**
 * Convert sentiment to mood for database storage
 */
function sentimentToMood(sentiment: string | undefined, score: number): Mood {
  if (!sentiment) return 'neutral';
  
  if (sentiment === 'positive') {
    return 'happy';
  } else if (sentiment === 'negative') {
    if (score < -0.5) {
      // Very negative - could be sad, angry, or scared
      // Default to sad for now; in production would use more sophisticated NLP
      return 'sad';
    }
    return 'sad';
  }
  
  return 'neutral';
}

/**
 * Initialize logger
 */
function getLogger(): winston.Logger {
  if (!logger) {
    logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console()
      ]
    });
  }
  return logger;
}

/**
 * Initialize EmotionAgent
 */
function getEmotionAgent(): EmotionAgent {
  if (!emotionAgent) {
    const config: EmotionAgentConfig = {
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseKey: process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '',
      redisUrl: process.env.REDIS_URL,
      logLevel: process.env.LOG_LEVEL || 'info'
    };

    emotionAgent = new EmotionAgent(config, getLogger());
  }
  return emotionAgent;
}

export const handler = async (event: any): Promise<any> => {
  const log = getLogger();
  log.info('[Emotion Agent] Invoked', { hasBody: !!event.body });

  try {
    // Parse body
    let body: any = event;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;
    const data = { 
      ...body.data, 
      ...body.intent?.parameters,
      ...body,
      userId: body.userId || body.intent?.parameters?.userId || body.memoryState?.userId,
      sessionId: body.sessionId || body.intent?.parameters?.sessionId || body.memoryState?.sessionId
    };

    // Health check
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentName: 'emotion',
          success: true,
          data: {
            status: 'healthy', 
            service: 'emotion-agent',
            mode: 'production',
            features: { 
              moodTracking: true, 
              patternAnalysis: true,
              sentimentAnalysis: true,
              laughterDetection: true,
              voicePatternAnalysis: true,
              longitudinalTracking: true,
              crisisDetection: true,
              parentalReports: true
            }
          }
        })
      };
    }

    // Initialize agent
    const agent = getEmotionAgent();

    // CRITICAL: detect_emotion - called on EVERY turn by Router
    if (action === 'detect_emotion') {
      log.info('Detecting emotion from user input', {
        userId: data.userId,
        sessionId: data.sessionId,
        hasInput: !!data.userInput
      });

      try {
        // Analyze sentiment from user input
        const sentimentResult = await agent.analyzeSentiment(data.userInput || '');
        
        // Convert sentiment to mood
        const mood = sentimentToMood(sentimentResult.sentiment, sentimentResult.score);
        const confidence = sentimentResult.confidence || 0.5;
        
        // Update emotional state in database
        const emotionUpdate = await agent.updateEmotionalState({
          userId: data.userId,
          libraryId: data.libraryId,
          mood: mood,
          confidence: confidence,
          context: {
            type: 'conversation_turn',
            sessionId: data.sessionId,
            conversationPhase: data.conversationPhase,
            userInput: data.userInput?.substring(0, 100), // Store snippet
            sentiment: sentimentResult.sentiment,
            score: sentimentResult.score,
            timestamp: new Date().toISOString()
          },
          sessionId: data.sessionId
        });

        const recorded = !emotionUpdate.id?.startsWith('temp-');
        log.info('Emotion detected and recorded', {
          userId: data.userId,
          mood: mood,
          sentiment: sentimentResult.sentiment,
          emotionId: emotionUpdate.id,
          recorded: recorded
        });

        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'emotion',
            success: true,
            data: {
              mood: mood,
              confidence: confidence,
              sentiment: sentimentResult.sentiment,
              score: sentimentResult.score,
              emotionId: emotionUpdate.id,
              recorded: recorded
            }
          })
        };
      } catch (error) {
        log.error('Error detecting emotion', { 
          error, 
          userId: data.userId,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined
        });
        // Don't fail the conversation if emotion tracking fails
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'emotion',
            success: false,
            data: {
              mood: 'neutral',
              confidence: 0.0,
              recorded: false,
              error: error instanceof Error ? error.message : 'Detection failed',
              errorDetails: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined
            }
          })
        };
      }
    }

    // Daily check-in
    if (action === 'daily_checkin' || action === 'mood_checkin') {
      const result = await agent.performDailyCheckin({
        userId: data.userId,
        libraryId: data.libraryId,
        responses: data.responses || [],
        sessionId: data.sessionId
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: result
        })
      };
    }

    // Detect laughter from audio
    if (action === 'detect_laughter') {
      const result = await agent.detectLaughter({
        userId: data.userId,
        sessionId: data.sessionId,
        audioData: data.audioData,
        context: data.context
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: result
        })
      };
    }

    // Analyze emotion patterns
    if (action === 'analyze_patterns') {
      const patterns = await agent.analyzeEmotionPatterns({
        userId: data.userId,
        libraryId: data.libraryId,
        timeRange: data.timeRange || 'week'
      });

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: { patterns }
        })
      };
    }

    // Generate parental report
    if (action === 'generate_parental_report') {
      const report = await agent.generateParentalReport(
        data.userId,
        data.libraryId,
        data.timeRange || 'week'
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: report
        })
      };
    }

    // Get story recommendation influence
    if (action === 'get_story_influence') {
      const influence = await agent.getStoryRecommendationInfluence(
        data.userId,
        data.libraryId
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: influence
        })
      };
    }

    // Get recent emotions
    if (action === 'get_recent_emotions') {
      const emotions = await agent.getRecentEmotions(
        data.userId,
        data.libraryId,
        data.limit || 10
      );

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'emotion',
          success: true,
          data: { emotions }
        })
      };
    }

    // Unknown action
    log.warn('Unknown action requested', { action });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        agentName: 'emotion',
        success: false,
        error: `Unknown action: ${action}`
      })
    };

  } catch (error) {
    log.error('[Emotion Agent] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'emotion',
        success: false,
        error: error instanceof Error ? error.message : 'Internal error'
      })
    };
  }
};

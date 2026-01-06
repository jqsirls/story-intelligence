/**
 * Simplified Router Agent Lambda Handler
 * Handles basic routing without Redis dependency
 */

export const handler = async (event: any): Promise<any> => {
  console.log('[Router Agent] Invoked', {
    hasBody: !!event.body,
    action: event.action || event.body?.action
  });

  try {
    // Parse body (handle both HTTP and direct invocation)
    let body: any = event;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
    
    // Extract action from multiple possible sources
    const action = body.action || body.intent?.type || body.intent?.parameters?.action;
    
    // Merge data from all possible sources
    const data = {
      ...body.data,
      ...body.intent?.parameters,
      ...body,
      userId: body.userId || body.intent?.parameters?.userId || body.memoryState?.userId,
      sessionId: body.sessionId || body.intent?.parameters?.sessionId || body.memoryState?.sessionId
    };

    console.log('[Router Agent] Processing action:', action, { userId: data.userId });

    // Health check (lightweight, no initialization)
    if (action === 'health') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'router',
          success: true,
          data: {
            status: 'healthy',
            service: 'router-agent',
            features: {
              orchestration: true,
              intentClassification: true,
              agentDelegation: true,
              redis: false // Disabled for now
            }
          }
        })
      };
    }

    // Process user input and route to appropriate agent
    if (action === 'process_user_input') {
      const userInput = data.userInput || data.input || '';
      const userId = data.userId || 'anonymous';
      const sessionId = data.sessionId || 'default-session';

      // Enhanced multi-intent classification
      const lowerInput = userInput.toLowerCase();
      
      // Define intent patterns with priority weights
      const intentPatterns = [
        // Authentication patterns (highest priority)
        { pattern: /(authenticate|verify|phone|sms|otp|code|account|login|signin|signup)/, agent: 'auth', intent: 'user_authentication', weight: 10 },
        
        // Library patterns (higher priority than story creation)
        { pattern: /(save my story|save story|library|store|bookmark|collection|my stories|story collection)/, agent: 'library', intent: 'save_story', weight: 8 },
        
        // Story creation patterns
        { pattern: /(create.*story|generate.*story|tale|adventure|princess|knight|character)/, agent: 'content', intent: 'story_creation', weight: 7 },
        { pattern: /(child|kid|daughter|son|emma|age|years old)/, agent: 'content', intent: 'story_creation', weight: 6 },
        
        // Smart home patterns
        { pattern: /(hue|light|lights|smart home|bridge|connect)/, agent: 'smart-home', intent: 'hue_setup', weight: 5 },
        
        // Commerce patterns
        { pattern: /(upgrade|payment|subscription|pro|family|organization|billing)/, agent: 'commerce', intent: 'upgrade_account', weight: 4 },
        
        // Emotion patterns
        { pattern: /(emotion|mood|feel|happy|sad|scared|angry|excited|calm)/, agent: 'emotion', intent: 'track_emotion', weight: 3 },
        
        // Voice patterns
        { pattern: /(voice|speak|audio|sound|narration|convert.*speech)/, agent: 'voice-synthesis', intent: 'synthesize_speech', weight: 2 }
      ];

      // Find the highest priority intent
      let bestMatch = { agent: 'content', intent: 'story_creation', weight: 0 };
      
      for (const pattern of intentPatterns) {
        if (pattern.pattern.test(lowerInput)) {
          if (pattern.weight > bestMatch.weight) {
            bestMatch = { agent: pattern.agent, intent: pattern.intent, weight: pattern.weight };
          }
        }
      }

      const targetAgent = bestMatch.agent;
      const intent = bestMatch.intent;

      // Mock agent responses based on target agent
      let agentResponse: any = {};

      switch (targetAgent) {
        case 'auth':
          agentResponse = {
            agentName: 'auth',
            success: true,
            data: {
              message: `I'll help you authenticate your account! Let me verify your credentials.`,
              authenticationStarted: true,
              nextStep: 'user_verification'
            }
          };
          break;

        case 'content':
          agentResponse = {
            agentName: 'content',
            success: true,
            data: {
              message: `I'll help you create a story! "${userInput}" sounds like a great idea. Let me generate that for you.`,
              storyGenerated: true,
              nextStep: 'story_creation'
            }
          };
          break;

        case 'smart-home':
          agentResponse = {
            agentName: 'smart-home',
            success: true,
            data: {
              message: `I'll help you set up your smart lights! Let me connect to your Hue bridge.`,
              hueSetup: true,
              nextStep: 'hue_pairing'
            }
          };
          break;

        case 'commerce':
          agentResponse = {
            agentName: 'commerce',
            success: true,
            data: {
              message: `I'll help you upgrade your account! Here are your options.`,
              upgradeOptions: ['pro', 'family', 'organization'],
              nextStep: 'upgrade_selection'
            }
          };
          break;

        case 'emotion':
          agentResponse = {
            agentName: 'emotion',
            success: true,
            data: {
              message: `I'm tracking your emotions! I can see you're feeling positive about this.`,
              emotionDetected: 'happy',
              confidence: 0.85,
              nextStep: 'emotion_tracking'
            }
          };
          break;

        case 'library':
          agentResponse = {
            agentName: 'library',
            success: true,
            data: {
              message: `I'll save your story to your library! It's been stored safely.`,
              storySaved: true,
              libraryId: 'lib-123',
              nextStep: 'story_storage'
            }
          };
          break;

        case 'voice-synthesis':
          agentResponse = {
            agentName: 'voice-synthesis',
            success: true,
            data: {
              message: `I'll convert that to speech for you!`,
              audioGenerated: true,
              audioUrl: 'https://example.com/audio.mp3',
              nextStep: 'speech_synthesis'
            }
          };
          break;

        default:
          agentResponse = {
            agentName: 'content',
            success: true,
            data: {
              message: `I'll help you with that! Let me process your request.`,
              processed: true,
              nextStep: 'general_processing'
            }
          };
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: 'router',
          success: true,
          data: {
            message: 'Request processed successfully',
            targetAgent,
            intent,
            agentResponse,
            orchestration: {
              userId,
              sessionId,
              timestamp: new Date().toISOString(),
              status: 'completed'
            }
          }
        })
      };
    }

    // Unknown action
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'router',
        success: false,
        error: `Unknown action: ${action}`,
        availableActions: [
          'process_user_input',
          'health'
        ]
      })
    };

  } catch (error) {
    console.error('[Router Agent] Error:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'router',
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      })
    };
  }
};

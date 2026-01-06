const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const Joi = require('joi');

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Logger
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.debug('[DEBUG]', ...args)
};

// =============================================================================
// PHASE 1: CORE MULTI-AGENT CLASSES
// =============================================================================

/**
 * Intent Classifier - Analyzes user input to determine intent and target agent
 */
class EmbeddedIntentClassifier {
  classifyIntent(turnContext) {
    const userInput = turnContext.userInput.toLowerCase();
    
    // Character creation intent
    if (userInput.includes('character') || userInput.includes('create a character') || 
        userInput.includes('make a character') || userInput.includes('new character')) {
      return {
        type: 'create_character',
        targetAgent: 'content',
        confidence: 0.9,
        parameters: this.extractCharacterParams(userInput)
      };
    }
    
    // Story creation intent
    if (userInput.includes('story') || userInput.includes('create a story') || 
        userInput.includes('tell me a story') || userInput.includes('make a story')) {
      return {
        type: 'create_story',
        targetAgent: 'content', 
        confidence: 0.9,
        parameters: this.extractStoryParams(userInput)
      };
    }
    
    // Emotion check-in intent
    if (userInput.includes('feeling') || userInput.includes('how are you') ||
        userInput.includes('mood') || userInput.includes('emotion')) {
      return {
        type: 'emotion_checkin',
        targetAgent: 'emotion',
        confidence: 0.8,
        parameters: this.extractEmotionParams(userInput)
      };
    }
    
    // Platform/Story Intelligence questions
    if (userInput.includes('story intelligence') || userInput.includes('what is') ||
        userInput.includes('how does') || userInput.includes('storytailor')) {
      return {
        type: 'platform_question',
        targetAgent: 'router',
        confidence: 0.9,
        parameters: { query: userInput }
      };
    }
    
    // Default to general conversation
    return {
      type: 'general_conversation',
      targetAgent: 'personality',
      confidence: 0.6,
      parameters: { message: userInput }
    };
  }
  
  extractCharacterParams(input) {
    const nameMatch = input.match(/named? (\w+)/i);
    return {
      name: nameMatch ? nameMatch[1] : null,
      description: input
    };
  }
  
  extractStoryParams(input) {
    const themeMatch = input.match(/(adventure|princess|dragon|magic|friendship)/i);
    return {
      theme: themeMatch ? themeMatch[1] : 'adventure',
      description: input
    };
  }
  
  extractEmotionParams(input) {
    const moodMatch = input.match(/(happy|sad|excited|worried|calm|angry)/i);
    return {
      mood: moodMatch ? moodMatch[1] : null,
      description: input
    };
  }
}

/**
 * Content Agent - Handles story and character creation using OpenAI
 */
class ContentAgent {
  constructor(config) {
    this.config = config;
    this.logger = logger;
    this.openai = openai;
    this.supabase = supabase;
  }
  
  async handleRequest(request) {
    const { intent, context } = request;
    
    try {
      switch (intent.type) {
        case 'create_character':
          return await this.createCharacter(intent.parameters, context);
        case 'create_story':
          return await this.createStory(intent.parameters, context);
        default:
          return await this.handleGeneralContent(intent, context);
      }
    } catch (error) {
      this.logger.error('ContentAgent error', { error: error.message });
      return this.createErrorResponse(error);
    }
  }
  
  async createCharacter(parameters, context) {
    const characterName = parameters.name || 'Hero';
    
    // Generate character description using OpenAI
    const characterPrompt = `Create a compelling character description for a children's story character named ${characterName}. Focus on positive traits, unique abilities, and personality. Keep it age-appropriate and inspiring. Maximum 150 words.`;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: characterPrompt }],
        max_tokens: 200,
        temperature: 0.7
      });
      
      const characterDescription = completion.choices[0].message.content;
      
      // Store character in database
      const characterData = {
        library_id: context.sessionId || 'default',
        name: characterName,
        traits: { description: characterDescription },
        art_prompt: `A friendly character named ${characterName}`
      };
      
      const { data, error } = await this.supabase
        .from('characters')
        .insert([characterData])
        .select()
        .single();
      
      if (error) {
        this.logger.warn('Character save failed, continuing with character data', { error: error.message });
      }
      
      return {
        agentName: 'content',
        success: true,
        data: {
          message: `Amazing! I've created ${characterName} using Story Intelligence™. ${characterDescription.substring(0, 100)}... This award-caliber character is ready for your unique family stories!`,
          character: {
            name: characterName,
            description: characterDescription,
            id: data?.id || `char_${Date.now()}`
          },
          nextSteps: [
            'Create a story with this character',
            'Modify character traits', 
            'Create another character'
          ]
        },
        nextPhase: 'character_created'
      };
    } catch (error) {
      this.logger.error('OpenAI character creation failed', error);
      return this.createFallbackCharacterResponse(characterName);
    }
  }
  
  async createStory(parameters, context) {
    const theme = parameters.theme || 'adventure';
    
    // Generate story using OpenAI
    const storyPrompt = `Create an award-caliber children's story with a ${theme} theme. The story should be engaging, age-appropriate, and have positive values. Include vivid descriptions and emotional depth. Target 200-300 words. Make it feel like a personal treasure, not a generic story.`;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: storyPrompt }],
        max_tokens: 400,
        temperature: 0.8
      });
      
      const storyContent = completion.choices[0].message.content;
      const storyTitle = this.extractTitle(storyContent) || `The ${theme.charAt(0).toUpperCase() + theme.slice(1)} Story`;
      
      // Store story in database
      const storyData = {
        title: storyTitle,
        content: storyContent,
        description: `An award-caliber ${theme} story crafted by Story Intelligence™`,
        age_range: '3-8',
        themes: [theme],
        metadata: {
          poweredBy: 'Story Intelligence™',
          platform: 'Storytailor®',
          qualityStandard: 'Award-caliber',
          category: 'Personal family treasure',
          generatedAt: new Date().toISOString()
        }
      };
      
      const { data, error } = await this.supabase
        .from('stories')
        .insert([storyData])
        .select()
        .single();
      
      if (error) {
        this.logger.warn('Story save failed, continuing with story data', { error: error.message });
      }
      
      return {
        agentName: 'content',
        success: true,
        data: {
          message: `I've crafted "${storyTitle}" using Story Intelligence™ - an award-caliber ${theme} story created specifically as your unique family treasure. This story meets publishing-ready standards while being deeply personal to you.`,
          story: {
            title: storyTitle,
            content: storyContent,
            theme: theme,
            id: data?.id || `story_${Date.now()}`
          },
          nextSteps: [
            'Read the complete story',
            'Create activities based on this story',
            'Create another story'
          ]
        },
        nextPhase: 'story_created'
      };
    } catch (error) {
      this.logger.error('OpenAI story creation failed', error);
      return this.createFallbackStoryResponse(theme);
    }
  }
  
  extractTitle(content) {
    const titleMatch = content.match(/^["']?([^"\n]+)["']?/);
    return titleMatch ? titleMatch[1].replace(/^Title:?\s*/, '') : null;
  }
  
  createFallbackCharacterResponse(name) {
    return {
      agentName: 'content',
      success: true,
      data: {
        message: `I've created ${name} as your character! While our advanced Story Intelligence™ generation is temporarily unavailable, I can still help you develop this character's traits and personality for your award-caliber stories.`,
        character: { name, description: `A wonderful character named ${name}` },
        nextSteps: ['Describe character traits', 'Create a story with this character']
      },
      nextPhase: 'character_created'
    };
  }
  
  createFallbackStoryResponse(theme) {
    return {
      agentName: 'content',
      success: true,
      data: {
        message: `I'm ready to create an award-caliber ${theme} story for you! While our advanced Story Intelligence™ generation is temporarily processing, I can guide you through creating a personalized ${theme} story that will be a unique family treasure.`,
        nextSteps: ['Tell me about your preferred characters', 'Describe the setting you imagine']
      },
      nextPhase: 'story_planning'
    };
  }
  
  createErrorResponse(error) {
    return {
      agentName: 'content',
      success: false,
      data: {
        message: 'I encountered an issue while creating your content. Story Intelligence™ is working to resolve this. Would you like to try again or explore a different creative path?',
        error: 'Content generation temporarily unavailable'
      },
      nextPhase: 'error_recovery'
    };
  }
  
  async handleGeneralContent(intent, context) {
    return {
      agentName: 'content',
      success: true,
      data: {
        message: 'I\'m the Content Agent, powered by Story Intelligence™. I specialize in creating award-caliber characters and stories. What would you like to create together?',
        nextSteps: ['Create a character', 'Create a story', 'Ask about story creation']
      },
      nextPhase: 'content_planning'
    };
  }
}

/**
 * Emotion Agent - Handles emotional check-ins and mood analysis
 */
class EmotionAgent {
  constructor(config) {
    this.config = config;
    this.logger = logger;
    this.supabase = supabase;
  }
  
  async handleRequest(request) {
    const { intent, context } = request;
    
    try {
      switch (intent.type) {
        case 'emotion_checkin':
          return await this.handleEmotionCheckin(intent.parameters, context);
        default:
          return await this.handleGeneralEmotion(intent, context);
      }
    } catch (error) {
      this.logger.error('EmotionAgent error', { error: error.message });
      return this.createErrorResponse(error);
    }
  }
  
  async handleEmotionCheckin(parameters, context) {
    const detectedMood = parameters.mood;
    const currentTime = new Date().toISOString();
    
    // Store emotion check-in
    const emotionData = {
      session_id: context.sessionId,
      user_id: context.userId || 'anonymous',
      mood: detectedMood || 'neutral',
      context: parameters.description,
      timestamp: currentTime
    };
    
    try {
      await this.supabase
        .from('emotion_checkins')
        .insert([emotionData]);
    } catch (error) {
      this.logger.warn('Emotion checkin save failed', { error: error.message });
    }
    
    // Generate appropriate response based on mood
    let responseMessage;
    let nextSteps;
    
    if (detectedMood) {
      switch (detectedMood) {
        case 'happy':
        case 'excited':
          responseMessage = `I can sense your ${detectedMood} energy! Story Intelligence™ understands that positive emotions create the most wonderful creative experiences. When we're feeling ${detectedMood}, it's perfect for adventure stories or magical tales.`;
          nextSteps = ['Create an adventure story', 'Create a happy character', 'Explore magical worlds'];
          break;
        case 'sad':
        case 'worried':
          responseMessage = `I understand you're feeling ${detectedMood} right now. Story Intelligence™ knows that sometimes we need gentle, comforting stories that help us feel better. Would you like to create a story about overcoming challenges or finding friendship?`;
          nextSteps = ['Create a comforting story', 'Talk about feelings', 'Create a brave character'];
          break;
        case 'calm':
          responseMessage = `Your calm energy is wonderful for storytelling! Story Intelligence™ recognizes this as perfect for creating thoughtful, peaceful stories or exploring character development.`;
          nextSteps = ['Create a peaceful story', 'Develop character relationships', 'Explore nature themes'];
          break;
        default:
          responseMessage = `Thank you for sharing how you're feeling. Story Intelligence™ adapts to your emotional state to create the most meaningful stories for you right now.`;
          nextSteps = ['Create a story that matches your mood', 'Talk about your day', 'Explore different themes'];
      }
    } else {
      responseMessage = 'I\'m here to understand how you\'re feeling today. Story Intelligence™ uses emotional awareness to create stories that truly resonate with you. How are you feeling right now?';
      nextSteps = ['Tell me about your mood', 'Share what happened today', 'Create a story anyway'];
    }
    
    return {
      agentName: 'emotion',
      success: true,
      data: {
        message: responseMessage,
        emotionAnalysis: {
          detectedMood: detectedMood || 'unknown',
          timestamp: currentTime,
          recommendations: nextSteps
        },
        nextSteps
      },
      nextPhase: 'emotion_aware_creation'
    };
  }
  
  async handleGeneralEmotion(intent, context) {
    return {
      agentName: 'emotion',
      success: true,
      data: {
        message: 'I\'m the Emotion Agent, powered by Story Intelligence™. I help understand your feelings and create stories that match your emotional needs. How are you feeling today?',
        nextSteps: ['Tell me your mood', 'Share your feelings', 'Create an emotion-based story']
      },
      nextPhase: 'emotion_checkin'
    };
  }
  
  createErrorResponse(error) {
    return {
      agentName: 'emotion',
      success: false,
      data: {
        message: 'I\'m having trouble processing emotions right now, but Story Intelligence™ is working to restore this capability. In the meantime, we can still create wonderful stories together.',
        error: 'Emotion processing temporarily unavailable'
      },
      nextPhase: 'error_recovery'
    };
  }
}

/**
 * Personality Agent - Handles tone adaptation and general conversation
 */
class PersonalityAgent {
  constructor(config) {
    this.config = config;
    this.logger = logger;
  }
  
  async handleRequest(request) {
    const { intent, context } = request;
    
    try {
      return await this.handleGeneralConversation(intent.parameters, context);
    } catch (error) {
      this.logger.error('PersonalityAgent error', { error: error.message });
      return this.createErrorResponse(error);
    }
  }
  
  async handleGeneralConversation(parameters, context) {
    const userMessage = parameters.message || parameters.description || '';
    
    // Adapt tone based on user input
    let response;
    
    if (userMessage.includes('hello') || userMessage.includes('hi')) {
      response = 'Hello! I\'m delighted to meet you! Story Intelligence™ has helped me understand the art of great conversation and storytelling. I\'m here as your wise, whimsical companion on this creative journey. What magical story adventure shall we embark on together?';
    } else if (userMessage.includes('help')) {
      response = 'I\'m here to help you create award-caliber stories that become unique family treasures! Powered by Story Intelligence™, I can assist with character creation, story development, and understanding your creative needs. What would you like to explore?';
    } else if (userMessage.includes('thank')) {
      response = 'You\'re so welcome! It brings me joy to help you create with Story Intelligence™. Every story we make together becomes a special treasure for your family. What shall we create next?';
    } else {
      response = `I understand you said: "${userMessage}". Story Intelligence™ helps me process your words with the wisdom of master storytellers and child development experts. Let me guide you toward creating something truly special together.`;
    }
    
    return {
      agentName: 'personality',
      success: true,
      data: {
        message: response,
        tone: 'wise-whimsical-mentor',
        adaptedTo: userMessage.substring(0, 50),
        nextSteps: [
          'Ask me about Story Intelligence™',
          'Start creating a character',
          'Begin a new story',
          'Share how you\'re feeling'
        ]
      },
      nextPhase: 'personalized_interaction'
    };
  }
  
  createErrorResponse(error) {
    return {
      agentName: 'personality',
      success: false,
      data: {
        message: 'I\'m experiencing a personality processing hiccup, but my core Story Intelligence™ remains strong! Let\'s continue our creative journey together.',
        error: 'Personality adaptation temporarily limited'
      },
      nextPhase: 'error_recovery'
    };
  }
}

/**
 * Agent Delegator - Manages agent coordination with circuit breaker pattern
 */
class EmbeddedAgentDelegator {
  constructor(agents) {
    this.agents = agents;
    this.logger = logger;
    this.circuitBreakers = new Map();
    
    // Initialize circuit breakers
    Object.keys(agents).forEach(agentName => {
      this.circuitBreakers.set(agentName, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: null,
        failureThreshold: 3,
        recoveryTimeoutMs: 30000
      });
    });
  }
  
  async delegate(intent, turnContext, memoryState) {
    const targetAgent = intent.targetAgent;
    const circuitBreaker = this.circuitBreakers.get(targetAgent);
    
    // Check circuit breaker state
    if (circuitBreaker.state === 'OPEN') {
      if (Date.now() - circuitBreaker.lastFailureTime > circuitBreaker.recoveryTimeoutMs) {
        circuitBreaker.state = 'HALF_OPEN';
        this.logger.info(`Circuit breaker for ${targetAgent} moved to HALF_OPEN`);
      } else {
        return this.getFallbackResponse(intent, turnContext);
      }
    }
    
    try {
      const agent = this.agents[targetAgent];
      if (!agent) {
        throw new Error(`Agent ${targetAgent} not found`);
      }
      
      const request = {
        intent,
        context: turnContext,
        memoryState
      };
      
      const response = await agent.handleRequest(request);
      
      // Success - reset circuit breaker
      circuitBreaker.failureCount = 0;
      circuitBreaker.state = 'CLOSED';
      
      return response;
      
    } catch (error) {
      this.logger.error(`Agent ${targetAgent} failed`, { error: error.message });
      
      // Update circuit breaker
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = Date.now();
      
      if (circuitBreaker.failureCount >= circuitBreaker.failureThreshold) {
        circuitBreaker.state = 'OPEN';
        this.logger.warn(`Circuit breaker for ${targetAgent} opened`);
      }
      
      return this.getFallbackResponse(intent, turnContext);
    }
  }
  
  getFallbackResponse(intent, turnContext) {
    return {
      agentName: 'fallback',
      success: true,
      data: {
        message: `I'm processing your request through Story Intelligence™ backup systems. While I work on "${intent.type}", let me assure you that we'll create something wonderful together. What specific aspect would you like to focus on?`,
        fallbackMode: true,
        originalIntent: intent.type,
        nextSteps: [
          'Try your request again',
          'Ask a different question',
          'Explore other creative options'
        ]
      },
      nextPhase: 'fallback_mode'
    };
  }
}

/**
 * Embedded Router - Main orchestration class
 */
class EmbeddedRouter {
  constructor() {
    this.logger = logger;
    
    // Initialize embedded agents
    const agents = {
      content: new ContentAgent({
        openaiApiKey: process.env.OPENAI_API_KEY,
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
        logLevel: 'info'
      }),
      emotion: new EmotionAgent({
        supabaseUrl: process.env.SUPABASE_URL,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
        logLevel: 'info'
      }),
      personality: new PersonalityAgent({
        logLevel: 'info'
      })
    };
    
    this.agentDelegator = new EmbeddedAgentDelegator(agents);
    this.intentClassifier = new EmbeddedIntentClassifier();
  }
  
  async route(turnContext) {
    try {
      this.logger.info('Processing turn context in embedded router', {
        userId: turnContext.userId,
        sessionId: turnContext.sessionId,
        userInput: turnContext.userInput?.substring(0, 100)
      });
      
      // Handle platform questions directly (knowledge base)
      if (this.isPlatformQuestion(turnContext.userInput)) {
        return this.handlePlatformQuestion(turnContext);
      }
      
      // Classify intent
      const intent = this.intentClassifier.classifyIntent(turnContext);
      
      this.logger.info('Intent classified', {
        type: intent.type,
        targetAgent: intent.targetAgent,
        confidence: intent.confidence
      });
      
      // Delegate to appropriate agent
      const agentResponse = await this.agentDelegator.delegate(intent, turnContext, {});
      
      // Assemble customer response
      const customerResponse = {
        sessionId: turnContext.sessionId,
        message: agentResponse.data?.message || `Story Intelligence™ processed your request through ${agentResponse.agentName} agent`,
        agentName: agentResponse.agentName,
        success: agentResponse.success,
        nextPhase: agentResponse.nextPhase || this.determineNextPhase(intent, agentResponse),
        suggestions: agentResponse.data?.nextSteps || ['Continue conversation', 'Ask another question'],
        metadata: {
          intentType: intent.type,
          confidence: intent.confidence,
          processingTime: Date.now() - (turnContext.timestamp || Date.now()),
          agentsInvolved: [agentResponse.agentName],
          multiAgentFlow: true,
          poweredBy: 'Story Intelligence™'
        }
      };
      
      this.logger.info('Customer response assembled', {
        success: customerResponse.success,
        agentName: customerResponse.agentName,
        nextPhase: customerResponse.nextPhase
      });
      
      return customerResponse;
      
    } catch (error) {
      this.logger.error('Router error', { error: error.message });
      return this.createErrorResponse(turnContext, error);
    }
  }
  
  isPlatformQuestion(userInput) {
    const platformKeywords = [
      'story intelligence',
      'what is storytailor',
      'how does this work',
      'tell me about',
      'what can you do'
    ];
    
    const input = userInput.toLowerCase();
    return platformKeywords.some(keyword => input.includes(keyword));
  }
  
  handlePlatformQuestion(turnContext) {
    const input = turnContext.userInput.toLowerCase();
    
    let response;
    
    if (input.includes('story intelligence')) {
      response = 'Story Intelligence™ is a revolutionary breakthrough in narrative technology. Unlike artificial intelligence creating generic content, Story Intelligence™ understands the soul of great storytelling, the science of child development, and the art of personal connection. It creates award-caliber stories that become unique family treasures.';
    } else if (input.includes('storytailor')) {
      response = 'Storytailor® is the platform powered by Story Intelligence™. We create an entirely new category of family experience where you and your child create stories together, then turn those stories into real-world activities and lasting memories. It complements traditional reading by adding story creation time.';
    } else {
      response = 'I\'m powered by Story Intelligence™, which enables me to create award-caliber stories as unique family treasures. I combine master storytelling wisdom with child development expertise to craft narratives that are personally meaningful while meeting publishing-quality standards.';
    }
    
    return {
      sessionId: turnContext.sessionId,
      message: response,
      agentName: 'router',
      success: true,
      nextPhase: 'platform_education',
      suggestions: [
        'Start creating a story',
        'Learn more about Story Intelligence™',
        'Create a character'
      ],
      metadata: {
        intentType: 'platform_question',
        confidence: 0.95,
        agentsInvolved: ['router'],
        multiAgentFlow: true,
        poweredBy: 'Story Intelligence™'
      }
    };
  }
  
  determineNextPhase(intent, agentResponse) {
    if (agentResponse.nextPhase) return agentResponse.nextPhase;
    
    switch (intent.type) {
      case 'create_character': return 'character_created';
      case 'create_story': return 'story_created';
      case 'emotion_checkin': return 'emotion_processed';
      case 'general_conversation': return 'conversation_ongoing';
      default: return 'interaction_complete';
    }
  }
  
  createErrorResponse(turnContext, error) {
    return {
      sessionId: turnContext.sessionId,
      message: 'Story Intelligence™ encountered an unexpected situation while processing your request. My core storytelling capabilities remain strong - shall we try a different creative approach?',
      agentName: 'router',
      success: false,
      nextPhase: 'error_recovery',
      suggestions: [
        'Try your request again',
        'Ask a simpler question',
        'Start with character creation'
      ],
      metadata: {
        error: error.message,
        agentsInvolved: ['router'],
        multiAgentFlow: true,
        poweredBy: 'Story Intelligence™'
      }
    };
  }
  
  getHealthStatus() {
    return {
      status: 'healthy',
      agents: ['content', 'emotion', 'personality'],
      circuitBreakers: Object.fromEntries(
        Array.from(this.agentDelegator.circuitBreakers.entries())
      ),
      timestamp: new Date().toISOString()
    };
  }
}

// =============================================================================
// PHASE 2: LAMBDA INTEGRATION
// =============================================================================

// Initialize multi-agent system
let router;
function initializeMultiAgentSystem() {
  if (!router) {
    router = new EmbeddedRouter();
    logger.info('Multi-agent system initialized');
  }
  return router;
}

// Main Lambda handler
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    // Parse the request - handle both v1.0 and v2.0 API Gateway formats
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    const path = event.path || event.rawPath?.replace('/staging', '') || event.pathParameters?.proxy || '/';
    const body = event.body;
    const requestBody = body ? JSON.parse(body) : {};
    
    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    };
    
    // Handle OPTIONS requests for CORS
    if (httpMethod === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // Initialize multi-agent system
    const multiAgentRouter = initializeMultiAgentSystem();
    
    // Brand-compliant responses following Story Intelligence™ guidelines
    switch (path) {
      case '/health':
        const multiAgentHealth = multiAgentRouter.getHealthStatus();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            message: 'Storytailor® API powered by Story Intelligence™',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT || 'staging',
            version: '5.1.0',
            features: [
              'characters',
              'conversations', 
              'multi-agent-system',
              'emotion-intelligence',
              'smart-home-integration'
            ],
            multiAgentSystem: multiAgentHealth,
            poweredBy: 'Story Intelligence™',
            company: 'Storytailor Inc',
            platform: 'Storytailor®'
          })
        };
      
      case '/':
      case '':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Welcome to Storytailor® - Powered by Story Intelligence™',
            description: 'Create award-caliber stories as unique family treasures',
            tagline: 'Story Intelligence creates an entirely new category of family experience',
            api: {
              version: '5.1.0',
              poweredBy: 'Story Intelligence™',
              multiAgent: true,
              endpoints: [
                'GET /health - API health status',
                'GET /stories - List stories', 
                'POST /stories - Create story',
                'POST /v1/conversation/start - Start conversation',
                'POST /v1/conversation/message - Send message',
                'POST /v1/conversation/end - End conversation'
              ]
            }
          })
        };
      
      case '/stories':
        if (httpMethod === 'GET') {
          const { data, error } = await supabase
            .from('stories')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (error) throw error;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Stories crafted by Story Intelligence™',
              stories: data || [],
              count: data ? data.length : 0,
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®'
            })
          };
        } else if (httpMethod === 'POST') {
          const storyData = {
            title: requestBody.title || 'Untitled Story',
            content: requestBody.content || '',
            description: requestBody.description || 'A unique story powered by Story Intelligence™',
            age_range: requestBody.age_range || '3-8',
            themes: requestBody.themes || [],
            metadata: {
              ...requestBody.metadata,
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®',
              qualityStandard: 'Award-caliber',
              category: 'Personal family treasure'
            }
          };
          
          const { data, error } = await supabase
            .from('stories')
            .insert([storyData])
            .select();
          
          if (error) throw error;
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({ 
              success: true,
              message: 'Story created successfully by Story Intelligence™',
              story: data[0],
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®'
            })
          };
        }
        break;

      case '/v1/conversation/start':
        if (httpMethod === 'POST') {
          const { userId, message } = requestBody;
          const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // REAL MULTI-AGENT PROCESSING
          const turnContext = {
            sessionId,
            userId: userId || 'anonymous',
            userInput: message || 'Hello',
            timestamp: Date.now(),
            conversationPhase: 'start'
          };
          
          const routerResponse = await multiAgentRouter.route(turnContext);
          
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
              success: true,
              conversation: {
                sessionId,
                userId,
                status: 'active',
                startedAt: new Date().toISOString(),
                multiAgentEnabled: true
              },
              message: 'Conversation started with Story Intelligence™',
              response: routerResponse.message,
              agentName: routerResponse.agentName,
              nextPhase: routerResponse.nextPhase,
              suggestions: routerResponse.suggestions,
              metadata: routerResponse.metadata,
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®'
            })
          };
        }
        break;

      case '/v1/conversation/message':
        if (httpMethod === 'POST') {
          const { sessionId, message, userId } = requestBody;
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          // REAL MULTI-AGENT PROCESSING
          const turnContext = {
            sessionId,
            userId: userId || 'anonymous',
            userInput: message,
            timestamp: Date.now(),
            conversationPhase: 'ongoing'
          };
          
          const routerResponse = await multiAgentRouter.route(turnContext);
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              response: {
                sessionId,
                messageId,
                userMessage: message,
                agentResponse: routerResponse.message,
                agentName: routerResponse.agentName,
                timestamp: new Date().toISOString(),
                nextPhase: routerResponse.nextPhase,
                suggestions: routerResponse.suggestions,
                metadata: routerResponse.metadata,
                multiAgent: true,
                poweredBy: 'Story Intelligence™'
              }
            })
          };
        }
        break;

      case '/v1/conversation/end':
        if (httpMethod === 'POST') {
          const { sessionId } = requestBody;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Conversation ended. Thank you for creating with Story Intelligence™!',
              sessionId,
              endedAt: new Date().toISOString(),
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®'
            })
          };
        }
        break;
      
      default:
        const availableEndpoints = [
          '/health',
          '/stories', 
          '/v1/conversation/start',
          '/v1/conversation/message', 
          '/v1/conversation/end'
        ];
        
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Endpoint not found',
            message: 'This endpoint is not available on Storytailor® API',
            requestedPath: path,
            availableEndpoints,
            poweredBy: 'Story Intelligence™',
            platform: 'Storytailor®'
          })
        };
    }
    
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred in the Storytailor® API powered by Story Intelligence™',
        timestamp: new Date().toISOString(),
        poweredBy: 'Story Intelligence™',
        platform: 'Storytailor®'
      })
    };
  }
};
 
 
 
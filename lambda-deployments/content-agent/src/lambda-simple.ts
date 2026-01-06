/**
 * Content Agent Lambda Handler - Simplified Version
 * Uses simple HTTP client instead of OpenAI SDK to avoid dependency issues
 */

const { SimpleOpenAIClient } = require('./SimpleOpenAIClient');
const { createLogger } = require('winston');

// Global instances for Lambda warm starts
let openaiClient: any = null;
let logger: any = null;

// Initialize clients
async function initializeClients() {
  if (openaiClient && logger) return;

  logger = createLogger({
    level: 'info',
    format: require('winston').format.combine(
      require('winston').format.timestamp(),
      require('winston').format.json()
    ),
    transports: [
      new (require('winston').transports.Console)()
    ]
  });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  openaiClient = new SimpleOpenAIClient(openaiKey, logger);
  logger.info('Content Agent initialized with simple HTTP client');
}

// Main Lambda handler
export const handler = async (event: any, context: any) => {
  try {
    await initializeClients();
    
    const { action, ...data } = event;
    
    logger.info('Content Agent request', { action, dataKeys: Object.keys(data) });

    switch (action) {
      case 'health':
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '2.0.0-simple'
          })
        };

      case 'generate_image':
      case 'create_image':
        const prompt = data.prompt || data.imagePrompt || 'A colorful children\'s story illustration';
        
        try {
          const imageUrl = await openaiClient!.generateImage(prompt);
          
          return {
            statusCode: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
              agentName: 'content',
              success: true,
              data: {
                imageUrl,
                prompt,
                message: 'Image generated successfully'
              }
            })
          };
        } catch (error: any) {
          logger.error('Image generation failed', { error: error.message });
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Image generation failed',
              details: error.message
            })
          };
        }

      case 'generate_story':
        const storyPrompt = data.prompt || data.message || 'Tell me a children\'s story';
        
        try {
          const messages = [
            {
              role: 'system',
              content: 'You are Frankie, a warm and whimsical storyteller who creates magical children\'s stories. Always be encouraging, creative, and age-appropriate.'
            },
            {
              role: 'user',
              content: storyPrompt
            }
          ];
          
          const story = await openaiClient!.generateText(messages);
          
          return {
            statusCode: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
              agentName: 'content',
              success: true,
              data: {
                story,
                prompt: storyPrompt,
                message: 'Story generated successfully'
              }
            })
          };
        } catch (error: any) {
          logger.error('Story generation failed', { error: error.message });
          return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agentName: 'content',
              success: false,
              error: 'Story generation failed',
              details: error.message
            })
          };
        }

      default:
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: 'content',
            success: false,
            error: 'Invalid action',
            availableActions: ['health', 'generate_image', 'create_image', 'generate_story']
          })
        };
    }

  } catch (error: any) {
    logger.error('Content Agent error', { error: error.message, stack: error.stack });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: 'content',
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
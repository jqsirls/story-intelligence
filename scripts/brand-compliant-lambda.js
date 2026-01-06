const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }
    
    // Brand-compliant responses following Story Intelligence™ guidelines
    switch (path) {
      case '/health':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'healthy',
            message: 'Storytailor® API powered by Story Intelligence™',
            timestamp: new Date().toISOString(),
            environment: process.env.ENVIRONMENT || 'staging',
            version: '5.0.0',
            features: [
              'characters',
              'conversations', 
              'multi-agent-system',
              'emotion-intelligence',
              'smart-home-integration'
            ],
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
              version: '5.0.0',
              poweredBy: 'Story Intelligence™',
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
          // Get stories with Story Intelligence™ branding
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
          // Create story with Story Intelligence™ branding  
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
              response: 'Hello! I\'m excited to create award-caliber stories with you. Powered by Story Intelligence™, I understand the art of great storytelling and child development. What kind of story would you like to create together?',
              poweredBy: 'Story Intelligence™',
              platform: 'Storytailor®'
            })
          };
        }
        break;

      case '/v1/conversation/message':
        if (httpMethod === 'POST') {
          const { sessionId, message } = requestBody;
          const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              response: {
                sessionId,
                messageId,
                userMessage: message,
                agentResponse: `I understand you said: "${message}". Story Intelligence™ is processing this to create the perfect narrative response that meets award-caliber standards while being uniquely meaningful for you.`,
                timestamp: new Date().toISOString(),
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
        // Available endpoints response
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
 
 
 
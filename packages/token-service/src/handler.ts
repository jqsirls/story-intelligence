import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { TokenServiceAgent } from './TokenServiceAgent';

let agent: TokenServiceAgent;

const initializeAgent = async (): Promise<TokenServiceAgent> => {
  if (!agent) {
    const config = {
      kmsKeyId: process.env.KMS_KEY_ID!,
      region: process.env.AWS_REGION || 'us-east-1',
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
      redisUrl: process.env.REDIS_URL!,
      issuer: process.env.TOKEN_ISSUER || 'https://auth.storytailor.ai',
      audience: (process.env.TOKEN_AUDIENCE || '').split(',').filter(Boolean)
    };

    agent = new TokenServiceAgent(config);
    await agent.initialize();
  }
  
  return agent;
};

/**
 * Lambda handler for HTTP requests via API Gateway
 */
export const httpHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log('TokenService HTTP handler invoked:', {
    path: event.path,
    method: event.httpMethod,
    requestId: context.requestId
  });

  try {
    const tokenAgent = await initializeAgent();

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Route based on path
    const path = event.path.replace(/^\/[^\/]+/, ''); // Remove stage prefix

    switch (path) {
      case '/token':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const tokenRequest = JSON.parse(event.body || '{}');
        const token = await tokenAgent.generateToken(tokenRequest);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(token)
        };

      case '/token/verify':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const verifyRequest = JSON.parse(event.body || '{}');
        const verified = await tokenAgent.verifyToken(
          verifyRequest.token,
          verifyRequest.options
        );
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ valid: true, claims: verified })
        };

      case '/token/introspect':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const introspectRequest = JSON.parse(event.body || '{}');
        const introspection = await tokenAgent.introspectToken(introspectRequest.token);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(introspection)
        };

      case '/token/revoke':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const revokeRequest = JSON.parse(event.body || '{}');
        await tokenAgent.revokeToken(revokeRequest.token, revokeRequest.reason);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ revoked: true })
        };

      case '/.well-known/jwks.json':
        if (event.httpMethod !== 'GET') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const jwks = await tokenAgent.getJWKS();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(jwks)
        };

      case '/admin/rotate-keys':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        // Check admin authorization
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Unauthorized' })
          };
        }

        // Verify admin token
        try {
          const adminToken = authHeader.substring(7);
          const claims = await tokenAgent.verifyToken(adminToken);
          
          if (claims.role !== 'admin') {
            return {
              statusCode: 403,
              headers,
              body: JSON.stringify({ error: 'Forbidden' })
            };
          }
        } catch (error) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Invalid token' })
          };
        }

        await tokenAgent.rotateKeys();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, message: 'Keys rotated successfully' })
        };

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found' })
        };
    }

  } catch (error: any) {
    console.error('TokenService error:', error);
    
    // Handle specific JWT errors
    if (error.name === 'TokenExpiredError') {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Token expired' })
      };
    }
    
    if (error.name === 'JsonWebTokenError') {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

/**
 * Lambda handler for EventBridge events
 */
export const eventHandler = async (event: any, context: Context): Promise<any> => {
  console.log('TokenService event handler invoked:', {
    source: event.source,
    detailType: event['detail-type'],
    requestId: context.requestId
  });

  try {
    const tokenAgent = await initializeAgent();
    
    // Handle EventBridge event
    const result = await tokenAgent.handleEvent({
      type: event['detail-type'],
      payload: event.detail
    });

    return {
      statusCode: 200,
      body: result
    };

  } catch (error: any) {
    console.error('TokenService event handler error:', error);
    
    return {
      statusCode: 500,
      error: error.message
    };
  }
};

/**
 * Main handler that routes based on event type
 */
export const handler = async (
  event: APIGatewayProxyEvent | any,
  context: Context
): Promise<APIGatewayProxyResult | any> => {
  // Check if this is an HTTP event
  if (event.httpMethod) {
    return httpHandler(event as APIGatewayProxyEvent, context);
  }
  
  // Otherwise treat as EventBridge event
  return eventHandler(event, context);
};
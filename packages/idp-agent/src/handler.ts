import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { IdPAgent } from './IdPAgent';

let agent: IdPAgent;

const initializeAgent = async (): Promise<IdPAgent> => {
  if (!agent) {
    const config = {
      supabaseUrl: process.env.SUPABASE_URL!,
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY!,
      redisUrl: process.env.REDIS_URL!,
      eventBusName: process.env.EVENT_BUS_NAME || 'storytailor-staging',
      region: process.env.AWS_REGION || 'us-east-1',
      tokenServiceUrl: process.env.TOKEN_SERVICE_URL || 'https://token.storytailor.ai',
      issuer: process.env.OIDC_ISSUER || 'https://auth.storytailor.ai',
      authorizationEndpoint: process.env.OIDC_AUTH_ENDPOINT || 'https://auth.storytailor.ai/oauth/authorize',
      tokenEndpoint: process.env.OIDC_TOKEN_ENDPOINT || 'https://auth.storytailor.ai/oauth/token',
      userinfoEndpoint: process.env.OIDC_USERINFO_ENDPOINT || 'https://auth.storytailor.ai/oauth/userinfo',
      jwksUri: process.env.OIDC_JWKS_URI || 'https://auth.storytailor.ai/.well-known/jwks.json',
      registrationEndpoint: process.env.OIDC_REGISTRATION_ENDPOINT || 'https://auth.storytailor.ai/oauth/register'
    };

    agent = new IdPAgent(config);
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
  console.log('IdP HTTP handler invoked:', {
    path: event.path,
    method: event.httpMethod,
    requestId: context.requestId
  });

  try {
    const idpAgent = await initializeAgent();

    // CORS headers
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Cache-Control': 'no-store'
    };

    // Handle OPTIONS for CORS
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    // Extract user ID from JWT if present
    let userId: string | undefined;
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In production, verify JWT and extract user ID
      // For now, mock it
      userId = 'user-123';
    }

    // Route based on path
    const path = event.path.replace(/^\/[^\/]+/, ''); // Remove stage prefix

    switch (path) {
      case '/.well-known/openid-configuration':
        if (event.httpMethod !== 'GET') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const discovery = await idpAgent.getDiscoveryDocument();
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
          },
          body: JSON.stringify(discovery)
        };

      case '/oauth/authorize':
        if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const authParams = event.httpMethod === 'GET' 
          ? event.queryStringParameters || {}
          : JSON.parse(event.body || '{}');

        const authResult = await idpAgent.authorize(authParams as any, userId);

        // Build redirect URL
        if (authResult.error) {
          const errorParams = new URLSearchParams({
            error: authResult.error,
            error_description: authResult.error_description || '',
            ...(authResult.state && { state: authResult.state })
          });

          return {
            statusCode: 302,
            headers: {
              Location: `${authResult.redirect_uri}?${errorParams.toString()}`
            },
            body: ''
          };
        } else {
          const successParams = new URLSearchParams({
            code: authResult.code!,
            ...(authResult.state && { state: authResult.state })
          });

          return {
            statusCode: 302,
            headers: {
              Location: `${authResult.redirect_uri}?${successParams.toString()}`
            },
            body: ''
          };
        }

      case '/oauth/token':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        // Parse token request
        let tokenRequest: any;
        const contentType = event.headers['Content-Type'] || event.headers['content-type'];
        
        if (contentType?.includes('application/x-www-form-urlencoded')) {
          // Parse form data
          const params = new URLSearchParams(event.body || '');
          tokenRequest = Object.fromEntries(params.entries());
        } else {
          // Parse JSON
          tokenRequest = JSON.parse(event.body || '{}');
        }

        // Extract client credentials from Authorization header if present
        const basicAuth = event.headers.Authorization || event.headers.authorization;
        if (basicAuth && basicAuth.startsWith('Basic ')) {
          const credentials = Buffer.from(basicAuth.substring(6), 'base64').toString();
          const [clientId, clientSecret] = credentials.split(':');
          tokenRequest.client_id = clientId;
          tokenRequest.client_secret = clientSecret;
        }

        const tokenResult = await idpAgent.token(tokenRequest);
        
        if (tokenResult.error) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: tokenResult.error,
              error_description: tokenResult.error_description
            })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(tokenResult)
        };

      case '/oauth/userinfo':
        if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return {
            statusCode: 401,
            headers: {
              ...headers,
              'WWW-Authenticate': 'Bearer realm="storytailor"'
            },
            body: JSON.stringify({ error: 'Unauthorized' })
          };
        }

        const accessToken = authHeader.substring(7);
        const userInfo = await idpAgent.getUserInfo(accessToken);

        if ('error' in userInfo) {
          return {
            statusCode: 401,
            headers: {
              ...headers,
              'WWW-Authenticate': `Bearer realm="storytailor", error="${userInfo.error}"`
            },
            body: JSON.stringify(userInfo)
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(userInfo)
        };

      case '/oauth/revoke':
        if (event.httpMethod !== 'POST') {
          return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
          };
        }

        const revokeRequest = JSON.parse(event.body || '{}');
        await idpAgent.revokeToken(revokeRequest.token, revokeRequest.token_type_hint);

        return {
          statusCode: 200,
          headers,
          body: ''
        };

      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found' })
        };
    }

  } catch (error: any) {
    console.error('IdP error:', error);
    
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
  console.log('IdP event handler invoked:', {
    source: event.source,
    detailType: event['detail-type'],
    requestId: context.requestId
  });

  try {
    const idpAgent = await initializeAgent();
    
    // Handle EventBridge event
    const result = await idpAgent.handleEvent({
      type: event['detail-type'],
      payload: event.detail
    });

    return {
      statusCode: 200,
      body: result
    };

  } catch (error: any) {
    console.error('IdP event handler error:', error);
    
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
  if (event.httpMethod || event.requestContext) {
    return httpHandler(event as APIGatewayProxyEvent, context);
  }
  
  // Otherwise treat as EventBridge event
  return eventHandler(event, context);
};
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const shared_1 = require("./shared");
const ConversationAgent_1 = require("./ConversationAgent");
let conversationAgent = null;
let logger = null;
async function getConversationAgent() {
    if (!conversationAgent) {
        logger = logger || (0, shared_1.createLogger)('conversation-agent');
        const config = {
            elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || '',
            elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID || '',
            redisUrl: process.env.REDIS_URL || '',
            supabaseUrl: process.env.SUPABASE_URL || '',
            supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
            s3Bucket: process.env.S3_BUCKET || '',
            logger
        };
        conversationAgent = new ConversationAgent_1.ConversationAgent(config);
        await conversationAgent.initialize();
    }
    return conversationAgent;
}
const handler = async (event, context) => {
    const startTime = Date.now();
    try {
        // Handle Lambda Function URL GET /health requests FIRST - before ANY initialization
        // Check multiple event structure formats to handle all Function URL variations
        const requestContext = event.requestContext;
        let rawPath = event.rawPath || requestContext?.http?.path || event.path;
        // Normalize path: remove double slashes, handle undefined
        if (rawPath) {
            rawPath = rawPath.replace(/\/+/g, '/'); // Replace multiple slashes with single slash
            if (!rawPath.startsWith('/'))
                rawPath = '/' + rawPath;
        }
        const method = requestContext?.http?.method || event.httpMethod;
        // Health check response (reused)
        const healthResponse = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                agent: 'conversation-agent',
                status: 'healthy',
                timestamp: new Date().toISOString()
            })
        };
        // Health check detection - comprehensive check for all possible event formats
        // Check if path contains 'health' or is exactly '/health' (normalized)
        if (rawPath && (rawPath === '/health' || rawPath === 'health' || rawPath.endsWith('/health'))) {
            if (method === 'GET' || !event.body) {
                // Return health check immediately without any initialization
                return healthResponse;
            }
        }
        // Also check if requestContext.http exists (Function URL v2 format)
        if (requestContext?.http) {
            const httpMethod = requestContext.http.method;
            let httpPath = rawPath || requestContext.http.path || '/';
            // Normalize httpPath too
            if (httpPath) {
                httpPath = httpPath.replace(/\/+/g, '/');
                if (!httpPath.startsWith('/'))
                    httpPath = '/' + httpPath;
            }
            if (httpMethod === 'GET' && (httpPath === '/health' || httpPath === 'health')) {
                return healthResponse;
            }
        }
        // Additional check: if no body and method is GET, might be health check
        // This handles cases where path might not be set correctly
        if (!event.body && method === 'GET') {
            // Check if this could be a health check by examining the request
            // For Function URLs, GET requests without body to /health endpoint
            if (!rawPath || rawPath === '/' || rawPath.includes('health')) {
                return healthResponse;
            }
        }
        // Now initialize logger (after health check handling)
        logger = logger || (0, shared_1.createLogger)('conversation-agent');
        // Defensive logging for non-health-check requests to debug event structure
        logger.info('Conversation Agent invoked', {
            requestId: context.awsRequestId,
            hasBody: !!event.body,
            hasAction: !!event.action,
            eventType: event.requestContext?.eventType || 'unknown',
            rawPath: event.rawPath,
            path: event.path,
            httpMethod: event.httpMethod,
            requestContextHttp: !!event.requestContext?.http,
            requestContextHttpMethod: requestContext?.http?.method,
            requestContextHttpPath: requestContext?.http?.path
        });
        // Handle WebSocket events
        if (event.requestContext?.eventType) {
            return await handleWebSocketEvent(event, context);
        }
        // Handle direct invocation
        let body = {};
        if (event.body) {
            try {
                // Handle base64 encoded body from Lambda Function URLs
                const bodyString = event.isBase64Encoded ?
                    Buffer.from(event.body, 'base64').toString('utf-8') :
                    event.body;
                body = JSON.parse(bodyString);
            }
            catch (e) {
                logger?.error('Failed to parse body', { error: e.message, body: event.body });
                body = {};
            }
        }
        const action = body?.action || event.action;
        if (!action) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    success: false,
                    error: 'Action is required',
                    availableActions: ['health', 'start_conversation', 'send_message', 'end_conversation', 'get_state', 'get_stats']
                })
            };
        }
        const agent = await getConversationAgent();
        switch (action) {
            case 'health':
                return await handleHealth();
            case 'start_conversation':
                return await handleStartConversation(agent, body);
            case 'send_message':
                return await handleSendMessage(agent, body);
            case 'end_conversation':
                return await handleEndConversation(agent, body);
            case 'get_state':
                return await handleGetState(agent, body);
            case 'get_stats':
                return await handleGetStats(agent);
            default:
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        success: false,
                        error: `Unknown action: ${action}`,
                        availableActions: ['health', 'start_conversation', 'send_message', 'end_conversation', 'get_state', 'get_stats']
                    })
                };
        }
    }
    catch (error) {
        logger?.error('Conversation Agent error', {
            error: error instanceof Error ? error.message : String(error),
            requestId: context.awsRequestId,
            duration: Date.now() - startTime
        });
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                requestId: context.awsRequestId
            })
        };
    }
};
exports.handler = handler;
async function handleWebSocketEvent(event, _context) {
    const eventType = event.requestContext.eventType;
    const connectionId = event.requestContext.connectionId;
    logger?.info('WebSocket event received', { eventType, connectionId });
    switch (eventType) {
        case 'CONNECT':
            return {
                statusCode: 200,
                body: 'Connected'
            };
        case 'DISCONNECT':
            try {
                const agent = await getConversationAgent();
                await agent.endConversation(connectionId);
            }
            catch (error) {
                logger?.error('Error handling disconnect', { error });
            }
            return {
                statusCode: 200,
                body: 'Disconnected'
            };
        case 'MESSAGE':
            try {
                const body = JSON.parse(event.body || '{}');
                const agent = await getConversationAgent();
                switch (body.type) {
                    case 'start_conversation':
                        await agent.startConversation(connectionId, body.userId, body.sessionId, body.metadata);
                        break;
                    case 'send_message':
                        await agent.sendMessage(connectionId, body.message, body.metadata);
                        break;
                    case 'end_conversation':
                        await agent.endConversation(connectionId);
                        break;
                    default:
                        logger?.warn('Unknown message type', { type: body.type });
                }
                return {
                    statusCode: 200,
                    body: 'Message processed'
                };
            }
            catch (error) {
                logger?.error('Error processing WebSocket message', { error });
                return {
                    statusCode: 500,
                    body: 'Error processing message'
                };
            }
        default:
            logger?.warn('Unknown WebSocket event type', { eventType });
            return {
                statusCode: 400,
                body: 'Unknown event type'
            };
    }
}
async function handleHealth() {
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            success: true,
            agent: 'conversation-agent',
            status: 'healthy',
            timestamp: new Date().toISOString()
        })
    };
}
async function handleStartConversation(agent, body) {
    const connectionId = body.connectionId;
    const userId = body.userId;
    const sessionId = body.sessionId;
    const metadata = body.metadata;
    if (!connectionId || !userId || !sessionId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'connectionId, userId, and sessionId are required'
            })
        };
    }
    try {
        const conversation = await agent.startConversation(connectionId, userId, sessionId, metadata);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                conversation
            })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}
async function handleSendMessage(agent, body) {
    const connectionId = body.connectionId;
    const message = body.message;
    const metadata = body.metadata;
    if (!connectionId || !message) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'connectionId and message are required'
            })
        };
    }
    try {
        await agent.sendMessage(connectionId, message, metadata);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true
            })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}
async function handleEndConversation(agent, body) {
    const connectionId = body.connectionId;
    if (!connectionId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'connectionId is required'
            })
        };
    }
    try {
        await agent.endConversation(connectionId);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true
            })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}
async function handleGetState(agent, body) {
    const connectionId = body.connectionId;
    if (!connectionId) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'connectionId is required'
            })
        };
    }
    try {
        const state = await agent.getConversationState(connectionId);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                state
            })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}
async function handleGetStats(agent) {
    try {
        const stats = await agent.getConnectionStats();
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: true,
                stats
            })
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            })
        };
    }
}
//# sourceMappingURL=lambda.js.map
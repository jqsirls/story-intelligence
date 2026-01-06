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
        logger = logger || (0, shared_1.createLogger)('conversation-agent');
        logger.info('Conversation Agent invoked', {
            requestId: context.requestId,
            hasBody: !!event.body,
            hasAction: !!event.action,
            eventType: event.requestContext?.eventType || 'unknown'
        });
        // Handle WebSocket events
        if (event.requestContext?.eventType) {
            return await handleWebSocketEvent(event, context);
        }
        // Handle direct invocation
        const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
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
            requestId: context.requestId,
            duration: Date.now() - startTime
        });
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                requestId: context.requestId
            })
        };
    }
};
exports.handler = handler;
async function handleWebSocketEvent(event, context) {
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
                const body = JSON.parse(event.body);
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
    const { connectionId, userId, sessionId, metadata } = body;
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
    const { connectionId, message, metadata } = body;
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
    const { connectionId } = body;
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
    const { connectionId } = body;
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
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const ContentSafetyPipeline_1 = require("./ContentSafetyPipeline");
let contentSafetyPipeline = null;
async function getContentSafetyPipeline() {
    if (!contentSafetyPipeline) {
        const config = {
            openaiApiKey: process.env.OPENAI_API_KEY || 'placeholder',
            supabaseUrl: process.env.SUPABASE_URL || 'https://lendybmmnlqelrhkhdyc.supabase.co',
            supabaseKey: process.env.SUPABASE_SERVICE_KEY || 'placeholder',
            redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
            logLevel: 'info',
            biasDetectionEnabled: true,
            realTimeMonitoringEnabled: true,
            alternativeContentGeneration: true,
            humanModerationWebhook: process.env.HUMAN_MODERATION_WEBHOOK || ''
        };
        contentSafetyPipeline = new ContentSafetyPipeline_1.ContentSafetyPipeline(config);
        await contentSafetyPipeline.initialize();
    }
    return contentSafetyPipeline;
}
const handler = async (event, context) => {
    try {
        console.log('Content Safety Agent invoked', { hasBody: !!event.body });
        // Handle Function URL GET /health requests (no body)
        if (event.requestContext?.http) {
            const method = event.requestContext.http.method;
            const path = event.rawPath || event.requestContext.http.path || '/';
            if (method === 'GET' && (path === '/health' || path === 'health')) {
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentName: 'content-safety',
                        success: true,
                        data: {
                            status: 'healthy',
                            service: 'content-safety-agent',
                            features: {
                                contentValidation: true,
                                riskAssessment: true,
                                biasDetection: true,
                                ageAppropriateness: true,
                                profanityFiltering: true,
                                personalInfoFiltering: true,
                                qualityAssurance: true,
                                realTimeMonitoring: true,
                                humanEscalation: true,
                                alternativeContentGeneration: true
                            }
                        }
                    })
                };
            }
        }
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Request body is required' })
            };
        }
        const body = JSON.parse(event.body);
        const { action } = body;
        if (!action) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Action is required',
                    availableActions: ['health', 'validate_content', 'assess_risk', 'filter_content']
                })
            };
        }
        const pipeline = await getContentSafetyPipeline();
        switch (action) {
            case 'health':
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentName: 'content-safety',
                        success: true,
                        data: {
                            status: 'healthy',
                            service: 'content-safety-agent',
                            features: {
                                contentValidation: true,
                                riskAssessment: true,
                                biasDetection: true,
                                ageAppropriateness: true,
                                profanityFiltering: true,
                                personalInfoFiltering: true,
                                qualityAssurance: true,
                                realTimeMonitoring: true,
                                humanEscalation: true,
                                alternativeContentGeneration: true
                            }
                        }
                    })
                };
            case 'validate_content':
                const { content, contentType = 'text', ageGroup = 'general' } = body;
                if (!content) {
                    return {
                        statusCode: 400,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Content is required for validation' })
                    };
                }
                try {
                    const request = {
                        content,
                        contentType: contentType,
                        userId: body.userId || 'anonymous',
                        sessionId: body.sessionId || 'default',
                        userAge: body.userAge,
                        context: body.context || {}
                    };
                    const validationResult = await pipeline.processContent(request);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: true,
                            data: {
                                isValid: validationResult.approved,
                                riskLevel: validationResult.riskLevel,
                                issues: validationResult.detailedFlags,
                                recommendations: validationResult.detailedFlags.map(flag => flag.suggestedFix),
                                alternativeContent: validationResult.alternativeContent,
                                confidence: validationResult.confidence,
                                flaggedCategories: validationResult.flaggedCategories
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Content validation failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: false,
                            error: error instanceof Error ? error.message : 'Content validation failed'
                        })
                    };
                }
            case 'assess_risk':
                const { prompt, userContext = {} } = body;
                if (!prompt) {
                    return {
                        statusCode: 400,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Prompt is required for risk assessment' })
                    };
                }
                try {
                    const request = {
                        content: prompt,
                        contentType: 'prompt',
                        userId: body.userId || 'anonymous',
                        sessionId: body.sessionId || 'default',
                        userAge: body.userAge,
                        context: userContext
                    };
                    const sanitizeResult = await pipeline.sanitizePrompt(request);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: true,
                            data: {
                                riskLevel: sanitizeResult.riskAssessment.level,
                                riskFactors: sanitizeResult.riskAssessment.warnings,
                                mitigationStrategies: sanitizeResult.riskAssessment.modifications,
                                isSafeToProceed: sanitizeResult.riskAssessment.level === 'low',
                                sanitizedPrompt: sanitizeResult.sanitizedPrompt
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Risk assessment failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: false,
                            error: error instanceof Error ? error.message : 'Risk assessment failed'
                        })
                    };
                }
            case 'filter_content':
                const { text, filterType = 'comprehensive' } = body;
                if (!text) {
                    return {
                        statusCode: 400,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ error: 'Text is required for filtering' })
                    };
                }
                try {
                    const request = {
                        content: text,
                        contentType: 'description',
                        userId: body.userId || 'anonymous',
                        sessionId: body.sessionId || 'default',
                        userAge: body.userAge,
                        context: body.context || {}
                    };
                    const filterResult = await pipeline.processContent(request);
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: true,
                            data: {
                                filteredText: filterResult.approved ? text : filterResult.alternativeContent || text,
                                originalText: text,
                                violations: filterResult.detailedFlags,
                                confidence: filterResult.confidence,
                                flaggedCategories: filterResult.flaggedCategories,
                                riskLevel: filterResult.riskLevel
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Content filtering failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'content-safety',
                            success: false,
                            error: error instanceof Error ? error.message : 'Content filtering failed'
                        })
                    };
                }
            default:
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentName: 'content-safety',
                        success: false,
                        error: `Unknown action: ${action}`,
                        availableActions: ['health', 'validate_content', 'assess_risk', 'filter_content']
                    })
                };
        }
    }
    catch (error) {
        console.error('Content Safety Agent error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName: 'content-safety',
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=lambda.js.map
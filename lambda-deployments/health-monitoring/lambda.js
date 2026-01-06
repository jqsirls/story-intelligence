"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const HealthMonitoringOrchestrator_1 = require("./HealthMonitoringOrchestrator");
let healthMonitoringOrchestrator = null;
async function getHealthMonitoringOrchestrator() {
    if (!healthMonitoringOrchestrator) {
        const config = {
            services: [
                'storytailor-router-agent-staging',
                'storytailor-content-agent-staging',
                'storytailor-emotion-agent-staging',
                'storytailor-library-agent-staging',
                'storytailor-smart-home-agent-staging',
                'storytailor-commerce-agent-staging',
                'storytailor-auth-agent-staging',
                'storytailor-voice-synthesis-agent-staging',
                'storytailor-content-safety-agent-staging',
                'supabase',
                'openai',
                'elevenlabs',
                'redis'
            ],
            checkInterval: 30000,
            alertThresholds: {
                responseTime: 5000,
                errorRate: 0.1,
                uptime: 99.0
            },
            notifications: {
                slack: process.env.SLACK_WEBHOOK_URL ? { webhook: process.env.SLACK_WEBHOOK_URL, channel: '#alerts' } : undefined,
                email: process.env.EMAIL_NOTIFICATIONS ? { to: [process.env.EMAIL_NOTIFICATIONS], smtp: {} } : undefined,
                pagerduty: process.env.PAGERDUTY_API_KEY ? { apiKey: process.env.PAGERDUTY_API_KEY, serviceKey: process.env.PAGERDUTY_SERVICE_KEY || '' } : undefined
            }
        };
        // Create a simple logger for Lambda
        const logger = {
            info: (message, meta) => console.log(`[INFO] ${message}`, meta || ''),
            warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ''),
            error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ''),
            debug: (message, meta) => console.debug(`[DEBUG] ${message}`, meta || '')
        };
        healthMonitoringOrchestrator = new HealthMonitoringOrchestrator_1.HealthMonitoringOrchestrator(config, logger);
    }
    return healthMonitoringOrchestrator;
}
const handler = async (event, _context) => {
    try {
        // Handle Lambda Function URL GET /health requests FIRST - before ANY processing
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
        // Health check response object (reused)
        const healthResponse = {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName: 'health-monitoring',
                success: true,
                data: {
                    status: 'healthy',
                    service: 'health-monitoring-agent',
                    features: {
                        serviceMonitoring: true,
                        healthChecks: true,
                        alerting: true,
                        metricsCollection: true,
                        realTimeMonitoring: true,
                        notificationSystem: true
                    }
                }
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
        if (!event.body && method === 'GET') {
            // Check if this could be a health check
            if (!rawPath || rawPath === '/' || rawPath.includes('health')) {
                return healthResponse;
            }
        }
        // Defensive logging for non-health-check requests to debug event structure
        console.log('Health Monitoring Agent invoked', {
            hasBody: !!event.body,
            hasRequestContext: !!event.requestContext,
            rawPath: event.rawPath,
            path: event.path,
            requestContextHttp: !!requestContext?.http,
            requestContextHttpMethod: requestContext?.http?.method,
            requestContextHttpPath: requestContext?.http?.path
        });
        // For POST requests, check if it's a health check action before requiring body
        if (event.body) {
            try {
                const body = JSON.parse(event.body);
                if (body.action === 'health') {
                    return healthResponse;
                }
            }
            catch (e) {
                // If body parsing fails, continue to normal flow
            }
        }
        // Only require body if this is NOT a health check (already handled above)
        // If no body and we got here, it's not a health check, so return appropriate error
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Request body is required',
                    availableActions: ['health', 'check_services', 'get_metrics', 'get_alerts', 'start_monitoring', 'stop_monitoring']
                })
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
                    availableActions: ['health', 'check_services', 'get_metrics', 'get_alerts', 'start_monitoring', 'stop_monitoring']
                })
            };
        }
        // Only initialize orchestrator for non-health actions
        const orchestrator = await getHealthMonitoringOrchestrator();
        switch (action) {
            case 'health':
                return {
                    statusCode: 200,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentName: 'health-monitoring',
                        success: true,
                        data: {
                            status: 'healthy',
                            service: 'health-monitoring-agent',
                            features: {
                                serviceMonitoring: true,
                                healthChecks: true,
                                alerting: true,
                                metricsCollection: true,
                                realTimeMonitoring: true,
                                notificationSystem: true
                            }
                        }
                    })
                };
            case 'check_services':
                try {
                    const systemHealth = await orchestrator.getSystemHealth();
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: true,
                            data: {
                                services: systemHealth.services,
                                summary: {
                                    total: systemHealth.services.length,
                                    healthy: systemHealth.services.filter((s) => s.status === 'healthy').length,
                                    unhealthy: systemHealth.services.filter((s) => s.status === 'unhealthy').length,
                                    degraded: systemHealth.services.filter((s) => s.status === 'degraded').length
                                },
                                overall: systemHealth.overall
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Service health check failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: false,
                            error: error instanceof Error ? error.message : 'Service health check failed'
                        })
                    };
                }
            case 'get_metrics':
                try {
                    const systemHealth = await orchestrator.getSystemHealth();
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: true,
                            data: {
                                metrics: systemHealth.metrics,
                                timestamp: systemHealth.timestamp.toISOString()
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Metrics retrieval failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: false,
                            error: error instanceof Error ? error.message : 'Metrics retrieval failed'
                        })
                    };
                }
            case 'get_alerts':
                try {
                    const systemHealth = await orchestrator.getSystemHealth();
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: true,
                            data: {
                                alerts: systemHealth.alerts,
                                count: systemHealth.alerts.length,
                                timestamp: systemHealth.timestamp.toISOString()
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Alerts retrieval failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: false,
                            error: error instanceof Error ? error.message : 'Alerts retrieval failed'
                        })
                    };
                }
            case 'start_monitoring':
                try {
                    await orchestrator.start();
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: true,
                            data: {
                                message: 'Monitoring started successfully',
                                timestamp: new Date().toISOString()
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Start monitoring failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: false,
                            error: error instanceof Error ? error.message : 'Start monitoring failed'
                        })
                    };
                }
            case 'stop_monitoring':
                try {
                    orchestrator.stop();
                    return {
                        statusCode: 200,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: true,
                            data: {
                                message: 'Monitoring stopped successfully',
                                timestamp: new Date().toISOString()
                            }
                        })
                    };
                }
                catch (error) {
                    console.error('Stop monitoring failed:', error);
                    return {
                        statusCode: 500,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            agentName: 'health-monitoring',
                            success: false,
                            error: error instanceof Error ? error.message : 'Stop monitoring failed'
                        })
                    };
                }
            default:
                return {
                    statusCode: 400,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        agentName: 'health-monitoring',
                        success: false,
                        error: `Unknown action: ${action}`,
                        availableActions: ['health', 'check_services', 'get_metrics', 'get_alerts', 'start_monitoring', 'stop_monitoring']
                    })
                };
        }
    }
    catch (error) {
        console.error('Health Monitoring Agent error:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentName: 'health-monitoring',
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error'
            })
        };
    }
};
exports.handler = handler;

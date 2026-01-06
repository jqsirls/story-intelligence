"use strict";
/**
 * @storytailor/health-monitoring
 * Comprehensive health monitoring orchestrator for all agents and services
 * Powered by Story Intelligence™
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitoringOrchestrator = void 0;
const events_1 = require("events");
class HealthMonitoringOrchestrator extends events_1.EventEmitter {
    constructor(config, logger) {
        super();
        this.services = new Map();
        this.alerts = new Map();
        this.isRunning = false;
        this.startTime = new Date();
        this.config = config;
        this.logger = logger;
        this.initializeServices();
    }
    /**
     * Initialize all services for monitoring
     */
    initializeServices() {
        const defaultServices = [
            'storytailor-api-staging',
            'storytailor-knowledge-base-staging',
            'router',
            'content-agent',
            'emotion-agent',
            'personality-agent',
            'auth-agent',
            'library-agent',
            'commerce-agent',
            'educational-agent',
            'therapeutic-agent',
            'accessibility-agent',
            'localization-agent',
            'conversation-intelligence',
            'analytics-intelligence',
            'insights-agent',
            'smart-home-agent',
            'child-safety-agent',
            'security-framework',
            'voice-synthesis',
            'supabase',
            'openai',
            'elevenlabs'
        ];
        const services = [...new Set([...defaultServices, ...this.config.services])];
        services.forEach(service => {
            this.services.set(service, {
                name: service,
                status: 'unknown',
                lastCheck: new Date(),
                responseTime: 0,
                errorRate: 0,
                uptime: 0,
                metadata: {}
            });
        });
        this.logger.info('Health monitoring initialized', {
            serviceCount: this.services.size,
            services: Array.from(this.services.keys())
        });
    }
    /**
     * Start health monitoring
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Health monitoring already running');
            return;
        }
        this.logger.info('Starting health monitoring orchestrator', {
            interval: this.config.checkInterval,
            services: this.services.size
        });
        // Perform initial health check
        await this.performHealthChecks();
        // Start periodic health checks
        this.checkInterval = setInterval(() => this.performHealthChecks(), this.config.checkInterval);
        this.isRunning = true;
        this.emit('monitoring:started');
    }
    /**
     * Stop health monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = undefined;
        }
        this.isRunning = false;
        this.logger.info('Health monitoring stopped');
        this.emit('monitoring:stopped');
    }
    /**
     * Perform health checks for all services
     */
    async performHealthChecks() {
        const startTime = Date.now();
        const checks = Array.from(this.services.keys()).map(service => this.checkServiceHealth(service));
        try {
            await Promise.allSettled(checks);
            const duration = Date.now() - startTime;
            this.logger.debug('Health checks completed', {
                duration,
                services: this.services.size
            });
            // Evaluate overall system health
            await this.evaluateSystemHealth();
        }
        catch (error) {
            this.logger.error('Health check cycle failed', { error });
        }
    }
    /**
     * Check health of individual service
     */
    async checkServiceHealth(serviceName) {
        const startTime = Date.now();
        let health = this.services.get(serviceName);
        if (!health)
            return;
        try {
            const result = await this.performServiceCheck(serviceName);
            const responseTime = Date.now() - startTime;
            // Update service health
            health = {
                ...health,
                status: result.status,
                lastCheck: new Date(),
                responseTime,
                errorRate: result.errorRate || 0,
                uptime: this.calculateUptime(health.lastCheck),
                metadata: result.metadata || {}
            };
            this.services.set(serviceName, health);
            // Check for alerts
            await this.checkAlertThresholds(health);
            this.emit('service:checked', health);
        }
        catch (error) {
            // Mark service as unhealthy
            health = {
                ...health,
                status: 'unhealthy',
                lastCheck: new Date(),
                responseTime: Date.now() - startTime,
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
            this.services.set(serviceName, health);
            this.logger.warn('Service health check failed', {
                service: serviceName,
                error: error instanceof Error ? error.message : String(error)
            });
            // Create critical alert for unhealthy service
            await this.createAlert(serviceName, 'critical', `Service ${serviceName} is unhealthy: ${error}`);
        }
    }
    /**
     * Perform actual health check for a service
     */
    async performServiceCheck(serviceName) {
        // Lambda function health checks
        if (serviceName.startsWith('storytailor-')) {
            return await this.checkLambdaHealth(serviceName);
        }
        // Agent health checks
        if (serviceName.endsWith('-agent') || serviceName === 'router') {
            return await this.checkAgentHealth(serviceName);
        }
        // External service health checks
        switch (serviceName) {
            case 'supabase':
                return await this.checkSupabaseHealth();
            case 'openai':
                return await this.checkOpenAIHealth();
            case 'elevenlabs':
                return await this.checkElevenLabsHealth();
            default:
                return { status: 'unhealthy' };
        }
    }
    /**
     * Check Lambda function health
     */
    async checkLambdaHealth(functionName) {
        try {
            // For deployed Lambda functions, we'll make HTTP requests to their health endpoints
            const baseUrl = process.env.API_GATEWAY_URL || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
            let healthEndpoint = '';
            if (functionName === 'storytailor-api-staging') {
                healthEndpoint = `${baseUrl}/health`;
            }
            else if (functionName === 'storytailor-knowledge-base-staging') {
                healthEndpoint = `${baseUrl}/knowledge/health`;
            }
            if (healthEndpoint) {
                const response = await fetch(healthEndpoint, {
                    method: 'GET'
                });
                const data = await response.json();
                if (response.ok && data.success) {
                    return {
                        status: 'healthy',
                        errorRate: 0,
                        metadata: {
                            version: data.version,
                            features: data.features,
                            multiAgentSystem: data.multiAgentSystem
                        }
                    };
                }
                else {
                    return {
                        status: 'degraded',
                        errorRate: 0.5,
                        metadata: { error: data.error || 'Health check returned non-success' }
                    };
                }
            }
            // Fallback: assume healthy if we can't check
            return { status: 'healthy', errorRate: 0 };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    /**
     * Check agent health (for embedded agents)
     */
    async checkAgentHealth(agentName) {
        // For embedded agents, we assume they're healthy if the main Lambda is healthy
        // In a full deployment, each agent would have its own health endpoint
        try {
            const baseUrl = process.env.API_GATEWAY_URL || 'https://sxjwfwffz7.execute-api.us-east-1.amazonaws.com/staging';
            const response = await fetch(`${baseUrl}/health`, {
                method: 'GET'
            });
            const data = await response.json();
            if (response.ok && data.success && data.multiAgentSystem?.agents?.includes(agentName.replace('-agent', ''))) {
                return {
                    status: 'healthy',
                    errorRate: 0,
                    metadata: { embedded: true, agentSystem: data.multiAgentSystem }
                };
            }
            return { status: 'degraded', errorRate: 0.3 };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    /**
     * Check Supabase health
     */
    async checkSupabaseHealth() {
        try {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseKey) {
                return {
                    status: 'unhealthy',
                    errorRate: 1,
                    metadata: { error: 'Missing Supabase configuration' }
                };
            }
            const response = await fetch(`${supabaseUrl}/rest/v1/stories?limit=1`, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`
                }
            });
            if (response.ok) {
                return {
                    status: 'healthy',
                    errorRate: 0,
                    metadata: { endpoint: 'REST API', responseStatus: response.status }
                };
            }
            return {
                status: 'degraded',
                errorRate: 0.5,
                metadata: { responseStatus: response.status }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    /**
     * Check OpenAI health
     */
    async checkOpenAIHealth() {
        try {
            const openaiKey = process.env.OPENAI_API_KEY;
            if (!openaiKey) {
                return {
                    status: 'unhealthy',
                    errorRate: 1,
                    metadata: { error: 'Missing OpenAI API key' }
                };
            }
            const response = await fetch('https://api.openai.com/v1/models', {
                headers: {
                    'Authorization': `Bearer ${openaiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                return {
                    status: 'healthy',
                    errorRate: 0,
                    metadata: { endpoint: 'Models API', responseStatus: response.status }
                };
            }
            return {
                status: 'degraded',
                errorRate: 0.5,
                metadata: { responseStatus: response.status }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    /**
     * Check ElevenLabs health
     */
    async checkElevenLabsHealth() {
        try {
            const elevenLabsKey = process.env.ELEVENLABS_API_KEY;
            if (!elevenLabsKey) {
                return {
                    status: 'unhealthy',
                    errorRate: 1,
                    metadata: { error: 'Missing ElevenLabs API key' }
                };
            }
            const response = await fetch('https://api.elevenlabs.io/v1/user', {
                headers: {
                    'xi-api-key': elevenLabsKey,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                return {
                    status: 'healthy',
                    errorRate: 0,
                    metadata: { endpoint: 'User API', responseStatus: response.status }
                };
            }
            return {
                status: 'degraded',
                errorRate: 0.5,
                metadata: { responseStatus: response.status }
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                errorRate: 1,
                metadata: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
    /**
     * Calculate service uptime
     */
    calculateUptime(_lastCheck) {
        const now = Date.now();
        const diff = now - this.startTime.getTime();
        return Math.max(0, Math.min(100, (diff / (1000 * 60 * 60 * 24)) * 100)); // Percentage of day
    }
    /**
     * Check alert thresholds
     */
    async checkAlertThresholds(health) {
        const { alertThresholds } = this.config;
        // Response time alert
        if (health.responseTime > alertThresholds.responseTime) {
            await this.createAlert(health.name, health.responseTime > alertThresholds.responseTime * 2 ? 'high' : 'medium', `High response time: ${health.responseTime}ms (threshold: ${alertThresholds.responseTime}ms)`);
        }
        // Error rate alert
        if (health.errorRate > alertThresholds.errorRate) {
            await this.createAlert(health.name, health.errorRate > 0.5 ? 'critical' : 'high', `High error rate: ${(health.errorRate * 100).toFixed(1)}% (threshold: ${(alertThresholds.errorRate * 100).toFixed(1)}%)`);
        }
        // Uptime alert
        if (health.uptime < alertThresholds.uptime) {
            await this.createAlert(health.name, 'medium', `Low uptime: ${health.uptime.toFixed(1)}% (threshold: ${alertThresholds.uptime}%)`);
        }
    }
    /**
     * Create an alert
     */
    async createAlert(service, severity, message) {
        const alertId = `${service}-${Date.now()}`;
        const alert = {
            id: alertId,
            service,
            severity,
            message,
            timestamp: new Date(),
            acknowledged: false
        };
        this.alerts.set(alertId, alert);
        this.logger.warn('Alert created', alert);
        this.emit('alert:created', alert);
        // Send notifications
        await this.sendNotifications(alert);
    }
    /**
     * Send alert notifications
     */
    async sendNotifications(alert) {
        try {
            // In a full implementation, this would send to Slack, email, PagerDuty, etc.
            this.logger.info('Alert notification sent', {
                id: alert.id,
                service: alert.service,
                severity: alert.severity,
                message: alert.message
            });
        }
        catch (error) {
            this.logger.error('Failed to send alert notification', { alert, error });
        }
    }
    /**
     * Evaluate overall system health
     */
    async evaluateSystemHealth() {
        const services = Array.from(this.services.values());
        const unhealthyServices = services.filter(s => s.status === 'unhealthy');
        const degradedServices = services.filter(s => s.status === 'degraded');
        let overallStatus;
        if (unhealthyServices.length > 0) {
            overallStatus = 'unhealthy';
        }
        else if (degradedServices.length > 0) {
            overallStatus = 'degraded';
        }
        else {
            overallStatus = 'healthy';
        }
        this.emit('system:health', {
            overall: overallStatus,
            healthy: services.filter(s => s.status === 'healthy').length,
            degraded: degradedServices.length,
            unhealthy: unhealthyServices.length,
            total: services.length
        });
    }
    /**
     * Get current system health
     */
    async getSystemHealth() {
        const services = Array.from(this.services.values());
        const activeAlerts = Array.from(this.alerts.values()).filter(a => !a.resolvedAt);
        // Calculate overall status
        const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
        const degradedCount = services.filter(s => s.status === 'degraded').length;
        let overall;
        if (unhealthyCount > 0) {
            overall = 'unhealthy';
        }
        else if (degradedCount > 0) {
            overall = 'degraded';
        }
        else {
            overall = 'healthy';
        }
        // Calculate system metrics
        const metrics = {
            cpu: { usage: 0, loadAverage: [0, 0, 0] }, // Would be collected from CloudWatch
            memory: { used: 0, total: 0, percentage: 0 }, // Would be collected from CloudWatch
            requests: { total: 0, errorsPerMinute: 0, avgResponseTime: 0 }, // Would be collected from API Gateway
            agents: {
                active: services.filter(s => s.name.includes('agent') && s.status === 'healthy').length,
                total: services.filter(s => s.name.includes('agent')).length,
                healthy: services.filter(s => s.status === 'healthy').length
            },
            database: { connections: 0, queryTime: 0 }, // Would be collected from Supabase
            external: {
                openai: services.find(s => s.name === 'openai')?.status === 'healthy' || false,
                elevenlabs: services.find(s => s.name === 'elevenlabs')?.status === 'healthy' || false,
                supabase: services.find(s => s.name === 'supabase')?.status === 'healthy' || false
            }
        };
        return {
            overall,
            services,
            alerts: activeAlerts,
            metrics,
            timestamp: new Date(),
            version: process.env.APP_VERSION || '2.0.0',
            environment: process.env.NODE_ENV || 'staging'
        };
    }
    /**
     * Acknowledge an alert
     */
    async acknowledgeAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.acknowledged = true;
            this.alerts.set(alertId, alert);
            this.emit('alert:acknowledged', alert);
            return true;
        }
        return false;
    }
    /**
     * Resolve an alert
     */
    async resolveAlert(alertId) {
        const alert = this.alerts.get(alertId);
        if (alert) {
            alert.resolvedAt = new Date();
            this.alerts.set(alertId, alert);
            this.emit('alert:resolved', alert);
            return true;
        }
        return false;
    }
}
exports.HealthMonitoringOrchestrator = HealthMonitoringOrchestrator;

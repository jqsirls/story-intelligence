"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
class MetricsCollector {
    constructor(supabase, logger, config) {
        this.isRunning = false;
        this.alertRules = new Map();
        this.metricHistory = new Map();
        this.supabase = supabase;
        this.logger = logger;
        this.config = config;
    }
    /**
     * Start metrics collection
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('MetricsCollector is already running');
            return;
        }
        try {
            // Load alert rules from database
            await this.loadAlertRules();
            // Start collection interval
            this.collectionInterval = setInterval(() => this.collectMetrics(), this.config.collectionInterval);
            this.isRunning = true;
            this.logger.info('MetricsCollector started', {
                interval: this.config.collectionInterval,
                retentionDays: this.config.retentionDays
            });
        }
        catch (error) {
            this.logger.error('Failed to start MetricsCollector', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Stop metrics collection
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        if (this.collectionInterval) {
            clearInterval(this.collectionInterval);
            this.collectionInterval = undefined;
        }
        this.isRunning = false;
        this.logger.info('MetricsCollector stopped');
    }
    /**
     * Collect system metrics
     */
    async collectMetrics() {
        try {
            const metrics = await this.gatherSystemMetrics();
            // Store metrics in database
            await this.storeMetrics(metrics);
            // Check alert rules
            await this.checkAlerts(metrics);
            // Send to external monitoring (Datadog)
            if (this.config.datadogApiKey) {
                await this.sendToDatadog(metrics);
            }
            this.logger.debug('Metrics collected successfully', {
                timestamp: metrics.timestamp,
                eventsPublished: metrics.eventSystem.eventsPublished,
                eventsProcessed: metrics.eventSystem.eventsProcessed
            });
        }
        catch (error) {
            this.logger.error('Error collecting metrics', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Gather system metrics from various sources
     */
    async gatherSystemMetrics() {
        const timestamp = new Date();
        // System metrics
        const cpuUsage = process.cpuUsage();
        const memoryUsage = process.memoryUsage();
        const loadAverage = require('os').loadavg();
        // Event system metrics
        const eventMetrics = await this.getEventSystemMetrics();
        // Agent metrics
        const agentMetrics = await this.getAgentMetrics();
        return {
            timestamp,
            cpu: {
                usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
                loadAverage
            },
            memory: {
                used: memoryUsage.heapUsed,
                total: memoryUsage.heapTotal,
                percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
            },
            eventSystem: eventMetrics,
            agents: agentMetrics
        };
    }
    /**
     * Get event system specific metrics
     */
    async getEventSystemMetrics() {
        try {
            // Get metrics from the last minute
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            const { data: publishMetrics, error: publishError } = await this.supabase
                .from('event_metrics')
                .select('*')
                .gte('processed_at', oneMinuteAgo.toISOString());
            if (publishError) {
                throw new Error(`Failed to get publish metrics: ${publishError.message}`);
            }
            const eventsPublished = publishMetrics?.length || 0;
            const eventsProcessed = publishMetrics?.filter(m => m.success).length || 0;
            const averageLatency = eventsPublished > 0
                ? publishMetrics.reduce((sum, m) => sum + m.processing_time_ms, 0) / eventsPublished
                : 0;
            const errorRate = eventsPublished > 0
                ? (eventsPublished - eventsProcessed) / eventsPublished
                : 0;
            // Queue depth would come from SQS metrics in a real implementation
            const queueDepth = 0;
            return {
                eventsPublished,
                eventsProcessed,
                averageLatency,
                errorRate,
                queueDepth
            };
        }
        catch (error) {
            this.logger.error('Error getting event system metrics', { error });
            return {
                eventsPublished: 0,
                eventsProcessed: 0,
                averageLatency: 0,
                errorRate: 0,
                queueDepth: 0
            };
        }
    }
    /**
     * Get agent-specific metrics
     */
    async getAgentMetrics() {
        try {
            const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
            const { data: agentData, error } = await this.supabase
                .from('event_metrics')
                .select('source, processing_time_ms, success')
                .gte('processed_at', oneMinuteAgo.toISOString());
            if (error) {
                throw new Error(`Failed to get agent metrics: ${error.message}`);
            }
            const agentMetrics = {};
            // Group by agent (source)
            const agentGroups = (agentData || []).reduce((groups, metric) => {
                if (!groups[metric.source]) {
                    groups[metric.source] = [];
                }
                groups[metric.source].push(metric);
                return groups;
            }, {});
            // Calculate metrics for each agent
            for (const [agentName, metrics] of Object.entries(agentGroups)) {
                const requestCount = metrics.length;
                const averageResponseTime = requestCount > 0
                    ? metrics.reduce((sum, m) => sum + m.processing_time_ms, 0) / requestCount
                    : 0;
                const errorCount = metrics.filter(m => !m.success).length;
                agentMetrics[agentName] = {
                    requestCount,
                    averageResponseTime,
                    errorCount,
                    activeConnections: 0 // Would need to track this separately
                };
            }
            return agentMetrics;
        }
        catch (error) {
            this.logger.error('Error getting agent metrics', { error });
            return {};
        }
    }
    /**
     * Store metrics in database
     */
    async storeMetrics(metrics) {
        try {
            const { error } = await this.supabase
                .from('system_metrics')
                .insert({
                timestamp: metrics.timestamp.toISOString(),
                cpu_usage: metrics.cpu.usage,
                cpu_load_average: metrics.cpu.loadAverage,
                memory_used: metrics.memory.used,
                memory_total: metrics.memory.total,
                memory_percentage: metrics.memory.percentage,
                events_published: metrics.eventSystem.eventsPublished,
                events_processed: metrics.eventSystem.eventsProcessed,
                average_latency: metrics.eventSystem.averageLatency,
                error_rate: metrics.eventSystem.errorRate,
                queue_depth: metrics.eventSystem.queueDepth,
                agent_metrics: metrics.agents
            });
            if (error) {
                throw new Error(`Failed to store metrics: ${error.message}`);
            }
        }
        catch (error) {
            this.logger.error('Error storing metrics', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Check alert rules against current metrics
     */
    async checkAlerts(metrics) {
        for (const [ruleId, rule] of this.alertRules) {
            if (!rule.enabled) {
                continue;
            }
            try {
                const metricValue = this.getMetricValue(metrics, rule.metric);
                const shouldAlert = this.evaluateAlertCondition(metricValue, rule);
                if (shouldAlert) {
                    await this.triggerAlert(rule, metricValue, metrics.timestamp);
                }
            }
            catch (error) {
                this.logger.error('Error checking alert rule', {
                    ruleId,
                    ruleName: rule.name,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }
    /**
     * Get metric value by path
     */
    getMetricValue(metrics, metricPath) {
        const parts = metricPath.split('.');
        let value = metrics;
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            }
            else {
                throw new Error(`Metric path not found: ${metricPath}`);
            }
        }
        if (typeof value !== 'number') {
            throw new Error(`Metric value is not a number: ${metricPath}`);
        }
        return value;
    }
    /**
     * Evaluate alert condition
     */
    evaluateAlertCondition(value, rule) {
        switch (rule.operator) {
            case 'gt': return value > rule.threshold;
            case 'gte': return value >= rule.threshold;
            case 'lt': return value < rule.threshold;
            case 'lte': return value <= rule.threshold;
            case 'eq': return value === rule.threshold;
            default: return false;
        }
    }
    /**
     * Trigger an alert
     */
    async triggerAlert(rule, value, timestamp) {
        try {
            // Check if alert was recently triggered (avoid spam)
            if (rule.lastTriggered) {
                const timeSinceLastAlert = timestamp.getTime() - rule.lastTriggered.getTime();
                if (timeSinceLastAlert < rule.duration * 1000) {
                    return; // Too soon to trigger again
                }
            }
            // Store alert in database
            const { error } = await this.supabase
                .from('system_alerts')
                .insert({
                rule_id: rule.id,
                rule_name: rule.name,
                metric: rule.metric,
                threshold: rule.threshold,
                actual_value: value,
                severity: rule.severity,
                triggered_at: timestamp.toISOString(),
                resolved_at: null
            });
            if (error) {
                throw new Error(`Failed to store alert: ${error.message}`);
            }
            // Update last triggered time
            rule.lastTriggered = timestamp;
            this.alertRules.set(rule.id, rule);
            this.logger.warn('Alert triggered', {
                ruleId: rule.id,
                ruleName: rule.name,
                metric: rule.metric,
                threshold: rule.threshold,
                actualValue: value,
                severity: rule.severity
            });
            // Send to external alerting system (PagerDuty, Slack, etc.)
            await this.sendExternalAlert(rule, value, timestamp);
        }
        catch (error) {
            this.logger.error('Error triggering alert', {
                ruleId: rule.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Send alert to external system
     */
    async sendExternalAlert(rule, value, timestamp) {
        // In a real implementation, this would send to PagerDuty, Slack, etc.
        this.logger.info('External alert would be sent', {
            rule: rule.name,
            value,
            timestamp
        });
    }
    /**
     * Send metrics to Datadog
     */
    async sendToDatadog(metrics) {
        if (!this.config.datadogApiKey) {
            return;
        }
        try {
            // In a real implementation, this would use the Datadog API
            this.logger.debug('Metrics would be sent to Datadog', {
                timestamp: metrics.timestamp,
                metricsCount: Object.keys(metrics).length
            });
        }
        catch (error) {
            this.logger.error('Error sending metrics to Datadog', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Load alert rules from database
     */
    async loadAlertRules() {
        try {
            const { data: rules, error } = await this.supabase
                .from('alert_rules')
                .select('*')
                .eq('enabled', true);
            if (error) {
                throw new Error(`Failed to load alert rules: ${error.message}`);
            }
            this.alertRules.clear();
            (rules || []).forEach(rule => {
                this.alertRules.set(rule.id, {
                    id: rule.id,
                    name: rule.name,
                    metric: rule.metric,
                    threshold: rule.threshold,
                    operator: rule.operator,
                    duration: rule.duration,
                    severity: rule.severity,
                    enabled: rule.enabled,
                    lastTriggered: rule.last_triggered ? new Date(rule.last_triggered) : undefined
                });
            });
            this.logger.info('Alert rules loaded', {
                count: this.alertRules.size
            });
        }
        catch (error) {
            this.logger.error('Error loading alert rules', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Add or update an alert rule
     */
    async setAlertRule(rule) {
        try {
            const { data, error } = await this.supabase
                .from('alert_rules')
                .upsert({
                name: rule.name,
                metric: rule.metric,
                threshold: rule.threshold,
                operator: rule.operator,
                duration: rule.duration,
                severity: rule.severity,
                enabled: rule.enabled
            })
                .select()
                .single();
            if (error) {
                throw new Error(`Failed to set alert rule: ${error.message}`);
            }
            const alertRule = {
                id: data.id,
                ...rule
            };
            this.alertRules.set(data.id, alertRule);
            this.logger.info('Alert rule set', {
                ruleId: data.id,
                ruleName: rule.name
            });
            return data.id;
        }
        catch (error) {
            this.logger.error('Error setting alert rule', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Get current metrics
     */
    async getCurrentMetrics() {
        return await this.gatherSystemMetrics();
    }
    /**
     * Get metrics history
     */
    async getMetricsHistory(startTime, endTime, interval = 'minute') {
        try {
            const { data, error } = await this.supabase
                .from('system_metrics')
                .select('*')
                .gte('timestamp', startTime.toISOString())
                .lte('timestamp', endTime.toISOString())
                .order('timestamp', { ascending: true });
            if (error) {
                throw new Error(`Failed to get metrics history: ${error.message}`);
            }
            return (data || []).map(row => ({
                timestamp: new Date(row.timestamp),
                cpu: {
                    usage: row.cpu_usage,
                    loadAverage: row.cpu_load_average
                },
                memory: {
                    used: row.memory_used,
                    total: row.memory_total,
                    percentage: row.memory_percentage
                },
                eventSystem: {
                    eventsPublished: row.events_published,
                    eventsProcessed: row.events_processed,
                    averageLatency: row.average_latency,
                    errorRate: row.error_rate,
                    queueDepth: row.queue_depth
                },
                agents: row.agent_metrics || {}
            }));
        }
        catch (error) {
            this.logger.error('Error getting metrics history', {
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }
    /**
     * Health check
     */
    async healthCheck() {
        return {
            status: this.isRunning ? 'healthy' : 'unhealthy',
            running: this.isRunning,
            alertRules: this.alertRules.size,
            lastCollection: null, // Would track this in a real implementation
            timestamp: new Date().toISOString()
        };
    }
}
exports.MetricsCollector = MetricsCollector;

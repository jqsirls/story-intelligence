"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentSafetyPipeline = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const redis_1 = require("redis");
const winston_1 = require("winston");
const PreGenerationFilterManager_1 = require("./filters/PreGenerationFilterManager");
const PostGenerationValidatorManager_1 = require("./validators/PostGenerationValidatorManager");
const BiasDetectionEngine_1 = require("./bias/BiasDetectionEngine");
const QualityAssuranceEngine_1 = require("./quality/QualityAssuranceEngine");
const RealTimeMonitor_1 = require("./monitoring/RealTimeMonitor");
const HumanEscalationManager_1 = require("./escalation/HumanEscalationManager");
const AlternativeContentGenerator_1 = require("./generation/AlternativeContentGenerator");
class ContentSafetyPipeline {
    constructor(config) {
        this.metrics = {
            totalRequests: 0,
            approvedContent: 0,
            rejectedContent: 0,
            humanEscalations: 0,
            averageProcessingTime: 0,
            biasDetections: 0,
            qualityIssues: 0,
            alternativeContentGenerated: 0,
            byCategory: {},
            byRiskLevel: {}
        };
        this.config = config;
        this.initializeLogger();
        this.initializeClients();
        this.initializeServices();
    }
    initializeLogger() {
        this.logger = (0, winston_1.createLogger)({
            level: this.config.logLevel,
            format: winston_1.format.combine(winston_1.format.timestamp(), winston_1.format.json()),
            transports: [
                new winston_1.transports.Console()
            ]
        });
    }
    initializeClients() {
        this.openai = new openai_1.default({
            apiKey: this.config.openaiApiKey
        });
        this.supabase = (0, supabase_js_1.createClient)(this.config.supabaseUrl, this.config.supabaseKey);
        this.redis = (0, redis_1.createClient)({
            url: this.config.redisUrl
        });
    }
    initializeServices() {
        this.preFilterManager = new PreGenerationFilterManager_1.PreGenerationFilterManager(this.openai, this.logger);
        this.postValidatorManager = new PostGenerationValidatorManager_1.PostGenerationValidatorManager(this.openai, this.logger);
        this.biasDetectionEngine = new BiasDetectionEngine_1.BiasDetectionEngine(this.openai, this.logger);
        this.qualityAssuranceEngine = new QualityAssuranceEngine_1.QualityAssuranceEngine(this.openai, this.logger);
        this.realTimeMonitor = new RealTimeMonitor_1.RealTimeMonitor(this.redis, this.logger, this.config.realTimeMonitoringEnabled);
        this.escalationManager = new HumanEscalationManager_1.HumanEscalationManager(this.config.humanModerationWebhook, this.logger);
        this.alternativeGenerator = new AlternativeContentGenerator_1.AlternativeContentGenerator(this.openai, this.logger, this.config.alternativeContentGeneration);
    }
    async initialize() {
        try {
            await this.redis.connect();
            await this.preFilterManager.initialize();
            await this.postValidatorManager.initialize();
            await this.biasDetectionEngine.initialize();
            await this.qualityAssuranceEngine.initialize();
            await this.realTimeMonitor.initialize();
            this.logger.info('ContentSafetyPipeline initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize ContentSafetyPipeline', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async shutdown() {
        try {
            await this.redis.quit();
            await this.realTimeMonitor.shutdown();
            this.logger.info('ContentSafetyPipeline shutdown successfully');
        }
        catch (error) {
            this.logger.error('Error during ContentSafetyPipeline shutdown', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    /**
     * Main content safety processing pipeline
     */
    async processContent(request) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        this.logger.info('Processing content through safety pipeline', {
            contentType: request.contentType,
            userId: request.userId,
            sessionId: request.sessionId,
            contentLength: request.content.length
        });
        try {
            // Step 1: Pre-generation filtering (if applicable)
            const preFilterResult = await this.preFilterManager.runFilters(request);
            if (!preFilterResult.allowed) {
                return this.createRejectionResult(request, preFilterResult.warnings, 'pre_generation_filter', preFilterResult.riskLevel, startTime);
            }
            // Step 2: Post-generation validation
            const validationResults = await this.postValidatorManager.runValidators(preFilterResult.sanitizedPrompt || request.content, request);
            // Step 3: Bias detection (if enabled)
            let biasResult;
            if (this.config.biasDetectionEnabled) {
                biasResult = await this.biasDetectionEngine.detectBias(request.content, request);
                if (biasResult.overallBiasScore > 0.7) {
                    this.metrics.biasDetections++;
                }
            }
            // Step 4: Quality assurance
            const qualityResult = await this.qualityAssuranceEngine.assessQuality(request.content, request);
            if (qualityResult.overallQuality < 0.6) {
                this.metrics.qualityIssues++;
            }
            // Step 5: Combine results and make decision
            const combinedResult = await this.combineResults(request, validationResults, biasResult, qualityResult, startTime);
            // Step 6: Real-time monitoring
            if (this.config.realTimeMonitoringEnabled) {
                await this.realTimeMonitor.logEvent({
                    eventType: combinedResult.approved ? 'content_generated' : 'content_flagged',
                    severity: combinedResult.riskLevel,
                    content: request.content,
                    userId: request.userId,
                    sessionId: request.sessionId,
                    flags: combinedResult.flaggedCategories,
                    metadata: combinedResult.metadata,
                    timestamp: new Date().toISOString()
                });
            }
            // Step 7: Human escalation check
            if (combinedResult.humanReviewRequired) {
                await this.escalationManager.escalateForReview(combinedResult, request);
                this.metrics.humanEscalations++;
            }
            // Step 8: Generate alternative content if needed
            if (!combinedResult.approved && this.config.alternativeContentGeneration) {
                const alternativeResult = await this.alternativeGenerator.generateAlternative({
                    originalContent: request.content,
                    flaggedCategories: combinedResult.flaggedCategories,
                    targetAudience: {
                        age: request.userAge,
                        preferences: request.context?.userPreferences
                    },
                    contentType: request.contentType,
                    context: request.context
                });
                if (alternativeResult.confidence > 0.8) {
                    combinedResult.alternativeContent = alternativeResult.content;
                    this.metrics.alternativeContentGenerated++;
                }
            }
            // Update metrics
            if (combinedResult.approved) {
                this.metrics.approvedContent++;
            }
            else {
                this.metrics.rejectedContent++;
            }
            this.updateCategoryMetrics(combinedResult.flaggedCategories);
            this.updateRiskLevelMetrics(combinedResult.riskLevel);
            this.updateProcessingTime(Date.now() - startTime);
            this.logger.info('Content safety processing completed', {
                approved: combinedResult.approved,
                riskLevel: combinedResult.riskLevel,
                processingTime: combinedResult.processingTime,
                flaggedCategories: combinedResult.flaggedCategories
            });
            return combinedResult;
        }
        catch (error) {
            this.logger.error('Error in content safety pipeline', {
                error: error instanceof Error ? error.message : 'Unknown error',
                request: {
                    contentType: request.contentType,
                    userId: request.userId,
                    sessionId: request.sessionId
                }
            });
            // Fail-safe: reject content on pipeline error
            return this.createErrorResult(request, error, startTime);
        }
    }
    /**
     * Pre-generation prompt sanitization and risk assessment
     */
    async sanitizePrompt(request) {
        this.logger.info('Sanitizing prompt for content generation', {
            contentType: request.contentType,
            userId: request.userId
        });
        const filterResult = await this.preFilterManager.runFilters(request);
        return {
            sanitizedPrompt: filterResult.sanitizedPrompt || request.content,
            riskAssessment: {
                level: filterResult.riskLevel,
                warnings: filterResult.warnings,
                modifications: filterResult.modifications
            }
        };
    }
    /**
     * Batch process multiple content pieces
     */
    async batchProcessContent(requests) {
        this.logger.info('Starting batch content processing', { count: requests.length });
        const results = await Promise.all(requests.map(request => this.processContent(request)));
        this.logger.info('Batch content processing completed', {
            total: results.length,
            approved: results.filter(r => r.approved).length,
            rejected: results.filter(r => !r.approved).length
        });
        return results;
    }
    /**
     * Get current moderation metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Reset metrics (for testing or periodic resets)
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            approvedContent: 0,
            rejectedContent: 0,
            humanEscalations: 0,
            averageProcessingTime: 0,
            biasDetections: 0,
            qualityIssues: 0,
            alternativeContentGenerated: 0,
            byCategory: {},
            byRiskLevel: {}
        };
    }
    /**
     * Health check for the content safety pipeline
     */
    async healthCheck() {
        const services = {
            openai: false,
            supabase: false,
            redis: false,
            preFilters: false,
            postValidators: false,
            biasDetection: false,
            qualityAssurance: false,
            realTimeMonitoring: false
        };
        try {
            // Test OpenAI connection
            await this.openai.models.list();
            services.openai = true;
        }
        catch (error) {
            this.logger.warn('OpenAI health check failed', { error });
        }
        try {
            // Test Supabase connection
            const { error } = await this.supabase.from('content_safety_logs').select('id').limit(1);
            services.supabase = !error;
        }
        catch (error) {
            this.logger.warn('Supabase health check failed', { error });
        }
        try {
            // Test Redis connection
            await this.redis.ping();
            services.redis = true;
        }
        catch (error) {
            this.logger.warn('Redis health check failed', { error });
        }
        // Test individual services
        services.preFilters = await this.preFilterManager.healthCheck();
        services.postValidators = await this.postValidatorManager.healthCheck();
        services.biasDetection = await this.biasDetectionEngine.healthCheck();
        services.qualityAssurance = await this.qualityAssuranceEngine.healthCheck();
        services.realTimeMonitoring = await this.realTimeMonitor.healthCheck();
        const allHealthy = Object.values(services).every(status => status);
        return {
            status: allHealthy ? 'healthy' : 'unhealthy',
            services,
            timestamp: new Date().toISOString()
        };
    }
    // Private helper methods
    async combineResults(request, validationResults, biasResult, qualityResult, startTime) {
        const flaggedCategories = [];
        const detailedFlags = [];
        let riskLevel = 'low';
        let confidence = 1.0;
        const rank = { low: 0, medium: 1, high: 2, critical: 3 };
        // Process validation results
        validationResults.forEach(result => {
            if (!result.valid) {
                result.issues.forEach((issue) => {
                    flaggedCategories.push(issue.category);
                    detailedFlags.push({
                        category: issue.category,
                        severity: issue.severity,
                        description: issue.description,
                        suggestedFix: issue.suggestedFix
                    });
                    if (issue.severity > 0.8) {
                        riskLevel = 'critical';
                    }
                    else if (issue.severity > 0.6)
                        riskLevel = 'high';
                    else if (issue.severity > 0.4)
                        riskLevel = 'medium';
                });
                confidence = Math.min(confidence, result.confidence);
            }
        });
        // Factor in bias detection
        if (biasResult && biasResult.overallBiasScore > 0.5) {
            flaggedCategories.push('bias_detected');
            if (biasResult.overallBiasScore > 0.7) {
                if (rank[riskLevel] < rank['high']) {
                    riskLevel = 'high';
                }
            }
        }
        // Factor in quality assessment
        if (qualityResult && qualityResult.overallQuality < 0.6) {
            flaggedCategories.push('quality_concern');
            if (qualityResult.overallQuality < 0.4) {
                if (rank[riskLevel] < rank['medium']) {
                    riskLevel = 'medium';
                }
            }
        }
        const approved = flaggedCategories.length === 0 || riskLevel === 'low';
        const humanReviewRequired = (rank[riskLevel] >= rank['critical']) ||
            ((rank[riskLevel] >= rank['high']) && !!request.userAge && request.userAge < 13);
        return {
            approved,
            confidence,
            riskLevel,
            flaggedCategories: [...new Set(flaggedCategories)],
            detailedFlags,
            biasDetection: biasResult,
            qualityAssessment: qualityResult,
            humanReviewRequired,
            processingTime: Date.now() - startTime,
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                pipeline: ['pre_filter', 'post_validation', 'bias_detection', 'quality_assessment']
            }
        };
    }
    createRejectionResult(request, warnings, category, riskLevel, startTime) {
        return {
            approved: false,
            confidence: 0.9,
            riskLevel: riskLevel === 'high' ? 'critical' : riskLevel,
            flaggedCategories: [category],
            detailedFlags: [{
                    category,
                    severity: riskLevel === 'high' ? 0.9 : riskLevel === 'medium' ? 0.6 : 0.3,
                    description: warnings.join('; '),
                    suggestedFix: 'Content requires modification before generation'
                }],
            humanReviewRequired: riskLevel === 'high',
            processingTime: Date.now() - startTime,
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                pipeline: ['pre_filter']
            }
        };
    }
    createErrorResult(request, error, startTime) {
        return {
            approved: false,
            confidence: 0.0,
            riskLevel: 'critical',
            flaggedCategories: ['pipeline_error'],
            detailedFlags: [{
                    category: 'pipeline_error',
                    severity: 1.0,
                    description: 'Content safety pipeline encountered an error',
                    suggestedFix: 'Content cannot be processed at this time'
                }],
            humanReviewRequired: true,
            processingTime: Date.now() - startTime,
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                pipeline: ['error']
            }
        };
    }
    updateCategoryMetrics(categories) {
        categories.forEach(category => {
            this.metrics.byCategory[category] = (this.metrics.byCategory[category] || 0) + 1;
        });
    }
    updateRiskLevelMetrics(riskLevel) {
        this.metrics.byRiskLevel[riskLevel] = (this.metrics.byRiskLevel[riskLevel] || 0) + 1;
    }
    updateProcessingTime(processingTime) {
        const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalRequests - 1) + processingTime;
        this.metrics.averageProcessingTime = totalTime / this.metrics.totalRequests;
    }
}
exports.ContentSafetyPipeline = ContentSafetyPipeline;
//# sourceMappingURL=ContentSafetyPipeline.js.map
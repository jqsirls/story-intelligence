"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostGenerationValidatorManager = void 0;
class PostGenerationValidatorManager {
    constructor(openai, logger) {
        this.validators = [];
        this.openai = openai;
        this.logger = logger;
    }
    async initialize() {
        // Initialize post-generation validators
        // In a full implementation, these would be separate classes
        this.logger.info('PostGenerationValidatorManager initialized');
    }
    async runValidators(content, request) {
        this.logger.debug('Running post-generation validators', {
            contentType: request.contentType,
            validatorCount: this.validators.length
        });
        // Simple validation for now - in production this would use actual validators
        const results = [];
        // Basic content validation
        const basicValidation = await this.validateBasicContent(content, request);
        results.push(basicValidation);
        // OpenAI moderation validation
        const moderationValidation = await this.validateWithOpenAI(content);
        results.push(moderationValidation);
        return results;
    }
    async validateBasicContent(content, request) {
        const issues = [];
        // Check content length
        if (content.length < 10) {
            issues.push({
                category: 'content_length',
                severity: 0.8,
                description: 'Content is too short to be meaningful',
                suggestedFix: 'Expand the content to include more detail or context'
            });
        }
        // Check for completeness
        if (!content.trim().endsWith('.') && !content.trim().endsWith('!') && !content.trim().endsWith('?')) {
            issues.push({
                category: 'completeness',
                severity: 0.3,
                description: 'Content appears incomplete',
                suggestedFix: 'Finish the thought or add a proper ending punctuation'
            });
        }
        return {
            valid: issues.length === 0,
            confidence: issues.length === 0 ? 0.9 : Math.max(0.1, 0.9 - issues.length * 0.2),
            issues,
            // suggestions removed from type; include in description instead
        };
    }
    async validateWithOpenAI(content) {
        try {
            const moderationResult = await this.openai.moderations.create({
                input: content,
                model: 'text-moderation-latest'
            });
            const flagged = moderationResult.results[0].flagged;
            const categories = moderationResult.results[0].categories;
            const issues = [];
            if (flagged) {
                Object.entries(categories).forEach(([category, isFlagged]) => {
                    if (isFlagged) {
                        issues.push({
                            category: `openai_${category}`,
                            severity: 0.9,
                            description: `Content flagged for ${category}`,
                            suggestedFix: 'Revise or remove flagged content to meet safety standards'
                        });
                    }
                });
            }
            return {
                valid: !flagged,
                confidence: flagged ? 0.1 : 0.95,
                issues
            };
        }
        catch (error) {
            this.logger.error('OpenAI validation failed', { error });
            return {
                valid: false,
                confidence: 0.0,
                issues: [{
                        category: 'validation_error',
                        severity: 1.0,
                        description: 'Unable to validate content with OpenAI',
                        suggestedFix: 'Retry validation later or perform manual review'
                    }]
            };
        }
    }
    async healthCheck() {
        try {
            const testContent = 'This is a test message for validation.';
            const testRequest = {
                content: testContent,
                contentType: 'story',
                userId: 'health-check',
                sessionId: 'health-check',
                metadata: {
                    timestamp: new Date().toISOString(),
                    source: 'health_check',
                    requestId: 'health_check'
                }
            };
            const results = await this.runValidators(testContent, testRequest);
            return results.length > 0;
        }
        catch (error) {
            this.logger.error('PostGenerationValidatorManager health check failed', { error });
            return false;
        }
    }
}
exports.PostGenerationValidatorManager = PostGenerationValidatorManager;
//# sourceMappingURL=PostGenerationValidatorManager.js.map
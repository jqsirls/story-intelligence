"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumanEscalationManager = void 0;
class HumanEscalationManager {
    constructor(webhookUrl, logger) {
        this.escalationTriggers = [];
        this.webhookUrl = webhookUrl;
        this.logger = logger;
        this.initializeEscalationTriggers();
    }
    initializeEscalationTriggers() {
        this.escalationTriggers = [
            {
                name: 'critical_risk_level',
                condition: (result) => result.riskLevel === 'critical',
                priority: 'urgent',
                escalationData: { reason: 'Critical risk level detected' }
            },
            {
                name: 'high_bias_score',
                condition: (result) => (result.biasDetection?.overallBiasScore || 0) > 0.8,
                priority: 'high',
                escalationData: { reason: 'High bias score detected' }
            },
            {
                name: 'child_safety_concern',
                condition: (result) => result.flaggedCategories.includes('child_safety') ||
                    result.flaggedCategories.includes('age_inappropriate'),
                priority: 'urgent',
                escalationData: { reason: 'Child safety concern' }
            },
            {
                name: 'multiple_safety_flags',
                condition: (result) => result.flaggedCategories.length >= 3,
                priority: 'high',
                escalationData: { reason: 'Multiple safety flags triggered' }
            },
            {
                name: 'low_quality_with_safety_issues',
                condition: (result) => (result.qualityAssessment?.overallQuality || 1) < 0.4 &&
                    result.flaggedCategories.length > 0,
                priority: 'medium',
                escalationData: { reason: 'Low quality content with safety issues' }
            }
        ];
    }
    async escalateForReview(result, request) {
        this.logger.info('Escalating content for human review', {
            riskLevel: result.riskLevel,
            flaggedCategories: result.flaggedCategories,
            userId: request.userId,
            sessionId: request.sessionId
        });
        try {
            // Determine escalation priority
            const triggeredEscalations = this.escalationTriggers.filter(trigger => trigger.condition(result));
            const highestPriority = this.getHighestPriority(triggeredEscalations);
            // Create escalation payload
            const escalationPayload = {
                escalationId: this.generateEscalationId(),
                timestamp: new Date().toISOString(),
                priority: highestPriority,
                contentSafetyResult: result,
                originalRequest: {
                    contentType: request.contentType,
                    userAge: request.userAge,
                    userId: request.userId,
                    sessionId: request.sessionId,
                    // Don't include the actual content for privacy
                    contentLength: request.content.length
                },
                triggeredEscalations: triggeredEscalations.map(t => ({
                    name: t.name,
                    priority: t.priority,
                    data: t.escalationData
                })),
                reviewRequired: true,
                estimatedReviewTime: this.estimateReviewTime(highestPriority)
            };
            // Send to human moderators
            await this.sendEscalation(escalationPayload);
            // Log escalation
            this.logger.warn('Content escalated for human review', {
                escalationId: escalationPayload.escalationId,
                priority: highestPriority,
                triggeredCount: triggeredEscalations.length,
                riskLevel: result.riskLevel
            });
        }
        catch (error) {
            this.logger.error('Failed to escalate content for review', {
                error: error instanceof Error ? error.message : 'Unknown error',
                riskLevel: result.riskLevel,
                flaggedCategories: result.flaggedCategories
            });
        }
    }
    async sendEscalation(payload) {
        if (!this.webhookUrl) {
            this.logger.warn('No webhook URL configured for human escalation');
            return;
        }
        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'ContentSafety-Escalation/1.0'
                },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
            }
            this.logger.info('Escalation sent successfully', {
                escalationId: payload.escalationId,
                webhookStatus: response.status
            });
        }
        catch (error) {
            this.logger.error('Failed to send escalation webhook', {
                error: error instanceof Error ? error.message : 'Unknown error',
                escalationId: payload.escalationId
            });
            // Fallback: log detailed escalation info for manual review
            this.logger.error('MANUAL REVIEW REQUIRED', {
                escalationPayload: payload,
                reason: 'Webhook delivery failed'
            });
        }
    }
    getHighestPriority(escalations) {
        const priorityOrder = ['low', 'medium', 'high', 'urgent'];
        let highestPriority = 'low';
        for (const escalation of escalations) {
            const currentIndex = priorityOrder.indexOf(escalation.priority);
            const highestIndex = priorityOrder.indexOf(highestPriority);
            if (currentIndex > highestIndex) {
                highestPriority = escalation.priority;
            }
        }
        return highestPriority;
    }
    estimateReviewTime(priority) {
        const timeEstimates = {
            urgent: '15 minutes',
            high: '1 hour',
            medium: '4 hours',
            low: '24 hours'
        };
        return timeEstimates[priority];
    }
    generateEscalationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `esc_${timestamp}_${random}`;
    }
    async getEscalationStats() {
        // In a real implementation, this would query a database
        // For now, return mock data
        return {
            totalEscalations: 0,
            escalationsByPriority: {
                urgent: 0,
                high: 0,
                medium: 0,
                low: 0
            },
            escalationsByTrigger: {},
            averageResponseTime: 0
        };
    }
    addCustomEscalationTrigger(trigger) {
        this.escalationTriggers.push(trigger);
        this.logger.info('Custom escalation trigger added', {
            triggerName: trigger.name,
            priority: trigger.priority
        });
    }
    removeEscalationTrigger(triggerName) {
        const initialLength = this.escalationTriggers.length;
        this.escalationTriggers = this.escalationTriggers.filter(trigger => trigger.name !== triggerName);
        if (this.escalationTriggers.length < initialLength) {
            this.logger.info('Escalation trigger removed', { triggerName });
        }
        else {
            this.logger.warn('Escalation trigger not found for removal', { triggerName });
        }
    }
    getActiveEscalationTriggers() {
        return this.escalationTriggers.map(trigger => ({
            name: trigger.name,
            priority: trigger.priority
        }));
    }
}
exports.HumanEscalationManager = HumanEscalationManager;
//# sourceMappingURL=HumanEscalationManager.js.map
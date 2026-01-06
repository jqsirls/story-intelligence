"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSubscriber = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
const client_sqs_1 = require("@aws-sdk/client-sqs");
class EventSubscriber {
    constructor(region, logger) {
        this.subscriptions = new Map();
        this.isRunning = false;
        this.pollingIntervals = new Map();
        this.processingMetrics = new Map();
        this.logger = logger;
        this.eventBridge = new client_eventbridge_1.EventBridgeClient({ region });
        this.sqs = new client_sqs_1.SQSClient({ region });
    }
    /**
     * Subscribe to specific event types
     */
    async subscribe(subscriptionId, subscription, queueUrl) {
        try {
            this.logger.info('Creating event subscription', {
                subscriptionId,
                eventTypes: subscription.eventTypes,
                source: subscription.source
            });
            // Create EventBridge rule
            const ruleName = `storytailor-${subscriptionId}`;
            const eventPattern = this.buildEventPattern(subscription);
            await this.eventBridge.send(new client_eventbridge_1.CreateRuleCommand({
                Name: ruleName,
                EventPattern: JSON.stringify(eventPattern),
                State: 'ENABLED',
                Description: `Subscription for ${subscription.eventTypes.join(', ')}`
            }));
            // Add SQS target to the rule
            await this.eventBridge.send(new client_eventbridge_1.PutTargetsCommand({
                Rule: ruleName,
                Targets: [{
                        Id: '1',
                        Arn: this.getQueueArn(queueUrl),
                        SqsParameters: {
                            MessageGroupId: subscriptionId
                        },
                        RetryPolicy: subscription.retryPolicy ? {
                            MaximumRetryAttempts: subscription.retryPolicy.maximumRetryAttempts,
                            MaximumEventAge: subscription.retryPolicy.maximumEventAge
                        } : undefined,
                        DeadLetterConfig: subscription.deadLetterQueue ? {
                            Arn: subscription.deadLetterQueue
                        } : undefined
                    }]
            }));
            // Store subscription
            this.subscriptions.set(subscriptionId, subscription);
            // Start polling for this subscription
            this.startPolling(subscriptionId, queueUrl);
            this.logger.info('Event subscription created successfully', {
                subscriptionId,
                ruleName,
                queueUrl
            });
        }
        catch (error) {
            this.logger.error('Failed to create event subscription', {
                subscriptionId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Unsubscribe from events
     */
    async unsubscribe(subscriptionId) {
        try {
            const ruleName = `storytailor-${subscriptionId}`;
            // Stop polling
            this.stopPolling(subscriptionId);
            // Remove targets from rule
            await this.eventBridge.send(new client_eventbridge_1.RemoveTargetsCommand({
                Rule: ruleName,
                Ids: ['1']
            }));
            // Delete rule
            await this.eventBridge.send(new client_eventbridge_1.DeleteRuleCommand({
                Name: ruleName
            }));
            // Remove subscription
            this.subscriptions.delete(subscriptionId);
            this.logger.info('Event subscription removed successfully', {
                subscriptionId,
                ruleName
            });
        }
        catch (error) {
            this.logger.error('Failed to remove event subscription', {
                subscriptionId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Start processing events for all subscriptions
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('Event subscriber is already running');
            return;
        }
        this.isRunning = true;
        this.logger.info('Event subscriber started');
    }
    /**
     * Stop processing events
     */
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        // Stop all polling intervals
        for (const [subscriptionId, interval] of this.pollingIntervals) {
            clearInterval(interval);
            this.pollingIntervals.delete(subscriptionId);
        }
        this.logger.info('Event subscriber stopped');
    }
    /**
     * Get processing metrics for monitoring
     */
    getMetrics() {
        const allMetrics = Array.from(this.processingMetrics.values()).flat();
        return {
            subscriptions: this.subscriptions.size,
            eventsProcessed: allMetrics.length,
            averageProcessingTime: allMetrics.length > 0
                ? allMetrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / allMetrics.length
                : 0,
            errorRate: allMetrics.length > 0
                ? allMetrics.filter(m => m.retryCount > 0).length / allMetrics.length
                : 0,
            activePollers: this.pollingIntervals.size
        };
    }
    /**
     * Get debug information for an event
     */
    getEventDebugInfo(eventId) {
        // This would typically be stored in a debug store
        // For now, return null as it's not implemented
        return null;
    }
    /**
     * Health check
     */
    async healthCheck() {
        let eventBridgeHealthy = false;
        let sqsHealthy = false;
        try {
            // Test EventBridge connection
            await this.eventBridge.send(new client_eventbridge_1.CreateRuleCommand({
                Name: 'health-check-rule-temp',
                EventPattern: JSON.stringify({ source: ['health-check'] }),
                State: 'DISABLED'
            }));
            await this.eventBridge.send(new client_eventbridge_1.DeleteRuleCommand({
                Name: 'health-check-rule-temp'
            }));
            eventBridgeHealthy = true;
        }
        catch (error) {
            this.logger.warn('EventBridge health check failed', { error });
        }
        try {
            // Test SQS connection (this would need a test queue)
            sqsHealthy = true; // Assume healthy for now
        }
        catch (error) {
            this.logger.warn('SQS health check failed', { error });
        }
        const isHealthy = eventBridgeHealthy && sqsHealthy;
        return {
            status: isHealthy ? 'healthy' : 'unhealthy',
            eventBridge: eventBridgeHealthy,
            sqs: sqsHealthy,
            subscriptions: this.subscriptions.size,
            activePollers: this.pollingIntervals.size,
            timestamp: new Date().toISOString()
        };
    }
    // Private helper methods
    startPolling(subscriptionId, queueUrl) {
        if (this.pollingIntervals.has(subscriptionId)) {
            return; // Already polling
        }
        const interval = setInterval(async () => {
            if (!this.isRunning) {
                return;
            }
            try {
                await this.pollQueue(subscriptionId, queueUrl);
            }
            catch (error) {
                this.logger.error('Error polling queue', {
                    subscriptionId,
                    queueUrl,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }, 1000); // Poll every second
        this.pollingIntervals.set(subscriptionId, interval);
    }
    stopPolling(subscriptionId) {
        const interval = this.pollingIntervals.get(subscriptionId);
        if (interval) {
            clearInterval(interval);
            this.pollingIntervals.delete(subscriptionId);
        }
    }
    async pollQueue(subscriptionId, queueUrl) {
        const subscription = this.subscriptions.get(subscriptionId);
        if (!subscription) {
            return;
        }
        try {
            const response = await this.sqs.send(new client_sqs_1.ReceiveMessageCommand({
                QueueUrl: queueUrl,
                MaxNumberOfMessages: 10,
                WaitTimeSeconds: 1,
                MessageAttributeNames: ['All']
            }));
            if (!response.Messages || response.Messages.length === 0) {
                return;
            }
            // Process messages in parallel
            await Promise.all(response.Messages.map(message => this.processMessage(subscriptionId, message, queueUrl, subscription)));
        }
        catch (error) {
            this.logger.error('Error receiving messages from queue', {
                subscriptionId,
                queueUrl,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async processMessage(subscriptionId, message, queueUrl, subscription) {
        const startTime = Date.now();
        const processingSteps = [];
        const errors = [];
        try {
            // Parse the message
            const stepStart = Date.now();
            const eventData = JSON.parse(message.Body || '{}');
            const cloudEvent = JSON.parse(eventData.Message || '{}');
            processingSteps.push({
                step: 'parse_message',
                timestamp: new Date(),
                duration: Date.now() - stepStart,
                success: true
            });
            // Validate event
            const validationStart = Date.now();
            if (!this.validateEvent(cloudEvent, subscription)) {
                processingSteps.push({
                    step: 'validate_event',
                    timestamp: new Date(),
                    duration: Date.now() - validationStart,
                    success: false
                });
                errors.push({
                    step: 'validate_event',
                    error: 'Event validation failed',
                    timestamp: new Date(),
                    retryable: false
                });
                // Delete invalid message
                await this.deleteMessage(queueUrl, message.ReceiptHandle);
                return;
            }
            processingSteps.push({
                step: 'validate_event',
                timestamp: new Date(),
                duration: Date.now() - validationStart,
                success: true
            });
            // Handle the event
            const handlerStart = Date.now();
            await subscription.handler.handle(cloudEvent);
            processingSteps.push({
                step: 'handle_event',
                timestamp: new Date(),
                duration: Date.now() - handlerStart,
                success: true
            });
            // Delete processed message
            await this.deleteMessage(queueUrl, message.ReceiptHandle);
            // Record metrics
            const totalTime = Date.now() - startTime;
            this.recordProcessingMetrics(subscriptionId, {
                totalProcessingTime: totalTime,
                queueTime: 0, // Would need to calculate from message timestamp
                handlerTime: Date.now() - handlerStart,
                networkTime: totalTime - (Date.now() - handlerStart),
                retryCount: 0
            });
            this.logger.debug('Event processed successfully', {
                subscriptionId,
                eventId: cloudEvent.id,
                eventType: cloudEvent.type,
                processingTime: totalTime
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push({
                step: 'handle_event',
                error: errorMessage,
                timestamp: new Date(),
                retryable: true
            });
            this.logger.error('Error processing event', {
                subscriptionId,
                error: errorMessage,
                messageId: message.MessageId
            });
            // For now, delete the message to prevent infinite retries
            // In production, you'd implement proper retry logic with DLQ
            if (message.ReceiptHandle) {
                await this.deleteMessage(queueUrl, message.ReceiptHandle);
            }
        }
    }
    async deleteMessage(queueUrl, receiptHandle) {
        try {
            await this.sqs.send(new client_sqs_1.DeleteMessageCommand({
                QueueUrl: queueUrl,
                ReceiptHandle: receiptHandle
            }));
        }
        catch (error) {
            this.logger.error('Error deleting message', {
                queueUrl,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    validateEvent(event, subscription) {
        // Check if event type is subscribed
        if (!subscription.eventTypes.includes(event.type)) {
            return false;
        }
        // Check source filter if specified
        if (subscription.source && event.source !== subscription.source) {
            return false;
        }
        // Apply additional filter pattern if specified
        if (subscription.filterPattern) {
            // Simple pattern matching - in production, implement more sophisticated filtering
            for (const [key, value] of Object.entries(subscription.filterPattern)) {
                if (event[key] !== value) {
                    return false;
                }
            }
        }
        return true;
    }
    buildEventPattern(subscription) {
        const pattern = {
            'detail-type': subscription.eventTypes
        };
        if (subscription.source) {
            pattern.source = [subscription.source];
        }
        if (subscription.filterPattern) {
            pattern.detail = subscription.filterPattern;
        }
        return pattern;
    }
    getQueueArn(queueUrl) {
        // Extract queue ARN from URL
        // Format: https://sqs.region.amazonaws.com/account-id/queue-name
        const urlParts = queueUrl.split('/');
        const queueName = urlParts[urlParts.length - 1];
        const accountId = urlParts[urlParts.length - 2];
        const region = queueUrl.split('.')[1];
        return `arn:aws:sqs:${region}:${accountId}:${queueName}`;
    }
    recordProcessingMetrics(subscriptionId, metrics) {
        if (!this.processingMetrics.has(subscriptionId)) {
            this.processingMetrics.set(subscriptionId, []);
        }
        const subscriptionMetrics = this.processingMetrics.get(subscriptionId);
        subscriptionMetrics.push(metrics);
        // Keep only last 1000 metrics per subscription
        if (subscriptionMetrics.length > 1000) {
            subscriptionMetrics.splice(0, subscriptionMetrics.length - 1000);
        }
    }
}
exports.EventSubscriber = EventSubscriber;

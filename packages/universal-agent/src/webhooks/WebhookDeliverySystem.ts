// Webhook Delivery System for real-time integrations
import axios, { AxiosResponse } from 'axios';
import crypto from 'crypto';
import { Logger } from 'winston';
import { EventEmitter } from 'events';

export interface WebhookEvent {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  userId: string;
  source: string;
}

export interface WebhookEndpoint {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  retryPolicy: {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
  headers?: Record<string, string>;
  timeout: number;
  createdAt: string;
  lastDelivery?: WebhookDelivery;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  eventId: string;
  attempt: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  responseCode?: number;
  responseBody?: string;
  error?: string;
  deliveredAt?: string;
  nextRetryAt?: string;
}

export interface PlatformIntegration {
  platform: 'discord' | 'slack' | 'teams' | 'zapier' | 'ifttt' | 'custom';
  config: any;
  transformer: (event: WebhookEvent) => any;
}

export class WebhookDeliverySystem extends EventEmitter {
  private logger: Logger;
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private retryQueue: WebhookDelivery[] = [];
  private isProcessing = false;
  private platformIntegrations: Map<string, PlatformIntegration> = new Map();

  constructor(logger: Logger) {
    super();
    this.logger = logger;
    this.setupPlatformIntegrations();
    this.startDeliveryProcessor();
  }

  /**
   * Register a webhook endpoint
   */
  async registerWebhook(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt'>): Promise<WebhookEndpoint> {
    const webhookEndpoint: WebhookEndpoint = {
      ...endpoint,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      retryPolicy: endpoint.retryPolicy || {
        maxRetries: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        maxDelayMs: 30000
      },
      timeout: endpoint.timeout || 10000
    };

    this.endpoints.set(webhookEndpoint.id, webhookEndpoint);
    
    this.logger.info('Webhook endpoint registered', {
      webhookId: webhookEndpoint.id,
      userId: webhookEndpoint.userId,
      url: webhookEndpoint.url,
      events: webhookEndpoint.events
    });

    this.emit('webhook.registered', webhookEndpoint);
    return webhookEndpoint;
  }

  /**
   * Unregister a webhook endpoint
   */
  async unregisterWebhook(webhookId: string, userId: string): Promise<void> {
    const endpoint = this.endpoints.get(webhookId);
    if (!endpoint || endpoint.userId !== userId) {
      throw new Error('Webhook not found or access denied');
    }

    this.endpoints.delete(webhookId);
    
    this.logger.info('Webhook endpoint unregistered', {
      webhookId,
      userId,
      url: endpoint.url
    });

    this.emit('webhook.unregistered', { webhookId, userId });
  }

  /**
   * Deliver an event to all matching webhooks
   */
  async deliverEvent(event: WebhookEvent): Promise<void> {
    const matchingEndpoints = Array.from(this.endpoints.values())
      .filter(endpoint => 
        endpoint.isActive && 
        endpoint.userId === event.userId &&
        (endpoint.events.includes('*') || endpoint.events.includes(event.type))
      );

    if (matchingEndpoints.length === 0) {
      this.logger.debug('No matching webhook endpoints for event', {
        eventType: event.type,
        userId: event.userId
      });
      return;
    }

    for (const endpoint of matchingEndpoints) {
      const delivery: WebhookDelivery = {
        id: this.generateId(),
        webhookId: endpoint.id,
        eventId: event.id,
        attempt: 1,
        status: 'pending'
      };

      this.deliveryQueue.push(delivery);
      
      this.logger.debug('Event queued for delivery', {
        deliveryId: delivery.id,
        webhookId: endpoint.id,
        eventType: event.type
      });
    }

    this.processDeliveryQueue();
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId: string, userId: string, limit = 50): Promise<WebhookDelivery[]> {
    const endpoint = this.endpoints.get(webhookId);
    if (!endpoint || endpoint.userId !== userId) {
      throw new Error('Webhook not found or access denied');
    }

    // In production, this would query a database
    // For now, return empty array
    return [];
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(webhookId: string, userId: string): Promise<WebhookDelivery> {
    const endpoint = this.endpoints.get(webhookId);
    if (!endpoint || endpoint.userId !== userId) {
      throw new Error('Webhook not found or access denied');
    }

    const testEvent: WebhookEvent = {
      id: this.generateId(),
      type: 'webhook.test',
      data: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      userId,
      source: 'webhook_test'
    };

    const delivery = await this.deliverToEndpoint(endpoint, testEvent);
    
    this.logger.info('Test webhook delivered', {
      webhookId,
      deliveryId: delivery.id,
      status: delivery.status
    });

    return delivery;
  }

  /**
   * Setup platform-specific integrations
   */
  private setupPlatformIntegrations(): void {
    // Discord integration
    this.platformIntegrations.set('discord', {
      platform: 'discord',
      config: {},
      transformer: (event: WebhookEvent) => {
        switch (event.type) {
          case 'story.created':
            return {
              embeds: [{
                title: '📚 New Story Created!',
                description: `A new story "${event.data.title || 'Untitled'}" has been created.`,
                color: 0x5865F2,
                timestamp: event.timestamp,
                fields: [
                  {
                    name: 'Story Type',
                    value: event.data.storyType || 'Unknown',
                    inline: true
                  },
                  {
                    name: 'Character',
                    value: event.data.character?.name || 'Unknown',
                    inline: true
                  }
                ]
              }]
            };

          case 'conversation.started':
            return {
              embeds: [{
                title: '💬 Conversation Started',
                description: `A new conversation has been started on ${event.data.platform}.`,
                color: 0x00FF00,
                timestamp: event.timestamp
              }]
            };

          default:
            return {
              content: `**${event.type}**: ${JSON.stringify(event.data, null, 2)}`
            };
        }
      }
    });

    // Slack integration
    this.platformIntegrations.set('slack', {
      platform: 'slack',
      config: {},
      transformer: (event: WebhookEvent) => {
        switch (event.type) {
          case 'story.created':
            return {
              text: `📚 New story created: "${event.data.title || 'Untitled'}"`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*📚 New Story Created!*\n\n*Title:* ${event.data.title || 'Untitled'}\n*Type:* ${event.data.storyType || 'Unknown'}\n*Character:* ${event.data.character?.name || 'Unknown'}`
                  }
                },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `Created at ${new Date(event.timestamp).toLocaleString()}`
                    }
                  ]
                }
              ]
            };

          case 'conversation.started':
            return {
              text: `💬 New conversation started on ${event.data.platform}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*💬 Conversation Started*\n\nPlatform: ${event.data.platform}\nSession: ${event.data.sessionId}`
                  }
                }
              ]
            };

          default:
            return {
              text: `Event: ${event.type}`,
              blocks: [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*${event.type}*\n\`\`\`${JSON.stringify(event.data, null, 2)}\`\`\``
                  }
                }
              ]
            };
        }
      }
    });

    // Microsoft Teams integration
    this.platformIntegrations.set('teams', {
      platform: 'teams',
      config: {},
      transformer: (event: WebhookEvent) => {
        switch (event.type) {
          case 'story.created':
            return {
              '@type': 'MessageCard',
              '@context': 'http://schema.org/extensions',
              themeColor: '0076D7',
              summary: 'New Story Created',
              sections: [{
                activityTitle: '📚 New Story Created!',
                activitySubtitle: `Story: ${event.data.title || 'Untitled'}`,
                facts: [
                  {
                    name: 'Story Type',
                    value: event.data.storyType || 'Unknown'
                  },
                  {
                    name: 'Character',
                    value: event.data.character?.name || 'Unknown'
                  },
                  {
                    name: 'Created At',
                    value: new Date(event.timestamp).toLocaleString()
                  }
                ]
              }]
            };

          default:
            return {
              '@type': 'MessageCard',
              '@context': 'http://schema.org/extensions',
              themeColor: '0076D7',
              summary: event.type,
              sections: [{
                activityTitle: event.type,
                text: JSON.stringify(event.data, null, 2)
              }]
            };
        }
      }
    });

    // Zapier integration (standard webhook format)
    this.platformIntegrations.set('zapier', {
      platform: 'zapier',
      config: {},
      transformer: (event: WebhookEvent) => {
        return {
          event_type: event.type,
          event_id: event.id,
          timestamp: event.timestamp,
          user_id: event.userId,
          source: event.source,
          data: event.data
        };
      }
    });

    this.logger.info('Platform integrations initialized', {
      platforms: Array.from(this.platformIntegrations.keys())
    });
  }

  /**
   * Process the delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.isProcessing || this.deliveryQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.deliveryQueue.length > 0) {
        const delivery = this.deliveryQueue.shift()!;
        const endpoint = this.endpoints.get(delivery.webhookId);
        
        if (!endpoint) {
          this.logger.warn('Webhook endpoint not found for delivery', {
            deliveryId: delivery.id,
            webhookId: delivery.webhookId
          });
          continue;
        }

        // Find the event (in production, this would be from a database)
        const event = this.createEventFromDelivery(delivery);
        
        try {
          const result = await this.deliverToEndpoint(endpoint, event);
          
          if (result.status === 'success') {
            this.logger.info('Webhook delivered successfully', {
              deliveryId: delivery.id,
              webhookId: delivery.webhookId,
              attempt: delivery.attempt
            });
            
            this.emit('webhook.delivered', result);
          } else {
            this.handleFailedDelivery(delivery, endpoint, result.error);
          }
        } catch (error) {
          this.handleFailedDelivery(delivery, endpoint, error.message);
        }
      }
    } finally {
      this.isProcessing = false;
    }

    // Process retry queue
    this.processRetryQueue();
  }

  /**
   * Process the retry queue
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const readyForRetry = this.retryQueue.filter(delivery => 
      delivery.nextRetryAt && new Date(delivery.nextRetryAt) <= now
    );

    for (const delivery of readyForRetry) {
      // Remove from retry queue and add back to delivery queue
      this.retryQueue = this.retryQueue.filter(d => d.id !== delivery.id);
      delivery.status = 'pending';
      this.deliveryQueue.push(delivery);
    }

    if (readyForRetry.length > 0) {
      this.processDeliveryQueue();
    }
  }

  /**
   * Deliver event to a specific endpoint
   */
  private async deliverToEndpoint(endpoint: WebhookEndpoint, event: WebhookEvent): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: this.generateId(),
      webhookId: endpoint.id,
      eventId: event.id,
      attempt: 1,
      status: 'pending'
    };

    try {
      // Transform payload based on platform
      let payload = {
        id: event.id,
        type: event.type,
        data: event.data,
        timestamp: event.timestamp,
        user_id: event.userId,
        source: event.source
      };

      // Apply platform-specific transformation
      const platformType = this.detectPlatformType(endpoint.url);
      const integration = this.platformIntegrations.get(platformType);
      if (integration) {
        payload = integration.transformer(event);
      }

      // Create signature if secret is provided
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Storytailor-Webhooks/1.0',
        ...endpoint.headers
      };

      if (endpoint.secret) {
        const signature = this.createSignature(JSON.stringify(payload), endpoint.secret);
        headers['X-Storytailor-Signature'] = signature;
        headers['X-Webhook-Signature'] = signature; // Alternative header name
      }

      // Make the HTTP request
      const response: AxiosResponse = await axios.post(endpoint.url, payload, {
        headers,
        timeout: endpoint.timeout,
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });

      delivery.status = response.status >= 200 && response.status < 300 ? 'success' : 'failed';
      delivery.responseCode = response.status;
      delivery.responseBody = typeof response.data === 'string' 
        ? response.data.substring(0, 1000) 
        : JSON.stringify(response.data).substring(0, 1000);
      delivery.deliveredAt = new Date().toISOString();

      // Update endpoint's last delivery
      endpoint.lastDelivery = {
        id: delivery.id,
        webhookId: delivery.webhookId,
        eventId: delivery.eventId,
        attempt: delivery.attempt,
        status: delivery.status,
        responseCode: delivery.responseCode,
        responseBody: delivery.responseBody,
        error: delivery.status === 'failed' ? `HTTP ${delivery.responseCode}` : undefined,
        deliveredAt: delivery.deliveredAt,
        nextRetryAt: delivery.nextRetryAt
      };

    } catch (error: any) {
      delivery.status = 'failed';
      delivery.error = error.message;
      delivery.responseCode = error.response?.status;
      delivery.responseBody = error.response?.data ? 
        JSON.stringify(error.response.data).substring(0, 1000) : undefined;

      // Update endpoint's last delivery
      endpoint.lastDelivery = {
        id: delivery.id,
        webhookId: delivery.webhookId,
        eventId: delivery.eventId,
        attempt: delivery.attempt,
        status: 'failed',
        responseCode: delivery.responseCode,
        responseBody: delivery.responseBody,
        error: delivery.error,
        deliveredAt: new Date().toISOString(),
        nextRetryAt: delivery.nextRetryAt
      };
    }

    return delivery;
  }

  /**
   * Handle failed webhook delivery
   */
  private handleFailedDelivery(delivery: WebhookDelivery, endpoint: WebhookEndpoint, error?: string): void {
    delivery.status = 'failed';
    delivery.error = error;

    if (delivery.attempt < endpoint.retryPolicy.maxRetries) {
      // Schedule retry
      const delay = Math.min(
        endpoint.retryPolicy.initialDelayMs * Math.pow(endpoint.retryPolicy.backoffMultiplier, delivery.attempt - 1),
        endpoint.retryPolicy.maxDelayMs
      );

      delivery.attempt++;
      delivery.status = 'retrying';
      delivery.nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      this.retryQueue.push(delivery);

      this.logger.warn('Webhook delivery failed, scheduling retry', {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        attempt: delivery.attempt,
        maxRetries: endpoint.retryPolicy.maxRetries,
        nextRetryAt: delivery.nextRetryAt,
        error
      });

      this.emit('webhook.retry_scheduled', delivery);
    } else {
      this.logger.error('Webhook delivery failed permanently', {
        deliveryId: delivery.id,
        webhookId: delivery.webhookId,
        attempts: delivery.attempt,
        error
      });

      this.emit('webhook.failed', delivery);
    }
  }

  /**
   * Create HMAC signature for webhook verification
   */
  private createSignature(payload: string, secret: string): string {
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  /**
   * Detect platform type from webhook URL
   */
  private detectPlatformType(url: string): string {
    if (url.includes('discord.com') || url.includes('discordapp.com')) {
      return 'discord';
    }
    if (url.includes('hooks.slack.com')) {
      return 'slack';
    }
    if (url.includes('outlook.office.com') || url.includes('teams.microsoft.com')) {
      return 'teams';
    }
    if (url.includes('zapier.com')) {
      return 'zapier';
    }
    if (url.includes('ifttt.com')) {
      return 'ifttt';
    }
    return 'custom';
  }

  /**
   * Create a mock event from delivery (for retry purposes)
   */
  private createEventFromDelivery(delivery: WebhookDelivery): WebhookEvent {
    // In production, this would fetch the actual event from storage
    return {
      id: delivery.eventId,
      type: 'webhook.retry',
      data: { deliveryId: delivery.id },
      timestamp: new Date().toISOString(),
      userId: 'unknown',
      source: 'webhook_retry'
    };
  }

  /**
   * Start the delivery processor
   */
  private startDeliveryProcessor(): void {
    // Process queues every 5 seconds
    setInterval(() => {
      this.processDeliveryQueue();
      this.processRetryQueue();
    }, 5000);

    this.logger.info('Webhook delivery processor started');
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(userId: string): Promise<any> {
    const userEndpoints = Array.from(this.endpoints.values())
      .filter(endpoint => endpoint.userId === userId);

    const stats = {
      totalWebhooks: userEndpoints.length,
      activeWebhooks: userEndpoints.filter(e => e.isActive).length,
      totalDeliveries: 0, // Would be calculated from database
      successfulDeliveries: 0,
      failedDeliveries: 0,
      averageResponseTime: 0,
      topEvents: [] as Array<{ event: string; count: number }>
    };

    return stats;
  }

  /**
   * Cleanup old deliveries and retry entries
   */
  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // Remove old retry entries
    this.retryQueue = this.retryQueue.filter(delivery => 
      !delivery.nextRetryAt || new Date(delivery.nextRetryAt) > cutoff
    );

    this.logger.info('Webhook cleanup completed', {
      retryQueueSize: this.retryQueue.length
    });
  }
}
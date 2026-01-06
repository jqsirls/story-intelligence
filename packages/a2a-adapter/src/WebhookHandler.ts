/**
 * Webhook Handler
 * 
 * Handles webhook delivery and receipt for A2A protocol.
 * Supports HMAC-SHA256 signature verification and retry logic.
 */

import { Logger } from 'winston';
import crypto from 'crypto';
import axios, { AxiosError } from 'axios';

export interface A2AWebhookEvent {
  event: string;
  taskId?: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempt: number;
}

export class WebhookHandler {
  private deliveryHistory: Map<string, WebhookDeliveryResult[]> = new Map();

  constructor(private logger: Logger) {}

  /**
   * Receive webhook from external agent
   */
  async receiveWebhook(
    payload: unknown,
    headers: Record<string, string | string[] | undefined>,
    secret?: string
  ): Promise<A2AWebhookEvent> {
    // Validate payload
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid webhook payload: must be an object');
    }

    const event = payload as Record<string, unknown>;

    // Validate required fields
    if (typeof event.event !== 'string') {
      throw new Error('Invalid webhook: missing or invalid event field');
    }

    if (!event.timestamp || typeof event.timestamp !== 'string') {
      throw new Error('Invalid webhook: missing or invalid timestamp field');
    }

    // Verify signature if secret provided
    if (secret) {
      const signature = this.extractSignature(headers);
      if (!signature) {
        throw new Error('Webhook signature missing');
      }

      const isValid = this.verifySignature(
        JSON.stringify(payload),
        signature,
        secret
      );

      if (!isValid) {
        throw new Error('Webhook signature verification failed');
      }
    }

    const webhookEvent: A2AWebhookEvent = {
      event: event.event as string,
      taskId: event.taskId as string | undefined,
      data: (event.data as Record<string, unknown>) || {},
      timestamp: event.timestamp as string
    };

    this.logger.info('Webhook received', {
      event: webhookEvent.event,
      taskId: webhookEvent.taskId
    });

    return webhookEvent;
  }

  /**
   * Deliver webhook to client agent
   */
  async deliverWebhook(
    url: string,
    event: A2AWebhookEvent,
    secret?: string,
    maxRetries: number = 3
  ): Promise<WebhookDeliveryResult> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < maxRetries) {
      attempt++;
      
      try {
        const payload = JSON.stringify(event);
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'Storytailor-A2A-Webhook/1.0'
        };

        // Add signature if secret provided
        if (secret) {
          const signature = this.generateSignature(payload, secret);
          headers['X-A2A-Signature'] = signature;
        }

        const response = await axios.post(url, event, {
          headers,
          timeout: 10000,
          validateStatus: (status) => status >= 200 && status < 300
        });

        const result: WebhookDeliveryResult = {
          success: true,
          statusCode: response.status,
          attempt
        };

        this.recordDelivery(url, result);
        this.logger.info('Webhook delivered successfully', {
          url,
          event: event.event,
          attempt,
          statusCode: response.status
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        const axiosError = error as AxiosError;
        const statusCode = axiosError.response?.status;

        this.logger.warn('Webhook delivery failed', {
          url,
          event: event.event,
          attempt,
          maxRetries,
          statusCode,
          error: lastError.message
        });

        // Don't retry on 4xx errors (client errors)
        if (statusCode && statusCode >= 400 && statusCode < 500) {
          const result: WebhookDeliveryResult = {
            success: false,
            statusCode,
            error: lastError.message,
            attempt
          };
          this.recordDelivery(url, result);
          return result;
        }

        // Retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          await this.sleep(delay);
        }
      }
    }

    // All retries failed
    const result: WebhookDeliveryResult = {
      success: false,
      error: lastError?.message || 'Webhook delivery failed after all retries',
      attempt
    };

    this.recordDelivery(url, result);
    this.logger.error('Webhook delivery failed after all retries', {
      url,
      event: event.event,
      maxRetries
    });

    return result;
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify HMAC-SHA256 signature
   */
  private verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Extract signature from headers
   */
  private extractSignature(headers: Record<string, string | string[] | undefined>): string | null {
    const signatureHeader = headers['x-a2a-signature'] || headers['X-A2A-Signature'];
    if (typeof signatureHeader === 'string') {
      return signatureHeader;
    }
    if (Array.isArray(signatureHeader) && signatureHeader.length > 0) {
      return signatureHeader[0];
    }
    return null;
  }

  /**
   * Record delivery attempt
   */
  private recordDelivery(url: string, result: WebhookDeliveryResult): void {
    if (!this.deliveryHistory.has(url)) {
      this.deliveryHistory.set(url, []);
    }
    const history = this.deliveryHistory.get(url);
    if (history) {
      history.push(result);
      // Keep only last 100 deliveries
      if (history.length > 100) {
        history.shift();
      }
    }
  }

  /**
   * Get delivery history for a URL
   */
  getDeliveryHistory(url: string): WebhookDeliveryResult[] {
    return this.deliveryHistory.get(url) || [];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

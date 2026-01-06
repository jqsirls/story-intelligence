/**
 * Webhook Adapter - Generic webhook delivery
 * Enables Make.com, Zapier, Buildship, and custom integrations
 */

import fetch from 'node-fetch';
import crypto from 'crypto';
import { Brief, Insight, PreLaunchMemo, WebhookConfig, WebhookPayload } from '../types';
import { Logger } from '../utils/logger';

export class WebhookAdapter {
  private logger: Logger;
  private config: WebhookConfig;
  private secret?: string;

  constructor(config: WebhookConfig, secret?: string) {
    this.config = config;
    this.secret = secret;
    this.logger = new Logger('WebhookAdapter');
  }

  /**
   * Send webhook for weekly brief
   */
  async sendWeeklyBrief(brief: Brief): Promise<void> {
    if (!this.shouldSendEvent('weekly_brief')) {
      return;
    }

    this.logger.info('Sending weekly brief via webhook');

    const payload: WebhookPayload = {
      event: 'weekly_brief',
      tenantId: brief.tenantId,
      data: {
        id: brief.id,
        weekOf: brief.weekOf,
        critical: brief.critical,
        tensions: brief.tensions,
        opportunities: brief.opportunities,
        killList: brief.killList,
        realityCheck: brief.realityCheck,
        selfDeception: brief.selfDeception,
        format: brief.format,
        content: brief.content
      },
      timestamp: new Date()
    };

    await this.sendWebhook(payload);
  }

  /**
   * Send webhook for new insight
   */
  async sendInsight(insight: Insight): Promise<void> {
    if (!this.shouldSendEvent('new_insight')) {
      return;
    }

    this.logger.info(`Sending insight via webhook: ${insight.finding}`);

    const payload: WebhookPayload = {
      event: 'new_insight',
      tenantId: insight.tenantId,
      data: insight,
      timestamp: new Date()
    };

    await this.sendWebhook(payload);
  }

  /**
   * Send webhook for critical finding
   */
  async sendCriticalFinding(insight: Insight): Promise<void> {
    if (!this.shouldSendEvent('critical_finding')) {
      return;
    }

    if (insight.severity !== 'critical' && insight.severity !== 'high') {
      return;
    }

    this.logger.info(`Sending critical finding via webhook: ${insight.finding}`);

    const payload: WebhookPayload = {
      event: 'critical_finding',
      tenantId: insight.tenantId,
      data: insight,
      timestamp: new Date()
    };

    await this.sendWebhook(payload);
  }

  /**
   * Send webhook for pre-launch memo
   */
  async sendPreLaunchMemo(memo: PreLaunchMemo): Promise<void> {
    if (!this.shouldSendEvent('pre_launch_memo')) {
      return;
    }

    this.logger.info(`Sending pre-launch memo via webhook: ${memo.featureName}`);

    const payload: WebhookPayload = {
      event: 'pre_launch_memo',
      tenantId: memo.tenantId,
      data: memo,
      timestamp: new Date()
    };

    await this.sendWebhook(payload);
  }

  /**
   * Send webhook with retry logic
   */
  private async sendWebhook(
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    if (!this.config.enabled || !this.config.url) {
      this.logger.warn('Webhook not enabled or URL not configured');
      return;
    }

    const signature = this.generateSignature(payload);

    try {
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Fieldnotes-Signature': signature,
          'X-Fieldnotes-Event': payload.event,
          'X-Fieldnotes-Timestamp': payload.timestamp.toISOString()
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      this.logger.info(`Webhook delivered successfully: ${payload.event}`);
    } catch (error) {
      this.logger.error(`Webhook delivery failed (attempt ${attempt})`, error);

      // Retry with exponential backoff (max 3 attempts)
      if (attempt < 3) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.sendWebhook(payload, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Generate HMAC signature for webhook security
   */
  private generateSignature(payload: WebhookPayload): string {
    if (!this.secret) {
      return '';
    }

    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.secret)
      .update(payloadString)
      .digest('hex');
  }

  /**
   * Check if event type should be sent
   */
  private shouldSendEvent(eventType: 'new_insight' | 'weekly_brief' | 'critical_finding' | 'pre_launch_memo'): boolean {
    if (!this.config.events || this.config.events.length === 0) {
      return true; // Send all events if not configured
    }

    return this.config.events.includes(eventType);
  }

  /**
   * Verify webhook signature (for incoming webhooks)
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.secret) {
      this.logger.warn('No webhook secret configured');
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

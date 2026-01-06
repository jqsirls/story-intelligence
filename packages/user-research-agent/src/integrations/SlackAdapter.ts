/**
 * Slack Adapter - Delivers insights to Slack channels
 * Weekly briefs, critical alerts, slash commands
 */

import fetch from 'node-fetch';
import { Brief, Insight, SlackConfig } from '../types';
import { Logger } from '../utils/logger';

export class SlackAdapter {
  private logger: Logger;
  private config: SlackConfig;

  constructor(config: SlackConfig) {
    this.config = config;
    this.logger = new Logger('SlackAdapter');
  }

  /**
   * Post weekly brief to Slack
   */
  async postWeeklyBrief(brief: Brief): Promise<void> {
    this.logger.info(`Posting weekly brief to Slack channel ${this.config.channel}`);

    if (!this.config.enabled || !this.config.webhookUrl) {
      this.logger.warn('Slack integration not enabled or configured');
      return;
    }

    const message = this.formatBriefForSlack(brief);

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }

      this.logger.info('Weekly brief posted to Slack successfully');
    } catch (error) {
      this.logger.error('Failed to post to Slack', error);
      throw error;
    }
  }

  /**
   * Post critical alert to Slack
   */
  async postCriticalAlert(insight: Insight): Promise<void> {
    if (!this.shouldAlert(insight.severity)) {
      return;
    }

    this.logger.info(`Posting critical alert for: ${insight.finding}`);

    const message = {
      text: `🚨 *CRITICAL FINDING*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Critical Finding from Fieldnotes',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${insight.finding}*`
          }
        },
        {
          type: 'section',
          fields: insight.evidence.map(e => ({
            type: 'mrkdwn',
            text: `*${e.metric}:*\n${e.value}`
          }))
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Recommendation:*\n${insight.recommendation}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Track: ${insight.trackType} | Severity: ${insight.severity} | ${new Date(insight.createdAt).toLocaleString()}`
            }
          ]
        }
      ]
    };

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      this.logger.info('Critical alert posted to Slack');
    } catch (error) {
      this.logger.error('Failed to post alert to Slack', error);
    }
  }

  /**
   * Format brief for Slack
   */
  private formatBriefForSlack(brief: Brief): any {
    const blocks: any[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📋 Research Brief - Week of ${new Date(brief.weekOf).toLocaleDateString()}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Delivered by Fieldnotes. Read in 5 minutes. Act on one thing._'
        }
      },
      {
        type: 'divider'
      }
    ];

    // Add critical section if present
    if (brief.critical) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🔴 CRITICAL: Fix This Week*\n\n${brief.critical.finding}\n\n*Evidence:*\n${brief.critical.evidence.map(e => `• ${e.metric}: ${e.value}`).join('\n')}\n\n*Recommendation:* ${brief.critical.recommendation}`
        }
      });
      blocks.push({ type: 'divider' });
    }

    // Add tensions if present
    if (brief.tensions.length > 0) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🟡 TENSIONS: Choose Soon*\n\n${brief.tensions.slice(0, 2).map(t => 
            `• ${t.description}\n  _${t.conflictingPriorities.join(' vs ')}_`
          ).join('\n\n')}`
        }
      });
      blocks.push({ type: 'divider' });
    }

    // Add self-deception alert if present
    if (brief.selfDeception) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*⚠️ What We're Lying to Ourselves About*\n\n*Claim:* ${brief.selfDeception.claim}\n\n*Reality:* ${brief.selfDeception.reality}\n\n*Recommendation:* ${brief.selfDeception.recommendation}`
        }
      });
      blocks.push({ type: 'divider' });
    }

    // Add link to full brief
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `View full brief with all details and analysis`
        }
      ]
    });

    return {
      text: `Research Brief - Week of ${new Date(brief.weekOf).toLocaleDateString()}`,
      blocks
    };
  }

  /**
   * Check if alert should be sent based on severity
   */
  private shouldAlert(severity: string): boolean {
    return this.config.alertSeverities.includes(severity as any);
  }

  /**
   * Send threaded discussion message
   */
  async postThreadedMessage(threadId: string, message: string): Promise<void> {
    this.logger.info('Threaded messages require Slack API (not webhook)');
    // Future: Implement with Slack Web API for threads
  }
}

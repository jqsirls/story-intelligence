/**
 * Email Adapter - Delivers insights via email
 * HTML formatted briefs and memos
 */

import { Brief, PreLaunchMemo, EmailConfig } from '../types';
import { Logger } from '../utils/logger';

export class EmailAdapter {
  private logger: Logger;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.logger = new Logger('EmailAdapter');
  }

  /**
   * Send weekly brief via email
   */
  async sendWeeklyBrief(brief: Brief): Promise<void> {
    this.logger.info(`Sending weekly brief to ${this.config.recipients.length} recipient(s)`);

    if (!this.config.enabled || this.config.recipients.length === 0) {
      this.logger.warn('Email integration not enabled or no recipients configured');
      return;
    }

    const subject = `Research Brief - Week of ${new Date(brief.weekOf).toLocaleDateString()}`;
    const htmlBody = this.formatBriefAsHTML(brief);
    const textBody = this.formatBriefAsText(brief);

    await this.sendEmail(subject, htmlBody, textBody);
  }

  /**
   * Send pre-launch memo via email
   */
  async sendPreLaunchMemo(memo: PreLaunchMemo): Promise<void> {
    this.logger.info(`Sending pre-launch memo for: ${memo.featureName}`);

    if (!this.config.enabled) {
      this.logger.warn('Email integration not enabled');
      return;
    }

    const subject = `Pre-Launch Risk Assessment: ${memo.featureName}`;
    const htmlBody = this.formatMemoAsHTML(memo);
    const textBody = this.formatMemoAsText(memo);

    await this.sendEmail(subject, htmlBody, textBody);
  }

  /**
   * Format brief as HTML
   */
  private formatBriefAsHTML(brief: Brief): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #e74c3c; margin-top: 30px; }
    .critical { background: #ffebee; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0; }
    .tension { background: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .opportunity { background: #e8f5e9; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; }
    .evidence { font-size: 0.9em; color: #666; margin: 10px 0; }
    .recommendation { font-weight: bold; color: #2c3e50; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>📋 Research Brief - Week of ${new Date(brief.weekOf).toLocaleDateString()}</h1>
  <p><em>Delivered by Fieldnotes. Read in 5 minutes. Act on one thing.</em></p>
  
  ${brief.critical ? `
    <div class="critical">
      <h2>🔴 CRITICAL: Fix This Week</h2>
      <p><strong>${brief.critical.finding}</strong></p>
      <div class="evidence">
        <strong>Evidence:</strong>
        <ul>
          ${brief.critical.evidence.map(e => `<li>${e.metric}: ${e.value}</li>`).join('')}
        </ul>
      </div>
      <div class="recommendation">Recommendation: ${brief.critical.recommendation}</div>
      <p><em>Cost of inaction: ${brief.critical.costOfInaction}</em></p>
    </div>
  ` : ''}
  
  ${brief.tensions.length > 0 ? `
    <div class="tension">
      <h2>🟡 TENSIONS: Choose Soon</h2>
      ${brief.tensions.slice(0, 2).map(t => `
        <p><strong>${t.description}</strong></p>
        <ul>
          ${t.conflictingPriorities.map(p => `<li>${p}</li>`).join('')}
        </ul>
        <p><em>Force choice by: ${new Date(t.forceChoiceBy).toLocaleDateString()}</em></p>
      `).join('<hr>')}
    </div>
  ` : ''}
  
  ${brief.selfDeception ? `
    <div class="critical">
      <h2>⚠️ What We're Lying to Ourselves About</h2>
      <p><strong>Claim:</strong> ${brief.selfDeception.claim}</p>
      <p><strong>Reality:</strong> ${brief.selfDeception.reality}</p>
      <div class="recommendation">Recommendation: ${brief.selfDeception.recommendation}</div>
    </div>
  ` : ''}
  
  <hr>
  <p style="font-size: 0.9em; color: #666;">
    <em>Next brief: ${new Date(new Date(brief.weekOf).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</em>
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Format brief as plain text
   */
  private formatBriefAsText(brief: Brief): string {
    let text = `RESEARCH BRIEF - Week of ${new Date(brief.weekOf).toLocaleDateString()}\n`;
    text += `Delivered by Fieldnotes\n`;
    text += `${'='.repeat(60)}\n\n`;

    if (brief.critical) {
      text += `🔴 CRITICAL: Fix This Week\n\n`;
      text += `${brief.critical.finding}\n\n`;
      text += `Evidence:\n`;
      brief.critical.evidence.forEach(e => {
        text += `- ${e.metric}: ${e.value}\n`;
      });
      text += `\nRecommendation: ${brief.critical.recommendation}\n`;
      text += `Cost of inaction: ${brief.critical.costOfInaction}\n\n`;
      text += `${'-'.repeat(60)}\n\n`;
    }

    if (brief.tensions.length > 0) {
      text += `🟡 TENSIONS: Choose Soon\n\n`;
      brief.tensions.slice(0, 2).forEach((t, i) => {
        text += `${i + 1}. ${t.description}\n`;
        text += `   Conflicts: ${t.conflictingPriorities.join(' vs ')}\n`;
        text += `   Deadline: ${new Date(t.forceChoiceBy).toLocaleDateString()}\n\n`;
      });
      text += `${'-'.repeat(60)}\n\n`;
    }

    if (brief.selfDeception) {
      text += `⚠️  What We're Lying to Ourselves About\n\n`;
      text += `Claim: ${brief.selfDeception.claim}\n`;
      text += `Reality: ${brief.selfDeception.reality}\n`;
      text += `Recommendation: ${brief.selfDeception.recommendation}\n\n`;
    }

    return text;
  }

  /**
   * Format memo as HTML
   */
  private formatMemoAsHTML(memo: PreLaunchMemo): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #2c3e50; }
    h2 { color: #3498db; margin-top: 30px; }
    .recommendation { background: ${memo.recommendation === 'ship' ? '#e8f5e9' : memo.recommendation === 'dont_ship' ? '#ffebee' : '#fff3e0'}; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .confidence { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>Pre-Launch Risk Assessment: ${memo.featureName}</h1>
  <p><em>Required reading before ship decision</em></p>
  
  <h2>CONCEPT: What we think we're building</h2>
  <p>${memo.concept}</p>
  
  <h2>REALITY: What we're actually building</h2>
  <p>${memo.reality}</p>
  
  <h2>WHO IS THIS FOR?</h2>
  <p><strong>Stated:</strong> ${memo.whoIsThisFor.stated}</p>
  <p><strong>Evidence-backed:</strong> ${memo.whoIsThisFor.evidenceBacked ? 'Yes' : 'No - Assumption'}</p>
  ${memo.whoIsThisFor.assumptions.length > 0 ? `<p><em>${memo.whoIsThisFor.assumptions.join('; ')}</em></p>` : ''}
  
  <h2>WHEN WOULD THEY QUIT?</h2>
  <ul>
    ${memo.whenWouldTheyQuit.map(r => `<li><strong>${r.scenario}</strong> (${r.probability} probability)</li>`).join('')}
  </ul>
  
  <h2>WHAT WILL CONFUSE THEM?</h2>
  <ul>
    ${memo.whatWillConfuse.map(c => `<li>${c.moment}: ${c.issue} (${c.severity})</li>`).join('')}
  </ul>
  
  <div class="recommendation">
    <h2>RECOMMENDATION: ${memo.recommendation.toUpperCase().replace('_', ' ')}</h2>
    <p class="confidence">Confidence: ${Math.round(memo.confidence * 100)}%</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format memo as plain text
   */
  private formatMemoAsText(memo: PreLaunchMemo): string {
    let text = `PRE-LAUNCH RISK ASSESSMENT: ${memo.featureName}\n`;
    text += `${'='.repeat(60)}\n\n`;
    text += `CONCEPT: ${memo.concept}\n\n`;
    text += `REALITY: ${memo.reality}\n\n`;
    text += `RECOMMENDATION: ${memo.recommendation.toUpperCase()}\n`;
    text += `Confidence: ${Math.round(memo.confidence * 100)}%\n`;
    return text;
  }

  /**
   * Send email (using Supabase Edge Function or AWS SES)
   */
  private async sendEmail(
    subject: string,
    htmlBody: string,
    textBody: string
  ): Promise<void> {
    // In production, this would call:
    // - Supabase Edge Function for sending email
    // - AWS SES directly
    // - SendGrid, Postmark, etc.
    
    this.logger.info(`Email would be sent: ${subject} to ${this.config.recipients.join(', ')}`);
    
    // Placeholder: Log email content
    this.logger.debug('Email content', { subject, recipients: this.config.recipients });
  }

  /**
   * Check if alert should be sent
   */
  private shouldAlert(severity: string): boolean {
    return severity === 'critical' || severity === 'high';
  }
}

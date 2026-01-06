/**
 * Track 5: Brand Consistency
 * Audits language, onboarding, prompts, and flows against brand voice
 * Flags generic, corporate, or off-brand content
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackEvaluation, BrandVoice, Evidence, Event } from '../../types';
import { Logger } from '../../utils/logger';

export class BrandConsistency {
  private supabase: SupabaseClient;
  private logger: Logger;
  private brandVoice: BrandVoice;

  constructor(supabase: SupabaseClient, brandVoice: BrandVoice) {
    this.supabase = supabase;
    this.brandVoice = brandVoice;
    this.logger = new Logger('BrandConsistency');
  }

  /**
   * Run the track analysis
   */
  async run(tenantId: string, contentToAudit?: string[]): Promise<TrackEvaluation> {
    this.logger.info('Running Brand Consistency audit');

    const evidence: Evidence[] = [];
    const issues: string[] = [];

    // Audit provided content or recent system content
    const contentSources = contentToAudit || await this.getRecentContent();

    for (const content of contentSources) {
      const auditResult = this.auditContent(content);
      if (auditResult.issues.length > 0) {
        issues.push(...auditResult.issues);
        evidence.push({
          metric: 'Brand voice violations',
          value: auditResult.issues.length,
          source: 'content_audit'
        });
      }
    }

    // Determine state
    const currentState = issues.length > 5 ? 'critical' :
                         issues.length > 2 ? 'concerning' : 'healthy';

    return {
      trackName: 'brand_consistency',
      currentState,
      evidence,
      tensions: [],
      recommendations: issues.length > 0 ? [{
        action: 'Review and revise flagged content',
        rationale: `${issues.length} brand voice violations detected`,
        urgency: currentState === 'critical' ? 'high' : 'medium'
      }] : [],
      timestamp: new Date()
    };
  }

  /**
   * Audit individual content piece
   */
  private auditContent(content: string): { issues: string[]; suggestions: string[] } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check against avoid list
    for (const avoidWord of this.brandVoice.avoid) {
      const regex = new RegExp(`\\b${avoidWord}\\b`, 'gi');
      if (regex.test(content)) {
        issues.push(`Contains avoided word: "${avoidWord}"`);
        suggestions.push(`Remove "${avoidWord}" and use more authentic language`);
      }
    }

    // Check for generic corporate speak
    const corporateIndicators = [
      'synergy',
      'leverage',
      'circle back',
      'touch base',
      'move the needle',
      'low-hanging fruit',
      'think outside the box'
    ];

    for (const indicator of corporateIndicators) {
      const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
      if (regex.test(content)) {
        issues.push(`Corporate speak detected: "${indicator}"`);
        suggestions.push('Use plain, direct language instead');
      }
    }

    // Check tone alignment
    if (this.brandVoice.tone.toLowerCase().includes('playful')) {
      // Should have some personality
      if (!content.includes('!') && content.split('.').length < 3) {
        issues.push('Content lacks playful energy');
        suggestions.push('Add warmth and personality');
      }
    }

    // Check for unclear CTAs
    const ctaWords = ['click', 'tap', 'select', 'choose', 'start', 'try'];
    const hasCTA = ctaWords.some(word => content.toLowerCase().includes(word));
    
    if (content.length > 100 && !hasCTA) {
      issues.push('No clear call-to-action');
      suggestions.push('Add explicit next step for user');
    }

    return { issues, suggestions };
  }

  /**
   * Get recent content to audit
   */
  private async getRecentContent(): Promise<string[]> {
    // In a real implementation, this would fetch:
    // - Recent UI copy
    // - Onboarding text
    // - Email templates
    // - Push notifications
    // - Error messages
    
    // For now, return sample content sources
    return [
      'Sample onboarding text',
      'Sample error message',
      'Sample CTA copy'
    ];
  }

  /**
   * Check against brand examples
   */
  private checkAgainstExamples(content: string): { score: number; feedback: string } {
    let score = 100;
    const feedback: string[] = [];

    for (const example of this.brandVoice.examples) {
      // Check if content follows "good" patterns
      const goodWords = example.good.toLowerCase().split(' ');
      const badWords = example.bad.toLowerCase().split(' ');

      const contentLower = content.toLowerCase();
      const hasBadWords = badWords.some(word => contentLower.includes(word));
      
      if (hasBadWords) {
        score -= 20;
        feedback.push(`Avoid "${example.bad}" style phrasing`);
      }
    }

    return {
      score,
      feedback: feedback.join('; ')
    };
  }
}

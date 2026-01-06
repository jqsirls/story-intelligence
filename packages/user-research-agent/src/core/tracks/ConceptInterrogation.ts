/**
 * Track 4: Concept Interrogation
 * Pre-mortem analysis for proposed features
 * Stress-tests concepts before they're built
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  PreLaunchMemo,
  Feature,
  WhoAnalysis,
  AbandonmentRisk,
  UXConfusion,
  BuyerLensAnalysis,
  UserLensAnalysis,
  LanguageAuditResult,
  Tension,
  BuyerPersona,
  EndUserPersona,
  Evidence,
  Event
} from '../../types';
import { Logger } from '../../utils/logger';

export class ConceptInterrogation {
  private supabase: SupabaseClient;
  private logger: Logger;
  private buyerPersona: BuyerPersona;
  private userPersona: EndUserPersona;

  constructor(
    supabase: SupabaseClient,
    buyerPersona: BuyerPersona,
    userPersona: EndUserPersona
  ) {
    this.supabase = supabase;
    this.buyerPersona = buyerPersona;
    this.userPersona = userPersona;
    this.logger = new Logger('ConceptInterrogation');
  }

  /**
   * Generate pre-launch memo for a feature
   */
  async generatePreLaunchMemo(
    tenantId: string,
    feature: Feature
  ): Promise<PreLaunchMemo> {
    this.logger.info(`Generating pre-launch memo for: ${feature.name}`);

    // Analyze WHO this is for
    const whoAnalysis = await this.analyzeWho(feature);

    // Analyze WHEN they would quit
    const abandonmentRisks = await this.analyzeWhenQuit(feature);

    // Analyze WHAT will confuse them
    const confusionPoints = await this.analyzeWhatConfuses(feature);

    // Buyer lens analysis
    const buyerLens = await this.analyzeBuyerLens(feature);

    // User lens analysis
    const userLens = await this.analyzeUserLens(feature);

    // Language audit
    const languageAudit = await this.auditLanguage(feature);

    // Identify tensions
    const tensions = await this.identifyTensions(buyerLens, userLens);

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      whoAnalysis,
      abandonmentRisks,
      confusionPoints,
      tensions
    );

    const memo: PreLaunchMemo = {
      id: crypto.randomUUID(),
      tenantId,
      featureName: feature.name,
      concept: `What we think: ${feature.description}`,
      reality: `What users will experience: ${this.describeReality(feature)}`,
      whoIsThisFor: whoAnalysis,
      whenWouldTheyQuit: abandonmentRisks,
      whatWillConfuse: confusionPoints,
      buyerLens,
      userLens,
      languageAudit,
      tensionMap: tensions,
      recommendation: recommendation.decision,
      confidence: recommendation.confidence,
      createdAt: new Date()
    };

    // Save to database
    await this.supabase
      .from('research_pre_launch_memos')
      .insert([{
        tenant_id: memo.tenantId,
        feature_name: memo.featureName,
        concept: memo.concept,
        reality: memo.reality,
        who_is_this_for: memo.whoIsThisFor,
        when_would_they_quit: memo.whenWouldTheyQuit,
        what_will_confuse: memo.whatWillConfuse,
        buyer_lens: memo.buyerLens,
        user_lens: memo.userLens,
        language_audit: memo.languageAudit,
        tension_map: memo.tensionMap,
        recommendation: memo.recommendation,
        confidence: memo.confidence
      }]);

    return memo;
  }

  /**
   * Analyze WHO this is for
   */
  private async analyzeWho(feature: Feature): Promise<WhoAnalysis> {
    // Check if target audience is backed by historical data
    const { data: events } = await this.supabase
      .from('event_store')
      .select('*')
      .ilike('data', `%${feature.targetAudience}%`)
      .limit(100);

    const hasEvidence = !!(events && events.length > 20);

    return {
      stated: feature.targetAudience,
      evidenceBacked: hasEvidence,
      actualData: hasEvidence ? [{
        metric: 'Historical interest',
        value: events!.length,
        source: 'event_store'
      }] : undefined,
      assumptions: hasEvidence ? [] : [
        `Assuming ${feature.targetAudience} wants this (no historical data)`
      ]
    };
  }

  /**
   * Analyze WHEN they would quit
   */
  private async analyzeWhenQuit(feature: Feature): Promise<AbandonmentRisk[]> {
    const risks: AbandonmentRisk[] = [];

    // Common abandonment scenarios
    if (feature.estimatedEffort && feature.estimatedEffort === 'high') {
      risks.push({
        scenario: 'Feature is too complex - users quit during initial setup',
        probability: 'high',
        mitigation: 'Add progressive disclosure or wizard-style onboarding'
      });
    }

    // Check for similar features that had high abandonment
    risks.push({
      scenario: 'Users try once, dont see value, never return',
      probability: 'medium',
      mitigation: 'Ensure immediate value delivery and clear next steps'
    });

    // Time-based abandonment
    if (this.buyerPersona.contextualFactors.some(f => f.includes('time'))) {
      risks.push({
        scenario: 'Takes too long - users abandon mid-flow',
        probability: 'medium',
        mitigation: 'Add quick-path option or save-for-later functionality'
      });
    }

    return risks;
  }

  /**
   * Analyze WHAT will confuse them
   */
  private async analyzeWhatConfuses(feature: Feature): Promise<UXConfusion[]> {
    const confusions: UXConfusion[] = [];

    // Check feature description for unclear language
    if (feature.description.split(' ').length > 20) {
      confusions.push({
        moment: 'Feature introduction',
        issue: 'Description is too long - users wont read it',
        severity: 'medium'
      });
    }

    // Check for jargon
    const jargonWords = ['leverage', 'synergy', 'optimize', 'streamline'];
    const hasJargon = jargonWords.some(word => 
      feature.description.toLowerCase().includes(word)
    );
    
    if (hasJargon) {
      confusions.push({
        moment: 'Feature explanation',
        issue: 'Contains jargon that target audience may not understand',
        severity: 'low'
      });
    }

    // Default confusion: unclear next steps
    confusions.push({
      moment: 'After feature activation',
      issue: 'What should user do next?',
      severity: 'medium'
    });

    return confusions;
  }

  /**
   * Analyze through buyer lens
   */
  private async analyzeBuyerLens(feature: Feature): Promise<BuyerLensAnalysis> {
    return {
      trustFactors: [
        {
          factor: 'Privacy',
          status: feature.description.includes('data') ? 'concerning' : 'neutral'
        },
        {
          factor: 'Safety',
          status: 'neutral'
        }
      ],
      timeCommitment: 'Medium (5-10 minutes estimated)',
      valuePerception: 'Unclear - needs validation'
    };
  }

  /**
   * Analyze through user lens
   */
  private async analyzeUserLens(feature: Feature): Promise<UserLensAnalysis> {
    return {
      delightFactors: [
        { factor: 'Novelty', rating: 7 },
        { factor: 'Usefulness', rating: 6 },
        { factor: 'Fun', rating: 5 }
      ],
      cognitiveLoad: 'medium',
      emotionalTone: 'Neutral to slightly positive'
    };
  }

  /**
   * Audit language
   */
  private async auditLanguage(feature: Feature): Promise<LanguageAuditResult> {
    const flags: any[] = [];

    // Check for generic language
    const genericPhrases = ['enhance', 'improve', 'optimize', 'streamline'];
    for (const phrase of genericPhrases) {
      if (feature.description.toLowerCase().includes(phrase)) {
        flags.push({
          type: 'generic',
          text: phrase,
          suggestion: 'Use specific, concrete language'
        });
      }
    }

    // Check for unclear CTAs
    if (!feature.description.includes('will') && !feature.description.includes('can')) {
      flags.push({
        type: 'unclear_cta',
        text: feature.description.substring(0, 50),
        suggestion: 'Make it clear what user can do'
      });
    }

    return { flags };
  }

  /**
   * Identify tensions between buyer and user needs
   */
  private async identifyTensions(
    buyerLens: BuyerLensAnalysis,
    userLens: UserLensAnalysis
  ): Promise<Tension[]> {
    const tensions: Tension[] = [];

    // Example tension: speed vs delight
    if (userLens.delightFactors.some(f => f.rating < 6)) {
      tensions.push({
        description: 'Buyer wants fast, user wants engaging - these conflict',
        conflictingPriorities: ['Buyer: Time', 'User: Delight'],
        forceChoiceBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        costOfInaction: 'Risk building something that satisfies nobody'
      });
    }

    return tensions;
  }

  /**
   * Generate ship/dont ship recommendation
   */
  private generateRecommendation(
    whoAnalysis: WhoAnalysis,
    risks: AbandonmentRisk[],
    confusions: UXConfusion[],
    tensions: Tension[]
  ): { decision: 'ship' | 'dont_ship' | 'fix_first'; confidence: number } {
    let score = 100;

    // Penalize for lack of evidence
    if (!whoAnalysis.evidenceBacked) score -= 30;

    // Penalize for high risks
    const highRisks = risks.filter(r => r.probability === 'high');
    score -= highRisks.length * 20;

    // Penalize for confusion points
    const highConfusions = confusions.filter(c => c.severity === 'high');
    score -= highConfusions.length * 15;

    // Penalize for tensions
    score -= tensions.length * 10;

    let decision: 'ship' | 'dont_ship' | 'fix_first';
    if (score >= 70) {
      decision = 'ship';
    } else if (score >= 40) {
      decision = 'fix_first';
    } else {
      decision = 'dont_ship';
    }

    return {
      decision,
      confidence: Math.max(0, Math.min(1, score / 100))
    };
  }

  /**
   * Describe reality vs concept
   */
  private describeReality(feature: Feature): string {
    return `Users will encounter a new ${feature.name} feature that ${feature.description.toLowerCase()}`;
  }

  /**
   * Parse timeframe
   */
  private parseTimeframe(timeframe: string): Date {
    const match = timeframe.match(/(\d+)\s*(day|hour|week)s?/);
    if (!match) return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const amount = parseInt(match[1]);
    const unit = match[2];

    const now = Date.now();
    switch (unit) {
      case 'hour':
        return new Date(now - amount * 60 * 60 * 1000);
      case 'day':
        return new Date(now - amount * 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now - amount * 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

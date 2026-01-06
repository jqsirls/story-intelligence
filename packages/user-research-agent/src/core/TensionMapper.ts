/**
 * Tension Mapper - Identifies conflicting priorities across tracks
 * Surfaces tradeoffs that can't be optimized away
 */

import { Tension, TrackEvaluation, Evidence } from '../types';
import { Logger } from '../utils/logger';

export class TensionMapper {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('TensionMapper');
  }

  /**
   * Identify tensions across track evaluations
   */
  identifyTensions(trackEvaluations: TrackEvaluation[]): Tension[] {
    this.logger.info('Mapping tensions across tracks');

    const tensions: Tension[] = [];

    // Find buyer vs user conflicts
    const buyerTrack = trackEvaluations.find(t => t.trackName === 'buyer_reality_check');
    const userTrack = trackEvaluations.find(t => t.trackName === 'user_experience_guardrails');

    if (buyerTrack && userTrack) {
      const buyerUserTensions = this.findBuyerUserTensions(buyerTrack, userTrack);
      tensions.push(...buyerUserTensions);
    }

    // Find brand vs product reality conflicts
    const brandTrack = trackEvaluations.find(t => t.trackName === 'brand_consistency');
    const insightTrack = trackEvaluations.find(t => t.trackName === 'continuous_insight_mining');

    if (brandTrack && insightTrack) {
      const brandRealityTensions = this.findBrandRealityTensions(brandTrack, insightTrack);
      tensions.push(...brandRealityTensions);
    }

    // Find speed vs quality tradeoffs
    const speedQualityTensions = this.findSpeedQualityTensions(trackEvaluations);
    tensions.push(...speedQualityTensions);

    return tensions;
  }

  /**
   * Find tensions between buyer and user needs
   */
  private findBuyerUserTensions(
    buyerTrack: TrackEvaluation,
    userTrack: TrackEvaluation
  ): Tension[] {
    const tensions: Tension[] = [];

    // Check for time vs delight conflict
    const timeEvidence = buyerTrack.evidence.find(e => 
      e.metric.toLowerCase().includes('time') || 
      e.metric.toLowerCase().includes('duration')
    );
    
    const delightEvidence = userTrack.evidence.find(e =>
      e.metric.toLowerCase().includes('delight') ||
      e.metric.toLowerCase().includes('fun')
    );

    if (timeEvidence && delightEvidence) {
      // If duration is high and delight is low, there's a tension
      const durationHigh = typeof timeEvidence.value === 'number' && timeEvidence.value > 300;
      const delightLow = typeof delightEvidence.value === 'number' && delightEvidence.value < 0.5;

      if (durationHigh || delightLow) {
        tensions.push({
          description: 'Buyer wants fast completion, but users need time for delight. These conflict.',
          conflictingPriorities: ['Buyer: Speed/efficiency', 'User: Exploration/delight'],
          forceChoiceBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
          costOfInaction: 'Risk building something that satisfies neither buyer nor user - the worst outcome'
        });
      }
    }

    // Check for complexity vs simplicity tension
    if (buyerTrack.currentState === 'concerning' && userTrack.currentState === 'concerning') {
      tensions.push({
        description: 'Both buyer and user tracks show concerns - likely overengineered',
        conflictingPriorities: ['Buyer: Simple setup', 'User: Rich features'],
        forceChoiceBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        costOfInaction: 'Continued complexity will hurt both adoption and engagement'
      });
    }

    return tensions;
  }

  /**
   * Find brand vs reality tensions
   */
  private findBrandRealityTensions(
    brandTrack: TrackEvaluation,
    insightTrack: TrackEvaluation
  ): Tension[] {
    const tensions: Tension[] = [];

    // If brand track shows issues and insight track shows different patterns
    if (brandTrack.currentState !== 'healthy') {
      tensions.push({
        description: 'Brand voice inconsistencies detected in actual product experience',
        conflictingPriorities: ['Brand: Stated values', 'Reality: User experience'],
        forceChoiceBy: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        costOfInaction: 'Brand promise misalignment erodes trust over time'
      });
    }

    return tensions;
  }

  /**
   * Find speed vs quality tradeoffs
   */
  private findSpeedQualityTensions(trackEvaluations: TrackEvaluation[]): Tension[] {
    const tensions: Tension[] = [];

    // Check if multiple tracks show issues simultaneously
    const concerningTracks = trackEvaluations.filter(t => 
      t.currentState === 'concerning' || t.currentState === 'critical'
    );

    if (concerningTracks.length >= 3) {
      tensions.push({
        description: 'Multiple tracks showing issues - likely shipping too fast without addressing fundamentals',
        conflictingPriorities: ['Velocity: Ship features quickly', 'Quality: Fix core experience'],
        forceChoiceBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        costOfInaction: 'Technical and UX debt compounds - each new feature makes core problems worse'
      });
    }

    return tensions;
  }

  /**
   * Prioritize tensions by urgency
   */
  prioritizeTensions(tensions: Tension[]): Tension[] {
    return tensions.sort((a, b) => {
      // Sort by force choice date (sooner = higher priority)
      return a.forceChoiceBy.getTime() - b.forceChoiceBy.getTime();
    });
  }

  /**
   * Format tension for brief
   */
  formatTensionForBrief(tension: Tension): string {
    const daysUntilChoice = Math.ceil(
      (tension.forceChoiceBy.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    return `
**${tension.description}**

Conflicting priorities:
${tension.conflictingPriorities.map(p => `- ${p}`).join('\n')}

Force choice by: ${tension.forceChoiceBy.toDateString()} (${daysUntilChoice} days)

Cost of inaction: ${tension.costOfInaction}
`.trim();
  }
}

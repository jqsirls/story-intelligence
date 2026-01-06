import { 
  ProgressMarker, 
  ProgressMarkerResult, 
  TherapeuticSession, 
  TherapeuticOutcome,
  EmotionalAssessment,
  ParentNotification
} from '../types';

export class TherapeuticProgressTracker {
  private sessions: Map<string, TherapeuticSession[]> = new Map();
  private outcomes: Map<string, TherapeuticOutcome[]> = new Map();

  constructor() {}

  recordSession(session: TherapeuticSession): void {
    const userSessions = this.sessions.get(session.userId) || [];
    userSessions.push(session);
    this.sessions.set(session.userId, userSessions);
  }

  updateSessionProgress(
    sessionId: string, 
    userId: string, 
    progressResults: ProgressMarkerResult[]
  ): void {
    const userSessions = this.sessions.get(userId) || [];
    const session = userSessions.find(s => s.id === sessionId);
    
    if (session) {
      session.progressMarkers = progressResults;
      session.endTime = new Date();
    }
  }

  assessProgress(
    userId: string, 
    pathwayId: string, 
    markers: ProgressMarker[]
  ): TherapeuticOutcome {
    const userSessions = this.sessions.get(userId) || [];
    const pathwaySessions = userSessions.filter(s => s.pathwayId === pathwayId);
    
    if (pathwaySessions.length === 0) {
      throw new Error('No sessions found for progress assessment');
    }

    const outcomes: TherapeuticOutcome['outcomes'] = {};
    let overallImprovement = 0;
    let assessedMarkers = 0;

    markers.forEach(marker => {
      const markerResults = pathwaySessions
        .flatMap(s => s.progressMarkers)
        .filter(r => r.markerId === marker.id)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      if (markerResults.length >= 2) {
        const baseline = markerResults[0];
        const current = markerResults[markerResults.length - 1];
        
        let improvement = 0;
        if (typeof baseline.value === 'number' && typeof current.value === 'number') {
          improvement = ((current.value - baseline.value) / baseline.value) * 100;
        }

        const clinicallySignificant = this.assessClinicalSignificance(
          marker, 
          baseline.value, 
          current.value
        );

        outcomes[marker.id] = {
          baseline: baseline.value,
          current: current.value,
          improvement,
          clinicallySignificant
        };

        overallImprovement += improvement;
        assessedMarkers++;
      }
    });

    const averageImprovement = assessedMarkers > 0 ? overallImprovement / assessedMarkers : 0;
    const overallProgress = this.categorizeProgress(averageImprovement);
    
    const outcome: TherapeuticOutcome = {
      sessionId: pathwaySessions[pathwaySessions.length - 1].id,
      pathwayId,
      userId,
      measuredAt: new Date(),
      outcomes,
      overallProgress,
      recommendedActions: this.generateRecommendations(outcomes, overallProgress),
      professionalReferralNeeded: this.assessReferralNeed(outcomes, overallProgress)
    };

    // Store outcome
    const userOutcomes = this.outcomes.get(userId) || [];
    userOutcomes.push(outcome);
    this.outcomes.set(userId, userOutcomes);

    return outcome;
  }

  private assessClinicalSignificance(
    marker: ProgressMarker, 
    baseline: number | string, 
    current: number | string
  ): boolean {
    // Implement clinical significance criteria based on marker type
    if (typeof baseline === 'number' && typeof current === 'number') {
      // For anxiety reduction: 25% improvement is clinically significant
      if (marker.id.includes('anxiety')) {
        return (baseline - current) / baseline >= 0.25;
      }
      
      // For self-esteem: 20% improvement is clinically significant
      if (marker.id.includes('confidence') || marker.id.includes('esteem')) {
        return (current - baseline) / baseline >= 0.20;
      }
      
      // Default: 15% improvement
      return Math.abs((current - baseline) / baseline) >= 0.15;
    }
    
    // For qualitative measures, check for positive change
    return current !== baseline && this.isPositiveChange(marker.id, baseline, current);
  }

  private isPositiveChange(markerId: string, baseline: any, current: any): boolean {
    // Define positive change criteria for different marker types
    const positiveChanges: Record<string, (baseline: any, current: any) => boolean> = {
      'coping-skill-usage': (b, c) => c === 'weekly usage' || c === 'daily usage',
      'emotional-expression': (b, c) => c === 'regular expression',
      'peer-interaction': (b, c) => c === 'daily interaction',
      'self-confidence': (b, c) => c === 'weekly new attempts'
    };

    const assessor = positiveChanges[markerId];
    return assessor ? assessor(baseline, current) : false;
  }

  private categorizeProgress(averageImprovement: number): TherapeuticOutcome['overallProgress'] {
    if (averageImprovement < -10) return 'declining';
    if (averageImprovement < 5) return 'stable';
    if (averageImprovement < 25) return 'improving';
    return 'significant_improvement';
  }

  private generateRecommendations(
    outcomes: TherapeuticOutcome['outcomes'], 
    overallProgress: TherapeuticOutcome['overallProgress']
  ): string[] {
    const recommendations: string[] = [];

    switch (overallProgress) {
      case 'declining':
        recommendations.push('Consider adjusting therapeutic approach');
        recommendations.push('Evaluate for external stressors or changes');
        recommendations.push('Increase session frequency if possible');
        recommendations.push('Consider professional consultation');
        break;
        
      case 'stable':
        recommendations.push('Continue current approach with minor adjustments');
        recommendations.push('Introduce new therapeutic elements');
        recommendations.push('Increase practice of learned skills');
        break;
        
      case 'improving':
        recommendations.push('Continue current therapeutic pathway');
        recommendations.push('Gradually increase challenge level');
        recommendations.push('Reinforce successful strategies');
        break;
        
      case 'significant_improvement':
        recommendations.push('Consider transitioning to maintenance phase');
        recommendations.push('Focus on generalization of skills');
        recommendations.push('Prepare for therapy completion');
        break;
    }

    // Add specific recommendations based on individual outcomes
    Object.entries(outcomes).forEach(([markerId, outcome]) => {
      if (!outcome.clinicallySignificant && outcome.improvement < 10) {
        if (markerId.includes('anxiety')) {
          recommendations.push('Consider additional anxiety management techniques');
        } else if (markerId.includes('social')) {
          recommendations.push('Increase structured social opportunities');
        } else if (markerId.includes('confidence')) {
          recommendations.push('Focus on strength-building activities');
        }
      }
    });

    return recommendations;
  }

  private assessReferralNeed(
    outcomes: TherapeuticOutcome['outcomes'], 
    overallProgress: TherapeuticOutcome['overallProgress']
  ): boolean {
    // Referral needed if declining or no improvement after sufficient time
    if (overallProgress === 'declining') return true;
    
    // Check for specific concerning patterns
    const concerningOutcomes = Object.values(outcomes).filter(outcome => 
      outcome.improvement < -5 || (!outcome.clinicallySignificant && outcome.improvement < 5)
    );
    
    return concerningOutcomes.length > Object.values(outcomes).length * 0.6; // More than 60% concerning
  }

  generateParentReport(userId: string, pathwayId: string): ParentNotification {
    const outcome = this.getLatestOutcome(userId, pathwayId);
    if (!outcome) {
      throw new Error('No outcome data available for report');
    }

    const progressSummary = this.summarizeProgress(outcome);
    const recommendations = outcome.recommendedActions.slice(0, 3); // Top 3 recommendations

    return {
      type: 'progress_update',
      priority: outcome.overallProgress === 'declining' ? 'high' : 'medium',
      title: 'Therapeutic Progress Update',
      message: `Your child's therapeutic progress: ${progressSummary}. ${recommendations.join(' ')}`,
      actionRequired: outcome.professionalReferralNeeded,
      resources: outcome.professionalReferralNeeded ? [
        {
          title: 'Find a Child Therapist',
          url: 'https://www.psychologytoday.com/us/therapists/children',
          type: 'professional_directory',
          ageAppropriate: false
        }
      ] : [],
      timestamp: new Date(),
      delivered: false
    };
  }

  private summarizeProgress(outcome: TherapeuticOutcome): string {
    const summaries: Record<TherapeuticOutcome['overallProgress'], string> = {
      'declining': 'showing some challenges that may need additional support',
      'stable': 'maintaining current level with steady engagement',
      'improving': 'showing positive progress in several areas',
      'significant_improvement': 'demonstrating excellent progress and growth'
    };

    return summaries[outcome.overallProgress];
  }

  getLatestOutcome(userId: string, pathwayId: string): TherapeuticOutcome | undefined {
    const userOutcomes = this.outcomes.get(userId) || [];
    const pathwayOutcomes = userOutcomes
      .filter(o => o.pathwayId === pathwayId)
      .sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime());
    
    return pathwayOutcomes[0];
  }

  getUserSessions(userId: string): TherapeuticSession[] {
    return this.sessions.get(userId) || [];
  }

  getSessionsByPathway(userId: string, pathwayId: string): TherapeuticSession[] {
    const userSessions = this.sessions.get(userId) || [];
    return userSessions.filter(s => s.pathwayId === pathwayId);
  }

  calculateSessionMetrics(userId: string, pathwayId: string): {
    totalSessions: number;
    averageSessionLength: number; // in minutes
    completionRate: number; // percentage of completed sessions
    engagementScore: number; // 1-10 based on interaction patterns
  } {
    const sessions = this.getSessionsByPathway(userId, pathwayId);
    
    const completedSessions = sessions.filter(s => s.endTime);
    const totalDuration = completedSessions.reduce((total, session) => {
      if (session.endTime) {
        return total + (session.endTime.getTime() - session.startTime.getTime());
      }
      return total;
    }, 0);

    const averageEngagement = sessions.reduce((total, session) => {
      const preEngagement = session.emotionalState.pre.engagement || 5;
      const postEngagement = session.emotionalState.post?.engagement || preEngagement;
      return total + (preEngagement + postEngagement) / 2;
    }, 0) / sessions.length;

    return {
      totalSessions: sessions.length,
      averageSessionLength: completedSessions.length > 0 ? 
        totalDuration / completedSessions.length / (1000 * 60) : 0, // Convert to minutes
      completionRate: sessions.length > 0 ? 
        (completedSessions.length / sessions.length) * 100 : 0,
      engagementScore: Math.round(averageEngagement * 10) / 10
    };
  }

  identifyRiskFactors(userId: string): string[] {
    const allSessions = this.getUserSessions(userId);
    const riskFactors: string[] = [];

    // Check for declining engagement
    const recentSessions = allSessions.slice(-5); // Last 5 sessions
    const engagementTrend = this.calculateEngagementTrend(recentSessions);
    if (engagementTrend < -0.5) {
      riskFactors.push('Declining engagement in sessions');
    }

    // Check for persistent high anxiety
    const highAnxietySessions = recentSessions.filter(s => 
      s.emotionalState.pre.anxiety > 7 || (s.emotionalState.post?.anxiety || 0) > 7
    );
    if (highAnxietySessions.length > recentSessions.length * 0.6) {
      riskFactors.push('Persistent high anxiety levels');
    }

    // Check for incomplete sessions
    const incompleteSessions = allSessions.filter(s => !s.endTime);
    if (incompleteSessions.length > allSessions.length * 0.3) {
      riskFactors.push('High rate of incomplete sessions');
    }

    // Check for crisis indicators in recent sessions
    const recentCrisisIndicators = recentSessions.some(s => 
      s.clinicalNotes?.toLowerCase().includes('crisis') ||
      s.clinicalNotes?.toLowerCase().includes('safety') ||
      s.clinicalNotes?.toLowerCase().includes('harm')
    );
    if (recentCrisisIndicators) {
      riskFactors.push('Recent crisis indicators detected');
    }

    return riskFactors;
  }

  private calculateEngagementTrend(sessions: TherapeuticSession[]): number {
    if (sessions.length < 2) return 0;

    const engagementScores = sessions.map(s => s.emotionalState.pre.engagement);
    const firstHalf = engagementScores.slice(0, Math.floor(sessions.length / 2));
    const secondHalf = engagementScores.slice(Math.floor(sessions.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return secondAvg - firstAvg;
  }

  exportProgressData(userId: string, pathwayId?: string): any {
    const sessions = pathwayId ? 
      this.getSessionsByPathway(userId, pathwayId) : 
      this.getUserSessions(userId);
    
    const outcomes = pathwayId ?
      (this.outcomes.get(userId) || []).filter(o => o.pathwayId === pathwayId) :
      this.outcomes.get(userId) || [];

    return {
      userId,
      pathwayId,
      exportDate: new Date().toISOString(),
      sessions: sessions.map(s => ({
        id: s.id,
        pathwayId: s.pathwayId,
        sessionNumber: s.sessionNumber,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString(),
        emotionalState: s.emotionalState,
        progressMarkers: s.progressMarkers,
        clinicalNotes: s.clinicalNotes
      })),
      outcomes: outcomes.map(o => ({
        pathwayId: o.pathwayId,
        measuredAt: o.measuredAt.toISOString(),
        overallProgress: o.overallProgress,
        outcomes: o.outcomes,
        recommendedActions: o.recommendedActions,
        professionalReferralNeeded: o.professionalReferralNeeded
      })),
      metrics: pathwayId ? this.calculateSessionMetrics(userId, pathwayId) : null,
      riskFactors: this.identifyRiskFactors(userId)
    };
  }
}
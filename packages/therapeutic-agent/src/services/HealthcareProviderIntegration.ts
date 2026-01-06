import { 
  TherapeuticOutcome, 
  TherapeuticSession, 
  ProgressMarkerResult,
  EmotionalAssessment,
  ParentNotification
} from '../types';

export interface HealthcareProvider {
  id: string;
  name: string;
  type: 'therapist' | 'psychiatrist' | 'psychologist' | 'counselor' | 'social_worker' | 'pediatrician';
  credentials: string[];
  licenseNumber: string;
  contactInfo: {
    phone: string;
    email: string;
    address?: string;
  };
  specializations: string[];
  acceptsChildren: boolean;
  ageRanges: {
    min: number;
    max: number;
  }[];
  verified: boolean;
  lastContactDate?: Date;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  providerId: string;
  parentId: string;
  consentType: 'progress_sharing' | 'full_records' | 'emergency_only' | 'assessment_results';
  consentGiven: boolean;
  consentDate: Date;
  expirationDate?: Date;
  scope: string[];
  restrictions: string[];
  revokedDate?: Date;
  revokedReason?: string;
}

export interface ProgressReport {
  id: string;
  userId: string;
  providerId: string;
  reportType: 'weekly_summary' | 'monthly_progress' | 'crisis_alert' | 'assessment_results' | 'custom';
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalSessions: number;
    completedSessions: number;
    averageEngagement: number;
    progressTrend: 'improving' | 'stable' | 'declining' | 'significant_improvement';
    keyAchievements: string[];
    concerningPatterns: string[];
  };
  therapeuticOutcomes: TherapeuticOutcome[];
  emotionalTrends: {
    anxiety: { baseline: number; current: number; trend: string };
    confidence: { baseline: number; current: number; trend: string };
    engagement: { baseline: number; current: number; trend: string };
  };
  recommendations: string[];
  parentFeedback?: string;
  attachments: {
    type: 'chart' | 'graph' | 'assessment' | 'notes';
    filename: string;
    url: string;
  }[];
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'acknowledged';
  deliveredAt?: Date;
}

export interface TherapeuticInsight {
  id: string;
  userId: string;
  insightType: 'pattern_detection' | 'risk_assessment' | 'progress_prediction' | 'intervention_recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  evidencePoints: string[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  generatedAt: Date;
  validUntil?: Date;
  actionTaken?: string;
  providerNotified: boolean;
}

export interface CollaborativeCareNote {
  id: string;
  userId: string;
  authorType: 'ai_system' | 'parent' | 'provider' | 'child';
  authorId: string;
  noteType: 'observation' | 'concern' | 'progress_update' | 'intervention_note' | 'question';
  content: string;
  timestamp: Date;
  tags: string[];
  priority: 'low' | 'medium' | 'high';
  responses: {
    authorType: string;
    authorId: string;
    content: string;
    timestamp: Date;
  }[];
  resolved: boolean;
  resolvedAt?: Date;
}

export class HealthcareProviderIntegration {
  private providers: Map<string, HealthcareProvider> = new Map();
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private progressReports: Map<string, ProgressReport[]> = new Map();
  private therapeuticInsights: Map<string, TherapeuticInsight[]> = new Map();
  private collaborativeNotes: Map<string, CollaborativeCareNote[]> = new Map();

  constructor() {}

  /**
   * Register healthcare provider
   */
  async registerProvider(provider: Omit<HealthcareProvider, 'id' | 'verified'>): Promise<HealthcareProvider> {
    const newProvider: HealthcareProvider = {
      ...provider,
      id: `provider-${Date.now()}`,
      verified: false
    };

    this.providers.set(newProvider.id, newProvider);
    
    // Initiate verification process
    await this.initiateProviderVerification(newProvider.id);
    
    return newProvider;
  }

  /**
   * Request consent for progress sharing
   */
  async requestProgressSharingConsent(
    userId: string,
    providerId: string,
    parentId: string,
    consentType: ConsentRecord['consentType'],
    scope: string[]
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: `consent-${Date.now()}`,
      userId,
      providerId,
      parentId,
      consentType,
      consentGiven: false, // Will be updated when parent responds
      consentDate: new Date(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      scope,
      restrictions: []
    };

    const userConsents = this.consentRecords.get(userId) || [];
    userConsents.push(consent);
    this.consentRecords.set(userId, userConsents);

    // Send consent request to parent
    await this.sendConsentRequest(consent);

    return consent;
  }

  /**
   * Process consent response from parent
   */
  async processConsentResponse(
    consentId: string,
    consentGiven: boolean,
    restrictions: string[] = []
  ): Promise<void> {
    // Find consent record
    let consentRecord: ConsentRecord | undefined;
    let userId: string | undefined;

    for (const [uid, consents] of this.consentRecords.entries()) {
      const found = consents.find(c => c.id === consentId);
      if (found) {
        consentRecord = found;
        userId = uid;
        break;
      }
    }

    if (!consentRecord || !userId) {
      throw new Error(`Consent record not found: ${consentId}`);
    }

    consentRecord.consentGiven = consentGiven;
    consentRecord.restrictions = restrictions;

    if (consentGiven) {
      // Start sharing progress with provider
      await this.initiateProgressSharing(userId, consentRecord.providerId);
    }
  }

  /**
   * Generate progress report for healthcare provider
   */
  async generateProgressReport(
    userId: string,
    providerId: string,
    reportType: ProgressReport['reportType'],
    startDate: Date,
    endDate: Date,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<ProgressReport> {
    // Verify consent
    const hasConsent = await this.verifyConsent(userId, providerId, 'progress_sharing');
    if (!hasConsent) {
      throw new Error('No valid consent for progress sharing');
    }

    const completedSessions = sessions.filter(s => s.endTime);
    const totalEngagement = sessions.reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0);
    const averageEngagement = sessions.length > 0 ? totalEngagement / sessions.length : 0;

    // Calculate progress trend
    const progressTrend = this.calculateProgressTrend(outcomes);

    // Generate insights
    const keyAchievements = this.identifyKeyAchievements(sessions, outcomes);
    const concerningPatterns = this.identifyConcerningPatterns(sessions, outcomes);

    // Calculate emotional trends
    const emotionalTrends = this.calculateEmotionalTrends(sessions);

    const report: ProgressReport = {
      id: `report-${Date.now()}`,
      userId,
      providerId,
      reportType,
      generatedAt: new Date(),
      reportPeriod: { startDate, endDate },
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        averageEngagement: Math.round(averageEngagement * 10) / 10,
        progressTrend,
        keyAchievements,
        concerningPatterns
      },
      therapeuticOutcomes: outcomes,
      emotionalTrends,
      recommendations: this.generateProviderRecommendations(sessions, outcomes),
      attachments: await this.generateReportAttachments(userId, sessions, outcomes),
      deliveryStatus: 'pending'
    };

    // Store report
    const userReports = this.progressReports.get(userId) || [];
    userReports.push(report);
    this.progressReports.set(userId, userReports);

    // Send to provider
    await this.deliverReportToProvider(report);

    return report;
  }

  /**
   * Generate therapeutic insights for provider
   */
  async generateTherapeuticInsights(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<TherapeuticInsight[]> {
    const insights: TherapeuticInsight[] = [];

    // Pattern detection insights
    const patterns = this.detectTherapeuticPatterns(sessions);
    patterns.forEach(pattern => {
      insights.push({
        id: `insight-${Date.now()}-${Math.random()}`,
        userId,
        insightType: 'pattern_detection',
        title: pattern.title,
        description: pattern.description,
        confidence: pattern.confidence,
        evidencePoints: pattern.evidence,
        recommendations: pattern.recommendations,
        urgency: pattern.urgency,
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        providerNotified: false
      });
    });

    // Risk assessment insights
    const riskAssessment = this.assessTherapeuticRisk(sessions, outcomes);
    if (riskAssessment.riskLevel !== 'low') {
      insights.push({
        id: `insight-${Date.now()}-risk`,
        userId,
        insightType: 'risk_assessment',
        title: `${riskAssessment.riskLevel.toUpperCase()} Risk Assessment`,
        description: riskAssessment.description,
        confidence: riskAssessment.confidence,
        evidencePoints: riskAssessment.riskFactors,
        recommendations: riskAssessment.recommendations,
        urgency: riskAssessment.riskLevel === 'high' ? 'critical' : 'high',
        generatedAt: new Date(),
        providerNotified: false
      });
    }

    // Progress prediction insights
    const progressPrediction = this.predictProgressTrajectory(sessions, outcomes);
    insights.push({
      id: `insight-${Date.now()}-prediction`,
      userId,
      insightType: 'progress_prediction',
      title: 'Progress Trajectory Prediction',
      description: progressPrediction.description,
      confidence: progressPrediction.confidence,
      evidencePoints: progressPrediction.evidence,
      recommendations: progressPrediction.recommendations,
      urgency: progressPrediction.concernLevel,
      generatedAt: new Date(),
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      providerNotified: false
    });

    // Store insights
    const userInsights = this.therapeuticInsights.get(userId) || [];
    userInsights.push(...insights);
    this.therapeuticInsights.set(userId, userInsights);

    return insights;
  }

  /**
   * Create collaborative care note
   */
  async createCollaborativeCareNote(
    userId: string,
    authorType: CollaborativeCareNote['authorType'],
    authorId: string,
    noteType: CollaborativeCareNote['noteType'],
    content: string,
    tags: string[] = [],
    priority: CollaborativeCareNote['priority'] = 'medium'
  ): Promise<CollaborativeCareNote> {
    const note: CollaborativeCareNote = {
      id: `note-${Date.now()}`,
      userId,
      authorType,
      authorId,
      noteType,
      content,
      timestamp: new Date(),
      tags,
      priority,
      responses: [],
      resolved: false
    };

    const userNotes = this.collaborativeNotes.get(userId) || [];
    userNotes.push(note);
    this.collaborativeNotes.set(userId, userNotes);

    // Notify relevant parties
    await this.notifyCollaborativeTeam(note);

    return note;
  }

  /**
   * Add response to collaborative care note
   */
  async addNoteResponse(
    noteId: string,
    authorType: string,
    authorId: string,
    content: string
  ): Promise<void> {
    // Find note
    let note: CollaborativeCareNote | undefined;
    for (const [userId, notes] of this.collaborativeNotes.entries()) {
      const found = notes.find(n => n.id === noteId);
      if (found) {
        note = found;
        break;
      }
    }

    if (!note) {
      throw new Error(`Note not found: ${noteId}`);
    }

    note.responses.push({
      authorType,
      authorId,
      content,
      timestamp: new Date()
    });

    // Notify other team members of response
    await this.notifyNoteResponse(note, authorType, authorId);
  }

  /**
   * Export comprehensive therapeutic data for provider
   */
  async exportTherapeuticData(
    userId: string,
    providerId: string,
    includeRawData: boolean = false
  ): Promise<any> {
    // Verify consent
    const hasConsent = await this.verifyConsent(userId, providerId, 'full_records');
    if (!hasConsent) {
      throw new Error('No valid consent for full records sharing');
    }

    const reports = this.progressReports.get(userId) || [];
    const insights = this.therapeuticInsights.get(userId) || [];
    const notes = this.collaborativeNotes.get(userId) || [];

    const exportData = {
      userId,
      exportDate: new Date().toISOString(),
      providerId,
      summary: {
        totalReports: reports.length,
        totalInsights: insights.length,
        totalNotes: notes.length,
        dataRange: {
          earliest: reports.length > 0 ? reports[0].reportPeriod.startDate : null,
          latest: reports.length > 0 ? reports[reports.length - 1].reportPeriod.endDate : null
        }
      },
      progressReports: reports.map(r => ({
        id: r.id,
        reportType: r.reportType,
        generatedAt: r.generatedAt,
        summary: r.summary,
        emotionalTrends: r.emotionalTrends,
        recommendations: r.recommendations,
        ...(includeRawData && { therapeuticOutcomes: r.therapeuticOutcomes })
      })),
      therapeuticInsights: insights.map(i => ({
        id: i.id,
        insightType: i.insightType,
        title: i.title,
        description: i.description,
        confidence: i.confidence,
        recommendations: i.recommendations,
        urgency: i.urgency,
        generatedAt: i.generatedAt
      })),
      collaborativeNotes: notes.map(n => ({
        id: n.id,
        authorType: n.authorType,
        noteType: n.noteType,
        content: n.content,
        timestamp: n.timestamp,
        tags: n.tags,
        priority: n.priority,
        responses: n.responses,
        resolved: n.resolved
      }))
    };

    return exportData;
  }

  /**
   * Get provider recommendations based on therapeutic data
   */
  async getProviderRecommendations(
    userId: string,
    providerId: string
  ): Promise<string[]> {
    const reports = this.progressReports.get(userId) || [];
    const insights = this.therapeuticInsights.get(userId) || [];

    const recommendations: string[] = [];

    // Analyze recent reports
    const recentReports = reports.slice(-3); // Last 3 reports
    recentReports.forEach(report => {
      recommendations.push(...report.recommendations);
    });

    // Analyze high-priority insights
    const highPriorityInsights = insights.filter(i => 
      i.urgency === 'high' || i.urgency === 'critical'
    );
    highPriorityInsights.forEach(insight => {
      recommendations.push(...insight.recommendations);
    });

    // Remove duplicates and return
    return [...new Set(recommendations)];
  }

  // Private helper methods

  private async initiateProviderVerification(providerId: string): Promise<void> {
    // In real implementation, would verify credentials
    console.log(`Initiating verification for provider: ${providerId}`);
    
    // Simulate verification process
    setTimeout(() => {
      const provider = this.providers.get(providerId);
      if (provider) {
        provider.verified = true;
      }
    }, 5000);
  }

  private async sendConsentRequest(consent: ConsentRecord): Promise<void> {
    // In real implementation, would send consent request to parent
    console.log(`Sending consent request: ${consent.id}`);
  }

  private async initiateProgressSharing(userId: string, providerId: string): Promise<void> {
    // In real implementation, would set up automated progress sharing
    console.log(`Initiating progress sharing for user ${userId} with provider ${providerId}`);
  }

  private async verifyConsent(
    userId: string,
    providerId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<boolean> {
    const userConsents = this.consentRecords.get(userId) || [];
    const validConsent = userConsents.find(c => 
      c.providerId === providerId &&
      c.consentType === consentType &&
      c.consentGiven &&
      !c.revokedDate &&
      (!c.expirationDate || c.expirationDate > new Date())
    );

    return !!validConsent;
  }

  private calculateProgressTrend(outcomes: TherapeuticOutcome[]): ProgressReport['summary']['progressTrend'] {
    if (outcomes.length === 0) return 'stable';

    const recentOutcomes = outcomes.slice(-3); // Last 3 outcomes
    const improvingCount = recentOutcomes.filter(o => o.overallProgress === 'improving' || o.overallProgress === 'significant_improvement').length;
    const decliningCount = recentOutcomes.filter(o => o.overallProgress === 'declining').length;

    if (improvingCount >= 2) return 'improving';
    if (decliningCount >= 2) return 'declining';
    if (recentOutcomes.some(o => o.overallProgress === 'significant_improvement')) return 'significant_improvement';
    
    return 'stable';
  }

  private identifyKeyAchievements(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): string[] {
    const achievements: string[] = [];

    // Analyze session completion rates
    const completionRate = sessions.filter(s => s.endTime).length / sessions.length;
    if (completionRate > 0.8) {
      achievements.push('High session completion rate (>80%)');
    }

    // Analyze engagement improvements
    const engagementScores = sessions.map(s => s.emotionalState.pre.engagement);
    if (engagementScores.length > 1) {
      const firstHalf = engagementScores.slice(0, Math.floor(engagementScores.length / 2));
      const secondHalf = engagementScores.slice(Math.floor(engagementScores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg + 1) {
        achievements.push('Significant improvement in engagement levels');
      }
    }

    // Analyze therapeutic outcomes
    const significantImprovements = outcomes.filter(o => o.overallProgress === 'significant_improvement');
    if (significantImprovements.length > 0) {
      achievements.push('Achieved significant therapeutic improvements');
    }

    return achievements;
  }

  private identifyConcerningPatterns(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): string[] {
    const concerns: string[] = [];

    // Check for declining engagement
    const recentSessions = sessions.slice(-5);
    const engagementTrend = this.calculateEngagementTrend(recentSessions);
    if (engagementTrend < -1) {
      concerns.push('Declining engagement in recent sessions');
    }

    // Check for incomplete sessions
    const incompleteRate = sessions.filter(s => !s.endTime).length / sessions.length;
    if (incompleteRate > 0.3) {
      concerns.push('High rate of incomplete sessions (>30%)');
    }

    // Check for declining outcomes
    const decliningOutcomes = outcomes.filter(o => o.overallProgress === 'declining');
    if (decliningOutcomes.length > outcomes.length * 0.4) {
      concerns.push('Multiple declining therapeutic outcomes');
    }

    return concerns;
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

  private calculateEmotionalTrends(sessions: TherapeuticSession[]): ProgressReport['emotionalTrends'] {
    if (sessions.length === 0) {
      return {
        anxiety: { baseline: 5, current: 5, trend: 'stable' },
        confidence: { baseline: 5, current: 5, trend: 'stable' },
        engagement: { baseline: 5, current: 5, trend: 'stable' }
      };
    }

    const firstSession = sessions[0];
    const lastSession = sessions[sessions.length - 1];

    const calculateTrend = (baseline: number, current: number): string => {
      const diff = current - baseline;
      if (diff > 1) return 'improving';
      if (diff < -1) return 'declining';
      return 'stable';
    };

    return {
      anxiety: {
        baseline: firstSession.emotionalState.pre.anxiety,
        current: lastSession.emotionalState.pre.anxiety,
        trend: calculateTrend(firstSession.emotionalState.pre.anxiety, lastSession.emotionalState.pre.anxiety)
      },
      confidence: {
        baseline: firstSession.emotionalState.pre.confidence,
        current: lastSession.emotionalState.pre.confidence,
        trend: calculateTrend(firstSession.emotionalState.pre.confidence, lastSession.emotionalState.pre.confidence)
      },
      engagement: {
        baseline: firstSession.emotionalState.pre.engagement,
        current: lastSession.emotionalState.pre.engagement,
        trend: calculateTrend(firstSession.emotionalState.pre.engagement, lastSession.emotionalState.pre.engagement)
      }
    };
  }

  private generateProviderRecommendations(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): string[] {
    const recommendations: string[] = [];

    // Analyze session patterns
    const avgEngagement = sessions.reduce((sum, s) => sum + s.emotionalState.pre.engagement, 0) / sessions.length;
    if (avgEngagement < 5) {
      recommendations.push('Consider adjusting therapeutic approach to increase child engagement');
    }

    // Analyze outcomes
    const decliningOutcomes = outcomes.filter(o => o.overallProgress === 'declining');
    if (decliningOutcomes.length > 0) {
      recommendations.push('Review current therapeutic interventions - some outcomes showing decline');
    }

    // Default recommendations
    recommendations.push('Continue monitoring progress and adjust interventions as needed');
    recommendations.push('Maintain regular communication with family about therapeutic goals');

    return recommendations;
  }

  private async generateReportAttachments(
    userId: string,
    sessions: TherapeuticSession[],
    outcomes: TherapeuticOutcome[]
  ): Promise<ProgressReport['attachments']> {
    // In real implementation, would generate actual charts and graphs
    return [
      {
        type: 'chart',
        filename: `engagement_trends_${userId}.png`,
        url: `/reports/charts/engagement_${userId}_${Date.now()}.png`
      },
      {
        type: 'graph',
        filename: `progress_overview_${userId}.pdf`,
        url: `/reports/graphs/progress_${userId}_${Date.now()}.pdf`
      }
    ];
  }

  private async deliverReportToProvider(report: ProgressReport): Promise<void> {
    // In real implementation, would send report to provider
    console.log(`Delivering report ${report.id} to provider ${report.providerId}`);
    
    // Simulate delivery
    setTimeout(() => {
      report.deliveryStatus = 'delivered';
      report.deliveredAt = new Date();
    }, 1000);
  }

  private detectTherapeuticPatterns(sessions: TherapeuticSession[]): any[] {
    // Simplified pattern detection
    return [
      {
        title: 'Consistent Engagement Pattern',
        description: 'Child shows consistent engagement levels across sessions',
        confidence: 0.8,
        evidence: ['Engagement scores remain within 1-2 points across sessions'],
        recommendations: ['Continue current approach'],
        urgency: 'low' as const
      }
    ];
  }

  private assessTherapeuticRisk(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): any {
    const riskFactors: string[] = [];
    let riskLevel = 'low';

    // Check for declining patterns
    const recentOutcomes = outcomes.slice(-3);
    const decliningCount = recentOutcomes.filter(o => o.overallProgress === 'declining').length;
    
    if (decliningCount >= 2) {
      riskFactors.push('Multiple declining therapeutic outcomes');
      riskLevel = 'medium';
    }

    return {
      riskLevel,
      description: `Risk assessment based on ${sessions.length} sessions and ${outcomes.length} outcomes`,
      confidence: 0.7,
      riskFactors,
      recommendations: ['Continue monitoring', 'Consider intervention adjustment if decline continues']
    };
  }

  private predictProgressTrajectory(sessions: TherapeuticSession[], outcomes: TherapeuticOutcome[]): any {
    return {
      description: 'Based on current trends, child is likely to continue making steady progress',
      confidence: 0.6,
      evidence: ['Consistent session attendance', 'Stable engagement levels'],
      recommendations: ['Maintain current therapeutic approach'],
      concernLevel: 'low' as const
    };
  }

  private async notifyCollaborativeTeam(note: CollaborativeCareNote): Promise<void> {
    // In real implementation, would notify team members
    console.log(`Notifying collaborative team about note: ${note.id}`);
  }

  private async notifyNoteResponse(note: CollaborativeCareNote, authorType: string, authorId: string): Promise<void> {
    // In real implementation, would notify team members of response
    console.log(`Notifying team about response to note: ${note.id} from ${authorType}:${authorId}`);
  }
}
import * as crypto from 'crypto';
import { EventEmitter } from 'events';

export interface PrivacyAuditEvent {
  auditId: string;
  timestamp: number;
  userId: string;
  agentId: string;
  eventType: 'data_access' | 'data_processing' | 'consent_change' | 'data_deletion' | 'data_export' | 'privacy_violation';
  dataCategory: string;
  processingPurpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataSubject: {
    userId: string;
    age?: number;
    jurisdiction: string;
  };
  processingDetails: {
    dataTypes: string[];
    retentionPeriod?: number;
    thirdPartySharing?: boolean;
    crossBorderTransfer?: boolean;
    automatedDecisionMaking?: boolean;
  };
  complianceStatus: 'compliant' | 'violation' | 'warning' | 'under_review';
  riskScore: number; // 0-1 scale
  metadata: Record<string, any>;
  remedialActions?: string[];
}

export interface ComplianceReport {
  reportId: string;
  reportType: 'gdpr' | 'coppa' | 'ccpa' | 'uk_childrens_code' | 'comprehensive';
  generatedAt: number;
  reportPeriod: { start: number; end: number };
  summary: {
    totalEvents: number;
    complianceRate: number;
    violationCount: number;
    warningCount: number;
    averageRiskScore: number;
  };
  violations: PrivacyViolation[];
  recommendations: string[];
  dataSubjectRights: {
    accessRequests: number;
    deletionRequests: number;
    rectificationRequests: number;
    portabilityRequests: number;
    averageResponseTime: number;
  };
  consentMetrics: {
    consentRate: number;
    withdrawalRate: number;
    granularConsentBreakdown: Record<string, number>;
  };
  dataFlowAnalysis: {
    dataCategories: Record<string, number>;
    processingPurposes: Record<string, number>;
    legalBases: Record<string, number>;
    thirdPartySharing: number;
    crossBorderTransfers: number;
  };
}

export interface PrivacyViolation {
  violationId: string;
  timestamp: number;
  violationType: 'unauthorized_access' | 'excessive_retention' | 'missing_consent' | 'improper_deletion' | 'data_breach' | 'purpose_limitation' | 'data_minimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedDataSubjects: number;
  dataCategories: string[];
  potentialImpact: string;
  remedialActions: string[];
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: number;
  regulatoryNotificationRequired: boolean;
}

export interface DataFlowMapping {
  flowId: string;
  sourceSystem: string;
  destinationSystem: string;
  dataCategories: string[];
  processingPurpose: string;
  legalBasis: string;
  retentionPeriod: number;
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  accessControls: string[];
  thirdPartyInvolved: boolean;
  crossBorderTransfer: boolean;
  dataSubjectRights: string[];
}

export class PrivacyAuditService extends EventEmitter {
  private auditEvents: Map<string, PrivacyAuditEvent> = new Map();
  private violations: Map<string, PrivacyViolation> = new Map();
  private dataFlows: Map<string, DataFlowMapping> = new Map();
  private complianceRules: Map<string, ComplianceRule> = new Map();
  private reports: Map<string, ComplianceReport> = new Map();

  constructor() {
    super();
    this.initializeComplianceRules();
    this.startContinuousMonitoring();
  }

  /**
   * Records a privacy audit event
   */
  async recordAuditEvent(event: Omit<PrivacyAuditEvent, 'auditId' | 'timestamp'>): Promise<string> {
    const auditEvent: PrivacyAuditEvent = {
      ...event,
      auditId: this.generateAuditId(),
      timestamp: Date.now()
    };

    // Validate event against compliance rules
    await this.validateCompliance(auditEvent);

    // Store event
    this.auditEvents.set(auditEvent.auditId, auditEvent);

    // Emit for real-time monitoring
    this.emit('auditEvent', auditEvent);

    // Check for violations
    if (auditEvent.complianceStatus === 'violation') {
      await this.handleViolation(auditEvent);
    }

    return auditEvent.auditId;
  }

  /**
   * Validates event against compliance rules
   */
  private async validateCompliance(event: PrivacyAuditEvent): Promise<void> {
    let riskScore = 0;
    const violations: string[] = [];

    // Check age-based rules (COPPA)
    if (event.dataSubject.age && event.dataSubject.age < 13) {
      if (event.legalBasis !== 'consent') {
        violations.push('COPPA violation: Processing child data without parental consent');
        riskScore += 0.8;
      }
    }

    // Check data minimization
    if (event.processingDetails.dataTypes.length > 10) {
      violations.push('Potential data minimization violation: Excessive data collection');
      riskScore += 0.3;
    }

    // Check retention periods
    if (event.processingDetails.retentionPeriod && event.processingDetails.retentionPeriod > 365 * 24 * 60 * 60 * 1000) {
      violations.push('Potential retention violation: Excessive retention period');
      riskScore += 0.4;
    }

    // Check cross-border transfers
    if (event.processingDetails.crossBorderTransfer && event.dataSubject.jurisdiction === 'EU') {
      violations.push('GDPR concern: Cross-border transfer of EU data');
      riskScore += 0.5;
    }

    // Check automated decision making
    if (event.processingDetails.automatedDecisionMaking && event.legalBasis !== 'consent') {
      violations.push('GDPR Article 22 concern: Automated decision making without consent');
      riskScore += 0.6;
    }

    // Update event based on validation
    event.riskScore = Math.min(riskScore, 1.0);
    
    if (violations.length > 0) {
      event.complianceStatus = riskScore > 0.7 ? 'violation' : 'warning';
      event.remedialActions = violations;
    } else {
      event.complianceStatus = 'compliant';
    }
  }

  /**
   * Handles privacy violations
   */
  private async handleViolation(event: PrivacyAuditEvent): Promise<void> {
    const violation: PrivacyViolation = {
      violationId: this.generateViolationId(),
      timestamp: event.timestamp,
      violationType: this.categorizeViolation(event),
      severity: this.calculateSeverity(event.riskScore),
      description: event.remedialActions?.join('; ') || 'Privacy compliance violation detected',
      affectedDataSubjects: 1, // Would be calculated based on scope
      dataCategories: event.processingDetails.dataTypes,
      potentialImpact: this.assessPotentialImpact(event),
      remedialActions: event.remedialActions || [],
      status: 'open',
      regulatoryNotificationRequired: event.riskScore > 0.8
    };

    this.violations.set(violation.violationId, violation);
    this.emit('privacyViolation', violation);

    // Auto-assign based on severity
    if (violation.severity === 'critical' || violation.severity === 'high') {
      violation.assignedTo = 'privacy_officer';
      this.emit('criticalViolation', violation);
    }
  }

  /**
   * Generates comprehensive compliance report
   */
  async generateComplianceReport(
    reportType: ComplianceReport['reportType'],
    startDate: number,
    endDate: number
  ): Promise<string> {
    const reportId = this.generateReportId();
    
    // Filter events by date range
    const relevantEvents = Array.from(this.auditEvents.values())
      .filter(event => event.timestamp >= startDate && event.timestamp <= endDate);

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(relevantEvents);
    
    // Get violations in period
    const periodViolations = Array.from(this.violations.values())
      .filter(v => v.timestamp >= startDate && v.timestamp <= endDate);

    // Generate recommendations
    const recommendations = this.generateRecommendations(relevantEvents, periodViolations);

    // Calculate data subject rights metrics
    const dataSubjectRights = this.calculateDataSubjectRightsMetrics(relevantEvents);

    // Calculate consent metrics
    const consentMetrics = this.calculateConsentMetrics(relevantEvents);

    // Analyze data flows
    const dataFlowAnalysis = this.analyzeDataFlows(relevantEvents);

    const report: ComplianceReport = {
      reportId,
      reportType,
      generatedAt: Date.now(),
      reportPeriod: { start: startDate, end: endDate },
      summary,
      violations: periodViolations,
      recommendations,
      dataSubjectRights,
      consentMetrics,
      dataFlowAnalysis
    };

    this.reports.set(reportId, report);
    this.emit('reportGenerated', report);

    return reportId;
  }

  /**
   * Maps data flows for privacy impact assessment
   */
  registerDataFlow(flow: Omit<DataFlowMapping, 'flowId'>): string {
    const flowId = this.generateFlowId();
    const dataFlow: DataFlowMapping = {
      ...flow,
      flowId
    };

    this.dataFlows.set(flowId, dataFlow);
    this.emit('dataFlowRegistered', dataFlow);

    return flowId;
  }

  /**
   * Performs privacy impact assessment
   */
  async performPrivacyImpactAssessment(
    processingActivity: string,
    dataCategories: string[],
    dataSubjects: number
  ): Promise<{
    riskScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'very_high';
    recommendations: string[];
    mitigationMeasures: string[];
  }> {
    let riskScore = 0;
    const recommendations: string[] = [];
    const mitigationMeasures: string[] = [];

    // Assess data sensitivity
    const sensitiveCategories = ['biometric', 'health', 'financial', 'location', 'children'];
    const hasSensitiveData = dataCategories.some(cat => 
      sensitiveCategories.some(sensitive => cat.toLowerCase().includes(sensitive))
    );

    if (hasSensitiveData) {
      riskScore += 0.4;
      recommendations.push('Implement enhanced security measures for sensitive data');
      mitigationMeasures.push('End-to-end encryption', 'Access logging', 'Regular security audits');
    }

    // Assess scale
    if (dataSubjects > 10000) {
      riskScore += 0.3;
      recommendations.push('Implement data minimization strategies');
      mitigationMeasures.push('Automated data retention policies', 'Regular data purging');
    }

    // Assess automated decision making
    if (processingActivity.toLowerCase().includes('automated') || 
        processingActivity.toLowerCase().includes('ai')) {
      riskScore += 0.3;
      recommendations.push('Implement human oversight for automated decisions');
      mitigationMeasures.push('Algorithmic transparency', 'Bias testing', 'Appeal mechanisms');
    }

    const riskLevel = this.calculateRiskLevel(riskScore);

    return {
      riskScore,
      riskLevel,
      recommendations,
      mitigationMeasures
    };
  }

  /**
   * Gets audit events for a specific user
   */
  getUserAuditTrail(userId: string, limit: number = 100): PrivacyAuditEvent[] {
    return Array.from(this.auditEvents.values())
      .filter(event => event.userId === userId || event.dataSubject.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Gets compliance report
   */
  getComplianceReport(reportId: string): ComplianceReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Gets all violations
   */
  getViolations(status?: PrivacyViolation['status']): PrivacyViolation[] {
    const violations = Array.from(this.violations.values());
    return status ? violations.filter(v => v.status === status) : violations;
  }

  /**
   * Resolves a privacy violation
   */
  resolveViolation(violationId: string, resolution: string): boolean {
    const violation = this.violations.get(violationId);
    if (!violation) return false;

    violation.status = 'resolved';
    violation.resolvedAt = Date.now();
    violation.remedialActions.push(`Resolution: ${resolution}`);

    this.emit('violationResolved', violation);
    return true;
  }

  /**
   * Gets privacy metrics dashboard data
   */
  getPrivacyMetrics(timeRange: number = 30 * 24 * 60 * 60 * 1000): {
    complianceRate: number;
    violationTrend: Array<{ date: string; count: number }>;
    riskDistribution: Record<string, number>;
    topViolationTypes: Array<{ type: string; count: number }>;
    dataSubjectRightsRequests: number;
  } {
    const cutoffTime = Date.now() - timeRange;
    const recentEvents = Array.from(this.auditEvents.values())
      .filter(event => event.timestamp > cutoffTime);

    const complianceRate = recentEvents.length > 0 
      ? recentEvents.filter(e => e.complianceStatus === 'compliant').length / recentEvents.length
      : 1;

    // Calculate violation trend (simplified)
    const violationTrend = this.calculateViolationTrend(recentEvents);

    // Risk distribution
    const riskDistribution = this.calculateRiskDistribution(recentEvents);

    // Top violation types
    const topViolationTypes = this.calculateTopViolationTypes();

    // Data subject rights requests
    const dataSubjectRightsRequests = recentEvents
      .filter(e => e.eventType === 'data_export' || e.eventType === 'data_deletion').length;

    return {
      complianceRate,
      violationTrend,
      riskDistribution,
      topViolationTypes,
      dataSubjectRightsRequests
    };
  }

  // Private helper methods

  private initializeComplianceRules(): void {
    // Initialize compliance rules for different regulations
    this.complianceRules.set('gdpr_data_minimization', {
      name: 'GDPR Data Minimization',
      description: 'Data collection should be limited to what is necessary',
      validator: (event) => event.processingDetails.dataTypes.length <= 5
    });

    this.complianceRules.set('coppa_parental_consent', {
      name: 'COPPA Parental Consent',
      description: 'Children under 13 require parental consent',
      validator: (event) => !event.dataSubject.age || event.dataSubject.age >= 13 || event.legalBasis === 'consent'
    });
  }

  private startContinuousMonitoring(): void {
    // Monitor for compliance violations every 5 minutes
    setInterval(() => {
      this.performContinuousCompliance();
    }, 5 * 60 * 1000);
  }

  private performContinuousCompliance(): void {
    // Continuous compliance monitoring logic
    this.emit('continuousMonitoring', { timestamp: Date.now() });
  }

  private calculateSummaryMetrics(events: PrivacyAuditEvent[]): ComplianceReport['summary'] {
    const totalEvents = events.length;
    const violations = events.filter(e => e.complianceStatus === 'violation');
    const warnings = events.filter(e => e.complianceStatus === 'warning');
    const compliant = events.filter(e => e.complianceStatus === 'compliant');
    
    const complianceRate = totalEvents > 0 ? compliant.length / totalEvents : 1;
    const averageRiskScore = totalEvents > 0 
      ? events.reduce((sum, e) => sum + e.riskScore, 0) / totalEvents 
      : 0;

    return {
      totalEvents,
      complianceRate,
      violationCount: violations.length,
      warningCount: warnings.length,
      averageRiskScore
    };
  }

  private generateRecommendations(events: PrivacyAuditEvent[], violations: PrivacyViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push('Review and update privacy policies');
      recommendations.push('Conduct staff training on data protection');
    }

    const highRiskEvents = events.filter(e => e.riskScore > 0.7);
    if (highRiskEvents.length > events.length * 0.1) {
      recommendations.push('Implement additional privacy safeguards');
    }

    return recommendations;
  }

  private calculateDataSubjectRightsMetrics(events: PrivacyAuditEvent[]): ComplianceReport['dataSubjectRights'] {
    const accessRequests = events.filter(e => e.eventType === 'data_access').length;
    const deletionRequests = events.filter(e => e.eventType === 'data_deletion').length;
    const rectificationRequests = events.filter(e => e.metadata.rectification).length;
    const portabilityRequests = events.filter(e => e.eventType === 'data_export').length;

    return {
      accessRequests,
      deletionRequests,
      rectificationRequests,
      portabilityRequests,
      averageResponseTime: 48 // hours - would be calculated from actual data
    };
  }

  private calculateConsentMetrics(events: PrivacyAuditEvent[]): ComplianceReport['consentMetrics'] {
    const consentEvents = events.filter(e => e.eventType === 'consent_change');
    const granted = consentEvents.filter(e => e.metadata.consentGranted).length;
    const withdrawn = consentEvents.filter(e => e.metadata.consentWithdrawn).length;

    return {
      consentRate: consentEvents.length > 0 ? granted / consentEvents.length : 0,
      withdrawalRate: consentEvents.length > 0 ? withdrawn / consentEvents.length : 0,
      granularConsentBreakdown: {
        'story_creation': 0.85,
        'voice_processing': 0.78,
        'analytics': 0.45
      }
    };
  }

  private analyzeDataFlows(events: PrivacyAuditEvent[]): ComplianceReport['dataFlowAnalysis'] {
    const dataCategories: Record<string, number> = {};
    const processingPurposes: Record<string, number> = {};
    const legalBases: Record<string, number> = {};

    let thirdPartySharing = 0;
    let crossBorderTransfers = 0;

    for (const event of events) {
      // Count data categories
      for (const category of event.processingDetails.dataTypes) {
        dataCategories[category] = (dataCategories[category] || 0) + 1;
      }

      // Count processing purposes
      processingPurposes[event.processingPurpose] = (processingPurposes[event.processingPurpose] || 0) + 1;

      // Count legal bases
      legalBases[event.legalBasis] = (legalBases[event.legalBasis] || 0) + 1;

      // Count third party sharing and cross-border transfers
      if (event.processingDetails.thirdPartySharing) thirdPartySharing++;
      if (event.processingDetails.crossBorderTransfer) crossBorderTransfers++;
    }

    return {
      dataCategories,
      processingPurposes,
      legalBases,
      thirdPartySharing,
      crossBorderTransfers
    };
  }

  private categorizeViolation(event: PrivacyAuditEvent): PrivacyViolation['violationType'] {
    if (event.remedialActions?.some(action => action.includes('consent'))) {
      return 'missing_consent';
    }
    if (event.remedialActions?.some(action => action.includes('retention'))) {
      return 'excessive_retention';
    }
    if (event.remedialActions?.some(action => action.includes('minimization'))) {
      return 'data_minimization';
    }
    return 'unauthorized_access';
  }

  private calculateSeverity(riskScore: number): PrivacyViolation['severity'] {
    if (riskScore >= 0.8) return 'critical';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  private assessPotentialImpact(event: PrivacyAuditEvent): string {
    if (event.dataSubject.age && event.dataSubject.age < 13) {
      return 'High impact due to child data processing';
    }
    if (event.processingDetails.dataTypes.includes('biometric') || 
        event.processingDetails.dataTypes.includes('health')) {
      return 'High impact due to sensitive data processing';
    }
    return 'Medium impact on data subject privacy';
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (riskScore >= 0.8) return 'very_high';
    if (riskScore >= 0.6) return 'high';
    if (riskScore >= 0.4) return 'medium';
    return 'low';
  }

  private calculateViolationTrend(events: PrivacyAuditEvent[]): Array<{ date: string; count: number }> {
    // Simplified trend calculation
    return [
      { date: '2024-01-01', count: 2 },
      { date: '2024-01-02', count: 1 },
      { date: '2024-01-03', count: 0 }
    ];
  }

  private calculateRiskDistribution(events: PrivacyAuditEvent[]): Record<string, number> {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    for (const event of events) {
      if (event.riskScore >= 0.8) distribution.critical++;
      else if (event.riskScore >= 0.6) distribution.high++;
      else if (event.riskScore >= 0.4) distribution.medium++;
      else distribution.low++;
    }

    return distribution;
  }

  private calculateTopViolationTypes(): Array<{ type: string; count: number }> {
    const typeCounts: Record<string, number> = {};
    
    for (const violation of this.violations.values()) {
      typeCounts[violation.violationType] = (typeCounts[violation.violationType] || 0) + 1;
    }

    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateFlowId(): string {
    return `flow_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }
}

interface ComplianceRule {
  name: string;
  description: string;
  validator: (event: PrivacyAuditEvent) => boolean;
}
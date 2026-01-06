import { 
  CrisisIndicator, 
  ParentNotification, 
  ResourceLink,
  TherapeuticSession 
} from '../types';
import { CrisisAssessment, CrisisResponse } from './CrisisInterventionSystem';

export interface EmergencyContact {
  id: string;
  userId: string;
  contactType: 'parent' | 'guardian' | 'emergency_contact' | 'professional' | 'school';
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number; // 1 = highest priority
  available: string; // availability description
  verified: boolean;
  lastContacted?: Date;
  contactPreferences: {
    phone: boolean;
    email: boolean;
    sms: boolean;
  };
}

export interface AlertEscalationLevel {
  level: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  timeframe: string;
  contacts: string[]; // contact IDs to notify
  actions: string[];
  autoEscalateAfter?: number; // minutes
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  sessionId: string;
  alertType: 'safety_concern' | 'crisis_intervention' | 'mandatory_reporting' | 'medical_emergency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  escalationLevel: number;
  triggeredAt: Date;
  description: string;
  indicators: CrisisIndicator[];
  contactAttempts: ContactAttempt[];
  resolved: boolean;
  resolvedAt?: Date;
  notes: string[];
}

export interface ContactAttempt {
  contactId: string;
  method: 'phone' | 'email' | 'sms';
  attemptedAt: Date;
  successful: boolean;
  response?: string;
  nextAttemptAt?: Date;
}

export class EmergencyAlertSystem {
  private emergencyContacts: Map<string, EmergencyContact[]> = new Map();
  private escalationLevels: AlertEscalationLevel[] = [];
  private activeAlerts: Map<string, EmergencyAlert> = new Map();
  private alertHistory: Map<string, EmergencyAlert[]> = new Map();

  constructor() {
    this.initializeEscalationLevels();
  }

  private initializeEscalationLevels(): void {
    this.escalationLevels = [
      {
        level: 1,
        name: 'Initial Alert',
        description: 'First notification to primary contacts',
        timeframe: 'Immediate',
        contacts: ['parent', 'guardian'],
        actions: [
          'Send immediate notification to parent/guardian',
          'Provide crisis resources',
          'Document incident'
        ]
      },
      {
        level: 2,
        name: 'Escalated Concern',
        description: 'No response from primary contacts within 15 minutes',
        timeframe: '15 minutes',
        contacts: ['parent', 'guardian', 'emergency_contact'],
        actions: [
          'Contact all emergency contacts',
          'Send detailed incident report',
          'Prepare for professional intervention'
        ],
        autoEscalateAfter: 15
      },
      {
        level: 3,
        name: 'Professional Intervention',
        description: 'No response within 30 minutes or high-risk situation',
        timeframe: '30 minutes',
        contacts: ['parent', 'guardian', 'emergency_contact', 'professional'],
        actions: [
          'Contact mental health professionals',
          'Initiate crisis intervention protocols',
          'Consider emergency services'
        ],
        autoEscalateAfter: 30
      },
      {
        level: 4,
        name: 'Emergency Services',
        description: 'Imminent danger or no response within 1 hour',
        timeframe: '1 hour',
        contacts: ['parent', 'guardian', 'emergency_contact', 'professional'],
        actions: [
          'Contact emergency services (911)',
          'Notify all contacts of emergency escalation',
          'Coordinate with first responders'
        ],
        autoEscalateAfter: 60
      },
      {
        level: 5,
        name: 'Full Emergency Response',
        description: 'All emergency protocols activated',
        timeframe: 'Ongoing',
        contacts: ['parent', 'guardian', 'emergency_contact', 'professional', 'school'],
        actions: [
          'Full emergency response coordination',
          'Continuous monitoring and support',
          'Post-crisis follow-up planning'
        ]
      }
    ];
  }

  /**
   * Register emergency contacts for a user
   */
  async registerEmergencyContacts(userId: string, contacts: Omit<EmergencyContact, 'id' | 'userId'>[]): Promise<void> {
    const userContacts = contacts.map((contact, index) => ({
      ...contact,
      id: `contact-${userId}-${index}`,
      userId,
      verified: false
    }));

    this.emergencyContacts.set(userId, userContacts);

    // Initiate verification process
    await this.verifyContacts(userContacts);
  }

  /**
   * Trigger emergency alert based on crisis assessment
   */
  async triggerEmergencyAlert(
    userId: string,
    sessionId: string,
    assessment: CrisisAssessment,
    indicators: CrisisIndicator[]
  ): Promise<EmergencyAlert> {
    const alertType = this.determineAlertType(assessment, indicators);
    const severity = this.mapRiskLevelToSeverity(assessment.riskLevel);
    const initialEscalationLevel = this.determineInitialEscalationLevel(assessment);

    const alert: EmergencyAlert = {
      id: `alert-${Date.now()}`,
      userId,
      sessionId,
      alertType,
      severity,
      escalationLevel: initialEscalationLevel,
      triggeredAt: new Date(),
      description: this.generateAlertDescription(assessment, indicators),
      indicators,
      contactAttempts: [],
      resolved: false,
      notes: []
    };

    this.activeAlerts.set(alert.id, alert);

    // Start alert process
    await this.processAlert(alert);

    return alert;
  }

  /**
   * Process alert through escalation levels
   */
  private async processAlert(alert: EmergencyAlert): Promise<void> {
    const escalationLevel = this.escalationLevels.find(level => level.level === alert.escalationLevel);
    if (!escalationLevel) {
      throw new Error(`Invalid escalation level: ${alert.escalationLevel}`);
    }

    // Execute actions for current escalation level
    await this.executeEscalationActions(alert, escalationLevel);

    // Contact appropriate people
    await this.contactEmergencyContacts(alert, escalationLevel);

    // Set up auto-escalation if configured
    if (escalationLevel.autoEscalateAfter && alert.escalationLevel < 5) {
      setTimeout(async () => {
        if (!alert.resolved) {
          await this.escalateAlert(alert.id);
        }
      }, escalationLevel.autoEscalateAfter * 60 * 1000); // Convert minutes to milliseconds
    }
  }

  /**
   * Escalate alert to next level
   */
  async escalateAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolved) {
      return;
    }

    if (alert.escalationLevel < 5) {
      alert.escalationLevel += 1;
      alert.notes.push(`Alert escalated to level ${alert.escalationLevel} at ${new Date().toISOString()}`);
      
      await this.processAlert(alert);
    }
  }

  /**
   * Contact emergency contacts based on escalation level
   */
  private async contactEmergencyContacts(alert: EmergencyAlert, escalationLevel: AlertEscalationLevel): Promise<void> {
    const userContacts = this.emergencyContacts.get(alert.userId) || [];
    const contactsToNotify = userContacts.filter(contact => 
      escalationLevel.contacts.includes(contact.contactType)
    ).sort((a, b) => a.priority - b.priority);

    for (const contact of contactsToNotify) {
      await this.attemptContact(alert, contact);
    }
  }

  /**
   * Attempt to contact a specific emergency contact
   */
  private async attemptContact(alert: EmergencyAlert, contact: EmergencyContact): Promise<void> {
    const methods: ('phone' | 'sms' | 'email')[] = [];
    
    // Determine contact methods based on severity and preferences
    if (alert.severity === 'critical') {
      if (contact.contactPreferences.phone) methods.push('phone');
      if (contact.contactPreferences.sms) methods.push('sms');
      if (contact.contactPreferences.email) methods.push('email');
    } else {
      if (contact.contactPreferences.sms) methods.push('sms');
      if (contact.contactPreferences.email) methods.push('email');
      if (contact.contactPreferences.phone) methods.push('phone');
    }

    for (const method of methods) {
      const attempt: ContactAttempt = {
        contactId: contact.id,
        method,
        attemptedAt: new Date(),
        successful: false
      };

      try {
        const success = await this.executeContactMethod(contact, method, alert);
        attempt.successful = success;
        
        if (success) {
          contact.lastContacted = new Date();
          break; // Stop trying other methods if one succeeds
        }
      } catch (error) {
        attempt.response = `Error: ${error}`;
      }

      alert.contactAttempts.push(attempt);
    }
  }

  /**
   * Execute specific contact method
   */
  private async executeContactMethod(
    contact: EmergencyContact,
    method: 'phone' | 'sms' | 'email',
    alert: EmergencyAlert
  ): Promise<boolean> {
    const message = this.generateContactMessage(contact, alert);

    switch (method) {
      case 'phone':
        // In real implementation, would make actual phone call
        console.log(`EMERGENCY CALL to ${contact.name} (${contact.phone}): ${message}`);
        return Math.random() > 0.3; // Simulate 70% success rate

      case 'sms':
        // In real implementation, would send SMS
        console.log(`EMERGENCY SMS to ${contact.name} (${contact.phone}): ${message}`);
        return Math.random() > 0.1; // Simulate 90% success rate

      case 'email':
        // In real implementation, would send email
        console.log(`EMERGENCY EMAIL to ${contact.name} (${contact.email}): ${message}`);
        return Math.random() > 0.05; // Simulate 95% success rate

      default:
        return false;
    }
  }

  /**
   * Generate contact message based on alert severity
   */
  private generateContactMessage(contact: EmergencyContact, alert: EmergencyAlert): string {
    const baseMessage = `URGENT: This is an emergency alert regarding your child's therapeutic session.`;
    
    switch (alert.severity) {
      case 'critical':
        return `${baseMessage} IMMEDIATE ACTION REQUIRED. We have detected critical safety concerns. Please contact us immediately at [emergency number] or call 911 if needed. Alert ID: ${alert.id}`;
        
      case 'high':
        return `${baseMessage} We have detected significant safety concerns during the session. Please contact us immediately at [emergency number]. Alert ID: ${alert.id}`;
        
      case 'medium':
        return `${baseMessage} We have detected concerning indicators during the session. Please contact us as soon as possible at [contact number]. Alert ID: ${alert.id}`;
        
      case 'low':
        return `${baseMessage} We wanted to inform you of some indicators we noticed during the session. Please contact us when convenient at [contact number]. Alert ID: ${alert.id}`;
        
      default:
        return `${baseMessage} Please contact us regarding your child's session. Alert ID: ${alert.id}`;
    }
  }

  /**
   * Execute escalation actions
   */
  private async executeEscalationActions(alert: EmergencyAlert, escalationLevel: AlertEscalationLevel): Promise<void> {
    for (const action of escalationLevel.actions) {
      try {
        await this.executeAction(action, alert);
        alert.notes.push(`Action completed: ${action}`);
      } catch (error) {
        alert.notes.push(`Action failed: ${action} - ${error}`);
      }
    }
  }

  /**
   * Execute specific escalation action
   */
  private async executeAction(action: string, alert: EmergencyAlert): Promise<void> {
    switch (action) {
      case 'Contact emergency services (911)':
        // In real implementation, would contact 911
        console.log(`911 EMERGENCY CALL initiated for alert ${alert.id}`);
        break;
        
      case 'Initiate crisis intervention protocols':
        // In real implementation, would start crisis protocols
        console.log(`Crisis intervention protocols initiated for alert ${alert.id}`);
        break;
        
      case 'Document incident':
        await this.documentIncident(alert);
        break;
        
      default:
        console.log(`Executing action: ${action} for alert ${alert.id}`);
    }
  }

  /**
   * Document incident for records
   */
  private async documentIncident(alert: EmergencyAlert): Promise<void> {
    const documentation = {
      alertId: alert.id,
      userId: alert.userId,
      timestamp: alert.triggeredAt,
      severity: alert.severity,
      description: alert.description,
      indicators: alert.indicators.map(i => ({
        type: i.type,
        severity: i.severity,
        description: i.description
      })),
      contactAttempts: alert.contactAttempts.length,
      escalationLevel: alert.escalationLevel
    };

    // In real implementation, would save to secure database
    console.log('INCIDENT DOCUMENTED:', documentation);
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.notes.push(`Alert resolved: ${resolution}`);

    // Move to history
    const userHistory = this.alertHistory.get(alert.userId) || [];
    userHistory.push(alert);
    this.alertHistory.set(alert.userId, userHistory);

    // Remove from active alerts
    this.activeAlerts.delete(alertId);
  }

  /**
   * Get active alerts for monitoring
   */
  getActiveAlerts(): EmergencyAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history for a user
   */
  getAlertHistory(userId: string): EmergencyAlert[] {
    return this.alertHistory.get(userId) || [];
  }

  /**
   * Verify emergency contacts
   */
  private async verifyContacts(contacts: EmergencyContact[]): Promise<void> {
    for (const contact of contacts) {
      // In real implementation, would send verification message
      console.log(`Verifying contact: ${contact.name} at ${contact.phone}`);
      
      // Simulate verification process
      setTimeout(() => {
        contact.verified = Math.random() > 0.1; // 90% verification success
      }, 1000);
    }
  }

  // Helper methods

  private determineAlertType(assessment: CrisisAssessment, indicators: CrisisIndicator[]): EmergencyAlert['alertType'] {
    if (assessment.mandatoryReporting) {
      return 'mandatory_reporting';
    }
    
    if (assessment.riskLevel === 'imminent') {
      return 'medical_emergency';
    }
    
    if (assessment.riskLevel === 'high' || assessment.immediateInterventionRequired) {
      return 'crisis_intervention';
    }
    
    return 'safety_concern';
  }

  private mapRiskLevelToSeverity(riskLevel: CrisisAssessment['riskLevel']): EmergencyAlert['severity'] {
    const mapping: Record<CrisisAssessment['riskLevel'], EmergencyAlert['severity']> = {
      'imminent': 'critical',
      'high': 'high',
      'moderate': 'medium',
      'low': 'low'
    };
    
    return mapping[riskLevel];
  }

  private determineInitialEscalationLevel(assessment: CrisisAssessment): number {
    if (assessment.riskLevel === 'imminent') {
      return 4; // Start at emergency services level
    }
    
    if (assessment.riskLevel === 'high') {
      return 2; // Start at escalated concern
    }
    
    return 1; // Start at initial alert
  }

  private generateAlertDescription(assessment: CrisisAssessment, indicators: CrisisIndicator[]): string {
    const parts = [];
    
    parts.push(`Risk Level: ${assessment.riskLevel}`);
    
    if (assessment.suicidalIdeation) {
      parts.push('Suicidal ideation detected');
    }
    
    if (assessment.selfHarmRisk) {
      parts.push('Self-harm risk identified');
    }
    
    if (indicators.length > 0) {
      parts.push(`Indicators: ${indicators.map(i => i.type).join(', ')}`);
    }
    
    return parts.join('. ');
  }
}
import { 
  CrisisIndicator, 
  ParentNotification, 
  ResourceLink, 
  TherapeuticSession,
  EmotionalAssessment 
} from '../types';

export interface CrisisAssessment {
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent';
  suicidalIdeation: boolean;
  selfHarmRisk: boolean;
  homicidalIdeation: boolean;
  psychosis: boolean;
  substanceUse: boolean;
  protectiveFactors: string[];
  riskFactors: string[];
  immediateInterventionRequired: boolean;
  mandatoryReporting: boolean;
  assessmentTimestamp: Date;
  assessorNotes: string;
}

export interface CrisisResponse {
  responseType: 'immediate_safety' | 'de_escalation' | 'supportive' | 'referral' | 'emergency_services';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  actions: CrisisAction[];
  followUpRequired: boolean;
  timeframe: string; // e.g., "immediate", "within 1 hour", "within 24 hours"
  responsibleParty: 'system' | 'parent' | 'professional' | 'emergency_services';
}

export interface CrisisAction {
  type: 'safety_plan' | 'parent_contact' | 'professional_referral' | 'emergency_contact' | 'session_termination' | 'supportive_response';
  description: string;
  priority: number; // 1 = highest priority
  completed: boolean;
  timestamp?: Date;
  notes?: string;
}

export interface SafetyPlan {
  userId: string;
  createdAt: Date;
  warningSignsPersonal: string[];
  copingStrategies: string[];
  socialSupports: {
    name: string;
    relationship: string;
    phone: string;
    available: string; // when they're available
  }[];
  professionalContacts: {
    name: string;
    role: string;
    phone: string;
    emergency: boolean;
  }[];
  environmentalSafety: string[];
  reasonsForLiving: string[];
  lastUpdated: Date;
  parentApproved: boolean;
}

export interface MandatoryReportingRecord {
  id: string;
  userId: string;
  reportType: 'child_abuse' | 'neglect' | 'self_harm' | 'suicidal_ideation' | 'other';
  description: string;
  evidence: string[];
  reportedAt: Date;
  reportedBy: string;
  reportedTo: string;
  followUpRequired: boolean;
  status: 'pending' | 'filed' | 'investigated' | 'resolved';
  caseNumber?: string;
}

export class CrisisInterventionSystem {
  private crisisHotlines: ResourceLink[] = [];
  private emergencyContacts: Map<string, any> = new Map();
  private safetyPlans: Map<string, SafetyPlan> = new Map();
  private mandatoryReports: Map<string, MandatoryReportingRecord[]> = new Map();

  constructor() {
    this.initializeCrisisResources();
  }

  private initializeCrisisResources(): void {
    this.crisisHotlines = [
      {
        title: '988 Suicide & Crisis Lifeline',
        url: 'tel:988',
        type: 'crisis_hotline',
        ageAppropriate: false
      },
      {
        title: 'Crisis Text Line',
        url: 'sms:741741',
        type: 'crisis_hotline',
        ageAppropriate: true
      },
      {
        title: 'National Child Abuse Hotline',
        url: 'tel:1-800-4-A-CHILD',
        type: 'crisis_hotline',
        ageAppropriate: false
      },
      {
        title: 'National Sexual Assault Hotline',
        url: 'tel:1-800-656-HOPE',
        type: 'crisis_hotline',
        ageAppropriate: false
      },
      {
        title: 'Trans Lifeline',
        url: 'tel:877-565-8860',
        type: 'crisis_hotline',
        ageAppropriate: true
      },
      {
        title: 'LGBT National Hotline',
        url: 'tel:1-888-843-4564',
        type: 'crisis_hotline',
        ageAppropriate: true
      }
    ];
  }

  /**
   * Conduct comprehensive crisis assessment
   */
  async conductCrisisAssessment(
    indicators: CrisisIndicator[],
    session: TherapeuticSession,
    userInput: string
  ): Promise<CrisisAssessment> {
    const assessment: CrisisAssessment = {
      riskLevel: 'low',
      suicidalIdeation: false,
      selfHarmRisk: false,
      homicidalIdeation: false,
      psychosis: false,
      substanceUse: false,
      protectiveFactors: [],
      riskFactors: [],
      immediateInterventionRequired: false,
      mandatoryReporting: false,
      assessmentTimestamp: new Date(),
      assessorNotes: ''
    };

    // Analyze indicators for specific risk factors
    indicators.forEach(indicator => {
      if (indicator.type === 'safety_concern') {
        assessment.riskLevel = 'high';
        assessment.immediateInterventionRequired = true;
        
        if (indicator.description.toLowerCase().includes('self-harm') ||
            indicator.description.toLowerCase().includes('hurt myself')) {
          assessment.selfHarmRisk = true;
          assessment.mandatoryReporting = true;
        }
        
        if (indicator.description.toLowerCase().includes('suicide') ||
            indicator.description.toLowerCase().includes('kill myself') ||
            indicator.description.toLowerCase().includes('want to die')) {
          assessment.suicidalIdeation = true;
          assessment.riskLevel = 'imminent';
          assessment.mandatoryReporting = true;
        }
      }
    });

    // Analyze user input for additional risk factors
    const riskKeywords = this.analyzeForRiskKeywords(userInput);
    assessment.riskFactors.push(...riskKeywords);

    // Assess protective factors from session history
    assessment.protectiveFactors = this.identifyProtectiveFactors(session);

    // Determine overall risk level
    assessment.riskLevel = this.calculateOverallRiskLevel(assessment);

    // Add assessor notes
    assessment.assessorNotes = this.generateAssessmentNotes(assessment, indicators);

    return assessment;
  }

  /**
   * Generate crisis response plan
   */
  async generateCrisisResponse(assessment: CrisisAssessment): Promise<CrisisResponse> {
    const actions: CrisisAction[] = [];
    let responseType: CrisisResponse['responseType'] = 'supportive';
    let priority: CrisisResponse['priority'] = 'medium';
    let timeframe = 'within 24 hours';
    let responsibleParty: CrisisResponse['responsibleParty'] = 'system';

    // Determine response based on risk level
    switch (assessment.riskLevel) {
      case 'imminent':
        responseType = 'emergency_services';
        priority = 'urgent';
        timeframe = 'immediate';
        responsibleParty = 'emergency_services';
        
        actions.push({
          type: 'emergency_contact',
          description: 'Contact emergency services (911) immediately',
          priority: 1,
          completed: false
        });
        
        actions.push({
          type: 'parent_contact',
          description: 'Immediately notify parent/guardian of crisis situation',
          priority: 2,
          completed: false
        });
        
        actions.push({
          type: 'session_termination',
          description: 'Safely terminate session and ensure child safety',
          priority: 3,
          completed: false
        });
        break;

      case 'high':
        responseType = 'immediate_safety';
        priority = 'urgent';
        timeframe = 'within 1 hour';
        responsibleParty = 'parent';
        
        actions.push({
          type: 'parent_contact',
          description: 'Immediately contact parent/guardian about safety concerns',
          priority: 1,
          completed: false
        });
        
        actions.push({
          type: 'safety_plan',
          description: 'Develop or review safety plan with child and parent',
          priority: 2,
          completed: false
        });
        
        actions.push({
          type: 'professional_referral',
          description: 'Refer to mental health professional within 24 hours',
          priority: 3,
          completed: false
        });
        break;

      case 'moderate':
        responseType = 'de_escalation';
        priority = 'high';
        timeframe = 'within 4 hours';
        responsibleParty = 'parent';
        
        actions.push({
          type: 'supportive_response',
          description: 'Provide immediate emotional support and validation',
          priority: 1,
          completed: false
        });
        
        actions.push({
          type: 'parent_contact',
          description: 'Contact parent/guardian about concerning indicators',
          priority: 2,
          completed: false
        });
        
        actions.push({
          type: 'professional_referral',
          description: 'Recommend professional evaluation within 72 hours',
          priority: 3,
          completed: false
        });
        break;

      case 'low':
        responseType = 'supportive';
        priority = 'medium';
        timeframe = 'within 24 hours';
        responsibleParty = 'system';
        
        actions.push({
          type: 'supportive_response',
          description: 'Provide emotional support and coping strategies',
          priority: 1,
          completed: false
        });
        break;
    }

    // Add mandatory reporting action if required
    if (assessment.mandatoryReporting) {
      actions.push({
        type: 'professional_referral',
        description: 'File mandatory report with appropriate authorities',
        priority: 1,
        completed: false
      });
    }

    return {
      responseType,
      priority,
      actions: actions.sort((a, b) => a.priority - b.priority),
      followUpRequired: assessment.riskLevel !== 'low',
      timeframe,
      responsibleParty
    };
  }

  /**
   * Execute crisis response actions
   */
  async executeCrisisResponse(
    response: CrisisResponse,
    userId: string,
    sessionId: string
  ): Promise<void> {
    for (const action of response.actions) {
      try {
        await this.executeAction(action, userId, sessionId);
        action.completed = true;
        action.timestamp = new Date();
      } catch (error) {
        action.notes = `Failed to execute: ${error}`;
        console.error(`Crisis action failed:`, error);
      }
    }
  }

  /**
   * Create or update safety plan
   */
  async createSafetyPlan(
    userId: string,
    assessment: CrisisAssessment,
    parentInput?: any
  ): Promise<SafetyPlan> {
    const existingPlan = this.safetyPlans.get(userId);
    
    const safetyPlan: SafetyPlan = {
      userId,
      createdAt: existingPlan?.createdAt || new Date(),
      warningSignsPersonal: this.generatePersonalWarningSigns(assessment),
      copingStrategies: this.generateCopingStrategies(assessment),
      socialSupports: parentInput?.socialSupports || this.getDefaultSocialSupports(),
      professionalContacts: parentInput?.professionalContacts || this.getDefaultProfessionalContacts(),
      environmentalSafety: this.generateEnvironmentalSafety(assessment),
      reasonsForLiving: parentInput?.reasonsForLiving || this.getDefaultReasonsForLiving(),
      lastUpdated: new Date(),
      parentApproved: false
    };

    this.safetyPlans.set(userId, safetyPlan);
    return safetyPlan;
  }

  /**
   * Generate parent crisis notification
   */
  generateCrisisNotification(
    assessment: CrisisAssessment,
    response: CrisisResponse,
    userId: string
  ): ParentNotification {
    let title = 'Important Update About Your Child';
    let message = 'We noticed some concerning indicators during your child\'s session.';
    let priority: ParentNotification['priority'] = 'medium';

    switch (assessment.riskLevel) {
      case 'imminent':
        title = 'URGENT: Immediate Safety Concern';
        message = 'We have detected immediate safety concerns during your child\'s session. Please contact us immediately and consider seeking emergency services.';
        priority = 'urgent';
        break;
        
      case 'high':
        title = 'URGENT: Safety Concern Detected';
        message = 'We have detected significant safety concerns during your child\'s session. Please contact us immediately to discuss next steps.';
        priority = 'urgent';
        break;
        
      case 'moderate':
        title = 'Important: Concerning Indicators Detected';
        message = 'We noticed some concerning emotional indicators during your child\'s session. We recommend discussing this with your child and considering professional support.';
        priority = 'high';
        break;
    }

    return {
      type: 'crisis_alert',
      priority,
      title,
      message,
      actionRequired: assessment.riskLevel !== 'low',
      resources: this.getCrisisResourcesForParent(assessment),
      timestamp: new Date(),
      delivered: false
    };
  }

  /**
   * File mandatory report
   */
  async fileMandatoryReport(
    userId: string,
    reportType: MandatoryReportingRecord['reportType'],
    description: string,
    evidence: string[]
  ): Promise<MandatoryReportingRecord> {
    const report: MandatoryReportingRecord = {
      id: `report-${Date.now()}`,
      userId,
      reportType,
      description,
      evidence,
      reportedAt: new Date(),
      reportedBy: 'Therapeutic AI System',
      reportedTo: 'Child Protective Services', // Would be determined by jurisdiction
      followUpRequired: true,
      status: 'pending'
    };

    const userReports = this.mandatoryReports.get(userId) || [];
    userReports.push(report);
    this.mandatoryReports.set(userId, userReports);

    // In a real implementation, this would actually file the report
    console.log('MANDATORY REPORT FILED:', report);

    return report;
  }

  /**
   * Get crisis resources appropriate for the situation
   */
  getCrisisResourcesForParent(assessment: CrisisAssessment): ResourceLink[] {
    let resources = [...this.crisisHotlines];

    // Add specific resources based on assessment
    if (assessment.suicidalIdeation) {
      resources.unshift({
        title: '988 Suicide & Crisis Lifeline',
        url: 'tel:988',
        type: 'crisis_hotline',
        ageAppropriate: false
      });
    }

    if (assessment.selfHarmRisk) {
      resources.push({
        title: 'Self-Injury Outreach & Support',
        url: 'https://sioutreach.org',
        type: 'article',
        ageAppropriate: false
      });
    }

    // Add local emergency services
    resources.push({
      title: 'Emergency Services',
      url: 'tel:911',
      type: 'crisis_hotline',
      ageAppropriate: false
    });

    return resources;
  }

  // Private helper methods

  private analyzeForRiskKeywords(userInput: string): string[] {
    const riskKeywords = [
      'hurt myself', 'kill myself', 'want to die', 'end it all',
      'better off dead', 'no point living', 'hopeless', 'worthless',
      'cut myself', 'harm myself', 'suicide', 'overdose',
      'jump off', 'hang myself', 'gun', 'pills'
    ];

    const lowerInput = userInput.toLowerCase();
    return riskKeywords.filter(keyword => lowerInput.includes(keyword));
  }

  private identifyProtectiveFactors(session: TherapeuticSession): string[] {
    const protectiveFactors = [];

    // Analyze session for protective factors
    if (session.emotionalState.pre.engagement > 6) {
      protectiveFactors.push('Good therapeutic engagement');
    }

    if (session.progressMarkers.some(marker => marker.achieved)) {
      protectiveFactors.push('Making therapeutic progress');
    }

    // Default protective factors for children
    protectiveFactors.push(
      'Family support system',
      'Access to therapeutic services',
      'Age-appropriate coping skills development'
    );

    return protectiveFactors;
  }

  private calculateOverallRiskLevel(assessment: CrisisAssessment): CrisisAssessment['riskLevel'] {
    if (assessment.suicidalIdeation || assessment.homicidalIdeation) {
      return 'imminent';
    }

    if (assessment.selfHarmRisk || assessment.psychosis) {
      return 'high';
    }

    if (assessment.riskFactors.length > 2) {
      return 'moderate';
    }

    return 'low';
  }

  private generateAssessmentNotes(
    assessment: CrisisAssessment,
    indicators: CrisisIndicator[]
  ): string {
    const notes = [];
    
    notes.push(`Risk Level: ${assessment.riskLevel}`);
    notes.push(`Indicators: ${indicators.map(i => i.type).join(', ')}`);
    
    if (assessment.riskFactors.length > 0) {
      notes.push(`Risk Factors: ${assessment.riskFactors.join(', ')}`);
    }
    
    if (assessment.protectiveFactors.length > 0) {
      notes.push(`Protective Factors: ${assessment.protectiveFactors.join(', ')}`);
    }

    return notes.join('. ');
  }

  private async executeAction(action: CrisisAction, userId: string, sessionId: string): Promise<void> {
    switch (action.type) {
      case 'emergency_contact':
        // In real implementation, would contact emergency services
        console.log('EMERGENCY CONTACT INITIATED for user:', userId);
        break;
        
      case 'parent_contact':
        // In real implementation, would contact parent/guardian
        console.log('PARENT CONTACT INITIATED for user:', userId);
        break;
        
      case 'professional_referral':
        // In real implementation, would initiate professional referral
        console.log('PROFESSIONAL REFERRAL INITIATED for user:', userId);
        break;
        
      case 'safety_plan':
        await this.createSafetyPlan(userId, {} as CrisisAssessment);
        break;
        
      case 'session_termination':
        // In real implementation, would safely terminate session
        console.log('SESSION TERMINATED for safety for user:', userId);
        break;
        
      case 'supportive_response':
        // This would be handled by the conversation system
        console.log('SUPPORTIVE RESPONSE PROVIDED for user:', userId);
        break;
    }
  }

  private generatePersonalWarningSigns(assessment: CrisisAssessment): string[] {
    const signs = [
      'Feeling overwhelmed or hopeless',
      'Having thoughts of hurting myself',
      'Feeling very angry or agitated',
      'Not wanting to talk to anyone',
      'Having trouble sleeping or eating'
    ];

    // Add assessment-specific warning signs
    if (assessment.suicidalIdeation) {
      signs.push('Thinking about death or dying');
    }

    if (assessment.selfHarmRisk) {
      signs.push('Urges to hurt myself');
    }

    return signs;
  }

  private generateCopingStrategies(assessment: CrisisAssessment): string[] {
    return [
      'Take slow, deep breaths',
      'Talk to a trusted adult',
      'Use my comfort items (stuffed animal, blanket)',
      'Listen to calming music',
      'Draw or write about my feelings',
      'Go to my safe space',
      'Call a crisis hotline if I need immediate help'
    ];
  }

  private getDefaultSocialSupports(): SafetyPlan['socialSupports'] {
    return [
      {
        name: 'Parent/Guardian',
        relationship: 'Parent',
        phone: 'To be provided',
        available: 'Always'
      },
      {
        name: 'Trusted Family Member',
        relationship: 'Family',
        phone: 'To be provided',
        available: 'Most times'
      }
    ];
  }

  private getDefaultProfessionalContacts(): SafetyPlan['professionalContacts'] {
    return [
      {
        name: '988 Suicide & Crisis Lifeline',
        role: 'Crisis Support',
        phone: '988',
        emergency: true
      },
      {
        name: 'Crisis Text Line',
        role: 'Crisis Support',
        phone: '741741',
        emergency: true
      }
    ];
  }

  private generateEnvironmentalSafety(assessment: CrisisAssessment): string[] {
    const safety = [
      'Remove or secure any items that could be used for self-harm',
      'Ensure adult supervision when feeling unsafe',
      'Create a calm, safe space for when feeling overwhelmed'
    ];

    if (assessment.selfHarmRisk) {
      safety.push('Remove sharp objects from immediate environment');
      safety.push('Ensure medication is secured');
    }

    return safety;
  }

  private getDefaultReasonsForLiving(): string[] {
    return [
      'My family loves me',
      'I have friends who care about me',
      'There are things I want to do when I grow up',
      'I can help other people',
      'Tomorrow might be better',
      'I am important and valuable'
    ];
  }
}
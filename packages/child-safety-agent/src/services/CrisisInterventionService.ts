import { Logger } from 'winston';
import {
  CrisisInterventionRequest,
  CrisisInterventionResult,
  CrisisType,
  CrisisResource
} from '../types';

export class CrisisInterventionService {
  private emergencyWebhook: string;
  private crisisHotlines: Record<string, string>;
  private logger: Logger;

  // Crisis resource database
  private readonly crisisResources: Record<CrisisType, CrisisResource[]> = {
    [CrisisType.SUICIDAL_IDEATION]: [
      {
        type: 'hotline',
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        description: '24/7 crisis support for suicidal thoughts',
        availability: '24/7',
        ageAppropriate: true
      },
      {
        type: 'hotline',
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        description: 'Text-based crisis support',
        availability: '24/7',
        ageAppropriate: true
      },
      {
        type: 'website',
        name: 'National Suicide Prevention Lifeline',
        contact: 'https://suicidepreventionlifeline.org',
        description: 'Online resources and chat support',
        availability: '24/7',
        ageAppropriate: true
      }
    ],
    [CrisisType.SELF_HARM]: [
      {
        type: 'hotline',
        name: 'Self-Injury Outreach & Support',
        contact: '1-800-366-8288',
        description: 'Support for self-harm behaviors',
        availability: '24/7',
        ageAppropriate: true
      },
      {
        type: 'website',
        name: 'To Write Love on Her Arms',
        contact: 'https://twloha.com',
        description: 'Mental health resources and support',
        availability: 'Always available',
        ageAppropriate: true
      }
    ],
    [CrisisType.ABUSE_DISCLOSURE]: [
      {
        type: 'hotline',
        name: 'Childhelp National Child Abuse Hotline',
        contact: '1-800-422-4453',
        description: 'Crisis counseling and referrals for child abuse',
        availability: '24/7',
        ageAppropriate: true
      },
      {
        type: 'hotline',
        name: 'National Sexual Assault Hotline',
        contact: '1-800-656-4673',
        description: 'Support for sexual abuse survivors',
        availability: '24/7',
        ageAppropriate: true
      }
    ],
    [CrisisType.IMMEDIATE_DANGER]: [
      {
        type: 'emergency_contact',
        name: 'Emergency Services',
        contact: '911',
        description: 'Immediate emergency response',
        availability: '24/7',
        ageAppropriate: true
      }
    ],
    [CrisisType.MENTAL_HEALTH_EMERGENCY]: [
      {
        type: 'hotline',
        name: 'National Alliance on Mental Illness',
        contact: '1-800-950-6264',
        description: 'Mental health crisis support',
        availability: 'Mon-Fri 10am-10pm ET',
        ageAppropriate: true
      },
      {
        type: 'hotline',
        name: 'Crisis Text Line',
        contact: 'Text HOME to 741741',
        description: 'Text-based mental health crisis support',
        availability: '24/7',
        ageAppropriate: true
      }
    ],
    [CrisisType.SUBSTANCE_EMERGENCY]: [
      {
        type: 'hotline',
        name: 'SAMHSA National Helpline',
        contact: '1-800-662-4357',
        description: 'Substance abuse treatment referrals',
        availability: '24/7',
        ageAppropriate: true
      },
      {
        type: 'emergency_contact',
        name: 'Poison Control',
        contact: '1-800-222-1222',
        description: 'Emergency poison and overdose support',
        availability: '24/7',
        ageAppropriate: true
      }
    ]
  };

  constructor(emergencyWebhook: string, crisisHotlines: Record<string, string>, logger: Logger) {
    this.emergencyWebhook = emergencyWebhook;
    this.crisisHotlines = crisisHotlines;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('CrisisInterventionService initialized');
  }

  async handleCrisis(request: CrisisInterventionRequest): Promise<CrisisInterventionResult> {
    try {
      this.logger.warn('Crisis intervention initiated', {
        userId: request.userId,
        crisisType: request.crisisType,
        severity: request.severity
      });

      // Determine intervention type based on crisis severity and type
      const interventionType = this.determineInterventionType(request);
      
      // Generate crisis response message
      const responseMessage = this.generateCrisisResponse(request);
      
      // Get relevant resources
      const resourcesProvided = this.getCrisisResources(request.crisisType, request.userAge);
      
      // Execute intervention based on type
      let interventionTriggered = false;
      let reportingCompleted = false;
      let escalationLevel = this.calculateEscalationLevel(request);

      switch (interventionType) {
        case 'emergency_services':
          interventionTriggered = await this.contactEmergencyServices(request);
          reportingCompleted = true;
          break;
          
        case 'human_handoff':
          interventionTriggered = await this.initiateHumanHandoff(request);
          break;
          
        case 'parent_notification':
          interventionTriggered = await this.notifyParentGuardian(request);
          break;
          
        case 'automated_response':
          interventionTriggered = true; // Always successful for automated responses
          break;
      }

      // Log the crisis intervention
      await this.logCrisisIntervention(request, interventionType, interventionTriggered);

      const result: CrisisInterventionResult = {
        interventionTriggered,
        interventionType,
        responseMessage,
        resourcesProvided,
        followUpRequired: this.determineFollowUpRequired(request),
        reportingCompleted,
        escalationLevel
      };

      this.logger.warn('Crisis intervention completed', {
        userId: request.userId,
        interventionType,
        success: interventionTriggered,
        escalationLevel
      });

      return result;

    } catch (error) {
      this.logger.error('Error in crisis intervention', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        crisisType: request.crisisType
      });

      // Return emergency fallback
      return {
        interventionTriggered: false,
        interventionType: 'automated_response',
        responseMessage: 'I\'m very concerned about your safety. Please reach out to a trusted adult or call 911 if you\'re in immediate danger.',
        resourcesProvided: this.getCrisisResources(CrisisType.IMMEDIATE_DANGER, request.userAge),
        followUpRequired: true,
        reportingCompleted: false,
        escalationLevel: 5
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test webhook connectivity (if configured)
      if (this.emergencyWebhook) {
        // This would normally test the webhook, but we'll just validate the URL format
        const url = new URL(this.emergencyWebhook);
        if (!url.protocol.startsWith('http')) {
          throw new Error('Invalid webhook URL');
        }
      }
      return true;
    } catch (error) {
      this.logger.warn('CrisisInterventionService health check failed', { error });
      return false;
    }
  }

  private determineInterventionType(
    request: CrisisInterventionRequest
  ): 'automated_response' | 'human_handoff' | 'emergency_services' | 'parent_notification' {
    
    // Immediate danger always triggers emergency services
    if (request.crisisType === CrisisType.IMMEDIATE_DANGER || request.severity === 'critical') {
      return 'emergency_services';
    }

    // High severity cases require human handoff
    if (request.severity === 'high' || 
        [CrisisType.SUICIDAL_IDEATION, CrisisType.ABUSE_DISCLOSURE].includes(request.crisisType)) {
      return 'human_handoff';
    }

    // Medium severity cases notify parents
    if (request.severity === 'medium') {
      return 'parent_notification';
    }

    // Low severity cases use automated response
    return 'automated_response';
  }

  private generateCrisisResponse(request: CrisisInterventionRequest): string {
    const isYoungChild = request.userAge && request.userAge < 8;

    switch (request.crisisType) {
      case CrisisType.SUICIDAL_IDEATION:
        return isYoungChild
          ? "I'm very worried about you and want to make sure you're safe. You are important and loved. Let's get you help from people who care about you right away."
          : "I'm deeply concerned about what you've shared. Your life has value and meaning, and there are people who want to help you through this difficult time. You don't have to face this alone.";

      case CrisisType.SELF_HARM:
        return isYoungChild
          ? "I'm concerned that you might be hurting yourself. Your body should be safe and protected. Let's talk to someone who can help you feel better in safe ways."
          : "I'm very concerned about the self-harm you've mentioned. You deserve to be safe and to find healthy ways to cope with difficult feelings. There are people who understand and can help.";

      case CrisisType.ABUSE_DISCLOSURE:
        return isYoungChild
          ? "Thank you for being brave and telling me. What happened to you is not okay, and it's not your fault. We need to make sure you're safe and get help from people who will protect you."
          : "I'm grateful that you trusted me with this information. What you've experienced is not acceptable, and it's absolutely not your fault. Your safety is the most important thing right now.";

      case CrisisType.IMMEDIATE_DANGER:
        return isYoungChild
          ? "I'm very worried about your safety right now. We need to get you help immediately. Can you find a safe adult or call 911?"
          : "I'm extremely concerned about your immediate safety. This is an emergency situation. Please call 911 or get to a safe place with a trusted adult right away.";

      case CrisisType.MENTAL_HEALTH_EMERGENCY:
        return isYoungChild
          ? "It sounds like you're having very big, scary feelings. That must be really hard. Let's get you help from people who know how to make those feelings better."
          : "It sounds like you're experiencing a mental health crisis. These intense feelings can be overwhelming, but there are professionals who specialize in helping people through exactly what you're going through.";

      case CrisisType.SUBSTANCE_EMERGENCY:
        return isYoungChild
          ? "I'm worried about what you've told me about substances. Your body needs to be safe. Let's get you help from people who know how to keep you healthy."
          : "I'm concerned about the substance use you've mentioned. This can be dangerous, and there are people who specialize in helping with these situations safely and without judgment.";

      default:
        return isYoungChild
          ? "I'm concerned about what you've shared. Let's make sure you get the help and support you need to be safe and feel better."
          : "I'm concerned about your situation and want to ensure you get appropriate support. You don't have to handle this alone.";
    }
  }

  private getCrisisResources(crisisType: CrisisType, userAge?: number): CrisisResource[] {
    const resources = this.crisisResources[crisisType] || [];
    
    // Filter for age-appropriate resources
    return resources.filter(resource => {
      if (userAge && userAge < 13) {
        // For younger children, prioritize hotlines over websites
        return resource.type === 'hotline' || resource.type === 'emergency_contact';
      }
      return resource.ageAppropriate;
    });
  }

  private calculateEscalationLevel(request: CrisisInterventionRequest): number {
    let level = 1;

    // Base level on crisis type
    const crisisTypeScores = {
      [CrisisType.SUICIDAL_IDEATION]: 5,
      [CrisisType.IMMEDIATE_DANGER]: 5,
      [CrisisType.ABUSE_DISCLOSURE]: 4,
      [CrisisType.SELF_HARM]: 4,
      [CrisisType.MENTAL_HEALTH_EMERGENCY]: 3,
      [CrisisType.SUBSTANCE_EMERGENCY]: 3
    };

    level = crisisTypeScores[request.crisisType] || 2;

    // Adjust for severity
    const severityMultipliers = {
      'low': 0.5,
      'medium': 0.8,
      'high': 1.2,
      'critical': 1.5
    };

    level = Math.round(level * severityMultipliers[request.severity]);

    // Adjust for age (younger children get higher escalation)
    if (request.userAge && request.userAge < 10) {
      level = Math.min(level + 1, 5);
    }

    return Math.max(1, Math.min(level, 5));
  }

  private determineFollowUpRequired(request: CrisisInterventionRequest): boolean {
    // All crisis interventions require follow-up except very low-level automated responses
    return request.severity !== 'low' || 
           [CrisisType.SUICIDAL_IDEATION, CrisisType.ABUSE_DISCLOSURE, CrisisType.SELF_HARM].includes(request.crisisType);
  }

  private async contactEmergencyServices(request: CrisisInterventionRequest): Promise<boolean> {
    try {
      this.logger.error('EMERGENCY: Crisis intervention requires immediate emergency services', {
        userId: request.userId,
        crisisType: request.crisisType,
        severity: request.severity,
        context: request.context
      });

      // In a real implementation, this would:
      // 1. Attempt to get user location if available
      // 2. Contact emergency services with user information
      // 3. Notify emergency contacts
      // 4. Trigger immediate human intervention

      // For now, we log the emergency and trigger webhook
      if (this.emergencyWebhook) {
        await this.sendEmergencyWebhook(request);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to contact emergency services', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      return false;
    }
  }

  private async initiateHumanHandoff(request: CrisisInterventionRequest): Promise<boolean> {
    try {
      this.logger.warn('Initiating human handoff for crisis intervention', {
        userId: request.userId,
        crisisType: request.crisisType,
        severity: request.severity
      });

      // In a real implementation, this would:
      // 1. Alert human moderators/counselors
      // 2. Transfer conversation to human agent
      // 3. Provide context and crisis assessment
      // 4. Ensure continuity of care

      if (this.emergencyWebhook) {
        await this.sendEmergencyWebhook(request, 'human_handoff');
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to initiate human handoff', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      return false;
    }
  }

  private async notifyParentGuardian(request: CrisisInterventionRequest): Promise<boolean> {
    try {
      this.logger.warn('Notifying parent/guardian of crisis situation', {
        userId: request.userId,
        crisisType: request.crisisType,
        severity: request.severity
      });

      // In a real implementation, this would:
      // 1. Look up parent/guardian contact information
      // 2. Send immediate notification (email, SMS, phone call)
      // 3. Provide crisis details and recommended actions
      // 4. Offer resources and support

      if (this.emergencyWebhook) {
        await this.sendEmergencyWebhook(request, 'parent_notification');
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to notify parent/guardian', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId
      });
      return false;
    }
  }

  private async sendEmergencyWebhook(
    request: CrisisInterventionRequest, 
    interventionType: string = 'emergency'
  ): Promise<void> {
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        userId: request.userId,
        sessionId: request.sessionId,
        crisisType: request.crisisType,
        severity: request.severity,
        interventionType,
        context: request.context,
        userAge: request.userAge,
        location: request.location,
        parentContact: request.parentContact,
        emergencyContact: request.emergencyContact
      };

      // In a real implementation, this would make an HTTP POST to the webhook
      this.logger.warn('Emergency webhook payload prepared', { payload });

      // Simulate webhook call
      // await fetch(this.emergencyWebhook, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });

    } catch (error) {
      this.logger.error('Failed to send emergency webhook', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async logCrisisIntervention(
    request: CrisisInterventionRequest,
    interventionType: string,
    success: boolean
  ): Promise<void> {
    try {
      // In a real implementation, this would log to a secure crisis intervention database
      this.logger.warn('Crisis intervention logged', {
        timestamp: new Date().toISOString(),
        userId: request.userId,
        sessionId: request.sessionId,
        crisisType: request.crisisType,
        severity: request.severity,
        interventionType,
        success,
        context: request.context
      });
    } catch (error) {
      this.logger.error('Failed to log crisis intervention', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
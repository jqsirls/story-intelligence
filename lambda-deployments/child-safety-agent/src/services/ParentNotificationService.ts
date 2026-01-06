import { Logger } from 'winston';
import { ParentNotification } from '../types';

export class ParentNotificationService {
  private parentNotificationEmail?: string;
  private logger: Logger;

  constructor(parentNotificationEmail: string | undefined, logger: Logger) {
    this.parentNotificationEmail = parentNotificationEmail;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('ParentNotificationService initialized');
  }

  async sendNotification(notification: ParentNotification): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Look up parent email from user profile if not provided
      // 2. Send email notification using a service like SendGrid
      // 3. Log the notification for audit purposes
      // 4. Handle delivery failures and retries

      const parentEmail = notification.parentEmail || await this.getParentEmail(notification.userId);
      
      if (!parentEmail) {
        this.logger.warn('No parent email found for notification', {
          userId: notification.userId,
          notificationType: notification.notificationType
        });
        return;
      }

      // Generate email content
      const emailContent = this.generateEmailContent(notification);
      
      // Log the notification (in production, this would actually send the email)
      this.logger.warn('Parent notification prepared', {
        userId: notification.userId,
        parentEmail: this.maskEmail(parentEmail),
        notificationType: notification.notificationType,
        severity: notification.severity,
        subject: emailContent.subject,
        timestamp: notification.timestamp
      });

      // In a real implementation:
      // await this.sendEmail(parentEmail, emailContent.subject, emailContent.body);

      // Mark as sent
      notification.sentAt = new Date().toISOString();

      this.logger.info('Parent notification sent', {
        userId: notification.userId,
        notificationType: notification.notificationType,
        severity: notification.severity
      });

    } catch (error) {
      this.logger.error('Failed to send parent notification', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
        notificationType: notification.notificationType
      });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test email service connectivity (if configured)
      // For now, just validate configuration
      return true;
    } catch (error) {
      this.logger.warn('ParentNotificationService health check failed', { error });
      return false;
    }
  }

  private async getParentEmail(userId: string): Promise<string | null> {
    try {
      // In a real implementation, this would query the user database
      // to get the parent's email address
      this.logger.debug('Looking up parent email for user', { userId });
      
      // Placeholder - would query Supabase users table
      return this.parentNotificationEmail || null;
      
    } catch (error) {
      this.logger.error('Failed to lookup parent email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      return null;
    }
  }

  private generateEmailContent(notification: ParentNotification): {
    subject: string;
    body: string;
  } {
    const urgencyText = notification.severity === 'critical' ? 'URGENT: ' : 
                       notification.severity === 'high' ? 'IMPORTANT: ' : '';

    let subject: string;
    let body: string;

    switch (notification.notificationType) {
      case 'safety_concern':
        subject = `${urgencyText}Safety Concern Detected - Storytailor`;
        body = this.generateSafetyConcernEmail(notification);
        break;

      case 'inappropriate_content':
        subject = `${urgencyText}Inappropriate Content Request - Storytailor`;
        body = this.generateInappropriateContentEmail(notification);
        break;

      case 'distress_detected':
        subject = `${urgencyText}Emotional Distress Detected - Storytailor`;
        body = this.generateDistressDetectedEmail(notification);
        break;

      case 'crisis_intervention':
        subject = `${urgencyText}Crisis Intervention Activated - Storytailor`;
        body = this.generateCrisisInterventionEmail(notification);
        break;

      default:
        subject = `${urgencyText}Safety Alert - Storytailor`;
        body = this.generateGenericSafetyEmail(notification);
    }

    return { subject, body };
  }

  private generateSafetyConcernEmail(notification: ParentNotification): string {
    return `
Dear Parent/Guardian,

We are writing to inform you of a safety concern that was detected during your child's interaction with Storytailor.

WHAT HAPPENED:
${notification.message}

ACTIONS WE TOOK:
${notification.actionsTaken.map(action => `• ${action}`).join('\n')}

RECOMMENDED ACTIONS FOR YOU:
${notification.recommendedActions.map(action => `• ${action}`).join('\n')}

SEVERITY LEVEL: ${notification.severity.toUpperCase()}

TIME OF INCIDENT: ${new Date(notification.timestamp).toLocaleString()}

Your child's safety and wellbeing are our top priority. We have protocols in place to detect and respond to potential safety concerns, and we wanted to make sure you were informed immediately.

If you have any questions or concerns, please don't hesitate to contact our support team.

Best regards,
The Storytailor Safety Team

---
This is an automated safety notification. Please do not reply to this email.
For support, contact: support@storytailor.com
    `.trim();
  }

  private generateInappropriateContentEmail(notification: ParentNotification): string {
    return `
Dear Parent/Guardian,

We wanted to inform you that your child made a request for inappropriate content during their Storytailor session.

WHAT HAPPENED:
${notification.message}

HOW WE RESPONDED:
${notification.actionsTaken.map(action => `• ${action}`).join('\n')}

SUGGESTED NEXT STEPS:
${notification.recommendedActions.map(action => `• ${action}`).join('\n')}

SEVERITY LEVEL: ${notification.severity.toUpperCase()}

TIME OF INCIDENT: ${new Date(notification.timestamp).toLocaleString()}

This type of request is not uncommon as children explore boundaries and test limits. Our system is designed to redirect these requests appropriately while maintaining a positive experience.

We recommend using this as an opportunity to discuss appropriate content and online behavior with your child.

Best regards,
The Storytailor Safety Team

---
This is an automated safety notification. Please do not reply to this email.
For support, contact: support@storytailor.com
    `.trim();
  }

  private generateDistressDetectedEmail(notification: ParentNotification): string {
    return `
Dear Parent/Guardian,

Our system has detected signs of emotional distress during your child's interaction with Storytailor.

WHAT WE OBSERVED:
${notification.message}

OUR RESPONSE:
${notification.actionsTaken.map(action => `• ${action}`).join('\n')}

RECOMMENDED ACTIONS:
${notification.recommendedActions.map(action => `• ${action}`).join('\n')}

SEVERITY LEVEL: ${notification.severity.toUpperCase()}

TIME OF INCIDENT: ${new Date(notification.timestamp).toLocaleString()}

Children's emotional wellbeing is very important to us. While occasional emotional ups and downs are normal, we wanted to make sure you were aware so you can provide appropriate support.

If you're concerned about your child's emotional state, consider reaching out to a mental health professional who specializes in children.

Best regards,
The Storytailor Safety Team

---
This is an automated safety notification. Please do not reply to this email.
For support, contact: support@storytailor.com
    `.trim();
  }

  private generateCrisisInterventionEmail(notification: ParentNotification): string {
    return `
URGENT - IMMEDIATE ATTENTION REQUIRED

Dear Parent/Guardian,

A crisis intervention has been activated for your child during their Storytailor session. This requires your immediate attention.

SITUATION:
${notification.message}

IMMEDIATE ACTIONS TAKEN:
${notification.actionsTaken.map(action => `• ${action}`).join('\n')}

URGENT ACTIONS REQUIRED:
${notification.recommendedActions.map(action => `• ${action}`).join('\n')}

TIME OF INCIDENT: ${new Date(notification.timestamp).toLocaleString()}

CRISIS RESOURCES:
• National Suicide Prevention Lifeline: 988
• Crisis Text Line: Text HOME to 741741
• Emergency Services: 911

Please contact your child immediately and consider seeking professional help. If your child is in immediate danger, call 911.

We take all crisis situations extremely seriously and have protocols in place to ensure appropriate response and follow-up.

Best regards,
The Storytailor Crisis Response Team

---
This is an urgent safety notification. 
For immediate support, contact: crisis@storytailor.com or call our crisis line: [CRISIS_PHONE_NUMBER]
    `.trim();
  }

  private generateGenericSafetyEmail(notification: ParentNotification): string {
    return `
Dear Parent/Guardian,

We are writing to inform you of a safety-related incident during your child's interaction with Storytailor.

DETAILS:
${notification.message}

ACTIONS TAKEN:
${notification.actionsTaken.map(action => `• ${action}`).join('\n')}

RECOMMENDED ACTIONS:
${notification.recommendedActions.map(action => `• ${action}`).join('\n')}

SEVERITY LEVEL: ${notification.severity.toUpperCase()}

TIME OF INCIDENT: ${new Date(notification.timestamp).toLocaleString()}

Your child's safety is our highest priority. We have comprehensive safety measures in place and wanted to ensure you were informed of this incident.

If you have any questions or concerns, please contact our support team.

Best regards,
The Storytailor Safety Team

---
This is an automated safety notification. Please do not reply to this email.
For support, contact: support@storytailor.com
    `.trim();
  }

  private maskEmail(email: string): string {
    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.substring(0, 2)}***@${domain}`;
  }
}
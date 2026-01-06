import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailTemplateService } from '../services/EmailTemplateService';

interface SendEmailOptions {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  from?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
}

interface InactivityWarningEmail {
  to: string;
  userId: string;
  tier: string;
  daysInactive: number;
  daysUntilDeletion: number;
  engagementToken: string;
}

interface DeletionWarningEmail {
  to: string;
  userId: string;
  deletionType: string;
  scheduledDeletionAt: Date;
  cancellationToken: string;
}

export class EmailService {
  private sesClient: SESClient;
  private ssmClient: SSMClient;
  private sendGridApiKey: string | undefined;
  private templateService: EmailTemplateService;
  private fromEmail: string;
  private region: string;
  private templateIdCache: Map<string, string> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private logger: Logger,
    region: string = 'us-east-2'
  ) {
    this.region = region;
    this.sesClient = new SESClient({ region });
    this.ssmClient = new SSMClient({ region });
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;
    this.templateService = new EmailTemplateService();
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@storytailor.com';
  }

  /**
   * Get SendGrid template ID from SSM Parameter Store
   */
  private async getTemplateId(templateName: string): Promise<string | null> {
    // Check cache first
    if (this.templateIdCache.has(templateName)) {
      return this.templateIdCache.get(templateName)!;
    }

    try {
      // Try production path first
      const paramName = `/storytailor-production/email/templates/sendgrid-${templateName}`;
      const command = new GetParameterCommand({
        Name: paramName,
        WithDecryption: false
      });

      const response = await this.ssmClient.send(command);
      const templateId = response.Parameter?.Value;

      if (templateId) {
        this.templateIdCache.set(templateName, templateId);
        return templateId;
      }
    } catch (error) {
      // Try alternative path (sendgrid-templates/)
      try {
        const altParamName = `/storytailor-production/email/sendgrid-templates/storytailor-${templateName}`;
        const altCommand = new GetParameterCommand({
          Name: altParamName,
          WithDecryption: false
        });

        const altResponse = await this.ssmClient.send(altCommand);
        const altTemplateId = altResponse.Parameter?.Value;

        if (altTemplateId) {
          this.templateIdCache.set(templateName, altTemplateId);
          return altTemplateId;
        }
      } catch (altError) {
        this.logger.warn(`Template ID not found for ${templateName}`, { error: altError });
      }
    }

    return null;
  }

  /**
   * Send email using SES or SendGrid (with fallback)
   * If templateId is provided, uses SendGrid dynamic templates
   * Otherwise, uses raw HTML (SES or SendGrid based on content)
   */
  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; provider: string }> {
    // If templateId is provided, use SendGrid dynamic templates
    if (options.templateId && this.sendGridApiKey) {
      try {
        await this.sendViaSendGrid(options);
        return { success: true, provider: 'sendgrid' };
      } catch (error) {
        this.logger.warn('SendGrid template failed, falling back to SES', { error });
        // Fallback to SES with HTML
        if (options.html) {
          await this.sendViaSES(options);
          return { success: true, provider: 'ses' };
        }
        throw error;
      }
    }

    // Try SendGrid first for marketing/nudge emails (raw HTML)
    if (this.sendGridApiKey && options.html && (options.html.includes('inactivity') || options.html.includes('warning'))) {
      try {
        await this.sendViaSendGrid(options);
        return { success: true, provider: 'sendgrid' };
      } catch (error) {
        this.logger.warn('SendGrid failed, falling back to SES', { error });
      }
    }

    // Use SES (always works, good for transactional)
    // Note: SES requires subject and html, so this should only be called if they exist
    if (!options.subject || !options.html) {
      throw new Error('SES requires subject and html when templateId is not provided');
    }
    
    try {
      await this.sendViaSES(options);
      return { success: true, provider: 'ses' };
    } catch (error) {
      this.logger.error('SES email send failed', { error });
      throw error;
    }
  }

  /**
   * Send inactivity warning email
   */
  async sendInactivityWarning(email: InactivityWarningEmail): Promise<void> {
    // Determine which template to use based on days until deletion
    let templateName = 'inactivity-warning-threshold.html';
    if (email.daysUntilDeletion <= 7) {
      templateName = 'inactivity-warning-final.html';
    } else if (email.daysUntilDeletion <= 30) {
      templateName = 'inactivity-warning-7-days.html';
    }

    const html = await this.templateService.renderInactivityWarning({
      daysInactive: email.daysInactive,
      daysUntilDeletion: email.daysUntilDeletion,
      tier: email.tier,
      engagementToken: email.engagementToken
    });

    await this.sendEmail({
      to: email.to,
      subject: `Your Storytailor account - Action needed`,
      html,
      from: this.fromEmail
    });

    // Create tracking record
    await this.supabase
      .from('email_engagement_tracking')
      .insert({
        user_id: email.userId,
        email_type: 'inactivity_warning',
        engagement_token: email.engagementToken
      });
  }

  /**
   * Send deletion warning email
   */
  async sendDeletionWarning(email: DeletionWarningEmail): Promise<void> {
    const html = await this.templateService.renderDeletionWarning({
      deletionType: email.deletionType,
      scheduledDeletionAt: email.scheduledDeletionAt,
      cancellationToken: email.cancellationToken
    });

    await this.sendEmail({
      to: email.to,
      subject: `Your Storytailor account deletion - Action required`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send deletion confirmation email
   */
  async sendDeletionConfirmation(to: string, userId: string, deletionType: string): Promise<void> {
    const html = await this.templateService.renderDeletionConfirmation({
      deletionType
    });

    await this.sendEmail({
      to,
      subject: `Your ${deletionType} has been deleted`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send hibernation notification
   */
  async sendHibernationNotification(to: string, userId: string): Promise<void> {
    const html = await this.templateService.renderHibernationNotification({});

    await this.sendEmail({
      to,
      subject: `Your Storytailor account has been archived`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send account deletion request email
   */
  async sendAccountDeletionRequest(to: string, userId: string, confirmationToken: string): Promise<void> {
    const html = await this.templateService.renderAccountDeletionRequest({
      confirmationToken
    });

    await this.sendEmail({
      to,
      subject: `Confirm Your Storytailor Account Deletion`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send story deletion request email
   */
  async sendStoryDeletionRequest(to: string, userId: string, storyId: string, cancellationToken: string): Promise<void> {
    const html = await this.templateService.renderStoryDeletionRequest({
      storyId,
      cancellationToken
    });

    await this.sendEmail({
      to,
      subject: `Your Story Deletion Has Been Scheduled`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send character deletion request email
   */
  async sendCharacterDeletionRequest(to: string, userId: string, characterId: string, cancellationToken: string): Promise<void> {
    const html = await this.templateService.renderCharacterDeletionRequest({
      characterId,
      cancellationToken
    });

    await this.sendEmail({
      to,
      subject: `Your Character Deletion Has Been Scheduled`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send library member removal email
   */
  async sendLibraryMemberRemoved(to: string, userId: string, libraryName: string, removedBy: string): Promise<void> {
    const html = await this.templateService.renderLibraryMemberRemoved({
      libraryName,
      removedBy
    });

    await this.sendEmail({
      to,
      subject: `You've been removed from ${libraryName}`,
      html,
      from: this.fromEmail
    });
  }

  /**
   * Send welcome email using SendGrid template
   */
  async sendWelcomeEmail(to: string, userId: string, userName?: string): Promise<void> {
    const templateId = await this.getTemplateId('welcome');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          userName: userName || 'there',
          appUrl: process.env.APP_URL || 'https://storytailor.com',
          userId
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML if template not found
      const html = `<h1>Welcome to Storytailor!</h1><p>Hi ${userName || 'there'}, welcome to Storytailor!</p>`;
      await this.sendEmail({
        to,
        subject: 'Welcome to Storytailor!',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send receipt email using SendGrid template
   */
  async sendReceiptEmail(to: string, userId: string, receiptData: {
    amount: number;
    currency: string;
    invoiceId: string;
    invoiceUrl?: string;
    date: string;
  }): Promise<void> {
    const templateId = await this.getTemplateId('receipt');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          amount: receiptData.amount,
          currency: receiptData.currency,
          invoiceId: receiptData.invoiceId,
          invoiceUrl: receiptData.invoiceUrl || `${process.env.APP_URL || 'https://storytailor.com'}/invoices/${receiptData.invoiceId}`,
          date: receiptData.date,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>Payment Receipt</h1><p>Thank you for your payment of ${receiptData.currency} ${receiptData.amount}</p>`;
      await this.sendEmail({
        to,
        subject: 'Payment Receipt',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send invitation email using SendGrid template
   */
  async sendInvitationEmail(to: string, inviterName: string, inviteCode: string, inviteUrl: string, discountPercent?: number): Promise<void> {
    const templateId = await this.getTemplateId('invitation');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          inviterName,
          inviteCode,
          inviteUrl,
          discountPercent: discountPercent || 15,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>You're Invited!</h1><p>${inviterName} has invited you to join Storytailor. Use code ${inviteCode} for ${discountPercent || 15}% off!</p><a href="${inviteUrl}">Accept Invitation</a>`;
      await this.sendEmail({
        to,
        subject: 'You\'re Invited to Storytailor!',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send story transfer request email using SendGrid template
   */
  async sendStoryTransferRequestEmail(to: string, senderName: string, storyTitle: string, transferUrl: string, discountCode?: string): Promise<void> {
    const templateId = await this.getTemplateId('story-transfer-request');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          senderName,
          storyTitle,
          transferUrl,
          discountCode: discountCode || null,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>A Story Has Been Shared With You!</h1><p>${senderName} has shared "${storyTitle}" with you.</p><a href="${transferUrl}">View Story</a>`;
      await this.sendEmail({
        to,
        subject: `A Story Has Been Shared With You`,
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send story transfer accepted email using SendGrid template
   */
  async sendStoryTransferAcceptedEmail(to: string, recipientName: string, storyTitle: string): Promise<void> {
    const templateId = await this.getTemplateId('story-transfer-accepted');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          recipientName,
          storyTitle,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>Story Transfer Accepted</h1><p>${recipientName} has accepted your story "${storyTitle}"</p>`;
      await this.sendEmail({
        to,
        subject: 'Story Transfer Accepted',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send story transfer rejected email using SendGrid template
   */
  async sendStoryTransferRejectedEmail(to: string, recipientName: string, storyTitle: string): Promise<void> {
    const templateId = await this.getTemplateId('story-transfer-rejected');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          recipientName,
          storyTitle,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>Story Transfer Declined</h1><p>${recipientName} has declined your story "${storyTitle}"</p>`;
      await this.sendEmail({
        to,
        subject: 'Story Transfer Declined',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send payment failed email using SendGrid template
   */
  async sendPaymentFailedEmail(to: string, userId: string, invoiceId: string, amount: number, currency: string, updateUrl: string): Promise<void> {
    const templateId = await this.getTemplateId('payment-failed');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          invoiceId,
          amount,
          currency,
          updateUrl,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>Payment Failed</h1><p>Your payment of ${currency} ${amount} failed. Please update your payment method.</p><a href="${updateUrl}">Update Payment Method</a>`;
      await this.sendEmail({
        to,
        subject: 'Payment Failed - Action Required',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send B2B onboarding email using SendGrid template
   */
  async sendB2BOnboardingEmail(to: string, organizationName: string, adminName: string, setupUrl: string): Promise<void> {
    const templateId = await this.getTemplateId('b2b-onboarding');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          organizationName,
          adminName,
          setupUrl,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      // Fallback to HTML
      const html = `<h1>Welcome to Storytailor for Business!</h1><p>Hi ${adminName}, welcome to ${organizationName}'s Storytailor account.</p><a href="${setupUrl}">Complete Setup</a>`;
      await this.sendEmail({
        to,
        subject: `Welcome to ${organizationName}'s Storytailor Account`,
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send story transfer sent confirmation email using SendGrid template
   */
  async sendStoryTransferSentEmail(to: string, senderName: string, recipientEmail: string, storyTitle: string): Promise<void> {
    const templateId = await this.getTemplateId('story-transfer-sent');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          senderName,
          recipientEmail,
          storyTitle,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Story Transfer Sent</h1><p>Your story "${storyTitle}" has been sent to ${recipientEmail}</p>`;
      await this.sendEmail({
        to,
        subject: 'Story Transfer Sent',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send character transfer request email using SendGrid template
   */
  async sendCharacterTransferRequestEmail(to: string, senderName: string, characterName: string, transferUrl: string): Promise<void> {
    const templateId = await this.getTemplateId('character-transfer-request');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          senderName,
          characterName,
          transferUrl,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Character Transfer Request</h1><p>${senderName} wants to share "${characterName}" with you.</p><a href="${transferUrl}">View Character</a>`;
      await this.sendEmail({
        to,
        subject: 'Character Transfer Request',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send character transfer sent confirmation email using SendGrid template
   */
  async sendCharacterTransferSentEmail(to: string, senderName: string, recipientEmail: string, characterName: string): Promise<void> {
    const templateId = await this.getTemplateId('character-transfer-sent');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          senderName,
          recipientEmail,
          characterName,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Character Transfer Sent</h1><p>Your character "${characterName}" has been sent to ${recipientEmail}</p>`;
      await this.sendEmail({
        to,
        subject: 'Character Transfer Sent',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send character transfer accepted email using SendGrid template
   */
  async sendCharacterTransferAcceptedEmail(to: string, recipientName: string, characterName: string): Promise<void> {
    const templateId = await this.getTemplateId('character-transfer-accepted');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          recipientName,
          characterName,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Character Transfer Accepted</h1><p>${recipientName} has accepted your character "${characterName}"</p>`;
      await this.sendEmail({
        to,
        subject: 'Character Transfer Accepted',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send subscription cancelled email using SendGrid template
   */
  async sendSubscriptionCancelledEmail(to: string, userId: string, planName: string, cancellationDate: string, reactivateUrl?: string): Promise<void> {
    const templateId = await this.getTemplateId('subscription-cancelled');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          planName,
          cancellationDate,
          reactivateUrl: reactivateUrl || `${process.env.APP_URL || 'https://storytailor.com'}/account/reactivate`,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Subscription Cancelled</h1><p>Your ${planName} subscription has been cancelled effective ${cancellationDate}</p>`;
      await this.sendEmail({
        to,
        subject: 'Subscription Cancelled',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send upgrade confirmation email using SendGrid template
   */
  async sendUpgradeConfirmationEmail(to: string, userId: string, newPlanName: string, previousPlanName: string, effectiveDate: string): Promise<void> {
    const templateId = await this.getTemplateId('upgrade-confirmation');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          newPlanName,
          previousPlanName,
          effectiveDate,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Subscription Upgraded</h1><p>Your subscription has been upgraded from ${previousPlanName} to ${newPlanName} effective ${effectiveDate}</p>`;
      await this.sendEmail({
        to,
        subject: 'Subscription Upgraded',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send downgrade confirmation email using SendGrid template
   */
  async sendDowngradeConfirmationEmail(to: string, userId: string, newPlanName: string, previousPlanName: string, effectiveDate: string): Promise<void> {
    const templateId = await this.getTemplateId('downgrade-confirmation');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          newPlanName,
          previousPlanName,
          effectiveDate,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Subscription Downgraded</h1><p>Your subscription has been downgraded from ${previousPlanName} to ${newPlanName} effective ${effectiveDate}</p>`;
      await this.sendEmail({
        to,
        subject: 'Subscription Downgraded',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send payment method updated email using SendGrid template
   */
  async sendPaymentMethodUpdatedEmail(to: string, userId: string, last4: string, cardBrand: string): Promise<void> {
    const templateId = await this.getTemplateId('payment-method-updated');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          last4,
          cardBrand,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Payment Method Updated</h1><p>Your payment method has been updated to ${cardBrand} ending in ${last4}</p>`;
      await this.sendEmail({
        to,
        subject: 'Payment Method Updated',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send data export completed email using SendGrid template
   */
  async sendDataExportCompletedEmail(to: string, userId: string, downloadUrl: string, expiresAt: string): Promise<void> {
    const templateId = await this.getTemplateId('data-export-completed');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          downloadUrl,
          expiresAt,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Data Export Ready</h1><p>Your data export is ready. <a href="${downloadUrl}">Download here</a> (expires ${expiresAt})</p>`;
      await this.sendEmail({
        to,
        subject: 'Data Export Ready',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send parent insight email using SendGrid template
   */
  async sendParentInsightEmail(to: string, parentName: string, childName: string, insightData: {
    summary: string;
    detailsUrl?: string;
  }): Promise<void> {
    const templateId = await this.getTemplateId('parent-insight');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          parentName,
          childName,
          summary: insightData.summary,
          detailsUrl: insightData.detailsUrl || `${process.env.APP_URL || 'https://storytailor.com'}/insights`,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Insight About ${childName}</h1><p>${insightData.summary}</p>`;
      await this.sendEmail({
        to,
        subject: `Insight About ${childName}`,
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send system outage notification email using SendGrid template
   */
  async sendSystemOutageEmail(to: string, outageDetails: {
    startTime: string;
    estimatedResolution?: string;
    affectedServices: string[];
  }): Promise<void> {
    const templateId = await this.getTemplateId('system-outage');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          startTime: outageDetails.startTime,
          estimatedResolution: outageDetails.estimatedResolution || 'TBD',
          affectedServices: outageDetails.affectedServices.join(', '),
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>System Outage Notification</h1><p>We're experiencing a system outage starting at ${outageDetails.startTime}. Affected services: ${outageDetails.affectedServices.join(', ')}</p>`;
      await this.sendEmail({
        to,
        subject: 'System Outage Notification',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send system restored notification email using SendGrid template
   */
  async sendSystemRestoredEmail(to: string, restorationDetails: {
    restoredAt: string;
    duration: string;
    affectedServices: string[];
  }): Promise<void> {
    const templateId = await this.getTemplateId('system-restored');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          restoredAt: restorationDetails.restoredAt,
          duration: restorationDetails.duration,
          affectedServices: restorationDetails.affectedServices.join(', '),
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>System Restored</h1><p>All systems have been restored at ${restorationDetails.restoredAt}. Duration: ${restorationDetails.duration}</p>`;
      await this.sendEmail({
        to,
        subject: 'System Restored',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send retention email using SendGrid template
   */
  async sendRetentionEmail(to: string, userId: string, retentionData: {
    userName: string;
    daysSinceLastUse: number;
    personalizedContent?: string;
    reactivateUrl?: string;
  }): Promise<void> {
    const templateId = await this.getTemplateId('retention');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          userName: retentionData.userName,
          daysSinceLastUse: retentionData.daysSinceLastUse.toString(),
          personalizedContent: retentionData.personalizedContent || 'We miss you!',
          reactivateUrl: retentionData.reactivateUrl || `${process.env.APP_URL || 'https://storytailor.com'}/account/reactivate`,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>We Miss You, ${retentionData.userName}!</h1><p>It's been ${retentionData.daysSinceLastUse} days since you last used Storytailor. Come back and continue your stories!</p>`;
      await this.sendEmail({
        to,
        subject: 'We Miss You!',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send engagement email using SendGrid template
   */
  async sendEngagementEmail(to: string, userId: string, engagementData: {
    userName: string;
    engagementType: string;
    content: string;
    actionUrl?: string;
  }): Promise<void> {
    const templateId = await this.getTemplateId('engagement');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          userName: engagementData.userName,
          engagementType: engagementData.engagementType,
          content: engagementData.content,
          actionUrl: engagementData.actionUrl || `${process.env.APP_URL || 'https://storytailor.com'}/dashboard`,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>${engagementData.engagementType}</h1><p>${engagementData.content}</p>`;
      await this.sendEmail({
        to,
        subject: engagementData.engagementType,
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send win-back email using SendGrid template
   */
  async sendWinBackEmail(to: string, userId: string, winBackData: {
    userName: string;
    specialOffer?: string;
    reactivateUrl?: string;
  }): Promise<void> {
    const templateId = await this.getTemplateId('win-back');
    
    if (templateId) {
      await this.sendEmail({
        to,
        templateId,
        dynamicTemplateData: {
          userName: winBackData.userName,
          specialOffer: winBackData.specialOffer || '50% off your first month',
          reactivateUrl: winBackData.reactivateUrl || `${process.env.APP_URL || 'https://storytailor.com'}/account/reactivate`,
          appUrl: process.env.APP_URL || 'https://storytailor.com'
        },
        from: this.fromEmail
      });
    } else {
      const html = `<h1>Welcome Back, ${winBackData.userName}!</h1><p>We'd love to have you back. ${winBackData.specialOffer || 'Special offer: 50% off your first month'}!</p>`;
      await this.sendEmail({
        to,
        subject: 'Welcome Back!',
        html,
        from: this.fromEmail
      });
    }
  }

  /**
   * Send via AWS SES
   */
  private async sendViaSES(options: SendEmailOptions): Promise<void> {
    const command = new SendEmailCommand({
      Source: options.from || this.fromEmail,
      Destination: {
        ToAddresses: [options.to]
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8'
          },
          ...(options.text && {
            Text: {
              Data: options.text,
              Charset: 'UTF-8'
            }
          })
        }
      }
    });

    await this.sesClient.send(command);
  }

  /**
   * Send via SendGrid (supports both dynamic templates and raw HTML)
   */
  private async sendViaSendGrid(options: SendEmailOptions): Promise<void> {
    if (!this.sendGridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    // Build request body
    const requestBody: any = {
      personalizations: [{
        to: [{ email: options.to }]
      }],
      from: { email: options.from || this.fromEmail }
    };

    // Use SendGrid dynamic template if templateId is provided
    if (options.templateId) {
      requestBody.template_id = options.templateId;
      if (options.dynamicTemplateData) {
        requestBody.personalizations[0].dynamic_template_data = options.dynamicTemplateData;
      }
    } else {
      // Fallback to raw HTML content
      requestBody.subject = options.subject;
      requestBody.content = [{
        type: 'text/html',
        value: options.html
      }];
    }

    // Use fetch to call SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sendGridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SendGrid API error: ${error}`);
    }
  }
}


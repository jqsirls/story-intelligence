import * as fs from 'fs';
import * as path from 'path';

export interface InactivityWarningTemplateData {
  daysInactive: number;
  daysUntilDeletion: number;
  tier: string;
  engagementToken: string;
}

export interface DeletionWarningTemplateData {
  deletionType: string;
  scheduledDeletionAt: Date;
  cancellationToken: string;
}

export interface DeletionConfirmationTemplateData {
  deletionType: string;
}

export class EmailTemplateService {
  private templateDir: string;

  constructor() {
    this.templateDir = path.join(__dirname, '../templates/emails');
  }

  /**
   * Render inactivity warning email
   */
  async renderInactivityWarning(data: InactivityWarningTemplateData): Promise<string> {
    // Determine which template to use
    let templateName = 'inactivity-warning-threshold.html';
    if (data.daysUntilDeletion <= 7) {
      templateName = 'inactivity-warning-final.html';
    } else if (data.daysUntilDeletion <= 30) {
      templateName = 'inactivity-warning-7-days.html';
    } else if (data.daysUntilDeletion > 30) {
      templateName = 'inactivity-warning-month-before.html';
    }

    const template = await this.loadTemplate(templateName);
    return this.replacePlaceholders(template, {
      daysInactive: data.daysInactive.toString(),
      daysUntilDeletion: data.daysUntilDeletion.toString(),
      tier: data.tier,
      engagementToken: data.engagementToken,
      trackingPixel: this.generateTrackingPixel(data.engagementToken, 'open'),
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render deletion warning email
   */
  async renderDeletionWarning(data: DeletionWarningTemplateData): Promise<string> {
    const template = await this.loadTemplate('account-deletion-reminders.html');
    return this.replacePlaceholders(template, {
      deletionType: data.deletionType,
      scheduledDeletionAt: data.scheduledDeletionAt.toLocaleDateString(),
      cancellationToken: data.cancellationToken,
      cancelUrl: `${process.env.APP_URL || 'https://storytailor.com'}/account/delete/cancel?token=${data.cancellationToken}`,
      trackingPixel: this.generateTrackingPixel(data.cancellationToken, 'open'),
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render deletion confirmation email
   */
  async renderDeletionConfirmation(data: DeletionConfirmationTemplateData): Promise<string> {
    const template = await this.loadTemplate('account-deletion-complete.html');
    return this.replacePlaceholders(template, {
      deletionType: data.deletionType
    });
  }

  /**
   * Render hibernation notification
   */
  async renderHibernationNotification(data: any): Promise<string> {
    const template = await this.loadTemplate('account-hibernated.html');
    return this.replacePlaceholders(template, {
      restoreUrl: `${process.env.APP_URL || 'https://storytailor.com'}/account/restore`,
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render account deletion request email
   */
  async renderAccountDeletionRequest(data: { confirmationToken: string }): Promise<string> {
    const template = await this.loadTemplate('account-deletion-request.html');
    return this.replacePlaceholders(template, {
      confirmationToken: data.confirmationToken,
      confirmUrl: `${process.env.APP_URL || 'https://storytailor.com'}/account/delete/confirm?token=${data.confirmationToken}`,
      trackingPixel: this.generateTrackingPixel(data.confirmationToken, 'open'),
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render story deletion request email
   */
  async renderStoryDeletionRequest(data: { storyId: string; cancellationToken: string }): Promise<string> {
    const template = await this.loadTemplate('story-deletion-request.html');
    return this.replacePlaceholders(template, {
      storyId: data.storyId,
      cancellationToken: data.cancellationToken,
      cancelUrl: `${process.env.APP_URL || 'https://storytailor.com'}/stories/${data.storyId}/delete/cancel?token=${data.cancellationToken}`,
      trackingPixel: this.generateTrackingPixel(data.cancellationToken, 'open'),
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render character deletion request email
   */
  async renderCharacterDeletionRequest(data: { characterId: string; cancellationToken: string }): Promise<string> {
    const template = await this.loadTemplate('character-deletion-request.html');
    return this.replacePlaceholders(template, {
      characterId: data.characterId,
      cancellationToken: data.cancellationToken,
      cancelUrl: `${process.env.APP_URL || 'https://storytailor.com'}/characters/${data.characterId}/delete/cancel?token=${data.cancellationToken}`,
      trackingPixel: this.generateTrackingPixel(data.cancellationToken, 'open'),
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Render library member removal email
   */
  async renderLibraryMemberRemoved(data: { libraryName: string; removedBy: string }): Promise<string> {
    const template = await this.loadTemplate('library-member-removed.html');
    return this.replacePlaceholders(template, {
      libraryName: data.libraryName,
      removedBy: data.removedBy,
      APP_URL: process.env.APP_URL || 'https://storytailor.com'
    });
  }

  /**
   * Load template file
   */
  private async loadTemplate(filename: string): Promise<string> {
    const templatePath = path.join(this.templateDir, filename);
    
    try {
      return await fs.promises.readFile(templatePath, 'utf-8');
    } catch (error) {
      // Return default template if file doesn't exist
      return this.getDefaultTemplate(filename);
    }
  }

  /**
   * Replace placeholders in template
   */
  private replacePlaceholders(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  /**
   * Generate tracking pixel URL
   */
  private generateTrackingPixel(token: string, type: 'open' | 'click'): string {
    const baseUrl = process.env.APP_URL || 'https://storytailor.com';
    return `${baseUrl}/api/v1/email/track?token=${token}&type=${type}`;
  }

  /**
   * Get default template if file doesn't exist
   */
  private getDefaultTemplate(filename: string): string {
    // Return basic HTML template
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Storytailor</title>
      </head>
      <body>
        <h1>Storytailor</h1>
        <p>This is a default email template for ${filename}</p>
        <img src="{{trackingPixel}}" width="1" height="1" style="display:none;" />
      </body>
      </html>
    `;
  }
}


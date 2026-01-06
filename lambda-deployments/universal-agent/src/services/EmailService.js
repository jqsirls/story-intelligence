"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const client_ses_1 = require("@aws-sdk/client-ses");
const EmailTemplateService_1 = require("./EmailTemplateService");
class EmailService {
    constructor(supabase, logger, region = 'us-east-2') {
        this.supabase = supabase;
        this.logger = logger;
        this.sesClient = new client_ses_1.SESClient({ region });
        this.sendGridApiKey = process.env.SENDGRID_API_KEY;
        this.templateService = new EmailTemplateService_1.EmailTemplateService();
        this.fromEmail = process.env.EMAIL_FROM || 'noreply@storytailor.com';
    }
    /**
     * Send email using SES or SendGrid (with fallback)
     */
    async sendEmail(options) {
        // Try SendGrid first for marketing/nudge emails
        if (this.sendGridApiKey && options.html.includes('inactivity') || options.html.includes('warning')) {
            try {
                await this.sendViaSendGrid(options);
                return { success: true, provider: 'sendgrid' };
            }
            catch (error) {
                this.logger.warn('SendGrid failed, falling back to SES', { error });
            }
        }
        // Use SES (always works, good for transactional)
        try {
            await this.sendViaSES(options);
            return { success: true, provider: 'ses' };
        }
        catch (error) {
            this.logger.error('SES email send failed', { error });
            throw error;
        }
    }
    /**
     * Send inactivity warning email
     */
    async sendInactivityWarning(email) {
        // Determine which template to use based on days until deletion
        let templateName = 'inactivity-warning-threshold.html';
        if (email.daysUntilDeletion <= 7) {
            templateName = 'inactivity-warning-final.html';
        }
        else if (email.daysUntilDeletion <= 30) {
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
    async sendDeletionWarning(email) {
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
    async sendDeletionConfirmation(to, userId, deletionType) {
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
    async sendHibernationNotification(to, userId) {
        const html = await this.templateService.renderHibernationNotification({});
        await this.sendEmail({
            to,
            subject: `Your Storytailor account has been archived`,
            html,
            from: this.fromEmail
        });
    }
    /**
     * Send via AWS SES
     */
    async sendViaSES(options) {
        const command = new client_ses_1.SendEmailCommand({
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
     * Send via SendGrid
     */
    async sendViaSendGrid(options) {
        if (!this.sendGridApiKey) {
            throw new Error('SendGrid API key not configured');
        }
        // Use fetch to call SendGrid API
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.sendGridApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                personalizations: [{
                        to: [{ email: options.to }]
                    }],
                from: { email: options.from || this.fromEmail },
                subject: options.subject,
                content: [{
                        type: 'text/html',
                        value: options.html
                    }]
            })
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`SendGrid API error: ${error}`);
        }
    }
}
exports.EmailService = EmailService;
//# sourceMappingURL=EmailService.js.map
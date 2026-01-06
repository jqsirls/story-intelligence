import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
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
export declare class EmailService {
    private supabase;
    private logger;
    private sesClient;
    private sendGridApiKey;
    private templateService;
    private fromEmail;
    constructor(supabase: SupabaseClient, logger: Logger, region?: string);
    /**
     * Send email using SES or SendGrid (with fallback)
     */
    sendEmail(options: SendEmailOptions): Promise<{
        success: boolean;
        provider: string;
    }>;
    /**
     * Send inactivity warning email
     */
    sendInactivityWarning(email: InactivityWarningEmail): Promise<void>;
    /**
     * Send deletion warning email
     */
    sendDeletionWarning(email: DeletionWarningEmail): Promise<void>;
    /**
     * Send deletion confirmation email
     */
    sendDeletionConfirmation(to: string, userId: string, deletionType: string): Promise<void>;
    /**
     * Send hibernation notification
     */
    sendHibernationNotification(to: string, userId: string): Promise<void>;
    /**
     * Send via AWS SES
     */
    private sendViaSES;
    /**
     * Send via SendGrid
     */
    private sendViaSendGrid;
}
export {};
//# sourceMappingURL=EmailService.d.ts.map
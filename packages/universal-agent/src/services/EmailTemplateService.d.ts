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
export declare class EmailTemplateService {
    private templateDir;
    constructor();
    /**
     * Render inactivity warning email
     */
    renderInactivityWarning(data: InactivityWarningTemplateData): Promise<string>;
    /**
     * Render deletion warning email
     */
    renderDeletionWarning(data: DeletionWarningTemplateData): Promise<string>;
    /**
     * Render deletion confirmation email
     */
    renderDeletionConfirmation(data: DeletionConfirmationTemplateData): Promise<string>;
    /**
     * Render hibernation notification
     */
    renderHibernationNotification(data: any): Promise<string>;
    /**
     * Load template file
     */
    private loadTemplate;
    /**
     * Replace placeholders in template
     */
    private replacePlaceholders;
    /**
     * Generate tracking pixel URL
     */
    private generateTrackingPixel;
    /**
     * Get default template if file doesn't exist
     */
    private getDefaultTemplate;
}
//# sourceMappingURL=EmailTemplateService.d.ts.map
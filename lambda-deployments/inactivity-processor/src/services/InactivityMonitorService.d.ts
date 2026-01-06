import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { EmailService } from '../services/EmailService';
export type UserTier = 'free_never_paid' | 'former_paid' | 'current_paid' | 'institutional';
export interface InactivityThresholds {
    freeUser: number;
    formerPaid: number;
    institutional: number;
}
export declare class InactivityMonitorService {
    private supabase;
    private logger;
    private thresholds;
    private emailService;
    constructor(supabase: SupabaseClient, logger: Logger, emailService?: EmailService);
    /**
     * Check for inactive users and send warnings (called by daily cron)
     */
    checkInactiveUsers(): Promise<{
        checked: number;
        warningsSent: number;
        errors: number;
    }>;
    /**
     * Send inactivity warning email
     */
    sendInactivityWarning(userId: string, tier: UserTier, monthsInactive: number): Promise<void>;
    /**
     * Update user tier
     */
    updateUserTier(userId: string, newTier: UserTier): Promise<void>;
    /**
     * Track engagement (email opens/clicks)
     */
    trackEngagement(userId: string, engagementType: 'open' | 'click', engagementToken: string, clickUrl?: string): Promise<void>;
    /**
     * Reset inactivity timer (called on login or engagement)
     */
    resetInactivityTimer(userId: string): Promise<void>;
    /**
     * Calculate days since last activity
     */
    private calculateDaysInactive;
    /**
     * Get inactivity threshold for tier
     */
    private getThresholdForTier;
    /**
     * Get warning count for user
     */
    private getWarningCount;
    /**
     * Generate unique engagement token
     */
    private generateEngagementToken;
}
//# sourceMappingURL=InactivityMonitorService.d.ts.map
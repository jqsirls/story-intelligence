import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Logger } from 'winston';
import { DailyCheckinRequest, DailyCheckinResult } from '../types';
export declare class DailyCheckinService {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Perform daily emotional check-in for a user
     * Requirements: 7.1, 7.2, 4.4
     */
    performCheckin(request: DailyCheckinRequest): Promise<DailyCheckinResult>;
    /**
     * Check if user has completed daily check-in today
     */
    hasCompletedToday(userId: string, libraryId?: string): Promise<boolean>;
    /**
     * Get surface-level check-in questions appropriate for children
     */
    getCheckinQuestions(): string[];
    /**
     * Analyze check-in responses to determine mood and confidence
     */
    private analyzCheckinResponses;
    /**
     * Create emotion record in database with proper TTL and scoping
     */
    private createEmotionRecord;
    /**
     * Get cache key for daily check-in status
     */
    private getDailyCheckinCacheKey;
    /**
     * Get next available check-in time (tomorrow at midnight)
     */
    private getNextCheckinTime;
    /**
     * Log audit event for compliance tracking
     */
    private logAuditEvent;
}
//# sourceMappingURL=DailyCheckinService.d.ts.map
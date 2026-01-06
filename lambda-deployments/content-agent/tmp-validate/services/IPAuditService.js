"use strict";
/**
 * IP Audit Service
 *
 * Maintains complete audit trail for legal protection.
 * Logs all IP detection attempts, results, attribution display, and disputes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPAuditService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
class IPAuditService {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    /**
     * Log IP detection attempt
     */
    async logDetection(params) {
        try {
            const confidenceScores = {};
            params.detectedCharacters.forEach(char => {
                confidenceScores[char.character] = char.confidence;
            });
            const { data, error } = await this.supabase
                .from('ip_detection_audit')
                .insert({
                story_id: params.storyId,
                detection_timestamp: new Date().toISOString(),
                detection_method: params.detectionMethod,
                detected_characters: params.detectedCharacters.map(char => ({
                    character: char.character,
                    franchise: char.franchise,
                    owner: char.owner,
                    confidence: char.confidence,
                })),
                confidence_scores: confidenceScores,
                attribution_added: params.detectedCharacters.length > 0,
                user_id: params.userId || null,
                session_id: params.sessionId || null,
                metadata: params.metadata || {},
            })
                .select('id')
                .single();
            if (error) {
                throw new Error(`Failed to log detection: ${error.message}`);
            }
            return data.id;
        }
        catch (error) {
            throw new Error(`Failed to log detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Log attribution display (when attribution is shown to user)
     */
    async logAttributionDisplay(auditId) {
        try {
            await this.supabase
                .from('ip_detection_audit')
                .update({
                attribution_displayed_at: new Date().toISOString(),
            })
                .eq('id', auditId);
        }
        catch (error) {
            // Log error but don't throw - audit logging should not break the flow
            console.error('Failed to log attribution display', error);
        }
    }
    /**
     * Get audit trail for a story
     */
    async getAuditTrailForStory(storyId) {
        try {
            const { data, error } = await this.supabase
                .from('ip_detection_audit')
                .select('*')
                .eq('story_id', storyId)
                .order('detection_timestamp', { ascending: false });
            if (error) {
                throw new Error(`Failed to get audit trail: ${error.message}`);
            }
            return (data || []).map(record => this.mapToAuditRecord(record));
        }
        catch (error) {
            throw new Error(`Failed to get audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get audit trail for a user
     */
    async getAuditTrailForUser(userId) {
        try {
            const { data, error } = await this.supabase
                .from('ip_detection_audit')
                .select('*')
                .eq('user_id', userId)
                .order('detection_timestamp', { ascending: false });
            if (error) {
                throw new Error(`Failed to get audit trail: ${error.message}`);
            }
            return (data || []).map(record => this.mapToAuditRecord(record));
        }
        catch (error) {
            throw new Error(`Failed to get audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get audit records by date range
     */
    async getAuditTrailByDateRange(startDate, endDate) {
        try {
            const { data, error } = await this.supabase
                .from('ip_detection_audit')
                .select('*')
                .gte('detection_timestamp', startDate)
                .lte('detection_timestamp', endDate)
                .order('detection_timestamp', { ascending: false });
            if (error) {
                throw new Error(`Failed to get audit trail: ${error.message}`);
            }
            return (data || []).map(record => this.mapToAuditRecord(record));
        }
        catch (error) {
            throw new Error(`Failed to get audit trail: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Map database record to AuditRecord type
     */
    mapToAuditRecord(data) {
        return {
            id: data.id,
            storyId: data.story_id,
            detectionTimestamp: data.detection_timestamp,
            detectionMethod: data.detection_method,
            detectedCharacters: (data.detected_characters || []).map((char) => ({
                character: char.character,
                franchise: char.franchise,
                owner: char.owner,
                confidence: char.confidence,
                attributionText: '',
                personalUseMessage: '',
                ownershipDisclaimer: '',
            })),
            confidenceScores: data.confidence_scores || {},
            attributionAdded: data.attribution_added || false,
            attributionDisplayedAt: data.attribution_displayed_at,
            userId: data.user_id,
            sessionId: data.session_id,
            metadata: data.metadata || {},
        };
    }
}
exports.IPAuditService = IPAuditService;

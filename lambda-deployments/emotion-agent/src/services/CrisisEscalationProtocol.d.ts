import { Logger } from 'winston';
import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Mood } from '@alexa-multi-agent/shared-types';
export interface CrisisIndicator {
    indicatorType: 'emotional_distress' | 'behavioral_concern' | 'safety_risk' | 'self_harm_reference' | 'abuse_disclosure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    detectedAt: string;
    source: 'voice_analysis' | 'text_content' | 'behavioral_pattern' | 'direct_disclosure';
    evidence: string[];
    context: CrisisContext;
}
export interface CrisisContext {
    sessionId: string;
    userId: string;
    userAge?: number;
    parentContactInfo?: ContactInfo;
    previousIncidents: PreviousIncident[];
    currentEmotionalState: Mood;
    sessionDuration: number;
    timeOfDay: string;
}
export interface ContactInfo {
    parentEmail?: string;
    emergencyContact?: string;
    preferredContactMethod: 'email' | 'phone' | 'both';
    timezone: string;
}
export interface PreviousIncident {
    incidentDate: string;
    incidentType: string;
    severity: string;
    resolution: string;
    followUpCompleted: boolean;
}
export interface EscalationAction {
    actionType: 'immediate_support' | 'parent_notification' | 'professional_referral' | 'emergency_services' | 'session_termination';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    timeframe: 'immediate' | 'within_hour' | 'within_day' | 'within_week';
    description: string;
    requiredSteps: string[];
    responsibleParty: 'system' | 'parent' | 'professional' | 'emergency_services';
    completionCriteria: string[];
}
export interface CrisisResponse {
    crisisId: string;
    userId: string;
    detectedAt: string;
    indicators: CrisisIndicator[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    escalationActions: EscalationAction[];
    immediateResponse: string;
    parentNotification: ParentNotification;
    professionalReferral?: ProfessionalReferral;
    followUpSchedule: FollowUpSchedule;
    documentationRequired: boolean;
}
export interface ParentNotification {
    notificationSent: boolean;
    sentAt?: string;
    method: 'email' | 'phone' | 'both';
    message: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'urgent';
    responseRequired: boolean;
    responseReceived?: boolean;
    responseReceivedAt?: string;
}
export interface ProfessionalReferral {
    referralType: 'counselor' | 'psychologist' | 'psychiatrist' | 'social_worker' | 'crisis_hotline';
    urgency: 'routine' | 'priority' | 'urgent' | 'emergency';
    recommendedProviders: string[];
    referralReason: string;
    supportingDocumentation: string[];
}
export interface FollowUpSchedule {
    immediateFollowUp: string;
    shortTermFollowUp: string;
    longTermFollowUp: string;
    followUpActions: string[];
    responsibleParty: string;
}
export interface SafetyPlan {
    planId: string;
    userId: string;
    createdAt: string;
    triggerSigns: string[];
    copingStrategies: string[];
    supportContacts: ContactInfo[];
    professionalContacts: ContactInfo[];
    safeEnvironmentSteps: string[];
    emergencyContacts: ContactInfo[];
    reviewSchedule: string;
}
/**
 * Crisis escalation protocol for child safety and wellbeing
 * Requirements: 7.3, 7.4
 */
export declare class CrisisEscalationProtocol {
    private supabase;
    private redis;
    private logger;
    constructor(supabase: SupabaseClient, redis: RedisClientType | undefined, logger: Logger);
    /**
     * Detect crisis indicators from multiple sources
     */
    detectCrisisIndicators(userId: string, sessionId: string, analysisData: {
        voiceAnalysis?: any;
        textContent?: string;
        behavioralPatterns?: any;
        emotionalState?: Mood;
    }): Promise<CrisisIndicator[]>;
    /**
     * Execute crisis response protocol
     */
    executeCrisisResponse(indicators: CrisisIndicator[], context: CrisisContext): Promise<CrisisResponse>;
    /**
     * Send parent notification
     */
    sendParentNotification(parentNotification: ParentNotification, context: CrisisContext): Promise<boolean>;
    /**
     * Create safety plan for user
     */
    createSafetyPlan(userId: string, crisisIndicators: CrisisIndicator[], userAge?: number): Promise<SafetyPlan>;
    /**
     * Analyze voice patterns for crisis indicators
     */
    private analyzeVoiceForCrisis;
    /**
     * Analyze text content for crisis indicators
     */
    private analyzeTextForCrisis;
    /**
     * Analyze behavioral patterns for crisis indicators
     */
    private analyzeBehaviorForCrisis;
    /**
     * Analyze emotional state for crisis indicators
     */
    private analyzeEmotionalStateForCrisis;
    /**
     * Assess overall risk level from indicators
     */
    private assessOverallRiskLevel;
    /**
     * Generate escalation actions based on risk level
     */
    private generateEscalationActions;
    /**
     * Generate immediate response message
     */
    private generateImmediateResponse;
    /**
     * Prepare parent notification
     */
    private prepareParentNotification;
    /**
     * Generate parent notification message
     */
    private generateParentNotificationMessage;
    /**
     * Determine professional referral needs
     */
    private determineProfessionalReferral;
    /**
     * Create follow-up schedule
     */
    private createFollowUpSchedule;
    /**
     * Helper methods for implementation
     */
    private logCrisisIndicators;
    private requiresDocumentation;
    private executeImmediateActions;
    private storeCrisisResponse;
    private sendEmailNotification;
    private sendPhoneNotification;
    private getUserContext;
    private generateTriggerSigns;
    private generateCopingStrategies;
    private identifySupportContacts;
    private identifyProfessionalContacts;
    private generateSafeEnvironmentSteps;
    private getEmergencyContacts;
    private calculateReviewSchedule;
    private storeSafetyPlan;
}
//# sourceMappingURL=CrisisEscalationProtocol.d.ts.map
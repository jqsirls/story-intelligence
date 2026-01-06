import { z } from 'zod';

// Configuration
export interface ChildSafetyConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl: string;
  emergencyContactWebhook: string;
  mandatoryReportingWebhook: string;
  crisisHotlineNumbers: Record<string, string>; // country code -> phone number
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  enableRealTimeMonitoring: boolean;
  parentNotificationEmail?: string;
}

// Disclosure Detection
export interface DisclosureDetectionRequest {
  userId: string;
  sessionId: string;
  userAge?: number;
  userInput: string;
  conversationContext: string[];
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DisclosureDetectionResult {
  hasDisclosure: boolean;
  disclosureType: DisclosureType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detectedConcerns: DetectedConcern[];
  requiresMandatoryReporting: boolean;
  requiresImmediateIntervention: boolean;
  suggestedResponse: string;
  escalationRequired: boolean;
}

export enum DisclosureType {
  NONE = 'none',
  PHYSICAL_ABUSE = 'physical_abuse',
  EMOTIONAL_ABUSE = 'emotional_abuse',
  SEXUAL_ABUSE = 'sexual_abuse',
  NEGLECT = 'neglect',
  BULLYING = 'bullying',
  SELF_HARM = 'self_harm',
  SUICIDAL_IDEATION = 'suicidal_ideation',
  SUBSTANCE_ABUSE = 'substance_abuse',
  DOMESTIC_VIOLENCE = 'domestic_violence',
  MENTAL_HEALTH_CRISIS = 'mental_health_crisis',
  UNSAFE_SITUATION = 'unsafe_situation'
}

export interface DetectedConcern {
  type: DisclosureType;
  indicators: string[];
  severity: number; // 0-1 scale
  confidence: number; // 0-1 scale
  contextualClues: string[];
  riskFactors: string[];
}

// Distress Detection
export interface DistressDetectionRequest {
  userId: string;
  sessionId: string;
  userAge?: number;
  voicePatterns?: VoicePatternData;
  interactionBehavior: InteractionBehaviorData;
  conversationHistory: ConversationTurn[];
  timestamp: string;
}

export interface VoicePatternData {
  pitch: number[];
  volume: number[];
  speechRate: number;
  pauseFrequency: number;
  emotionalTone: string;
  stressIndicators: string[];
}

export interface InteractionBehaviorData {
  responseLatency: number[];
  engagementLevel: number; // 0-1 scale
  conversationFlow: 'normal' | 'hesitant' | 'agitated' | 'withdrawn';
  topicAvoidance: string[];
  repetitivePatterns: string[];
  unusualRequests: string[];
}

export interface ConversationTurn {
  speaker: 'user' | 'agent';
  content: string;
  timestamp: string;
  emotionalContext?: string;
}

export interface DistressDetectionResult {
  isInDistress: boolean;
  distressLevel: 'none' | 'mild' | 'moderate' | 'severe' | 'critical';
  confidence: number;
  distressIndicators: DistressIndicator[];
  recommendedActions: RecommendedAction[];
  requiresImmediateAttention: boolean;
  suggestedResponse: string;
}

export interface DistressIndicator {
  type: 'voice' | 'behavioral' | 'conversational' | 'contextual';
  indicator: string;
  severity: number; // 0-1 scale
  confidence: number; // 0-1 scale
  description: string;
}

export interface RecommendedAction {
  action: 'gentle_inquiry' | 'topic_redirect' | 'comfort_response' | 'parent_notification' | 'crisis_intervention' | 'professional_referral';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  timeframe: string; // e.g., "immediate", "within 1 hour", "within 24 hours"
}

// Crisis Intervention
export interface CrisisInterventionRequest {
  userId: string;
  sessionId: string;
  userAge?: number;
  crisisType: CrisisType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: string;
  location?: string;
  parentContact?: string;
  emergencyContact?: string;
}

export enum CrisisType {
  SUICIDAL_IDEATION = 'suicidal_ideation',
  SELF_HARM = 'self_harm',
  ABUSE_DISCLOSURE = 'abuse_disclosure',
  IMMEDIATE_DANGER = 'immediate_danger',
  MENTAL_HEALTH_EMERGENCY = 'mental_health_emergency',
  SUBSTANCE_EMERGENCY = 'substance_emergency'
}

export interface CrisisInterventionResult {
  interventionTriggered: boolean;
  interventionType: 'automated_response' | 'human_handoff' | 'emergency_services' | 'parent_notification';
  responseMessage: string;
  resourcesProvided: CrisisResource[];
  followUpRequired: boolean;
  reportingCompleted: boolean;
  escalationLevel: number; // 1-5 scale
}

export interface CrisisResource {
  type: 'hotline' | 'website' | 'local_service' | 'emergency_contact';
  name: string;
  contact: string;
  description: string;
  availability: string;
  ageAppropriate: boolean;
}

// Communication Adaptation
export interface CommunicationAdaptationRequest {
  userId: string;
  userAge?: number;
  specialNeeds?: SpecialNeed[];
  communicationProfile: CommunicationProfile;
  currentMessage: string;
  context: string;
}

export interface SpecialNeed {
  type: 'autism' | 'adhd' | 'speech_delay' | 'hearing_impairment' | 'cognitive_delay' | 'motor_difficulties' | 'anxiety_disorder' | 'processing_disorder';
  severity: 'mild' | 'moderate' | 'severe';
  accommodations: string[];
}

export interface CommunicationProfile {
  preferredPace: 'slow' | 'normal' | 'fast';
  vocabularyLevel: 'simple' | 'standard' | 'advanced';
  attentionSpan: number; // in seconds
  processingDelay: number; // in seconds
  preferredInteractionStyle: 'direct' | 'gentle' | 'playful' | 'structured';
  triggerWords: string[];
  comfortTopics: string[];
}

export interface CommunicationAdaptationResult {
  adaptedMessage: string;
  adaptationsMade: Adaptation[];
  estimatedProcessingTime: number;
  followUpSuggestions: string[];
  engagementStrategy: string;
}

export interface Adaptation {
  type: 'vocabulary' | 'pace' | 'structure' | 'tone' | 'length' | 'complexity';
  originalElement: string;
  adaptedElement: string;
  reason: string;
}

// Inappropriate Content Handling
export interface InappropriateContentRequest {
  userId: string;
  sessionId: string;
  userAge?: number;
  userInput: string;
  conversationContext: string[];
  previousInappropriateRequests: number;
  timestamp: string;
}

export interface InappropriateContentResult {
  isInappropriate: boolean;
  inappropriateCategories: InappropriateCategory[];
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  confidence: number;
  redirectionResponse: string;
  educationalOpportunity?: EducationalOpportunity;
  escalationRequired: boolean;
  patternConcern: boolean;
}

export enum InappropriateCategory {
  SEXUAL_CONTENT = 'sexual_content',
  VIOLENCE = 'violence',
  PROFANITY = 'profanity',
  HATE_SPEECH = 'hate_speech',
  DANGEROUS_ACTIVITIES = 'dangerous_activities',
  SUBSTANCE_USE = 'substance_use',
  INAPPROPRIATE_RELATIONSHIPS = 'inappropriate_relationships',
  PERSONAL_INFORMATION = 'personal_information',
  SCARY_CONTENT = 'scary_content'
}

export interface EducationalOpportunity {
  topic: string;
  ageAppropriateExplanation: string;
  teachingMoment: string;
  parentGuidance: string;
}

// Monitoring and Reporting
export interface SafetyIncident {
  id: string;
  userId: string;
  sessionId: string;
  incidentType: DisclosureType | CrisisType | InappropriateCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  context: string;
  actionsTaken: string[];
  reportingRequired: boolean;
  reportingCompleted: boolean;
  followUpRequired: boolean;
  timestamp: string;
  resolvedAt?: string;
}

export interface ParentNotification {
  userId: string;
  parentEmail: string;
  notificationType: 'safety_concern' | 'inappropriate_content' | 'distress_detected' | 'crisis_intervention';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  actionsTaken: string[];
  recommendedActions: string[];
  timestamp: string;
  sentAt?: string;
}

export interface MandatoryReportingRecord {
  id: string;
  userId: string;
  reportType: DisclosureType;
  severity: 'high' | 'critical';
  evidence: string[];
  reportingAgency: string;
  reportedAt: string;
  reportNumber?: string;
  followUpRequired: boolean;
  status: 'pending' | 'submitted' | 'acknowledged' | 'investigating' | 'resolved';
}

// Validation schemas
export const DisclosureDetectionRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  userAge: z.number().optional(),
  userInput: z.string(),
  conversationContext: z.array(z.string()),
  timestamp: z.string(),
  metadata: z.record(z.any()).optional()
});

export const DistressDetectionRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  userAge: z.number().optional(),
  voicePatterns: z.object({
    pitch: z.array(z.number()),
    volume: z.array(z.number()),
    speechRate: z.number(),
    pauseFrequency: z.number(),
    emotionalTone: z.string(),
    stressIndicators: z.array(z.string())
  }).optional(),
  interactionBehavior: z.object({
    responseLatency: z.array(z.number()),
    engagementLevel: z.number(),
    conversationFlow: z.enum(['normal', 'hesitant', 'agitated', 'withdrawn']),
    topicAvoidance: z.array(z.string()),
    repetitivePatterns: z.array(z.string()),
    unusualRequests: z.array(z.string())
  }),
  conversationHistory: z.array(z.object({
    speaker: z.enum(['user', 'agent']),
    content: z.string(),
    timestamp: z.string(),
    emotionalContext: z.string().optional()
  })),
  timestamp: z.string()
});

export const CommunicationAdaptationRequestSchema = z.object({
  userId: z.string(),
  userAge: z.number().optional(),
  specialNeeds: z.array(z.object({
    type: z.enum(['autism', 'adhd', 'speech_delay', 'hearing_impairment', 'cognitive_delay', 'motor_difficulties', 'anxiety_disorder', 'processing_disorder']),
    severity: z.enum(['mild', 'moderate', 'severe']),
    accommodations: z.array(z.string())
  })).optional(),
  communicationProfile: z.object({
    preferredPace: z.enum(['slow', 'normal', 'fast']),
    vocabularyLevel: z.enum(['simple', 'standard', 'advanced']),
    attentionSpan: z.number(),
    processingDelay: z.number(),
    preferredInteractionStyle: z.enum(['direct', 'gentle', 'playful', 'structured']),
    triggerWords: z.array(z.string()),
    comfortTopics: z.array(z.string())
  }),
  currentMessage: z.string(),
  context: z.string()
});

export const InappropriateContentRequestSchema = z.object({
  userId: z.string(),
  sessionId: z.string(),
  userAge: z.number().optional(),
  userInput: z.string(),
  conversationContext: z.array(z.string()),
  previousInappropriateRequests: z.number(),
  timestamp: z.string()
});
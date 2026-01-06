import { z } from 'zod';

// Configuration
export interface ContentSafetyConfig {
  openaiApiKey: string;
  supabaseUrl: string;
  supabaseKey: string;
  redisUrl: string;
  humanModerationWebhook: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  biasDetectionEnabled: boolean;
  realTimeMonitoringEnabled: boolean;
  alternativeContentGeneration: boolean;
}

// Content Safety Request
export interface ContentSafetyRequest {
  content: string;
  contentType: 'story' | 'character' | 'dialogue' | 'description' | 'prompt';
  userId: string;
  sessionId: string;
  userAge?: number;
  context?: {
    userPreferences?: string[];
    previousContent?: string[];
    storyTheme?: string;
    characterContext?: any;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
}

// Content Safety Result
export interface ContentSafetyResult {
  approved: boolean;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flaggedCategories: string[];
  detailedFlags: DetailedFlag[];
  biasDetection?: BiasDetectionResult;
  qualityAssessment?: QualityAssessmentResult;
  humanReviewRequired: boolean;
  processingTime: number;
  alternativeContent?: string;
  metadata: {
    timestamp: string;
    version: string;
    pipeline: string[];
  };
}

export interface DetailedFlag {
  category: string;
  severity: number; // 0-1 scale
  description: string;
  suggestedFix: string;
}

// Pre-generation Filtering
export interface PreGenerationFilter {
  name: string;
  enabled: boolean;
  priority: number;
  filter(request: ContentSafetyRequest): Promise<PreGenerationFilterResult>;
}

export interface PreGenerationFilterResult {
  allowed: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  modifications: string[];
  sanitizedPrompt?: string;
}

// Post-generation Validation
export interface PostGenerationValidator {
  name: string;
  enabled: boolean;
  priority: number;
  validate(content: string, request: ContentSafetyRequest): Promise<PostGenerationValidationResult>;
}

export interface PostGenerationValidationResult {
  valid: boolean;
  confidence: number;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  category: string;
  severity: number; // 0-1 scale
  description: string;
  suggestedFix: string;
  location?: {
    start: number;
    end: number;
  };
}

// Bias Detection
export interface BiasDetectionResult {
  overallBiasScore: number; // 0-1 scale
  detectedBiases: DetectedBias[];
  recommendations: string[];
}

export interface DetectedBias {
  type: BiasType;
  severity: number; // 0-1 scale
  description: string;
  examples: string[];
  mitigation: string;
}

export enum BiasType {
  GENDER = 'gender',
  RACIAL = 'racial',
  CULTURAL = 'cultural',
  RELIGIOUS = 'religious',
  SOCIOECONOMIC = 'socioeconomic',
  DISABILITY = 'disability',
  AGE = 'age',
  APPEARANCE = 'appearance'
}

// Quality Assessment
export interface QualityAssessmentResult {
  overallQuality: number; // 0-1 scale
  qualityMetrics: QualityMetric[];
  recommendations: string[];
}

export interface QualityMetric {
  name: string;
  score: number; // 0-1 scale
  description: string;
  importance: 'low' | 'medium' | 'high';
}

// Real-time Monitoring
export interface RealTimeMonitoringEvent {
  eventType: 'content_generated' | 'content_flagged' | 'human_escalation' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  content: string;
  userId: string;
  sessionId: string;
  flags: string[];
  metadata: Record<string, any>;
  timestamp: string;
}

// Human Escalation
export interface HumanEscalationTrigger {
  triggerType: 'high_risk_content' | 'low_confidence' | 'repeated_violations' | 'manual_review';
  threshold: number;
  enabled: boolean;
}

// Content Moderation Metrics
export interface ContentModerationMetrics {
  totalRequests: number;
  approvedContent: number;
  rejectedContent: number;
  humanEscalations: number;
  averageProcessingTime: number;
  biasDetections: number;
  qualityIssues: number;
  alternativeContentGenerated: number;
  byCategory: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

// Alternative Content Generation
export interface AlternativeContentRequest {
  originalContent: string;
  flaggedCategories: string[];
  targetAudience: {
    age?: number;
    preferences?: string[];
  };
  contentType: string;
  context?: any;
}

export interface AlternativeContentResult {
  content: string;
  confidence: number;
  modifications: string[];
  preservedElements: string[];
}

// Validation schemas
export const ContentSafetyRequestSchema = z.object({
  content: z.string(),
  contentType: z.enum(['story', 'character', 'dialogue', 'description', 'prompt']),
  userId: z.string(),
  sessionId: z.string(),
  userAge: z.number().optional(),
  context: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

export const ContentSafetyResultSchema = z.object({
  approved: z.boolean(),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
  flaggedCategories: z.array(z.string()),
  detailedFlags: z.array(z.object({
    category: z.string(),
    severity: z.number().min(0).max(1),
    description: z.string(),
    suggestedFix: z.string()
  })),
  humanReviewRequired: z.boolean(),
  processingTime: z.number(),
  alternativeContent: z.string().optional(),
  metadata: z.object({
    timestamp: z.string(),
    version: z.string(),
    pipeline: z.array(z.string())
  })
});
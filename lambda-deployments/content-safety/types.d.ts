import { z } from 'zod';
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
export interface ContentSafetyRequest {
    content: string;
    contentType: 'story' | 'character' | 'dialogue' | 'description' | 'prompt' | 'activity';
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
    severity: number;
    description: string;
    suggestedFix: string;
}
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
    severity: number;
    description: string;
    suggestedFix: string;
    location?: {
        start: number;
        end: number;
    };
}
export interface BiasDetectionResult {
    overallBiasScore: number;
    detectedBiases: DetectedBias[];
    recommendations?: string[];
    biasCategories?: {
        demographic: number;
        gender: number;
        cultural: number;
        ability: number;
        socioeconomic: number;
    };
    representationAnalysis?: {
        characters: {
            diversity: number;
            stereotypes: string[];
        };
        themes: {
            inclusive: boolean;
            problematic: string[];
        };
    };
}
export interface DetectedBias {
    type: BiasType | string;
    severity: number;
    description?: string;
    examples: string[];
    mitigation?: string;
    correction?: string;
}
export declare enum BiasType {
    GENDER = "gender",
    RACIAL = "racial",
    CULTURAL = "cultural",
    RELIGIOUS = "religious",
    SOCIOECONOMIC = "socioeconomic",
    DISABILITY = "disability",
    AGE = "age",
    APPEARANCE = "appearance"
}
export interface QualityAssessmentResult {
    overallQuality: number;
    narrativeCoherence?: number;
    ageAppropriateness?: number;
    educationalValue?: number;
    emotionalResonance?: number;
    creativity?: number;
    assessmentDetails?: {
        strengths: string[];
        weaknesses: string[];
        suggestions: string[];
    };
    parentRatingPrediction?: number;
    qualityMetrics?: QualityMetric[];
    recommendations?: string[];
}
export interface QualityMetric {
    name: string;
    score: number;
    description: string;
    importance: 'low' | 'medium' | 'high';
}
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
export interface HumanEscalationTrigger {
    triggerType?: 'high_risk_content' | 'low_confidence' | 'repeated_violations' | 'manual_review';
    threshold?: number;
    enabled?: boolean;
    name: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    condition: (result: ContentSafetyResult) => boolean;
    escalationData?: Record<string, any>;
}
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
export declare const ContentSafetyRequestSchema: z.ZodObject<{
    content: z.ZodString;
    contentType: z.ZodEnum<["story", "character", "dialogue", "description", "prompt", "activity"]>;
    userId: z.ZodString;
    sessionId: z.ZodString;
    userAge: z.ZodOptional<z.ZodNumber>;
    context: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    contentType: "story" | "character" | "dialogue" | "description" | "prompt" | "activity";
    userId: string;
    sessionId: string;
    userAge?: number | undefined;
    context?: Record<string, any> | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    content: string;
    contentType: "story" | "character" | "dialogue" | "description" | "prompt" | "activity";
    userId: string;
    sessionId: string;
    userAge?: number | undefined;
    context?: Record<string, any> | undefined;
    metadata?: Record<string, any> | undefined;
}>;
export declare const ContentSafetyResultSchema: z.ZodObject<{
    approved: z.ZodBoolean;
    confidence: z.ZodNumber;
    riskLevel: z.ZodEnum<["low", "medium", "high", "critical"]>;
    flaggedCategories: z.ZodArray<z.ZodString, "many">;
    detailedFlags: z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        severity: z.ZodNumber;
        description: z.ZodString;
        suggestedFix: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        category: string;
        severity: number;
        suggestedFix: string;
    }, {
        description: string;
        category: string;
        severity: number;
        suggestedFix: string;
    }>, "many">;
    humanReviewRequired: z.ZodBoolean;
    processingTime: z.ZodNumber;
    alternativeContent: z.ZodOptional<z.ZodString>;
    metadata: z.ZodObject<{
        timestamp: z.ZodString;
        version: z.ZodString;
        pipeline: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        version: string;
        pipeline: string[];
    }, {
        timestamp: string;
        version: string;
        pipeline: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    metadata: {
        timestamp: string;
        version: string;
        pipeline: string[];
    };
    approved: boolean;
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    flaggedCategories: string[];
    detailedFlags: {
        description: string;
        category: string;
        severity: number;
        suggestedFix: string;
    }[];
    humanReviewRequired: boolean;
    processingTime: number;
    alternativeContent?: string | undefined;
}, {
    metadata: {
        timestamp: string;
        version: string;
        pipeline: string[];
    };
    approved: boolean;
    confidence: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    flaggedCategories: string[];
    detailedFlags: {
        description: string;
        category: string;
        severity: number;
        suggestedFix: string;
    }[];
    humanReviewRequired: boolean;
    processingTime: number;
    alternativeContent?: string | undefined;
}>;
//# sourceMappingURL=types.d.ts.map
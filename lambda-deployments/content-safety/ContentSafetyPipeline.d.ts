import { ContentSafetyConfig, ContentSafetyRequest, ContentSafetyResult, ContentModerationMetrics } from './types';
export declare class ContentSafetyPipeline {
    private openai;
    private supabase;
    private redis;
    private logger;
    private config;
    private preFilterManager;
    private postValidatorManager;
    private biasDetectionEngine;
    private qualityAssuranceEngine;
    private realTimeMonitor;
    private escalationManager;
    private alternativeGenerator;
    private metrics;
    constructor(config: ContentSafetyConfig);
    private initializeLogger;
    private initializeClients;
    private initializeServices;
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    /**
     * Main content safety processing pipeline
     */
    processContent(request: ContentSafetyRequest): Promise<ContentSafetyResult>;
    /**
     * Pre-generation prompt sanitization and risk assessment
     */
    sanitizePrompt(request: ContentSafetyRequest): Promise<{
        sanitizedPrompt: string;
        riskAssessment: {
            level: 'low' | 'medium' | 'high';
            warnings: string[];
            modifications: string[];
        };
    }>;
    /**
     * Batch process multiple content pieces
     */
    batchProcessContent(requests: ContentSafetyRequest[]): Promise<ContentSafetyResult[]>;
    /**
     * Get current moderation metrics
     */
    getMetrics(): ContentModerationMetrics;
    /**
     * Reset metrics (for testing or periodic resets)
     */
    resetMetrics(): void;
    /**
     * Health check for the content safety pipeline
     */
    healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        services: {
            openai: boolean;
            supabase: boolean;
            redis: boolean;
            preFilters: boolean;
            postValidators: boolean;
            biasDetection: boolean;
            qualityAssurance: boolean;
            realTimeMonitoring: boolean;
        };
        timestamp: string;
    }>;
    private combineResults;
    private createRejectionResult;
    private createErrorResult;
    private updateCategoryMetrics;
    private updateRiskLevelMetrics;
    private updateProcessingTime;
}
//# sourceMappingURL=ContentSafetyPipeline.d.ts.map
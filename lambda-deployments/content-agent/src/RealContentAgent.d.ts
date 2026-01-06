/**
 * Real Content Agent - Full Production Implementation
 *
 * Integrates:
 * - OpenAI GPT-5 for story generation
 * - ElevenLabs for TTS
 * - DALL-E for images
 * - Supabase for persistence
 */
export interface RealContentAgentConfig {
    openai: {
        apiKey: string;
        model?: string;
    };
    elevenlabs: {
        apiKey: string;
        defaultVoiceId?: string;
    };
    supabase: {
        url: string;
        anonKey: string;
    };
    s3?: {
        bucketName: string;
        region: string;
    };
    sms?: {
        enabled: boolean;
    };
    frontendUrl?: string;
}
export interface StoryGenerationRequest {
    userId: string;
    characterName?: string;
    characterTraits?: {
        age?: number;
        species?: string;
        personality?: string[];
        disabilities?: string;
        ethnicity?: string;
        appearance?: string;
        hairColor?: string;
        eyeColor?: string;
    };
    storyType?: string;
    userAge?: number;
    sessionId: string;
    parentPhone?: string;
    childName?: string;
    useVoiceDesign?: boolean;
    characterPersonalities?: Map<string, string>;
}
export interface StoryGenerationResponse {
    success: boolean;
    story: {
        title: string;
        content: string;
        storyId: string;
    };
    coverImageUrl: string;
    beatImages?: Array<{
        beatNumber: number;
        imageUrl: string;
        description: string;
        timestamp: number;
    }>;
    audioUrl: string;
    imageTimestamps?: any;
    webvttUrl?: string;
    dialogueAudioUrl?: string;
    soundEffects?: Array<{
        effect: string;
        url: string;
        timestamp: number;
        duration: number;
        volume: number;
    }>;
    backgroundMusic?: string;
    message: string;
    speechText: string;
}
export declare class RealContentAgent {
    private config;
    private openai;
    private supabase;
    private elevenLabsConfig;
    private logger;
    private isInitialized;
    private tempStoryCache;
    private redis;
    private multiCharacterDialogueService;
    private characterVoiceManager;
    private soundEffectsService;
    private musicCompositionService;
    private voiceDesignService;
    private voiceRemixingService;
    private characterVoiceGenerator;
    constructor(config: RealContentAgentConfig);
    initialize(): Promise<void>;
    /**
     * Generate story based on conversation phase (progressive generation)
     */
    generateStory(request: StoryGenerationRequest & {
        conversationPhase?: string;
        storyId?: string;
        beatNumber?: number;
    }): Promise<StoryGenerationResponse>;
    /**
     * Generate only the cover image (called after story confirmation)
     * Uses sophisticated GLOBAL_STYLE for hand-painted digital art quality
     */
    private generateCoverOnly;
    /**
     * Unified image generation with comprehensive error handling and retry logic
     */
    private generateImageWithRetry;
    /**
     * Generate single beat image (called when beat is confirmed)
     */
    private generateBeatImageOnly;
    /**
     * LEGACY: Old beat image generation - keeping for reference but now using unified retry logic
     */
    private generateBeatImageOnlyLegacy;
    /**
     * Legacy: Generate complete story with all 5 images at once
     */
    private generateFullStory;
    /**
     * Get session metrics for parent notification
     */
    private getSessionMetrics;
    /**
     * Send parent story notification
     */
    private sendParentStoryNotification;
    /**
     * Helper: Get stored story from database or temp cache
     */
    private getStoredStory;
    /**
     * Helper: Update story with cover image (database or temp cache)
     */
    private updateStoryCover;
    /**
     * Generate story content using OpenAI GPT-4 with 4 key visual beats
     */
    private generateStoryContent;
    /**
     * Generate 5 visually consistent images with character continuity
     */
    private generateStoryImages;
    /**
     * Build character consistency context for visual continuity
     */
    private buildCharacterConsistencyContext;
    /**
     * Generate audio narration using ElevenLabs direct API with comprehensive error handling
     */
    private generateAudioNarration;
    /**
     * Generate WebVTT-compatible timestamps for beat images
     */
    private generateImageTimestamps;
    /**
     * Persist image buffer directly to S3 (for base64 images from gpt-image-1)
     */
    private persistImageToS3Direct;
    /**
     * Download image from URL and persist to S3 (for URL-based responses)
     */
    private persistImageToS3;
    /**
     * Upload audio buffer to S3
     */
    private containsDialogue;
    private uploadAudioToS3;
    /**
     * Get or create default library for user with proper UUID
     */
    private getOrCreateDefaultLibrary;
    /**
     * Save story to Supabase database (matching actual schema)
     */
    private saveStoryToDatabase;
    /**
     * Generate character voices for a story using ElevenLabs Voice Design
     */
    generateStoryCharacterVoices(storyId: string, storyType: string, characterNames: string[], characterPersonalities?: Map<string, string>): Promise<any>;
    /**
     * Create a quick character voice for testing
     */
    createQuickCharacterVoice(characterName: string, personality: string, storyType: string): Promise<string>;
    /**
     * Refine an existing character voice
     */
    refineCharacterVoice(characterName: string, voiceId: string, refinementPrompts: string[]): Promise<string>;
    /**
     * Get voice statistics
     */
    getVoiceStatistics(): any;
    /**
     * Extract character names from story content
     */
    private extractCharacterNames;
}
//# sourceMappingURL=RealContentAgent.d.ts.map
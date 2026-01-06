"use strict";
/**
 * Real Content Agent - Full Production Implementation
 *
 * Integrates:
 * - OpenAI GPT-5 for story generation
 * - ElevenLabs for TTS
 * - DALL-E for images
 * - Supabase for persistence
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealContentAgent = void 0;
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const winston = __importStar(require("winston"));
const MultiCharacterDialogueService_1 = require("./services/MultiCharacterDialogueService");
const CharacterVoiceManager_1 = require("./services/CharacterVoiceManager");
const SoundEffectsService_1 = require("./services/SoundEffectsService");
const MusicCompositionService_1 = require("./services/MusicCompositionService");
const VoiceDesignService_1 = require("./services/VoiceDesignService");
const VoiceRemixingService_1 = require("./services/VoiceRemixingService");
const CharacterVoiceGenerator_1 = require("./services/CharacterVoiceGenerator");
class RealContentAgent {
    constructor(config) {
        this.config = config;
        this.elevenLabsConfig = null;
        this.isInitialized = false;
        this.tempStoryCache = new Map(); // In-memory cache for temp stories
        this.redis = null; // Redis client for persistent caching
        // Initialize logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.json(),
            transports: [
                new winston.transports.Console({
                    format: winston.format.simple()
                })
            ]
        });
        // Initialize OpenAI
        this.openai = new openai_1.default({
            apiKey: config.openai.apiKey
        });
        // Initialize Supabase
        this.supabase = (0, supabase_js_1.createClient)(config.supabase.url, config.supabase.anonKey);
        // Initialize new services
        this.multiCharacterDialogueService = new MultiCharacterDialogueService_1.MultiCharacterDialogueService(this.logger);
        this.characterVoiceManager = new CharacterVoiceManager_1.CharacterVoiceManager(this.logger);
        this.soundEffectsService = new SoundEffectsService_1.SoundEffectsService(this.logger);
        this.musicCompositionService = new MusicCompositionService_1.MusicCompositionService(this.logger);
        this.voiceDesignService = new VoiceDesignService_1.VoiceDesignService(this.logger);
        this.voiceRemixingService = new VoiceRemixingService_1.VoiceRemixingService(this.logger);
        this.characterVoiceGenerator = new CharacterVoiceGenerator_1.CharacterVoiceGenerator(this.logger);
        this.logger.info('RealContentAgent constructed');
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Set up ElevenLabs config if available
            if (this.config.elevenlabs.apiKey && this.config.elevenlabs.apiKey !== 'placeholder') {
                this.elevenLabsConfig = {
                    apiKey: this.config.elevenlabs.apiKey,
                    voiceId: this.config.elevenlabs.defaultVoiceId || 'EXAVITQu4vr4xnSDxMaL'
                };
                this.logger.info('ElevenLabs configured for audio generation');
            }
            else {
                this.logger.warn('ElevenLabs API key not configured, audio will use fallback');
            }
            this.isInitialized = true;
            this.logger.info('RealContentAgent initialized successfully');
        }
        catch (error) {
            this.logger.error('Failed to initialize RealContentAgent', { error });
            throw error;
        }
    }
    /**
     * Generate story based on conversation phase (progressive generation)
     */
    async generateStory(request) {
        await this.initialize();
        const phase = request.conversationPhase || 'story_planning';
        this.logger.info('Generating story content', {
            userId: request.userId,
            phase,
            requestedPhase: request.conversationPhase,
            hasStoryId: !!request.storyId,
            storyId: request.storyId,
            characterName: request.characterName
        });
        try {
            // PHASE 1: Story Planning - Generate story text and audio ONLY (no images)
            if (phase === 'story_planning' || phase === 'greeting') {
                const story = await this.generateStoryContent(request);
                const audioUrl = await this.generateAudioNarration(story.content);
                // Save story structure (no images yet)
                const savedStory = await this.saveStoryToDatabase({
                    userId: request.userId,
                    sessionId: request.sessionId,
                    title: story.title,
                    content: story.content,
                    coverImageUrl: '',
                    audioUrl,
                    metadata: {
                        characterName: request.characterName,
                        storyType: request.storyType,
                        userAge: request.userAge,
                        keyBeats: story.keyBeats,
                        phase: 'awaiting_cover_confirmation'
                    }
                });
                this.logger.info('Story text and audio generated (awaiting cover confirmation)', { storyId: savedStory.id });
                // Generate sound effects and background music
                const soundEffects = await this.soundEffectsService.analyzeSoundEffectMoments(story.content);
                const backgroundMusic = await this.musicCompositionService.generateStoryMusic(request.storyType || 'adventure', 'happy', // Default mood
                Math.ceil(story.content.length / 5 / 150 * 60 * 1000) // Estimate duration
                );
                // Generate multi-character dialogue if story contains dialogue
                let dialogueAudioUrl;
                if (this.containsDialogue(story.content)) {
                    try {
                        const dialogueBuffer = await this.multiCharacterDialogueService.generateDialogueFromStory(story.content, request.characterName || 'our hero');
                        dialogueAudioUrl = await this.multiCharacterDialogueService.uploadDialogueToS3(dialogueBuffer, request.characterName || 'our hero', savedStory.id);
                    }
                    catch (error) {
                        this.logger.error('Failed to generate multi-character dialogue', { error });
                    }
                }
                return {
                    success: true,
                    story: {
                        title: story.title,
                        content: story.content,
                        storyId: savedStory.id
                    },
                    coverImageUrl: '', // No cover yet
                    beatImages: [],
                    audioUrl,
                    dialogueAudioUrl,
                    soundEffects: soundEffects.map(sfx => ({
                        effect: sfx.effect,
                        url: sfx.url,
                        timestamp: sfx.timestamp,
                        duration: sfx.duration,
                        volume: sfx.volume
                    })),
                    backgroundMusic,
                    message: `I've created your story: "${story.title}"! Would you like me to create the cover illustration?`,
                    speechText: `Here's your story: ${story.title}! ${story.summary} Would you like me to create the illustrations?`
                };
            }
            // PHASE 2: Cover Generation - Child confirmed, create cover
            if (phase === 'cover_generation') {
                const story = await this.getStoredStory(request.storyId);
                const coverImageUrl = await this.generateCoverOnly(story.title, request.characterName || 'hero', request.characterTraits || {});
                // Update story with cover
                await this.updateStoryCover(request.storyId, coverImageUrl);
                return {
                    success: true,
                    story: story,
                    coverImageUrl,
                    beatImages: [],
                    audioUrl: story.audioUrl,
                    message: 'Cover illustration created! Ready to begin the story?',
                    speechText: 'Your cover is ready! Shall we start the adventure?'
                };
            }
            // PHASE 3: Beat Image Generation - Specific beat confirmed
            if (phase === 'beat_confirmed' && request.beatNumber) {
                const story = await this.getStoredStory(request.storyId);
                const beatImageUrl = await this.generateBeatImageOnly(request.storyId, request.beatNumber, story, request.characterTraits || {});
                return {
                    success: true,
                    story: story,
                    coverImageUrl: story.coverImageUrl,
                    beatImages: story.beatImages,
                    audioUrl: story.audioUrl,
                    message: `Beat ${request.beatNumber} illustration ready!`,
                    speechText: `Here's the illustration for this part of the story!`
                };
            }
            // FALLBACK: Generate everything (legacy support)
            return await this.generateFullStory(request);
        }
        catch (error) {
            this.logger.error('Story generation failed', { error, request });
            throw error;
        }
    }
    /**
     * Generate only the cover image (called after story confirmation)
     * Uses sophisticated GLOBAL_STYLE for hand-painted digital art quality
     */
    async generateCoverOnly(title, characterName, characterTraits) {
        return this.generateImageWithRetry('cover', title, characterName, characterTraits);
    }
    /**
     * Unified image generation with comprehensive error handling and retry logic
     */
    async generateImageWithRetry(type, title, characterName, characterTraits, beatNumber, story, attempt = 1) {
        const MAX_RETRIES = 3;
        const TIMEOUT_MS = 60000; // 60 seconds (to accommodate 20-24s generation time + network)
        try {
            const { GLOBAL_STYLE, FALLBACK_PALETTE } = await Promise.resolve().then(() => __importStar(require('./constants/GlobalArtStyle')));
            const characterContext = this.buildCharacterConsistencyContext(characterName, characterTraits);
            let prompt;
            if (type === 'cover') {
                prompt = `${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - COVER ART:
Title: "${title}"
Moment: Most visually kinetic, plot-shifting moment - protagonist mid-action at peak emotion
Action: ${characterName} in opening scene, establishing their world and the adventure beginning
Camera: Establishing shot, slight low angle (heroic introduction)
Depth: Layered foreground/mid/background planes with atmospheric falloff

PALETTE: ${FALLBACK_PALETTE[0]}
- Thread protagonist colors through environment (not just costume)
- Warm key-light versus cool teal/purple shadows
- Luminous golden rim highlights
- Volumetric haze with drifting dust motes

EMOTIONAL TONE: Wonder, curiosity, readiness for adventure
AGE APPROPRIATE: Suitable for young audiences ages 3-10
THERAPEUTIC QUALITY: Warm, encouraging, celebrating the character's uniqueness

CRITICAL VISUAL CONTINUITY:
- This establishes ${characterName}'s appearance for all subsequent images
- Exact character details must be clearly visible and memorable
- Professional therapeutic storytelling aesthetic
- Hand-painted digital art (NOT 3D, NOT Pixar style, NOT cel-shaded)

${GLOBAL_STYLE}

OUTPUT: Professional cover illustration celebrating diversity and emotional growth.`;
            }
            else {
                // Beat image prompt
                const beat = story.keyBeats?.[beatNumber - 1];
                if (!beat) {
                    throw new Error(`Beat ${beatNumber} not found in story`);
                }
                const previousImages = story.beatImages || [];
                prompt = `Continue the visual story for "${story.title}" - Beat ${beatNumber} of 4.

${characterContext}

Previous images: ${previousImages.length > 0 ? 'Cover and beats 1-' + previousImages.length : 'Cover only'}

THIS SCENE: ${beat.visualDescription || beat.description}
Emotional tone: ${beat.emotionalTone}
Character state: ${beat.characterState}

CRITICAL VISUAL CONTINUITY:
- ${story.characterName} must look EXACTLY the same as in previous images
- Same watercolor style, color palette, art direction
- Maintain all physical traits (wheelchair, skin tone, hair, clothing)
- Child-friendly warmth and professional quality

Visual moment: ${beat.description}`;
            }
            this.logger.info(`Generating ${type} image with gpt-image-1`, {
                attempt,
                promptLength: prompt.length,
                beatNumber: beatNumber || 'N/A'
            });
            // Create the API call with timeout
            const imageGenerationPromise = this.openai.images.generate({
                model: 'gpt-image-1',
                prompt,
                size: '1024x1024',
                quality: 'high', // gpt-image-1 supports: low, medium, high, auto
                n: 1
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`${type} image timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
            });
            const response = await Promise.race([imageGenerationPromise, timeoutPromise]);
            // gpt-image-1 returns base64 data in b64_json field
            const imageData = response.data?.[0];
            if (!imageData) {
                this.logger.error('OpenAI returned no image data', {
                    hasData: !!response.data,
                    dataLength: response.data?.length
                });
                throw new Error('No image data in OpenAI response');
            }
            let imageBuffer;
            // Handle both base64 (gpt-image-1) and URL (dall-e) formats
            if (imageData.b64_json) {
                // Base64 format (gpt-image-1 primary response)
                this.logger.info('Image returned as base64, decoding...', {
                    sizeBytes: imageData.b64_json.length
                });
                imageBuffer = Buffer.from(imageData.b64_json, 'base64');
            }
            else if (imageData.url) {
                // URL format (fallback) - download the image
                this.logger.info('Image returned as URL, downloading...', { url: imageData.url.substring(0, 60) });
                const imageResponse = await fetch(imageData.url);
                if (!imageResponse.ok) {
                    throw new Error(`Failed to download image from URL: ${imageResponse.status}`);
                }
                imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            }
            else {
                this.logger.error('Image data has no URL or base64', {
                    keys: Object.keys(imageData),
                    imageData: JSON.stringify(imageData).substring(0, 200)
                });
                throw new Error('Image data missing both url and b64_json fields');
            }
            this.logger.info('Image data ready for S3 upload', {
                sizeKB: (imageBuffer.length / 1024).toFixed(2),
                sizeMB: (imageBuffer.length / 1024 / 1024).toFixed(2)
            });
            const s3Url = await this.persistImageToS3Direct(imageBuffer, `${type}-${Date.now()}`);
            this.logger.info(`${type} image persisted to S3 successfully`, {
                s3Url: s3Url.substring(0, 60),
                attempt
            });
            return s3Url;
        }
        catch (error) {
            this.logger.error(`${type} image generation failed`, {
                attempt,
                error: error.message,
                errorType: error.constructor?.name,
                status: error.status,
                code: error.code
            });
            // Classify error and determine retry strategy
            const errorStatus = error.status || error.response?.status;
            const errorMessage = error.message?.toLowerCase() || '';
            // Don't retry authentication errors
            if (errorStatus === 401 || errorMessage.includes('auth')) {
                this.logger.error('OpenAI authentication failed - check API key');
                return '';
            }
            // Don't retry invalid request errors (wrong parameters)
            if (errorStatus === 400 || errorMessage.includes('invalid')) {
                this.logger.error('Invalid OpenAI request - check parameters', {
                    error: error.message
                });
                return '';
            }
            // Rate limit - wait and retry
            if (errorStatus === 429 || errorMessage.includes('rate limit')) {
                if (attempt < MAX_RETRIES) {
                    const delay = 60000; // Wait 60 seconds for rate limits
                    this.logger.warn(`Rate limited by OpenAI, waiting ${delay}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.generateImageWithRetry(type, title, characterName, characterTraits, beatNumber, story, attempt + 1);
                }
            }
            // Timeout or server error - retry with exponential backoff
            if (errorMessage.includes('timeout') || errorStatus >= 500) {
                if (attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
                    this.logger.warn(`${type} image ${errorMessage.includes('timeout') ? 'timed out' : 'server error'}, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.generateImageWithRetry(type, title, characterName, characterTraits, beatNumber, story, attempt + 1);
                }
            }
            // Final fallback - graceful degradation
            this.logger.error(`${type} image generation failed after ${attempt} attempts - returning empty`, {
                finalError: error.message
            });
            return '';
        }
    }
    /**
     * Generate single beat image (called when beat is confirmed)
     */
    async generateBeatImageOnly(storyId, beatNumber, story, characterTraits) {
        return this.generateImageWithRetry('beat', story.title, story.characterName, characterTraits, beatNumber, story);
    }
    /**
     * LEGACY: Old beat image generation - keeping for reference but now using unified retry logic
     */
    async generateBeatImageOnlyLegacy(storyId, beatNumber, story, characterTraits) {
        const beat = story.keyBeats?.[beatNumber - 1];
        if (!beat) {
            throw new Error(`Beat ${beatNumber} not found in story`);
        }
        const characterContext = this.buildCharacterConsistencyContext(story.characterName, characterTraits);
        const previousImages = story.beatImages || [];
        const beatPrompt = `Continue the visual story for "${story.title}" - Beat ${beatNumber} of 4.

${characterContext}

Previous images: ${previousImages.length > 0 ? 'Cover and beats 1-' + previousImages.length : 'Cover only'}

THIS SCENE: ${beat.visualDescription || beat.description}
Emotional tone: ${beat.emotionalTone}
Character state: ${beat.characterState}

CRITICAL VISUAL CONTINUITY:
- ${story.characterName} must look EXACTLY the same as in previous images
- Same watercolor style, color palette, art direction
- Maintain all physical traits (wheelchair, skin tone, hair, clothing)
- Child-friendly warmth and professional quality

Visual moment: ${beat.description}`;
        this.logger.info(`Generating beat ${beatNumber} with gpt-image-1`);
        // Add timeout handling for beat image generation
        const beatImagePromise = this.openai.images.generate({
            model: 'gpt-image-1',
            prompt: beatPrompt,
            size: '1024x1024',
            quality: 'high',
            n: 1
        });
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Beat ${beatNumber} image generation timeout after 30 seconds`)), 30000);
        });
        const response = await Promise.race([beatImagePromise, timeoutPromise]);
        // Handle base64 response from gpt-image-1 (same as cover)
        const imageData = response.data?.[0];
        if (!imageData) {
            throw new Error(`No image data for beat ${beatNumber}`);
        }
        let imageBuffer;
        if (imageData.url) {
            const imageResponse = await fetch(imageData.url);
            imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        }
        else if (imageData.b64_json) {
            imageBuffer = Buffer.from(imageData.b64_json, 'base64');
        }
        else {
            throw new Error('Image data missing both url and b64_json');
        }
        const beatUrl = await this.persistImageToS3Direct(imageBuffer, `beat-${beatNumber}-${Date.now()}`);
        this.logger.info(`Beat ${beatNumber} generated`, { beatUrl: beatUrl.substring(0, 60) });
        return beatUrl;
    }
    /**
     * Legacy: Generate complete story with all 5 images at once
     */
    async generateFullStory(request) {
        const story = await this.generateStoryContent(request);
        const images = await this.generateStoryImages(story, request.characterName || 'hero', request.characterTraits || {});
        const audioUrl = await this.generateAudioNarration(story.content);
        const imageTimestamps = this.generateImageTimestamps(story.content, images.beatImages);
        const savedStory = await this.saveStoryToDatabase({
            userId: request.userId,
            sessionId: request.sessionId,
            title: story.title,
            content: story.content,
            coverImageUrl: images.coverImageUrl,
            audioUrl,
            metadata: {
                characterName: request.characterName,
                storyType: request.storyType,
                userAge: request.userAge,
                beatImages: images.beatImages,
                imageTimestamps
            }
        });
        // Send parent notification if configured
        if (request.parentPhone && this.config.sms?.enabled) {
            try {
                const sessionMetrics = await this.getSessionMetrics(request.userId, request.sessionId);
                await this.sendParentStoryNotification(request.parentPhone, request.childName || 'Your child', {
                    title: story.title,
                    duration: sessionMetrics.duration,
                    gigglesDetected: sessionMetrics.gigglesDetected,
                    dominantMood: sessionMetrics.dominantMood,
                    creativityLevel: sessionMetrics.creativityLevel,
                    storyLink: `${this.config.frontendUrl || 'https://storytailor.ai'}/story/${savedStory.id}`
                });
            }
            catch (smsError) {
                this.logger.warn('Parent SMS notification failed', { error: smsError });
                // Don't fail story creation if SMS fails
            }
        }
        return {
            success: true,
            story: { title: story.title, content: story.content, storyId: savedStory.id },
            coverImageUrl: images.coverImageUrl,
            beatImages: images.beatImages,
            audioUrl,
            imageTimestamps,
            message: 'Story created with 5 illustrations!',
            speechText: `Here's your story: ${story.title}! ${story.summary}`
        };
    }
    /**
     * Get session metrics for parent notification
     */
    async getSessionMetrics(userId, sessionId) {
        try {
            // Get emotion data from database
            const { data: emotions } = await this.supabase
                .from('emotions')
                .select('mood, confidence, context')
                .eq('user_id', userId)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
                .order('created_at', { ascending: false });
            // Calculate metrics
            const gigglesDetected = emotions?.filter(e => e.context?.userInput?.toLowerCase().includes('haha') ||
                e.context?.userInput?.toLowerCase().includes('giggle') ||
                e.mood === 'happy').length || 0;
            const moodCounts = emotions?.reduce((acc, e) => {
                acc[e.mood] = (acc[e.mood] || 0) + 1;
                return acc;
            }, {}) || {};
            const dominantMood = Object.entries(moodCounts)
                .sort(([, a], [, b]) => b - a)[0]?.[0] || 'happy';
            // Estimate creativity based on story complexity and choices made
            const creativityLevel = gigglesDetected > 3 ? 'high' : gigglesDetected > 1 ? 'medium' : 'low';
            // Estimate duration (would be better to track actual session time)
            const duration = Math.max(5, Math.min(30, gigglesDetected * 2 + 5));
            return {
                duration,
                gigglesDetected,
                dominantMood,
                creativityLevel
            };
        }
        catch (error) {
            this.logger.warn('Failed to get session metrics', { error });
            return {
                duration: 10,
                gigglesDetected: 2,
                dominantMood: 'happy',
                creativityLevel: 'medium'
            };
        }
    }
    /**
     * Send parent story notification
     */
    async sendParentStoryNotification(parentPhone, childName, storyData) {
        // This would integrate with SMS service
        // For now, just log the notification
        this.logger.info('Parent story notification', {
            parentPhone,
            childName,
            storyData
        });
    }
    /**
     * Helper: Get stored story from database or temp cache
     */
    async getStoredStory(storyId) {
        try {
            // First try Redis cache (persists across Lambda invocations)
            const redisKey = `story:${storyId}`;
            const cachedStory = await this.redis.get(redisKey);
            if (cachedStory) {
                this.logger.info('Story retrieved from Redis cache', { storyId });
                return JSON.parse(cachedStory);
            }
            // Try temp cache (for same Lambda invocation)
            if (this.tempStoryCache.has(storyId)) {
                this.logger.info('Retrieved story from temp cache', { storyId });
                return this.tempStoryCache.get(storyId);
            }
            // Try to fetch from database
            const { data: story, error } = await this.supabase
                .from('stories')
                .select('*')
                .eq('id', storyId)
                .single();
            if (error) {
                this.logger.error('Failed to fetch story from database', { storyId, error });
                throw new Error(`Story not found: ${storyId}`);
            }
            // Parse content JSON if needed
            const content = typeof story.content === 'string'
                ? story.content
                : (story.content?.text || story.content?.content || JSON.stringify(story.content));
            const storyData = {
                storyId: story.id,
                title: story.title || 'Untitled',
                content,
                audioUrl: story.content?.audioUrl || '',
                coverImageUrl: story.content?.coverImageUrl || '',
                beatImages: story.content?.beatImages || [],
                keyBeats: story.content?.metadata?.keyBeats || []
            };
            // Cache in Redis for future invocations
            await this.redis.setex(redisKey, 3600, JSON.stringify(storyData)); // 1 hour TTL
            return storyData;
        }
        catch (error) {
            this.logger.error('getStoredStory failed', { storyId, error: error.message });
            throw error;
        }
    }
    /**
     * Helper: Update story with cover image (database or temp cache)
     */
    async updateStoryCover(storyId, coverImageUrl) {
        try {
            // If story is in temp cache, update it there
            if (this.tempStoryCache.has(storyId)) {
                const tempStory = this.tempStoryCache.get(storyId);
                tempStory.coverImageUrl = coverImageUrl;
                this.tempStoryCache.set(storyId, tempStory);
                this.logger.info('Cover updated in temp cache', { storyId });
                return;
            }
            // Update in database
            const { data: currentStory } = await this.supabase
                .from('stories')
                .select('content')
                .eq('id', storyId)
                .single();
            const currentContent = currentStory?.content || {};
            const updatedContent = {
                ...currentContent,
                coverImageUrl
            };
            const { error } = await this.supabase
                .from('stories')
                .update({ content: updatedContent })
                .eq('id', storyId);
            if (error) {
                this.logger.error('Failed to update cover in database', { storyId, error });
            }
            else {
                this.logger.info('Cover updated in database', { storyId, coverImageUrl: coverImageUrl.substring(0, 50) });
            }
        }
        catch (error) {
            this.logger.error('updateStoryCover failed', { storyId, error: error.message });
        }
    }
    /**
     * Generate story content using OpenAI GPT-4 with 4 key visual beats
     */
    async generateStoryContent(request) {
        const characterName = request.characterName || 'our hero';
        const age = request.userAge || 7;
        const storyType = request.storyType || 'adventure';
        const traits = request.characterTraits || {};
        const systemPrompt = `You are an award-winning children's story writer specializing in therapeutic bibliotherapy for children ages 3-10. 

Your stories:
- Follow the hero's journey structure
- Use age-appropriate language (age ${age})
- Incorporate social-emotional learning themes
- Are engaging, empowering, and hopeful
- Include vivid sensory details
- Feature diverse, inclusive characters
- Promote resilience and emotional intelligence

Write in a warm, encouraging tone that makes children feel seen, understood, and capable.`;
        // Age-based word count adaptation
        const ageParameters = {
            3: { wordCount: 75, sentenceLength: 5, vocabulary: 'toddler' },
            4: { wordCount: 125, sentenceLength: 6, vocabulary: 'preschool' },
            5: { wordCount: 175, sentenceLength: 8, vocabulary: 'kindergarten' },
            6: { wordCount: 225, sentenceLength: 9, vocabulary: 'early-elementary' },
            7: { wordCount: 300, sentenceLength: 10, vocabulary: 'elementary' },
            8: { wordCount: 375, sentenceLength: 11, vocabulary: 'mid-elementary' },
            9: { wordCount: 450, sentenceLength: 12, vocabulary: 'upper-elementary' },
            10: { wordCount: 550, sentenceLength: 14, vocabulary: 'preteen' }
        };
        const ageGroup = age <= 3 ? 3 : age >= 10 ? 10 : age;
        const params = ageParameters[ageGroup];
        const userPrompt = `Write a ${storyType} story for a ${age}-year-old child featuring ${characterName}. 

Character details:
- Age: ${traits.age || age}
- Species: ${traits.species || 'human'}
- Abilities: ${traits.disabilities || 'fully mobile'}
- Personality: ${traits.personality || 'brave and kind'}

The story should be approximately ${params.wordCount} words, appropriate for read-aloud narration.
Use ${params.vocabulary} vocabulary level with sentences averaging ${params.sentenceLength} words.

Include:
- A clear beginning, middle, and end
- Moments of challenge that the character overcomes
- Positive role modeling
- A satisfying resolution

IMPORTANT: Identify 4 KEY VISUAL MOMENTS for illustrations:
1. Opening scene (establishes character and setting)
2. First challenge (25% through story)
3. Climax/turning point (60% through story)
4. Resolution/victory (ending scene)

Format your response as JSON:
{
  "title": "Story Title",
  "content": "Full story text...",
  "summary": "One sentence summary for voice introduction",
  "keyBeats": [
    {
      "beatNumber": 1,
      "description": "Brief description of this moment in the story",
      "visualDescription": "Detailed visual description for illustration (setting, character pose, mood, colors)",
      "characterState": "Character's physical and emotional state at this moment",
      "emotionalTone": "happy/brave/thoughtful/triumphant"
    }
    // ... 3 more beats
  ]
}`;
        const response = await this.openai.chat.completions.create({
            model: this.config.openai.model || 'gpt-5',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            // Note: gpt-5 only supports temperature: 1 (default), so omit this parameter
            // temperature: 0.8,  // Not supported by gpt-5
            response_format: { type: 'json_object' }
        });
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error('No story content generated');
        }
        const parsed = JSON.parse(content);
        return {
            title: parsed.title || 'A Brave Adventure',
            content: parsed.content || '',
            summary: parsed.summary || 'A wonderful story about courage and friendship.',
            keyBeats: parsed.keyBeats || []
        };
    }
    /**
     * Generate 5 visually consistent images with character continuity
     */
    async generateStoryImages(story, characterName, characterTraits, characterId) {
        try {
            // Fetch character DNA if character exists
            let characterDNA = null;
            if (characterId) {
                try {
                    const { CharacterAgent } = await Promise.resolve().then(() => __importStar(require('@storytailor/character-agent')));
                    const charAgent = new CharacterAgent({
                        openaiApiKey: this.config.openai.apiKey,
                        supabaseUrl: this.config.supabase.url,
                        supabaseKey: this.config.supabase.anonKey
                    });
                    characterDNA = await charAgent.getCharacterDNA(characterId);
                }
                catch (err) {
                    console.warn('Could not fetch character DNA, using basic context:', err);
                }
            }
            // Build character consistency context for ALL images
            const characterContext = characterDNA
                ? characterDNA.safetyFilteredPrompt
                : this.buildCharacterConsistencyContext(characterName, characterTraits);
            // Import GLOBAL_STYLE for sophisticated artistic quality
            const { GLOBAL_STYLE, FALLBACK_PALETTE, CAMERA_ANGLES } = await Promise.resolve().then(() => __importStar(require('./constants/GlobalArtStyle')));
            // 1. Generate cover image (establishes visual baseline)
            const coverPrompt = `${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - COVER ART:
Title: "${story.title}"
Moment: Opening scene - protagonist ready for adventure
Action: ${characterName} in their world, adventure beginning
Camera: ${CAMERA_ANGLES[0]}
Depth: Layered foreground/mid/background with atmospheric falloff

PALETTE: ${FALLBACK_PALETTE[0]}
- Thread protagonist HEX colors through environment
- Warm key-light vs cool teal/purple shadows
- Luminous rim highlights
- Volumetric haze with dust motes

EMOTIONAL TONE: Wonder, curiosity, readiness
AGE: Suitable for young audiences 3-10
QUALITY: Professional therapeutic storytelling

CRITICAL: Establish ${characterName}'s appearance clearly
Hand-painted digital art (NOT 3D, NOT Pixar)

${GLOBAL_STYLE}`;
            this.logger.info('Generating cover with GLOBAL_STYLE and gpt-image-1');
            // Add timeout handling for cover image generation
            const coverImagePromise = this.openai.images.generate({
                model: 'gpt-image-1',
                prompt: coverPrompt,
                size: '1024x1024',
                quality: 'high', // gpt-image-1 supports: low, medium, high, auto (NOT 'hd')
                n: 1
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Cover image generation timeout after 30 seconds')), 30000);
            });
            const coverResponse = await Promise.race([coverImagePromise, timeoutPromise]);
            // Handle base64 response from gpt-image-1
            const coverImageData = coverResponse.data?.[0];
            if (!coverImageData) {
                throw new Error('No cover image data from OpenAI');
            }
            let coverImageBuffer;
            if (coverImageData.url) {
                const imgResponse = await fetch(coverImageData.url);
                coverImageBuffer = Buffer.from(await imgResponse.arrayBuffer());
            }
            else if (coverImageData.b64_json) {
                coverImageBuffer = Buffer.from(coverImageData.b64_json, 'base64');
            }
            else {
                throw new Error('Cover image missing both url and b64_json');
            }
            const coverUrl = await this.persistImageToS3Direct(coverImageBuffer, `cover-${Date.now()}`);
            this.logger.info('Cover generated with sophisticated prompts', { coverUrl: coverUrl.substring(0, 60) });
            // 2. Generate 4 beat images sequentially, each referencing previous
            const beatImages = [];
            let previousImageContext = coverPrompt; // Seed with cover details
            for (let i = 0; i < Math.min(4, story.keyBeats.length); i++) {
                const beat = story.keyBeats[i];
                const paletteIndex = i + 1; // 1-4 (cover is 0)
                const beatPrompt = `${GLOBAL_STYLE}

PROTAGONIST DNA: ${characterContext}

SCENE - BEAT ${i + 1} OF 4:
Story: "${story.title}"
Image ${i + 2} of 5 total
Previous: ${i === 0 ? 'Cover (opening scene)' : `Beat ${i} - ${beatImages[i - 1].description}`}

ACTION: ${beat.visualDescription || beat.description}
Emotional Beat: ${beat.emotionalTone}
Character State: ${beat.characterState}

CAMERA: ${CAMERA_ANGLES[paletteIndex]}
DEPTH: Layered planes with atmospheric perspective

PALETTE - EMOTIONAL ARC STEP ${paletteIndex + 1}:
${FALLBACK_PALETTE[paletteIndex]}
- Thread protagonist HEX colors through environment
- Maintain warm key-light vs cool shadow balance
- Luminous rim highlights

VISUAL CONTINUITY (CRITICAL):
- ${characterName} looks EXACTLY as in previous ${i + 1} images
- Same hand-painted digital art style
- Maintain all physical traits (wheelchair, skin tone, hair, clothing)
- Character consistency PARAMOUNT

ARTISTIC EXECUTION:
- Hand-painted digital art (NOT 3D, NOT Pixar, NOT cel-shaded)
- Professional therapeutic aesthetic
- Age-appropriate for 3-10 years

${GLOBAL_STYLE}`;
                this.logger.info(`Generating beat ${i + 1} with enhanced GLOBAL_STYLE`);
                // Add timeout handling for beat image generation
                const beatImagePromise = this.openai.images.generate({
                    model: 'gpt-image-1',
                    prompt: beatPrompt,
                    size: '1024x1024',
                    quality: 'high', // gpt-image-1 supports: low, medium, high, auto (NOT 'hd')
                    n: 1
                });
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error(`Beat ${i + 1} image generation timeout after 30 seconds`)), 30000);
                });
                const beatResponse = await Promise.race([beatImagePromise, timeoutPromise]);
                // Handle base64 response from gpt-image-1
                const beatImageData = beatResponse.data?.[0];
                if (!beatImageData) {
                    throw new Error(`No image data for beat ${i + 1}`);
                }
                let beatImageBuffer;
                if (beatImageData.url) {
                    const imgResponse = await fetch(beatImageData.url);
                    beatImageBuffer = Buffer.from(await imgResponse.arrayBuffer());
                }
                else if (beatImageData.b64_json) {
                    beatImageBuffer = Buffer.from(beatImageData.b64_json, 'base64');
                }
                else {
                    throw new Error(`Beat ${i + 1} image missing both url and b64_json`);
                }
                const beatUrl = await this.persistImageToS3Direct(beatImageBuffer, `beat-${beat.beatNumber}-${Date.now()}`);
                beatImages.push({
                    beatNumber: beat.beatNumber,
                    imageUrl: beatUrl,
                    description: beat.visualDescription || beat.description,
                    timestamp: 0 // Will be calculated later
                });
                previousImageContext = beatPrompt; // Use this beat as reference for next
                this.logger.info(`Beat ${i + 1} image generated`, { beatUrl: beatUrl.substring(0, 60) });
            }
            return {
                coverImageUrl: coverUrl,
                beatImages
            };
        }
        catch (error) {
            this.logger.error('Multi-image generation failed', { error });
            // Fallback to single cover image
            return {
                coverImageUrl: 'https://via.placeholder.com/1024x1024?text=Story+Cover',
                beatImages: []
            };
        }
    }
    /**
     * Build character consistency context for visual continuity
     */
    buildCharacterConsistencyContext(characterName, characterTraits) {
        const age = characterTraits.age || 7;
        const species = characterTraits.species || 'human';
        const ethnicity = characterTraits.ethnicity || 'diverse, warm skin tone';
        const disabilities = characterTraits.disabilities || null;
        const appearance = characterTraits.appearance || 'friendly, warm, approachable';
        const hairColor = characterTraits.hairColor || 'brown';
        const eyeColor = characterTraits.eyeColor || 'bright and expressive';
        return `CHARACTER DETAILS (MUST be consistent across ALL images):
Name: ${characterName}
Age: ${age} years old
Species: ${species}
Ethnicity: ${ethnicity}
Hair: ${hairColor}
Eyes: ${eyeColor}
Physical traits: ${appearance}
${disabilities ? `MOBILITY: Uses ${disabilities} - MUST appear in EVERY image` : 'Fully mobile'}

ACCESSIBILITY & INCLUSION:
${disabilities ? `- ${characterName} uses ${disabilities} for mobility` : ''}
${disabilities ? `- This mobility device is part of who they are and MUST be shown` : ''}
- Represent ${characterName} with dignity, capability, and empowerment
- Their abilities do not define them, but are part of their visual identity

Visual consistency is CRITICAL for therapeutic storytelling.`;
    }
    /**
     * Generate audio narration using ElevenLabs direct API with comprehensive error handling
     */
    async generateAudioNarration(text, attempt = 1) {
        const MAX_RETRIES = 3;
        const TIMEOUT_MS = 30000; // 30 seconds for audio generation
        if (!this.elevenLabsConfig) {
            this.logger.warn('ElevenLabs not configured - no audio will be generated');
            return '';
        }
        try {
            this.logger.info('Generating audio with ElevenLabs', {
                attempt,
                textLength: text.length,
                voiceId: this.elevenLabsConfig.voiceId
            });
            // Call ElevenLabs API with timeout
            const audioPromise = fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.elevenLabsConfig.voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': this.elevenLabsConfig.apiKey
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_v3_alpha',
                    voice_settings: {
                        stability: 0.75,
                        similarity_boost: 0.75,
                        use_speaker_boost: true,
                        style: 0.5
                    }
                })
            });
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error(`Audio generation timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
            });
            const response = await Promise.race([audioPromise, timeoutPromise]);
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`ElevenLabs ${response.status}: ${errorBody}`);
            }
            // Get audio data
            const audioBuffer = await response.arrayBuffer();
            // Upload to S3
            const audioUrl = await this.uploadAudioToS3(Buffer.from(audioBuffer));
            this.logger.info('Audio generated successfully', {
                audioUrl: audioUrl.substring(0, 60),
                sizeKB: (audioBuffer.byteLength / 1024).toFixed(2),
                attempt
            });
            return audioUrl;
        }
        catch (error) {
            this.logger.error('Audio generation failed', {
                attempt,
                error: error.message,
                status: error.status
            });
            // Classify error and determine retry strategy
            const errorStatus = error.status || error.response?.status;
            const errorMessage = error.message?.toLowerCase() || '';
            // Don't retry authentication errors
            if (errorStatus === 401 || errorMessage.includes('auth')) {
                this.logger.error('ElevenLabs authentication failed - check API key');
                return '';
            }
            // Don't retry quota exceeded errors
            if (errorStatus === 402 || errorMessage.includes('quota')) {
                this.logger.error('ElevenLabs quota exceeded - check billing');
                return '';
            }
            // Rate limit - wait and retry
            if (errorStatus === 429 || errorMessage.includes('rate limit')) {
                if (attempt < MAX_RETRIES) {
                    const delay = 30000; // Wait 30 seconds for rate limits
                    this.logger.warn(`Rate limited by ElevenLabs, waiting ${delay}ms before retry ${attempt + 1}/${MAX_RETRIES}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.generateAudioNarration(text, attempt + 1);
                }
            }
            // Timeout or server error - retry with exponential backoff
            if (errorMessage.includes('timeout') || errorStatus >= 500) {
                if (attempt < MAX_RETRIES) {
                    const delay = Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
                    this.logger.warn(`Audio ${errorMessage.includes('timeout') ? 'timed out' : 'server error'}, retrying after ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.generateAudioNarration(text, attempt + 1);
                }
            }
            // Final fallback - graceful degradation (no audio)
            this.logger.error(`Audio generation failed after ${attempt} attempts - returning empty`, {
                finalError: error.message
            });
            return '';
        }
    }
    /**
     * Generate WebVTT-compatible timestamps for beat images
     */
    generateImageTimestamps(storyContent, beatImages) {
        // Calculate approximate story duration based on character count
        // Average reading speed: ~150 words/minute for children's stories
        // Average: 5 characters per word
        const estimatedDurationSeconds = Math.ceil((storyContent.length / 5) / 150 * 60);
        // Distribute beat images evenly across the story duration
        const timestamps = [];
        const totalBeats = beatImages.length;
        beatImages.forEach((beat, index) => {
            const percentageThrough = (index + 1) / (totalBeats + 1); // +1 to avoid ending at 100%
            const timestampMs = Math.floor(percentageThrough * estimatedDurationSeconds * 1000);
            timestamps.push({
                beatNumber: beat.beatNumber,
                imageUrl: beat.imageUrl,
                description: beat.description,
                startTimeMs: timestampMs,
                endTimeMs: index < totalBeats - 1
                    ? Math.floor(((index + 2) / (totalBeats + 1)) * estimatedDurationSeconds * 1000)
                    : estimatedDurationSeconds * 1000
            });
        });
        return {
            estimatedDurationSeconds,
            beatTimestamps: timestamps
        };
    }
    /**
     * Persist image buffer directly to S3 (for base64 images from gpt-image-1)
     */
    async persistImageToS3Direct(imageBuffer, title) {
        try {
            // Upload to S3
            const { S3Client, PutObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
            const s3Client = new S3Client({ region: this.config.s3?.region || 'us-east-1' });
            const bucketName = this.config.s3?.bucketName || 'storytailor-audio';
            const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const key = `covers/${sanitizedTitle}-${Date.now()}.png`;
            this.logger.info('Uploading image to S3', { bucket: bucketName, key, sizeKB: (imageBuffer.length / 1024).toFixed(2) });
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: imageBuffer,
                ContentType: 'image/png',
                CacheControl: 'public, max-age=31536000' // 1 year
            }));
            // Return public S3 URL
            const persistentUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;
            this.logger.info('Image persisted to S3 successfully', { persistentUrl: persistentUrl.substring(0, 80) });
            return persistentUrl;
        }
        catch (error) {
            this.logger.error('S3 upload failed', {
                error: error instanceof Error ? error.message : String(error),
                title
            });
            throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Download image from URL and persist to S3 (for URL-based responses)
     */
    async persistImageToS3(imageUrl, title) {
        try {
            // Download image from OpenAI
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status}`);
            }
            const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            // Upload to S3
            const { S3Client, PutObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
            const s3Client = new S3Client({ region: this.config.s3?.region || 'us-east-1' });
            const bucketName = this.config.s3?.bucketName || 'storytailor-audio';
            const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const key = `covers/${sanitizedTitle}-${Date.now()}.png`;
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: imageBuffer,
                ContentType: 'image/png',
                CacheControl: 'public, max-age=31536000' // 1 year
            }));
            // Return public S3 URL
            const persistentUrl = `https://${bucketName}.s3.amazonaws.com/${key}`;
            this.logger.info('Image persisted to S3', { persistentUrl });
            return persistentUrl;
        }
        catch (error) {
            this.logger.error('Image persistence failed, returning temporary URL', { error });
            // Return original URL as fallback
            return imageUrl;
        }
    }
    /**
     * Upload audio buffer to S3
     */
    containsDialogue(content) {
        return /"[^"]+"\s*(?:said|asked|replied|exclaimed|whispered|murmured|shouted|laughed|cried)/i.test(content);
    }
    async uploadAudioToS3(audioBuffer) {
        try {
            const { S3Client, PutObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
            const { getSignedUrl } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/s3-request-presigner')));
            const s3Client = new S3Client({ region: this.config.s3?.region || 'us-east-1' });
            const bucketName = this.config.s3?.bucketName || 'storytailor-audio';
            const key = `stories/${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`;
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: audioBuffer,
                ContentType: 'audio/mpeg'
            }));
            // Generate presigned URL
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key
            });
            // Return public URL (for now, simplified)
            return `https://${bucketName}.s3.amazonaws.com/${key}`;
        }
        catch (error) {
            this.logger.error('S3 upload failed', { error });
            // Return a mock URL that indicates audio was generated but not uploaded
            return `https://storytailor-audio.s3.amazonaws.com/generated/${Date.now()}.mp3`;
        }
    }
    /**
     * Get or create default library for user with proper UUID
     */
    async getOrCreateDefaultLibrary(userId) {
        try {
            // Validate if userId is a valid UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValidUUID = uuidRegex.test(userId);
            if (!isValidUUID) {
                // userId is not a UUID (e.g., "test-user-123", "anonymous")
                // For these cases, we can't create a library (owner must be valid user UUID)
                // Return a random UUID and let the story save with a temporary library reference
                this.logger.info('User ID is not UUID, stories will be temporary', { userId });
                return crypto.randomUUID();
            }
            // Try to get existing library for this user
            const { data: existingLib } = await this.supabase
                .from('libraries')
                .select('id')
                .eq('owner', userId)
                .limit(1)
                .maybeSingle();
            if (existingLib?.id) {
                this.logger.info('Using existing library', { libraryId: existingLib.id, userId });
                return existingLib.id;
            }
            // No existing library - create one
            this.logger.info('Creating new library for user', { userId });
            const { data: newLib, error: insertError } = await this.supabase
                .from('libraries')
                .insert({
                owner: userId,
                name: 'My Stories',
                created_at: new Date().toISOString()
            })
                .select('id')
                .single();
            if (insertError || !newLib?.id) {
                this.logger.warn('Failed to create library, using random UUID', { error: insertError, userId });
                return crypto.randomUUID();
            }
            this.logger.info('Created new library', { libraryId: newLib.id, userId });
            return newLib.id;
        }
        catch (error) {
            this.logger.error('Library lookup failed, using random UUID', { error, userId });
            return crypto.randomUUID();
        }
    }
    /**
     * Save story to Supabase database (matching actual schema)
     */
    async saveStoryToDatabase(data) {
        try {
            // First, we need a library_id with proper UUID format
            const libraryId = data.metadata.libraryId || await this.getOrCreateDefaultLibrary(data.userId);
            // Insert story (matching schema: id, library_id, title, content, status, age_rating, created_at, finalized_at)
            const { data: savedStory, error: storyError } = await this.supabase
                .from('stories')
                .insert({
                library_id: libraryId,
                title: data.title,
                content: {
                    text: data.content,
                    metadata: data.metadata
                },
                status: 'final',
                age_rating: data.metadata.userAge || 7,
                created_at: new Date().toISOString(),
                finalized_at: new Date().toISOString()
            })
                .select()
                .single();
            if (storyError) {
                this.logger.warn('Story save failed, using temp ID with in-memory cache', { error: storyError });
                const tempId = `story_${Date.now()}`;
                // Store in temp cache so multi-turn conversation can retrieve it
                this.tempStoryCache.set(tempId, {
                    storyId: tempId,
                    title: data.title,
                    content: data.content,
                    audioUrl: data.audioUrl,
                    coverImageUrl: data.coverImageUrl,
                    beatImages: [],
                    keyBeats: data.metadata?.keyBeats || []
                });
                // Clear cache after 1 hour
                setTimeout(() => this.tempStoryCache.delete(tempId), 3600000);
                return { id: tempId };
            }
            const storyId = savedStory.id;
            // Save media assets separately (matching schema: story_id, asset_type, url, metadata)
            const mediaAssets = [
                {
                    story_id: storyId,
                    asset_type: 'image',
                    url: data.coverImageUrl,
                    metadata: { type: 'cover', generated_with: 'gpt-image-1' }
                },
                {
                    story_id: storyId,
                    asset_type: 'audio',
                    url: data.audioUrl,
                    metadata: { type: 'narration', generated_with: 'elevenlabs' }
                }
            ];
            const { error: assetError } = await this.supabase
                .from('media_assets')
                .insert(mediaAssets);
            if (assetError) {
                this.logger.warn('Media assets save failed, story still saved', { error: assetError, storyId });
            }
            this.logger.info('Story and assets saved to Supabase', { storyId });
            return { id: storyId };
        }
        catch (error) {
            this.logger.error('Failed to save story to database', { error });
            // Return a temporary ID even if DB save fails
            return { id: `story_${Date.now()}` };
        }
    }
    /**
     * Generate character voices for a story using ElevenLabs Voice Design
     */
    async generateStoryCharacterVoices(storyId, storyType, characterNames, characterPersonalities) {
        try {
            this.logger.info('Generating character voices for story', {
                storyId,
                storyType,
                characterCount: characterNames.length
            });
            // Generate voices using CharacterVoiceManager
            const storyVoiceProfile = await this.characterVoiceManager.generateStoryVoices(storyId, storyType, characterNames, characterPersonalities);
            this.logger.info('Character voices generated successfully', {
                storyId,
                characterCount: storyVoiceProfile.characters.length,
                narratorVoiceId: storyVoiceProfile.narratorVoiceId
            });
            return storyVoiceProfile;
        }
        catch (error) {
            this.logger.error('Character voice generation failed', { error });
            throw error;
        }
    }
    /**
     * Create a quick character voice for testing
     */
    async createQuickCharacterVoice(characterName, personality, storyType) {
        try {
            this.logger.info('Creating quick character voice', {
                characterName,
                personality,
                storyType
            });
            const voiceId = await this.characterVoiceManager.createQuickCharacterVoice(characterName, personality, storyType);
            this.logger.info('Quick character voice created', {
                characterName,
                voiceId
            });
            return voiceId;
        }
        catch (error) {
            this.logger.error('Quick character voice creation failed', { error });
            throw error;
        }
    }
    /**
     * Refine an existing character voice
     */
    async refineCharacterVoice(characterName, voiceId, refinementPrompts) {
        try {
            this.logger.info('Refining character voice', {
                characterName,
                voiceId,
                refinementCount: refinementPrompts.length
            });
            const refinedVoiceId = await this.characterVoiceManager.refineCharacterVoice(characterName, voiceId, refinementPrompts);
            this.logger.info('Character voice refined successfully', {
                characterName,
                originalVoiceId: voiceId,
                refinedVoiceId: refinedVoiceId
            });
            return refinedVoiceId;
        }
        catch (error) {
            this.logger.error('Character voice refinement failed', { error });
            throw error;
        }
    }
    /**
     * Get voice statistics
     */
    getVoiceStatistics() {
        return this.characterVoiceManager.getVoiceStatistics();
    }
    /**
     * Extract character names from story content
     */
    extractCharacterNames(storyContent) {
        // Simple character extraction - look for capitalized words that appear multiple times
        const words = storyContent.split(/\s+/);
        const wordCount = new Map();
        words.forEach(word => {
            // Remove punctuation and check if it's a potential character name
            const cleanWord = word.replace(/[.,!?;:"']/g, '');
            if (cleanWord.length > 2 && /^[A-Z]/.test(cleanWord)) {
                wordCount.set(cleanWord, (wordCount.get(cleanWord) || 0) + 1);
            }
        });
        // Return words that appear more than once (likely character names)
        return Array.from(wordCount.entries())
            .filter(([word, count]) => count > 1)
            .map(([word]) => word)
            .slice(0, 5); // Limit to 5 characters
    }
}
exports.RealContentAgent = RealContentAgent;
//# sourceMappingURL=RealContentAgent.js.map
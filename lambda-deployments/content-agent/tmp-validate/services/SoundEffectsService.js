"use strict";
/**
 * Sound Effects Service - ElevenLabs Integration
 *
 * Creates immersive audio environment with:
 * - Story-specific sound effects (thunder, birds, ocean, magic)
 * - Multi-speaker spatial audio distribution
 * - Timed sound effects matching story beats
 * - Background ambiance tracks
 * - Turn bedroom into the story with sound!
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundEffectsService = void 0;
class SoundEffectsService {
    constructor(logger, apiKey) {
        this.logger = logger;
        this.elevenLabsApiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    }
    /**
     * Generate sound effect using ElevenLabs Sound Generation API
     */
    async generateSoundEffect(effect, duration = 3) {
        const effectPrompts = {
            'thunder': 'Gentle distant thunder rumble, child-friendly, not scary, comforting',
            'birds': 'Cheerful morning birds chirping peacefully in forest',
            'ocean': 'Gentle ocean waves lapping softly on shore, calming',
            'magic': 'Magical sparkle and shimmer, whimsical fairy dust sound',
            'sparkle': 'Bright magical sparkles, twinkling stars sound',
            'footsteps': 'Light footsteps on soft ground, adventurous walking',
            'door': 'Wooden door creaking open mysteriously but gently',
            'wind': 'Soft wind blowing through trees, peaceful breeze',
            'forest': 'Ambient forest sounds, peaceful nature, birds and rustling',
            'rain': 'Gentle rain falling softly, cozy and calming',
            'fire': 'Warm crackling fireplace, cozy and safe',
            'bell': 'Soft magical bell chiming, whimsical'
        };
        try {
            this.logger.info('Generating sound effect', { effect, duration });
            // ElevenLabs Sound Effects API
            const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
                method: 'POST',
                headers: {
                    'xi-api-key': this.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: effectPrompts[effect],
                    duration_seconds: duration,
                    prompt_influence: 0.5
                })
            });
            if (!response.ok) {
                throw new Error(`ElevenLabs Sound API error: ${response.status}`);
            }
            const audioBuffer = await response.arrayBuffer();
            // Upload to S3
            const url = await this.uploadSoundEffectToS3(Buffer.from(audioBuffer), effect);
            this.logger.info('Sound effect generated', { effect, url: url.substring(0, 60) });
            return url;
        }
        catch (error) {
            this.logger.error('Sound effect generation failed', { effect, error });
            // Return silence/placeholder
            return 'https://storytailor-audio.s3.amazonaws.com/sfx/silence.mp3';
        }
    }
    /**
     * Analyze story and suggest sound effects with timing
     */
    async analyzeSoundEffectMoments(storyText) {
        try {
            const OpenAI = (await Promise.resolve().then(() => __importStar(require('openai')))).default;
            const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const analysis = await openai.chat.completions.create({
                model: 'gpt-4-turbo',
                messages: [{
                        role: 'system',
                        content: `You are an expert sound designer for children's therapeutic storytelling. 

Analyze the story and suggest 3-5 sound effects that would:
- Enhance immersion without overwhelming
- Match story moments naturally
- Be child-friendly and comforting
- Add magic without being scary

Available effects: thunder, birds, ocean, magic, sparkle, footsteps, door, wind, forest, rain, fire, bell

Return JSON: {"effects": [{"effect": "birds", "timestamp": 5, "description": "Forest scene opens", "duration": 3, "volume": 0.3}]}`
                    }, {
                        role: 'user',
                        content: `Story (read-aloud, ~${Math.ceil(storyText.length / 5 / 150 * 60)}s duration):\n\n${storyText}`
                    }],
                response_format: { type: 'json_object' }
            });
            const result = JSON.parse(analysis.choices[0]?.message?.content || '{"effects":[]}');
            // Generate URLs for each effect
            const effects = await Promise.all((result.effects || []).map(async (e) => ({
                effect: e.effect,
                url: await this.generateSoundEffect(e.effect, e.duration || 3),
                timestamp: e.timestamp,
                duration: e.duration || 3,
                volume: e.volume || 0.4,
                speaker: undefined // Will be assigned for multi-speaker
            })));
            this.logger.info('Sound effects analyzed and generated', {
                count: effects.length,
                effects: effects.map(e => e.effect)
            });
            return effects;
        }
        catch (error) {
            this.logger.error('Sound effect analysis failed', { error });
            return [];
        }
    }
    /**
     * Orchestrate multi-speaker spatial audio
     */
    async orchestrateMultiSpeaker(setup, soundEffects) {
        if (!setup.surroundSpeakers || setup.surroundSpeakers.length === 0) {
            // Single speaker - all effects on main device
            return soundEffects.map(sfx => ({
                ...sfx,
                speaker: setup.mainDevice
            }));
        }
        // Distribute effects across speakers for spatial immersion
        return soundEffects.map((sfx, index) => {
            // Alternate between surround speakers
            const speakerIndex = index % setup.surroundSpeakers.length;
            const speaker = setup.surroundSpeakers[speakerIndex];
            return {
                ...sfx,
                speaker: speaker,
                volume: sfx.volume * 0.8 // Slightly quieter for surround
            };
        });
    }
    /**
     * Create background ambiance track for story type
     */
    async generateAmbianceTrack(storyType) {
        const ambiancePrompts = {
            'adventure': 'Gentle forest ambiance, distant birds, soft rustling leaves, peaceful background',
            'bedtime': 'Soft white noise with gentle ocean waves, very calming and sleep-inducing',
            'birthday': 'Subtle festive background, very soft party ambiance',
            'medical_bravery': 'Calm healing sounds, gentle flowing water, peaceful',
            'ocean': 'Peaceful ocean waves and seagulls, relaxing beach ambiance'
        };
        const prompt = ambiancePrompts[storyType];
        if (!prompt)
            return null;
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
                method: 'POST',
                headers: {
                    'xi-api-key': this.elevenLabsApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: prompt,
                    duration_seconds: 60, // 1 minute loop
                    prompt_influence: 0.3 // Subtle
                })
            });
            const audio = await response.arrayBuffer();
            return await this.uploadSoundEffectToS3(Buffer.from(audio), `ambiance-${storyType}`);
        }
        catch (error) {
            this.logger.error('Ambiance generation failed', { error });
            return null;
        }
    }
    /**
     * Upload sound effect to S3
     */
    async uploadSoundEffectToS3(audioBuffer, effectName) {
        try {
            const { S3Client, PutObjectCommand } = await Promise.resolve().then(() => __importStar(require('@aws-sdk/client-s3')));
            const s3 = new S3Client({ region: 'us-east-1' });
            const bucket = 'storytailor-audio';
            const key = `sfx/${effectName}-${Date.now()}.mp3`;
            await s3.send(new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: audioBuffer,
                ContentType: 'audio/mpeg',
                CacheControl: 'public, max-age=31536000'
            }));
            return `https://${bucket}.s3.amazonaws.com/${key}`;
        }
        catch (error) {
            this.logger.error('S3 upload failed for sound effect', { error });
            throw error;
        }
    }
    /**
     * Create complete immersive audio experience
     */
    async createImmersiveAudio(storyText, storyType, spatialSetup) {
        this.logger.info('Creating immersive audio experience', {
            storyType,
            hasSpatialAudio: !!spatialSetup?.surroundSpeakers
        });
        // Generate all components in parallel
        const [soundEffects, ambianceTrack] = await Promise.all([
            this.analyzeSoundEffectMoments(storyText),
            this.generateAmbianceTrack(storyType)
        ]);
        // Distribute across speakers if multi-speaker setup
        const spatialEffects = spatialSetup
            ? await this.orchestrateMultiSpeaker(spatialSetup, soundEffects)
            : soundEffects;
        return {
            soundEffects: spatialEffects,
            ambianceTrack,
            narration: '' // Would be ElevenLabs narration URL
        };
    }
}
exports.SoundEffectsService = SoundEffectsService;

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
import { Logger } from 'winston';
export interface SoundEffect {
    effect: 'thunder' | 'birds' | 'ocean' | 'magic' | 'sparkle' | 'footsteps' | 'door' | 'wind' | 'forest' | 'rain' | 'fire' | 'bell';
    url: string;
    timestamp: number;
    duration: number;
    volume: number;
    speaker?: string;
}
export interface SpatialAudioSetup {
    mainDevice: string;
    surroundSpeakers?: string[];
}
export declare class SoundEffectsService {
    private logger;
    constructor(logger: Logger);
    /**
     * Generate sound effect using ElevenLabs Sound Generation API
     */
    generateSoundEffect(effect: SoundEffect['effect'], duration?: number): Promise<string>;
    /**
     * Analyze story and suggest sound effects with timing
     */
    analyzeSoundEffectMoments(storyText: string): Promise<SoundEffect[]>;
    /**
     * Orchestrate multi-speaker spatial audio
     */
    orchestrateMultiSpeaker(setup: SpatialAudioSetup, soundEffects: SoundEffect[]): Promise<SoundEffect[]>;
    /**
     * Create background ambiance track for story type
     */
    generateAmbianceTrack(storyType: string): Promise<string | null>;
    /**
     * Upload sound effect to S3
     */
    private uploadSoundEffectToS3;
    /**
     * Create complete immersive audio experience
     */
    createImmersiveAudio(storyText: string, storyType: string, spatialSetup?: SpatialAudioSetup): Promise<{
        soundEffects: SoundEffect[];
        ambianceTrack: string | null;
        narration: string;
    }>;
}
//# sourceMappingURL=SoundEffectsService.d.ts.map